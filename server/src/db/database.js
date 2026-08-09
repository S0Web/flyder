const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/fitnessmov.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA foreign_keys = ON');

const tryAlter = (sql) => { try { db.run(sql); } catch (_) {} };

// ─── Tables ─────────────────────────────────────────────────────────────────

db.run(`
  CREATE TABLE IF NOT EXISTS coaches (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nom         TEXT NOT NULL DEFAULT '',
    prenom      TEXT NOT NULL,
    email       TEXT UNIQUE,
    telephone   TEXT,
    actif       INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS pointeurs (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    nom   TEXT NOT NULL UNIQUE,
    actif INTEGER NOT NULL DEFAULT 1
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS coach_documents (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    coach_id     INTEGER NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    type         TEXT NOT NULL CHECK(type IN ('carte_pro', 'contrat', 'autre')),
    nom_fichier  TEXT NOT NULL,
    chemin       TEXT NOT NULL,
    date_upload  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS cours_types (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nom       TEXT NOT NULL UNIQUE,
    categorie TEXT NOT NULL CHECK(categorie IN ('aqua', 'fitness'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS planning_recurrent (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    cours_type_id  INTEGER NOT NULL REFERENCES cours_types(id),
    coach_id       INTEGER NOT NULL REFERENCES coaches(id),
    jour_semaine   INTEGER NOT NULL CHECK(jour_semaine BETWEEN 0 AND 6),
    horaire        TEXT NOT NULL,
    duree_minutes  INTEGER NOT NULL DEFAULT 60,
    actif          INTEGER NOT NULL DEFAULT 1
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS seances (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    date           TEXT NOT NULL,
    cours_type_id  INTEGER NOT NULL REFERENCES cours_types(id),
    coach_id       INTEGER REFERENCES coaches(id),
    horaire        TEXT NOT NULL,
    duree_minutes  INTEGER NOT NULL DEFAULT 60,
    statut         TEXT NOT NULL DEFAULT 'programme'
                   CHECK(statut IN ('programme', 'effectue', 'annule', 'paye')),
    nb_presents    INTEGER,
    pointeur_id    INTEGER REFERENCES pointeurs(id),
    notes          TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

tryAlter('ALTER TABLE seances ADD COLUMN pointeur_id INTEGER REFERENCES pointeurs(id)');
tryAlter('ALTER TABLE seances ADD COLUMN notes TEXT');
tryAlter('ALTER TABLE coaches ADD COLUMN nom TEXT NOT NULL DEFAULT \'\'');

// Migration : rendre coach_id nullable (supprime NOT NULL si présent dans l'ancienne DB)
;(function migrateCoachNullable() {
  try {
    const cols = db.all('PRAGMA table_info(seances)');
    const coachCol = cols.find(c => c.name === 'coach_id');
    if (!coachCol || coachCol.notnull === 0) return; // déjà OK
    console.log('⚙️  Migration: rendre seances.coach_id nullable...');
    db.run('PRAGMA foreign_keys = OFF');
    db.run('BEGIN');
    db.run(`CREATE TABLE seances_mig (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      date           TEXT NOT NULL,
      cours_type_id  INTEGER NOT NULL REFERENCES cours_types(id),
      coach_id       INTEGER REFERENCES coaches(id),
      horaire        TEXT NOT NULL,
      duree_minutes  INTEGER NOT NULL DEFAULT 60,
      statut         TEXT NOT NULL DEFAULT 'programme'
                     CHECK(statut IN ('programme','effectue','annule','paye')),
      nb_presents    INTEGER,
      pointeur_id    INTEGER REFERENCES pointeurs(id),
      notes          TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    db.run('INSERT INTO seances_mig SELECT * FROM seances');
    db.run('DROP TABLE seances');
    db.run('ALTER TABLE seances_mig RENAME TO seances');
    db.run('COMMIT');
    db.run('PRAGMA foreign_keys = ON');
    console.log('✅ Migration coach_id nullable OK');
  } catch(e) {
    try { db.run('ROLLBACK'); } catch(_) {}
    db.run('PRAGMA foreign_keys = ON');
    console.error('Migration error:', e.message);
  }
})();

