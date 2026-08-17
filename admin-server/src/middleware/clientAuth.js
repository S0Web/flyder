const crypto = require('crypto');
const db = require('../db/database');
const { getToken } = require('./auth');

// Authentifie un SERVEUR de salle (pas un humain) : la clé n'est jamais stockée
// en clair, on hache la valeur reçue et on compare des empreintes (même principe
// que code_hash pour le PIN des profils).
function hashKey(clair) {
  return crypto.createHash('sha256').update(clair).digest('hex');
}

function requireClientApiKey(req, res, next) {
  const key = getToken(req);
  if (!key) return res.status(401).json({ error: 'Non authentifié' });

  const client = db.get('SELECT id, nom, statut FROM clients WHERE api_key_hash = ?', [hashKey(key)]);
  if (!client) return res.status(401).json({ error: 'Clé invalide' });

  req.client = client;
  next();
}

module.exports = { requireClientApiKey, hashKey };
