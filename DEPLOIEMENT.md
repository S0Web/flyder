# Déploiement multi-salles (Railway)

Ce document explique comment faire tourner **plusieurs salles** (Corbeil, Ballancourt, …)
à partir du **même dépôt GitHub**, avec pour chacune une **base de données isolée**, tout
en partageant automatiquement les mises à jour du code.

## Principe

> **1 dépôt GitHub → N services Railway.**

- Chaque salle = **un service Railway** qui déploie depuis la **même branche `main`**.
- Chaque service a son **propre Volume** (donc son propre fichier SQLite = données séparées),
  ciblé par la variable `DB_PATH`.
- Chaque service a sa propre variable `SALLE_NOM` (affichée dans l'app pour savoir sur quelle
  salle on travaille).

Comme les deux services déploient depuis `main`, **un `git push origin main` redéploie
automatiquement toutes les salles** : c'est ça qui partage tes mises à jour. Aucune action
supplémentaire.

Il n'y a **pas de code « multi-tenant »** (une seule base avec un `salle_id` partout, une
sécurité par salle, etc.) : l'isolation est **physique** (un fichier de base par salle). C'est
volontaire — le vrai multi-tenant sera le chantier de la commercialisation, avec sa propre
couche de sécurité.

---

## Créer une nouvelle salle (ex. Ballancourt)

1. **Nouveau service** dans Railway → *Deploy from GitHub repo* → `S0Web/fitnessmov-planning`,
   branche **`main`** (le même repo que Corbeil).
2. **Recopie les réglages de build/start du service Corbeil** (Root Directory, Build Command,
   Start Command). Ils doivent être identiques — seules les variables ci-dessous changent.
3. **Ajoute un Volume** au service, monté par ex. sur `/data`.
4. **Variables d'environnement** du service :

   | Variable    | Valeur (Ballancourt)          | Rôle                                             |
   |-------------|-------------------------------|--------------------------------------------------|
   | `DB_PATH`      | `/data/fitnessmov.db`         | Base **isolée**, stockée sur le Volume            |
   | `SALLE_NOM`    | `Ballancourt-sur-Essonne`     | Nom affiché (en-tête, écran d'accueil, onglet)    |
   | `SALLE_ADRESSE`| `12 rue Exemple, 91xxx …` *(optionnel)* | Adresse affichée sur les exports PDF du récapitulatif d'heures |
   | `TZ`           | `Europe/Paris` *(optionnel)*  | Déjà la valeur par défaut dans le code            |

5. **Déploie.** Au premier démarrage :
   - la base vierge se crée toute seule (tables + migrations) ;
   - le **catalogue de cours se pré-remplit automatiquement** (45 cours aqua/fitness) — les
     coachs, eux, restent vides (ils diffèrent d'une salle à l'autre).
6. Ouvre l'URL Railway du service → écran **« Bienvenue chez … BALLANCOURT-SUR-ESSONNE »**.
   - Crée le **1er profil** : il devient automatiquement **manager**.
   - Ajoute les autres profils, les **coachs** (onglet Coaches), et remplis le planning.

---

## Mettre à jour le service Corbeil existant

Pour que Corbeil affiche aussi son nom, ajoute-lui simplement :

| Variable    | Valeur              |
|-------------|---------------------|
| `SALLE_NOM` | `Corbeil-Essonnes`  |

⚠️ **Ne touche pas au `DB_PATH` de Corbeil** : il pointe déjà vers son Volume (c'est pour ça que
ses données persistent). Le changer le ferait pointer vers une base vide.

Si `SALLE_NOM` n'est pas défini sur un service, l'app fonctionne exactement comme avant (aucun nom
de salle affiché) — la variable est purement cosmétique/organisationnelle.

---

## Au quotidien

- **Mise à jour partagée (le cas normal)** : tu pousses sur `main` (via les patchs habituels), et
  Railway redéploie **toutes** les salles. Rien d'autre à faire.
- **Réglage propre à une salle** : passe par ses **variables d'environnement** (nom aujourd'hui ;
  demain, on pourra ajouter des « flags » de fonctionnalités sur le même modèle).
- **Code vraiment différent pour une seule salle** : possible en faisant déployer ce service depuis
  une **autre branche** que `main` — mais à éviter tant que possible, car ça casse le partage
  automatique des mises à jour. À réserver à des cas exceptionnels.

---

## Sauvegardes

Chaque salle a son propre fichier de base. Depuis l'app (manager) : **Paramètres →
« Télécharger une sauvegarde »** récupère une copie complète du `.db` de **cette** salle,
à faire manuellement de temps en temps.

En plus de ça, une **sauvegarde automatique quotidienne, chiffrée**, tourne côté serveur
(`server/src/lib/backup.js`, même chose sur `admin-server`) — elle checkpointe la base,
la chiffre (AES-256-GCM) et l'envoie sur un bucket Cloudflare R2, hors de Railway (pour
survivre à un problème *sur* Railway). 30 jours d'historique conservés, purge automatique
au-delà.

Variables d'environnement à ajouter sur **chaque service** (les salles et `admin-server`)
pour l'activer — sans elles, la sauvegarde auto est simplement ignorée (aucune erreur) :

| Variable                  | Rôle                                                             |
|----------------------------|-------------------------------------------------------------------|
| `R2_ACCOUNT_ID`             | Identifiant de compte Cloudflare                                  |
| `R2_ACCESS_KEY_ID`          | Clé d'API R2 (permissions lecture/écriture sur le bucket)         |
| `R2_SECRET_ACCESS_KEY`      | Secret associé                                                    |
| `R2_BUCKET`                 | Nom du bucket R2                                                  |
| `BACKUP_ENCRYPTION_KEY`     | Clé de chiffrement — **la même valeur partout**, à ne jamais perdre |

Pour restaurer une sauvegarde : télécharger le fichier `.db.enc` correspondant depuis le
bucket R2, puis `BACKUP_ENCRYPTION_KEY=... node src/db/restoreBackup.js <fichier.db.enc> <sortie.db>`
depuis `server/` ou `admin-server/` selon le cas — le fichier obtenu remplace directement
le fichier `DB_PATH` sur le volume Railway (service arrêté pendant le remplacement).

---

## Pour plus tard (commercialisation)

Quand il faudra vendre l'outil à des salles **tierces** (gérants différents), il faudra :
- une vraie authentification par salle (mots de passe / PIN, cloisonnement des accès) ;
- éventuellement basculer vers un vrai multi-tenant (une base + `salle_id`) si le nombre de salles
  explose et que N services Railway devient lourd à gérer ;
- un logo/branding configurable par salle (aujourd'hui le logo « Fitnessmov Aqua » est fixe).

Ces points sont **hors périmètre** du fonctionnement actuel à deux salles.
