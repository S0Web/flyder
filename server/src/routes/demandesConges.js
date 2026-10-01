const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { requireManager } = require('../middleware/auth');
const { upsertJour } = require('../db/personnelWrite');
const { logAudit } = require('../lib/audit');
const { cpRestantPour } = require('../lib/cp');
const { dateLocaleISO, ajouterJours } = require('../lib/dates');

// Demandes de congé. Un salarié demande une période et suit sa demande ; un manager voit
// toutes les demandes, choisit les jours à poser et accepte ou refuse. Accepter écrit un
// « CP » dans le planning du personnel pour chaque jour retenu (remplaçant ce qui y était).
// Monté derrière requireAuth + requireWriteAccess (index.js).

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MAX_JOURS = 60;
const estManager = (req) => req.user.role === 'manager';

function joursEntre(debut, fin) {
  const out = [];
  for (let d = debut; d <= fin; d = ajouterJours(d, 1)) out.push(d);
  return out;
}

function formater(row, req) {
  const base = {
    id: row.id, user_id: row.user_id, prenom: row.prenom, nom: row.nom,
    date_debut: row.date_debut, date_fin: row.date_fin, motif: row.motif,
    statut: row.statut, retour_manager: row.retour_manager,
    jours: JSON.parse(row.jours || '[]'), created_at: row.created_at,
  };
  if (!estManager(req) || row.statut !== 'en_attente') return base;
  // Aide à la décision : le planning du demandeur sur la période, le solde de CP, et les
  // collègues déjà en congé sur ces dates.
  return {
    ...base,
    cp_restant: cpRestantPour(row.user_id),
    planning: db.all(
      'SELECT date, type FROM personnel_creneaux WHERE employe_id = ? AND date BETWEEN ? AND ? GROUP BY date',
      [row.user_id, row.date_debut, row.date_fin]
    ),
    collegues_absents: db.all(
      `SELECT DISTINCT u.prenom FROM personnel_creneaux pc JOIN app_users u ON u.id = pc.employe_id
       WHERE pc.type = 'cp' AND pc.date BETWEEN ? AND ? AND pc.employe_id != ?
         AND u.actif = 1 AND u.supprime = 0 AND u.masque = 0 ORDER BY u.prenom`,
      [row.date_debut, row.date_fin, row.user_id]
    ).map(r => r.prenom),
  };
}

const SELECT = `
  SELECT d.*, u.prenom, u.nom FROM demandes_conges d JOIN app_users u ON u.id = d.user_id
`;

// GET /api/demandes-conges?statut=en_attente — manager : toutes ; sinon : les siennes.
router.get('/', (req, res) => {
  const where = [];
  const params = [];
  if (!estManager(req)) { where.push('d.user_id = ?'); params.push(req.user.id); }
  if (['en_attente', 'acceptee', 'refusee', 'annulee'].includes(req.query.statut)) {
    where.push('d.statut = ?'); params.push(req.query.statut);
  }
  const rows = db.all(
    `${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY d.date_debut DESC, d.id DESC LIMIT 100`,
    params
  );
  res.json(rows.map(r => formater(r, req)));
});

// POST /api/demandes-conges — { date_debut, date_fin, motif } pour soi-même.
router.post('/', (req, res) => {
  const { date_debut: debut, date_fin: fin } = req.body;
  const motif = String(req.body.motif || '').trim().slice(0, 500);
  if (!ISO.test(debut || '') || !ISO.test(fin || '')) return res.status(400).json({ error: 'Dates invalides.' });
  if (fin < debut) return res.status(400).json({ error: 'La fin doit être après le début.' });
  if (debut < dateLocaleISO()) return res.status(400).json({ error: 'Le congé ne peut pas commencer dans le passé.' });
  if (joursEntre(debut, fin).length > MAX_JOURS) return res.status(400).json({ error: `Une demande couvre au plus ${MAX_JOURS} jours.` });
  const chevauche = db.get(
    `SELECT 1 FROM demandes_conges WHERE user_id = ? AND statut IN ('en_attente','acceptee')
       AND date_debut <= ? AND date_fin >= ?`,
    [req.user.id, fin, debut]
  );
  if (chevauche) return res.status(409).json({ error: 'Tu as déjà une demande sur ces dates.' });
  const result = db.run(
    'INSERT INTO demandes_conges (user_id, date_debut, date_fin, motif) VALUES (?, ?, ?, ?)',
    [req.user.id, debut, fin, motif]
  );
  logAudit({ userId: req.user.id, action: 'demande_conge', entity: 'demandes_conges', entityId: result.lastInsertRowid,
    details: `${debut} → ${fin}` });
  res.status(201).json(formater(db.get(`${SELECT} WHERE d.id = ?`, [result.lastInsertRowid]), req));
});

// POST /api/demandes-conges/:id/annuler — le demandeur retire sa demande en attente.
router.post('/:id/annuler', (req, res) => {
  const d = db.get('SELECT * FROM demandes_conges WHERE id = ?', [req.params.id]);
  if (!d || d.user_id !== req.user.id) return res.status(404).json({ error: 'Demande introuvable' });
  if (d.statut !== 'en_attente') return res.status(409).json({ error: "Cette demande a déjà été traitée." });
  db.run("UPDATE demandes_conges SET statut = 'annulee' WHERE id = ?", [d.id]);
  res.json({ ok: true });
});

// POST /api/demandes-conges/:id/decision — manager. { decision: 'acceptee'|'refusee',
// retour?, jours?: ['YYYY-MM-DD', …] } — `jours` (obligatoire pour accepter) est la liste
// des jours à poser en CP, choisis dans la période demandée.
router.post('/:id/decision', requireManager, (req, res) => {
  const d = db.get('SELECT * FROM demandes_conges WHERE id = ?', [req.params.id]);
  if (!d) return res.status(404).json({ error: 'Demande introuvable' });
  if (d.statut !== 'en_attente') return res.status(409).json({ error: 'Cette demande a déjà été traitée.' });
  const accepter = req.body.decision === 'acceptee';
  const retour = String(req.body.retour || '').trim().slice(0, 500);
  let jours = [];
  if (accepter) {
    const autorises = new Set(joursEntre(d.date_debut, d.date_fin));
    jours = [...new Set(Array.isArray(req.body.jours) ? req.body.jours : [])].filter(j => autorises.has(j)).sort();
    if (jours.length === 0) return res.status(400).json({ error: 'Choisis au moins un jour à poser.' });
  } else if (!retour) {
    return res.status(400).json({ error: 'Indique la raison du refus.' });
  }

  for (const jour of jours) upsertJour(d.user_id, jour, { type: 'cp', notes: null });
  db.run(
    `UPDATE demandes_conges SET statut = ?, retour_manager = ?, jours = ?, decide_par = ?, decide_le = datetime('now') WHERE id = ?`,
    [accepter ? 'acceptee' : 'refusee', retour, JSON.stringify(jours), req.user.id, d.id]
  );
  db.run('INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, 'decision_conge', 'demandes_conges', d.id,
     accepter ? `acceptée : ${jours.length} jour(s) posés (${d.date_debut} → ${d.date_fin})` : `refusée (${d.date_debut} → ${d.date_fin})`]);
  res.json(formater(db.get(`${SELECT} WHERE d.id = ?`, [d.id]), req));
});

module.exports = router;
