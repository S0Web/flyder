import { useState, useRef, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { SALLES } from '../lib/salles';

// Petit lien discret pour sauter d'une salle à l'autre (Corbeil / Ballancourt).
// Multi-salle non commercialisé : liste en dur dans lib/salles.js.
//
// - buttonClassName : personnalise l'apparence du déclencheur (par défaut un
//   lien discret gris, utilisé sur l'écran de connexion ; la sidebar passe son
//   propre style pour s'accorder à son thème).
// - alwaysShow : affiche quand même le nom de la salle (non cliquable) s'il
//   n'y a aucune autre salle vers laquelle basculer, au lieu de ne rien
//   afficher du tout — utile quand ce badge est le seul endroit où le nom de
//   la salle est visible (sidebar), pas quand il est redondant (écran de
//   connexion, où le nom est déjà affiché en grand ailleurs).
export default function SalleSwitcher({ currentSalle, className = '', buttonClassName, alwaysShow = false, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  // Ne propose de sauter vers une autre salle que si la salle courante fait
  // elle-même partie de la liste connue — sinon (ex. instance de démo) on
  // afficherait des liens vers les vraies salles, avec leurs vrais noms de
  // personnel (l'API /api/auth/profiles est publique), à des visiteurs qui
  // n'ont rien à y faire.
  const estSalleConnue = SALLES.some(s => s.nom === currentSalle);
  const autres = estSalleConnue ? SALLES.filter(s => s.nom !== currentSalle) : [];
  const cliquable = autres.length > 0;

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  if (!cliquable && !alwaysShow) return null;

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={cliquable ? () => setOpen(o => !o) : undefined}
        title={cliquable ? 'Changer de salle' : undefined}
        aria-label="Changer de salle"
        className={buttonClassName || 'flex items-center gap-1 text-xs text-gray-400 hover:text-sky-600 transition-colors'}
      >
        <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{currentSalle || 'Salle'}</span>
      </button>
      {open && cliquable && (
        <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-40 min-w-[200px]`}>
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
