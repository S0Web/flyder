const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Route appelée par le SERVEUR d'une salle (jamais directement par un navigateur),
// authentifiée par clé API (requireClientApiKey, monté dans index.js). Le contenu
// n'est pas propre à une salle (même annonces pour tout le monde), mais on garde
// le même canal authentifié que les tickets plutôt qu'un accès public ouvert.
router.get('/', (req, res) => {
  res.json(db.all('SELECT id, titre, corps, importante, created_at FROM changelog_entries ORDER BY id ASC'));
});

module.exports = router;
