export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const STATUT_CONFIG = {
  programme: { label: 'Programmé', shortLabel: 'Prog.',  bg: 'bg-gray-200',    text: 'text-gray-700',  solid: 'bg-gray-400' },
  effectue:  { label: 'Effectué',  shortLabel: 'Eff.',   bg: 'bg-green-500',   text: 'text-white',     solid: 'bg-green-500' },
  annule:    { label: 'Annulé',    shortLabel: 'Annulé', bg: 'bg-red-100',     text: 'text-red-600',   solid: 'bg-red-500' },
  paye:      { label: 'Payé',      shortLabel: 'Payé',   bg: 'bg-emerald-700', text: 'text-white',     solid: 'bg-emerald-700' },
};

// Catégories — paliers d'intensité pour rester lisible sans être criard :
// cell (fond très pâle des colonnes), card (fond pastel des cartes), accent
// (pastille/badge, couleur pleine), label (fond plein de la colonne
// Aqua/Fitness — porte l'encre pour fitness, jamais le corail : cf. règle
// charte "le corail n'est jamais dominant").
export const CATEGORIE_CONFIG = {
  aqua:    { bg: 'bg-aqua-light',   border: 'border-aqua',   dot: 'bg-aqua',
             cell: '#F5F7FF', card: '#E4E9FF', accent: '#3D5AFE', label: '#3D5AFE' },
  fitness: { bg: 'bg-fitness-light', border: 'border-fitness', dot: 'bg-fitness',
             cell: '#FFF6F1', card: '#FFE7D9', accent: '#FF5A36', label: '#12162B' },
};

// Disciplines des coachs — utilisé par la fiche Coach (Coaches.jsx) et l'Annuaire.
export const DISCIPLINE_CONFIG = {
  aqua:          { label: 'Aqua',          bg: 'bg-sky-100',     text: 'text-sky-700',     accent: 'accent-sky-500' },
  fitness:       { label: 'Fitness',       bg: 'bg-amber-100',   text: 'text-amber-700',   accent: 'accent-amber-500' },
  boxe:          { label: 'Boxe',          bg: 'bg-red-100',     text: 'text-red-700',     accent: 'accent-red-500' },
  crosstraining: { label: 'Crosstraining', bg: 'bg-emerald-100', text: 'text-emerald-700', accent: 'accent-emerald-500' },
  poledance:     { label: 'Pole Dance',    bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', accent: 'accent-fuchsia-500' },
};

// Palette déterministe pour les bulles de profil (façon PlayStation)
const BUBBLE_PALETTE = ['#2fa8cc', '#c9a464', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
export function colorForUser(id) {
  return BUBBLE_PALETTE[id % BUBBLE_PALETTE.length];
}

// Retourne le lundi de la semaine contenant `date`
export function getLundi(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Retourne les 7 dates (lundi→dimanche) de la semaine
export function getSemaine(lundi) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// Utilise l'heure locale (pas UTC) pour éviter le décalage timezone
export function toISO(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatDateShort(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function semaineSuivante(lundi) {
  const d = new Date(lundi);
  d.setDate(d.getDate() + 7);
  return d;
}

export function semainePrecedente(lundi) {
  const d = new Date(lundi);
  d.setDate(d.getDate() - 7);
  return d;
}

// Le serveur stocke les created_at en UTC via SQLite datetime('now'), au format
// "YYYY-MM-DD HH:MM:SS" sans indicateur de fuseau. Sans le 'Z', le navigateur
// interprète ce format comme une heure déjà locale (pas d'UTC → local) et
// affiche l'heure décalée (ex. 2h de retard en été). On force l'UTC explicitement.
export function parseServerDate(s) {
  return new Date(s.replace(' ', 'T') + 'Z');
}
