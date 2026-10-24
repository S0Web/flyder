const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireManager } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

// Types d'incident (bassin, matériel, autre… par défaut) : propres à chaque salle,
// gérés par un manager depuis Préférences. Un type utilisé par des incidents ne peut
// pas être supprimé (on le désactive à la place : il reste lisible sur l'historique,
// mais disparaît des choix proposés à la création).

// GET /api/incident-types — tout le monde (liste des choix pour signaler un incident).
router.get('/', (req, res) => {
  res.json(db.all('SELECT * FROM incident_types ORDER BY actif DESC, nom'));
});

// POST /api/incident-types — manager
router.post('/', requireManager, (req, res) => {
  const nom = String(req.body.nom || '').trim();
  if (!nom) return res.status(400).json({ error: 'Le nom est requis' });
  try {
    const result = db.run('INSERT INTO incident_types (nom) VALUES (?)', [nom]);
    logAudit({ userId: req.user.id, action: 'create_incident_type', entity: 'incident_types', entityId: result.lastInsertRowid,
      details: nom });
    res.status(201).json(db.get('SELECT * FROM incident_types WHERE id = ?', [result.lastInsertRowid]));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Ce type existe déjà' });
    throw err;
  }
});

// PATCH /api/incident-types/:id — { nom?, actif? } — manager
router.patch('/:id', requireManager, (req, res) => {
  const existant = db.get('SELECT * FROM incident_types WHERE id = ?', [req.params.id]);
  if (!existant) return res.status(404).json({ error: 'Type introuvable' });
  const nom = req.body.nom !== undefined ? String(req.body.nom).trim() : existant.nom;
  if (!nom) return res.status(400).json({ error: 'Le nom est requis' });
  const actif = req.body.actif !== undefined ? (req.body.actif ? 1 : 0) : existant.actif;
  try {
    db.run('UPDATE incident_types SET nom = ?, actif = ? WHERE id = ?', [nom, actif, existant.id]);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Ce type existe déjà' });
    throw err;
  }
  logAudit({ userId: req.user.id, action: 'update_incident_type', entity: 'incident_types', entityId: existant.id,
    details: `${existant.nom} → ${nom}${actif !== existant.actif ? (actif ? ' (réactivé)' : ' (désactivé)') : ''}` });
  res.json(db.get('SELECT * FROM incident_types WHERE id = ?', [existant.id]));
});

// DELETE /api/incident-types/:id — manager, seulement si aucun incident ne l'utilise.
router.delete('/:id', requireManager, (req, res) => {
  const existant = db.get('SELECT * FROM incident_types WHERE id = ?', [req.params.id]);
  if (!existant) return res.status(404).json({ error: 'Type introuvable' });
  const utilise = db.get('SELECT 1 FROM incidents WHERE type_id = ?', [existant.id]);
  if (utilise) return res.status(409).json({ error: 'Ce type est utilisé par au moins un incident : désactive-le plutôt que de le supprimer.' });
  db.run('DELETE FROM incident_types WHERE id = ?', [existant.id]);
  logAudit({ userId: req.user.id, action: 'delete_incident_type', entity: 'incident_types', entityId: existant.id,
    details: existant.nom });
  res.json({ ok: true });
});

module.exports = router;
