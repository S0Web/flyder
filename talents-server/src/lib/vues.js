// Comptage des vues de profil (`profile_views`, voir db/database.js pour la
// règle de déduplication par jour). Trois façons de lire le compteur : une
// détaillée par période (page "mon profil"), une simple par id (admin,
// détail suffisant), une pour toute une table en une requête (liste admin,
// évite N requêtes pour N profils affichés).
const db = require('../db/database');

// "Entre hier et aujourd'hui" = les 2 derniers jours calendaires, "7/30
// derniers jours" incluent aujourd'hui (d'où -6/-29 et pas -7/-30) — un seul
// aller-retour SQL calcule les quatre compteurs à la fois.
function compterVuesPeriodes(type, id) {
  const row = db.get(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN date(created_at) >= date('now', '-1 day') THEN 1 ELSE 0 END) as hier_aujourdhui,
       SUM(CASE WHEN date(created_at) >= date('now', '-6 day') THEN 1 ELSE 0 END) as jours_7,
       SUM(CASE WHEN date(created_at) >= date('now', '-29 day') THEN 1 ELSE 0 END) as jours_30
     FROM profile_views WHERE cible_type = ? AND cible_id = ?`,
    [type, id]
  );
  return {
    hier_aujourdhui: row.hier_aujourdhui || 0,
    jours_7: row.jours_7 || 0,
    jours_30: row.jours_30 || 0,
    total: row.total || 0,
  };
}

function compterVues(type, id) {
  return db.get('SELECT COUNT(*) as n FROM profile_views WHERE cible_type = ? AND cible_id = ?', [type, id]).n;
}

function carteVues(type) {
  const rows = db.all('SELECT cible_id, COUNT(*) as n FROM profile_views WHERE cible_type = ? GROUP BY cible_id', [type]);
  return new Map(rows.map((r) => [r.cible_id, r.n]));
}

module.exports = { compterVuesPeriodes, compterVues, carteVues };
