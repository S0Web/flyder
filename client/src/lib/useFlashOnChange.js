import { useEffect, useRef, useState } from 'react';

// Renvoie `true` brièvement quand `value` change (jamais au premier rendu) —
// sert à déclencher une micro-animation de confirmation (badge de statut,
// effectif mis à jour...) sans rejouer l'animation à chaque re-render.
export function useFlashOnChange(value) {
  const prev = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 280);
    return () => clearTimeout(t);
  }, [value]);

  return flash;
}
