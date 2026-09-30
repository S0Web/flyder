const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { dateLocaleISO, ajouterJours } = require('../lib/dates');

// Incidents du terrain (bassin, matériel…). Tout le monde peut en signaler et les consulter
// (pas de doublons, l'équipe sait ce qui est en cours) ; un manager attribue, modifie et supprime ;
// le responsable désigné fait avancer le statut et note la mesure prise.

const TYPES   = ['bassin', 'materiel', 'autre'];
const STATUTS = ['ouvert', 'en_cours', 'resolu'];

const SELECT_INCIDENT = `
  SELECT i.*,
    r.prenom AS responsable_prenom, r.nom AS responsable_nom,
    s.prenom AS signale_prenom, s.nom AS signale_nom
  FROM incidents i
  LEFT JOIN app_users r ON r.id = i.responsable_id
  JOIN app_users s ON s.id = i.signale_par
`;

const estManager = (req) => req.user.role === 'manager';
const maintenant = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function membreValide(id) {
  return !!db.get('SELECT 1 FROM app_users WHERE id = ? AND supprime = 0 AND actif = 1', [id]);
}

// GET /api/incidents?statut=ouverts|resolus|tous&type=
router.get('/', (req, res) => {
  const where = [];
  const params = [];
  const statut = req.query.statut || 'tous';
  if (statut === 'ouverts') where.push("i.statut != 'resolu'");
  // Les incidents résolus restent consultables 12 mois (traçabilité), pas indéfiniment dans la liste.
  if (statut === 'resolus') { where.push("i.statut = 'resolu' AND i.resolu_le >= ?"); params.push(ajouterJours(dateLocaleISO(), -365)); }
  if (statut === 'tous') { where.push("(i.statut != 'resolu' OR i.resolu_le >= ?)"); params.push(ajouterJours(dateLocaleISO(), -365)); }
  if (TYPES.includes(req.query.type)) { where.push('i.type = ?'); params.push(req.query.type); }
  const rows = db.all(
    `${SELECT_INCIDENT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY (i.statut = 'resolu'), i.date_signalement DESC, i.id DESC`,
    params
  );
  res.json(rows);
});

// POST /api/incidents — { type, titre, description?, responsable_id? (manager), compte_rendu_id? (manager) }
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
  if (!TYPES.includes(b.type)) return res.status(400).json({ error: 'Type invalide (bassin, matériel ou autre).' });
  let responsable = null;
  if (b.responsable_id) {
    if (!manager) return res.status(403).json({ error: 'Seul un manager peut désigner un responsable.' });
    responsable = Number(b.responsable_id);
    if (!membreValide(responsable)) return res.status(400).json({ error: 'Responsable introuvable.' });
  }

  const result = db.run(
    `INSERT INTO incidents (type, titre, description, responsable_id, signale_par, date_signalement, compte_rendu_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [b.type, String(titre).trim(), String(description || '').trim(), responsable, signalePar, date, compteRenduId]
  );
  if (compteRenduId) db.run('UPDATE comptes_rendus SET probleme_incident_id = ? WHERE id = ?', [result.lastInsertRowid, compteRenduId]);
  res.status(201).json(db.get(`${SELECT_INCIDENT} WHERE i.id = ?`, [result.lastInsertRowid]));
});

// PATCH /api/incidents/:id — manager : tout ; responsable : statut et mesure prise seulement.
router.patch('/:id', (req, res) => {
  const inc = db.get('SELECT * FROM incidents WHERE id = ?', [req.params.id]);
  if (!inc) return res.status(404).json({ error: 'Incident introuvable' });
  const manager = estManager(req);
  const responsable = inc.responsable_id === req.user.id;
  if (!manager && !responsable) return res.status(403).json({ error: "Seul un manager ou le responsable de l'incident peut le modifier." });

  const b = req.body;
  const champsManager = ['type', 'titre', 'description', 'responsable_id'];
  if (!manager && champsManager.some(k => b[k] !== undefined)) {
    return res.status(403).json({ error: 'Seul un manager peut modifier ces champs.' });
  }

  const next = { ...inc };
  if (b.type !== undefined) {
    if (!TYPES.includes(b.type)) return res.status(400).json({ error: 'Type invalide.' });
    next.type = b.type;
  }
  if (b.titre !== undefined) {
    if (!String(b.titre).trim()) return res.status(400).json({ error: 'Le titre est requis' });
    next.titre = String(b.titre).trim();
  }
  if (b.description !== undefined) next.description = String(b.description).trim();
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
    `UPDATE incidents SET type=?, titre=?, description=?, statut=?, responsable_id=?, resolution=?,
       resolu_le=?, resolu_par=?, updated_at=datetime('now') WHERE id=?`,
    [next.type, next.titre, next.description, next.statut, next.responsable_id, next.resolution, next.resolu_le, next.resolu_par, inc.id]
  );
  res.json(db.get(`${SELECT_INCIDENT} WHERE i.id = ?`, [inc.id]));
});

// DELETE /api/incidents/:id — manager
router.delete('/:id', (req, res) => {
  if (!estManager(req)) return res.status(403).json({ error: 'Réservé aux managers.' });
  const inc = db.get('SELECT id FROM incidents WHERE id = ?', [req.params.id]);
  if (!inc) return res.status(404).json({ error: 'Incident introuvable' });
  db.run('UPDATE comptes_rendus SET probleme_incident_id = NULL WHERE probleme_incident_id = ?', [inc.id]);
  db.run('DELETE FROM incidents WHERE id = ?', [inc.id]);
  res.json({ ok: true });
});

module.exports = router;
