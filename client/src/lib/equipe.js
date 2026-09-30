import { toISO } from './utils';

// Libellés et couleurs partagés par l'onglet Équipe.

export const PRIORITES = {
  urgente: { label: 'Urgente', tone: 'red',   dot: '#D03B3B', rang: 0 },
  haute:   { label: 'Haute',   tone: 'amber', dot: '#F59E0B', rang: 1 },
  normale: { label: 'Normale', tone: 'blue',  dot: '#3D5AFE', rang: 2 },
  basse:   { label: 'Basse',   tone: 'gray',  dot: '#8B93A7', rang: 3 },
};

export const TYPES_INDICATEUR = {
  nombre: { label: 'Nombre' },
  oui_non: { label: 'Oui / non' },
  texte: { label: 'Texte' },
};

export const STATUTS_TACHE = {
  a_faire:  { label: 'À faire',  tone: 'gray' },
  en_cours: { label: 'En cours', tone: 'blue' },
  fait:     { label: 'Terminée', tone: 'green' },
};

export const RECURRENCES = {
  aucune:       'Une seule fois',
  quotidienne:  'Tous les jours',
  hebdomadaire: 'Toutes les semaines',
  mensuelle:    'Tous les mois',
};

export const RECURRENCES_COURT = {
  quotidienne:  'Chaque jour',
  hebdomadaire: 'Chaque semaine',
  mensuelle:    'Chaque mois',
};

export const STATUTS_CR = {
  brouillon: { label: 'Brouillon',  tone: 'gray',  couleur: '#CBCDD5' },
  soumis:    { label: 'À valider',  tone: 'amber', couleur: '#F59E0B' },
  valide:    { label: 'Validé',     tone: 'green', couleur: '#0CA30C' },
  a_revoir:  { label: 'À revoir',   tone: 'red',   couleur: '#D03B3B' },
};

export const TYPES_ABSENCE = {
  cp:     { label: 'Congé payé', court: 'CP' },
  ecole:  { label: 'École',      court: 'École' },
  ferie:  { label: 'Férié',      court: 'Férié' },
  arret:  { label: 'Arrêt',      court: 'Arrêt' },
  absent: { label: 'Absent',     court: 'Absent' },
  repos:  { label: 'Repos',      court: 'Repos' },
};

export const aujourdhuiISO = () => toISO(new Date());

export function isoPlusJours(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return toISO(new Date(y, m - 1, d + n));
}

export function dateDepuisISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Écart en jours entre deux dates calendaires (b - a).
export function ecartJours(a, b) {
  return Math.round((dateDepuisISO(b) - dateDepuisISO(a)) / 86400000);
}

// « Aujourd'hui », « Demain », « En retard · 3 j », « jeu. 9 oct. »
export function libelleEcheance(echeance, fait = false) {
  if (!echeance) return { texte: 'Sans échéance', ton: 'gray' };
  const n = ecartJours(aujourdhuiISO(), echeance);
  if (!fait && n < 0) return { texte: n === -1 ? 'En retard · hier' : `En retard · ${-n} j`, ton: 'red' };
  if (n === 0) return { texte: "Aujourd'hui", ton: fait ? 'gray' : 'amber' };
  if (n === 1) return { texte: 'Demain', ton: 'blue' };
  if (n > 1 && n < 7) return { texte: dateDepuisISO(echeance).toLocaleDateString('fr-FR', { weekday: 'long' }), ton: 'gray' };
  return { texte: dateDepuisISO(echeance).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }), ton: 'gray' };
}

export function jourLong(iso) {
  const s = dateDepuisISO(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function jourCourt(iso) {
  return dateDepuisISO(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtHeure(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

export function fmtDuree(minutes) {
  if (!minutes) return '0h';
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

// Écart entre les heures planifiées et le contrat, en minutes (positif = au-delà du contrat).
// null quand le membre n'a pas d'heures de contrat renseignées.
export function ecartContrat(minutesPlanifiees, heuresContrat) {
  if (!heuresContrat) return null;
  return Math.round((minutesPlanifiees || 0) - heuresContrat * 60);
}

export function minutesCreneau(c) {
  if (!c.debut || !c.fin) return 0;
  const [h1, m1] = c.debut.split(':').map(Number);
  const [h2, m2] = c.fin.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

// Salutation selon l'heure.
export function salutation() {
  const h = new Date().getHours();
  return h < 5 ? 'Bonsoir' : h < 18 ? 'Bonjour' : 'Bonsoir';
}

export const nomComplet = (u) => `${u?.prenom || ''} ${u?.nom || ''}`.trim();
