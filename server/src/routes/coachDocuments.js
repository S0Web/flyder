const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const router = express.Router();
const db = require('../db/database');
const { requireManager } = require('../middleware/auth');

// Documents des coachs (CNI/passeport, diplômes, carte professionnelle, autre) —
// les coachs n'ont pas de compte de connexion (pas de lien avec app_users), donc
// pas de notion d'accès "propriétaire" : ces documents contiennent des pièces
// d'identité, réservés au manager pour la lecture comme pour l'écriture.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/fitnessmov.db');
const UPLOADS_DIR = path.join(path.dirname(DB_PATH), 'uploads', 'coach-documents');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const TYPES_VALIDES = ['cni_passeport', 'diplome', 'carte_pro', 'autre'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.pdf';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^application\/pdf$/.test(file.mimetype) && !/^image\/(png|jpe?g)$/.test(file.mimetype)) {
      return cb(new Error('Format non supporté (PDF ou image attendu)'));
    }
    cb(null, true);
  },
});

// GET /api/coach-documents/:coachId — liste (manager uniquement).
router.get('/:coachId', requireManager, (req, res) => {
  const rows = db.all(
    `SELECT id, type, nom_fichier, date_upload FROM coach_documents
     WHERE coach_id = ? ORDER BY type, date_upload DESC`,
    [req.params.coachId]
  );
  res.json(rows);
});

// GET /api/coach-documents/file/:id — téléchargement (manager uniquement).
router.get('/file/:id', requireManager, (req, res) => {
  const doc = db.get('SELECT * FROM coach_documents WHERE id = ?', [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });
  res.download(doc.chemin, doc.nom_fichier);
});

// POST /api/coach-documents/:coachId — upload.
router.post('/:coachId', requireManager, (req, res) => {
  upload.single('fichier')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    const { type } = req.body;
    if (!TYPES_VALIDES.includes(type)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Type de document invalide' });
    }
    const result = db.run(
      `INSERT INTO coach_documents (coach_id, type, nom_fichier, chemin) VALUES (?, ?, ?, ?)`,
      [req.params.coachId, type, req.file.originalname, req.file.path]
    );
    res.status(201).json(
      db.get('SELECT id, type, nom_fichier, date_upload FROM coach_documents WHERE id = ?', [result.lastInsertRowid])
    );
  });
});

// DELETE /api/coach-documents/:id
router.delete('/:id', requireManager, (req, res) => {
  const doc = db.get('SELECT * FROM coach_documents WHERE id = ?', [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });
  db.run('DELETE FROM coach_documents WHERE id = ?', [req.params.id]);
  fs.unlink(doc.chemin, () => {});
  res.json({ ok: true });
});

module.exports = router;
