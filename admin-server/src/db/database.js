const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs = require('fs');

// Base séparée de celles des salles clientes : ce service n'a accès à aucune
// donnée client, uniquement au registre (nom, sous-domaine, statut...).
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/admin.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA foreign_keys = ON');

// ─── Comptes admin (toi, pas tes clients) ──────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nom           TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    expires_at  TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// ─── Registre des clients (une ligne par salle/instance Flyder) ────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS clients (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    nom               TEXT NOT NULL,
    sous_domaine      TEXT,
    salle_nom_env     TEXT,
    statut            TEXT NOT NULL DEFAULT 'essai' CHECK(statut IN ('essai','actif','suspendu','resilie')),
    plan              TEXT,
    contact_nom       TEXT,
    contact_email     TEXT,
    contact_telephone TEXT,
    date_debut        TEXT,
    notes             TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

module.exports = db;
