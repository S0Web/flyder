const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db/database');
const { hashPassword, verifyPassword } = require('../lib/passwordHash');
const { requireGymAuth, getToken } = require('../middleware/auth');
const { updateGymProfile, GYM_FIELDS } = require('../lib/updateProfile');

const DUREE_SESSION_MS = 90 * 24 * 60 * 60 * 1000; // 90 jours
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Borne les champs libres : évite qu'un profil serve de dépotoir (spam, abus).
const clean = (v, max) => String(v ?? '').trim().slice(0, max);

function issueSession(gymId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + DUREE_SESSION_MS).toISOString();
  db.run('INSERT INTO gym_sessions (token, gym_id, expires_at) VALUES (?, ?, ?)', [token, gymId, expires]);
  return token;
}

const PROFIL_PUBLIC_FIELDS = GYM_FIELDS;

// POST /api/gym-auth/signup — aucune vérification d'identité de la salle en
// MVP, même niveau de confiance minimal que côté coach (voir plan).
router.post('/signup', (req, res) => {
  const { email, password, nom } = req.body;
  if (!email || !EMAIL_RE.test(String(email).trim())) return res.status(400).json({ error: 'Adresse email invalide' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
  if (!clean(nom, 120)) return res.status(400).json({ error: 'Nom de la salle requis' });

  const emailNorm = String(email).trim().toLowerCase().slice(0, 120);
  if (db.get('SELECT id FROM gyms WHERE email = ?', [emailNorm])) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
  }

  const result = db.run(
    'INSERT INTO gyms (email, password_hash, nom, contact_email) VALUES (?, ?, ?, ?)',
    [emailNorm, hashPassword(password), clean(nom, 120), emailNorm]
  );
  const token = issueSession(result.lastInsertRowid);
  res.status(201).json({ token, gym: db.get(`SELECT ${PROFIL_PUBLIC_FIELDS} FROM gyms WHERE id = ?`, [result.lastInsertRowid]) });
});

// POST /api/gym-auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  const gym = db.get('SELECT * FROM gyms WHERE email = ?', [email.trim().toLowerCase()]);
  if (!gym || !verifyPassword(password, gym.password_hash)) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const token = issueSession(gym.id);
  res.json({ token, gym: db.get(`SELECT ${PROFIL_PUBLIC_FIELDS} FROM gyms WHERE id = ?`, [gym.id]) });
});

// POST /api/gym-auth/logout
router.post('/logout', requireGymAuth, (req, res) => {
  const token = getToken(req);
  if (token) db.run('DELETE FROM gym_sessions WHERE token = ?', [token]);
  res.json({ ok: true });
});

// GET /api/gym-auth/me
router.get('/me', requireGymAuth, (req, res) => {
  res.json(db.get(`SELECT ${PROFIL_PUBLIC_FIELDS} FROM gyms WHERE id = ?`, [req.gym.id]));
});

// PUT /api/gym-auth/me — mise à jour partielle. Logique partagée avec
// PUT /api/admin/gyms/:id — voir lib/updateProfile.js.
router.put('/me', requireGymAuth, async (req, res) => {
  const result = await updateGymProfile(req.gym.id, req.body);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result.profile);
});

module.exports = router;
