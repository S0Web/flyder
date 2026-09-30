// Données de démonstration de l'onglet Équipe, pour une base LOCALE uniquement :
// l'équipe Fitnessmov' Aqua (fiches de tâches 2026-2027), leur planning, des
// tâches, des comptes rendus de fin de journée, quelques fiches de paie factices.
//
//   npm run seed:equipe --workspace=server            (ne fait rien si déjà généré)
//   npm run seed:equipe --workspace=server -- --reset (efface puis régénère)
//
// Refuse de tourner si DB_PATH est défini (= volume Railway d'une vraie salle).
// Les profils créés reçoivent le code confidentiel CODE_DEMO ci-dessous (un
// profil qui a déjà un code le garde).

if (process.env.DB_PATH && !process.argv.includes('--force')) {
  console.error('⛔ DB_PATH est défini : ce script ne tourne que sur la base locale de développement.');
  process.exit(1);
}
process.env.TZ = process.env.TZ || 'Europe/Paris';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const db = require('./database');
const { hashCode } = require('../lib/codeHash');
const { dateLocaleISO, ajouterJours, lundiDe } = require('../lib/dates');

const CODE_DEMO = '1234';
const MARQUEUR = 'demo_equipe_v1';
const RESET = process.argv.includes('--reset');

const RAPPEL = "Si j'ai terminé : je reprends cette liste depuis le début et je cherche ce qui peut encore être fait. Je n'attends pas que Jamel me donne une nouvelle tâche.";

