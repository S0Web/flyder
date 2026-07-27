# Audit & pistes d'amélioration — juillet 2026

Ce document liste des initiatives concrètes, classées par priorité. Chaque entrée est
autonome : problème → solution → fichiers à toucher → effort (S/M/L).
Une session future peut implémenter n'importe quelle entrée isolément, dans l'ordre des priorités.

**Rappels d'architecture pour la session qui implémente :**
- Client React/Vite dans `client/`, serveur Express + SQLite (node-sqlite3-wasm) dans `server/`.
- La prod (Railway) sert le build statique commité dans `server/public/` → après toute modif client,
  faire `npm run build` dans `client/` puis remplacer `server/public/` (rm assets+index.html, cp -r client/dist/*).
- Migrations DB : pattern "rebuild de table" dans `server/src/db/database.js` (voir `migrateCoachNullable`),
  toujours idempotentes (vérifier l'état avant d'agir), la DB de prod vit sur un volume Railway.
- Pas de suite de tests : vérifier en local (npm run dev, proxy Vite → 3001) avant de builder.
- Le push GitHub depuis les sessions Claude échoue (403) : générer un patch `git format-patch -1 HEAD --binary --stdout`
  et le faire appliquer par l'utilisateur (`git am`), qui pousse lui-même.

---

## P1 — Bugs réels et risques

### 1. Accès non protégé : n'importe qui avec l'URL peut devenir manager
**Problème.** Depuis la suppression des mots de passe, l'app en prod (URL publique Railway) permet à
quiconque de cliquer sur un profil — y compris manager — et d'obtenir tous les droits. La création
de profil (`POST /api/auth/profiles`) est aussi publique.
**Solution.** Code PIN optionnel à 4 chiffres par profil : colonne `pin TEXT` (nullable) sur `app_users`
(migration `tryAlter ADD COLUMN`, pas besoin de rebuild). Un manager peut définir/retirer le PIN d'un
profil dans Paramètres > Utilisateurs. À la sélection d'un profil qui a un PIN, `ProfilePicker.jsx`
affiche un pavé 4 chiffres ; `POST /api/auth/select` vérifie `{ user_id, pin }` et renvoie 401 sinon.
Icône cadenas discrète sur les bulles protégées. Ne surtout PAS re-hasher lourdement : un simple
stockage du PIN suffit pour ce niveau de menace (protection anti-curieux, pas anti-attaquant).
Optionnel : n'autoriser la création de profil qu'aux sessions manager une fois qu'au moins un manager existe.
**Fichiers.** `server/src/db/database.js`, `server/src/routes/auth.js`, `client/src/pages/ProfilePicker.jsx`,
`client/src/pages/Settings.jsx` (champ PIN dans UserModal). **Effort M.**

### 2. ✅ Fuseau horaire : la déconnexion "6h du matin" est en réalité 8h (été) — CORRIGÉ
**Problème.** Le conteneur Railway est en UTC. `expiresAtMorning()` (`server/src/routes/auth.js`) fait
`setHours(6)` en heure serveur → expiration à 06:00 UTC = 08:00 heure française l'été. Les dates de
séances utilisent aussi l'heure locale du serveur.
**Solution appliquée.** `process.env.TZ = process.env.TZ || 'Europe/Paris'` tout en haut de
`server/src/index.js`, avant tout `require`. Pas besoin de configurer Railway : c'est un défaut dans
le code, qui reste modifiable via une vraie variable d'env si besoin. Vérifié : une session créée le
9/7/2026 expire bien à `2026-07-10T06:00:00` heure de Paris (`04:00:00Z`).

**Bug lié trouvé et corrigé au passage :** l'onglet Historique (`Settings.jsx`) affichait aussi les
heures avec 2h de retard en été — cause différente (`created_at` stocké en UTC via `datetime('now')`
de SQLite, sans indicateur de fuseau, mal interprété comme heure locale par le navigateur). Fix :
`parseServerDate()` dans `client/src/lib/utils.js`, qui force explicitement l'UTC avant conversion.

### 3. ✅ Session expirée : l'app reste affichée et toutes les actions échouent en silence — CORRIGÉ
**Problème.** Après l'expiration du matin, si l'onglet était resté ouvert, chaque clic provoque une
erreur "Session expirée" mais l'utilisateur reste sur la page (le `catch` avale souvent l'erreur).
**Solution appliquée.** Dans `client/src/lib/api.js`, `req()` détecte tout `401` (hors `/auth/select`
lui-même) : purge `fm_token` et redirige vers `/login`, où l'utilisateur retombe sur le sélecteur de
profils. Ne touche pas `AuthContext.jsx` (son check initial `/auth/me` passe par `fetch` brut, pas par
`req()`, donc aucun risque de boucle de redirection au chargement).

### 4. ✅ Seed des cours : 19 cours sur 27 silencieusement perdus sur une installation neuve — CORRIGÉ
**Problème.** `server/src/db/seed.js` insère des catégories `bike` et `salle`, mais la contrainte
`CHECK(categorie IN ('aqua','fitness'))` de `cours_types` + `INSERT OR IGNORE` fait que ces lignes
sont ignorées sans erreur. La prod n'est pas touchée (ses données existaient avant), mais toute
nouvelle installation n'aura que les 8 cours aqua.
**Solution appliquée.** `bike`/`salle` remplacés par `fitness` dans `seed.js`. Vérifié en local :
« ✅ Seed cours_types — 27 types insérés/ignorés » (contre 8 avant le fix).

### 5. ✅ Le "✕" du sélecteur de pointeur SUPPRIMAIT le pointeur de la base — CORRIGÉ
**Problème.** Dans `SeanceModal.jsx` (`PointeurSelector`), le bouton ✕ à côté du select ressemble à
"désélectionner" mais appelait `api.deletePointeur(id)` → suppression définitive pour tout le monde.
**Solution appliquée.** Le ✕ ne fait plus que vider la sélection (`onChange('')`). Un second bouton 🗑
distinct gère la vraie suppression, avec un `confirm()` explicite nommant le pointeur. Vérifié : après
clic sur ✕, le pointeur reste bien présent en base.

### 6. ✅ Navbar : débordement sur mobile — CORRIGÉ (lot responsive du 10/7/2026)
**Problème.** `Layout.jsx` : marque + 4 onglets + bulle profil sur une seule ligne → débordait sous
~700px, poussant TOUTE la page hors écran (cause racine du décalage horizontal de Coaches/Settings).
**Solution appliquée.** Sous `md:`, les onglets inline + la bulle profil sont masqués (`hidden md:flex`)
au profit d'un bouton burger (`md:hidden`) qui ouvre un panneau déroulant avec les 4 liens + un bouton
"Changer de profil (Prénom)". Au-dessus de `md`, comportement inchangé.

### 7. ✅ Tableaux non scrollables sur mobile — CORRIGÉ (lot responsive du 10/7/2026)
**Problème.** Les grilles (Planning cours, Planning personnel, récap Coaches, tables Settings)
débordaient sans scroll horizontal → cellules tassées et illisibles ("impilotable" sur téléphone).
**Solution appliquée.** Chaque `<table>` large est enveloppée dans `overflow-x-auto` avec un `min-w-[…]`
donnant à chaque colonne une largeur lisible (le tableau scrolle horizontalement au lieu de s'écraser).
La 1re colonne reste en `sticky left-0` pour garder le contexte (jour/employé/coach). Le conflit
sticky-thead ↔ overflow est résolu en passant les en-têtes de `sticky top-14` à `static md:sticky
md:top-14` : pas de sticky vertical sur mobile (où il casserait), conservé sur desktop. Les grilles
KPI de Coaches passent de `grid-cols-3`/`grid-cols-2` à empilées sur mobile.
**Fichiers.** `Layout.jsx`, `Planning.jsx`, `PlanningPersonnel.jsx`, `Coaches.jsx`, `Settings.jsx`.
Vérifié par captures d'écran à 390px (mobile) et 1280px (desktop, aucune régression du sticky).

**Note :** approche volontairement robuste (scroll horizontal + colonnes larges), pas une refonte
mobile par jour/par employé. Si un jour on veut une vue "un jour à la fois" sur téléphone, c'est un
chantier séparé — le scroll horizontal actuel est déjà lisible et sans bug.

---

## P2 — Fonctionnalités à forte valeur métier

### 8. ✅ Dupliquer la semaine précédente (planning personnel) — CORRIGÉ
Le planning du personnel se répète largement d'une semaine à l'autre (c'était visible dans le PDF
source). **Solution appliquée.** Route `POST /api/personnel-creneaux/dupliquer`
`{ semaine_source, semaine_cible }` (`server/src/routes/personnelCreneaux.js`) qui regroupe les
créneaux source par employé + jour puis copie chaque jour en **sautant** ceux déjà renseignés dans
la cible (réutilise `upsertJour` de `personnelWrite.js`). Bouton "⧉ Dupliquer la semaine précédente"
toujours visible dans l'en-tête de `PlanningPersonnel.jsx` (pas seulement semaine vide), avec message
de résultat ("X jour(s) copié(s), Y déjà renseigné(s) conservé(s)"). Vérifié en local : un jour vide
est bien copié, un jour déjà rempli (test avec une valeur "FÉRIÉ" volontairement différente) reste
inchangé après duplication.

### 9. Impression de la semaine avec colonnes signatures
La salle imprimait le planning pour signature (colonnes "Signature du salarié / du responsable" dans
le PDF d'origine). Ajouter un bouton "Imprimer" sur Planning personnel + une feuille `@media print`
qui masque navbar/sidebar/boutons et ajoute deux colonnes vides "Signature salarié" / "Signature
responsable" à droite du tableau (visibles uniquement à l'impression, via classes `hidden print:table-cell`).
Ça remplace le processus papier existant. **Fichiers.** `PlanningPersonnel.jsx`, `client/src/index.css`.
**Effort M.**

### 10. ✅ Sauvegarde de la base en un clic — CORRIGÉ
La DB de prod est un unique fichier SQLite sur un volume Railway, sans sauvegarde. **Solution
appliquée.** `GET /api/admin/backup` (`requireManager`) exécute `PRAGMA wal_checkpoint(TRUNCATE)`
puis `res.download(DB_PATH, 'fitnessmov-YYYY-MM-DD.db')`. Côté client, `api.downloadBackup()` fait un
fetch+blob (le token Bearer ne peut pas passer par un simple `<a href>`) et déclenche le téléchargement.
Bouton "⬇ Télécharger une sauvegarde" dans Paramètres > Utilisateurs. Vérifié en local : fichier `.db`
téléchargé valide (reconnu comme base SQLite), taille et compteur de fichier identiques à la base
source au moment du téléchargement.

### 11. ✅ Récap mensuel des heures du personnel (aide paie) — CORRIGÉ
Équivalent du récap coachs mais pour les employés. **Solution appliquée.**
`GET /api/personnel-creneaux/recap?debut&fin` (`personnelCreneaux.js`) : agrège en JS (les colonnes
`debut`/`fin` sont des heures `HH:MM` sans date, pas exploitables par `strftime` SQL) le total
d'heures `travail` et le nombre de jours `cp` par employé et par mois, sur 12 mois. Manager : tout le
monde ; sinon : soi-même uniquement. Bouton "📊 Récap mensuel" dans `PlanningPersonnel.jsx` (visible
manager uniquement) qui bascule la vue hebdo vers ce tableau (mois en colonnes, employés en lignes,
triés par total décroissant, profils inactifs grisés). Vérifié en local avec des données réelles.

### 12. ✅ Déplacer une séance de cours (champ date manquant) — CORRIGÉ
Le `PATCH /api/seances/:id` acceptait déjà `date`, mais `SeanceModal.jsx` n'avait pas de champ date →
impossible de déplacer une séance sans la supprimer/recréer. **Solution appliquée.**
`<input type="date">` ajouté dans le formulaire, uniquement en mode édition (pas à la création, où
la date vient de la cellule cliquée). Vérifié en local : une séance du jeudi 9 déplacée au samedi 11
disparaît bien de jeudi et apparaît sur samedi après enregistrement.

### 13. ✅ Compteur de CP par année — CORRIGÉ
`GET /api/personnel-creneaux/cp-summary` additionnait tout l'historique — or les CP se comptent par
année. **Solution appliquée.** Paramètre `?annee=2026` (défaut : année en cours) avec
`WHERE strftime('%Y', pc.date) = ?`, sélecteur d'année (‹ / ›, année suivante désactivée si future)
ajouté dans `CpSummary` (`PlanningPersonnel.jsx`). Vérifié en local : les totaux changent bien en
changeant d'année (ex. Selim : 23 CP en 2026, 17 en 2025).

### 14. Férié pour tous en un clic *(idée écartée par l'utilisateur le 9/7 — ne faire que sur demande)*
Version simple si redemandée : au clic sur l'en-tête d'un jour, petit menu "Marquer férié pour tous"
qui upsert `type=ferie` pour chaque profil actif n'ayant rien ce jour-là. **Effort S/M.**

---

## P3 — Confort, polish, dette

### 15. ✅ Toasts d'erreur/succès — CORRIGÉ
**Solution appliquée.** `client/src/context/ToastContext.jsx` maison (pas de lib) : `ToastProvider` au
sommet de `App.jsx`, hook `useToast()` exposant `success/error/info`, affichage bas-droite, auto-dismiss
4s, clic pour fermer, animation `fadeIn` (keyframe dans `index.css`). Branché sur les sauvegardes/
suppressions explicites (séances, créneaux personnel, profils, sauvegarde DB, duplications) — pas sur
les micro-actions type clic de statut/effectif (trop bruyant). Vérifié : toast "✓ Créneau enregistré".

### 16. ✅ Indicateur de notes — CORRIGÉ
**Solution appliquée.** Un 📝 discret apparaît en coin quand `notes` est non vide : sur `SeanceCard.jsx`
(à côté de l'horaire) et sur les cellules de `PlanningPersonnel.jsx` (coin haut-droit), avec
`title={notes}` pour lecture au survol. Vérifié en local.

### 17. ✅ Effectif au-delà de 30 — CORRIGÉ
**Solution appliquée.** `HeadcountPopover.jsx` : sous la grille 1-30, un mini input "Autre…" + bouton OK
(validé aussi par Entrée) accepte n'importe quel nombre. Vérifié : saisir 45 enregistre bien
`nb_presents=45` et passe la séance à « Effectué ».

### 18. ✅ Couleur d'avatar incohérente dans "Mon profil" — CORRIGÉ
`Settings.jsx` (onglet Mon profil) utilisait `#2fa8cc` en dur au lieu de `colorForUser(me.id)`
(importable depuis `client/src/lib/utils.js`) — la bulle n'avait pas la même couleur que dans le
header et l'écran d'accueil. Corrigé et vérifié par capture d'écran (les deux bulles sont identiques).

### 19. ✅ Historique plus lisible — CORRIGÉ
**Solution appliquée.** `Settings.jsx` : `ACTION_LABELS` mappe les codes vers des libellés français
("Connexion au profil", "Séance modifiée", …) et `prettyDetails()` traduit les valeurs brutes du champ
détails (`effectue`→Effectué, `nb_presents`→présents, etc.). Pagination : route `/audit` passe à
`?limit&offset` (`server/src/routes/appUsers.js`), le client charge 50 lignes puis un bouton
"Charger plus" appen­d les suivantes. Vérifié en local. **Non fait** (jugé superflu) : filtre par type
d'action — à ajouter seulement si l'historique devient volumineux et pénible à parcourir.

### 20. ✅ PWA installable — CORRIGÉ
**Solution appliquée.** `client/public/manifest.json` (name "Planning Fitnessmov", `display: standalone`,
`theme_color: #0369a1`, icônes `/logo.png`) + `<link rel="manifest">`, `theme-color`, balises
apple-touch/mobile-web-app dans `client/index.html`, et `<html lang="fr">`. L'app peut s'installer sur
l'écran d'accueil. Pas de service worker (pas d'offline pour l'instant, non nécessaire).

### 21. ✅ Accessibilité des boutons icônes — CORRIGÉ (partiel)
**Solution appliquée.** `aria-label` ajoutés sur : burger + bulle profil (`Layout.jsx`), ← / → de
navigation semaine (`Planning.jsx`, `PlanningPersonnel.jsx`), icône effectif + input Autre
(`HeadcountPopover.jsx`), × suppression séance (`SeanceCard.jsx`), 📝 indicateurs de note.
**Reste à faire si besoin** : piège de focus dans les modales (non bloquant, `autoFocus` déjà en place
sur les premiers champs).

### 22. ✅ Nettoyage de code mort — CORRIGÉ (partiel)
- ✅ `client/src/components/NouvelleSeanceModal.jsx` supprimé (jamais importé).
- ✅ Static `/uploads` retiré de `server/src/index.js` (dossier inexistant, aucune UI ne s'en sert).
- **Laissé volontairement** : dépendance `multer` + table `coach_documents` + tables `planning_recurrent`
  / `modifications_ponctuelles` — inertes, les retirer demanderait une migration DB pour peu de gain ;
  à faire seulement si on nettoie le schéma pour de nouvelles installations.
- Route `POST /api/admin/seed-personnel` : conservée (réutilisable), n'a plus de bouton — documenté ici.

### 23. Build de prod automatisé (optionnel)
Aujourd'hui le build client est commité dans `server/public/` (source d'oublis : la prod a déjà cassé
une fois pour ça). Alternative : configurer la commande de build Railway pour builder le client à
chaque déploiement (`npm ci && npm run build --workspace=client && node scripts/copy-dist.js`, script
de copie cross-platform à créer) et retirer `server/public` du repo (`.gitignore`). À ne faire que si
l'utilisateur est à l'aise avec la config Railway. **Effort M.**

### 24. ✅ Sélecteur de cours avec recherche + ajout inline — CORRIGÉ
Le `<select>` de cours dans `SeanceModal.jsx` est remplacé par `CoursCombobox.jsx` : recherche
insensible aux accents/casse, résultats groupés par catégorie (Aqua/Fitness), et un bouton
« + Ajouter « {recherche} » en Aqua/Fitness » quand aucun cours ne correspond exactement — crée le
cours via `POST /api/cours-types` et le sélectionne immédiatement, sans recharger la page.

### 25. ✅ Import des données Ballancourt-sur-Essonne — CORRIGÉ
Import complet demandé explicitement par l'utilisateur (catalogue + historique complet) à partir de
`Planning_des_cours.xlsx` et `Planning_personnel_ballancourt.xlsx` :
- **Catalogue** : 12 cours propres à Ballancourt ajoutés à `coursCatalog.js` (Aquacircuit, 100% Attack,
  Body Sculpt, Fit Dance, Gym douce, MMA Conf, MMA Deb, Sprint 30, Stretching, Yoga, Initiation
  musculation, Workout) après comparaison insensible aux accents/casse/espaces avec le catalogue
  existant (ex. « body barre » → rattaché à l'existant « Bodybarre », pas dupliqué).
- **Coachs** : 23 coachs canonicalisés (fusion des variantes de casse/faute de frappe, ex.
  « wiliam »/« amine »/« imene » → William/Amine/Imane).
- **Séances** : 2412 séances historiques (`server/src/db/ballancourtSeances.js`), statut brut de la
  feuille mappé vers programme/effectué/annulé avec conservation du motif en note (Férié, Coach absent,
  Pas assez d'adhérents, etc). Pointeur non renseigné (colonne source ambiguë, ne contenait pas
  fiablement un nom de personne).
- **Planning personnel** : 1204 jours (9 employés) importés dans `personnel_creneaux`.
- Import réalisé via `server/src/db/seedBallancourt.js`, déclenché par un bouton manager discret dans
  Paramètres (visible uniquement quand `SALLE_NOM=Ballancourt-sur-Essonne`), idempotent (ne recrée
  jamais une séance ou un jour déjà présent).

### 26. ✅ Filet de sécurité : plus aucun manager actif sur une salle — CORRIGÉ
Sur Ballancourt, l'unique compte manager a été supprimé définitivement (fonctionnalité #39 : la ligne
reste en DB mais `actif=0`), ce qui empêchait quiconque de promouvoir un autre profil manager (toutes
les routes de gestion des rôles sont elles-mêmes réservées aux managers — deadlock). Ajout de
`server/src/db/recoverManager.js`, exécuté une fois au démarrage du serveur : si une salle donnée n'a
plus aucun manager actif, promeut automatiquement un profil de secours nommé en dur (Sofiann pour
Ballancourt). Ne fait rien tant qu'un manager actif existe déjà (sans risque de laisser tourner
indéfiniment), et ne s'applique qu'à la salle ciblée via `SALLE_NOM`.

### 27. ✅ Fix responsive des cartes de séance — CORRIGÉ
Sur mobile, le badge de statut (« EFFECTUÉ ») et le badge d'effectif se chevauchaient sur les cartes
étroites de la vue Grille. Ajout d'un `shortLabel` par statut (Programmé→Prog., Effectué→Eff.) utilisé
uniquement dans `SeanceCard.jsx` (le libellé complet reste dans `SeanceModal`), et `flex-shrink-0` sur
les deux badges pour empêcher tout débordement.

### 28. ✅ Filtre par catégorie (Aqua/Fitness) — CORRIGÉ
Le menu « Filtrer par… » du Planning des cours groupe maintenant les cours par catégorie avec une case
« Aqua »/« Fitness » qui coche ou décoche en un clic tous les cours de la catégorie, en plus des cases
individuelles déjà présentes.

### 29. ✅ Onglet Annuaire — AJOUTÉ
Nouvel onglet listant coachs (avec tags Aqua/Fitness, un coach pouvant avoir les deux), prestataires,
employés et responsables, avec recherche (nom/téléphone/notes), filtre par catégorie, clic-pour-appeler
(`tel:`) et CRUD complet (`server/src/routes/annuaire.js`, table `annuaire_contacts`). Ballancourt
démarre avec un annuaire vide (à remplir par le gérant) ; Corbeil est pré-rempli au démarrage depuis
`server/src/db/annuaireCorbeil.js` si la table est vide — **fichier de données volontairement laissé
vide dans ce commit**, la transcription des contacts réels (numéros de téléphone personnels) sera
ajoutée séparément après confirmation explicite de l'utilisateur (données sensibles).

### 30. ✅ Fix import Ballancourt : les cours aqua manquaient — CORRIGÉ
Le fichier `Planning_des_cours.xlsx` place les séances fitness et aqua dans deux tableaux côte à côte
par mois, mais la colonne de départ du second tableau (aqua) varie d'un mois à l'autre (10, 11, 13 ou
14 selon la feuille), et un mois (avril) a même un schéma de colonnes différent (sans colonne Durée) pour
son second bloc. L'ancien parseur supposait une position de colonne fixe et ne capturait qu'une fraction
des séances aqua (194 sur ~1195 réelles). Nouveau parseur (détection des blocs par scan du catalogue de
cours plutôt que par position de colonne, avec détection automatique par bloc de la présence ou non
d'une colonne Durée) : `server/src/db/ballancourtSeances.js` passe de 2412 à 3406 séances. Le script
d'import restant idempotent (déduplication par date+horaire+cours_type_id), relancer le bouton
"Importer l'historique Ballancourt" depuis Paramètres ajoute uniquement les ~990 séances manquantes sans
toucher à ce qui est déjà en base.

### 31. ✅ Annuaire : coachs dédupliqués avec Coaches + fix layout — CORRIGÉ
Les coachs de l'Annuaire étaient une copie de la même donnée que la table `coaches` (deux endroits à
maintenir en parallèle). Ajout de `aqua`/`fitness` sur `coaches` (réutilise le `telephone` déjà existant) ;
`GET /api/annuaire` fusionne maintenant les coachs (lecture seule, lien « Gérer dans Coaches → ») avec les
autres contacts (`annuaire_contacts`, toujours éditables ici). `CoachModal` (Coaches.jsx) gagne les cases
Aqua/Fitness. Backfill one-shot (`backfillCoachTags.js`) qui complète les coachs Corbeil déjà en base avec
téléphone + disciplines transcrits de la fiche papier, sans jamais écraser une modification manuelle
(s'arrête dès qu'un coach a déjà une discipline ou un téléphone). Layout : lignes contraintes en largeur
(`max-w-2xl`) pour rapprocher nom et téléphone sur desktop, fond alterné (zebra) comme les autres tableaux.

### 32. ✅ Icônes lucide-react — CORRIGÉ
La molette (Paramètres), le burger/croix (menu mobile) et tous les boutons « + » (nouveau contact,
nouveau coach, ajouter un employé/une séance/un créneau/un cours, tâche) étaient des glyphes texte ou des
SVG faits main — remplacés par des icônes `lucide-react` (`Settings`, `Menu`/`X`, `Plus`) dans
`Layout.jsx`, `Annuaire.jsx`, `Coaches.jsx`, `Settings.jsx`, `PlanningPersonnel.jsx`, `Planning.jsx`,
`TaskWidget.jsx`, `CoursCombobox.jsx`, `PersonnelCreneauModal.jsx`.

### 33. ✅ Coach : nom optionnel, édition rapide depuis l'Annuaire, 3 nouvelles disciplines — CORRIGÉ
- `nom` n'est plus obligatoire pour un coach (seul `prenom` l'est), côté API et formulaire.
- Nouvelle route `PATCH /api/coaches/:id` (téléphone + disciplines uniquement, sans repasser par le nom
  complet) : cliquer sur un coach dans l'Annuaire ouvre une fiche allégée (téléphone + disciplines) au
  lieu de rediriger vers Coaches — le lien « Gérer dans Coaches » reste disponible pour le nom/email.
- 3 nouvelles disciplines : Boxe, Crosstraining, Pole Dance (colonnes `coaches.boxe/crosstraining/poledance`),
  affichées dans `CoachModal` et l'Annuaire à côté d'Aqua/Fitness.
- Correction ponctuelle : les 4 coachs Corbeil tagués « Pole » sur la fiche papier (Jen, Clarisse, Sarah,
  Bénédicte) avaient été transcrits par erreur en Fitness (avant l'existence du tag Pole Dance) — corrigés
  automatiquement au démarrage (Pole Dance au lieu de Fitness).

### 34. ✅ Type "Absent" réintroduit dans le planning personnel — CORRIGÉ
Le type `absent` avait été fusionné dans `repos` plus tôt dans le projet (simplification demandée à
l'époque) ; redemandé séparé, en rouge, pour bien le distinguer visuellement des autres absences. CHECK
constraint `personnel_creneaux.type` élargi (`travail, cp, ecole, ferie, arret, repos, absent`), nouvelle
option dans `PersonnelCreneauModal` et couleur dédiée (rouge plein) dans `PlanningPersonnel.jsx`.

### 35. ✅ Code confidentiel par profil — AJOUTÉ
`app_users.code_hash` (PBKDF2, `server/src/lib/codeHash.js`, sans dépendance externe), facultatif par
profil. `GET /api/auth/profiles` expose `hasCode` (jamais le hash). Cliquer sur un profil sur l'écran
d'accueil :
- **A un code** → `CodeEntryModal` (code requis pour `POST /api/auth/select`, erreur si incorrect,
  lien « Code oublié ? » → `POST /api/auth/forget-code` (reset sans vérification — volontairement peu
  sécurisé pour l'instant, effet dissuasif en attendant un lien avec l'email) → bascule sur la création
  d'un nouveau code, obligatoire cette fois).
- **Pas de code** → `CreateCodeModal` proposant d'en créer un (`POST /api/auth/set-code`, refuse si un
  code existe déjà — il faut passer par « oublié » pour le changer), avec un bouton « Plus tard » pour
  continuer sans.

### 36. ✅ Changer de salle (Corbeil/Ballancourt) — AJOUTÉ
Multi-salle non commercialisé : liste en dur des deux URLs Railway connues (`client/src/lib/salles.js`).
Nouveau composant `SalleSwitcher.jsx`, discret en haut à droite de l'écran d'accueil (visible de tous,
avant connexion) et dans le header de l'appli (visible seulement pour un profil manager, à côté de la
molette) — clique pour sauter directement sur l'autre salle.

### 37. ✅ Fix URLs des salles + switcher retiré de la navbar — CORRIGÉ
- URLs corrigées dans `salles.js` : `fitnessmov-corbeil.up.railway.app` / `fitnessmov-ballancourt.up.railway.app`
  (les URLs devinées à l'étape précédente étaient fausses).
- `SalleSwitcher` retiré du header et du menu mobile de l'appli (`Layout.jsx`) : il n'apparaît plus que
  sur l'écran de sélection des profils, jamais dans la navbar une fois connecté.

### 38. ✅ Cumul de congés payés — AJOUTÉ
Nouveau champ `app_users.date_debut_contrat` (modifiable par un manager, champ date dans Paramètres >
Utilisateurs). À partir de cette date, 2,5 jours de CP sont acquis par mois plein écoulé
(`moisEcoules`/`soldeCp`, désormais dans `server/src/lib/cp.js`, partagé entre les routes). Revu et
complété au lot #39 ci-dessous (ajustement manuel + refonte du widget).

### 39. ✅ Ajustement manuel des CP, refonte du widget, filtre de cours par semaine, fin de la création de profil à la volée — CORRIGÉ/AJOUTÉ
- **Ajustement manuel du cumul de CP.** Le calcul automatique seul ne suffit pas (reprise d'ancienneté,
  régularisations…). Nouveau champ `app_users.cp_ajuste` (manager) : dans la fiche d'un utilisateur
  (Paramètres > Utilisateurs > Modifier, manager uniquement), un bloc « Congés » affiche le total
  (`calculé à date + ajusté`) avec des boutons −/+ qui modifient l'ajustement d'une unité (nouvelles
  routes `GET/PATCH /api/app-users/:id/cp`), ainsi que le détail : calculé à date, ajouté, pris, restant.
  Invisible ailleurs (pas sur « Mon profil », pas pour un non-manager).
- **Widget CP du planning personnel refondu en tableau** (Nom / CP pris ce mois / CP pris cette année /
  CP restants) au lieu de la liste avec sélecteur d'année — toujours basé sur le mois/l'année réels.
  Aside élargi (`w-48` → `w-64`) pour laisser respirer le tableau.
- **Filtre "Filtrer par…" du planning des cours** ne propose plus que les cours ayant réellement lieu la
  semaine affichée (au lieu de tout le catalogue, illisible) ; se met à jour à chaque changement de
  semaine, et un filtre actif sur un cours absent de la nouvelle semaine est automatiquement retiré
  (sinon la liste semblait vide sans explication).
- **Fin de la création de profil à la volée.** `POST /api/auth/profiles` (public) ne fonctionne plus que
  pour amorcer le tout premier compte d'une salle neuve (0 profil) ; au-delà, la route répond 403. Bulle
  « Ajouter » retirée de l'écran d'accueil (remplacée par un formulaire de démarrage uniquement quand la
  salle n'a encore aucun profil) et bouton « + employé » retiré du planning personnel — toute création
  passe désormais par Paramètres > Utilisateurs (manager).

### 40. ✅ CP : seuls les congés pris depuis la date de contrat comptent, widget masqué sans date — CORRIGÉ
Les congés posés **avant** la date de début de contrat étaient comptés dans « pris », faussant le solde
(ex. un profil avec beaucoup de CP historiques important d'un ancien suivi papier). `prisDepuisContrat()`
(`server/src/lib/cp.js`) ne compte désormais que les CP à partir de la date de contrat (sans date : compte
tout, comme avant — utilisé uniquement dans la fiche manager). Le widget CP du planning personnel
n'affiche plus que les profils **ayant une date de contrat renseignée** (un profil sans date = CDD/extra,
pas de suivi de cumul).

### 41. ✅ Icônes lucide-react (suite), logo dans la navbar, coach multi-catégories — CORRIGÉ/AJOUTÉ
- 3 emoji restants remplacés par des icônes `lucide-react` : « Télécharger une sauvegarde » (`Download`),
  indicateur de note sur un créneau (`StickyNote`, Planning personnel + cartes de séance), « Récap
  mensuel » (`BarChart3`).
- **Logo dans la navbar.** Le texte « Fitnessmov' Planning » du header est remplacé par le logo
  Fitnessmov Aqua (`Layout.jsx`), comme sur l'écran de sélection des profils.
- **Annuaire : un coach peut apparaître dans plusieurs catégories** (ex. aussi employé). Nouveau champ
  `coaches.categories_extra` (CSV), éditable via des cases à cocher « Aussi… » dans la fiche rapide coach
  de l'Annuaire (`PATCH /api/coaches/:id`). Le coach apparaît alors dans la section Coachs **et** dans
  chaque catégorie supplémentaire cochée, avec un petit badge « Coach » pour le repérer hors de sa section
  d'origine.

### 42. ✅ Vue Gantt journalière du planning personnel — AJOUTÉ
Le tableau hebdomadaire (une ligne par employé) n'aidait pas à voir d'un coup d'œil qui est présent à un
instant donné. Nouvelle vue (`PersonnelTimeline`), toujours affichée sous le tableau : une ligne par jour,
un axe horaire fixe (7h30–22h), une barre colorée par créneau de travail (couleur + initiales de
l'employé, comme partout ailleurs dans l'appli) positionnée selon l'heure réelle — les coupures (2
créneaux le même jour) donnent 2 barres sur la même ligne. Travail uniquement (pas les absences), les
jours sans personne affichent juste le nom du jour sans occuper d'espace inutile. Cliquer une barre ouvre
la même fiche d'édition que le tableau au-dessus (comportement identique, juste une autre porte d'entrée).

### 43. ✅ Vue Gantt : lisibilité, séparation des jours, plus de scroll horizontal — CORRIGÉ
- Les initiales restent dans le rectangle coloré mais calées à gauche (au lieu de centrées) ; l'heure de
  début s'affiche à gauche de la barre et l'heure de fin à droite, à l'extérieur (avant : rien n'indiquait
  clairement quand une barre commençait/finissait). `border-radius` réduit (barres rectangulaires plutôt
  que pilules) pour mieux voir les bords de début/fin.
- Séparation des jours renforcée : bordures plus épaisses et plus foncées entre chaque jour, fond en
  alternance (zebra), le jour courant garde son fond bleu distinct.
- **Fix scroll horizontal.** La page débordait horizontalement à cause du tableau hebdomadaire
  (`min-w-[800px]` combiné à `md:overflow-visible`, qui désactivait son propre scroll interne à partir de
  768px) — corrigé en gardant `overflow-x-auto` en permanence sur le tableau (scroll interne borné plutôt
  que toute la page qui déborde). Au passage, la navbar débordait aussi pile à 768px (le logo est plus
  large que l'ancien texte) : le seuil d'affichage du menu desktop passe de `md` (768px) à `lg` (1024px)
  pour laisser assez de place. Vérifié sans scroll horizontal de 390px à 1300px de large.

### 44. ✅ Accès en écriture restreint (manager ou IP autorisée) + annuaire masqué — AJOUTÉ
Jusqu'ici, n'importe quel profil connecté (même non-manager) pouvait tout modifier depuis n'importe où.
Nouvelle règle : un manager peut toujours tout modifier ; un compte utilisateur simple ne peut modifier
(et voir l'annuaire) que depuis une IP de la liste blanche (typiquement le Wi-Fi de la salle) — ailleurs,
lecture seule et annuaire masqué.
- Nouvelle table `ip_autorisees` + routes `GET/POST/DELETE /api/ip-autorisees` (manager), avec l'IP de
  l'appelant affichée pour faciliter l'ajout depuis la salle.
- `app.set('trust proxy', true)` (Railway est derrière un reverse proxy, sans ça `req.ip` renvoie
  toujours l'IP interne du proxy et la liste blanche ne servirait à rien).
- Middleware `requireWriteAccess` (laisse passer les lectures, bloque les écritures des non-privilégiés)
  appliqué à coaches/cours-types/séances/pointeurs/planning personnel/tâches ; `requireAnnuaireAccess`
  (bloque aussi la lecture) sur l'annuaire ; même règle sur l'auto-édition de son propre profil.
- `GET /api/auth/me` expose `privileged` : la navbar masque le lien Annuaire et affiche un bandeau
  "Lecture seule" quand il est à `false`. Nouvel onglet Paramètres > Accès (manager) pour gérer la liste.
- Testé de bout en bout : écriture/annuaire refusés à un compte simple sans IP whitelistée, acceptés une
  fois l'IP ajoutée par un manager, toujours acceptés pour un manager quelle que soit l'IP.

**Limite connue à garder en tête** : la plupart des connexions internet (domicile, mobile) ont une IP
dynamique qui change avec le temps — la liste blanche devra être mise à jour si l'IP de la salle change.

### 45. ✅ Coaches : filtres période/catégorie sur le tableau de bord, 13 mois, heures payées — AJOUTÉ/CORRIGÉ
- **Filtre période** sur le Tableau de bord : « De tout temps » (aucun filtre de date), « Année scolaire »
  (sélecteur d'année), ou « Date libre » (Année seule → toute l'année depuis le 1er janvier ; + Mois →
  ce mois ; + Jour → ce jour précis). `GET /api/dashboard` accepte `periode=tout` ou `debut`/`fin`.
- **Filtre catégorie** : cliquer sur « Prog. » / « Effect. » / « Annulés » (colonnes de la Fréquentation
  mensuelle, ou les cartes KPI équivalentes) recalcule Top Cours et Top Coachs sur cette seule catégorie
  (ex. « Annulés » donne le top des cours/coachs les plus annulés, utile pour repérer les soucis récurrents)
  — un clic supplémentaire sur la même catégorie l'enlève. `GET /api/dashboard?statut=programme|effectue|annule`.
- **Récapitulatif des heures** passé de 12 à 13 derniers mois (colonne Coach resserrée pour faire de la
  place à la colonne supplémentaire).
- **Heures payées comptées comme réalisées** : un cours au statut « Payé » a bien eu lieu, au même titre
  qu'« Effectué ». Deux cases à cocher (Effectuées/Payées, les deux cochées par défaut) contrôlent quels
  statuts comptent dans le récapitulatif des heures par coach (`GET /api/coaches/recap?effectue=&paye=`).

### 46. ✅ Coaches : fluidité des filtres, plage de dates libre, redesign du sélecteur de période — CORRIGÉ/AJOUTÉ
- **Fluidité** : remplacement du booléen `loading` bloquant par un `refreshing` qui atténue (opacity)
  le contenu déjà affiché sans le démonter, plus un état `recap`/`dashboard` initialisé à `null` qui
  ne déclenche l'écran « Chargement… » qu'au tout premier chargement. Un compteur `reqIdRef` (`useRef`)
  ignore les réponses de requêtes devenues obsolètes si l'utilisateur change plusieurs filtres vite.
  Touche n'importe quel filtre (période, catégorie, cases Effectuées/Payées) ne provoque plus de reflash
  de toute la page — juste un léger fondu.
- **Plage de dates libre** : l'ancien mode « Date libre » (3 `<select>` Année/Mois/Jour en cascade)
  est remplacé par un mode « Plage personnalisée » avec deux `<input type="date">` (`plageDebut`/
  `plageFin`), permettant nativement une plage à cheval sur deux années (ex. octobre 2025 → janvier 2026).
- **Redesign du sélecteur de période** : le `<select>` de mode est remplacé par un contrôle segmenté
  (icônes lucide `Calendar`/`CalendarRange`/`Infinity`) — Année scolaire / Plage personnalisée / De
  tout temps. Le titre du tableau de bord affiche la plage choisie en toutes lettres (ex.
  « 1 oct. 2025 → 31 janv. 2026 »).
- **Filtre catégorie** : confirmé comme volontairement limité à une mise en valeur visuelle (soulignement
  d'en-tête + anneau sur la carte KPI + puce de filtre) plutôt qu'un recalcul des KPI/Fréquentation
  mensuelle — ces deux blocs affichent par construction déjà le détail des 3 catégories ; seuls Top
  Cours et Top Coachs se recalculent réellement sur la catégorie sélectionnée (déjà en place, inchangé).
**Fichiers.** `client/src/pages/Coaches.jsx`.

### 47. ✅ Fusion de coachs homonymes/mal orthographiés + fiche KPI par coach + retrait du filtre catégorie
- **Fusion de coachs** : "Phillipe"/"Philipe" → "Philippe", "Enrique" → "Enric", "Nasser" → "Nacer",
  "Myriam Aqua"/"Myriam (Aqua)" → une seule entrée — confirmé par le manager. Migration
  `server/src/db/mergeCoachAliases.js` (comparaison sur la paire exacte prénom+nom, jamais sur le
  prénom seul : deux personnes réelles distinctes peuvent partager un prénom, ex. les deux
  "Myriam" — voir `coachTagsCorbeil.js` — distinguées par leur nom "(Contrat)" vs "Aqua"/"(Aqua)").
  Réattribue séances/documents/planning récurrent vers le coach le plus complet puis supprime les
  doublons. Roulée automatiquement au démarrage (Corbeil uniquement), idempotente.
- **Bug découvert et corrigé au passage** : l'import de l'historique (`seedCorbeil.js`) associe un
  coach par prénom seul, ambigu si deux coachs réels partagent ce prénom — les séances aqua de
  "Myriam" ont pu atterrir sur la mauvaise homonyme ("Myriam (Contrat)" au lieu de "Myriam Aqua").
  `reassignAquaSeancesToCoach()` (même fichier) réattribue toute séance de catégorie aqua mal
  attribuée vers la bonne "Myriam", idempotent.
- **Fiche KPI par coach** : cliquer sur un coach (Coaches.jsx) ouvre désormais une fiche stats
  (au lieu du formulaire d'édition) : Cours donnés / Heures de cours / Effectif moyen, sur 3
  colonnes (30 derniers jours / Depuis septembre / De tout temps). Un bouton "Modifier les
  informations" bascule vers le formulaire d'édition existant. `GET /api/coaches/:id/stats`
  (`server/src/routes/coaches.js`) ne compte que les séances effectivement données (effectué/payé).
- **Retrait du filtre catégorie** (Prog./Effect./Annulés cliquables sur le Tableau de bord) : la
  mise en valeur visuelle + le recalcul de Top Cours/Top Coachs ont été retirés à la demande de
  l'utilisateur ("c'est pas exactement ce que je voulais, on reprendra ça plus tard") — le backend
  (`GET /api/dashboard?statut=...`) reste en place, inutilisé, prêt à être réexploité plus tard.
**Fichiers.** `server/src/db/mergeCoachAliases.js`, `server/src/db/coachAliasesCorbeil.js`,
`server/src/index.js`, `server/src/routes/coaches.js`, `client/src/lib/api.js`,
`client/src/pages/Coaches.jsx`.

### 48. ✅ Nouvel onglet Formation (blog interne, markdown, captures d'écran)
- Nouvel onglet "Formation" dans la navbar : liste d'articles type blog (table
  `formation_articles` — titre, contenu markdown, ordre, auteur). Lecture ouverte à
  tout utilisateur authentifié, écriture (créer/modifier/supprimer/réordonner)
  réservée aux managers (`requireManager`, pas `requireWriteAccess` — volontairement
  plus strict qu'une simple IP autorisée : seul le rôle manager édite).
- Éditeur markdown restreint (`client/src/components/MarkdownEditor.jsx`) :
  boutons Gras/Italique (entourent la sélection), Titre (préfixe `## `),
  Séparateur (insère `---`), et upload d'image (bouton fichier → `POST
  /api/formation/upload-image` → insère `![](url)`). Bascule Éditer/Aperçu.
- Rendu : `marked` (parsing markdown) + `DOMPurify` (assainissement — vérifié en
  local qu'un `<script>`/`onerror` injecté dans le contenu est bien neutralisé,
  défense en profondeur même si le contenu est censé venir d'un manager de
  confiance). Styles dédiés `.formation-content` dans `index.css` (pas de plugin
  Tailwind Typography installé).
- Images stockées sur le volume persistant (`<dossier de la DB>/uploads/formation/`,
  jamais dans `server/public` qui est écrasé à chaque déploiement du client),
  servies via `app.use('/uploads', express.static(...))`.
**Fichiers.** `server/src/db/database.js` (table), `server/src/routes/formation.js`,
`server/src/index.js`, `client/src/lib/api.js`, `client/src/lib/markdown.js`,
`client/src/components/MarkdownEditor.jsx`, `client/src/pages/Formation.jsx`,
`client/src/pages/FormationArticle.jsx`, `client/src/App.jsx`,
`client/src/components/Layout.jsx`, `client/src/index.css`.

### 49. ✅ Détail des séances au clic sur un nombre d'heures (Récapitulatif Coaches)
- Dans le tableau "Récapitulatif des heures effectuées" (Coaches), chaque cellule
  d'heures non vide (mois, ou colonne Total par coach) est cliquable et ouvre une
  fenêtre listant les cours du coach sur la période correspondante : groupés par
  jour (date en toutes lettres), avec pastille de couleur aqua/fitness, horaire,
  durée, effectif ("X pers.") et badge de statut (Effectué/Payé) — mêmes filtres
  Effectuées/Payées que le tableau, donc toujours cohérent avec le total affiché.
  `GET /api/coaches/:id/seances-detail?debut=&fin=&effectue=&paye=`.
**Fichiers.** `server/src/routes/coaches.js`, `client/src/lib/api.js`,
`client/src/pages/Coaches.jsx`.

---

## Idées écartées (ne pas implémenter sans demande explicite)
- Drag & drop des séances entre jours (gros chantier, faible demande).
- Vue mensuelle du planning personnel (le rythme de saisie est hebdomadaire).
- Multi-salles / multi-tenant (hors périmètre : outil interne).
- Champ "Code couleur" Ouverture/Milieu/Fermeture : implémenté puis retiré à la demande de
  l'utilisateur le 9/7/2026 — ne pas le réintroduire.
