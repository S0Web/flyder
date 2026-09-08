// Documentation Flyder — contenu statique, identique pour toutes les salles
// (contrairement à Formation, propre à chaque salle et éditable depuis
// l'appli). Se modifie ici, dans le code, pas depuis une interface.
//
// Chaque article a un id stable (utilisé dans l'URL /documentation/:id et
// dans les liens internes entre articles) — ne jamais le changer une fois
// publié, sous peine de casser des liens partagés ou mis en favori.

export const DOC_CATEGORIES = [
  {
    id: 'prise-en-main',
    titre: 'Prise en main',
    articles: [
      {
        id: 'prise-en-main',
        titre: 'Se connecter et se repérer',
        contenu: `## Se connecter

Flyder n'utilise pas d'identifiant/mot de passe classique. Au lancement, l'écran "Qui utilise Flyder aujourd'hui ?" affiche la liste des profils de la salle sous forme de pastilles avec initiale. Il suffit de cliquer sur son profil pour entrer.

Si un code confidentiel a été défini sur le profil, il est demandé avant l'accès. Un profil sans code peut y accéder directement — définir un code reste facultatif mais recommandé, surtout pour les profils manager. En cas de code oublié, l'option "Code oublié ?" permet de le réinitialiser (un nouveau code doit alors être choisi immédiatement).

Aucun nouveau profil ne peut être créé depuis cet écran : la création se fait exclusivement depuis [Paramètres > Utilisateurs](/documentation/parametres-utilisateurs) (Manager). Exception : si la salle vient d'être installée et qu'aucun profil n'existe encore, un formulaire de création du tout premier compte (automatiquement manager) apparaît à la place de la liste.

## Repères de navigation

Le menu latéral donne accès à toutes les sections de l'application. Certaines entrées ne sont visibles que pour un profil manager (précisé article par article dans cette documentation). Un badge peut apparaître sur [Support](/documentation/support) ou [Nouveautés](/documentation/nouveautes) pour signaler du contenu non lu.`,
      },
    ],
  },
  {
    id: 'planning',
    titre: 'Planning',
    articles: [
      {
        id: 'planning',
        titre: 'Planning des cours',
        contenu: `Le Planning est la page d'accueil de Flyder : il affiche le programme des cours de la semaine.

## Lire la vue grille

Par défaut, la semaine s'affiche en grille : une colonne par jour, une ligne par créneau (Aqua Matin / Fitness Matin / Aqua Après-midi / Fitness Après-midi — les lignes Aqua n'apparaissent que si les cours Aqua sont activés, voir [Préférences > Planning](/documentation/parametres-preferences)). Chaque case contient les cours programmés à ce moment-là.

Une bascule Grille / Liste en haut de page permet de passer à une vue tableau chronologique, plus pratique pour parcourir rapidement toute la semaine cours par cours (avec statut, présents, pointeur).

## Créer, modifier, annuler une séance

- **Créer** : cliquer sur le petit "+" en bas d'une case (vue grille) ou sur une case vide.
- **Modifier** : cliquer sur une séance existante ouvre sa fiche (cours, coach, horaire, statut, nombre de présents).
- **Statut** : chaque séance suit un cycle programmée → effectuée → payée (ou annulée). En vue liste, cliquer directement sur le badge de statut le fait avancer dans le cycle sans ouvrir la fiche.
- **Supprimer** : disponible depuis la fiche de la séance.

## Dupliquer une semaine

Le bouton "Dupliquer" copie tous les cours de la semaine précédente vers la semaine affichée, sans toucher aux cours déjà présents (pas de doublons ni d'écrasement). Pratique pour reproduire un planning-type semaine après semaine.

## Filtrer par cours

La barre latérale gauche permet de cocher un ou plusieurs cours pour n'afficher que ceux-là — utile pour se concentrer sur une discipline précise. Seuls les cours réellement programmés cette semaine-là apparaissent dans la liste de filtres.

## Assigner un coach

Depuis la fiche d'une séance, un coach peut être choisi parmi la liste des coachs actifs. Une séance sans coach assigné, si elle approche (délai réglable dans [Préférences > Alertes](/documentation/parametres-preferences)), est mise en évidence pour ne pas être oubliée.`,
      },
      {
        id: 'planning-personnel',
        titre: 'Planning personnel',
        contenu: `Le Planning personnel gère les horaires de travail du personnel (coachs et employés), semaine par semaine — à ne pas confondre avec le [Planning des cours](/documentation/planning) : ici, on renseigne qui travaille quand, pas quel cours a lieu quand.

## Renseigner un créneau

Cliquer sur une case (employé × jour) ouvre une fenêtre pour indiquer soit un horaire de travail (début/fin), soit une absence (CP, école, férié, arrêt, repos). Une case peut contenir plusieurs créneaux de travail dans la même journée (ex. matin et soir séparés).

## Vue chronologique

Sous le tableau, une frise visuelle ("qui est là et quand") représente chaque créneau de travail sous forme de barre positionnée sur un axe horaire — un coup d'œil suffit pour voir qui est présent à un instant donné.

## Dupliquer une semaine

Comme pour le Planning des cours, un bouton permet de copier les jours déjà renseignés de la semaine précédente, sans toucher à ce qui est déjà rempli cette semaine.

## Récap mensuel (Manager)

Un bouton "Récap mensuel" affiche, par employé, le nombre d'heures travaillées mois par mois sur les 12 derniers mois, avec un total et le solde de congés payés.

## Congés payés

La barre latérale affiche un résumé des CP pris ce mois-ci, cette année, et le solde restant pour chaque profil. Le détail et l'ajustement manuel se font depuis la [fiche individuelle de l'employé](/documentation/parametres-utilisateurs).`,
      },
    ],
  },
  {
    id: 'coachs-annuaire',
    titre: 'Coachs & Annuaire',
    articles: [
      {
        id: 'coachs',
        titre: 'Coachs (Récapitulatif)',
        contenu: `Cette page centralise le suivi des heures effectuées par chaque coach, sur les 13 derniers mois — utile en fin de mois pour vérifier ce qui est dû avant de régler une facture.

## Lire le tableau

Une ligne par coach, une colonne par mois, le nombre d'heures effectuées dans chaque case. Deux cases à cocher en haut permettent de choisir quels statuts comptent comme "réalisé" : "Effectuées" et/ou "Payées" (une séance annulée ne compte jamais). "Inactifs" permet d'afficher aussi les coachs désactivés (pour consulter leur historique).

## Consulter le détail

Cliquer sur un nombre d'heures ouvre la liste des séances correspondantes (cours, horaire, durée). Un bouton "Exporter en PDF" y génère un récapitulatif prêt à comparer avec la facture du coach — avec, si renseignés sur sa fiche, son adresse, son SIRET et le montant dû (tarif horaire × heures).

## Fiche coach

Cliquer sur le nom d'un coach ouvre ses statistiques (cours donnés, heures, effectif moyen sur 30 jours / depuis septembre / tout temps), avec un accès "Modifier les informations" pour éditer sa fiche : coordonnées, discipline(s) enseignée(s), et informations de facturation (adresse, SIRET, tarif horaire — facultatives, utilisées uniquement pour l'export PDF). C'est aussi depuis cette fiche que sont gérés les documents du coach (contrats, etc., visible en Manager) et qu'on peut désactiver ou réactiver un coach.

Pour l'analyse détaillée de la performance des coachs (charge, remplissage), voir [Analyse > Les coachs](/documentation/analyse-coachs).`,
      },
      {
        id: 'annuaire',
        titre: 'Annuaire',
        contenu: `L'Annuaire regroupe tous les contacts utiles de la salle, classés par catégorie : Coachs, Prestataires, Employés, Responsables. Un même contact peut apparaître dans plusieurs catégories (ex. un coach qui est aussi salarié).

## Rechercher et filtrer

Une barre de recherche filtre par nom, téléphone ou notes. Les boutons de catégorie au-dessus permettent de n'afficher qu'un type de contact.

## Ajouter un contact

Le bouton "Nouveau contact" permet d'ajouter un Prestataire, Employé ou Responsable (nom, téléphone, notes libres). Les coachs, eux, se créent uniquement depuis [Coachs](/documentation/coachs) — cliquer sur un coach dans l'Annuaire ouvre une fiche allégée (téléphone, disciplines) plutôt que la fiche complète.

## Modifier ou supprimer

Cliquer sur un contact ouvre sa fiche pour modification. La suppression est disponible depuis cette même fiche (sauf pour les coachs, gérés depuis Coachs).`,
      },
    ],
  },
  {
    id: 'analyse',
    titre: 'Analyse',
    articles: [
      {
        id: 'analyse',
        titre: "Comprendre l'onglet Analyse",
        contenu: `C'est la section la plus dense de Flyder, et souvent la moins bien comprise au départ — parce qu'à première vue, ça ressemble à des jolis graphiques décoratifs. Ce n'en sont pas : chaque graphique répond à une question concrète que se pose n'importe quel gérant de salle, et sert à prendre une vraie décision (ouvrir un créneau, en fermer un, revoir un tarif de coach, questionner un cours qui s'essouffle).

Cette documentation détaille chaque partie de l'onglet dans un article séparé : [L'essentiel](/documentation/analyse-essentiel), [Évolution dans le temps](/documentation/analyse-evolution), [Fréquentation](/documentation/analyse-frequentation), [Les cours](/documentation/analyse-cours), [Les coachs](/documentation/analyse-coachs), [Fiabilité du planning](/documentation/analyse-qualite).

## Choisir sa période

En haut de page, trois modes : **Année scolaire** (septembre → août, la façon la plus naturelle de découper l'activité d'une salle), **Plage** (dates libres), ou **Tout l'historique**. Chaque graphique se recalcule automatiquement selon la période choisie, et se compare silencieusement à la période équivalente précédente (le sous-titre en haut de page l'indique) — c'est ce qui permet de voir si un chiffre est bon ou mauvais, pas seulement de le voir.

Si les cours Aqua sont activés, un filtre Aqua/Fitness/Tous est disponible à côté du sélecteur de période.

Un menu de navigation rapide (à droite, sur grand écran) permet de sauter directement à une section de la page.`,
      },
      {
        id: 'analyse-essentiel',
        titre: "Analyse — L'essentiel",
        contenu: `Cinq chiffres-clés en haut de la page [Analyse](/documentation/analyse) : séances effectuées, participants, heures de cours, effectif moyen par séance, et taux d'annulation — chacun avec sa variation par rapport à la période précédente et une mini-courbe des 12 derniers mois.

## Pourquoi les regarder

C'est le tableau de bord "santé" de l'activité. Une hausse régulière des participants avec un effectif moyen stable = la salle grandit sainement (plus de cours, pas juste plus de monde entassé). Une hausse des annulations, elle, doit alerter même si le reste va bien — c'est souvent le premier signal d'un problème (coach en difficulté, créneau mal choisi, cours qui ne plaît plus). Voir aussi [Fiabilité du planning](/documentation/analyse-qualite).

Quatre chiffres complémentaires en dessous (cours au catalogue, coachs actifs, séances programmées, séances sans coach) donnent une photo rapide de la structure de l'offre — "séances sans coach" en particulier mérite d'être à zéro en permanence.`,
      },
      {
        id: 'analyse-evolution',
        titre: 'Analyse — Évolution dans le temps',
        contenu: `## Comment la fréquentation évolue-t-elle ?

Une courbe mensuelle, avec un sélecteur pour choisir la mesure suivie (séances, participants, heures, ou effectif moyen). Une courbe qui monte régulièrement = activité en croissance ; des creux marqués correspondent le plus souvent aux vacances scolaires — pas la peine de s'inquiéter d'une baisse en février si elle se reproduit chaque année à la même période.

## Aqua ou Fitness : qui tire l'activité ?

(si Aqua actif) La même courbe, séparée par univers. Un écart qui se creuse entre les deux indique où se déplace réellement la demande des adhérents, une info utile pour décider où ouvrir un créneau supplémentaire.

## Pourquoi ça compte

Un seul chiffre ("plus de monde qu'avant") peut cacher une tendance négative en train de démarrer. La courbe mensuelle est ce qui permet de la voir venir plusieurs mois avant qu'elle ne devienne un vrai problème.`,
      },
      {
        id: 'analyse-frequentation',
        titre: 'Analyse — Quand la salle tourne-t-elle',
        contenu: `## La carte des créneaux

Une grille jour × heure où chaque case est colorée selon son remplissage. C'est la vue la plus utile de toute la page [Analyse](/documentation/analyse) pour une question très concrète : quels créneaux mériteraient d'être questionnés ? Une case pâle ou vide, ce n'est pas anodin — soit le créneau existe mais ne remplit pas (candidat à déplacer ou remplacer par un autre cours), soit il n'existe pas encore alors qu'un créneau voisin cartonne (candidat à ouvrir).

## Quels jours / horaires remplissent le mieux ?

Deux graphiques en barres, un par jour et un par heure de début, avec le nombre de séances associé en info-bulle. Un jour ou un horaire avec un bon remplissage mais peu de séances programmées est un signal clair : il y a probablement de la place pour un créneau de plus à ce moment-là.

## Les séances sont-elles bien remplies ?

Répartition des séances par tranche de participants. Un effectif moyen de 10 personnes par séance peut vouloir dire deux choses très différentes : "toujours 10, jamais plus jamais moins" (stable, prévisible) ou "la moitié des séances sont pleines, l'autre moitié vides" (problème de régularité à creuser). Seul ce graphique permet de distinguer les deux — la moyenne seule ne le dit jamais.

## Aqua / Fitness — la part de chacun

(si Aqua actif) Répartition globale des participants entre les deux univers sur la période.`,
      },
      {
        id: 'analyse-cours',
        titre: 'Analyse — Les cours',
        contenu: `## Les cours qui rassemblent le plus

Classement des cours par total de participants sur la période.

## Quels cours programmer davantage ?

Un nuage de points : chaque point est un cours, sa position horizontale indique combien de fois il a été programmé, sa position verticale son effectif moyen. Les cours en haut à gauche (peu programmés mais toujours pleins) sont les meilleurs candidats à un créneau supplémentaire — c'est de la demande non satisfaite. Ceux en bas à droite (souvent programmés mais peu remplis) méritent l'inverse : réduire la fréquence, changer l'horaire, ou remplacer le cours.

## Pourquoi ce graphique change la donne

Sans lui, la tentation naturelle est de se fier à l'instinct ("je sens que ce cours marche bien") — ce graphique remplace l'instinct par un fait vérifiable, et révèle souvent des surprises (un cours qu'on pensait secondaire mais qui affiche complet à chaque fois).`,
      },
      {
        id: 'analyse-coachs',
        titre: 'Analyse — Les coachs',
        contenu: `## Qui assure le plus d'heures ?

Classement par heures réellement effectuées (les annulations ne comptent pas). Utile pour équilibrer la charge de travail entre coachs, ou repérer une dépendance excessive à une seule personne.

## Qui remplit le mieux ses séances ?

Effectif moyen par coach (minimum 5 séances pour être comparable). À lire avec prudence : un coach qui n'anime que des cours naturellement moins fréquentés (ex. Pilates vs Zumba) aura logiquement une moyenne plus basse sans que ce soit un problème de qualité d'animation — le type de cours pèse autant que le coach lui-même.

Pour le suivi des heures facturables, voir [Coachs (Récapitulatif)](/documentation/coachs).`,
      },
      {
        id: 'analyse-qualite',
        titre: 'Analyse — Fiabilité du planning',
        contenu: `## Le taux d'annulation se dégrade-t-il ?

Part des séances annulées, mois par mois. Une barre isolée peut être un aléa (météo, travaux, un coach malade) et ne mérite pas d'inquiétude particulière ; c'est la tendance sur plusieurs mois qui compte vraiment.

## Quels cours sont le plus souvent annulés ?

Classement en pourcentage de leurs propres séances programmées (pas en volume brut, sinon les cours les plus fréquents sortiraient toujours en tête artificiellement). Un cours avec un taux d'annulation élevé, même peu fréquent, signale un problème réel à comprendre : coach peu fiable sur ce créneau, horaire mal choisi, cours qui ne convainc plus.

## Pourquoi cette section est facilement ignorée, à tort

Une salle qui ne regarde que la fréquentation peut sembler en bonne santé tout en ayant un problème d'annulations qui grignote la confiance des adhérents. C'est un signal précoce, à vérifier régulièrement même quand tout semble bien aller par ailleurs.`,
      },
    ],
  },
  {
    id: 'support-nouveautes',
    titre: 'Support & Nouveautés',
    articles: [
      {
        id: 'support',
        titre: 'Support',
        contenu: `Un espace d'échange en tickets avec l'équipe Flyder — pour signaler un bug, poser une question, ou faire une suggestion.

## Ouvrir un ticket

Un nouveau message crée un ticket. Les échanges suivants s'ajoutent au même fil, comme une conversation.

## Suivre une réponse

Un badge apparaît dans le menu quand une réponse est arrivée sur un ticket. Ouvrir l'onglet Support marque les nouveaux messages comme lus.`,
      },
      {
        id: 'nouveautes',
        titre: 'Nouveautés',
        contenu: `Le fil des annonces de l'équipe Flyder : nouvelles fonctionnalités, améliorations, corrections notables. Comme pour [Support](/documentation/support), un badge signale du contenu non encore consulté.`,
      },
    ],
  },
  {
    id: 'parametres',
    titre: 'Paramètres',
    articles: [
      {
        id: 'parametres-profil',
        titre: 'Mon profil',
        contenu: `Visible par tout le monde. Affiche l'identité du profil connecté (nom, email, rôle) avec deux actions : modifier ses informations, ou ouvrir sa fiche complète (documents personnels, congés payés — voir [Utilisateurs](/documentation/parametres-utilisateurs)).`,
      },
      {
        id: 'parametres-utilisateurs',
        titre: 'Utilisateurs (Manager)',
        contenu: `Liste de tous les profils de la salle (nom, email, rôle, statut actif/inactif). Depuis cet écran :

- **Créer un profil** — bouton "Nouveau". C'est le seul moyen d'ajouter un profil une fois que la salle a déjà son premier compte.
- **Importer les fiches de paie** — import en masse de documents pour plusieurs employés à la fois.
- **Activer / désactiver** — cliquer sur le badge de statut. Un profil désactivé n'apparaît plus sur l'écran de connexion mais reste visible dans l'historique (plannings passés, etc.).
- **Supprimer définitivement** — uniquement possible sur un profil déjà désactivé (sauf le sien).
- **Ouvrir la fiche** — donne accès à la fiche complète de l'employé : documents (fiche de paie, contrat, arrêt maladie, autre), détail et ajustement manuel des congés payés, modification des informations.`,
      },
      {
        id: 'parametres-historique',
        titre: 'Historique (Manager)',
        contenu: `Le journal d'audit : qui a fait quoi et quand (connexions, créations de profil, modifications de séances, de planning personnel...). Filtrable par action, par utilisateur, et par période — utile pour retracer un changement inattendu ou vérifier qui a modifié quoi.`,
      },
      {
        id: 'parametres-preferences',
        titre: 'Préférences (Manager)',
        contenu: `## Infos de la salle

Nom affiché (barre latérale, écran de connexion) et adresse de facturation (reprise sur les exports PDF).

## Sécurité & Confidentialité

Gestion des adresses IP autorisées : un profil "Utilisateur" (non-manager) n'a que des permissions restreintes même depuis une IP autorisée, et une lecture seule depuis n'importe où ailleurs. Un profil Manager, lui, a toutes les permissions en toutes circonstances. Cette section permet aussi de régler le délai de déconnexion automatique du profil actif (jamais, 15 min, 30 min, 1h, ou fin de journée) — une protection contre le risque d'agir par erreur sur le profil de quelqu'un d'autre resté connecté.

## Planning

Le taux mensuel d'acquisition des congés payés (2,5 jours/mois par défaut, le standard légal), et l'activation ou non des cours Aqua : décocher fait disparaître complètement le choix Aqua/Fitness partout dans l'application (planning, analyse, fiches coachs) pour les salles qui n'ont pas de piscine — ce n'est pas juste rendu inaccessible, ça n'apparaît nulle part.

## Alertes

Le délai (en jours) avant qu'une séance sans coach assigné soit mise en évidence dans le [Planning](/documentation/planning).

## Sauvegarde & Restauration

Télécharger une copie brute de la base de données actuelle, ou en importer une pour remplacer intégralement les données en place. L'import est une opération irréversible (une sauvegarde de sécurité est prise automatiquement côté serveur juste avant, par précaution) — une sauvegarde récente (moins de 15 minutes) est exigée avant de pouvoir choisir un fichier à importer.`,
      },
    ],
  },
  {
    id: 'aide',
    titre: 'Rôles & assistance',
    articles: [
      {
        id: 'roles-permissions',
        titre: 'Rôles & permissions',
        contenu: `Flyder distingue deux rôles :

- **Manager** — accès complet : Utilisateurs, Historique, Préférences, création/désactivation de profils, gestion des documents des coachs et employés, permissions illimitées peu importe le lieu de connexion.
- **Utilisateur** — accès au Planning, Planning personnel, Coachs, Annuaire, Analyse, Support, Nouveautés, et à son propre profil. Les permissions d'écriture dépendent de l'adresse IP : restreintes depuis une IP autorisée par un manager (typiquement le Wi-Fi de la salle), lecture seule depuis n'importe où ailleurs.

Cette distinction protège les réglages sensibles (facturation, congés, sécurité) tout en laissant le personnel de terrain utiliser l'outil au quotidien sans dépendre d'un manager pour chaque action.`,
      },
      {
        id: 'en-cas-de-souci',
        titre: 'En cas de souci',
        contenu: `## Écran "Abonnement inactif"

Si cet écran apparaît à la connexion, l'abonnement Flyder de la salle n'est plus actif et l'accès à l'application est suspendu. Il faut contacter le manager de la salle pour régulariser la situation.

## Qui contacter

Pour toute question, bug ou suggestion sur l'usage quotidien de l'outil : passer par [Support](/documentation/support) directement depuis l'application. Pour un problème d'accès plus profond (l'écran ci-dessus, un abonnement, une question contractuelle) : contacter directement l'éditeur de Flyder.`,
      },
    ],
  },
];