// ─── Auth ────────────────────────────────────────────────────────────────────

db.run(`
  CREATE TABLE IF NOT EXISTS app_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    prenom        TEXT NOT NULL,
    nom           TEXT NOT NULL DEFAULT '',
    email         TEXT UNIQUE,
    role          TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','manager')),
    actif         INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migration : supprimer password_hash (fini les comptes par mot de passe, place aux profils)
;(function migrateDropPasswordHash() {
  try {
    const cols = db.all('PRAGMA table_info(app_users)');
    if (!cols.some(c => c.name === 'password_hash')) return; // déjà migré
    console.log('⚙️  Migration: suppression de app_users.password_hash...');
    db.run('PRAGMA foreign_keys = OFF');
    db.run('BEGIN');
    db.run(`CREATE TABLE app_users_mig (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      prenom        TEXT NOT NULL,
      nom           TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      role          TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','manager')),
      actif         INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    db.run(`INSERT INTO app_users_mig (id, prenom, nom, email, role, actif, created_at)
            SELECT id, prenom, nom, email, role, actif, created_at FROM app_users`);
    db.run('DROP TABLE app_users');
    db.run('ALTER TABLE app_users_mig RENAME TO app_users');
    db.run('COMMIT');
    db.run('PRAGMA foreign_keys = ON');
    console.log('✅ Migration password_hash OK');
  } catch (e) {
    try { db.run('ROLLBACK'); } catch (_) {}
    db.run('PRAGMA foreign_keys = ON');
    console.error('Migration error:', e.message);
  }
})();

