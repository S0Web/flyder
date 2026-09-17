// Comptage des vues de profil (`profile_views`, voir db/database.js pour la
// règle de déduplication par jour). Deux façons de lire le compteur : une
// par id (page "mon profil"), une pour toute une table en une requête
// (liste admin) — éviter N requêtes pour N profils affichés.
const db = require('../db/database');

function compterVues(type, id) {
  return db.get('SELECT COUNT(*) as n FROM profile_views WHERE cible_type = ? AND cible_id = ?', [type, id]).n;
}

function carteVues(type) {
  const rows = db.all('SELECT cible_id, COUNT(*) as n FROM profile_views WHERE cible_type = ? GROUP BY cible_id', [type]);
  return new Map(rows.map((r) => [r.cible_id, r.n]));
}

module.exports = { compterVues, carteVues };