// Jours travaillés : 1 = lundi … 6 = samedi. Plusieurs plages possibles par jour.
const EQUIPE = [
  {
    prenom: 'Jamel', nom: 'Laouari', role: 'manager', contrat: '2019-09-01',
    intitule: "Direction · Pilotage · Chiffre d'affaires",
    objectif: "Piloter le club par les résultats sans redevenir l'exécutant de toutes les tâches.",
    missions: [
      'Fixer les priorités et objectifs de la semaine.',
      "Contrôler le chiffre d'affaires et les nouvelles inscriptions.",
      'Suivre les résiliations et les renouvellements à venir.',
      'Contrôler les résultats de la prospection et des relances.',
      'Regarder le remplissage des cours et les actions correctives proposées.',
      'Vérifier les bilans de fin de journée sans devoir être présent physiquement.',
      'Arbitrer les décisions importantes et les changements de planning.',
      'Valider les offres commerciales et les actions nécessitant une décision de direction.',
      "Faire le point équipe court chaque lundi.",
      'Ne pas reprendre automatiquement une tâche non faite : la redonner au responsable avec une échéance.',
    ],
    indicateurs: ['CA / inscriptions', 'Résiliations / renouvellements', 'Résultats commerciaux', 'Cours à arbitrer', 'Décisions à prendre'],
    horaires: { 1: [['09:00', '17:00']], 2: [['09:00', '17:00']], 3: [['09:00', '13:00']], 4: [['09:00', '17:00']], 5: [['09:00', '17:00']] },
  },
  {
    prenom: 'Rudy', nom: 'Senou', role: 'user', contrat: '2024-09-02',
    intitule: 'Commercial · Relances · Transformation',
    objectif: "Transformer les prospects en essais, inscriptions et chiffre d'affaires.",
    missions: [
      'Consulter les nouveaux prospects et les demandes reçues.',
      "Appeler les prospects non inscrits et noter le résultat de chaque appel.",
      'En cas de non-réponse, envoyer un SMS personnalisé.',
      "Proposer une séance d'essai avec une date et un horaire précis.",
      'Relancer les personnes ayant visité le club sans adhérer.',
      "Relancer les personnes ayant effectué un essai sans s'inscrire.",
      'Relancer les anciens prospects encore exploitables.',
      'Relancer les anciens adhérents susceptibles de revenir.',
      'Vérifier les renouvellements à venir et préparer les contacts.',
      'Mettre à jour le suivi : contacté / sans réponse / intéressé / essai / inscrit / à rappeler.',
    ],
    indicateurs: ['Prospects contactés', 'Réponses obtenues', 'Essais / RDV fixés', 'Inscriptions', 'CA généré'],
    horaires: { 1: [['10:00', '18:30']], 2: [['10:00', '18:30']], 3: [['10:00', '18:30']], 4: [['12:00', '20:30']], 5: [['10:00', '18:30']] },
  },
  {
    prenom: 'Lina', nom: 'Haddad', role: 'user', contrat: '2025-01-06',
    intitule: 'Prospection · Réseaux sociaux · Génération de contacts',
    objectif: 'Créer des opportunités commerciales et amener de nouvelles personnes au club.',
    missions: [
      'Regarder quels cours, offres ou activités doivent être mis en avant.',
      'Publier les stories prévues et préparer les prochaines publications.',
      "Filmer des séquences courtes des activités et de l'ambiance du club.",
      'Mettre en avant les cours qui ont besoin d\'être remplis.',
      'Répondre aux messages, réactions et demandes reçues sur les réseaux.',
      "Inviter les personnes intéressées à une séance d'essai.",
      'Faire de la prospection locale et rechercher de nouveaux contacts.',
      'Chercher des entreprises, commerces ou partenaires locaux à contacter.',
      'Transmettre rapidement à Rudy les prospects réellement intéressés.',
      "Préparer à l'avance les contenus des prochains jours quand l'activité est calme.",
    ],
    indicateurs: ['Contenus publiés/préparés', 'Contacts générés', 'Demandes reçues', 'Essais obtenus', 'Prospects transmis à Rudy'],
    horaires: { 2: [['09:30', '16:30']], 3: [['09:30', '16:30']], 4: [['09:30', '16:30']], 5: [['09:30', '16:30']], 6: [['09:00', '14:00']] },
  },
  {
    prenom: 'Selio', nom: 'Martins', role: 'user', contrat: '2025-09-01',
    intitule: 'BPJEPS · Accueil · Fidélisation',
    objectif: 'Progresser comme futur coach tout en créant du lien et en faisant revenir les adhérents.',
    missions: [
      'Faire régulièrement le tour du plateau et aller vers les adhérents.',
      'Identifier les nouveaux adhérents et vérifier que leur démarrage se passe bien.',
      'Accompagner les adhérents qui ont besoin d\'aide dans le cadre de ses compétences.',
      'Repérer les adhérents démotivés, isolés ou qui semblent décrocher.',
      'Consulter les adhérents absents depuis plus de 21 jours qui lui sont attribués.',
      'Contacter les absents, comprendre la raison et proposer un retour au club.',
      'Regarder les cours à faible remplissage et en parler aux adhérents présents.',
      'Participer à l\'accueil et expliquer le fonctionnement du club et des réservations.',
      'Profiter des périodes calmes pour travailler sa progression et ses préparations BPJEPS.',
      'Faire remonter les problèmes, demandes ou remarques importantes du terrain.',
    ],
    indicateurs: ['Adhérents accompagnés', 'Nouveaux pris en charge', 'Absents contactés', 'Adhérents revenus', 'Points terrain à signaler'],
    horaires: { 1: [['14:00', '21:00']], 3: [['14:00', '21:00']], 5: [['14:00', '21:00']], 6: [['09:00', '13:00']] },
    ecole: [2, 4],
  },
  {
    prenom: 'Maxime', nom: 'Dupré', role: 'user', contrat: '2025-09-01',
    intitule: 'BPJEPS · Plateau · Accompagnement adhérents',
    objectif: "Faire vivre le plateau, accompagner les adhérents et progresser vers l'autonomie de coach.",
    missions: [
      'Faire un tour complet du plateau régulièrement.',
      "Aller spontanément vers les adhérents plutôt que d'attendre une demande.",
      'Prendre particulièrement en charge les nouveaux adhérents.',
      'Repérer les personnes qui semblent perdues ou peu autonomes.',
      'Apporter les conseils adaptés dans le cadre de ses compétences et de sa formation.',
      'Présenter aux adhérents les cours collectifs qui peuvent leur correspondre.',
      'Identifier chaque semaine des adhérents à suivre plus particulièrement.',
      'Profiter des périodes calmes pour préparer et travailler son BPJEPS.',
      "Vérifier l'état général du plateau et signaler tout problème matériel ou de sécurité.",
      'Noter les demandes récurrentes des adhérents et les transmettre.',
    ],
    indicateurs: ['Adhérents accompagnés', 'Nouveaux pris en charge', 'Cours proposés aux adhérents', 'Problèmes signalés', 'Suivis à reprendre'],
    horaires: { 2: [['14:00', '21:00']], 4: [['14:00', '21:00']], 5: [['07:00', '13:00']], 6: [['09:00', '14:00']] },
    ecole: [1, 3],
  },
  {
    prenom: 'Myriam', nom: 'Ben Ouaghram', role: 'user', contrat: '2021-03-15',
    intitule: 'Référente terrain · Cours · Qualité',
    objectif: 'Être le relais terrain de Jamel et améliorer la qualité et le remplissage des activités.',
    missions: [
      'Observer le remplissage des cours Aqua et Fitness.',
      'Identifier rapidement les cours qui baissent ou rencontrent des difficultés.',
      'Chercher la cause avant de proposer une suppression ou modification.',
      'Proposer une action concrète pour améliorer un cours faible.',
      'Recueillir les remarques et demandes récurrentes des adhérents.',
      'Accompagner Maxime et Selio dans leur progression terrain.',
      "Vérifier la qualité de l'accueil et de l'expérience adhérent.",
      "Signaler les problèmes d'organisation, de matériel ou de fonctionnement.",
      "Encourager la découverte d'autres activités lorsque cela est pertinent.",
      'Faire chaque semaine une remontée courte : problèmes constatés + solutions proposées.',
    ],
    indicateurs: ['Cours à surveiller', 'Actions proposées', 'Retours adhérents importants', 'Points Maxime/Selio', 'Problèmes à arbitrer'],
    horaires: { 1: [['08:00', '12:00'], ['17:00', '20:00']], 2: [['08:00', '12:00'], ['17:00', '20:00']], 3: [['08:00', '12:00']], 4: [['08:00', '12:00'], ['17:00', '20:00']], 6: [['09:00', '13:00']] },
  },
];

