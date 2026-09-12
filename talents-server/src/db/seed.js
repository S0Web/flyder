// Jeu de données de test local — réinitialise coaches/gyms/contact_events et
// recrée un annuaire consistant, réparti sur toute l'Île-de-France (Paris et
// les 7 autres départements), pour tester l'application en conditions
// réalistes (volume, diversité géographique, profils complets/incomplets,
// bios courtes et longues). Ne touche à rien d'autre que talents-server.
//
// Lancer depuis talents-server/ : node src/db/seed.js

const db = require('./database');
const { hashPassword } = require('../lib/passwordHash');
const { geocodeAdresse } = require('../lib/geo');

const MOT_DE_PASSE = 'motdepasse123';

// Construite via RegExp() plutôt qu'un littéral /[...]/, pour éviter tout
// problème d'encodage avec les caractères combinants directement dans le fichier.
const stripAccents = (s) => s.normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '');
const slug = (s) => stripAccents(s.toLowerCase()).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ─── Communes couvrant les 8 départements d'Île-de-France ──────────────────────
const COMMUNES = [
  // Paris (75) — plusieurs arrondissements
  ['Paris 1er', '75001'], ['Paris 5e', '75005'], ['Paris 9e', '75009'], ['Paris 11e', '75011'],
  ['Paris 13e', '75013'], ['Paris 15e', '75015'], ['Paris 18e', '75018'], ['Paris 20e', '75020'],
  // Seine-et-Marne (77)
  ['Melun', '77000'], ['Fontainebleau', '77300'], ['Meaux', '77100'], ['Chelles', '77500'], ['Provins', '77160'],
  // Yvelines (78)
  ['Versailles', '78000'], ['Saint-Germain-en-Laye', '78100'], ['Mantes-la-Jolie', '78200'], ['Rambouillet', '78120'],
  // Essonne (91)
  ['Corbeil-Essonnes', '91100'], ['Évry-Courcouronnes', '91000'], ['Ballancourt-sur-Essonne', '91610'],
  ['Étampes', '91150'], ['Savigny-sur-Orge', '91600'], ['Massy', '91300'], ['Orsay', '91400'],
  ['Draveil', '91210'], ['Juvisy-sur-Orge', '91260'], ['Montgeron', '91230'], ['Brunoy', '91800'],
  ['Ris-Orangis', '91130'], ['Sainte-Geneviève-des-Bois', '91700'], ['Brétigny-sur-Orge', '91220'], ['Viry-Châtillon', '91170'],
  // Hauts-de-Seine (92)
  ['Nanterre', '92000'], ['Boulogne-Billancourt', '92100'], ['Colombes', '92700'], ['Rueil-Malmaison', '92500'],
  ['Antony', '92160'], ['Clamart', '92140'],
  // Seine-Saint-Denis (93)
  ['Saint-Denis', '93200'], ['Montreuil', '93100'], ['Aubervilliers', '93300'], ['Bobigny', '93000'], ['Aulnay-sous-Bois', '93600'],
  // Val-de-Marne (94)
  ['Créteil', '94000'], ['Vitry-sur-Seine', '94400'], ['Champigny-sur-Marne', '94500'], ['Ivry-sur-Seine', '94200'], ['Saint-Maur-des-Fossés', '94100'],
  // Val-d'Oise (95)
  ['Cergy', '95000'], ['Argenteuil', '95100'], ['Sarcelles', '95200'], ['Pontoise', '95300'],
];

const RUES = [
  'Rue de la République', 'Avenue Jean Jaurès', 'Rue Victor Hugo', 'Avenue du Général de Gaulle',
  'Rue de la Mairie', 'Boulevard Voltaire', 'Rue Pasteur', 'Avenue Foch', 'Rue Gambetta', 'Rue de Paris',
  'Rue du Général Leclerc', 'Avenue de la Libération', 'Rue Jean Moulin', 'Rue des Écoles', 'Avenue de la Gare',
];

