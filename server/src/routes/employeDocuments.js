const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, requireManager } = require('../middleware/auth');
const { analyserFichesDePaie } = require('../lib/payslipParser');

// Documents des salariés (fiches de paie, contrat, arrêt maladie, autre) — sur le
// volume persistant, jamais dans server/public. Contrairement aux images Formation,
// ce sont des données personnelles/financières : chaque téléchargement passe par une
// route authentifiée qui vérifie l'accès (voir peutVoir), pas de service statique.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/fitnessmov.db');
const UPLOADS_DIR = path.join(path.dirname(DB_PATH), 'uploads', 'employe-documents');
const TEMP_DIR = path.join(path.dirname(DB_PATH), 'uploads', 'employe-documents-tmp');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(TEMP_DIR, { recursive: true });

// Ménage au démarrage : un import de fiches de paie jamais confirmé ni annulé
// (onglet fermé en cours de route) laisse un fichier temporaire orphelin.
try {
  const unJourMs = 24 * 60 * 60 * 1000;
  for (const f of fs.readdirSync(TEMP_DIR)) {
    const p = path.join(TEMP_DIR, f);
    if (Date.now() - fs.statSync(p).mtimeMs > unJourMs) fs.unlinkSync(p);
  }
} catch { /* pas grave si le ménage échoue, réessaiera au prochain démarrage */ }

const TYPES_VALIDES = ['fiche_paie', 'contrat', 'arret_maladie', 'autre'];

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

const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.pdf`),
});
const uploadTemp = multer({
  storage: tempStorage,
  limits: { fileSize: 40 * 1024 * 1024 }, // le fichier groupé (toutes les fiches) peut être lourd
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Le fichier groupé doit être un PDF'));
    cb(null, true);
  },
});

function peutVoir(req, userId) {
  return req.user.role === 'manager' || req.user.id === Number(userId);
}

// ─── Documents d'un salarié ──────────────────────────────────────────────────

// GET /api/employe-documents/:userId — liste (le salarié voit les siens, le manager tout).
router.get('/:userId', requireAuth, (req, res) => {
  if (!peutVoir(req, req.params.userId)) return res.status(403).json({ error: 'Accès refusé' });
  const rows = db.all(
    `SELECT id, type, periode, nom_fichier, date_upload FROM employe_documents
     WHERE user_id = ? ORDER BY periode DESC, date_upload DESC`,
    [req.params.userId]
  );
  res.json(rows);
});

// GET /api/employe-documents/file/:id — téléchargement.
router.get('/file/:id', requireAuth, (req, res) => {
  const doc = db.get('SELECT * FROM employe_documents WHERE id = ?', [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });
  if (!peutVoir(req, doc.user_id)) return res.status(403).json({ error: 'Accès refusé' });
  res.download(doc.chemin, doc.nom_fichier);
});

// POST /api/employe-documents/:userId — upload manuel (manager).
router.post('/:userId', requireManager, (req, res) => {
  upload.single('fichier')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    const { type, periode } = req.body;
    if (!TYPES_VALIDES.includes(type)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Type de document invalide' });
    }
    const result = db.run(
      `INSERT INTO employe_documents (user_id, type, periode, nom_fichier, chemin, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.userId, type, periode || null, req.file.originalname, req.file.path, req.user.id]
    );
    res.status(201).json(
      db.get('SELECT id, type, periode, nom_fichier, date_upload FROM employe_documents WHERE id = ?', [result.lastInsertRowid])
    );
  });
});

// DELETE /api/employe-documents/:id — manager.
router.delete('/:id', requireManager, (req, res) => {
  const doc = db.get('SELECT * FROM employe_documents WHERE id = ?', [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });
  db.run('DELETE FROM employe_documents WHERE id = ?', [req.params.id]);
  fs.unlink(doc.chemin, () => {});
  res.json({ ok: true });
});

// ─── Import groupé des fiches de paie ────────────────────────────────────────
// Le fichier PDF unique reçu de la compta contient les fiches de tous les salariés.
// 1) /import/analyser : upload + proposition de répartition (texte de chaque page
//    comparé aux noms des comptes actifs, pas d'IA — voir lib/payslipParser).
// 2) le manager relit/corrige la proposition côté client.
// 3) /import/confirmer : découpe réellement le PDF selon les groupes validés.

router.post('/import/analyser', requireManager, (req, res) => {
  uploadTemp.single('fichier')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    try {
      const employes = db.all("SELECT id, prenom, nom FROM app_users WHERE actif = 1 AND supprime = 0 AND masque = 0");
      const buffer = fs.readFileSync(req.file.path);
      const analyse = await analyserFichesDePaie(buffer, employes);
      res.json({ tempId: path.basename(req.file.path), ...analyse });
    } catch (e) {
      fs.unlink(req.file.path, () => {});
      res.status(500).json({ error: "Échec de l'analyse du PDF : " + e.message });
    }
  });
});

router.post('/import/confirmer', requireManager, async (req, res) => {
  const { tempId, groupes } = req.body;
  if (!tempId || !/^[a-f0-9-]+\.pdf$/.test(tempId)) return res.status(400).json({ error: 'Fichier temporaire invalide' });
  const tempPath = path.join(TEMP_DIR, tempId);
  if (!fs.existsSync(tempPath)) return res.status(404).json({ error: 'Fichier temporaire introuvable ou expiré — réimporte le PDF.' });
  if (!Array.isArray(groupes) || groupes.length === 0) return res.status(400).json({ error: 'Aucune fiche à importer' });

  try {
    const srcBytes = fs.readFileSync(tempPath);
    const src = await PDFDocument.load(srcBytes);
    let count = 0;

    for (const g of groupes) {
      const emp = db.get('SELECT id, prenom, nom FROM app_users WHERE id = ?', [g.employeId]);
      if (!emp || !g.pageDebut || !g.pageFin) continue;
      const indices = [];
      for (let p = g.pageDebut; p <= g.pageFin; p++) indices.push(p - 1);

      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, indices);
      copied.forEach(p => out.addPage(p));
      const bytes = await out.save();

      const filename = `${crypto.randomUUID()}.pdf`;
      const filepath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filepath, bytes);

      const nomAffiche = `Fiche de paie ${g.periode || ''} — ${emp.prenom} ${emp.nom}`.replace(/\s+—/, ' —').trim();
      db.run(
        `INSERT INTO employe_documents (user_id, type, periode, nom_fichier, chemin, uploaded_by) VALUES (?, 'fiche_paie', ?, ?, ?, ?)`,
        [emp.id, g.periode || null, nomAffiche, filepath, req.user.id]
      );
      count++;
    }

    fs.unlink(tempPath, () => {});
    res.json({ ok: true, count });
  } catch (e) {
    res.status(500).json({ error: "Échec de l'import : " + e.message });
  }
});

router.post('/import/annuler', requireManager, (req, res) => {
  const { tempId } = req.body;
  if (tempId && /^[a-f0-9-]+\.pdf$/.test(tempId)) fs.unlink(path.join(TEMP_DIR, tempId), () => {});
  res.json({ ok: true });
});

module.exports = router;