// Valeurs plausibles des indicateurs, par personne (min, max) — texte libre sinon.
const PLAGES = {
  Rudy:   [[15, 32], [6, 15], [2, 6], [0, 3], null],
  Lina:   [[2, 6], [4, 14], [3, 10], [0, 3], [1, 5]],
  Selio:  [[6, 15], [1, 4], [3, 9], [0, 3], null],
  Maxime: [[5, 14], [1, 4], [2, 7], [0, 2], [0, 3]],
  Myriam: [[1, 3], [0, 2], [1, 4], [1, 2], [0, 2]],
  Jamel:  [null, null, null, [0, 2], [0, 3]],
};
const TEXTES = {
  Rudy:  { 4: ['89 €', '178 €', '0 €', '420 €', '89 €', '267 €'] },
  Selio: { 4: ['Tapis 3 qui grince', 'RAS', 'Casiers vestiaire H', 'RAS'] },
  Jamel: { 0: ['CA semaine : 4 850 € · 11 inscriptions', 'CA : 3 920 € · 8 inscriptions', 'CA : 5 310 € · 13 inscriptions'],
           1: ['3 résiliations / 9 renouvellements', '1 résiliation / 6 renouvellements', '2 / 11'],
           2: ['Relances Rudy : 38 % de réponses', 'Taux essai → inscription : 42 %', 'Bon mois sur les réseaux'] },
};
const RESUMES = [
  "Bonne journée, beaucoup de passage en fin d'après-midi.",
  'Journée calme le matin, rush à partir de 17h.',
  'Journée chargée, tout a été traité.',
  "Une partie de la liste faite, le reste reporté à demain.",
  "Bonne dynamique, retours positifs des adhérents.",
];
const PRIORITES_DEMAIN = [
  'Terminer les relances de la semaine',
  'Préparer le planning des contenus du week-end',
  'Rappeler les essais de samedi',
  'Suivre les nouveaux inscrits de la semaine',
  'Point avec Jamel sur les cours du jeudi',
  'Reprendre les absents de plus de 21 jours',
];
const PROBLEMES = [
  'La climatisation de la salle de cours 2 fait du bruit.',
  "Plusieurs adhérents demandent un cours d'aquabike le samedi matin.",
  "L'imprimante de l'accueil ne fonctionne plus.",
  'Le logiciel de réservation a planté 20 min en fin de journée.',
];

