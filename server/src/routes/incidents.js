const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { dateLocaleISO, ajouterJours } = require('../lib/dates');
const { logAudit } = require('../lib/audit');

// Incidents du terrain (bassin, matériel…), façon tickets : type (configurable par
// salle, cf. incidentTypes.js), priorité, statut, responsable, fil de commentaires.
// Tout le monde peut en signaler et les consulter (pas de doublons, l'équipe sait ce
// qui est en cours) ; un manager attribue, modifie et supprime ; le responsable
// désigné fait avancer le statut et note la mesure prise.

const STATUTS   = ['ouvert', 'en_cours', 'resolu'];
const PRIORITES = ['basse', 'normale', 'haute', 'urgente'];
const STATUT_LABELS = { ouvert: 'ouvert', en_cours: 'en cours', resolu: 'résolu' };

const SELECT_INCIDENT = `
  SELECT i.*,
    t.nom AS type_nom,
    r.prenom AS responsable_prenom, r.nom AS responsable_nom,
    s.prenom AS signale_prenom, s.nom AS signale_nom,
    (SELECT COUNT(*) FROM incident_commentaires ic WHERE ic.incident_id = i.id) AS nb_commentaires
  FROM incidents i
  JOIN incident_types t ON t.id = i.type_id
  LEFT JOIN app_users r ON r.id = i.responsable_id
  JOIN app_users s ON s.id = i.signale_par
`;

const estManager = (req) => req.user.role === 'manager';
const maintenant = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function membreValide(id) {
  return !!db.get('SELECT 1 FROM app_users WHERE id = ? AND supprime = 0 AND actif = 1', [id]);
}
function typeValide(id) {
  return db.get('SELECT nom FROM incident_types WHERE id = ?', [id]);
}

// GET /api/incidents?statut=ouverts|resolus|tous&type_id=
router.get('/', (req, res) => {
  const where = [];
  const params = [];
  const statut = req.query.statut || 'tous';
  if (statut === 'ouverts') where.push("i.statut != 'resolu'");
  // Les incidents résolus restent consultables 12 mois (traçabilité), pas indéfiniment dans la liste.
  if (statut === 'resolus') { where.push("i.statut = 'resolu' AND i.resolu_le >= ?"); params.push(ajouterJours(dateLocaleISO(), -365)); }
  if (statut === 'tous') { where.push("(i.statut != 'resolu' OR i.resolu_le >= ?)"); params.push(ajouterJours(dateLocaleISO(), -365)); }
  if (req.query.type_id) { where.push('i.type_id = ?'); params.push(Number(req.query.type_id)); }
  const rows = db.all(
    `${SELECT_INCIDENT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY (i.statut = 'resolu'),
       CASE i.priorite WHEN 'urgente' THEN 0 WHEN 'haute' THEN 1 WHEN 'normale' THEN 2 ELSE 3 END,
       i.date_signalement DESC, i.id DESC`,
    params
  );
  res.json(rows);
});

