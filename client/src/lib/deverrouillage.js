// Jeton de déverrouillage des documents RH (voir server/src/lib/deverrouillage.js).
// Gardé en mémoire uniquement — jamais en localStorage : recharger la page ou
// changer de profil reverrouille, ce qui est le comportement voulu sur une
// tablette partagée.
let courant = null; // { jeton, expire (ms) }
const abonnes = new Set();

function notifier() {
  abonnes.forEach(fn => fn());
}

export function enregistrerDeverrouillage({ jeton, expire }) {
  courant = { jeton, expire: new Date(expire).getTime() };
  notifier();
}

export function oublierDeverrouillage() {
  if (!courant) return;
  courant = null;
  notifier();
}

export function getJetonDeverrouillage() {
  if (courant && courant.expire > Date.now()) return courant.jeton;
  return null;
}

export function getExpirationDeverrouillage() {
  return courant && courant.expire > Date.now() ? courant.expire : null;
}

export function abonnerDeverrouillage(fn) {
  abonnes.add(fn);
  return () => abonnes.delete(fn);
}
