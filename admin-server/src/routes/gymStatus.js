const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Délai de grâce entre le premier événement Stripe d'impayé/résiliation et le
// blocage effectif de l'app côté salle — le temps que le manager régularise.
const GRACE_JOURS = 3;

// Route appelée par le SERVEUR d'une salle (jamais directement par un
// navigateur), authentifiée par clé API (requireClientApiKey, monté dans
// index.js). req.client vient de cette même authentification.
router.get('/', (req, res) => {
  const client = db.get(
    `SELECT statut, stripe_inactif_depuis,
     (julianday('now') - julianday(stripe_inactif_depuis)) AS jours_ecoules
     FROM clients WHERE id = ?`,
    [req.client.id]
  );

  const enDefaut = ['suspendu', 'resilie'].includes(client.statut) && client.stripe_inactif_depuis;
  if (!enDefaut) {
    return res.json({ statut: client.statut, bloque: false, avertissement: false, joursRestants: null });
  }

  const bloque = client.jours_ecoules >= GRACE_JOURS;
  res.json({
    statut: client.statut,
    bloque,
    avertissement: !bloque,
    joursRestants: bloque ? 0 : Math.max(1, Math.ceil(GRACE_JOURS - client.jours_ecoules)),
  });
});

module.exports = router;
