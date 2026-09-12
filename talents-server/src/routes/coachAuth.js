const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db/database');
const { hashPassword, verifyPassword } = require('../lib/passwordHash');
const { requireCoachAuth, getToken } = require('../middleware/auth');
const { updateCoachProfile, COACH_FIELDS } = require('../lib/updateProfile');

const DUREE_SESSION_MS = 90 * 24 * 60 * 60 * 1000; // 90 jours
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Borne les champs libres : évite qu'un profil serve de dépotoir (spam, abus).
const clean = (v, max) => String(v ?? '').trim().slice(0, max);

function issueSession(coachId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + DUREE_SESSION_MS).toISOString();
  db.run('INSERT INTO coach_sessions (token, coach_id, expires_at) VALUES (?, ?, ?)', [token, coachId, expires]);
  return token;
}

const PROFIL_PUBLIC_FIELDS = COACH_FIELDS;

// POST /api/coach-auth/signup
router.post('/signup', (req, res) => {
  const { email, password, nom, prenom } = req.body;
  if (!email || !EMAIL_RE.test(String(email).trim())) return res.status(400).json({ error: 'Adresse email invalide' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
  if (!clean(nom, 80) || !clean(prenom, 80)) return res.status(400).json({ error: 'Nom et prénom requis' });

  const emailNorm = String(email).trim().toLowerCase().slice(0, 120);
  if (db.get('SELECT id FROM coaches WHERE email = ?', [emailNorm])) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
  }

  const result = db.run(
    'INSERT INTO coaches (email, password_hash, nom, prenom) VALUES (?, ?, ?, ?)',
    [emailNorm, hashPassword(password), clean(nom, 80), clean(prenom, 80)]
  );
  const token = issueSession(result.lastInsertRowid);
  res.status(201).json({ token, coach: db.get(`SELECT ${PROFIL_PUBLIC_FIELDS} FROM coaches WHERE id = ?`, [result.lastInsertRowid]) });
});

// POST /api/coach-auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  const coach = db.get('SELECT * FROM coaches WHERE email = ?', [email.trim().toLowerCase()]);
  if (!coach || !verifyPassword(password, coach.password_hash)) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const token = issueSession(coach.id);
  res.json({ token, coach: db.get(`SELECT ${PROFIL_PUBLIC_FIELDS} FROM coaches WHERE id = ?`, [coach.id]) });
});

// POST /api/coach-auth/logout
router.post('/logout', requireCoachAuth, (req, res) => {
  const token = getToken(req);
  if (token) db.run('DELETE FROM coach_sessions WHERE token = ?', [token]);
  res.json({ ok: true });
});

// GET /api/coach-auth/me
router.get('/me', requireCoachAuth, (req, res) => {
  res.json(db.get(`SELECT ${PROFIL_PUBLIC_FIELDS} FROM coaches WHERE id = ?`, [req.coach.id]));
});

// PUT /api/coach-auth/me — mise à jour partielle : seuls les champs envoyés
// changent, le reste garde sa valeur actuelle (évite d'écraser lat/lng si
// l'adresse n'est pas renvoyée à chaque appel). Logique partagée avec
// PUT /api/admin/coaches/:id — voir lib/updateProfile.js.
router.put('/me', requireCoachAuth, async (req, res) => {
  const result = await updateCoachProfile(req.coach.id, req.body);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result.profile);
});

module.exports = router;
