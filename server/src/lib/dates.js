// Dates "calendrier" (YYYY-MM-DD) dans le fuseau de la salle (process.env.TZ,
// fixé dans index.js) — jamais via toISOString(), qui passe en UTC et décale
// d'un jour entre minuit et 2h du matin l'été.

const pad = (n) => String(n).padStart(2, '0');

function dateLocaleISO(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function depuisISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function ajouterJours(iso, n) {
  const d = depuisISO(iso);
  d.setDate(d.getDate() + n);
  return dateLocaleISO(d);
}

// +n mois en restant sur le même quantième, ramené au dernier jour du mois si
// besoin (31 janvier + 1 mois = 28/29 février, pas 3 mars).
function ajouterMois(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dernierJour = new Date(y, m - 1 + n + 1, 0).getDate();
  return dateLocaleISO(new Date(y, m - 1 + n, Math.min(d, dernierJour)));
}

// Lundi de la semaine contenant `iso`.
function lundiDe(iso) {
  const d = depuisISO(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dateLocaleISO(d);
}

// Les horaires de séance sont saisis tantôt « 9h », « 12h15 », tantôt « 18:30 » : renvoie les
// minutes depuis minuit, ou null si le format est illisible.
function horaireEnMinutes(horaire) {
  const m = /^(\d{1,2})\s*[h:]\s*(\d{0,2})/i.exec(String(horaire || ''));
  if (!m) return null;
  return Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0);
}

module.exports = { dateLocaleISO, depuisISO, ajouterJours, ajouterMois, lundiDe, horaireEnMinutes };
