import { useEffect, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from './api';

// Pastille de l'entrée « Équipe » du menu et de l'onglet « Comptes rendus » : bilans
// à valider (manager), ou ce qui attend le salarié (tâches en retard, bilan à revoir,
// nouveau document). Un seul compteur partagé par toute l'application : plusieurs
// composants peuvent demander un rafraîchissement en même temps (navigation, action
// dans une page), une seule requête part et tous lisent le même résultat.
let compteur = 0;
let requeteEnCours = null;
const abonnes = new Set();

function publier(n) {
  if (n === compteur) return;
  compteur = n;
  abonnes.forEach(fn => fn());
}

export function rafraichirPastille() {
  if (!requeteEnCours) {
    requeteEnCours = api.getEquipePastille()
      .then(r => publier(r.count || 0))
      .catch(() => publier(0))
      .finally(() => { requeteEnCours = null; });
  }
  return requeteEnCours;
}

export function usePastilleCompteur() {
  return useSyncExternalStore(
    (fn) => { abonnes.add(fn); return () => abonnes.delete(fn); },
    () => compteur,
  );
}

// À monter une seule fois (Layout) : rafraîchit à chaque navigation, sans polling.
export function useEquipePastille(enabled) {
  const location = useLocation();
  const count = usePastilleCompteur();

  useEffect(() => {
    if (enabled) rafraichirPastille();
    else publier(0); // déconnecté : ne pas garder le compteur du profil précédent
  }, [enabled, location.pathname]);

  return { count };
}
