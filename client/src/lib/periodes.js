// Bornes de période partagées par le Récapitulatif et la page Analyse : les deux
// pages proposent les mêmes modes (année scolaire / plage / tout temps) et le
// même comparatif « vs période précédente », donc une seule implémentation.

export function getAcademicYear() {
  const now  = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1; // septembre = mois 8
  return { year, debut: `${year}-09-01`, fin: `${year + 1}-08-31` };
}

export function fmtDateFr(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function periodeLabel(mode, anneeScolaire, plageDebut, plageFin) {
  if (mode === 'tout') return 'De tout temps';
  if (mode === 'scolaire') return `Saison ${anneeScolaire}–${anneeScolaire + 1}`;
  if (!plageDebut || !plageFin) return 'Plage personnalisée';
  return `${fmtDateFr(plageDebut)} → ${fmtDateFr(plageFin)}`;
}

export function previousPeriodRange(debut, fin) {
  if (!debut || !fin) return null;
  const [y0, m0, d0] = debut.split('-').map(Number);
  const [y1, m1, d1] = fin.split('-').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  const lastDayOfMonth = (y, m) => new Date(y, m, 0).getDate(); // m 1-indexé

  // Plage alignée sur des mois civils complets (ex. un mois entier, ou une saison
  // scolaire) : on décale d'autant de mois civils plutôt que d'un nombre de jours,
  // sinon "septembre" se comparerait à "2 août → 31 août" au lieu d'août entier.
  if (d0 === 1 && d1 === lastDayOfMonth(y1, m1)) {
    const nbMois = (y1 - y0) * 12 + (m1 - m0) + 1;
    let endY = y0, endM = m0 - 1;
    if (endM === 0) { endM = 12; endY -= 1; }
    let startY = endY, startM = endM - nbMois + 1;
    while (startM <= 0) { startM += 12; startY -= 1; }
    return {
      debut: `${startY}-${pad(startM)}-01`,
      fin:   `${endY}-${pad(endM)}-${pad(lastDayOfMonth(endY, endM))}`,
    };
  }

  // Plage arbitraire (ex. dates piochées à la main) : décalage par durée en jours.
  const start = new Date(y0, m0 - 1, d0);
  const end   = new Date(y1, m1 - 1, d1);
  const dureeJours = Math.round((end - start) / 86400000) + 1;
  const prevFin = new Date(start); prevFin.setDate(prevFin.getDate() - 1);
  const prevDebut = new Date(prevFin); prevDebut.setDate(prevDebut.getDate() - (dureeJours - 1));
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { debut: iso(prevDebut), fin: iso(prevFin) };
}

// Barre de filtres commune (période + catégorie). Un seul jeu de filtres au-dessus
// de tous les graphiques : jamais de filtre par carte, sinon deux cartes côte à
// côte peuvent afficher deux tranches différentes sans que ça se voie.
export const ANNEES_DISPONIBLES = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 5 + i);
