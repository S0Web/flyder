const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();
const db      = require('../db/database');
const { requireAuth, getToken } = require('../middleware/auth');
const { hashCode, verifyCode } = require('../lib/codeHash');
const { isPrivileged } = require('../middleware/ipAccess');

function expiresAtMorning(hour = 6) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

// Anti-bruteforce sur le code confidentiel : sans ça, un code à 4 chiffres
// (10 000 combinaisons) se devine en quelques minutes vu que la liste des
// profils (avec leur id) est publique. En mémoire seulement — un simple
// process par salle, un redémarrage remet le compteur à zéro, ce qui est un
// compromis acceptable (pas pire qu'aucune protection, juste temporaire).
const MAX_TENTATIVES = 5;
const BLOCAGE_MS = 5 * 60 * 1000;
const tentativesEchouees = new Map(); // user_id -> { count, bloqueJusqua }

function blocageRestantMs(userId) {
  const entry = tentativesEchouees.get(userId);
  if (!entry || !entry.bloqueJusqua) return 0;
  return Math.max(0, entry.bloqueJusqua - Date.now());
}

function enregistrerEchec(userId) {
  const entry = tentativesEchouees.get(userId) || { count: 0, bloqueJusqua: 0 };
  entry.count += 1;
  if (entry.count >= MAX_TENTATIVES) {
    entry.bloqueJusqua = Date.now() + BLOCAGE_MS;
    entry.count = 0;
  }
  tentativesEchouees.set(userId, entry);
}

function reinitialiserTentatives(userId) {
  tentativesEchouees.delete(userId);
}

// Le porteur de la requête est-il déjà connecté en tant que manager ? Sert à
// verrouiller la définition/réinitialisation du code d'un profil manager :
// sans ça, un tiers non authentifié pourrait effacer puis redéfinir le code
// d'un manager depuis l'écran de sélection de profil (avant toute connexion)
// et obtenir une session manager complète.
function isAuthenticatedManager(req) {
  const token = getToken(req);
  if (!token) return false;
  const session = db.get(
    'SELECT u.role FROM sessions s JOIN app_users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?',
    [token, new Date().toISOString()]
  );
  return !!session && session.role === 'manager';
}

// GET /api/auth/profiles — liste des profils sélectionnables (public, sans email)
router.get('/profiles', (req, res) => {
  const profiles = db.all('SELECT id, prenom, nom, role, code_hash FROM app_users WHERE actif = 1 ORDER BY prenom, nom')
    .map(({ code_hash, ...p }) => ({ ...p, hasCode: !!code_hash }));
  res.json(profiles);
});