// PRNG déterministe : la démo a toujours la même allure d'un lancement à l'autre.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260930);
const entre = (a, b) => a + Math.floor(rand() * (b - a + 1));
const choisir = (arr) => arr[Math.floor(rand() * arr.length)];

const jourSemaine = (iso) => { const d = new Date(`${iso}T12:00:00`); return d.getDay() || 7; };
const horodatage = (iso, hhmm) => {
  // datetime SQLite en UTC à partir d'une heure locale de la salle.
  const [y, m, d] = iso.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi).toISOString().replace('T', ' ').slice(0, 19);
};

const DOCS_DIR = path.join(path.dirname(process.env.DB_PATH || path.join(__dirname, '../../data/fitnessmov.db')), 'uploads', 'employe-documents');

async function fichePaiePdf(prenom, nom, periode) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText('BULLETIN DE PAIE — DOCUMENT DE DÉMONSTRATION', { x: 50, y: 780, size: 14, font: bold, color: rgb(0.07, 0.09, 0.17) });
  page.drawText(`Salarié : ${prenom} ${nom}`, { x: 50, y: 740, size: 12, font });
  page.drawText(`Période : ${periode}`, { x: 50, y: 720, size: 12, font });
  page.drawText('Données fictives générées pour la démo locale de Flyder.', { x: 50, y: 680, size: 10, font, color: rgb(0.4, 0.4, 0.45) });
  return Buffer.from(await pdf.save());
}

function effacer(ids) {
  if (!ids.length) return;
  const q = ids.map(() => '?').join(',');
  for (const d of db.all(`SELECT chemin FROM employe_documents WHERE user_id IN (${q}) AND nom_fichier LIKE 'DEMO-%'`, ids)) {
    fs.unlink(d.chemin, () => {});
  }
  db.run(`DELETE FROM employe_documents WHERE user_id IN (${q}) AND nom_fichier LIKE 'DEMO-%'`, ids);
  db.run(`DELETE FROM taches WHERE assigne_a IN (${q})`, ids);
  db.run(`DELETE FROM comptes_rendus WHERE user_id IN (${q})`, ids);
  db.run(`DELETE FROM notes_privees WHERE user_id IN (${q})`, ids);
  db.run(`DELETE FROM fiches_poste WHERE user_id IN (${q})`, ids);
  db.run('DELETE FROM import_markers WHERE nom = ?', [MARQUEUR]);
}

