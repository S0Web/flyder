const db = require('./database');

// Jeu de données de démonstration, entièrement fictif (aucune donnée réelle de
// coach ni de client) — sert à alimenter une instance "portfolio" séparée des
// vraies salles, pour pouvoir montrer l'application sans exposer de données
// personnelles réelles. Générée dynamiquement sur les 14 derniers mois glissants
// (par rapport à la date du jour) pour que la démo reste toujours pertinente,
// quelle que soit la date à laquelle elle est consultée.

const DEMO_MARKER = 'demo_portfolio_v1';

const DEMO_COACHES = [
  { prenom: 'Camille', nom: 'Berthier', disciplines: ['fitness', 'crosstraining'],
    siret: '812 345 678 00025', adresse: '14 rue des Lilas, 91100 Corbeil-Essonnes', tarif_horaire: 28 },
  { prenom: 'Nathan',  nom: 'Lefevre',  disciplines: ['aqua'] },
  { prenom: 'Ines',    nom: 'Caron',    disciplines: ['poledance'] },
  { prenom: 'Theo',    nom: 'Marchand', disciplines: ['boxe', 'crosstraining'],
    siret: '798 123 456 00019', adresse: '3 avenue Victor Hugo, 91000 Evry', tarif_horaire: 32 },
  { prenom: 'Lea',     nom: 'Girard',   disciplines: ['fitness'] },
  { prenom: 'Yanis',   nom: 'Bouchard', disciplines: ['aqua', 'fitness'] },
  { prenom: 'Chloe',   nom: 'Rousseau', disciplines: ['poledance', 'fitness'] },
  { prenom: 'Hugo',    nom: 'Faure',    disciplines: ['crosstraining'] },
  { prenom: 'Manon',   nom: 'Perrin',   disciplines: ['aqua'],
    siret: '801 987 654 00031', adresse: '27 rue de la Piscine, 91100 Corbeil-Essonnes', tarif_horaire: 26 },
  { prenom: 'Adam',    nom: 'Roussel',  disciplines: ['boxe'] },
  { prenom: 'Zoe',     nom: 'Lambert',  disciplines: ['fitness'] },
  { prenom: 'Karim',   nom: 'Benali',   disciplines: ['aqua', 'crosstraining'],
    siret: '789 456 123 00042', adresse: '9 impasse des Sports, 91100 Corbeil-Essonnes', tarif_horaire: 30 },
];

const COURS_PAR_DISCIPLINE = {
  aqua:          ['Aquagym', 'Aquabike', 'Aquaboxing', 'Aquapower', 'Aquafitness'],
  fitness:       ['HIIT', 'Bodypump', 'Circuit training', 'Pilates', 'Zumba', 'Yoga', 'Workout'],
  boxe:          ['Boxe', 'Boxe anglaise'],
  crosstraining: ['Crosstraining', 'Crossfit'],
  poledance:     ['Pole dance', 'Pole dance souplesse'],
};

const HORAIRES = ['09:00', '10:30', '12:15', '17:30', '18:30', '19:30', '20:30'];

