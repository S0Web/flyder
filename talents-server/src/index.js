const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

require('./db/database');

const coachAuthRouter = require('./routes/coachAuth');
const gymAuthRouter = require('./routes/gymAuth');
const searchRouter = require('./routes/search');
const contactRouter = require('./routes/contact');
const photoRouter = require('./routes/photo');
const adminRouter = require('./routes/admin');
const { scheduleDailyBackup } = require('./lib/backup');
const { rateLimit } = require('./lib/rateLimit');

const app = express();
const PORT = process.env.PORT || 3003;

app.set('trust proxy', true);

// talents-client est servi par ce même serveur en production : same-origin,
// pas besoin de CORS pour lui. localhost:5173 = dev Vite de talents-client.
const allowedOrigins = [
  'https://flyder.fr',
  'https://www.flyder.fr',
  'http://localhost:5173',
  'http://localhost:3003',
];

app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '64kb' }));

// Anti force brute : 30 tentatives de connexion/inscription par IP et par quart d'heure.
app.use(
  ['/api/coach-auth/login', '/api/coach-auth/signup', '/api/gym-auth/login', '/api/gym-auth/signup'],
  rateLimit({ windowMs: 15 * 60 * 1000, max: 30 })
);
// Clé partagée, donc surface de brute-force réduite mais réelle : limiteur
// plus strict que les comptes normaux.
app.use('/api/admin/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));

app.use('/api/coach-auth', coachAuthRouter);
app.use('/api/gym-auth', gymAuthRouter);
app.use('/api/search', searchRouter);
app.use('/api/contact', contactRouter);
app.use('/api/photo', photoRouter);
app.use('/api/admin', adminRouter);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/talents.db');
const uploadsDir = path.join(path.dirname(DB_PATH), 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// GET /api/download-db — permet de récupérer une copie brute du fichier
// SQLite directement depuis un navigateur (mobile compris), sans SSH ni CLI.
// Même logique d'auth que /api/admin/login : une clé partagée (ADMIN_KEY),
// comparée en temps constant pour éviter une fuite d'info via le timing.
function clesEgales(fournie, attendue) {
  const a = Buffer.from(String(fournie || ''));
  const b = Buffer.from(String(attendue));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

app.get('/api/download-db', (req, res) => {
  const cle = process.env.ADMIN_KEY;
  if (!cle) return res.status(503).json({ error: 'ADMIN_KEY non configurée côté serveur' });
  const auth = req.headers.authorization;
  const fournie = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!clesEgales(fournie, cle)) return res.status(401).json({ error: 'Non autorisé' });

  res.download(DB_PATH, 'talents.db', (err) => {
    if (err) {
      console.error('Erreur téléchargement talents.db:', err);
      if (!res.headersSent) {
        const status = err.code === 'ENOENT' ? 404 : 500;
        res.status(status).json({ error: 'Impossible de télécharger la base de données' });
      }
    }
  });
});

const clientDist = path.join(__dirname, '../public');
app.use(express.static(clientDist));
app.get(/^(?!\/api)(?!\/uploads).*/, (req, res) => {
  const indexPath = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(200).send("Flyder Talents API — le client n'est pas encore build.");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur serveur, réessaie dans un instant.' });
});

app.listen(PORT, () => {
  console.log(`🎯 Flyder Talents — http://localhost:${PORT}`);
  scheduleDailyBackup();
});
