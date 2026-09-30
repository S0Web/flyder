const crypto = require('crypto');

// Déverrouillage temporaire des documents RH (fiches de paie, contrat, arrêts) :
// la session seule ne suffit pas — l'app tourne souvent sur une tablette partagée
// à l'accueil, où un profil peut rester connecté pendant que quelqu'un d'autre
// passe. Ressaisir son code donne un jeton valable DUREE_MS, à renvoyer dans
// l'en-tête X-Unlock-Token. En mémoire seulement : un redémarrage du serveur
// demande simplement de ressaisir le code.
const DUREE_MS = 10 * 60 * 1000;
const jetons = new Map(); // jeton -> { userId, expire }

function creerJeton(userId) {
  const now = Date.now();
  for (const [j, v] of jetons) if (v.expire < now) jetons.delete(j);
  const jeton = crypto.randomBytes(24).toString('hex');
  const expire = now + DUREE_MS;
  jetons.set(jeton, { userId, expire });
  return { jeton, expire: new Date(expire).toISOString() };
}

function jetonValide(req) {
  const jeton = req.headers['x-unlock-token'];
  if (!jeton) return false;
  const entry = jetons.get(jeton);
  if (!entry || entry.expire < Date.now()) return false;
  return entry.userId === req.user?.id;
}

// À placer après requireAuth.
function requireDeverrouillage(req, res, next) {
  if (jetonValide(req)) return next();
  return res.status(423).json({ error: 'verrouille' });
}

module.exports = { creerJeton, requireDeverrouillage };
