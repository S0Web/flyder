import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from './api';

// Pastille de l'entrée « Équipe » du menu : comptes rendus à valider (manager),
// ou ce qui attend le salarié (tâches en retard, bilan à revoir, nouveau
// document). Même cadence que les autres badges : au montage et à chaque
// navigation, sans polling.
export function useEquipePastille(enabled) {
  const [count, setCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (!enabled) return;
    api.getEquipePastille().then(r => setCount(r.count || 0)).catch(() => setCount(0));
  }, [enabled, location.pathname]);

  return { count };
}
