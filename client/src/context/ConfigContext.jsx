import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

const ConfigContext = createContext({ salleNom: '', refetch: () => {} });

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState({ salleNom: '' });

  const refetch = useCallback(() => {
    return api.getConfig()
      .then(c => {
        setConfig(c);
        // Titre d'onglet distinct par salle (pratique quand on gère plusieurs
        // instances ouvertes en même temps).
        document.title = c.salleNom ? `Flyder — ${c.salleNom}` : 'Flyder';
      })
      .catch(() => {});
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return <ConfigContext.Provider value={{ ...config, refetch }}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  return useContext(ConfigContext);
}
