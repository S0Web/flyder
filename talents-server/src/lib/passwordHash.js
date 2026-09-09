const crypto = require('crypto');

// Hachage du mot de passe (PBKDF2, pas de dépendance externe) — copié tel quel
// de admin-server/src/lib/passwordHash.js, même technique déjà utilisée dans le
// reste du repo (server/src/lib/codeHash.js).
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const check = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(check, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { hashPassword, verifyPassword };
