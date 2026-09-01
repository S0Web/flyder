const crypto = require('crypto');
const db = require('./database');
const { hashCode } = require('../lib/codeHash');

// Crée le tout premier profil (manager, nommé "Admin") d'une salle neuve, avec
// un code confidentiel déjà défini — pour qu'il n'y ait jamais de fenêtre où
// n'importe qui visitant l'URL avant le client peut créer/réclamer ce premier
// compte (POST /api/auth/profiles reste ouvert par sécurité mais ne sert plus
// en pratique : la base n'est plus jamais vide au moment où un visiteur peut
// l'atteindre).
//
// Le code n'est PAS une constante partagée par toutes les salles (un "0000"
// universel serait aussi mauvais que l'absence de code : un attaquant qui
// connaît le pattern n'a même pas besoin de deviner). Il est soit fourni via
// SALLE_ADMIN_PIN (déployeur qui veut le choisir à l'avance), soit généré
// aléatoirement et affiché UNE SEULE FOIS dans les logs de démarrage — à
// récupérer dans les logs Railway pour le transmettre au client. Le client
// renomme ensuite ce profil à son nom et change le code depuis Paramètres.
function seedAdminAccount() {
  try {
    const { n } = db.get('SELECT COUNT(*) AS n FROM app_users');
    if (n > 0) return;

    const pin = process.env.SALLE_ADMIN_PIN || String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const result = db.run(
      'INSERT INTO app_users (prenom, nom, role, code_hash) VALUES (?, ?, ?, ?)',
      ['Admin', '', 'manager', hashCode(pin)]
    );
    db.run('INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [result.lastInsertRowid, 'seed_admin_account', 'app_users', result.lastInsertRowid, 'Compte Admin créé automatiquement au premier démarrage']);

    console.log('👤 Compte "Admin" (manager) créé — code confidentiel : ' + pin);
    console.log('   À transmettre au client par un canal que tu contrôles (jamais affiché dans l\'app).');
  } catch (e) {
    console.error('seedAdminAccount error:', e.message);
  }
}

module.exports = { seedAdminAccount };
