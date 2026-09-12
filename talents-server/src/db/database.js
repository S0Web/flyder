const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs = require('fs');

// Base dédiée à Flyder Talents : indépendante des bases de salle et de la base
// admin-server. Aucun compte Flyder existant n'est requis pour s'inscrire ici —
// salles et coachs créent chacun un compte Talents autonome (voir plan).
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/talents.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA foreign_keys = ON');

// SQLite n'a pas d'ADD COLUMN IF NOT EXISTS : on tente l'ALTER et on avale
// l'erreur si la colonne existe déjà (idempotent, sûr à chaque redémarrage).
const tryAlter = (sql) => { try { db.run(sql); } catch (_) {} };

// ─── Salles (comptes autonomes, symétriques aux coachs) ────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS gyms (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    email                  TEXT NOT NULL UNIQUE,
    password_hash          TEXT NOT NULL,
    nom                    TEXT NOT NULL DEFAULT '',
    adresse                TEXT,
    lat                    REAL,
    lng                    REAL,
    disciplines_recherchees TEXT NOT NULL DEFAULT '',
    description            TEXT NOT NULL DEFAULT '',
    photo_url              TEXT,
    contact_nom            TEXT NOT NULL DEFAULT '',
    contact_email          TEXT NOT NULL DEFAULT '',
    contact_telephone      TEXT NOT NULL DEFAULT '',
    profil_complet         INTEGER NOT NULL DEFAULT 0,
    created_at             TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS gym_sessions (
    token      TEXT PRIMARY KEY,
    gym_id     INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Réservé à une future liaison avec la table `coaches` interne de chaque salle
// (colonne `talents_coach_id` côté server/, phase ultérieure) — rien ici ne
// dépend de cette évolution, c'est juste pour mémoire.

// ─── Coachs (comptes autonomes) ─────────────────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS coaches (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    email          TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    nom            TEXT NOT NULL DEFAULT '',
    prenom         TEXT NOT NULL DEFAULT '',
    adresse        TEXT,
    lat            REAL,
    lng            REAL,
    disciplines    TEXT NOT NULL DEFAULT '',
    tarif_horaire  REAL,
    bio            TEXT NOT NULL DEFAULT '',
    photo_url      TEXT,
    telephone      TEXT NOT NULL DEFAULT '',
    email_public   INTEGER NOT NULL DEFAULT 0,
    profil_complet INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS coach_sessions (
    token      TEXT PRIMARY KEY,
    coach_id   INTEGER NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// ─── Log des mises en contact (pas de fil de discussion — voir plan) ───────────
db.run(`
  CREATE TABLE IF NOT EXISTS contact_events (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    initiateur_type  TEXT NOT NULL CHECK(initiateur_type IN ('gym','coach')),
    initiateur_id    INTEGER NOT NULL,
    cible_type       TEXT NOT NULL CHECK(cible_type IN ('gym','coach')),
    cible_id         INTEGER NOT NULL,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
db.run(`CREATE INDEX IF NOT EXISTS idx_contact_lookup ON contact_events (initiateur_type, initiateur_id, cible_type, cible_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_contact_date ON contact_events (created_at)`);

// Pause de visibilité, réversible par le titulaire du compte — n'affecte que
// l'apparition dans les recherches publiques, jamais la connexion ni l'édition
// du profil (un compte inactif doit pouvoir se réactiver lui-même).
tryAlter('ALTER TABLE gyms ADD COLUMN actif INTEGER NOT NULL DEFAULT 1');
tryAlter('ALTER TABLE coaches ADD COLUMN actif INTEGER NOT NULL DEFAULT 1');

// Signale un coach ouvert aux remplacements de dernière minute, en plus (ou à
// la place) d'une recherche de créneaux fixes — filtrable côté recherche salle.
tryAlter('ALTER TABLE coaches ADD COLUMN disponible_remplacements INTEGER NOT NULL DEFAULT 0');

// Ville et code postal séparés de la voie/numéro (colonne `adresse`, conservée
// pour la précision du géocodage) — la ville vient obligatoirement d'une liste
// de communes réelles choisie côté client (autocomplétion Base Adresse
// Nationale), jamais d'une saisie libre : impossible d'enregistrer "aulnay" à
// la place d'"Aulnay-sous-Bois". C'est aussi ce qui est affiché publiquement
// (jamais la voie exacte, question de vie privée avant tout contact).
tryAlter('ALTER TABLE coaches ADD COLUMN code_postal TEXT');
tryAlter('ALTER TABLE coaches ADD COLUMN ville TEXT');
tryAlter('ALTER TABLE gyms ADD COLUMN code_postal TEXT');
tryAlter('ALTER TABLE gyms ADD COLUMN ville TEXT');

module.exports = db;
