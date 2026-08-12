// Observations automatiques sur la fréquentation, calculées par requêtes SQL
// simples (pas d'IA) : tendances récentes par coach/cours, jour de la semaine
// le plus/moins fréquenté, tendance globale de la salle. Chaque règle ne
// s'exprime que si l'écart est net (seuils ci-dessous) et l'échantillon
// suffisant, pour éviter de remonter du bruit statistique.
//
// Les tendances par coach/cours sont exposées comme des cartes {id: texte}
// pour être affichées au survol de la ligne correspondante (Top Coachs/Top
// Cours), plutôt qu'en liste plate détachée du contexte.

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
// Retourne un tableau de { id, pct, poids } — id permet ensuite d'ancrer
// l'observation sur la bonne ligne (coach ou cours) côté client.
function tendanceParGroupe(db, { table, colonneId, minEchantillon = 4 }) {
  const rows = db.all(`
    SELECT g.id AS id,
      AVG(CASE WHEN s.date >= date('now','-${FENETRE_RECENTE_JOURS} days') THEN s.nb_presents END) AS moyRecent,
      SUM(CASE WHEN s.date >= date('now','-${FENETRE_RECENTE_JOURS} days') THEN 1 ELSE 0 END) AS nRecent,
      AVG(CASE WHEN s.date < date('now','-${FENETRE_RECENTE_JOURS} days') THEN s.nb_presents END) AS moyPrec,
      SUM(CASE WHEN s.date < date('now','-${FENETRE_RECENTE_JOURS} days') THEN 1 ELSE 0 END) AS nPrec
    FROM seances s
    JOIN ${table} g ON g.id = s.${colonneId}
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
    out.push({ id: r.id, pct, poids: Math.abs(pct) * Math.min(r.nRecent, r.nPrec) });
  }
  return out;
}

// { [id]: "De moins en moins de monde ces dernières semaines (−18 % sur 8 semaines)." }
// Le nom de l'entité n'est pas répété dans le texte : l'observation s'affiche
// au survol de la ligne qui la nomme déjà.
function tendanceEnCarte(tendances) {
  const carte = {};
  for (const t of tendances) {
    carte[t.id] = `${t.pct < 0 ? 'De moins en moins' : 'De plus en plus'} de monde ces dernières semaines (${t.pct > 0 ? '+' : '−'}${fmt0(t.pct)} % sur 8 semaines).`;
  }
  return carte;
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

// generaux : observations sans ligne naturelle où s'ancrer (jour de la semaine,
// tendance globale) — affichées via une icône dédiée près du titre du dashboard.
// parCoach / parCours : cartes id → texte, affichées au survol du nom dans
// Top Coachs / Top Cours.
function generateInsights(db, { limiteGeneraux = 3 } = {}) {
  const generaux = [...jourSemaineInsights(db), ...tendanceGlobaleInsight(db)]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limiteGeneraux)
    .map(i => i.text);

  const parCoach = tendanceEnCarte(tendanceParGroupe(db, { table: 'coaches', colonneId: 'coach_id' }));
  const parCours = tendanceEnCarte(tendanceParGroupe(db, { table: 'cours_types', colonneId: 'cours_type_id' }));

  return { generaux, parCoach, parCours };
}

module.exports = { generateInsights };
