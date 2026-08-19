const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Routes admin (humain connecté au backoffice, requireAuth appliqué au montage
// dans index.js) — rédaction des annonces diffusées à toutes les salles.

router.get('/', (req, res) => {
  res.json(db.all('SELECT * FROM changelog_entries ORDER BY created_at DESC'));
});

function validate(body) {
  if (!body.titre || !body.titre.trim()) return 'Le titre est requis';
  if (!body.corps || !body.corps.trim()) return 'Le contenu est requis';
  return null;
}

router.post('/', (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const { titre, corps, importante } = req.body;
  const result = db.run(
    'INSERT INTO changelog_entries (titre, corps, importante) VALUES (?, ?, ?)',
    [titre.trim(), corps.trim(), importante ? 1 : 0]
  );
  res.status(201).json(db.get('SELECT * FROM changelog_entries WHERE id = ?', [result.lastInsertRowid]));
});

router.put('/:id', (req, res) => {
  const entry = db.get('SELECT id FROM changelog_entries WHERE id = ?', [req.params.id]);
  if (!entry) return res.status(404).json({ error: 'Annonce introuvable' });
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const { titre, corps, importante } = req.body;
  db.run(
    'UPDATE changelog_entries SET titre = ?, corps = ?, importante = ? WHERE id = ?',
    [titre.trim(), corps.trim(), importante ? 1 : 0, req.params.id]
  );
  res.json(db.get('SELECT * FROM changelog_entries WHERE id = ?', [req.params.id]));
});

router.delete('/:id', (req, res) => {
  const entry = db.get('SELECT id FROM changelog_entries WHERE id = ?', [req.params.id]);
  if (!entry) return res.status(404).json({ error: 'Annonce introuvable' });
  db.run('DELETE FROM changelog_entries WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
