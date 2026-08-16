const db = require('../db/database');

function getToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Non authentifié' });

  const now = new Date().toISOString();
  const session = db.get(
    'SELECT s.*, a.id as aid, a.email, a.nom FROM sessions s JOIN admin_users a ON a.id = s.admin_user_id WHERE s.token = ? AND s.expires_at > ?',
    [token, now]
  );
  if (!session) return res.status(401).json({ error: 'Session expirée' });

  req.admin = { id: session.aid, email: session.email, nom: session.nom };
  next();
}

module.exports = { requireAuth, getToken };
