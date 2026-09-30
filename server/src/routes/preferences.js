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
  const { ouverture_heure: o, fermeture_heure: f } = req.body;
  if (o !== undefined || f !== undefined) {
    const prefs = getPreferences();
    const ouverture = Number(o !== undefined ? o : prefs.ouverture_heure);
    const fermeture = Number(f !== undefined ? f : prefs.fermeture_heure);
    if (!Number.isInteger(ouverture) || !Number.isInteger(fermeture)
        || ouverture < 0 || fermeture > 24 || ouverture >= fermeture) {
      return res.status(400).json({ error: "Heures d'ouverture invalides : deux heures entières, l'ouverture avant la fermeture." });
    }
  }
  setPreferences(req.body);
  res.json(getPreferences());
});

module.exports = router;
