import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from './api';

// Pas de polling par intervalle (délibéré, cf. plan support) : juste au montage
// et à chaque navigation, cadence suffisante pour un badge non critique. Si
// l'appel échoue (support non configuré sur cette instance, etc.), on reste
// silencieusement à 0 plutôt que de faire planter la sidebar.
export function useTicketsUnreadCount(enabled) {
  const [count, setCount] = useState(0);
  const location = useLocation();

  const refetch = useCallback(() => {
    if (!enabled) return;
    api.getTicketsUnreadCount().then(r => setCount(r.count || 0)).catch(() => setCount(0));
  }, [enabled]);

  useEffect(() => { refetch(); }, [refetch, location.pathname]);

  return { count, refetch };
}