// Migration : rendre app_users.email optionnel (les profils n'ont plus besoin d'email)
;(function migrateEmailNullable() {
  try {
    const cols = db.all('PRAGMA table_info(app_users)');
    const emailCol = cols.find(c => c.name === 'email');
    if (!emailCol || emailCol.notnull === 0) return; // déjà OK
    console.log('⚙️  Migration: app_users.email devient optionnel...');
    db.run('PRAGMA foreign_keys = OFF');
    db.run('BEGIN');
    db.run(`CREATE TABLE app_users_mig2 (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      prenom        TEXT NOT NULL,
      nom           TEXT NOT NULL DEFAULT '',
      email         TEXT UNIQUE,
      role          TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','manager')),
      actif         INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    db.run(`INSERT INTO app_users_mig2 (id, prenom, nom, email, role, actif, created_at)
            SELECT id, prenom, nom, email, role, actif, created_at FROM app_users`);
    db.run('DROP TABLE app_users');
    db.run('ALTER TABLE app_users_mig2 RENAME TO app_users');
    db.run('COMMIT');
    db.run('PRAGMA foreign_keys = ON');
    console.log('✅ Migration email optionnel OK');
  } catch (e) {
    try { db.run('ROLLBACK'); } catch (_) {}
    db.run('PRAGMA foreign_keys = ON');
    console.error('Migration error (email nullable):', e.message);
  }
})();

db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    created_by  INTEGER NOT NULL REFERENCES app_users(id),
    semaine     TEXT NOT NULL,
    titre       TEXT NOT NULL,
    done        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES app_users(id),
    action      TEXT NOT NULL,
    entity      TEXT,
    entity_id   INTEGER,
    details     TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// ─── Planning personnel (les profils app_users servent aussi d'employés) ────

db.run(`
  CREATE TABLE IF NOT EXISTS personnel_creneaux (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    employe_id  INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    date        TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'travail'
                CHECK(type IN ('travail','cp','ecole','ferie','arret','repos')),
    debut       TEXT,
    fin         TEXT,
    ordre       INTEGER NOT NULL DEFAULT 0,
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
db.run('CREATE INDEX IF NOT EXISTS idx_personnel_creneaux_emp_date ON personnel_creneaux(employe_id, date)');

// Migration : fusionner le type "absent" dans "repos" (6 types au lieu de 7)
;(function migrateMergeAbsentIntoRepos() {
  try {
    const cols = db.all('PRAGMA table_info(personnel_creneaux)');
    if (cols.length === 0) return; // table pas encore créée avec des données à migrer
    const hasAbsentRows = db.get("SELECT 1 FROM personnel_creneaux WHERE type = 'absent' LIMIT 1");
    // Vérifie si la contrainte CHECK autorise encore 'absent' (ancienne définition)
    const sqlDef = db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='personnel_creneaux'");
    const stillAllowsAbsent = sqlDef && sqlDef.sql.includes("'absent'");
    if (!hasAbsentRows && !stillAllowsAbsent) return; // déjà migré

    console.log('⚙️  Migration: fusion du type absent → repos...');
    db.run('PRAGMA foreign_keys = OFF');
    db.run('BEGIN');
    db.run("UPDATE personnel_creneaux SET type = 'repos' WHERE type = 'absent'");
    db.run(`CREATE TABLE personnel_creneaux_mig3 (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      employe_id  INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      date        TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'travail'
                  CHECK(type IN ('travail','cp','ecole','ferie','arret','repos')),
      debut       TEXT,
      fin         TEXT,
      ordre       INTEGER NOT NULL DEFAULT 0,
      notes       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    db.run('INSERT INTO personnel_creneaux_mig3 SELECT * FROM personnel_creneaux');
    db.run('DROP TABLE personnel_creneaux');
    db.run('ALTER TABLE personnel_creneaux_mig3 RENAME TO personnel_creneaux');
    db.run('CREATE INDEX IF NOT EXISTS idx_personnel_creneaux_emp_date ON personnel_creneaux(employe_id, date)');
    db.run('COMMIT');
    db.run('PRAGMA foreign_keys = ON');
    console.log('✅ Migration absent→repos OK');
  } catch (e) {
    try { db.run('ROLLBACK'); } catch (_) {}
    db.run('PRAGMA foreign_keys = ON');
    console.error('Migration error (absent→repos):', e.message);
  }
})();

db.run(`
  CREATE TABLE IF NOT EXISTS personnel_semaine_meta (
    employe_id    INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    semaine       TEXT NOT NULL,
    code_couleur  TEXT CHECK(code_couleur IN ('ouverture','milieu','fermeture') OR code_couleur IS NULL),
    PRIMARY KEY (employe_id, semaine)
  )
`);

// Migration : fusionner l'ancienne table employes dans app_users (les profils
// deviennent aussi les employés planifiables), en conservant tout l'historique.
;(function migrateMergeEmployesIntoAppUsers() {
  try {
    const exists = db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='employes'");
    if (!exists) return; // déjà migré (table employes absente)

    console.log('⚙️  Migration: fusion employes → app_users...');
    db.run('PRAGMA foreign_keys = OFF');
    db.run('BEGIN');

    const employesRows = db.all('SELECT * FROM employes');
    const idMap = {};
    for (const emp of employesRows) {
      // Rapprochement par prénom seul (le nom peut avoir été renseigné d'un
      // côté et pas de l'autre) — équipe restreinte, risque de collision faible.
      const match = db.get('SELECT id, nom FROM app_users WHERE lower(prenom) = lower(?)', [emp.prenom]);
      if (match) {
        idMap[emp.id] = match.id;
        // Reporte le nom de famille si l'employé en a un et pas le profil (ne perd pas
        // les noms ajoutés manuellement via "Gérer les employés").
        if (emp.nom && !match.nom) {
          db.run('UPDATE app_users SET nom = ? WHERE id = ?', [emp.nom, match.id]);
        }
      } else {
        const result = db.run(
          'INSERT INTO app_users (prenom, nom, role, actif) VALUES (?, ?, ?, ?)',
          [emp.prenom, emp.nom || '', 'user', emp.actif]
        );
        idMap[emp.id] = result.lastInsertRowid;
      }
    }

    db.run(`CREATE TABLE personnel_creneaux_mig (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      employe_id  INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      date        TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'travail'
                  CHECK(type IN ('travail','cp','ecole','ferie','arret','absent','repos')),
      debut       TEXT,
      fin         TEXT,
      ordre       INTEGER NOT NULL DEFAULT 0,
      notes       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    for (const c of db.all('SELECT * FROM personnel_creneaux')) {
      db.run(
        `INSERT INTO personnel_creneaux_mig (id, employe_id, date, type, debut, fin, ordre, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, idMap[c.employe_id] ?? c.employe_id, c.date, c.type, c.debut, c.fin, c.ordre, c.notes, c.created_at]
      );
    }
    db.run('DROP TABLE personnel_creneaux');
    db.run('ALTER TABLE personnel_creneaux_mig RENAME TO personnel_creneaux');
    db.run('CREATE INDEX IF NOT EXISTS idx_personnel_creneaux_emp_date ON personnel_creneaux(employe_id, date)');

    db.run(`CREATE TABLE personnel_semaine_meta_mig (
      employe_id    INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      semaine       TEXT NOT NULL,
      code_couleur  TEXT CHECK(code_couleur IN ('ouverture','milieu','fermeture') OR code_couleur IS NULL),
      PRIMARY KEY (employe_id, semaine)
    )`);
    for (const m of db.all('SELECT * FROM personnel_semaine_meta')) {
      db.run(
        'INSERT OR IGNORE INTO personnel_semaine_meta_mig (employe_id, semaine, code_couleur) VALUES (?, ?, ?)',
        [idMap[m.employe_id] ?? m.employe_id, m.semaine, m.code_couleur]
      );
    }
    db.run('DROP TABLE personnel_semaine_meta');
    db.run('ALTER TABLE personnel_semaine_meta_mig RENAME TO personnel_semaine_meta');

    db.run('DROP TABLE employes');

    db.run('COMMIT');
    db.run('PRAGMA foreign_keys = ON');
    console.log(`✅ Migration fusion employes→app_users OK (${employesRows.length} employé(s) traité(s))`);
  } catch (e) {
    try { db.run('ROLLBACK'); } catch (_) {}
    db.run('PRAGMA foreign_keys = ON');
    console.error('Migration error (fusion employes):', e.message);
  }
})();

db.run(`
  CREATE TABLE IF NOT EXISTS modifications_ponctuelles (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    seance_id         INTEGER NOT NULL REFERENCES seances(id) ON DELETE CASCADE,
    type              TEXT NOT NULL CHECK(type IN ('annulation', 'remplacement_coach', 'ajout')),
    ancien_coach_id   INTEGER REFERENCES coaches(id),
    nouveau_coach_id  INTEGER REFERENCES coaches(id),
    raison            TEXT,
    date_modification TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// ─── Suppression définitive (soft) : garde la ligne pour l'historique du planning ───
tryAlter('ALTER TABLE app_users ADD COLUMN supprime INTEGER NOT NULL DEFAULT 0');
tryAlter('ALTER TABLE coaches   ADD COLUMN supprime INTEGER NOT NULL DEFAULT 0');

// ─── Pointeur = un utilisateur (app_users) plutôt qu'une liste séparée ───
tryAlter('ALTER TABLE seances ADD COLUMN pointeur_user_id INTEGER REFERENCES app_users(id)');
// Reprise best-effort : relie les anciens pointeurs (texte) aux utilisateurs par prénom.
;(function backfillPointeurUser() {
  try {
    const cols = db.all('PRAGMA table_info(seances)').map(c => c.name);
    if (!cols.includes('pointeur_id') || !cols.includes('pointeur_user_id')) return;
    db.run(`
      UPDATE seances
      SET pointeur_user_id = (
        SELECT au.id FROM app_users au
        JOIN pointeurs p ON lower(au.prenom) = lower(p.nom)
        WHERE p.id = seances.pointeur_id
        LIMIT 1
      )
      WHERE pointeur_id IS NOT NULL AND pointeur_user_id IS NULL
    `);
  } catch (e) {
    console.error('Backfill pointeur_user_id error:', e.message);
  }
})();

// ─── Annuaire (prestataires, employés, responsables — les coachs vivent dans
// la table `coaches`, pas ici, pour ne pas dupliquer la même donnée) ───
db.run(`
  CREATE TABLE IF NOT EXISTS annuaire_contacts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    categorie   TEXT NOT NULL CHECK(categorie IN ('coach', 'prestataire', 'employe', 'responsable')),
    nom         TEXT NOT NULL,
    telephone   TEXT,
    aqua        INTEGER NOT NULL DEFAULT 0,
    fitness     INTEGER NOT NULL DEFAULT 0,
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
// Nettoyage : les contacts "coach" ont été déplacés vers la table coaches (aqua/fitness).
db.run("DELETE FROM annuaire_contacts WHERE categorie = 'coach'");

// ─── Coachs : disciplines (affichées dans l'Annuaire) ───
tryAlter('ALTER TABLE coaches ADD COLUMN aqua INTEGER NOT NULL DEFAULT 0');
tryAlter('ALTER TABLE coaches ADD COLUMN fitness INTEGER NOT NULL DEFAULT 0');
tryAlter('ALTER TABLE coaches ADD COLUMN boxe INTEGER NOT NULL DEFAULT 0');
tryAlter('ALTER TABLE coaches ADD COLUMN crosstraining INTEGER NOT NULL DEFAULT 0');
tryAlter('ALTER TABLE coaches ADD COLUMN poledance INTEGER NOT NULL DEFAULT 0');

// Correction ponctuelle : 4 coachs Corbeil taggés "Pole" sur la fiche papier avaient
// été transcrits par erreur en fitness=1 (avant l'ajout du tag Pole Dance dédié).
// Idempotent : ne touche que les lignes encore dans l'état erroné.
if (process.env.SALLE_NOM === 'Corbeil-Essonnes') {
  for (const prenom of ['Jen', 'Clarisse', 'Sarah', 'Bénédicte']) {
    db.run(
      "UPDATE coaches SET fitness = 0, poledance = 1 WHERE lower(prenom) = lower(?) AND fitness = 1 AND poledance = 0",
      [prenom]
    );
  }
}

// ─── Planning personnel : réintroduit "Absent" comme type distinct de "Repos" ───
;(function reintroduceAbsent() {
  try {
    const sqlDef = db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='personnel_creneaux'");
    if (!sqlDef || sqlDef.sql.includes("'absent'")) return;
    db.run('BEGIN');
    db.run(`CREATE TABLE personnel_creneaux_mig4 (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      employe_id  INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      date        TEXT NOT NULL,
      type        TEXT NOT NULL
                  CHECK(type IN ('travail','cp','ecole','ferie','arret','repos','absent')),
      debut       TEXT,
      fin         TEXT,
      ordre       INTEGER NOT NULL DEFAULT 0,
      notes       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    db.run('INSERT INTO personnel_creneaux_mig4 SELECT * FROM personnel_creneaux');
    db.run('DROP TABLE personnel_creneaux');
    db.run('ALTER TABLE personnel_creneaux_mig4 RENAME TO personnel_creneaux');
    db.run('CREATE INDEX IF NOT EXISTS idx_personnel_creneaux_emp_date ON personnel_creneaux(employe_id, date)');
    db.run('COMMIT');
    console.log('✅ Migration : type "absent" réintroduit dans personnel_creneaux');
  } catch (e) {
    try { db.run('ROLLBACK'); } catch (_) {}
    console.error('Migration reintroduceAbsent error:', e.message);
  }
})();

// ─── Code confidentiel par profil (facultatif) ───
tryAlter('ALTER TABLE app_users ADD COLUMN code_hash TEXT');

// ─── Cumul de congés payés : date à partir de laquelle 2,5 jours/mois s'acquièrent ───
tryAlter('ALTER TABLE app_users ADD COLUMN date_debut_contrat TEXT');

// ─── Cumul de congés payés : ajustement manuel (manager) par rapport au calcul automatique ───
tryAlter('ALTER TABLE app_users ADD COLUMN cp_ajuste REAL NOT NULL DEFAULT 0');

// ─── Annuaire : un coach peut aussi apparaître dans d'autres catégories (ex. employé) ───
tryAlter("ALTER TABLE coaches ADD COLUMN categories_extra TEXT NOT NULL DEFAULT ''");

// ─── Facturation coach (facultatif) : sert à faire figurer ces infos sur l'export
// PDF du récapitulatif d'heures, pour comparer avec la facture envoyée par le coach ───
tryAlter('ALTER TABLE coaches ADD COLUMN siret TEXT');
tryAlter('ALTER TABLE coaches ADD COLUMN adresse TEXT');
tryAlter('ALTER TABLE coaches ADD COLUMN tarif_horaire REAL');

// ─── Accès en écriture restreint : IP autorisées à modifier depuis un compte non-manager ───
db.run(`
  CREATE TABLE IF NOT EXISTS ip_autorisees (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ip          TEXT NOT NULL UNIQUE,
    label       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// ─── Marqueurs d'imports ponctuels (ex. historique Corbeil) : sert à masquer un
// bouton d'import une fois qu'il a été utilisé, sans nouvelle table par import ───
db.run(`
  CREATE TABLE IF NOT EXISTS import_markers (
    nom         TEXT PRIMARY KEY,
    importe_le  TEXT NOT NULL
  )
`);

// ─── Formation : articles type blog, éditables par les managers, consultables
// par tous les utilisateurs authentifiés. Contenu au format markdown restreint
// (gras, italique, titres, séparateur, images). ───
db.run(`
  CREATE TABLE IF NOT EXISTS formation_articles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    titre       TEXT NOT NULL,
    contenu     TEXT NOT NULL DEFAULT '',
    ordre       INTEGER NOT NULL DEFAULT 0,
    auteur_id   INTEGER REFERENCES app_users(id),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// ─── Formation : catégories (niveau 1 de navigation — chaque catégorie
// regroupe des articles/"sous-formations" affichés en niveau 2). ───
db.run(`
  CREATE TABLE IF NOT EXISTS formation_categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    titre       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    icone       TEXT NOT NULL DEFAULT 'BookOpen',
    couleur     TEXT NOT NULL DEFAULT '#2fa8cc',
    ordre       INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
tryAlter('ALTER TABLE formation_articles ADD COLUMN categorie_id INTEGER REFERENCES formation_categories(id)');

// Backfill : tout article sans catégorie (créé avant l'introduction des
// catégories) est rattaché à une catégorie "Non classé" créée à la volée,
// pour qu'aucun article existant ne devienne invisible.
;(function backfillFormationCategories() {
  try {
    const { n } = db.get('SELECT COUNT(*) AS n FROM formation_articles WHERE categorie_id IS NULL');
    if (n === 0) return;
    let cat = db.get("SELECT id FROM formation_categories WHERE titre = 'Non classé'");
    if (!cat) {
      const { max } = db.get('SELECT COALESCE(MAX(ordre), -1) AS max FROM formation_categories');
      const result = db.run(
        "INSERT INTO formation_categories (titre, description, icone, couleur, ordre) VALUES ('Non classé', 'Articles créés avant la mise en place des catégories.', 'BookOpen', '#94a3b8', ?)",
        [max + 1]
      );
      cat = { id: result.lastInsertRowid };
    }
    db.run('UPDATE formation_articles SET categorie_id = ? WHERE categorie_id IS NULL', [cat.id]);
    console.log(`✅ Migration : ${n} article(s) Formation rattaché(s) à "Non classé"`);
  } catch (e) {
    console.error('backfillFormationCategories error:', e.message);
  }
})();

module.exports = db;
