// Observations automatiques sur la fréquentation, calculées par requêtes SQL
// simples (pas d'IA) : tendances récentes par coach/cours, jour de la semaine
// le plus/moins fréquenté, tendance globale de la salle. Chaque règle ne
// s'exprime que si l'écart est net (seuils ci-dessous) et l'échantillon
// suffisant, pour éviter de remonter du bruit statistique.

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const FENETRE_RECENTE_JOURS = 56;   // 8 semaines
const FENETRE_PRECEDENTE_JOURS = 112; // 8 + 8 semaines
const FENETRE_JOUR_SEMAINE_JOURS = 84; // 12 semaines

const SEUIL_ECART_JOUR = 1.15;      // ±15 % vs moyenne pour ressortir un jour
const SEUIL_TENDANCE_PCT = 15;      // ±15 % pour une tendance coach/cours
const SEUIL_TENDANCE_GLOBALE_PCT = 10;

function fmt1(n) {
  return n.toFixed(1).replace('.', ',');
}
function fmt0(n) {
  return Math.abs(n).toFixed(0);
}

function jourSemaineInsights(db) {
  const rows = db.all(`
    SELECT CAST(strftime('%w', date) AS INTEGER) AS jour, AVG(nb_presents) AS moy, COUNT(*) AS n
    FROM seances
    WHERE statut IN ('effectue','paye') AND nb_presents IS NOT NULL
      AND date >= date('now', '-${FENETRE_JOUR_SEMAINE_JOURS} days')
    GROUP BY jour
    HAVING n >= 3
  `);
  if (rows.length < 3) return [];

  const totalN = rows.reduce((s, j) => s + j.n, 0);
  const moyGlobale = rows.reduce((s, j) => s + j.moy * j.n, 0) / totalN;
  const tri = [...rows].sort((a, b) => b.moy - a.moy);
  const top = tri[0], bas = tri[tri.length - 1];
  const out = [];

  if (top.moy >= moyGlobale * SEUIL_ECART_JOUR) {
    out.push({
      text: `Le ${JOURS[top.jour]} est le jour où il y a le plus d'affluence (${fmt1(top.moy)} personnes en moyenne par cours, contre ${fmt1(moyGlobale)} en moyenne).`,
      weight: (top.moy / moyGlobale) * Math.min(top.n, 12),
    });
  }
  if (bas.jour !== top.jour && bas.moy <= moyGlobale / SEUIL_ECART_JOUR) {
    out.push({
      text: `Le ${JOURS[bas.jour]} est le jour le plus calme (${fmt1(bas.moy)} personnes en moyenne par cours, contre ${fmt1(moyGlobale)} en moyenne).`,
      weight: (moyGlobale / bas.moy) * Math.min(bas.n, 12),
    });
  }
  return out;
}

// Compare la fréquentation moyenne des 8 dernières semaines à celle des 8
// semaines précédentes, groupé par la colonne donnée (coach_id ou cours_type_id).
function tendanceParGroupe(db, { table, jointure, colonneId, colonneLabel, minEchantillon = 4 }) {
  const rows = db.all(`
    SELECT g.id AS id, ${colonneLabel} AS label,
      AVG(CASE WHEN s.date >= date('now','-${FENETRE_RECENTE_JOURS} days') THEN s.nb_presents END) AS moyRecent,
      SUM(CASE WHEN s.date >= date('now','-${FENETRE_RECENTE_JOURS} days') THEN 1 ELSE 0 END) AS nRecent,
      AVG(CASE WHEN s.date < date('now','-${FENETRE_RECENTE_JOURS} days') THEN s.nb_presents END) AS moyPrec,
      SUM(CASE WHEN s.date < date('now','-${FENETRE_RECENTE_JOURS} days') THEN 1 ELSE 0 END) AS nPrec
    FROM seances s
    JOIN ${table} g ON g.id = s.${colonneId}
    ${jointure || ''}
    WHERE s.statut IN ('effectue','paye') AND s.nb_presents IS NOT NULL
      AND s.date >= date('now','-${FENETRE_PRECEDENTE_JOURS} days')
    GROUP BY s.${colonneId}
    HAVING nRecent >= ${minEchantillon} AND nPrec >= ${minEchantillon}
  `);

  const out = [];
  for (const r of rows) {
    if (!r.moyPrec) continue;
    const pct = (r.moyRecent - r.moyPrec) / r.moyPrec * 100;
    if (Math.abs(pct) < SEUIL_TENDANCE_PCT) continue;
    out.push({ label: r.label, pct, poids: Math.abs(pct) * Math.min(r.nRecent, r.nPrec) });
  }
  return out;
}

function tendanceCoachInsights(db) {
  return tendanceParGroupe(db, { table: 'coaches', colonneId: 'coach_id', colonneLabel: "g.prenom || ' ' || g.nom" })
    .map(t => ({
      text: `${t.pct < 0 ? 'De moins en moins' : 'De plus en plus'} de monde aux cours de ${t.label} (${t.pct > 0 ? '+' : '−'}${fmt0(t.pct)} % sur les 8 dernières semaines).`,
      weight: t.poids,
    }));
}

function tendanceCoursInsights(db) {
  return tendanceParGroupe(db, { table: 'cours_types', colonneId: 'cours_type_id', colonneLabel: 'g.nom' })
    .map(t => ({
      text: `${t.pct < 0 ? 'De moins en moins' : 'De plus en plus'} de monde aux cours de ${t.label} (${t.pct > 0 ? '+' : '−'}${fmt0(t.pct)} % sur les 8 dernières semaines).`,
      weight: t.poids,
    }));
}

function tendanceGlobaleInsight(db) {
  const g = db.get(`
    SELECT
      AVG(CASE WHEN date >= date('now','-${FENETRE_RECENTE_JOURS} days') THEN nb_presents END) AS moyRecent,
      SUM(CASE WHEN date >= date('now','-${FENETRE_RECENTE_JOURS} days') THEN 1 ELSE 0 END) AS nRecent,
      AVG(CASE WHEN date < date('now','-${FENETRE_RECENTE_JOURS} days') THEN nb_presents END) AS moyPrec,
      SUM(CASE WHEN date < date('now','-${FENETRE_RECENTE_JOURS} days') THEN 1 ELSE 0 END) AS nPrec
    FROM seances
    WHERE statut IN ('effectue','paye') AND nb_presents IS NOT NULL
      AND date >= date('now','-${FENETRE_PRECEDENTE_JOURS} days')
  `);
  if (!g.moyPrec || g.nRecent < 8 || g.nPrec < 8) return [];
  const pct = (g.moyRecent - g.moyPrec) / g.moyPrec * 100;
  if (Math.abs(pct) < SEUIL_TENDANCE_GLOBALE_PCT) return [];
  return [{
    text: `La fréquentation générale est ${pct > 0 ? 'en hausse' : 'en baisse'} de ${fmt0(pct)} % sur les 8 dernières semaines.`,
    weight: Math.abs(pct) * 3,
  }];
}

// Retourne jusqu'à `limite` phrases, triées par pertinence (écart le plus net
// et échantillon le plus solide en premier).
function generateInsights(db, { limite = 5 } = {}) {
  const insights = [
    ...jourSemaineInsights(db),
    ...tendanceCoachInsights(db),
    ...tendanceCoursInsights(db),
    ...tendanceGlobaleInsight(db),
  ];
  insights.sort((a, b) => b.weight - a.weight);
  return insights.slice(0, limite).map(i => i.text);
}

module.exports = { generateInsights };
