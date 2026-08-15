const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

// Agrégations de la page Analyse. Un seul endpoint : tous les graphiques
// partagent la même tranche (période + catégorie), donc les calculer ensemble
// évite 10 requêtes HTTP qui pourraient se désynchroniser sur des filtres
// différents.
//
// GET /api/analytics?periode=tout|(rien)&debut=&fin=&categorie=aqua|fitness

// L'horaire est saisi tantôt "9h", "12h15", tantôt "18:30" : on coupe avant le
// premier 'h' (le ||'h' garantit qu'INSTR trouve toujours quelque chose) et on
// laisse CAST tronquer le reste — "18:30" devient 18 tout seul.
const HEURE_SQL = "CAST(SUBSTR(s.horaire, 1, INSTR(s.horaire||'h','h')-1) AS INTEGER)";
const REALISE   = "s.statut IN ('effectue','paye')";

function anneeScolaireCourante() {
  const now  = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return { debut: `${year}-09-01`, fin: `${year + 1}-08-31` };
}

router.get('/', (req, res) => {
  const toutTemps = req.query.periode === 'tout';
  const defaut    = anneeScolaireCourante();
  const debut     = toutTemps ? null : (req.query.debut || defaut.debut);
  const fin       = toutTemps ? null : (req.query.fin   || defaut.fin);

  const categorie = ['aqua', 'fitness'].includes(req.query.categorie) ? req.query.categorie : null;

  // Filtre commun à toutes les requêtes ci-dessous. Toutes joignent cours_types
  // (nécessaire au filtre catégorie), donc les alias s./ct. sont toujours valides.
  const conds  = [];
  const params = [];
  if (!toutTemps) { conds.push('s.date BETWEEN ? AND ?'); params.push(debut, fin); }
  if (categorie)  { conds.push('ct.categorie = ?');       params.push(categorie); }
  const WHERE = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const FROM = 'FROM seances s JOIN cours_types ct ON ct.id = s.cours_type_id';

  // ── Bornes des données disponibles (indépendant de la période choisie) ──
  // Sert au client à ne proposer, dans le sélecteur d'année/plage, que des
  // dates qui contiennent effectivement des séances (pour cette catégorie).
  const catCond   = categorie ? 'WHERE ct.categorie = ?' : '';
  const catParams = categorie ? [categorie] : [];
  const bornes = db.get(`SELECT MIN(s.date) AS min, MAX(s.date) AS max ${FROM} ${catCond}`, catParams);

  // ── Totaux de la période ───────────────────────────────────────
  const kpi = db.get(`
    SELECT
      COUNT(*)                                                        AS programmes,
      SUM(CASE WHEN ${REALISE}          THEN 1 ELSE 0 END)            AS effectues,
      SUM(CASE WHEN s.statut = 'annule' THEN 1 ELSE 0 END)            AS annules,
      SUM(CASE WHEN ${REALISE} THEN COALESCE(s.nb_presents,0) ELSE 0 END) AS participants,
      SUM(CASE WHEN ${REALISE} THEN s.duree_minutes ELSE 0 END)       AS minutes,
      COUNT(DISTINCT CASE WHEN ${REALISE} THEN s.coach_id END)        AS coachs_actifs,
      COUNT(DISTINCT CASE WHEN ${REALISE} THEN s.cours_type_id END)   AS cours_distincts,
      AVG(CASE WHEN ${REALISE} AND s.nb_presents IS NOT NULL THEN s.nb_presents END) AS effectif_moyen,
      SUM(CASE WHEN ${REALISE} AND s.coach_id IS NULL THEN 1 ELSE 0 END) AS sans_coach
    ${FROM} ${WHERE}
  `, params);

  // ── Série mensuelle (toutes catégories confondues) ─────────────
  const mensuel = db.all(`
    SELECT
      SUBSTR(s.date,1,7)                                              AS mois,
      COUNT(*)                                                        AS programmes,
      SUM(CASE WHEN ${REALISE}          THEN 1 ELSE 0 END)            AS effectues,
      SUM(CASE WHEN s.statut = 'annule' THEN 1 ELSE 0 END)            AS annules,
      SUM(CASE WHEN ${REALISE} THEN COALESCE(s.nb_presents,0) ELSE 0 END) AS participants,
      SUM(CASE WHEN ${REALISE} THEN s.duree_minutes ELSE 0 END)       AS minutes,
      AVG(CASE WHEN ${REALISE} AND s.nb_presents IS NOT NULL THEN s.nb_presents END) AS effectif_moyen
    ${FROM} ${WHERE}
    GROUP BY mois ORDER BY mois
  `, params);

  // ── Série mensuelle éclatée aqua / fitness ─────────────────────
  const mensuelCategorie = db.all(`
    SELECT
      SUBSTR(s.date,1,7) AS mois,
      ct.categorie       AS categorie,
      SUM(CASE WHEN ${REALISE} THEN 1 ELSE 0 END)                     AS effectues,
      SUM(CASE WHEN ${REALISE} THEN COALESCE(s.nb_presents,0) ELSE 0 END) AS participants,
      SUM(CASE WHEN ${REALISE} THEN s.duree_minutes ELSE 0 END)       AS minutes
    ${FROM} ${WHERE}
    GROUP BY mois, ct.categorie ORDER BY mois
  `, params);

  // ── Profil par jour de la semaine (0 = dimanche) ───────────────
  const parJour = db.all(`
    SELECT
      CAST(strftime('%w', s.date) AS INTEGER)                         AS jour,
      SUM(CASE WHEN ${REALISE} THEN 1 ELSE 0 END)                     AS effectues,
      SUM(CASE WHEN s.statut = 'annule' THEN 1 ELSE 0 END)            AS annules,
      SUM(CASE WHEN ${REALISE} THEN COALESCE(s.nb_presents,0) ELSE 0 END) AS participants,
      AVG(CASE WHEN ${REALISE} AND s.nb_presents IS NOT NULL THEN s.nb_presents END) AS effectif_moyen
    ${FROM} ${WHERE}
    GROUP BY jour ORDER BY jour
  `, params);

  // ── Profil par heure de début ──────────────────────────────────
  const parHeure = db.all(`
    SELECT
      ${HEURE_SQL}                                                    AS heure,
      SUM(CASE WHEN ${REALISE} THEN 1 ELSE 0 END)                     AS effectues,
      SUM(CASE WHEN ${REALISE} THEN COALESCE(s.nb_presents,0) ELSE 0 END) AS participants,
      AVG(CASE WHEN ${REALISE} AND s.nb_presents IS NOT NULL THEN s.nb_presents END) AS effectif_moyen
    ${FROM} ${WHERE}
    GROUP BY heure HAVING heure BETWEEN 5 AND 23 ORDER BY heure
  `, params);

  // ── Grille jour × heure (carte de chaleur) ─────────────────────
  const heatmap = db.all(`
    SELECT
      CAST(strftime('%w', s.date) AS INTEGER)                         AS jour,
      ${HEURE_SQL}                                                    AS heure,
      SUM(CASE WHEN ${REALISE} THEN 1 ELSE 0 END)                     AS effectues,
      AVG(CASE WHEN ${REALISE} AND s.nb_presents IS NOT NULL THEN s.nb_presents END) AS effectif_moyen
    ${FROM} ${WHERE}
    GROUP BY jour, heure HAVING heure BETWEEN 5 AND 23
  `, params);

  // ── Répartition par catégorie ──────────────────────────────────
  const categories = db.all(`
    SELECT
      ct.categorie                                                    AS categorie,
      SUM(CASE WHEN ${REALISE} THEN 1 ELSE 0 END)                     AS effectues,
      SUM(CASE WHEN ${REALISE} THEN COALESCE(s.nb_presents,0) ELSE 0 END) AS participants,
      SUM(CASE WHEN ${REALISE} THEN s.duree_minutes ELSE 0 END)       AS minutes,
      AVG(CASE WHEN ${REALISE} AND s.nb_presents IS NOT NULL THEN s.nb_presents END) AS effectif_moyen
    ${FROM} ${WHERE}
    GROUP BY ct.categorie
  `, params);

  // ── Détail par cours ───────────────────────────────────────────
  // Sert à la fois au classement et au nuage de points fréquence × effectif.
  const cours = db.all(`
    SELECT
      ct.id                                                           AS cours_type_id,
      ct.nom                                                          AS nom,
      ct.categorie                                                    AS categorie,
      COUNT(*)                                                        AS programmes,
      SUM(CASE WHEN ${REALISE} THEN 1 ELSE 0 END)                     AS effectues,
      SUM(CASE WHEN s.statut = 'annule' THEN 1 ELSE 0 END)            AS annules,
      SUM(CASE WHEN ${REALISE} THEN COALESCE(s.nb_presents,0) ELSE 0 END) AS participants,
      AVG(CASE WHEN ${REALISE} AND s.nb_presents IS NOT NULL THEN s.nb_presents END) AS effectif_moyen
    ${FROM} ${WHERE}
    GROUP BY ct.id HAVING programmes > 0 ORDER BY effectues DESC
  `, params);

  // ── Détail par coach ───────────────────────────────────────────
  const coachs = db.all(`
    SELECT
      c.id                                                            AS coach_id,
      TRIM(c.prenom || ' ' || c.nom)                                  AS coach,
      COUNT(*)                                                        AS programmes,
      SUM(CASE WHEN ${REALISE} THEN 1 ELSE 0 END)                     AS effectues,
      SUM(CASE WHEN s.statut = 'annule' THEN 1 ELSE 0 END)            AS annules,
      SUM(CASE WHEN ${REALISE} THEN s.duree_minutes ELSE 0 END)       AS minutes,
      AVG(CASE WHEN ${REALISE} AND s.nb_presents IS NOT NULL THEN s.nb_presents END) AS effectif_moyen
    ${FROM} JOIN coaches c ON c.id = s.coach_id ${WHERE}
    GROUP BY c.id HAVING programmes > 0 ORDER BY minutes DESC
  `, params);

  // ── Distribution des effectifs ─────────────────────────────────
  // Une moyenne de 9 peut cacher "toujours 9" comme "moitié vide / moitié pleine" :
  // seule la distribution le dit. Bornes fixes (pas de quantiles) pour que deux
  // périodes restent comparables d'un coup d'œil.
  const distribution = db.all(`
    SELECT
      CASE
        WHEN s.nb_presents = 0            THEN '0'
        WHEN s.nb_presents BETWEEN 1 AND 4   THEN '1-4'
        WHEN s.nb_presents BETWEEN 5 AND 9   THEN '5-9'
        WHEN s.nb_presents BETWEEN 10 AND 14 THEN '10-14'
        WHEN s.nb_presents BETWEEN 15 AND 19 THEN '15-19'
        ELSE '20+'
      END                                                             AS tranche,
      COUNT(*)                                                        AS seances
    ${FROM} ${WHERE} ${WHERE ? 'AND' : 'WHERE'} ${REALISE} AND s.nb_presents IS NOT NULL
    GROUP BY tranche
  `, params);

  res.json({
    kpi, mensuel, mensuelCategorie, parJour, parHeure, heatmap,
    categories, cours, coachs, distribution, bornes,
    debut, fin, categorie,
  });
});

module.exports = router;