// PRNG déterministe (mulberry32) : jeu de données reproductible d'un lancement
// à l'autre, pour que la démo ait toujours la même allure.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ensureCoach(c) {
  const existing = db.get('SELECT id FROM coaches WHERE prenom = ? AND nom = ?', [c.prenom, c.nom]);
  if (existing) return existing.id;
  const result = db.run(
    `INSERT INTO coaches (prenom, nom, email, telephone, aqua, fitness, boxe, crosstraining, poledance, siret, adresse, tarif_horaire)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [c.prenom, c.nom,
     `${c.prenom.toLowerCase()}.${c.nom.toLowerCase()}@demo-portfolio.fr`,
     '06 00 00 00 ' + String(10 + DEMO_COACHES.indexOf(c)).padStart(2, '0'),
     c.disciplines.includes('aqua') ? 1 : 0,
     c.disciplines.includes('fitness') ? 1 : 0,
     c.disciplines.includes('boxe') ? 1 : 0,
     c.disciplines.includes('crosstraining') ? 1 : 0,
     c.disciplines.includes('poledance') ? 1 : 0,
     c.siret || null, c.adresse || null, c.tarif_horaire || null]
  );
  return result.lastInsertRowid;
}

function coursTypeId(nom) {
  const row = db.get('SELECT id FROM cours_types WHERE nom = ?', [nom]);
  return row ? row.id : null;
}

function effectifPour(disciplines) {
  if (disciplines.includes('aqua')) return [6, 14];
  if (disciplines.includes('poledance')) return [4, 9];
  if (disciplines.includes('crosstraining')) return [4, 10];
  if (disciplines.includes('boxe')) return [5, 12];
  return [8, 18];
}

function pad(n) { return String(n).padStart(2, '0'); }
function iso(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }

// Génère les séances des 14 derniers mois glissants pour un coach, sur 2
// créneaux hebdomadaires fixes.
function genererSeances(coach, coachId, coachIdx, today) {
  const rnd = mulberry32(1000 + coachIdx * 97);
  const coursNoms = coach.disciplines.flatMap(d => COURS_PAR_DISCIPLINE[d]);
  const [effMin, effMax] = effectifPour(coach.disciplines);
  const creneaux = [
    { jour: 1 + Math.floor(rnd() * 5), horaire: HORAIRES[Math.floor(rnd() * HORAIRES.length)], cours: coursNoms[Math.floor(rnd() * coursNoms.length)] },
    { jour: 1 + Math.floor(rnd() * 5), horaire: HORAIRES[Math.floor(rnd() * HORAIRES.length)], cours: coursNoms[Math.floor(rnd() * coursNoms.length)] },
  ];

  const rows = [];
  // 26 mois d'historique : de quoi couvrir deux saisons scolaires complètes
  // (l'actuelle + la précédente), sinon le comparatif "vs période précédente"
  // n'a quasiment aucune donnée en face et affiche des écarts absurdes.
  const NB_MOIS_HISTORIQUE = 26;
  const debut = new Date(today.getFullYear(), today.getMonth() - NB_MOIS_HISTORIQUE, 1);
  const fin   = new Date(today.getFullYear(), today.getMonth() + 1, 15); // ~2 semaines dans le futur

  for (const cr of creneaux) {
    const coursId = coursTypeId(cr.cours);
    if (!coursId) continue;
    const d = new Date(debut);
    // Se cale sur le bon jour de semaine
    d.setDate(d.getDate() + ((cr.jour - d.getDay() + 7) % 7));
    let moisIdx = 0;
    while (d <= fin) {
      const estFutur = d > today;
      // Légère croissance du volume dans le temps (une séance sur ~6 sautée en
      // début de période, quasi aucune en fin) pour que les comparatifs période
      // précédente racontent une tendance positive.
      const skipProb = 0.22 - (moisIdx / NB_MOIS_HISTORIQUE) * 0.18;
      const saute = !estFutur && rnd() < Math.max(skipProb, 0.02);

      if (!saute) {
        let statut, nbPresents = null;
        if (estFutur) {
          statut = 'programme';
        } else {
          const r = rnd();
          statut = r < 0.10 ? 'annule' : r < 0.24 ? 'paye' : 'effectue';
          if (statut !== 'annule') nbPresents = effMin + Math.floor(rnd() * (effMax - effMin + 1));
        }
        rows.push({
          date: iso(d.getFullYear(), d.getMonth() + 1, d.getDate()),
          cours_type_id: coursId,
          coach_id: coachId,
          horaire: cr.horaire,
          duree_minutes: 60,
          statut,
          nb_presents: nbPresents,
        });
      }

      d.setDate(d.getDate() + 7);
      moisIdx = Math.floor((d - debut) / (30 * 86400000));
    }
  }
  return rows;
}

function effacerDonneesDemo() {
  const ids = DEMO_COACHES
    .map(c => db.get('SELECT id FROM coaches WHERE prenom = ? AND nom = ?', [c.prenom, c.nom]))
    .filter(Boolean)
    .map(r => r.id);
  if (ids.length) {
    db.run(`DELETE FROM seances WHERE coach_id IN (${ids.map(() => '?').join(',')})`, ids);
    db.run(`DELETE FROM coaches WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  }
  db.run('DELETE FROM import_markers WHERE nom = ?', [DEMO_MARKER]);
}

// reset=true : efface d'abord toute donnée de démo précédente puis régénère
// (pour rafraîchir la démo avant de la montrer). Sans reset, ne fait rien si
// déjà généré (idempotent).
function run({ reset = false } = {}) {
  if (reset) effacerDonneesDemo();

  const dejaFait = db.get('SELECT 1 FROM import_markers WHERE nom = ?', [DEMO_MARKER]);
  if (dejaFait) return { genere: false, message: 'Données de démo déjà présentes.' };

  const today = new Date();
  let seancesCreees = 0;

  DEMO_COACHES.forEach((c, idx) => {
    const coachId = ensureCoach(c);
    const rows = genererSeances(c, coachId, idx, today);
    for (const s of rows) {
      db.run(
        `INSERT INTO seances (date, cours_type_id, coach_id, horaire, duree_minutes, statut, nb_presents)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [s.date, s.cours_type_id, s.coach_id, s.horaire, s.duree_minutes, s.statut, s.nb_presents]
      );
      seancesCreees++;
    }
  });

  db.run('INSERT OR IGNORE INTO import_markers (nom, importe_le) VALUES (?, datetime(\'now\'))', [DEMO_MARKER]);
  return { genere: true, coachsCrees: DEMO_COACHES.length, seancesCreees };
}

module.exports = { run };
