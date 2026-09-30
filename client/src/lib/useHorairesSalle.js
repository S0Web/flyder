import { usePreferences } from './usePreferences';

// Heures d'ouverture et de fermeture de la salle (Préférences > Planning), qui bornent
// les frises horaires de l'onglet Équipe. Valeurs par défaut tant qu'elles ne sont pas
// chargées, ou si les préférences sont incohérentes.
export function useHorairesSalle() {
  const { prefs } = usePreferences();
  const debut = Number(prefs?.ouverture_heure);
  const fin = Number(prefs?.fermeture_heure);
  return Number.isInteger(debut) && Number.isInteger(fin) && debut >= 0 && fin <= 24 && debut < fin
    ? { debut, fin }
    : { debut: 7, fin: 22 };
}

// Graduations de l'axe : toutes les heures si la plage est courte, sinon toutes les 2 h.
export function graduations(debut, fin) {
  const pas = fin - debut > 12 ? 2 : 1;
  const out = [];
  for (let h = Math.ceil(debut / pas) * pas; h <= fin; h += pas) out.push(h);
  return out;
}
