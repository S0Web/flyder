// Bloque l'usage de l'app pour tout le monde SAUF les managers, une fois le
// délai de grâce écoulé sur un abonnement suspendu/résilié (voir
// lib/subscriptionStatus.js pour le calcul de l'état, remis à jour toutes
// les heures). Fait sa propre lecture de session plutôt que de dépendre de
// req.user : certaines routes gèrent leur authentification elles-mêmes plus
// bas dans la chaîne, ce middleware doit donc pouvoir s'appliquer AVANT elles.
const db = require('../db/database');
const { getToken } = require('./auth');
const { getCachedStatus } = require('../lib/subscriptionStatus');

function requireSubscriptionActive(req, res, next) {
  const status = getCachedStatus();
  if (!status.bloque) return next();

  const token = getToken(req);
  if (!token) return next(); // pas de session : la route protégée gérera le 401 normalement

  const session = db.get(
    'SELECT u.role FROM sessions s JOIN app_users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?',
    [token, new Date().toISOString()]
  );
  if (session && session.role === 'manager') return next(); // le manager garde l'accès pour régulariser

  res.status(402).json({
    error: 'abonnement_bloque',
    message: "L'abonnement de cette salle n'est plus actif. Contactez votre manager pour régulariser la situation.",
  });
}

module.exports = { requireSubscriptionActive };
