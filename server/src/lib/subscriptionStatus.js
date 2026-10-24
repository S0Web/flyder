// Statut d'abonnement de CETTE salle, interrogé périodiquement auprès
// d'admin-server (jamais à chaque requête : ce serait un aller-retour réseau
// systématique). Mis en cache en mémoire, avec repli sur le dernier état connu
// en cas d'échec réseau — on ne bloque jamais une salle à jour à cause d'une
// simple coupure momentanée avec admin-server.
const { adminApi, SupportIndisponibleError } = require('./adminApi');

// modules : tout activé par défaut (salle de sport classique, comportement
// historique de Flyder) — en échec réseau, ou tant qu'admin-server n'a jamais
// répondu, ou s'il répond sans ce champ (version pas encore à jour), on ne
// masque jamais rien à tort plutôt que de risquer de bloquer une salle.
const MODULES_PAR_DEFAUT = { sport: true, equipe: true, annuaire: true };
let cache = { statut: null, bloque: false, avertissement: false, joursRestants: null, modules: MODULES_PAR_DEFAUT };
const INTERVALLE_MS = 60 * 60 * 1000; // 1h — la facturation ne change pas assez souvent pour justifier plus fréquent

async function refresh() {
  try {
    const reponse = await adminApi('/status');
    cache = { ...reponse, modules: { ...MODULES_PAR_DEFAUT, ...reponse.modules } };
  } catch (err) {
    // ADMIN_API_URL/KEY non configurés, ou admin-server injoignable : on garde
    // le dernier état connu (ou l'état par défaut "tout va bien" au tout premier
    // essai) plutôt que de risquer un blocage à tort.
    if (!(err instanceof SupportIndisponibleError)) console.error('Statut abonnement : erreur inattendue', err.message);
  }
}

function getCachedStatus() {
  return cache;
}

function scheduleStatusPolling() {
  refresh();
  setInterval(refresh, INTERVALLE_MS);
}

module.exports = { getCachedStatus, scheduleStatusPolling };