// Retourne les 3 champs désormais séparés dans le formulaire (voie / code
// postal / ville) plutôt qu'une seule chaîne — la ville et le code postal
// viennent toujours de `COMMUNES` (l'équivalent seed de la sélection par
// autocomplétion côté client), jamais reconstruits par regex.
function adresseDe(communeIdx, n) {
  const [ville, codePostal] = COMMUNES[communeIdx];
  const rue = `${1 + (n % 70)} ${RUES[n % RUES.length]}`;
  return { rue, codePostal, ville };
}

// ─── Coachs — [prenom, nom, communeIdx, disciplines[], tarif|null, telephone, email_public, bio] ──
const COACHES_DEF = [
  ['Karim', 'Benali', 16, ['lesmills_bodycombat', 'boxe'], 35, '0611223344', false, "Coach fitness et boxe depuis 5 ans, spécialisé remise en forme et perte de poids."],
  ['Selim', 'Ouadi', 17, ['step', 'renforcement_choregraphie', 'boxe'], 30, '0618336933', true, "Coach diplômé BPJEPS, 6 ans en salle. Spécialisé renforcement et boxe, à l'aise avec les débutants comme les confirmés."],
  ['Amandine', 'Roussel', 18, ['aquagym', 'step'], 28, '0622334455', false, "Monitrice aquagym depuis 8 ans, cours collectifs et coaching individuel en bassin."],
  ['Thomas', 'Girard', 8, ['crossfit', 'renforcement_choregraphie'], 45, '0633445566', false, "Ancien pratiquant de CrossFit compétition, aujourd'hui coach à temps plein. J'interviens en salle ou en cours collectifs, préparation physique générale, remise en forme post-blessure, et suivi personnalisé sur plusieurs mois. Diplômé STAPS entraînement sportif."],
  ['Lucie', 'Fabre', 23, ['yoga', 'pilates'], 40, '0644556677', false, "Professeure de yoga certifiée (Yoga Alliance 200h) et pilates. Cours doux, respiration, mobilité."],
  ['Yanis', 'Belkacem', 20, ['boxe', 'cardio_choregraphie'], 32, '', true, "Coach boxe éducative et cardio-boxe, ancien compétiteur amateur."],
  ['Chloé', 'Marchand', 21, ['renforcement_choregraphie', 'step'], 38, '0655667788', false, "Préparation physique et musculation, suivi nutritionnel de base inclus."],
  ['Maxime', 'Perrin', 9, ['crossfit', 'cardio_choregraphie'], null, '0666778899', false, ""],
  ['Sofia', 'Nasri', 27, ['stretching'], 42, '0677889900', false, "Pole dance loisir et sportif, tous niveaux. Cours particuliers ou en petit groupe (2-4 personnes), matériel fourni. J'accompagne aussi la préparation physique spécifique (gainage, souplesse) pour progresser plus vite sur les figures."],
  ['Antoine', 'Lefebvre', 24, ['autre_fitness'], 33, '0688990011', false, "Coach musculation, hypertrophie et force. Programmes sur mesure."],
  ['Emma', 'Dubreuil', 3, ['yoga', 'cardio_choregraphie'], 55, '0699001122', true, "Coach parisienne, yoga dynamique et cardio training en extérieur ou en salle."],
  ['Rayan', 'Cherif', 29, ['boxe', 'crossfit'], 36, '0611002233', false, "Boxe anglaise et cross-training, préparation physique pour sports de combat."],
  ['Léa', 'Moreau', 26, ['step', 'pilates'], 34, '0622113344', false, "Cours collectifs fitness et pilates, spécialisée reprise de sport après grossesse."],
  ['Hugo', 'Bonnet', 22, ['lesmills_bodypump', 'cardio_choregraphie', 'crossfit'], 39, '0633224455', false, "10 ans d'expérience, du débutant au pratiquant confirmé. Je me déplace aussi en salle partenaire si besoin."],
  ['Nora', 'Haddad', 25, ['aquagym', 'aquabike'], 27, '', false, "Aquagym et aquabike, cours collectifs dynamiques en musique."],
  ['Camille', 'Fontaine', 5, ['pilates', 'yoga'], 48, '0611335577', false, "Pilates sur tapis et yoga restauratif, cabinet privé dans le 15e."],
  ['Nicolas', 'Lambert', 6, ['renforcement_choregraphie', 'step'], 37, '0622446688', false, "Coach à domicile ou en salle partenaire, secteur Montmartre. Programmes hypertrophie et remise en forme générale, suivi hebdomadaire avec ajustement des charges et bilan mensuel."],
  ['Sarah', 'Morel', 30, ['crossfit', 'boxe'], 41, '0633557799', true, "Ex-athlète de haut niveau reconvertie coach. Cross-training intensif et boxe pieds-poings."],
  ['Alexandre', 'Aziz', 31, ['lesmills_rpm', 'cardio_choregraphie'], 30, '0644668800', false, "Salle partenaire à Boulogne, cours particuliers en soirée."],
  ['Inès', 'Legrand', 32, ['aquagym', 'step'], 29, '0655779911', false, "Cours d'aquagym en piscine municipale, groupes de 6 personnes maximum."],
  ['Mathieu', 'Faure', 33, ['boxe', 'renforcement_choregraphie'], 34, '0666880022', false, "Boxe française et anglaise, préparation physique associée."],
  ['Océane', 'Chevalier', 34, ['yoga', 'pilates', 'cardio_choregraphie'], 44, '0677991133', false, "Studio privé à Antony. Yoga vinyasa, pilates renforcement, cardio doux pour tous niveaux. Cours individuels ou en duo, matériel fourni, possibilité de forfaits mensuels dégressifs."],
  ['Bilal', 'Robin', 35, ['crossfit', 'renforcement_choregraphie'], 40, '0688002244', false, "Coach cross-training, ancien militaire, discipline et rigueur."],
  ['Marion', 'Gauthier', 36, ['step', 'boxe'], 31, '', false, "Cours collectifs fitness-boxe le samedi matin, secteur Saint-Denis."],
  ['Kevin', 'Boucher', 37, ['renforcement_choregraphie', 'crossfit'], 36, '0699113355', false, "Préparateur physique, clientèle sportifs amateurs et coureurs."],
  ['Zoé', 'Meunier', 38, ['aquaboxing', 'yoga'], 33, '0611445588', true, "Double compétence aqua et yoga, cours en extérieur l'été."],
  ['Adrien', 'Dumas', 39, ['boxe', 'crossfit', 'cardio_choregraphie'], 38, '0622556699', false, "Ancien coach en club de boxe, aujourd'hui indépendant sur Bobigny et alentours. Cours particuliers, petits groupes, préparation à la compétition amateur possible sur demande."],
  ['Jade', 'Barbier', 40, ['step', 'pilates'], 35, '0633667700', false, "Cours à domicile ou en extérieur, spécialiste renforcement postural."],
  ['Enzo', 'Colin', 41, ['renforcement_choregraphie'], 32, '0644778811', false, "Musculation pure, tous objectifs (prise de masse, sèche, force)."],
  ['Clara', 'Henry', 42, ['yoga', 'cardio_choregraphie'], 42, '0655889922', false, "Professeure de yoga et coach cardio, cours en petit comité à Vitry."],
  ['Nathan', 'Vidal', 43, ['crossfit', 'boxe'], 39, '0666990033', false, "Coach cross-training et boxe, préparation physique générale. Interventions en salle partenaire ou en extérieur selon la météo, créneaux tôt le matin privilégiés pour les actifs."],
  ['Louna', 'Fournier', 44, ['zumba', 'aquagym'], 30, '0677001144', false, "Cours collectifs fitness et aquagym, secteur Saint-Maur."],
  ['Théo', 'Rousseau', 45, ['renforcement_choregraphie', 'cardio_choregraphie'], 34, '', false, "Coach musculation et cardio-training, salle partenaire à Cergy."],
  ['Salomé', 'Mercier', 46, ['pilates', 'yoga'], 46, '0688112255', true, "Pilates et yoga prénatal/postnatal, spécialisation reconnue."],
  ['Mehdi', 'Blanchard', 47, ['boxe', 'renforcement_choregraphie'], 33, '0699223366', false, "Boxe anglaise, cours particuliers et petits groupes à Sarcelles."],
  ['Juliette', 'Guerin', 0, ['step', 'pilates'], 50, '0611556677', false, "Coach dans le 1er arrondissement, clientèle entreprise et particuliers. Cours en studio privé, matériel haut de gamme, créneaux early morning et pause déjeuner disponibles toute la semaine."],
  ['Baptiste', 'Muller', 1, ['renforcement_choregraphie', 'crossfit'], 47, '0622667788', false, "Coach diplômé, secteur Panthéon, préparation physique générale et spécifique."],
  ['Yasmine', 'Leroy', 2, ['yoga', 'cardio_choregraphie'], 52, '0633778899', false, "Yoga dynamique près de l'Opéra, cours du matin avant le travail."],
  ['Romain', 'Garnier', 4, ['boxe', 'crossfit'], 43, '', false, "Boxe et cross-training dans le 13e, ambiance conviviale."],
  ['Elsa', 'Chevallier', 7, ['step', 'aquagym'], 36, '0644889900', true, "Cours fitness et aquagym secteur Ménilmontant, groupes réduits."],
  ['Quentin', 'Duval', 10, ['renforcement_choregraphie'], 31, '0655990011', false, "Coach musculation à Meaux, suivi rigoureux, programmes évolutifs."],
  ['Lina', 'Andre', 11, ['pilates_reformer', 'yoga'], 39, '0666001122', false, "Studio pilates à Chelles, cours en petit groupe ou individuel."],
  ['Gabriel', 'Caron', 12, ['crossfit', 'boxe'], 37, '0677112233', false, "Coach polyvalent à Provins, cross-training et boxe éducative pour tous niveaux, du débutant complet au pratiquant qui prépare une première compétition amateur."],
  ['Anaïs', 'Aubert', 13, ['yoga', 'step'], 41, '0688223344', false, "Yoga et fitness doux, secteur Versailles, clientèle variée."],
  ['Simon', 'Renaud', 14, ['renforcement_choregraphie', 'cardio_choregraphie'], 35, '0699334455', false, "Salle partenaire à Saint-Germain-en-Laye, coaching individuel."],
  ['Amélie', 'Roy', 15, ['aqua_toute', 'pilates'], 32, '', false, "Aquagym et pilates à Mantes-la-Jolie, cours collectifs le soir."],
  ['Loïc', 'Noel', 19, ['boxe', 'renforcement_choregraphie'], 30, '0611667788', false, "Boxe anglaise et musculation à Rambouillet, cours particuliers."],
  ['Margaux', 'Riviere', 28, ['step', 'crossfit'], 40, '0622778899', true, "Coach fitness et cross-training à Sainte-Geneviève-des-Bois. Ancienne sportive de haut niveau en athlétisme, reconvertie dans le coaching il y a 4 ans, spécialisée préparation physique générale."],
  ['Younes', 'Pierre', 48, ['renforcement_choregraphie', 'boxe'], 34, '0633889900', false, "Coach musculation et boxe à Argenteuil, suivi personnalisé."],
  ['Justine', 'Brun', 49, ['yoga', 'pilates'], 45, '0644990011', false, "Studio yoga-pilates à Pontoise, cours en petit groupe."],
  // Profils volontairement incomplets — pas d'adresse ou pas de discipline
  // (donc invisibles en recherche) : servent à tester l'état "profil pas encore visible".
  ['Julien', 'Renard', -1, [], 30, '0644009988', false, "Vient de créer son compte."],
  ['Manon', 'Petit', 29, [], null, '', false, ""],
  ['Alexis', 'Meriem', -1, ['step'], 35, '', false, ""],
  ['Dorian', 'Alicia', -1, [], null, '', false, ""],
];

