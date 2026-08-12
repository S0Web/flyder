import { useState } from 'react';

// Infobulle légère au survol, ancrée juste au-dessus de l'élément enveloppé.
// Si `content` est vide/null, ne fait rien (pas de wrapper superflu, pas de
// tooltip vide) — permet de l'utiliser sans condition au niveau appelant.
export default function Tooltip({ content, children }) {
  const [show, setShow] = useState(false);
  if (!content) return children;

  return (
    <span className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className="absolute z-40 left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-52 px-3 py-2 rounded-lg shadow-lg text-xs leading-snug
          bg-amber-50 border border-amber-200 text-amber-900 pointer-events-none">
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 rotate-45 bg-amber-50 border-r border-b border-amber-200" />
        </span>
      )}
    </span>
  );
}
