const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db/database');
const { verifyPassword, hashPassword } = require('../lib/passwordHash');
const { requireAuth, getToken } = require('../middleware/auth');

// GET /api/auth/needs-setup — indique s'il faut créer le tout premier compte admin.
// Public (comme /login) : il n'y a personne à authentifier tant qu'aucun compte
// n'existe.
router.get('/needs-setup', (req, res) => {
  const count = db.get('SELECT COUNT(*) as n FROM admin_users').n;
  res.json({ needsSetup: count === 0 });
});

// POST /api/auth/setup — crée le tout premier compte admin. Se ferme définitivement
// dès qu'un compte existe (même logique que POST /api/auth/profiles côté salles) :
// ce back-office n'a qu'un seul propriétaire, pas d'inscription libre.
router.post('/setup', (req, res) => {
  const count = db.get('SELECT COUNT(*) as n FROM admin_users').n;
  if (count > 0) return res.status(403).json({ error: 'Un compte admin existe déjà.' });

  const { email, password, nom } = req.body;
  if (!email || !email.trim()) return res.status(400).json({ error: 'Email requis' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });

  db.run(
    'INSERT INTO admin_users (email, password_hash, nom) VALUES (?, ?, ?)',
    [email.trim().toLowerCase(), hashPassword(password), (nom || '').trim()]
  );
  res.status(201).json({ ok: true });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  const admin = db.get('SELECT * FROM admin_users WHERE email = ?', [email.trim().toLowerCase()]);
  if (!admin || !verifyPassword(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 jours
  db.run('INSERT INTO sessions (token, admin_user_id, expires_at) VALUES (?, ?, ?)', [token, admin.id, expires]);

  res.json({ token, admin: { id: admin.id, email: admin.email, nom: admin.nom } });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  const token = getToken(req);
  if (token) db.run('DELETE FROM sessions WHERE token = ?', [token]);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json(req.admin);
});

module.exports = router;
