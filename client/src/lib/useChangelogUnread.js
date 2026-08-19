import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from './api';

// Même logique que useTicketsUnreadCount : pas de polling, juste au montage et
// à chaque navigation. Le nombre d'annonces étant toujours petit, on relit la
// liste complète plutôt que d'ajouter un endpoint /unread-count dédié.
export function useChangelogUnread(enabled) {
  const [count, setCount] = useState(0);
  const location = useLocation();

  const refetch = useCallback(() => {
    if (!enabled) return;
    api.getChangelog().then(entries => setCount(entries.filter(e => !e.vue).length)).catch(() => setCount(0));
  }, [enabled]);

  useEffect(() => { refetch(); }, [refetch, location.pathname]);

  return { count, refetch };
}
