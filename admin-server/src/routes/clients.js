const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { hashKey } = require('../middleware/clientAuth');

const STATUTS_VALIDES = ['essai', 'actif', 'suspendu', 'resilie'];

// GET /api/clients — liste, plus récents en premier
router.get('/', (req, res) => {
  res.json(db.all('SELECT * FROM clients ORDER BY created_at DESC'));
});

// GET /api/clients/:id
router.get('/:id', (req, res) => {
  const client = db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });
  res.json(client);
});

function validate(body) {
  if (!body.nom || !body.nom.trim()) return 'Le nom est requis';
  if (body.statut && !STATUTS_VALIDES.includes(body.statut)) return 'Statut invalide';
  return null;
}

// POST /api/clients
router.post('/', (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });

  const { nom, sous_domaine, salle_nom_env, statut, plan, contact_nom, contact_email, contact_telephone, date_debut, notes } = req.body;
  const result = db.run(
    `INSERT INTO clients (nom, sous_domaine, salle_nom_env, statut, plan, contact_nom, contact_email, contact_telephone, date_debut, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nom.trim(), sous_domaine || null, salle_nom_env || null, statut || 'essai', plan || null,
     contact_nom || null, contact_email || null, contact_telephone || null, date_debut || null, notes || null]
  );
  res.status(201).json(db.get('SELECT * FROM clients WHERE id = ?', [result.lastInsertRowid]));
});

// PUT /api/clients/:id
router.put('/:id', (req, res) => {
  const client = db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });

  const { nom, sous_domaine, salle_nom_env, statut, plan, contact_nom, contact_email, contact_telephone, date_debut, notes } = req.body;
  db.run(
    `UPDATE clients SET nom=?, sous_domaine=?, salle_nom_env=?, statut=?, plan=?, contact_nom=?, contact_email=?, contact_telephone=?, date_debut=?, notes=?, updated_at=datetime('now')
     WHERE id=?`,
    [nom.trim(), sous_domaine || null, salle_nom_env || null, statut || 'essai', plan || null,
     contact_nom || null, contact_email || null, contact_telephone || null, date_debut || null, notes || null,
     req.params.id]
  );
  res.json(db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]));
});

// POST /api/clients/:id/regenerate-key — (re)génère la clé de service utilisée
// par le serveur de cette salle pour appeler /api/gym/*. La valeur en clair
// n'est renvoyée qu'ici, une seule fois : seule son empreinte est conservée.
router.post('/:id/regenerate-key', (req, res) => {
  const client = db.get('SELECT id FROM clients WHERE id = ?', [req.params.id]);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });

  const clair = crypto.randomBytes(24).toString('hex');
  db.run('UPDATE clients SET api_key_hash = ?, updated_at = datetime(\'now\') WHERE id = ?', [hashKey(clair), req.params.id]);
  res.json({ apiKey: clair });
});

// DELETE /api/clients/:id
router.delete('/:id', (req, res) => {
  const client = db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });
  db.run('DELETE FROM clients WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
