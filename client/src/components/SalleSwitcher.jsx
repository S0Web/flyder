import { useState, useRef, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { SALLES } from '../lib/salles';

// Petit lien discret pour sauter d'une salle à l'autre (Corbeil / Ballancourt).
// Multi-salle non commercialisé : liste en dur dans lib/salles.js.
export default function SalleSwitcher({ currentSalle, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  // Ne propose de sauter vers une autre salle que si la salle courante fait
  // elle-même partie de la liste connue — sinon (ex. instance de démo) on
  // afficherait des liens vers les vraies salles, avec leurs vrais noms de
  // personnel (l'API /api/auth/profiles est publique), à des visiteurs qui
  // n'ont rien à y faire.
  const estSalleConnue = SALLES.some(s => s.nom === currentSalle);
  const autres = estSalleConnue ? SALLES.filter(s => s.nom !== currentSalle) : [];

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  if (autres.length === 0) return null;

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Changer de salle"
        aria-label="Changer de salle"
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-sky-600 transition-colors"
      >
        <Building2 className="h-3.5 w-3.5" />
        {currentSalle || 'Salle'}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-40 min-w-[200px]">
          {autres.map(s => (
            <a
              key={s.nom}
              href={s.url}
              className="block px-3 py-1.5 text-sm text-gray-600 hover:bg-sky-50 hover:text-sky-700"
            >
              {s.nom}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
