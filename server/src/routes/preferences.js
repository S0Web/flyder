const express = require('express');
const router = express.Router();
const { requireManager } = require('../middleware/auth');
const { getPreferences, setPreferences } = require('../lib/preferences');

// Lecture ouverte à tout profil connecté (ex. le délai de déconnexion s'applique
// à tout le monde, pas seulement aux managers) ; écriture réservée aux managers.
router.get('/', (req, res) => {
  res.json(getPreferences());
});

router.patch('/', requireManager, (req, res) => {
  setPreferences(req.body);
  res.json(getPreferences());
});

module.exports = router;
