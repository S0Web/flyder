const db = require('../db/database');

// Point d'écriture unique pour le journal d'audit (Historique, Paramètres >
// manager) — évite de répéter la requête INSERT dans chaque route. `entityId`
// et `details` sont optionnels (null par défaut) : certaines actions
// (ex. préférences de la salle) ne concernent pas une ligne précise.
function logAudit({ userId, action, entity, entityId = null, details = null }) {
  db.run(
    'INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
    [userId, action, entity, entityId, details]
  );
}

module.exports = { logAudit };
