import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

export function usePreferences(enabled = true) {
  const [prefs, setPrefs] = useState(null);

  const refetch = useCallback(() => {
    if (!enabled) return;
    api.getPreferences().then(setPrefs).catch(() => {});
  }, [enabled]);

  useEffect(() => { refetch(); }, [refetch]);

  return { prefs, refetch };
}
