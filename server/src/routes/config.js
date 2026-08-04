const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/config — configuration publique de l'instance (par salle).
// Pilotée par des variables d'environnement Railway, donc chaque service
// (Corbeil, Ballancourt, …) renvoie sa propre identité sans rebuild.
router.get('/', (req, res) => {
  const corbeilHistoriqueImporte = !!db.get(
    "SELECT 1 FROM import_markers WHERE nom = 'corbeil_historique_2024_2025'"
  );
  res.json({
    salleNom: process.env.SALLE_NOM || '',
    salleAdresse: process.env.SALLE_ADRESSE || '',
    corbeilHistoriqueImporte,
  });
});

module.exports = router;