// POST /api/auth/profiles — création du tout premier profil (manager) d'une salle neuve,
// sans authentification puisqu'il n'existe encore personne pour s'authentifier. Dès qu'un
// profil existe, cette route se ferme : toute création passe ensuite par Paramètres >
// Utilisateurs (manager uniquement, POST /api/app-users).
router.post('/profiles', (req, res) => {
  const { prenom, nom, email } = req.body;
  if (!prenom || !prenom.trim()) return res.status(400).json({ error: 'Prénom requis' });

  const count = db.get('SELECT COUNT(*) as n FROM app_users').n;
  if (count > 0) {
    return res.status(403).json({ error: 'La création de profil se fait depuis Paramètres > Utilisateurs (manager).' });
  }
  const role = 'manager';

  try {
    const result = db.run(
      'INSERT INTO app_users (prenom, nom, email, role) VALUES (?, ?, ?, ?)',
      [prenom.trim(), (nom || '').trim(), email ? email.trim().toLowerCase() : null, role]
    );
    const user = db.get('SELECT id, prenom, nom, email, role FROM app_users WHERE id = ?', [result.lastInsertRowid]);
    db.run('INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [user.id, 'create_profile', 'app_users', user.id, `${user.prenom} ${user.nom}`.trim()]);
    res.status(201).json(user);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email déjà utilisé' });
    throw e;
  }
});

// POST /api/auth/select — choisir un profil (code confidentiel requis s'il en a un)
router.post('/select', (req, res) => {
  const { user_id, code } = req.body;
  const user = db.get('SELECT * FROM app_users WHERE id = ? AND actif = 1', [user_id]);
  if (!user) return res.status(404).json({ error: 'Profil introuvable' });

  if (user.code_hash) {
    const restantMs = blocageRestantMs(user.id);
    if (restantMs > 0) {
      return res.status(429).json({ error: `Trop de tentatives échouées. Réessaie dans ${Math.ceil(restantMs / 60000)} min.` });
    }
    if (!code) return res.status(400).json({ error: 'Code requis' });
    if (!verifyCode(code, user.code_hash)) {
      enregistrerEchec(user.id);
      return res.status(401).json({ error: 'Code incorrect' });
    }
    reinitialiserTentatives(user.id);
  } else if (user.role === 'manager' && !estPremierReglageManager(user.id)) {
    // Un manager sans code ne doit jamais rester sélectionnable librement (accès complet
    // sans aucune vérification) — sauf lors du tout premier réglage d'une salle neuve, où
    // l'app connecte le manager fraîchement créé avant même qu'il n'ait défini de code.
    // Hors de cette fenêtre précise (ex: code effacé via forget-code par un autre manager,
    // pendant les quelques secondes avant que le nouveau code ne soit redéfini), refuser
    // plutôt que d'ouvrir un accès manager à quiconque appelle cette route sans code.
    return res.status(403).json({ error: 'Ce profil manager doit avoir un code confidentiel défini. Demande à un autre manager de le configurer.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = expiresAtMorning();
  db.run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [token, user.id, expires]);

  db.run('INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
    [user.id, 'switch_profile', 'app_users', user.id, `Profil sélectionné depuis ${req.ip}`]);

  res.json({
    token,
    expires_at: expires,
    user: { id: user.id, prenom: user.prenom, nom: user.nom, email: user.email, role: user.role, privileged: isPrivileged({ user: { role: user.role }, ip: req.ip }) },
  });
});

// Un profil manager est-il encore dans son tout premier réglage (créé par
// POST /profiles, l'unique route qui crée un manager sans authentification —
// et jamais encore utilisé pour se connecter) ? Sert de fenêtre anonyme
// unique et non rejouable, utilisée à la fois par select ci-dessus (le tout
// premier manager d'une salle neuve se connecte avant même d'avoir un code)
// et par set-code ci-dessous : dès la première connexion (switch_profile en
// audit_log), la fenêtre se referme pour toujours, même si ce compte redevient
// plus tard le seul manager de la salle — un simple COUNT(*) sur app_users ne
// suffirait pas, il resterait vrai indéfiniment pour une salle à manager unique.
function estPremierReglageManager(userId) {
  const dejaConnecte = db.get("SELECT 1 FROM audit_log WHERE user_id = ? AND action = 'switch_profile'", [userId]);
  if (dejaConnecte) return false;
  return !!db.get("SELECT 1 FROM audit_log WHERE user_id = ? AND action = 'create_profile'", [userId]);
}

// POST /api/auth/set-code — crée le code confidentiel d'un profil (uniquement s'il n'en
// a pas déjà un ; pour changer un code existant, passer par "code oublié" d'abord).
// Pour un profil manager, réservé au tout premier réglage du tout premier compte d'une
// salle neuve (voir estPremierReglageManager) ou à un manager déjà connecté — jamais à
// un tiers anonyme, qui obtiendrait sinon une session manager complète en définissant
// lui-même le code d'un profil vidé par "code oublié".
router.post('/set-code', (req, res) => {
  const { user_id, code } = req.body;
  if (!code || code.trim().length < 4) return res.status(400).json({ error: 'Le code doit faire au moins 4 caractères' });
  const user = db.get('SELECT id, role, code_hash FROM app_users WHERE id = ? AND actif = 1', [user_id]);
  if (!user) return res.status(404).json({ error: 'Profil introuvable' });
  if (user.code_hash) return res.status(409).json({ error: 'Un code existe déjà pour ce profil' });

  if (user.role === 'manager' && !estPremierReglageManager(user.id) && !isAuthenticatedManager(req)) {
    return res.status(403).json({ error: "Définition du code d'un profil manager réservée à un manager déjà connecté." });
  }

  db.run('UPDATE app_users SET code_hash = ? WHERE id = ?', [hashCode(code.trim()), user.id]);
  res.json({ ok: true });
});

// POST /api/auth/forget-code — réinitialise (supprime) le code confidentiel d'un profil,
// sans vérification de l'ancien code. Volontairement peu sécurisé pour un profil non-
// manager (pas de lien avec une adresse mail encore) — sert surtout d'effet dissuasif.
// Pour un profil manager en revanche, réservé à un manager déjà connecté : sinon
// n'importe qui pourrait, depuis l'écran de sélection de profil et sans être
// authentifié, vider puis (via set-code) redéfinir le code d'un manager et obtenir
// un accès complet (RH, paie, sauvegarde de la base).
router.post('/forget-code', (req, res) => {
  const { user_id } = req.body;
  const user = db.get('SELECT id, role FROM app_users WHERE id = ? AND actif = 1', [user_id]);
  if (!user) return res.status(404).json({ error: 'Profil introuvable' });

  if (user.role === 'manager' && !isAuthenticatedManager(req)) {
    return res.status(403).json({ error: 'Réinitialisation du code manager réservée à un manager déjà connecté. Contactez un autre manager ou le support Flyder.' });
  }

  db.run('UPDATE app_users SET code_hash = NULL WHERE id = ?', [user.id]);
  res.json({ ok: true });
});

// POST /api/auth/logout — met fin à la session (= changer de profil côté client)
router.post('/logout', requireAuth, (req, res) => {
  const auth = req.headers.authorization;
  const token = auth?.slice(7);
  if (token) db.run('DELETE FROM sessions WHERE token = ?', [token]);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ ...req.user, privileged: isPrivileged(req) });
});

module.exports = { router };
