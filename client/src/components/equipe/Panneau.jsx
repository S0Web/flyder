import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useDismiss } from '../../lib/useDismiss';

// Panneau latéral droit (plein écran sur mobile) : détail d'une tâche, saisie d'un compte
// rendu… Garde la liste visible derrière, contrairement à une fenêtre centrée. Même habillage
// que les fenêtres du reste de Flyder (fond blanc, en-tête à filet, pied grisé).
// `children` et `pied` peuvent recevoir la fonction de fermeture animée.
export default function Panneau({ titre, surtitre, sousTitre, onClose, children, largeur = 'max-w-xl', pied }) {
  const { closing, dismiss } = useDismiss(onClose, 160);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [dismiss]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className={`absolute inset-0 bg-black/40 ${closing ? 'animate-overlayOut' : 'animate-overlayIn'}`} onClick={dismiss} />
      <aside
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${largeur} h-full bg-white shadow-xl flex flex-col sm:rounded-l-2xl ${closing ? 'animate-drawerOut' : 'animate-drawerIn'}`}
      >
        <header className="flex items-start gap-4 px-6 pt-5 pb-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex-1 min-w-0">
            {surtitre && <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-600 mb-1">{surtitre}</div>}
            <h2 className="text-lg font-bold text-gray-800 leading-tight">{titre}</h2>
            {sousTitre && <div className="text-sm text-gray-500 mt-1">{sousTitre}</div>}
          </div>
          <button onClick={dismiss} aria-label="Fermer"
            className="h-8 w-8 -mr-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {typeof children === 'function' ? children(dismiss) : children}
        </div>
        {pied && (
          <footer className="flex-shrink-0 border-t border-gray-200 px-6 py-3 bg-gray-50 sm:rounded-bl-2xl">
            {typeof pied === 'function' ? pied(dismiss) : pied}
          </footer>
        )}
      </aside>
    </div>
  );
}