// ─── Salles — [nom, communeIdx, disciplines[], contact_nom, contact_telephone, description] ──
const GYMS_DEF = [
  ['Fitness Park Corbeil', 16, ['step', 'renforcement_choregraphie'], 'Julie Martin', '0160000001',
    "Salle de 600 m², 900 adhérents. On cherche des coachs pour des cours collectifs le soir et le samedi matin."],
  ['CrossFit Essonne', 46, ['crossfit', 'boxe'], 'Marc Dubois', '0160000002',
    "Box CrossFit affiliée, ambiance communautaire. Recherche coachs L1/L2 pour cours du soir."],
  ['Aqua Forme Ballancourt', 49, ['aqua_toute', 'autre_aqua'], 'Sandrine Roy', '0160000003',
    "Centre aquatique, cours d'aquagym et aquabike toute la semaine."],
  ['Le Loft Sport Club', 8, ['step', 'pilates', 'yoga'], 'Nicolas Faure', '0160000004',
    "Club premium, studio dédié cours doux. Créneaux flexibles, rémunération à la séance ou au forfait."],
  ['Box Performance Draveil', 24, ['crossfit', 'renforcement_choregraphie'], 'Claire Vidal', '0160000005',
    "Salle de préparation physique, public sportifs amateurs et semi-pro."],
  ['Yoga Studio Étampes', 20, ['yoga', 'pilates'], 'Isabelle Renaud', '0160000006',
    "Studio indépendant, cours en petit groupe (8 personnes max)."],
  ['Muscu Club Savigny', 21, ['renforcement_choregraphie', 'cardio_choregraphie'], 'David Simon', '0160000007',
    "Salle de muscu classique, cherche coach pour suivi personnalisé des adhérents premium."],
  ['Pole & Fit Fontainebleau', 9, ['step'], 'Camille Aubert', '0160000008',
    "Studio pole dance et fitness, ambiance conviviale, tous niveaux."],
  ['Iron Gym Juvisy', 25, ['renforcement_choregraphie', 'boxe'], 'Kevin Lopez', '0160000009',
    "Salle de sport 24/7, cherche coachs indépendants pour cours collectifs early morning."],
  ['Wellness Center Paris 12', 3, ['yoga', 'cardio_choregraphie', 'pilates'], 'Aurélie Blanc', '0160000010',
    "Centre bien-être haut de gamme, clientèle CSP+, créneaux en journée."],
  ['Salle du Stade Ris-Orangis', 27, [], '', '', ""],
  ['Boxing Club Brétigny', 29, [], 'Farid Amrani', '0160000012', ""],
  ['Vita Sport Versailles', 13, ['step', 'renforcement_choregraphie'], 'Delphine Cohen', '0170000001',
    "Grande salle multi-activités au centre-ville de Versailles, cherche coachs polyvalents pour cours collectifs."],
  ['Le Studio Saint-Germain', 14, ['pilates', 'yoga'], 'Frédéric Lang', '0170000002',
    "Studio boutique haut de gamme, clientèle exigeante, rémunération attractive."],
  ['Ring Club Nanterre', 30, ['boxe', 'crossfit'], 'Samir Belhadj', '0170000003',
    "Club de boxe historique, cherche coach pour développer une offre cross-training en complément des cours de boxe existants."],
  ['Forma Boulogne', 31, ['step', 'cardio_choregraphie'], 'Anne-Sophie Guillou', '0170000004',
    "Salle de sport de quartier, ambiance familiale, cours en journée principalement."],
  ['Colombes Fit Club', 32, ['renforcement_choregraphie', 'step'], 'Yohann Picard', '0170000005',
    "Salle récente, équipement neuf, cherche coach pour lancer un programme de coaching individuel."],
  ['Antony Sport Center', 34, ['crossfit', 'renforcement_choregraphie'], 'Laure Masson', '0170000006',
    "Centre sportif municipal partenaire, plusieurs créneaux hebdomadaires disponibles."],
  ['Clamart Wellness', 35, ['yoga', 'pilates', 'aqua_toute'], 'Pauline Delaunay', '0170000007',
    "Espace bien-être avec bassin, cherche coach polyvalent aqua/yoga."],
  ['Saint-Denis Boxing', 36, ['boxe'], 'Ousmane Diallo', '0170000008',
    "Salle de boxe associative, forte fréquentation jeune public et adultes."],
  ['Montreuil CrossBox', 37, ['crossfit', 'boxe'], 'Elise Fabien', '0170000009',
    "Box hybride cross-training/boxe, communauté active sur les réseaux."],
  ['Aubervilliers Muscu', 38, ['renforcement_choregraphie'], 'Karim Zeroual', '0170000010',
    "Salle de musculation traditionnelle, clientèle fidèle, cherche coach pour cours du soir."],
  ['Bobigny Fitness', 39, ['step', 'cardio_choregraphie'], '', '',
    ""],
  ['Aulnay Sport Plus', 40, ['renforcement_choregraphie', 'crossfit'], 'Nadia Cherfi', '0170000012',
    "Grande salle multi-espaces, forte demande de coaching individuel non satisfaite en interne."],
  ['Créteil Aqua Gym', 41, ['aquagym', 'aquapalming'], 'Bruno Lacroix', '0170000013',
    "Centre aquatique municipal, cours collectifs et cherche coach pour cours individuels premium."],
  ['Vitry Yoga Loft', 42, ['yoga', 'pilates'], 'Manon Sabatier', '0170000014',
    "Loft dédié yoga et pilates, cadre atypique (ancienne usine réhabilitée), clientèle jeune et urbaine."],
  ['Champigny Box Club', 43, ['crossfit', 'boxe'], 'Alexandre Fontenelle', '0170000015',
    "Box récente, en pleine croissance, cherche plusieurs coachs pour répondre à la demande."],
  ['Ivry Fitness Park', 44, ['step', 'renforcement_choregraphie'], 'Sophie Regnier', '0170000016',
    "Salle de quartier populaire, tarifs accessibles, cherche coach motivé pour cours collectifs grand public."],
  ["L'Atelier Saint-Maur", 45, ['pilates', 'step'], 'Camille Ferrand', '0170000017',
    "Studio cosy en bord de Marne, cours en petit groupe, ambiance chaleureuse."],
  ['Cergy Sport Center', 46, ['renforcement_choregraphie', 'cardio_choregraphie', 'crossfit'], 'Thibault Royer', '0170000018',
    "Grand centre sportif, plusieurs plateaux, cherche coachs pour diversifier l'offre de cours collectifs et individuels."],
  ['Argenteuil Boxing Gym', 47, ['boxe', 'renforcement_choregraphie'], 'Rachid Amara', '0170000019',
    "Salle de boxe historique du quartier, forte demande de cours particuliers."],
  ['Sarcelles Fit', 48, ['step', 'aqua_toute'], 'Julie Nguyen', '0170000020',
    "Salle avec espace aquatique, cherche coach polyvalent pour développer les cours mixtes."],
  ['Pontoise Wellness Club', 49, ['yoga', 'pilates', 'cardio_choregraphie'], 'Emmanuelle Roget', '0170000021',
    "Club bien-être en centre-ville, clientèle fidèle, plusieurs créneaux à pourvoir."],
  ['Meaux Muscu Center', 10, ['renforcement_choregraphie'], '', '', ""],
];

