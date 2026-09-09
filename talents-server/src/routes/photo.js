const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const router = express.Router();
const db = require('../db/database');
const { requireAnyAuth } = require('../middleware/auth');

// Stockage sur disque local (volume Railway), même approche que
// server/src/routes/coachDocuments.js — pas besoin de S3 pour ça, contrairement
// aux sauvegardes chiffrées (backup.js) qui doivent survivre hors de Railway.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/talents.db');
const UPLOADS_DIR = path.join(path.dirname(DB_PATH), 'uploads', 'photos');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) {
      return cb(new Error('Format non supporté (JPG, PNG ou WebP attendu)'));
    }
    cb(null, true);
  },
});

// POST /api/photo — photo de profil de l'acteur connecté (salle ou coach).
router.post('/', requireAnyAuth, (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Aucune photo reçue' });

    const filename = `${crypto.randomUUID()}.jpg`;
    const dest = path.join(UPLOADS_DIR, filename);
    try {
      await sharp(req.file.buffer).resize(400, 400, { fit: 'cover' }).jpeg({ quality: 85 }).toFile(dest);
    } catch (_) {
      return res.status(400).json({ error: 'Image invalide' });
    }

    const photoUrl = `/uploads/photos/${filename}`;
    const table = req.actor.type === 'coach' ? 'coaches' : 'gyms';
    db.run(`UPDATE ${table} SET photo_url = ?, updated_at = datetime('now') WHERE id = ?`, [photoUrl, req.actor.id]);

    res.json({ photo_url: photoUrl });
  });
});

module.exports = router;
