// Vocabulaire de disciplines pour Flyder Talents. Plus large que les cases
// aqua/fitness/boxe/crosstraining/poledance de la table `coaches` interne à
// chaque salle (server/src/routes/coaches.js) : Talents est un annuaire public,
// il couvre aussi yoga/pilates/musculation, disciplines courantes chez les
// coachs indépendants mais absentes de cette liste interne plus restreinte.
export const DISCIPLINES = [
  { value: 'fitness', label: 'Fitness' },
  { value: 'musculation', label: 'Musculation' },
  { value: 'boxe', label: 'Boxe' },
  { value: 'crosstraining', label: 'Cross-training' },
  { value: 'aqua', label: 'Aqua' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'poledance', label: 'Pole dance' },
  { value: 'cardio', label: 'Cardio' },
];

export function labelDiscipline(value) {
  return DISCIPLINES.find((d) => d.value === value)?.label || value;
}