async function seedCoaches() {
  console.log(`Géocodage et insertion de ${COACHES_DEF.length} coachs…`);
  for (let i = 0; i < COACHES_DEF.length; i++) {
    const [prenom, nom, communeIdx, disciplines, tarif, telephone, emailPublic, bio] = COACHES_DEF[i];
    const { rue, codePostal, ville } = communeIdx >= 0 ? adresseDe(communeIdx, i) : { rue: '', codePostal: '', ville: '' };
    let lat = null, lng = null;
    if (rue && ville) {
      const geo = await geocodeAdresse(`${rue} ${ville}`, codePostal);
      if (geo) { lat = geo.lat; lng = geo.lng; }
      else console.warn(`  ⚠ géocodage échoué pour ${prenom} ${nom} (${rue}, ${codePostal} ${ville})`);
    }
    const disciplinesStr = disciplines.join(',');
    const profilComplet = rue && ville && lat != null && disciplinesStr ? 1 : 0;
    const email = stripAccents(`${prenom.toLowerCase()}.${nom.toLowerCase()}.${i}@talents-test.fr`);
    db.run(
      `INSERT INTO coaches (email, password_hash, nom, prenom, adresse, code_postal, ville, lat, lng, disciplines, tarif_horaire, bio, telephone, email_public, profil_complet)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, hashPassword(MOT_DE_PASSE), nom, prenom, rue || null, codePostal || null, ville || null, lat, lng, disciplinesStr, tarif, bio, telephone, emailPublic ? 1 : 0, profilComplet]
    );
  }
  console.log(`  ✓ ${COACHES_DEF.length} coachs traités`);
}

async function seedGyms() {
  console.log(`Géocodage et insertion de ${GYMS_DEF.length} salles…`);
  for (let i = 0; i < GYMS_DEF.length; i++) {
    const [nom, communeIdx, disciplines, contactNom, contactTel, description] = GYMS_DEF[i];
    const { rue, codePostal, ville } = communeIdx >= 0 ? adresseDe(communeIdx, i + 200) : { rue: '', codePostal: '', ville: '' };
    let lat = null, lng = null;
    if (rue && ville) {
      const geo = await geocodeAdresse(`${rue} ${ville}`, codePostal);
      if (geo) { lat = geo.lat; lng = geo.lng; }
      else console.warn(`  ⚠ géocodage échoué pour ${nom} (${rue}, ${codePostal} ${ville})`);
    }
    const disciplinesStr = disciplines.join(',');
    const profilComplet = rue && ville && lat != null && disciplinesStr ? 1 : 0;
    const email = `contact@${slug(nom)}-${i}.fr`;
    const contactEmail = contactNom ? email : '';
    db.run(
      `INSERT INTO gyms (email, password_hash, nom, adresse, code_postal, ville, lat, lng, disciplines_recherchees, description, contact_nom, contact_email, contact_telephone, profil_complet)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, hashPassword(MOT_DE_PASSE), nom, rue || null, codePostal || null, ville || null, lat, lng, disciplinesStr, description, contactNom, contactEmail, contactTel, profilComplet]
    );
  }
  console.log(`  ✓ ${GYMS_DEF.length} salles traitées`);
}