// Index à plat, pratique pour la recherche et la résolution directe par id.
export const DOC_ARTICLES = DOC_CATEGORIES.flatMap(cat =>
  cat.articles.map(a => ({ ...a, categorieId: cat.id, categorieTitre: cat.titre }))
);

// Insensible aux accents et à la casse — une recherche "annulation" doit
// aussi trouver "Annulé", "s'annulent", etc.
function normalize(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Débarrasse le markdown de sa syntaxe pour un extrait lisible dans les
// résultats de recherche (pas de #, *, liens bruts...).
function toPlainText(markdown) {
  return (markdown || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [texte](lien) -> texte
    .replace(/^[ \t]*[-*][ \t]+/gm, '') // puces de liste en début de ligne
    .replace(/[#*_`>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Recherche plein texte sur titre + contenu de tous les articles. Les
// correspondances de titre remontent en premier ; chaque résultat porte un
// extrait centré sur la première occurrence trouvée dans le texte.
export function searchDocArticles(query) {
  const q = normalize(query).trim();
  if (!q) return [];
  return DOC_ARTICLES
    .map(article => {
      const plain = toPlainText(article.contenu);
      const titreMatch = normalize(article.titre).includes(q);
      const normPlain = normalize(plain);
      const idx = normPlain.indexOf(q);
      if (!titreMatch && idx === -1) return null;
      let snippet = null;
      if (idx !== -1) {
        const start = Math.max(0, idx - 50);
        const end = Math.min(plain.length, idx + q.length + 70);
        snippet = (start > 0 ? '…' : '') + plain.slice(start, end).trim() + (end < plain.length ? '…' : '');
      }
      return { ...article, snippet, titreMatch };
    })
    .filter(Boolean)
    .sort((a, b) => (b.titreMatch ? 1 : 0) - (a.titreMatch ? 1 : 0));
}
