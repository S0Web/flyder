const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db/database');
const { hashPassword, verifyPassword } = require('../lib/passwordHash');
const { requireGymAuth, getToken } = require('../middleware/auth');
const { geocodeAdresse } = require('../lib/geo');

const DUREE_SESSION_MS = 90 * 24 * 60 * 60 * 1000; // 90 jours
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_POSTAL_RE = /^\d{5}$/;
// Borne les champs libres : évite qu'un profil serve de dépotoir (spam, abus).
const clean = (v, max) => String(v ?? '').trim().slice(0, max);

function issueSession(gymId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + DUREE_SESSION_MS).toISOString();
  db.run('INSERT INTO gym_sessions (token, gym_id, expires_at) VALUES (?, ?, ?)', [token, gymId, expires]);
  return token;
}

const PROFIL_PUBLIC_FIELDS =
  'id, email, nom, adresse, code_postal, ville, lat, lng, disciplines_recherchees, description, photo_url, contact_nom, contact_email, contact_telephone, profil_complet, actif';

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

// PUT /api/gym-auth/me — mise à jour partielle, même logique que coachAuth.js.
router.put('/me', requireGymAuth, async (req, res) => {
  const current = db.get('SELECT * FROM gyms WHERE id = ?', [req.gym.id]);
  const b = req.body;

  const nom = b.nom !== undefined ? clean(b.nom, 120) : current.nom;
  const description = b.description !== undefined ? clean(b.description, 3000) : current.description;
  const contactNom = b.contact_nom !== undefined ? clean(b.contact_nom, 80) : current.contact_nom;
  const contactEmail = b.contact_email !== undefined ? clean(b.contact_email, 120) : current.contact_email;
  const contactTelephone = b.contact_telephone !== undefined ? clean(b.contact_telephone, 30) : current.contact_telephone;
  if (!nom) return res.status(400).json({ error: 'Nom de la salle requis' });
  if (contactEmail && !EMAIL_RE.test(contactEmail)) return res.status(400).json({ error: 'Email de contact invalide' });
  const actif = b.actif !== undefined ? (b.actif ? 1 : 0) : current.actif;
  const disciplinesRecherchees = b.disciplines_recherchees !== undefined
    ? (Array.isArray(b.disciplines_recherchees) ? b.disciplines_recherchees.join(',') : String(b.disciplines_recherchees))
    : current.disciplines_recherchees;

  // La ville vient obligatoirement d'une commune réelle choisie côté client
  // (autocomplétion Base Adresse Nationale) — jamais de saisie libre, même
  // raison que côté coach (voir coachAuth.js).
  if (b.code_postal !== undefined && b.code_postal && !CODE_POSTAL_RE.test(String(b.code_postal).trim())) {
    return res.status(400).json({ error: 'Code postal invalide (5 chiffres)' });
  }

  let adresse = current.adresse, codePostal = current.code_postal, ville = current.ville, lat = current.lat, lng = current.lng;
  let adresseChangee = false;
  if (b.adresse !== undefined) { const v = clean(b.adresse, 200); if (v !== (current.adresse || '')) { adresse = v; adresseChangee = true; } }
  if (b.code_postal !== undefined) { const v = clean(b.code_postal, 5); if (v !== (current.code_postal || '')) { codePostal = v; adresseChangee = true; } }
  if (b.ville !== undefined) { const v = clean(b.ville, 100); if (v !== (current.ville || '')) { ville = v; adresseChangee = true; } }

  if (adresseChangee) {
    const geo = (adresse && ville) ? await geocodeAdresse(`${adresse} ${ville}`, codePostal) : null;
    lat = geo ? geo.lat : null;
    lng = geo ? geo.lng : null;
  }

  const profilComplet = adresse && codePostal && ville && lat != null && disciplinesRecherchees ? 1 : 0;

  db.run(
    `UPDATE gyms SET nom=?, adresse=?, code_postal=?, ville=?, lat=?, lng=?, disciplines_recherchees=?, description=?, contact_nom=?, contact_email=?, contact_telephone=?, actif=?, profil_complet=?, updated_at=datetime('now') WHERE id=?`,
    [nom, adresse, codePostal, ville, lat, lng, disciplinesRecherchees, description, contactNom, contactEmail, contactTelephone, actif, profilComplet, req.gym.id]
  );

  res.json(db.get(`SELECT ${PROFIL_PUBLIC_FIELDS} FROM gyms WHERE id = ?`, [req.gym.id]));
});

module.exports = router;
