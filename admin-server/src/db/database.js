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

// SQLite n'a pas d'ADD COLUMN IF NOT EXISTS : on tente l'ALTER et on avale
// l'erreur si la colonne existe déjà (idempotent, sûr à chaque redémarrage).
const tryAlter = (sql) => { try { db.run(sql); } catch (_) {} };

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

// Clé de service pour qu'un serveur de salle s'authentifie sur ce backoffice
// (canal séparé des sessions humaines ci-dessus). Hachée, jamais stockée en
// clair — voir admin-server/src/routes/clients.js pour la génération.
tryAlter('ALTER TABLE clients ADD COLUMN api_key_hash TEXT');

// ─── Tickets de support (un inbox unique pour toutes les salles) ───────────────
db.run(`
  CREATE TABLE IF NOT EXISTS tickets (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id     INTEGER NOT NULL REFERENCES clients(id),
    sujet         TEXT NOT NULL,
    statut        TEXT NOT NULL DEFAULT 'ouvert' CHECK(statut IN ('ouvert','resolu')),
    non_lu_salle  INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS ticket_messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    auteur_nom   TEXT NOT NULL,
    auteur_role  TEXT NOT NULL CHECK(auteur_role IN ('salle','admin')),
    corps        TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

module.exports = db;
