const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Routes admin (humain connecté au backoffice, requireAuth appliqué au montage
// dans index.js) — rédaction des annonces diffusées à toutes les salles, ou
// ciblées sur une sélection.

// clientIds vide/absent : ciblage "toutes les salles" (voir schéma). Sinon,
// remplace entièrement la liste de salles ciblées pour cette annonce.
function setCibles(entryId, clientIds) {
  db.run('DELETE FROM changelog_entry_clients WHERE entry_id = ?', [entryId]);
  for (const clientId of clientIds || []) {
    db.run('INSERT INTO changelog_entry_clients (entry_id, client_id) VALUES (?, ?)', [entryId, clientId]);
  }
}

function withCibles(entry) {
  const cibles = db.all('SELECT client_id FROM changelog_entry_clients WHERE entry_id = ?', [entry.id]);
  return { ...entry, clientIds: cibles.map(c => c.client_id) };
}

router.get('/', (req, res) => {
  const entries = db.all('SELECT * FROM changelog_entries ORDER BY created_at DESC');
  res.json(entries.map(withCibles));
});

function validate(body) {
  if (!body.titre || !body.titre.trim()) return 'Le titre est requis';
  if (!body.corps || !body.corps.trim()) return 'Le contenu est requis';
  return null;
}

router.post('/', (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const { titre, corps, importante, clientIds } = req.body;
  const result = db.run(
    'INSERT INTO changelog_entries (titre, corps, importante) VALUES (?, ?, ?)',
    [titre.trim(), corps.trim(), importante ? 1 : 0]
  );
  setCibles(result.lastInsertRowid, clientIds);
  res.status(201).json(withCibles(db.get('SELECT * FROM changelog_entries WHERE id = ?', [result.lastInsertRowid])));
});

router.put('/:id', (req, res) => {
  const entry = db.get('SELECT id FROM changelog_entries WHERE id = ?', [req.params.id]);
  if (!entry) return res.status(404).json({ error: 'Annonce introuvable' });
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const { titre, corps, importante, clientIds } = req.body;
  db.run(
    'UPDATE changelog_entries SET titre = ?, corps = ?, importante = ? WHERE id = ?',
    [titre.trim(), corps.trim(), importante ? 1 : 0, req.params.id]
  );
  setCibles(req.params.id, clientIds);
  res.json(withCibles(db.get('SELECT * FROM changelog_entries WHERE id = ?', [req.params.id])));
});

router.delete('/:id', (req, res) => {
  const entry = db.get('SELECT id FROM changelog_entries WHERE id = ?', [req.params.id]);
  if (!entry) return res.status(404).json({ error: 'Annonce introuvable' });
  db.run('DELETE FROM changelog_entries WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
