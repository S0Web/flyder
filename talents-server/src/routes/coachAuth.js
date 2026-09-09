const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db/database');
const { hashPassword, verifyPassword } = require('../lib/passwordHash');
const { requireCoachAuth, getToken } = require('../middleware/auth');
const { geocodeAdresse } = require('../lib/geo');

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

const PROFIL_PUBLIC_FIELDS =
  'id, email, nom, prenom, adresse, lat, lng, disciplines, tarif_horaire, bio, photo_url, telephone, email_public, profil_complet';

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
// l'adresse n'est pas renvoyée à chaque appel).
router.put('/me', requireCoachAuth, async (req, res) => {
  const current = db.get('SELECT * FROM coaches WHERE id = ?', [req.coach.id]);
  const b = req.body;

  const nom = b.nom !== undefined ? clean(b.nom, 80) : current.nom;
  const prenom = b.prenom !== undefined ? clean(b.prenom, 80) : current.prenom;
  const bio = b.bio !== undefined ? clean(b.bio, 2000) : current.bio;
  const telephone = b.telephone !== undefined ? clean(b.telephone, 30) : current.telephone;
  if (!nom || !prenom) return res.status(400).json({ error: 'Nom et prénom requis' });
  const tarifHoraire = b.tarif_horaire !== undefined ? (b.tarif_horaire === null ? null : Number(b.tarif_horaire)) : current.tarif_horaire;
  const emailPublic = b.email_public !== undefined ? (b.email_public ? 1 : 0) : current.email_public;
  const disciplines = b.disciplines !== undefined
    ? (Array.isArray(b.disciplines) ? b.disciplines.join(',') : String(b.disciplines))
    : current.disciplines;

  let adresse = current.adresse, lat = current.lat, lng = current.lng;
  if (b.adresse !== undefined) {
    const adresseTrim = clean(b.adresse, 200);
    if (adresseTrim !== (current.adresse || '')) {
      adresse = adresseTrim;
      const geo = adresseTrim ? await geocodeAdresse(adresseTrim) : null;
      lat = geo ? geo.lat : null;
      lng = geo ? geo.lng : null;
    }
  }

  const profilComplet = adresse && lat != null && disciplines ? 1 : 0;

  db.run(
    `UPDATE coaches SET nom=?, prenom=?, adresse=?, lat=?, lng=?, disciplines=?, tarif_horaire=?, bio=?, telephone=?, email_public=?, profil_complet=?, updated_at=datetime('now') WHERE id=?`,
    [nom, prenom, adresse, lat, lng, disciplines, tarifHoraire, bio, telephone, emailPublic, profilComplet, req.coach.id]
  );

  res.json(db.get(`SELECT ${PROFIL_PUBLIC_FIELDS} FROM coaches WHERE id = ?`, [req.coach.id]));
});

module.exports = router;
