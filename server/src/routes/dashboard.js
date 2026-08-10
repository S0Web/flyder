const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { generateInsights } = require('../lib/insights');

// GET /api/dashboard?periode=tout|(rien)&debut=YYYY-MM-DD&fin=YYYY-MM-DD&statut=programme|effectue|annule
// periode=tout : aucun filtre de date (tout l'historique). Sinon, debut/fin (défaut :
// année scolaire en cours). statut : restreint Top Cours/Top Coachs à cette catégorie
// (les KPI et la fréquentation mensuelle affichent toujours les 3 catégories, c'est
// juste Top Cours/Top Coachs qui changent de base de calcul — ex. "annule" donne le
// top des cours/coachs les plus annulés au lieu des plus réalisés).
router.get('/', (req, res) => {
  const now   = new Date();
  const year  = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1; // septembre = mois 8
  const toutTemps = req.query.periode === 'tout';
  const debut = toutTemps ? null : (req.query.debut || `${year}-09-01`);
  const fin   = toutTemps ? null : (req.query.fin   || `${year + 1}-08-31`);

  const dateCond   = toutTemps ? '1=1' : 'date BETWEEN ? AND ?';
  const dateCondS  = toutTemps ? '1=1' : 's.date BETWEEN ? AND ?';
  const dateParams = toutTemps ? [] : [debut, fin];

  const statutCat = ['programme', 'effectue', 'annule'].includes(req.query.statut) ? req.query.statut : null;
  const topStatutClause = statutCat === 'programme' ? '1=1'
    : statutCat === 'annule' ? "s.statut = 'annule'"
    : "s.statut IN ('effectue','paye')"; // défaut ou 'effectue'

  // ── KPI globaux ────────────────────────────────────────────────
  const kpi = db.get(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN statut IN ('effectue','paye') THEN 1 ELSE 0 END) AS effectues,
      SUM(CASE WHEN statut = 'annule' THEN 1 ELSE 0 END) AS annules
    FROM seances WHERE ${dateCond}
  `, dateParams);

  // ── Fréquentation mensuelle ────────────────────────────────────
  const mensuel = db.all(`
    SELECT
      SUBSTR(date,1,7) AS mois,
      COUNT(*) AS programmes,
      SUM(CASE WHEN statut IN ('effectue','paye') THEN 1 ELSE 0 END) AS effectues,
      SUM(CASE WHEN statut = 'annule' THEN 1 ELSE 0 END) AS annules,
      SUM(CASE WHEN statut IN ('effectue','paye') THEN nb_presents ELSE 0 END) AS effectif,
      SUM(CASE WHEN statut IN ('effectue','paye') THEN duree_minutes ELSE 0 END) AS total_minutes
    FROM seances
    WHERE ${dateCond}
    GROUP BY mois ORDER BY mois
  `, dateParams);

  // ── Top cours ──────────────────────────────────────────────────
  const topCours = db.all(`
    SELECT
      ct.nom,
      COUNT(*) AS seances,
      SUM(COALESCE(s.nb_presents, 0)) AS total_presents,
      ROUND(AVG(CASE WHEN s.nb_presents IS NOT NULL THEN s.nb_presents END), 1) AS moy_presents
    FROM seances s
    JOIN cours_types ct ON ct.id = s.cours_type_id
    WHERE ${dateCondS} AND ${topStatutClause}
    GROUP BY s.cours_type_id
    ORDER BY seances DESC
    LIMIT 10
  `, dateParams);

  // ── Top coachs ─────────────────────────────────────────────────
  const topCoachs = db.all(`
    SELECT
      c.prenom || ' ' || c.nom AS coach,
      COUNT(*) AS seances,
      ROUND(SUM(s.duree_minutes) / 60.0, 2) AS heures,
      ROUND(AVG(CASE WHEN s.nb_presents IS NOT NULL THEN s.nb_presents END), 1) AS moy_presents
    FROM seances s
    JOIN coaches c ON c.id = s.coach_id
    WHERE ${dateCondS} AND ${topStatutClause}
    GROUP BY s.coach_id
    ORDER BY heures DESC
    LIMIT 10
  `, dateParams);

  // Indépendant du filtre de période choisi : les insights portent toujours sur
  // les dernières semaines réelles (une tendance récente n'a pas de sens sur une
  // plage arbitraire choisie par l'utilisateur).
  const insights = generateInsights(db);

  res.json({ kpi, mensuel, topCours, topCoachs, insights, debut, fin, statutCat });
});

module.exports = router;
