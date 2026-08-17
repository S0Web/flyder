// Relais vers le backoffice central (admin-server) : c'est là que vivent tous
// les tickets de support, toutes salles confondues (cf. docs/plan support).
// Ce fichier est le SEUL endroit du serveur salle qui connaît ADMIN_API_KEY —
// jamais envoyée au navigateur.
const BASE = process.env.ADMIN_API_URL;
const KEY  = process.env.ADMIN_API_KEY;

function isConfigured() {
  return !!(BASE && KEY);
}

// Erreur dédiée pour que les routes appelantes distinguent "pas configuré /
// backoffice injoignable" (503, message chaleureux) d'une vraie erreur métier.
class SupportIndisponibleError extends Error {}

async function adminApi(path, options = {}) {
  if (!isConfigured()) throw new SupportIndisponibleError('ADMIN_API_URL/ADMIN_API_KEY non configurés');

  let res;
  try {
    res = await fetch(`${BASE}/api/gym${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}`, ...options.headers },
    });
  } catch (err) {
    throw new SupportIndisponibleError(err.message);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 401 ici veut dire une clé mal configurée côté salle — traité comme
    // "indisponible" côté utilisateur final, pas comme une erreur à lui montrer.
    if (res.status === 401) throw new SupportIndisponibleError(body.error || 'Clé API invalide');
    const err = new Error(body.error || `Erreur ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

module.exports = { adminApi, isConfigured, SupportIndisponibleError };
