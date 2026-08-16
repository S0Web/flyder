// Crée (ou met à jour le mot de passe d') un compte admin. Pas de flux
// d'inscription — ce back-office n'a qu'un seul propriétaire, ce script sert
// à créer ce compte une fois (en local ou via `railway run`, jamais exposé en HTTP).
// Usage : node src/db/createAdmin.js email@exemple.fr motdepasse "Prénom Nom"
const db = require('./database');
const { hashPassword } = require('../lib/passwordHash');

const [, , email, password, nom] = process.argv;

if (!email || !password) {
  console.error('Usage : node src/db/createAdmin.js email motdepasse "Nom"');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Le mot de passe doit faire au moins 8 caractères.');
  process.exit(1);
}

const existing = db.get('SELECT id FROM admin_users WHERE email = ?', [email.trim().toLowerCase()]);
if (existing) {
  db.run('UPDATE admin_users SET password_hash = ? WHERE id = ?', [hashPassword(password), existing.id]);
  console.log(`✅ Mot de passe mis à jour pour ${email}`);
} else {
  db.run(
    'INSERT INTO admin_users (email, password_hash, nom) VALUES (?, ?, ?)',
    [email.trim().toLowerCase(), hashPassword(password), nom || '']
  );
  console.log(`✅ Compte admin créé pour ${email}`);
}