async function main() {
  if (!RESET && db.get('SELECT 1 FROM import_markers WHERE nom = ?', [MARQUEUR])) {
    console.log('Démo Équipe déjà générée (relancer avec --reset pour régénérer).');
    return;
  }

  // 1. Profils (réutilise un profil existant du même prénom, en le réactivant).
  const ids = {};
  for (const p of EQUIPE) {
    let u = db.get('SELECT id, code_hash FROM app_users WHERE lower(prenom) = lower(?) AND supprime = 0 AND masque = 0', [p.prenom]);
    if (!u) {
      const r = db.run('INSERT INTO app_users (prenom, nom, role) VALUES (?, ?, ?)', [p.prenom, p.nom, p.role]);
      u = { id: r.lastInsertRowid, code_hash: null };
    }
    // Ajustement CP : la démo n'a pas l'historique des congés posés depuis l'embauche,
    // on ramène le solde à une valeur plausible (entre 8 et 22 jours).
    const [cy, cm, cd] = p.contrat.split('-').map(Number);
    const now = new Date();
    let mois = (now.getFullYear() - cy) * 12 + (now.getMonth() - (cm - 1));
    if (now.getDate() < cd) mois -= 1;
    const cpAjuste = entre(8, 22) - Math.max(0, mois) * 2.5;
    db.run('UPDATE app_users SET nom = ?, role = ?, actif = 1, date_debut_contrat = ?, cp_ajuste = ? WHERE id = ?',
      [p.nom, p.role, p.contrat, cpAjuste, u.id]);
    if (!u.code_hash) db.run('UPDATE app_users SET code_hash = ? WHERE id = ?', [hashCode(CODE_DEMO), u.id]);
    ids[p.prenom] = u.id;
  }
  if (RESET) effacer(Object.values(ids));

  const aujourdhui = dateLocaleISO();
  const lundi = lundiDe(aujourdhui);
  const jamel = ids.Jamel;

  db.run('BEGIN');
  try {
    // 2. Fiches de poste.
    for (const p of EQUIPE) {
      db.run(
        `INSERT INTO fiches_poste (user_id, intitule, objectif, missions, indicateurs, rappel, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ids[p.prenom], p.intitule, p.objectif, JSON.stringify(p.missions), JSON.stringify(p.indicateurs), RAPPEL, jamel]
      );
    }

    // 3. Planning : 3 semaines passées → 2 semaines à venir, sans écraser un jour déjà saisi.
    const debutPlanning = ajouterJours(lundi, -21);
    const finPlanning = ajouterJours(lundi, 20);
    const congesLina = [ajouterJours(lundi, 10), ajouterJours(lundi, 11)]; // jeudi + vendredi prochains
    for (const p of EQUIPE) {
      const id = ids[p.prenom];
      for (let d = debutPlanning; d <= finPlanning; d = ajouterJours(d, 1)) {
        if (db.get('SELECT 1 FROM personnel_creneaux WHERE employe_id = ? AND date = ?', [id, d])) continue;
        const j = jourSemaine(d);
        if (p.prenom === 'Lina' && congesLina.includes(d)) {
          db.run("INSERT INTO personnel_creneaux (employe_id, date, type) VALUES (?, ?, 'cp')", [id, d]);
        } else if (p.ecole?.includes(j)) {
          db.run("INSERT INTO personnel_creneaux (employe_id, date, type) VALUES (?, ?, 'ecole')", [id, d]);
        } else if (p.horaires[j]) {
          p.horaires[j].forEach(([debut, fin], ordre) => {
            db.run("INSERT INTO personnel_creneaux (employe_id, date, type, debut, fin, ordre) VALUES (?, ?, 'travail', ?, ?, ?)",
              [id, d, debut, fin, ordre]);
          });
        }
      }
    }

    // 4. Comptes rendus des 13 derniers jours travaillés (+ Rudy et Myriam aujourd'hui).
    const joursTravail = (id, d) => db.all("SELECT fin FROM personnel_creneaux WHERE employe_id = ? AND date = ? AND type = 'travail' ORDER BY fin DESC", [id, d]);
    for (const p of EQUIPE) {
      const id = ids[p.prenom];
      for (let i = 13; i >= 0; i--) {
        const d = ajouterJours(aujourdhui, -i);
        const creneaux = joursTravail(id, d);
        if (!creneaux.length) continue;
        if (i === 0 && !['Rudy', 'Myriam'].includes(p.prenom)) continue;
        if (i > 0 && rand() < 0.12) continue; // quelques oublis, pour que le suivi ait du relief

        const missions = p.missions.map(texte => ({ texte, fait: rand() < (i === 0 ? 0.6 : 0.78) }));
        const indicateurs = p.indicateurs.map((libelle, k) => {
          const plage = PLAGES[p.prenom]?.[k];
          const textes = TEXTES[p.prenom]?.[k];
          const valeur = plage ? String(entre(...plage)) : textes ? choisir(textes) : 'RAS';
          return { libelle, valeur };
        });
        let statut = i >= 3 ? 'valide' : i >= 1 ? 'soumis' : 'soumis';
        if (i >= 3 && rand() < 0.1) statut = 'a_revoir';
        if (p.prenom === 'Jamel') statut = i >= 1 ? 'valide' : 'soumis';
        const soumisLe = horodatage(d, creneaux[0].fin);
        db.run(
          `INSERT INTO comptes_rendus (user_id, date, missions, indicateurs, resume, priorite_demain, probleme, statut,
             retour_manager, soumis_le, valide_par, valide_le, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, d, JSON.stringify(missions), JSON.stringify(indicateurs), choisir(RESUMES), choisir(PRIORITES_DEMAIN),
           rand() < 0.22 ? choisir(PROBLEMES) : '', statut,
           statut === 'a_revoir' ? 'Peux-tu détailler les résultats des appels ? Il manque le nombre de rappels prévus.'
             : statut === 'valide' && rand() < 0.3 ? 'Top, continue comme ça.' : '',
           soumisLe, statut === 'valide' || statut === 'a_revoir' ? jamel : null,
           statut === 'valide' || statut === 'a_revoir' ? horodatage(ajouterJours(d, 1), '09:30') : null,
           soumisLe, soumisLe]
        );
      }
    }

    // 5. Tâches.
    const T = (prenom, titre, opts = {}) => {
      const cree = opts.par ? ids[opts.par] : jamel;
      const created = opts.cree ?? horodatage(ajouterJours(aujourdhui, -(opts.ilya ?? entre(2, 16))), '10:00');
      const r = db.run(
        `INSERT INTO taches (titre, description, assigne_a, cree_par, echeance, priorite, statut, recurrence, fait_le, fait_par, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [titre, opts.desc || '', ids[prenom], cree,
         opts.j == null ? null : ajouterJours(aujourdhui, opts.j),
         opts.prio || 'normale', opts.statut || 'a_faire', opts.rec || 'aucune',
         opts.statut === 'fait' ? horodatage(ajouterJours(aujourdhui, opts.faitIlya ?? -1), '16:00') : null,
         opts.statut === 'fait' ? ids[prenom] : null, created, created]
      );
      return r.lastInsertRowid;
    };

    // Rudy
    const tRelances = T('Rudy', 'Relancer les 12 essais du mois sans inscription', { j: 0, prio: 'haute', statut: 'en_cours',
      desc: "Liste exportée du logiciel de réservation (onglet Essais). Noter le résultat de chaque appel dans le suivi." });
    T('Rudy', 'Préparer les contacts des renouvellements d\'octobre', { j: 2, rec: 'mensuelle' });
    T('Rudy', 'Appeler les anciens adhérents partis en juin', { j: -2, prio: 'haute' });
    T('Rudy', 'Mettre à jour le tableau de suivi des prospects', { j: 0, rec: 'quotidienne', par: 'Rudy', ilya: 2 });
    T('Rudy', 'Envoyer les SMS de relance aux sans-réponse', { statut: 'fait', j: -1, faitIlya: -1, ilya: 3 });
    for (let s = 1; s <= 6; s++) T('Rudy', `Relances de la semaine (${s})`, { statut: 'fait', j: -7 * s + 2, faitIlya: -7 * s + 2, ilya: 7 * s });
    // Lina
    T('Lina', 'Stories de la semaine : Aquabike du mardi soir', { j: 1, prio: 'haute' });
    T('Lina', 'Filmer le cours de Crosstraining de jeudi', { j: 2, par: 'Lina', ilya: 1 });
    T('Lina', 'Lister 10 commerces du centre-ville pour un partenariat', { j: 6, desc: 'Boulangeries, pharmacies, opticiens : proposer une offre CE / remise salariés.' });
    T('Lina', 'Répondre aux messages Instagram en attente', { j: -1, prio: 'urgente' });
    T('Lina', 'Calendrier des publications d\'octobre', { statut: 'fait', j: -2, faitIlya: -2, ilya: 6 });
    for (let s = 1; s <= 5; s++) T('Lina', `Publications de la semaine (${s})`, { statut: 'fait', j: -7 * s + 3, faitIlya: -7 * s + 3, ilya: 7 * s + 1 });
    // Selio
    T('Selio', 'Appeler les 8 adhérents absents depuis plus de 21 jours', { j: 0, prio: 'haute' });
    T('Selio', 'Préparer la fiche de séance BPJEPS (UC3)', { j: 4, par: 'Selio', ilya: 2 });
    T('Selio', "Faire visiter le club aux inscrits de samedi", { statut: 'fait', j: -3, faitIlya: -3, ilya: 6 });
    for (let s = 1; s <= 4; s++) T('Selio', `Suivi des nouveaux adhérents (${s})`, { statut: 'fait', j: -7 * s + 1, faitIlya: -7 * s + 1, ilya: 7 * s + 2 });
    // Maxime
    T('Maxime', 'Signaler l\'état du rameur n°2 au prestataire', { j: -3, prio: 'haute', desc: 'La sangle est effilochée : mettre le rameur hors service en attendant.' });
    T('Maxime', 'Présenter le cours de Pilates aux nouveaux inscrits', { j: 1 });
    T('Maxime', 'Réviser le module anatomie', { j: 5, par: 'Maxime', prio: 'basse', ilya: 1 });
    T('Maxime', 'Ranger et désinfecter la zone haltères', { j: 0, rec: 'quotidienne', statut: 'en_cours' });
    for (let s = 1; s <= 4; s++) T('Maxime', `Tour de plateau et check matériel (${s})`, { statut: 'fait', j: -7 * s + 2, faitIlya: -7 * s + 2, ilya: 7 * s });
    // Myriam
    T('Myriam', 'Remontée hebdomadaire : problèmes constatés + solutions', { j: 3, rec: 'hebdomadaire', prio: 'haute' });
    T('Myriam', 'Analyser la baisse du cours Aquagym de 12h15', { j: 1, prio: 'haute', desc: "Voir l'onglet Analyse : effectif moyen passé de 14 à 8 depuis la rentrée." });
    T('Myriam', 'Point de progression avec Maxime et Selio', { j: -1 });
    T('Myriam', 'Enquête satisfaction accueil (10 adhérents)', { statut: 'fait', j: -4, faitIlya: -4, ilya: 9 });
    for (let s = 1; s <= 5; s++) T('Myriam', `Remontée hebdomadaire (${s})`, { statut: 'fait', j: -7 * s + 3, faitIlya: -7 * s + 3, ilya: 7 * s + 3 });
    // Jamel
    T('Jamel', 'Point équipe du lundi', { j: 7 - ((jourSemaine(aujourdhui) - 1)), rec: 'hebdomadaire', prio: 'haute', par: 'Jamel' });
    T('Jamel', 'Valider l\'offre « Rentrée Aqua » avant diffusion', { j: 0, prio: 'urgente', par: 'Jamel' });
    T('Jamel', 'Arbitrer le créneau du samedi matin (aquabike)', { j: 3, par: 'Jamel' });

    // Quelques tâches bouclées cette semaine, pour que le taux de réalisation ait du sens.
    T('Rudy', 'Rappeler les 5 essais de samedi', { statut: 'fait', j: 0, faitIlya: 0, ilya: 3 });
    T('Lina', 'Story « Rentrée Aqua »', { statut: 'fait', j: 1, faitIlya: -1, ilya: 4 });
    T('Selio', 'Accueil des nouveaux inscrits du lundi', { statut: 'fait', j: 0, faitIlya: -2, ilya: 5 });
    T('Maxime', 'Contrôle sécurité du plateau', { statut: 'fait', j: 2, faitIlya: 0, ilya: 2 });
    T('Myriam', 'Relevé de remplissage des cours Aqua', { statut: 'fait', j: 1, faitIlya: -1, ilya: 6 });

    // Commentaires
    const commenter = (tacheId, prenom, contenu, ilya) => db.run(
      'INSERT INTO tache_commentaires (tache_id, auteur_id, contenu, created_at) VALUES (?, ?, ?, ?)',
      [tacheId, ids[prenom], contenu, horodatage(ajouterJours(aujourdhui, -ilya), '11:15')]
    );
    commenter(tRelances, 'Jamel', 'Commence par ceux qui ont fait leur essai il y a moins de 10 jours.', 1);
    commenter(tRelances, 'Rudy', '7 appelés ce matin : 2 inscriptions, 3 à rappeler vendredi.', 0);

    // 6. Notes privées (chacun les siennes).
    const note = (prenom, titre, contenu, epingle = 0) => db.run(
      'INSERT INTO notes_privees (user_id, titre, contenu, epingle) VALUES (?, ?, ?, ?)', [ids[prenom], titre, contenu, epingle]);
    note('Jamel', 'Entretiens annuels', "Prévoir les entretiens en novembre.\n- Rudy : objectif 15 inscriptions/mois\n- Myriam : évolution vers responsable d'équipe ?", 1);
    note('Jamel', 'Idées offre de Noël', 'Carte cadeau 3 mois + 1 séance coaching offerte.');
    note('Rudy', 'Arguments qui marchent', "- Essai gratuit + bilan forme\n- Parrainage : 1 mois offert\n- Horaires larges le soir", 1);
    note('Selio', 'Révisions BPJEPS', 'UC3 : revoir les fiches de séance. Demander un retour à Myriam.');

    db.run('INSERT INTO import_markers (nom, importe_le) VALUES (?, datetime(\'now\'))', [MARQUEUR]);
    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }

  // 7. Fiches de paie factices (3 derniers mois) : la plus récente non consultée.
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  const [y, m] = aujourdhui.split('-').map(Number);
  for (const p of EQUIPE) {
    for (let k = 3; k >= 1; k--) {
      const dt = new Date(y, m - 1 - k, 1);
      const periode = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const chemin = path.join(DOCS_DIR, `${crypto.randomUUID()}.pdf`);
      fs.writeFileSync(chemin, await fichePaiePdf(p.prenom, p.nom, periode));
      const vu = k > 1 || p.prenom === 'Myriam' ? horodatage(`${periode}-28`, '19:00') : null;
      db.run(
        `INSERT INTO employe_documents (user_id, type, periode, nom_fichier, chemin, uploaded_by, vu_le)
         VALUES (?, 'fiche_paie', ?, ?, ?, ?, ?)`,
        [ids[p.prenom], periode, `DEMO-Bulletin-${p.prenom}-${periode}.pdf`, chemin, jamel, vu]
      );
    }
  }

  console.log(`✅ Démo Équipe générée : ${EQUIPE.length} profils (${EQUIPE.map(p => p.prenom).join(', ')}).`);
}

main().catch(e => { console.error(e); process.exit(1); });
