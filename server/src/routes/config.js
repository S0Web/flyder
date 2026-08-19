const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getPreference } = require('../lib/preferences');

// GET /api/config — configuration publique de l'instance (par salle).
// salleNom/salleAdresse viennent de Préférences (éditables par un manager),
// qui retombe elle-même sur les variables d'env Railway tant qu'une salle
// n'y a jamais touché — donc chaque service garde son identité par défaut.
router.get('/', (req, res) => {
  const corbeilHistoriqueImporte = !!db.get(
    "SELECT 1 FROM import_markers WHERE nom = 'corbeil_historique_2024_2025'"
  );
  res.json({
    salleNom: getPreference('salle_nom'),
    salleAdresse: getPreference('salle_adresse'),
    corbeilHistoriqueImporte,
  });
});

module.exports = router;
