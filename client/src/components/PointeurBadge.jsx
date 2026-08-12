import { useState, useRef, useEffect } from 'react';
import { colorForUser } from '../lib/utils';

// Sélecteur rapide du pointeur (qui a rempli l'effectif), sur le même principe
// que HeadcountPopover : petit déclencheur cliquable + popover avec la liste
// des profils (les pointeurs SONT les employés ayant un compte). Deux variantes
// d'affichage : "circle" (rond discret avec initiale, vue grille) et "text"
// (nom ou tiret, vue liste).
export default function PointeurBadge({ pointeurUserId, pointeurNom, profils, onSelect, variant = 'circle' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    function handleEscape(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  function handlePick(id) {
    onSelect(id);
    setOpen(false);
  }

  const initiale = pointeurNom ? pointeurNom.trim()[0].toUpperCase() : null;
  const titre = pointeurNom ? `Pointé par ${pointeurNom} — cliquer pour changer` : 'Qui a rempli ? (non identifié)';

  return (
    <span className="relative inline-block" ref={ref}>
      {variant === 'circle' ? (
        <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} title={titre} aria-label={titre}
          className={`flex items-center justify-center h-3.5 w-3.5 rounded-full text-[8px] font-bold leading-none transition-colors
            ${initiale ? 'text-white' : 'border border-dashed border-gray-300 hover:border-gray-400'}`}
            style={initiale ? {backgroundColor: colorForUser(pointeurUserId)} : undefined}>
          {initiale || ''}
        </button>
      ) : (
        <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} title={titre}
          className="text-xs text-gray-500 hover:text-sky-600 hover:underline">
          {pointeurNom || '—'}
        </button>
      )}

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-30 top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44 max-h-56 overflow-y-auto"
        >
          {profils.length === 0 && <div className="px-3 py-1.5 text-xs text-gray-400">Aucun profil</div>}
          {profils.map(p => (
            <button key={p.id} onClick={() => handlePick(p.id)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-sky-50 ${pointeurUserId === p.id ? 'text-sky-700 font-semibold bg-sky-50' : 'text-gray-600'}`}>
              {p.prenom} {p.nom}
            </button>
          ))}
          {pointeurUserId != null && (
            <button onClick={() => handlePick(null)}
              className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 border-t border-gray-100 mt-1">
              Effacer
            </button>
          )}
        </div>
      )}
    </span>
  );
}
