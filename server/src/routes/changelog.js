const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { adminApi, SupportIndisponibleError } = require('../lib/adminApi');

// Nouveautés : le contenu vient d'admin-server (relayé, même canal que les
// tickets), mais "qu'est-ce que CET utilisateur a déjà vu" est purement local
// (app_users.dernier_changelog_vu_id), pas de notion de salle côté admin.

router.get('/', async (req, res) => {
  let entries;
  try {
    entries = await adminApi('/changelog');
  } catch (err) {
    if (err instanceof SupportIndisponibleError) return res.json([]);
    return res.status(err.status || 500).json({ error: err.message });
  }
  const row = db.get('SELECT dernier_changelog_vu_id FROM app_users WHERE id = ?', [req.user.id]);
  const vuId = row?.dernier_changelog_vu_id || 0;
  res.json(entries.map(e => ({ ...e, vue: e.id <= vuId })));
});

router.post('/vu', (req, res) => {
  db.run('UPDATE app_users SET dernier_changelog_vu_id = ? WHERE id = ?', [req.body.id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
