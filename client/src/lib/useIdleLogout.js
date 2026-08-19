import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from './usePreferences';

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'wheel'];

// Déconnecte automatiquement le profil actif — objectif : sur un poste partagé
// (accueil de la salle), éviter qu'une action soit faite par erreur sur le
// profil de la dernière personne restée connectée. Réglé par salle dans
// Préférences ('0' = jamais, 'jour' = à minuit, sinon un nombre de minutes
// d'inactivité).
export function useIdleLogout(enabled) {
  const { switchProfile } = useAuth();
  const { prefs } = usePreferences(enabled);
  const timerRef = useRef(null);
  const delai = prefs?.deconnexion_delai_min ?? '0';

  useEffect(() => {
    if (!enabled || delai === '0') return;

    if (delai === 'jour') {
      const now = new Date();
      const minuit = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
      timerRef.current = setTimeout(switchProfile, minuit - now);
      return () => clearTimeout(timerRef.current);
    }

    const minutes = parseInt(delai, 10);
    if (!minutes) return;

    function reset() {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(switchProfile, minutes * 60 * 1000);
    }
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, reset));
    reset();

    return () => {
      clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, reset));
    };
  }, [enabled, delai, switchProfile]);
}