// POST /api/incidents — { type_id, titre, description?, priorite?, responsable_id? (manager), compte_rendu_id? (manager) }
router.post('/', (req, res) => {
  const b = req.body;
  const manager = estManager(req);
  let { titre, description } = b;
  let signalePar = req.user.id;
  let date = dateLocaleISO();
  let compteRenduId = null;

  if (b.compte_rendu_id) {
    // Reprise d'un problème signalé dans un bilan : réservé aux managers.
    if (!manager) return res.status(403).json({ error: 'Seul un manager peut reprendre un problème de bilan.' });
    const cr = db.get('SELECT id, user_id, date, statut, probleme, probleme_incident_id FROM comptes_rendus WHERE id = ?', [b.compte_rendu_id]);
    if (!cr || cr.statut === 'brouillon' || !cr.probleme.trim()) return res.status(404).json({ error: 'Problème introuvable' });
    if (cr.probleme_incident_id && db.get('SELECT 1 FROM incidents WHERE id = ?', [cr.probleme_incident_id])) {
      return res.status(409).json({ error: 'Ce problème est déjà suivi comme incident.' });
    }
    compteRenduId = cr.id;
    signalePar = cr.user_id;
    date = cr.date;
    if (!titre || !String(titre).trim()) titre = cr.probleme.trim().split('\n')[0].slice(0, 120);
    if (description === undefined) description = cr.probleme.trim();
  }

  if (!titre || !String(titre).trim()) return res.status(400).json({ error: 'Le titre est requis' });
  const typeId = Number(b.type_id);
  if (!typeId || !typeValide(typeId)) return res.status(400).json({ error: 'Type invalide — choisis-en un dans la liste (réglable dans Préférences).' });
  const priorite = PRIORITES.includes(b.priorite) ? b.priorite : 'normale';
  let responsable = null;
  if (b.responsable_id) {
    if (!manager) return res.status(403).json({ error: 'Seul un manager peut désigner un responsable.' });
    responsable = Number(b.responsable_id);
    if (!membreValide(responsable)) return res.status(400).json({ error: 'Responsable introuvable.' });
  }

  const result = db.run(
    `INSERT INTO incidents (type_id, priorite, titre, description, responsable_id, signale_par, date_signalement, compte_rendu_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [typeId, priorite, String(titre).trim(), String(description || '').trim(), responsable, signalePar, date, compteRenduId]
  );
  if (compteRenduId) db.run('UPDATE comptes_rendus SET probleme_incident_id = ? WHERE id = ?', [result.lastInsertRowid, compteRenduId]);
  logAudit({ userId: req.user.id, action: 'creer_incident', entity: 'incidents', entityId: result.lastInsertRowid,
    details: `${typeValide(typeId).nom} — ${String(titre).trim()}` });
  res.status(201).json(db.get(`${SELECT_INCIDENT} WHERE i.id = ?`, [result.lastInsertRowid]));
});

// PATCH /api/incidents/:id — manager : tout ; responsable : statut, priorité et mesure prise seulement.
router.patch('/:id', (req, res) => {
  const inc = db.get('SELECT * FROM incidents WHERE id = ?', [req.params.id]);
  if (!inc) return res.status(404).json({ error: 'Incident introuvable' });
  const manager = estManager(req);
  const responsable = inc.responsable_id === req.user.id;
  if (!manager && !responsable) return res.status(403).json({ error: "Seul un manager ou le responsable de l'incident peut le modifier." });

  const b = req.body;
  const champsManager = ['type_id', 'titre', 'description', 'responsable_id'];
  if (!manager && champsManager.some(k => b[k] !== undefined)) {
    return res.status(403).json({ error: 'Seul un manager peut modifier ces champs.' });
  }

  const next = { ...inc };
  if (b.type_id !== undefined) {
    const t = typeValide(Number(b.type_id));
    if (!t) return res.status(400).json({ error: 'Type invalide.' });
    next.type_id = Number(b.type_id);
  }
  if (b.titre !== undefined) {
    if (!String(b.titre).trim()) return res.status(400).json({ error: 'Le titre est requis' });
    next.titre = String(b.titre).trim();
  }
  if (b.description !== undefined) next.description = String(b.description).trim();
  if (b.priorite !== undefined && PRIORITES.includes(b.priorite)) next.priorite = b.priorite;
  if (b.responsable_id !== undefined) {
    if (b.responsable_id === null || b.responsable_id === '') next.responsable_id = null;
    else {
      next.responsable_id = Number(b.responsable_id);
      if (!membreValide(next.responsable_id)) return res.status(400).json({ error: 'Responsable introuvable.' });
    }
  }
  if (b.resolution !== undefined) next.resolution = String(b.resolution).trim();
  if (b.statut !== undefined) {
    if (!STATUTS.includes(b.statut)) return res.status(400).json({ error: 'Statut invalide.' });
    if (b.statut !== inc.statut) {
      next.statut = b.statut;
      if (b.statut === 'resolu') { next.resolu_le = maintenant(); next.resolu_par = req.user.id; }
      else { next.resolu_le = null; next.resolu_par = null; }
    }
  }

  db.run(
    `UPDATE incidents SET type_id=?, priorite=?, titre=?, description=?, statut=?, responsable_id=?, resolution=?,
       resolu_le=?, resolu_par=?, updated_at=datetime('now') WHERE id=?`,
    [next.type_id, next.priorite, next.titre, next.description, next.statut, next.responsable_id, next.resolution, next.resolu_le, next.resolu_par, inc.id]
  );
  const resume = next.statut !== inc.statut
    ? `${STATUT_LABELS[inc.statut]} → ${STATUT_LABELS[next.statut]}`
    : 'modifié';
  logAudit({ userId: req.user.id, action: 'modifier_incident', entity: 'incidents', entityId: inc.id,
    details: `${typeValide(next.type_id).nom} — ${next.titre} : ${resume}` });
  res.json(db.get(`${SELECT_INCIDENT} WHERE i.id = ?`, [inc.id]));
});

// DELETE /api/incidents/:id — manager
router.delete('/:id', (req, res) => {
  if (!estManager(req)) return res.status(403).json({ error: 'Réservé aux managers.' });
  const inc = db.get('SELECT * FROM incidents WHERE id = ?', [req.params.id]);
  if (!inc) return res.status(404).json({ error: 'Incident introuvable' });
  db.run('UPDATE comptes_rendus SET probleme_incident_id = NULL WHERE probleme_incident_id = ?', [inc.id]);
  db.run('DELETE FROM incidents WHERE id = ?', [inc.id]);
  logAudit({ userId: req.user.id, action: 'supprimer_incident', entity: 'incidents', entityId: inc.id,
    details: `${inc.titre}` });
  res.json({ ok: true });
});

// ─── Commentaires (fil de suivi, comme sur les tâches) ────────────────────────

router.get('/:id/commentaires', (req, res) => {
  const inc = db.get('SELECT id FROM incidents WHERE id = ?', [req.params.id]);
  if (!inc) return res.status(404).json({ error: 'Incident introuvable' });
  res.json(db.all(
    `SELECT ic.*, u.prenom, u.nom FROM incident_commentaires ic
     JOIN app_users u ON u.id = ic.auteur_id
     WHERE ic.incident_id = ? ORDER BY ic.created_at`,
    [inc.id]
  ));
});

router.post('/:id/commentaires', (req, res) => {
  const inc = db.get('SELECT id FROM incidents WHERE id = ?', [req.params.id]);
  if (!inc) return res.status(404).json({ error: 'Incident introuvable' });
  const contenu = String(req.body.contenu || '').trim();
  if (!contenu) return res.status(400).json({ error: 'Commentaire vide' });
  const result = db.run('INSERT INTO incident_commentaires (incident_id, auteur_id, contenu) VALUES (?, ?, ?)',
    [inc.id, req.user.id, contenu]);
  res.status(201).json(db.get(
    `SELECT ic.*, u.prenom, u.nom FROM incident_commentaires ic JOIN app_users u ON u.id = ic.auteur_id WHERE ic.id = ?`,
    [result.lastInsertRowid]
  ));
});

module.exports = router;
