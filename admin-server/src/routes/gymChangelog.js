const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Route appelée par le SERVEUR d'une salle (jamais directement par un navigateur),
// authentifiée par clé API (requireClientApiKey, monté dans index.js). req.client
// vient de cette authentification — sert à filtrer les annonces ciblées : une
// annonce sans ligne dans changelog_entry_clients est diffusée à toutes les
// salles, sinon uniquement à celles listées.
router.get('/', (req, res) => {
  res.json(db.all(
    `SELECT id, titre, corps, importante, created_at FROM changelog_entries ce
     WHERE NOT EXISTS (SELECT 1 FROM changelog_entry_clients WHERE entry_id = ce.id)
        OR EXISTS (SELECT 1 FROM changelog_entry_clients WHERE entry_id = ce.id AND client_id = ?)
     ORDER BY id ASC`,
    [req.client.id]
  ));
});

module.exports = router;
