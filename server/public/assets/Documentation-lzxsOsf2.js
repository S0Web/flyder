import{r as e}from"./rolldown-runtime-QTnfLwEv.js";import{n as t,t as n}from"./jsx-runtime-CIxEorsV.js";import{n as r,r as i,t as a}from"./search-BaHk7IhL.js";import{B as o,K as s,W as c,y as l}from"./index-w-L4pEKa.js";import{n as u}from"./markdown-DMGfxa9w.js";var d=e(t(),1),f=[{id:`prise-en-main`,titre:`Prise en main`,articles:[{id:`prise-en-main`,titre:`Se connecter et se repérer`,contenu:`## Se connecter

Flyder n'utilise pas d'identifiant/mot de passe classique. Au lancement, l'écran "Qui utilise Flyder aujourd'hui ?" affiche la liste des profils de la salle sous forme de pastilles avec initiale. Il suffit de cliquer sur son profil pour entrer.

Si un code confidentiel a été défini sur le profil, il est demandé avant l'accès. Un profil sans code peut y accéder directement — définir un code reste facultatif mais recommandé, surtout pour les profils manager. En cas de code oublié, l'option "Code oublié ?" permet de le réinitialiser (un nouveau code doit alors être choisi immédiatement).

Aucun nouveau profil ne peut être créé depuis cet écran : la création se fait exclusivement depuis [Équipe > Effectif](/documentation/planning-personnel) (Manager). Exception : si la salle vient d'être installée et qu'aucun profil n'existe encore, un formulaire de création du tout premier compte (automatiquement manager) apparaît à la place de la liste.

## Repères de navigation

Le menu latéral donne accès à toutes les sections de l'application. Certaines entrées ne sont visibles que pour un profil manager (précisé article par article dans cette documentation). Un badge peut apparaître sur [Support](/documentation/support) ou [Nouveautés](/documentation/nouveautes) pour signaler du contenu non lu.`}]},{id:`planning`,titre:`Planning`,articles:[{id:`planning`,titre:`Planning des cours`,contenu:`Le Planning est la page d'accueil de Flyder : il affiche le programme des cours de la semaine.

## Lire la vue grille

Par défaut, la semaine s'affiche en grille : une colonne par jour, une ligne par créneau (Aqua Matin / Fitness Matin / Aqua Après-midi / Fitness Après-midi — les lignes Aqua n'apparaissent que si les cours Aqua sont activés, voir [Préférences > Planning](/documentation/parametres-preferences)). Chaque case contient les cours programmés à ce moment-là.

Une bascule Grille / Liste en haut de page permet de passer à une vue tableau chronologique, plus pratique pour parcourir rapidement toute la semaine cours par cours (avec statut, présents, pointeur).

## Créer, modifier, annuler une séance

- **Créer** : cliquer sur le petit "+" en bas d'une case (vue grille) ou sur une case vide.
- **Modifier** : cliquer sur une séance existante ouvre sa fiche (cours, coach, horaire, statut, nombre de présents).
- **Statut** : cliquer sur le badge de statut (vue grille comme vue liste) fait avancer la séance dans le cycle programmé → effectué → annulé → payé, puis retour à programmé. La fiche de la séance permet de choisir directement le bon statut.
- **Supprimer** : disponible depuis la fiche de la séance.

## Dupliquer une semaine

Le bouton "Dupliquer" copie tous les cours de la semaine précédente vers la semaine affichée, sans toucher aux cours déjà présents (pas de doublons ni d'écrasement). Pratique pour reproduire un planning-type semaine après semaine.

## Filtrer par cours

La barre latérale gauche permet de cocher un ou plusieurs cours pour n'afficher que ceux-là — utile pour se concentrer sur une discipline précise. Seuls les cours réellement programmés cette semaine-là apparaissent dans la liste de filtres.

## Assigner un coach

Depuis la fiche d'une séance, un coach peut être choisi parmi la liste des coachs actifs. Une séance sans coach assigné, si elle approche (délai réglable dans [Préférences > Alertes](/documentation/parametres-preferences)), est mise en évidence pour ne pas être oubliée.

## Remplacer un coach

Un coach malade ou absent ? Ouvre la fiche de la séance : pour une séance **sans coach** ou **annulée**, le bloc « Trouver un coach pour cette séance » s'ouvre tout seul ; pour une séance qui a un coach, le lien « Remplacer le coach… » l'ouvre. La liste propose les coachs actifs : ceux qui ont déjà donné ce cours sont en tête, et ceux qui ont déjà un cours qui chevauche ce créneau sont signalés (le remplacement reste possible après confirmation). Un motif (malade, congé…) est facultatif. Confirmer enregistre tout de suite le remplacement, remet au programme une séance annulée, et garde une **trace** : qui devait faire le cours, qui le fait, pourquoi, quand et par qui. L'historique s'affiche dans la fiche de la séance. Changer simplement le coach depuis la liste déroulante de la fiche laisse aussi une trace (sans motif). Une séance déjà effectuée ou payée ne se remplace pas de cette façon : modifie son coach depuis sa fiche.

Les remplacements alimentent l'[Analyse des coachs](/documentation/analyse-coachs) : qui dépanne le plus souvent, et combien de fois chacun a été remplacé.

## Capacité et remplissage

Chaque cours peut avoir une **capacité** (son nombre de places), facultative : elle se saisit dans la fiche d'une séance, sous le choix du cours, et vaut pour toutes les séances de ce cours. Quand elle est connue, l'effectif d'une séance s'affiche sous la forme « 12/20 » (en ambre quand la séance est complète), et l'[Analyse](/documentation/analyse-cours) calcule des taux de remplissage.

Un créneau — même cours, même jour de la semaine, même heure de début — dont les dernières séances réalisées ont **toutes affiché complet, au moins 3 fois de suite**, reçoit la mention « Complet ×3 » (ou 4, 5…) sur ses prochaines séances programmées : c'est le signe d'une demande non satisfaite, à traiter en ouvrant une séance de plus ou en relevant la capacité. La mention disparaît dès qu'une séance n'est pas pleine, ou quand le créneau n'a plus eu de séance complète depuis 60 jours.`},{id:`planning-personnel`,titre:`Équipe`,contenu:`L'onglet Équipe regroupe tout ce qui concerne le personnel de la salle : planning, tâches, bilans de fin de journée et fiches individuelles. Il remplace l'ancien « Planning personnel ». Un manager y trouve une vue d'ensemble de l'équipe ; chaque salarié y voit sa journée, ses tâches et sa propre fiche.

Onglets d'un manager : Vue d'ensemble, Ma journée, Planning, Tâches, Comptes rendus, Incidents, Effectif. Onglets d'un salarié : Ma journée, Planning, Mes tâches, Mes comptes rendus, Incidents, Ma fiche. Un point rouge sur « Équipe » dans le menu signale ce qui attend : bilans à valider, demandes de congé et incidents sans responsable pour un manager ; tâche en retard, bilan à revoir, nouveau document ou incident dont on est responsable pour un salarié.

## Ma journée

- Tes horaires du jour écrits en grand, ton poste et ton objectif principal.
- Le bouton « Faire mon bilan de fin de journée ». Une fois envoyé, il est remplacé par une pastille « À valider », puis « Validé ».
- Tes chiffres : tâches à faire aujourd'hui, en retard, terminées ces 7 derniers jours, congés restants.
- Les alertes : bilan renvoyé « à revoir », nouveau document déposé pour toi, réponse à une demande de congé.
- Tes cours, si ton profil est relié à une fiche coach (voir Effectif) : les séances des 7 prochains jours, avec l'heure, le statut et l'effectif. Le planning des cours reste la référence, on n'y modifie rien d'ici.
- Tes tâches, avec un champ pour t'en ajouter une rapidement. Les tâches de checklist du jour (ouverture, fermeture, bassin) y figurent quand tu es la personne planifiée sur le créneau.
- Tes missions du quotidien (celles de ta fiche de poste), à déplier.
- « À savoir en arrivant » : la priorité de demain et le problème signalé par tes collègues dans leur bilan d'hier ou d'aujourd'hui (un problème réglé n'y figure plus).
- Ta semaine jour par jour, avec « demander un congé », et « Avec moi aujourd'hui » : qui travaille, à quelles heures, qui est en poste en ce moment (trait corail = heure actuelle), qui est absent.

## Vue d'ensemble (Manager)

- En haut : présents du jour, tâches ouvertes, tâches en retard, tâches tenues sur 7 jours (part des tâches arrivées à échéance ces 7 derniers jours qui sont terminées), documents pas encore ouverts par leur destinataire.
- « Qui est là » : les horaires du jour de chacun sur une frise ; un clic sur un prénom ouvre sa fiche.
- « À valider » : les derniers bilans reçus, validables directement depuis cette page (un manager peut valider son propre bilan).
- « Demandes de congé » (quand il y en a) : chaque demande avec le solde de CP du demandeur, les collègues déjà en congé sur ces dates et les jours à poser, que le manager coche ou décoche avant d'accepter. Accepter remplace le planning de chaque jour retenu par « CP » ; refuser demande une raison.
- « Bilans de fin de journée » : une case par personne et par jour sur 14 jours, croisée avec le planning. Case pleine foncée = validé, pleine corail = à valider, barrée = à revoir, en pointillés = jour travaillé sans bilan, hachurée = ne travaillait pas.
- « Chiffres du terrain » : les indicateurs de type « nombre » saisis dans les bilans (prospects contactés, adhérents accompagnés…), additionnés par membre : cette semaine, la semaine dernière et les 30 derniers jours.
- « Charge de l'équipe » : les tâches ouvertes de chacun (une case par tâche, en corail si elle est en retard) et le nombre de tâches terminées ces 7 derniers jours.
- « Terrain » : les problèmes à traiter (signalés dans les bilans des 30 derniers jours, pas encore résolus) et les absences des 3 prochaines semaines (congés, arrêts, absences ; les jours d'école ne sont pas listés). Un problème peut être transformé en tâche en un clic, repris comme incident (voir Incidents), ou marqué résolu ; relié à une tâche, il est considéré résolu dès que cette tâche est terminée.

## Planning

Le planning du personnel, semaine par semaine — à ne pas confondre avec le [Planning des cours](/documentation/planning). Tout le monde voit le planning de toute l'équipe (pour savoir avec qui on travaille et qui prend le relais) ; « Mes horaires » n'affiche que les siens.

Cliquer sur une case (employé × jour) permet d'indiquer un horaire de travail ou une absence (CP, école, férié, arrêt, repos) ; une journée peut contenir plusieurs créneaux (matin et soir). La frise sous le tableau montre qui est là et quand ; ses bornes sont les heures d'ouverture de la salle (Préférences > Planning). « Dupliquer la semaine précédente » recopie les jours encore vides. Pour un manager, la colonne « total » compare les heures planifiées aux heures de contrat de chacun (si elles sont renseignées). Le « Récap mensuel » (Manager) totalise les heures de chacun sur 12 mois et s'exporte en CSV pour la paie. Pour un salarié relié à une fiche coach, ses heures de cours (séances non annulées) s'affichent à part, mois par mois et en total : elles ne sont pas additionnées aux heures planifiées, le planning couvrant déjà sa présence.

## Tâches

Chaque tâche a :
- une **échéance** facultative (une tâche créée sans date apparaît sous « Sans échéance ») et une **priorité** (basse, normale, haute « !! », urgente « !!! ») ;
- un **statut** : à faire, en cours, terminée ;
- une **répétition** facultative (tous les jours, toutes les semaines, tous les mois) : quand la tâche est terminée, la suivante se crée toute seule avec la prochaine échéance ;
- des **détails** et un **suivi** où chacun peut ajouter une note (Entrée pour envoyer) ;
- son **auteur**, toujours affiché (« créée par… »).

Le manager crée des tâches pour n'importe qui et peut filtrer par membre. Un salarié voit ses propres tâches et peut s'en créer ; sur une tâche créée par quelqu'un d'autre, il peut changer le statut et ajouter une note, mais seul l'auteur ou un manager modifie le reste.

Deux affichages : **Liste**, regroupée par échéance (en retard, aujourd'hui, cette semaine, plus tard, sans échéance, terminées), où la case à gauche coche une tâche en un clic ; **Tableau**, en trois colonnes (à faire, en cours, terminée), où l'on fait glisser une tâche d'une colonne à l'autre. Les tâches terminées restent visibles 60 jours.

## Checklists du service

Un manager ouvre « Checklists du service » (bouton en haut de la page Tâches) pour définir les routines d'**ouverture**, de **fermeture** et du **bassin** : des modèles de tâches, sans responsable fixe, avec une priorité et les jours concernés. Chaque jour concerné, chaque modèle devient une tâche pour la personne planifiée sur le créneau, d'après le planning du personnel :
- **ouverture** : la première personne planifiée, si elle commence au plus tard 2 h après l'heure d'ouverture de la salle (Préférences > Planning) ;
- **fermeture** : la dernière personne planifiée, si elle finit au plus tôt 2 h avant la fermeture ;
- **bassin** : la personne qui ouvre (contrôle avant l'accueil du public).

Si personne n'est planifié sur un créneau, rien n'est créé et le panneau l'indique (« personne de planifié sur ce créneau »). Une tâche non commencée suit le planning : si celui-ci change, elle passe à la bonne personne ; une tâche commencée ou terminée ne bouge plus. Ces tâches se cochent comme les autres (marque « checklist »), et une tâche non faite reste « en retard » les jours suivants. Modifier un modèle met à jour les tâches du jour non commencées ; le supprimer les retire, l'historique reste.

## Incidents

L'onglet Incidents suit les pannes et problèmes du terrain : **bassin** (pH, chlore, eau…), **matériel** ou **autre**. Tout le monde peut en signaler un et consulter la liste ; chaque incident a un **statut** (ouvert, en cours, résolu), un **responsable** (désigné par un manager), la **mesure prise** et les dates de signalement et de résolution, ce qui sert de trace (notamment pour le contrôle du bassin). Le responsable fait avancer le statut et note la mesure prise ; seul un manager modifie le reste ou supprime. Un incident résolu reste consultable 12 mois.

Un manager peut aussi reprendre un **problème signalé dans un bilan** (Vue d'ensemble > Problèmes à traiter > « suivre comme incident ») : il devient un incident, quitte la liste des problèmes à traiter, et disparaît de « À savoir en arrivant » une fois résolu.

## Bilan de fin de journée

Avant de partir, chacun ouvre « Mon bilan de la journée » :
1. **Ce que j'ai fait** : cocher les missions de sa fiche de poste réalisées dans la journée.
2. **Mes chiffres** : les indicateurs prévus par sa fiche de poste (prospects contactés, adhérents accompagnés, contenus publiés…). Chacun a un type : un nombre, une réponse oui ou non, ou un texte libre ; une valeur qui ne correspond pas au type est refusée.
3. **Pour finir** : la journée en deux mots, la priorité du lendemain, un problème ou besoin à signaler. La priorité du lendemain et le problème sont transmis aux collègues (dans « À savoir en arrivant ») ; la journée en deux mots reste réservée au manager.

« Brouillon » enregistre sans envoyer (visible par soi seul) ; « Envoyer au manager » le transmet. Un bilan reste modifiable tant qu'il n'est pas validé, jusqu'à 7 jours après.

Le manager le **valide** (avec un mot en retour s'il le souhaite) ou le renvoie **à revoir** en expliquant quoi corriger : le salarié le voit en haut de sa journée et le corrige. Un manager peut valider son propre bilan, ce qui permet à un manager seul de tenir le dispositif.

Page « Comptes rendus » : un manager y trouve les bilans **à valider** et l'**historique** de toute l'équipe (filtrable par membre) ; un salarié y retrouve tous les siens. Le champ **jour** permet d'afficher un jour précis ; « tous les jours » revient à la liste complète.

## Fiche d'un membre

Depuis Effectif (manager) ou Ma fiche (salarié) :
- **Aperçu** : les chiffres des 30 derniers jours (jours travaillés, bilans envoyés et validés, tâches faites, tâches en retard), la semaine en cours, le solde de congés payés et le résumé du poste.
- **Fiche de poste** : l'objectif principal, les missions du quotidien, les chiffres demandés dans le bilan (chacun avec son type : nombre, oui/non ou texte) et un rappel facultatif affiché dans le bilan (ex. « Si j'ai terminé, je reprends la liste depuis le début »). Rédigée et modifiée par un manager.
- **Tâches** et **Comptes rendus** du membre.
- **Documents** : voir ci-dessous.
- **Suivi** (manager, sur la fiche des autres membres) : des notes d'entretien ou de suivi, visibles des managers uniquement, jamais de la personne concernée.
- **Carnet privé** (sur sa propre fiche uniquement) : des notes personnelles qui s'enregistrent toutes seules. Personne d'autre ne peut les lire, managers compris.

Effectif (Manager) présente toute l'équipe, une ligne par personne : poste, heures de la semaine comparées au contrat (si renseigné), tâches ouvertes et en retard, date du dernier bilan, congés restants, documents non ouverts. C'est aussi ici que se gère l'équipe : « Ajouter un membre » crée un profil (avec son rôle, sa date de début de contrat et ses heures de contrat hebdomadaires), « désactiver » / « réactiver » et « supprimer » (uniquement sur un profil déjà désactivé) agissent sur chaque ligne, et « Importer les fiches de paie » répartit en masse les documents de plusieurs employés à la fois.

Dans « Modifier » (ou à la création), un manager peut relier un salarié à une **fiche coach** s'il donne aussi des cours : ses séances des 7 prochains jours apparaissent alors dans sa journée et ses heures de cours dans le récap mensuel. Une fiche coach ne se relie qu'à un seul profil.

## Documents confidentiels

Fiches de paie, contrat, arrêts maladie et autres documents se trouvent dans le coffre de la fiche. Pour l'ouvrir, il faut ressaisir son code confidentiel, même en étant déjà connecté ; il se referme automatiquement au bout de 10 minutes (ou avec « refermer maintenant »). Un profil sans code est invité à en créer un, qui servira aussi à la connexion.

Un salarié ne voit que ses propres documents ; les nouveaux sont marqués « nouveau ». Le manager dépose les documents depuis la fiche (ou en masse via Effectif > Importer les fiches de paie) et voit pour chacun s'il a été ouvert par son destinataire, et quand.

## Congés payés

Le solde de CP s'affiche dans Ma journée, sur la fiche de chacun et dans la barre latérale du planning. Le détail (acquis, ajustement, pris, restant) est sur la fiche ; l'ajustement manuel du cumul est réservé au manager.

Pour poser un congé, le salarié utilise « demander un congé » dans Ma journée (une période, un motif facultatif) et suit sa demande au même endroit ; il peut l'annuler tant qu'elle n'est pas traitée. Le manager répond depuis la Vue d'ensemble. Les comptes en lecture seule (hors de la salle) ne peuvent pas envoyer de demande.`}]},{id:`coachs-annuaire`,titre:`Coachs & Annuaire`,articles:[{id:`coachs`,titre:`Coachs`,contenu:`L'onglet Coachs centralise le suivi des heures effectuées par chaque coach, sur les 13 derniers mois — utile en fin de mois pour vérifier ce qui est dû avant de régler une facture.

## Lire le tableau

Une ligne par coach, une colonne par mois, le nombre d'heures effectuées dans chaque case. Deux cases à cocher en haut permettent de choisir quels statuts comptent comme "réalisé" : "Effectuées" et/ou "Payées" (une séance annulée ne compte jamais). "Inactifs" permet d'afficher aussi les coachs désactivés (pour consulter leur historique).

## Consulter le détail

Cliquer sur un nombre d'heures ouvre la liste des séances correspondantes (cours, horaire, durée). Un bouton "Exporter en PDF" y génère un récapitulatif prêt à comparer avec la facture du coach — avec, si renseignés sur sa fiche, son adresse, son SIRET et le montant dû (tarif horaire × heures).

## Fiche coach

Cliquer sur le nom d'un coach ouvre ses statistiques (cours donnés, heures, effectif moyen sur 30 jours / depuis septembre / tout temps), avec un accès "Modifier les informations" pour éditer sa fiche : coordonnées, discipline(s) enseignée(s), et informations de facturation (adresse, SIRET, tarif horaire — facultatives, utilisées uniquement pour l'export PDF). C'est aussi depuis cette fiche que sont gérés les documents du coach (contrats, etc., visible en Manager) et qu'on peut désactiver ou réactiver un coach.

Pour l'analyse détaillée de la performance des coachs (charge, remplissage), voir [Analyse > Les coachs](/documentation/analyse-coachs).`},{id:`annuaire`,titre:`Annuaire`,contenu:`L'Annuaire regroupe tous les contacts utiles de la salle, classés par catégorie : Coachs, Prestataires, Employés, Responsables. Un même contact peut apparaître dans plusieurs catégories (ex. un coach qui est aussi salarié).

## Rechercher et filtrer

Une barre de recherche filtre par nom, téléphone ou notes. Les boutons de catégorie au-dessus permettent de n'afficher qu'un type de contact.

## Ajouter un contact

Le bouton "Nouveau contact" permet d'ajouter un Prestataire, Employé ou Responsable (nom, téléphone, notes libres). Les coachs, eux, se créent uniquement depuis [Coachs](/documentation/coachs) — cliquer sur un coach dans l'Annuaire ouvre une fiche allégée (téléphone, disciplines) plutôt que la fiche complète.

## Modifier ou supprimer

Cliquer sur un contact ouvre sa fiche pour modification. La suppression est disponible depuis cette même fiche (sauf pour les coachs, gérés depuis Coachs).`}]},{id:`analyse`,titre:`Analyse`,articles:[{id:`analyse`,titre:`Comprendre l'onglet Analyse`,contenu:`C'est la section la plus dense de Flyder, et souvent la moins bien comprise au départ — parce qu'à première vue, ça ressemble à des jolis graphiques décoratifs. Ce n'en sont pas : chaque graphique répond à une question concrète que se pose n'importe quel gérant de salle, et sert à prendre une vraie décision (ouvrir un créneau, en fermer un, revoir un tarif de coach, questionner un cours qui s'essouffle).

Cette documentation détaille chaque partie de l'onglet dans un article séparé : [L'essentiel](/documentation/analyse-essentiel), [Évolution dans le temps](/documentation/analyse-evolution), [Fréquentation](/documentation/analyse-frequentation), [Les cours](/documentation/analyse-cours), [Les coachs](/documentation/analyse-coachs), [Fiabilité du planning](/documentation/analyse-qualite).

## Choisir sa période

En haut de page, trois modes : **Année scolaire** (septembre → août, la façon la plus naturelle de découper l'activité d'une salle), **Plage** (dates libres), ou **Tout l'historique**. Chaque graphique se recalcule automatiquement selon la période choisie, et se compare silencieusement à la période équivalente précédente (le sous-titre en haut de page l'indique) — c'est ce qui permet de voir si un chiffre est bon ou mauvais, pas seulement de le voir.

Si les cours Aqua sont activés, un filtre Aqua/Fitness/Tous est disponible à côté du sélecteur de période.

Un menu de navigation rapide (à droite, sur grand écran) permet de sauter directement à une section de la page.`},{id:`analyse-essentiel`,titre:`Analyse — L'essentiel`,contenu:`Cinq chiffres-clés en haut de la page [Analyse](/documentation/analyse) : séances effectuées, participants, heures de cours, effectif moyen par séance, et taux d'annulation — chacun avec sa variation par rapport à la période précédente et une mini-courbe des 12 derniers mois.

## Pourquoi les regarder

C'est le tableau de bord "santé" de l'activité. Une hausse régulière des participants avec un effectif moyen stable = la salle grandit sainement (plus de cours, pas juste plus de monde entassé). Une hausse des annulations, elle, doit alerter même si le reste va bien — c'est souvent le premier signal d'un problème (coach en difficulté, créneau mal choisi, cours qui ne plaît plus). Voir aussi [Fiabilité du planning](/documentation/analyse-qualite).

Cinq chiffres complémentaires en dessous (taux de remplissage, cours au catalogue, coachs actifs, séances programmées, séances sans coach) donnent une photo rapide de la structure de l'offre — "séances sans coach" en particulier mérite d'être à zéro en permanence. Le **taux de remplissage** rapporte les présents aux places disponibles, sur les séances réalisées dont l'effectif et la capacité du cours sont connus (la capacité se saisit dans la fiche d'une séance, voir [Planning des cours](/documentation/planning)).`},{id:`analyse-evolution`,titre:`Analyse — Évolution dans le temps`,contenu:`## Comment la fréquentation évolue-t-elle ?

Une courbe mensuelle, avec un sélecteur pour choisir la mesure suivie (séances, participants, heures, ou effectif moyen). Une courbe qui monte régulièrement = activité en croissance ; des creux marqués correspondent le plus souvent aux vacances scolaires — pas la peine de s'inquiéter d'une baisse en février si elle se reproduit chaque année à la même période.

## Aqua ou Fitness : qui tire l'activité ?

(si Aqua actif) La même courbe, séparée par univers. Un écart qui se creuse entre les deux indique où se déplace réellement la demande des adhérents, une info utile pour décider où ouvrir un créneau supplémentaire.

## Pourquoi ça compte

Un seul chiffre ("plus de monde qu'avant") peut cacher une tendance négative en train de démarrer. La courbe mensuelle est ce qui permet de la voir venir plusieurs mois avant qu'elle ne devienne un vrai problème.`},{id:`analyse-frequentation`,titre:`Analyse — Quand la salle tourne-t-elle`,contenu:`## La carte des créneaux

Une grille jour × heure où chaque case est colorée selon son remplissage. C'est la vue la plus utile de toute la page [Analyse](/documentation/analyse) pour une question très concrète : quels créneaux mériteraient d'être questionnés ? Une case pâle ou vide, ce n'est pas anodin — soit le créneau existe mais ne remplit pas (candidat à déplacer ou remplacer par un autre cours), soit il n'existe pas encore alors qu'un créneau voisin cartonne (candidat à ouvrir).

## Quels jours / horaires remplissent le mieux ?

Deux graphiques en barres, un par jour et un par heure de début, avec le nombre de séances associé en info-bulle. Un jour ou un horaire avec un bon remplissage mais peu de séances programmées est un signal clair : il y a probablement de la place pour un créneau de plus à ce moment-là.

## Les séances sont-elles bien remplies ?

Répartition des séances par tranche de participants. Un effectif moyen de 10 personnes par séance peut vouloir dire deux choses très différentes : "toujours 10, jamais plus jamais moins" (stable, prévisible) ou "la moitié des séances sont pleines, l'autre moitié vides" (problème de régularité à creuser). Seul ce graphique permet de distinguer les deux — la moyenne seule ne le dit jamais.

## Aqua / Fitness — la part de chacun

(si Aqua actif) Répartition globale des participants entre les deux univers sur la période.`},{id:`analyse-cours`,titre:`Analyse — Les cours`,contenu:`## Les cours qui rassemblent le plus

Classement des cours par total de participants sur la période.

## Quels cours programmer davantage ?

Un nuage de points : chaque point est un cours, sa position horizontale indique combien de fois il a été programmé, sa position verticale son effectif moyen. Les cours en haut à gauche (peu programmés mais toujours pleins) sont les meilleurs candidats à un créneau supplémentaire — c'est de la demande non satisfaite. Ceux en bas à droite (souvent programmés mais peu remplis) méritent l'inverse : réduire la fréquence, changer l'horaire, ou remplacer le cours.

## Quels cours sont les mieux remplis ?

Le taux de remplissage de chaque cours dont la capacité est connue : présents ÷ places, sur les séances dont l'effectif est renseigné. Un cours à 95 % est quasiment toujours plein ; un cours à 40 % a de la marge.

## Créneaux souvent complets

La liste des créneaux (même cours, même jour, même heure) dont les dernières séances ont toutes atteint la capacité, au moins 3 fois de suite. Elle ne dépend pas de la période choisie : c'est l'état actuel, avec le nombre de séances pleines d'affilée. Chaque ligne est un candidat à une séance de plus ou à une capacité relevée.

## Pourquoi ce graphique change la donne

Sans lui, la tentation naturelle est de se fier à l'instinct ("je sens que ce cours marche bien") — ce graphique remplace l'instinct par un fait vérifiable, et révèle souvent des surprises (un cours qu'on pensait secondaire mais qui affiche complet à chaque fois).`},{id:`analyse-coachs`,titre:`Analyse — Les coachs`,contenu:`## Qui assure le plus d'heures ?

Classement par heures réellement effectuées (les annulations ne comptent pas). Utile pour équilibrer la charge de travail entre coachs, ou repérer une dépendance excessive à une seule personne.

## Qui remplit le mieux ses séances ?

Effectif moyen par coach (minimum 5 séances pour être comparable). À lire avec prudence : un coach qui n'anime que des cours naturellement moins fréquentés (ex. Pilates vs Zumba) aura logiquement une moyenne plus basse sans que ce soit un problème de qualité d'animation — le type de cours pèse autant que le coach lui-même.

## Qui dépanne le plus souvent ?

Les séances de la période qu'un coach a reprises à un autre (ou à une séance laissée sans coach), via « Remplacer le coach » dans la fiche d'une séance. Le tableau donne aussi, pour chaque coach, combien de fois il a été remplacé : de quoi repérer ceux sur qui on compte, et ceux dont les absences reviennent.

Pour le suivi des heures facturables, voir [Coachs](/documentation/coachs).`},{id:`analyse-qualite`,titre:`Analyse — Fiabilité du planning`,contenu:`## Le taux d'annulation se dégrade-t-il ?

Part des séances annulées, mois par mois. Une barre isolée peut être un aléa (météo, travaux, un coach malade) et ne mérite pas d'inquiétude particulière ; c'est la tendance sur plusieurs mois qui compte vraiment.

## Quels cours sont le plus souvent annulés ?

Classement en pourcentage de leurs propres séances programmées (pas en volume brut, sinon les cours les plus fréquents sortiraient toujours en tête artificiellement). Un cours avec un taux d'annulation élevé, même peu fréquent, signale un problème réel à comprendre : coach peu fiable sur ce créneau, horaire mal choisi, cours qui ne convainc plus.

## Pourquoi cette section est facilement ignorée, à tort

Une salle qui ne regarde que la fréquentation peut sembler en bonne santé tout en ayant un problème d'annulations qui grignote la confiance des adhérents. C'est un signal précoce, à vérifier régulièrement même quand tout semble bien aller par ailleurs.`}]},{id:`support-nouveautes`,titre:`Support & Nouveautés`,articles:[{id:`support`,titre:`Support`,contenu:`Un espace d'échange en tickets avec l'équipe Flyder — pour signaler un bug, poser une question, ou faire une suggestion.

## Ouvrir un ticket

Un nouveau message crée un ticket. Les échanges suivants s'ajoutent au même fil, comme une conversation.

## Suivre une réponse

Un badge apparaît dans le menu quand une réponse est arrivée sur un ticket. Ouvrir l'onglet Support marque les nouveaux messages comme lus.`},{id:`nouveautes`,titre:`Nouveautés`,contenu:`Le fil des annonces de l'équipe Flyder : nouvelles fonctionnalités, améliorations, corrections notables. Comme pour [Support](/documentation/support), un badge signale du contenu non encore consulté.`}]},{id:`parametres`,titre:`Paramètres`,articles:[{id:`parametres-profil`,titre:`Mon profil`,contenu:`Visible par tout le monde. Affiche l'identité du profil connecté (nom, email, rôle) avec deux actions : modifier ses informations, ou ouvrir sa fiche complète (documents personnels, congés payés — voir [Équipe](/documentation/planning-personnel)).`},{id:`parametres-utilisateurs`,titre:`Utilisateurs (Manager)`,contenu:`La gestion des utilisateurs a déménagé dans l'onglet [Équipe > Effectif](/documentation/planning-personnel) : création d'un profil, activation et désactivation, suppression définitive, import des fiches de paie, heures de contrat et date de début de contrat. Chaque ligne ouvre la fiche du membre : fiche de poste, tâches, comptes rendus, documents confidentiels, congés payés et notes de suivi.`},{id:`parametres-historique`,titre:`Historique (Manager)`,contenu:`Le journal d'audit : qui a fait quoi et quand (connexions, créations de profil, modifications de séances, de planning personnel...). Filtrable par action, par utilisateur, et par période — utile pour retracer un changement inattendu ou vérifier qui a modifié quoi.`},{id:`parametres-preferences`,titre:`Préférences (Manager)`,contenu:`## Infos de la salle

Nom affiché (barre latérale, écran de connexion) et adresse de facturation (reprise sur les exports PDF).

## Sécurité & Confidentialité

Gestion des adresses IP autorisées : un profil "Utilisateur" (non-manager) n'a que des permissions restreintes même depuis une IP autorisée, et une lecture seule depuis n'importe où ailleurs. Un profil Manager, lui, a toutes les permissions en toutes circonstances. Cette section permet aussi de régler le délai de déconnexion automatique du profil actif (jamais, 15 min, 30 min, 1h, ou fin de journée) — une protection contre le risque d'agir par erreur sur le profil de quelqu'un d'autre resté connecté.

## Planning

Les heures d'ouverture de la salle (7h à 22h par défaut), qui bornent les frises horaires de l'onglet Équipe (« Qui est là », planning du personnel) ; elles ne limitent pas la saisie des cours. Le taux mensuel d'acquisition des congés payés (2,5 jours/mois par défaut, le standard légal), et l'activation ou non des cours Aqua : décocher fait disparaître complètement le choix Aqua/Fitness partout dans l'application (planning, analyse, fiches coachs) pour les salles qui n'ont pas de piscine — ce n'est pas juste rendu inaccessible, ça n'apparaît nulle part.

## Alertes

Le délai (en jours) avant qu'une séance sans coach assigné soit mise en évidence dans le [Planning](/documentation/planning).

## Sauvegarde & Restauration

Télécharger une copie brute de la base de données actuelle, ou en importer une pour remplacer intégralement les données en place. L'import est une opération irréversible (une sauvegarde de sécurité est prise automatiquement côté serveur juste avant, par précaution) — une sauvegarde récente (moins de 15 minutes) est exigée avant de pouvoir choisir un fichier à importer.`}]},{id:`aide`,titre:`Rôles & assistance`,articles:[{id:`roles-permissions`,titre:`Rôles & permissions`,contenu:`Flyder distingue deux rôles :

- **Manager** — accès complet : Utilisateurs, Historique, Préférences, création/désactivation de profils, gestion des documents des coachs et employés, permissions illimitées peu importe le lieu de connexion.
- **Utilisateur** — accès au Planning, à l'onglet Équipe (sa journée, le planning du personnel, ses tâches et sa fiche), Coachs, Analyse, Formation, Documentation, Support, Nouveautés, et à son propre profil. L'Annuaire n'est visible que depuis une adresse IP autorisée. Les permissions d'écriture dépendent elles aussi de l'adresse IP : restreintes depuis une IP autorisée par un manager (typiquement le Wi-Fi de la salle), lecture seule depuis n'importe où ailleurs.

Cette distinction protège les réglages sensibles (facturation, congés, sécurité) tout en laissant le personnel de terrain utiliser l'outil au quotidien sans dépendre d'un manager pour chaque action.`},{id:`en-cas-de-souci`,titre:`En cas de souci`,contenu:`## Écran "Abonnement inactif"

Si cet écran apparaît à la connexion, l'abonnement Flyder de la salle n'est plus actif et l'accès à l'application est suspendu. Il faut contacter le manager de la salle pour régulariser la situation.

## Qui contacter

Pour toute question, bug ou suggestion sur l'usage quotidien de l'outil : passer par [Support](/documentation/support) directement depuis l'application. Pour un problème d'accès plus profond (l'écran ci-dessus, un abonnement, une question contractuelle) : contacter directement l'éditeur de Flyder.`}]}],p=f.flatMap(e=>e.articles.map(t=>({...t,categorieId:e.id,categorieTitre:e.titre})));function m(e){return(e||``).normalize(`NFD`).replace(/[̀-ͯ]/g,``).toLowerCase()}function h(e){return(e||``).replace(/\[([^\]]+)\]\([^)]+\)/g,`$1`).replace(/^[ \t]*[-*][ \t]+/gm,``).replace(/[#*_`>]/g,` `).replace(/\s+/g,` `).trim()}function g(e){let t=m(e).trim();return t?p.map(e=>{let n=h(e.contenu),r=m(e.titre).includes(t),i=m(n).indexOf(t);if(!r&&i===-1)return null;let a=null;if(i!==-1){let e=Math.max(0,i-50),r=Math.min(n.length,i+t.length+70);a=(e>0?`…`:``)+n.slice(e,r).trim()+(r<n.length?`…`:``)}return{...e,snippet:a,titreMatch:r}}).filter(Boolean).sort((e,t)=>!!t.titreMatch-+!!e.titreMatch):[]}var _=n();function v(e,t){return e||`Ouvrir cet article.`}function y({query:e,onChange:t,resultsCount:n}){let r=(0,d.useRef)(null);return(0,_.jsxs)(`div`,{className:`relative`,children:[(0,_.jsx)(a,{className:`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none`}),(0,_.jsx)(`input`,{ref:r,value:e,onChange:e=>t(e.target.value),placeholder:`Chercher dans la documentation…`,className:`w-full border border-gray-300 rounded-lg pl-9 pr-8 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400`}),e&&(0,_.jsx)(`button`,{onClick:()=>{t(``),r.current?.focus()},"aria-label":`Effacer la recherche`,className:`absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600`,children:(0,_.jsx)(l,{className:`h-4 w-4`})}),e&&(0,_.jsxs)(`p`,{className:`text-[11px] text-gray-400 mt-1.5 px-0.5`,children:[n,` résultat`,n===1?``:`s`,` pour « `,e,` »`]})]})}function b({activeId:e}){return(0,_.jsx)(`nav`,{className:`space-y-4`,children:f.map(t=>(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`div`,{className:`text-[11px] font-bold uppercase tracking-wide text-gray-400 px-2 mb-1`,children:t.titre}),(0,_.jsx)(`div`,{className:`space-y-0.5`,children:t.articles.map(t=>(0,_.jsx)(o,{to:`/documentation/${t.id}`,className:`block px-2 py-1.5 rounded-lg text-sm transition-colors ${t.id===e?`bg-sky-50 text-sky-700 font-medium`:`text-gray-600 hover:bg-gray-50`}`,children:t.titre},t.id))})]},t.id))})}function x({results:e,activeId:t,query:n}){return e.length===0?(0,_.jsxs)(`p`,{className:`text-sm text-gray-400 italic px-2 py-4`,children:[`Aucun article ne correspond à « `,n,` ».`]}):(0,_.jsx)(`div`,{className:`space-y-1`,children:e.map(e=>(0,_.jsxs)(o,{to:`/documentation/${e.id}`,className:`block px-3 py-2.5 rounded-lg transition-colors border ${e.id===t?`bg-sky-50 border-sky-200`:`bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50`}`,children:[(0,_.jsxs)(`div`,{className:`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5`,children:[(0,_.jsx)(r,{className:`h-3 w-3`}),` `,e.categorieTitre]}),(0,_.jsx)(`div`,{className:`text-sm font-semibold text-gray-800`,children:e.titre}),(0,_.jsx)(`div`,{className:`text-xs text-gray-500 mt-0.5 line-clamp-2`,children:v(e.snippet)})]},e.id))})}function S(){let{articleId:e}=s(),t=c(),[n,r]=(0,d.useState)(``);(0,d.useEffect)(()=>{e||t(`/documentation/${p[0].id}`,{replace:!0})},[e,t]);let a=(0,d.useMemo)(()=>p.find(t=>t.id===e),[e]),o=(0,d.useMemo)(()=>n?g(n):[],[n]);function l(e){let n=e.target.closest(`a`);if(!n)return;let r=n.getAttribute(`href`)||``;r.startsWith(`/documentation/`)&&(e.preventDefault(),t(r))}return(0,_.jsxs)(`div`,{className:`space-y-4`,children:[(0,_.jsxs)(`div`,{children:[(0,_.jsx)(`h1`,{className:`text-lg font-bold text-gray-800`,children:`Documentation`}),(0,_.jsx)(`p`,{className:`text-xs text-gray-400 mt-0.5`,children:`Comment utiliser Flyder — pour toute question sur votre outil de gestion de salle.`})]}),(0,_.jsxs)(`div`,{className:`grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5`,children:[(0,_.jsxs)(`div`,{className:`lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto lg:sticky lg:top-6 space-y-3`,children:[(0,_.jsx)(y,{query:n,onChange:r,resultsCount:o.length}),n?(0,_.jsx)(x,{results:o,activeId:e,query:n}):(0,_.jsx)(b,{activeId:e})]}),(0,_.jsx)(`div`,{className:`bg-white rounded-xl border border-gray-200 p-6 min-h-[20rem]`,children:a?(0,_.jsxs)(_.Fragment,{children:[(0,_.jsx)(`h2`,{className:`text-xl font-bold text-gray-800 mb-4`,children:a.titre}),(0,_.jsx)(`div`,{className:`formation-content`,onClick:l,dangerouslySetInnerHTML:{__html:u(a.contenu)}})]}):(0,_.jsxs)(`div`,{className:`text-center py-10 text-gray-400 text-sm`,children:[(0,_.jsx)(i,{className:`h-8 w-8 mx-auto mb-2 text-gray-300`}),`Article introuvable.`]})})]})]})}export{S as default};