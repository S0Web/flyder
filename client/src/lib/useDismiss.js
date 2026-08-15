import { useCallback, useEffect, useState } from 'react';

// Anime la fermeture d'un panneau (modal...) avant de démonter réellement,
// pour que l'ouverture animée ne soit pas suivie d'une disparition instantanée.
// Usage : const { closing, dismiss } = useDismiss(onClose);
// → appeler `dismiss()` partout où le code appelait `onClose()`, et utiliser
// `closing` pour basculer sur les classes d'animation *Out.
export function useDismiss(onClose, duration = 130) {
  const [closing, setClosing] = useState(false);

  const dismiss = useCallback(() => setClosing(true), []);

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  return { closing, dismiss };
}
