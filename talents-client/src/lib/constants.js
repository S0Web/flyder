// Vocabulaire de disciplines pour Flyder Talents, organisé en deux volets
// (beaucoup de salles ont un bassin et cherchent aussi des coachs aqua, en
// plus des cours collectifs classiques) — chaque volet a sa propre entrée
// "Autre" à texte libre pour les cas non listés.
export const DISCIPLINE_CATEGORIES = [
  {
    key: 'fitness',
    label: 'Fitness',
    disciplines: [
      { value: 'pilates', label: 'Pilates' },
      { value: 'pilates_reformer', label: 'Pilates reformer' },
      { value: 'stretching', label: 'Stretching' },
      { value: 'yoga', label: 'Yoga' },
      { value: 'renforcement_choregraphie', label: 'Renforcement chorégraphié' },
      { value: 'cardio_choregraphie', label: 'Cardio chorégraphié' },
      { value: 'lesmills_bodypump', label: 'Lesmills Bodypump' },
      { value: 'lesmills_rpm', label: 'Lesmills RPM' },
      { value: 'lesmills_bodycombat', label: 'Lesmills Bodycombat' },
      { value: 'step', label: 'Step' },
      { value: 'zumba', label: 'Zumba' },
      { value: 'crossfit', label: 'Crossfit' },
      { value: 'boxe', label: 'Boxe' },
      { value: 'autre_fitness', label: 'Autre', autre: true },
    ],
  },
  {
    key: 'aqua',
    label: 'Aqua',
    disciplines: [
      { value: 'aqua_toute', label: 'Toute discipline' },
      { value: 'aquabike', label: 'Aquabike' },
      { value: 'aquagym', label: 'Aquagym' },
      { value: 'aquaboxing', label: 'Aquaboxing' },
      { value: 'aquapalming', label: 'Aquapalming' },
      { value: 'autre_aqua', label: 'Autre', autre: true },
    ],
  },
];

// Liste à plat, pour les endroits qui veulent juste chercher une discipline
// par sa valeur (badges, résumé) sans se soucier des catégories.
export const DISCIPLINES = DISCIPLINE_CATEGORIES.flatMap((c) => c.disciplines);

export function labelDiscipline(value) {
  return DISCIPLINES.find((d) => d.value === value)?.label || value;
}

// Étiquettes prêtes à afficher pour une liste CSV de disciplines : une entrée
// "Autre" cochée s'affiche avec le texte libre saisi par le titulaire plutôt
// que le mot générique "Autre", quand ce texte existe.
export function disciplineLabels(disciplinesCsv, autreFitness, autreAqua) {
  return (disciplinesCsv || '').split(',').filter(Boolean).map((v) => {
    if (v === 'autre_fitness' && autreFitness) return autreFitness;
    if (v === 'autre_aqua' && autreAqua) return autreAqua;
    return labelDiscipline(v);
  });
}
