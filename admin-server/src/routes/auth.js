const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db/database');
const { verifyPassword } = require('../lib/passwordHash');
const { requireAuth, getToken } = require('../middleware/auth');

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
