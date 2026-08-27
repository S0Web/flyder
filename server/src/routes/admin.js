const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const { Database } = require('node-sqlite3-wasm');
const router = express.Router();
const { requireManager } = require('../middleware/auth');
const { run: importPersonnelHistorique } = require('../db/seedPersonnel');
const { run: importBallancourt } = require('../db/seedBallancourt');
const { run: importCorbeilHistorique } = require('../db/seedCorbeil');
const { run: seedDemo } = require('../db/seedDemo');
const db = require('../db/database');

// Même résolution de chemin que server/src/db/database.js
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/fitnessmov.db');

// POST /api/admin/seed-personnel — importe l'historique du planning personnel.
// N'écrase jamais un jour déjà renseigné, peut être relancé sans risque.
router.post('/seed-personnel', requireManager, (req, res) => {
  try {
    const result = importPersonnelHistorique();
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/seed-ballancourt — importe le catalogue de cours, les coachs et
// l'historique complet (séances + planning personnel) de Ballancourt-sur-Essonne.
// Réservé à l'instance Ballancourt (SALLE_NOM) pour éviter tout risque sur les autres
// salles. N'écrase jamais une donnée déjà présente, peut être relancé sans risque.
router.post('/seed-ballancourt', requireManager, (req, res) => {
  if (process.env.SALLE_NOM !== 'Ballancourt-sur-Essonne') {
    return res.status(403).json({ error: "Import réservé à l'instance Ballancourt-sur-Essonne." });
  }
  try {
    const result = importBallancourt();
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/seed-corbeil-historique — importe l'historique des séances
// (juin 2024 - août 2025) transcrit depuis planning_cours_co.xlsx. Réservé à
// l'instance Corbeil-Essonnes. N'écrase jamais une séance déjà présente, peut
// être relancé sans risque — mais ne doit servir qu'une fois (le bouton
// disparaît côté client une fois l'import marqué fait).
router.post('/seed-corbeil-historique', requireManager, (req, res) => {
  if (process.env.SALLE_NOM !== 'Corbeil-Essonnes') {
    return res.status(403).json({ error: "Import réservé à l'instance Corbeil-Essonnes." });
  }
  try {
    const result = importCorbeilHistorique();
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/seed-demo — génère un jeu de données 100% fictif (coachs et
// séances inventés, aucune donnée réelle) sur les 14 derniers mois glissants.
// Réservé à une instance dédiée "portfolio" (SALLE_NOM), jamais aux vraies
// salles, pour ne jamais risquer de polluer de vraies données. ?reset=1 efface
// d'abord toute donnée de démo déjà présente puis régénère (pour rafraîchir la
// démo avant de la montrer) ; sans reset, ne fait rien si déjà généré.
router.post('/seed-demo', requireManager, (req, res) => {
  if (process.env.SALLE_NOM !== 'Demo-Portfolio') {
    return res.status(403).json({ error: "Génération de démo réservée à l'instance Demo-Portfolio." });
  }
  try {
    const result = seedDemo({ reset: req.query.reset === '1' });
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/backup — télécharge une copie du fichier SQLite de la base.
router.get('/backup', requireManager, (req, res) => {
  try {
    // Le journal WAL peut contenir des écritures récentes pas encore dans le fichier
    // principal ; on force leur écriture avant de servir le fichier.
    db.run('PRAGMA wal_checkpoint(TRUNCATE)');
    const today = new Date().toISOString().slice(0, 10);
    res.download(DB_PATH, `fitnessmov-${today}.db`);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const uploadDb = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

// POST /api/admin/backup/import — remplace la base live par le fichier envoyé.
// Opération destructive : une sauvegarde de sécurité automatique du fichier
// actuel est prise juste avant le remplacement (en plus de celle que le manager
// est invité à télécharger lui-même côté client). Le fichier étant ouvert en
// permanence par ce process, on ne peut pas le remplacer "à chaud" proprement —
// on force donc un redémarrage juste après : le prochain démarrage relira la
// nouvelle base depuis zéro.
router.post('/backup/import', requireManager, uploadDb.single('fichier'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const uploadedPath = req.file.path;

  try {
    const testDb = new Database(uploadedPath);
    const check = testDb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='app_users'");
    testDb.close();
    if (!check) {
      fs.unlinkSync(uploadedPath);
      return res.status(400).json({ error: "Ce fichier ne ressemble pas à une base Flyder valide (table \"app_users\" introuvable)." });
    }
  } catch (e) {
    try { fs.unlinkSync(uploadedPath); } catch { /* déjà nettoyé */ }
    return res.status(400).json({ error: `Fichier invalide : ${e.message}` });
  }

  try {
    db.run('PRAGMA wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(DB_PATH, `${DB_PATH}.avant-import-${Date.now()}`);
    fs.copyFileSync(uploadedPath, DB_PATH);
    fs.unlinkSync(uploadedPath);
  } catch (e) {
    return res.status(500).json({ error: `Échec du remplacement : ${e.message}` });
  }

  res.json({ ok: true, message: 'Import réussi, redémarrage du service en cours…' });
  console.log('⚙️  Base remplacée via import manuel — redémarrage volontaire du process.');
  setTimeout(() => process.exit(1), 300);
});

module.exports = router;
