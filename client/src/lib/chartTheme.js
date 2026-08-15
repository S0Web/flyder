// Jetons de couleur et formateurs des graphiques. Séparés des composants pour
// que Charts.jsx n'exporte que des composants (sinon le rafraîchissement à chaud
// de Vite retombe sur un rechargement complet à chaque édition).

// Palette catégorielle = les deux couleurs de la charte (bleu Flyder / corail).
// Vérifiée avec le validateur daltonisme : ΔE 31,4 (protanopie) et 42,0 en vision
// normale, les deux au-dessus de 3:1 sur fond blanc. On s'arrête à deux séries :
// tout le reste du tableau de bord encode une grandeur (magnitude), pas une
// identité — donc rampe séquentielle d'une seule teinte, jamais un arc-en-ciel.
export const VIZ = {
  aqua:      '#3D5AFE',
  fitness:   '#FF5A36',
  ink:       '#12162B',
  secondary: '#5A6072',
  muted:     '#8B93A7',
  grid:      '#E9E8E3',
  axis:      '#CBCDD5',
  surface:   '#FFFFFF',
  good:      '#0CA30C',
  critical:  '#D03B3B',
};

// Rampe séquentielle (bleu de la charte, clair → foncé) pour les magnitudes.
export const RAMP = ['#EEF1FF', '#DBE1FF', '#B5C0FF', '#8395FE', '#5F77FE', '#3D5AFE', '#1E3EE8', '#0122DC'];

export const CAT_COLOR = { aqua: VIZ.aqua, fitness: VIZ.fitness };
export const CAT_LABEL = { aqua: 'Aqua', fitness: 'Fitness' };

// ── Formatage ──────────────────────────────────────────────────────────────────
export const fmtInt = (n) => (n == null ? '—' : Math.round(n).toLocaleString('fr-FR'));
export const fmtDec = (n, d = 1) => (n == null ? '—' : n.toFixed(d).replace('.', ','));
export const fmtPct = (n, d = 1) => (n == null ? '—' : `${n.toFixed(d).replace('.', ',')} %`);

const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
export const moisCourt = (iso) => {
  const m = Number(iso?.slice(5, 7));
  return m ? `${MOIS_COURTS[m - 1]} ${iso.slice(2, 4)}` : iso;
};

export const JOURS_COURTS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
export const JOURS_LONGS  = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