async function seed() {
  console.log('Réinitialisation des tables coaches/gyms/contact_events…');
  db.run('DELETE FROM contact_events');
  db.run('DELETE FROM coach_sessions');
  db.run('DELETE FROM gym_sessions');
  db.run('DELETE FROM coaches');
  db.run('DELETE FROM gyms');

  await seedCoaches();
  await seedGyms();

  const nbCoaches = db.get('SELECT COUNT(*) as n FROM coaches').n;
  const nbCoachesVisibles = db.get('SELECT COUNT(*) as n FROM coaches WHERE profil_complet = 1').n;
  const nbGyms = db.get('SELECT COUNT(*) as n FROM gyms').n;
  const nbGymsVisibles = db.get('SELECT COUNT(*) as n FROM gyms WHERE profil_complet = 1').n;
  console.log(`\nTerminé : ${nbCoaches} coachs (${nbCoachesVisibles} visibles), ${nbGyms} salles (${nbGymsVisibles} visibles).`);
  console.log(`Mot de passe unique pour tous les comptes de test : ${MOT_DE_PASSE}`);
  console.log(`Emails coachs : prenom.nom.<index>@talents-test.fr — ex. lucie.fabre.4@talents-test.fr`);
  console.log(`Emails salles : contact@nom-slug-<index>.fr — ex. contact@fitness-park-corbeil-0.fr`);
}

seed().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
