const db = require('../db/database');

function getToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

// Résout l'acteur connecté ({ type: 'gym'|'coach', id }) ou null, sans jamais
// répondre 401 : sert aux routes publiques qui enrichissent leur réponse quand
// quelqu'un est connecté (ex. marquer les profils déjà contactés).
function resolveActor(req) {
  const token = getToken(req);
  if (!token) return null;
  const now = new Date().toISOString();

  const gymSession = db.get(
    'SELECT g.id FROM gym_sessions s JOIN gyms g ON g.id = s.gym_id WHERE s.token = ? AND s.expires_at > ?',
    [token, now]
  );
  if (gymSession) return { type: 'gym', id: gymSession.id };

  const coachSession = db.get(
    'SELECT c.id FROM coach_sessions s JOIN coaches c ON c.id = s.coach_id WHERE s.token = ? AND s.expires_at > ?',
    [token, now]
  );
  if (coachSession) return { type: 'coach', id: coachSession.id };

  return null;
}

function requireCoachAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Non authentifié' });

  const now = new Date().toISOString();
  const session = db.get(
    'SELECT s.*, c.id as cid, c.email, c.nom, c.prenom FROM coach_sessions s JOIN coaches c ON c.id = s.coach_id WHERE s.token = ? AND s.expires_at > ?',
    [token, now]
  );
  if (!session) return res.status(401).json({ error: 'Session expirée' });

  req.coach = { id: session.cid, email: session.email, nom: session.nom, prenom: session.prenom };
  next();
}

function requireGymAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Non authentifié' });

  const now = new Date().toISOString();
  const session = db.get(
    'SELECT s.*, g.id as gid, g.email, g.nom FROM gym_sessions s JOIN gyms g ON g.id = s.gym_id WHERE s.token = ? AND s.expires_at > ?',
    [token, now]
  );
  if (!session) return res.status(401).json({ error: 'Session expirée' });

  req.gym = { id: session.gid, email: session.email, nom: session.nom };
  next();
}

// Routes accessibles aussi bien à une salle qu'à un coach (ex. contacter).
function requireAnyAuth(req, res, next) {
  if (!getToken(req)) return res.status(401).json({ error: 'Non authentifié' });
  const actor = resolveActor(req);
  if (!actor) return res.status(401).json({ error: 'Session expirée' });
  req.actor = actor;
  next();
}

module.exports = { getToken, resolveActor, requireCoachAuth, requireGymAuth, requireAnyAuth };
