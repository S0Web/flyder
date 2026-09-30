import { useEffect } from 'react';
import { useDismiss } from '../../lib/useDismiss';

// Panneau latéral droit (plein écran sur mobile) : détail d'une tâche, saisie
// d'un compte rendu… Garde la liste visible derrière, contrairement à un modal.
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
      <div className={`absolute inset-0 bg-brand-ink/45 ${closing ? 'animate-overlayOut' : 'animate-overlayIn'}`} onClick={dismiss} />
      <aside
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${largeur} h-full bg-brand-cream flex flex-col border-l-4 border-fitness ${closing ? 'animate-drawerOut' : 'animate-drawerIn'}`}
      >
        <header className="flex items-start gap-4 px-6 pt-5 pb-4 border-b border-brand-ink/15 flex-shrink-0">
          <div className="flex-1 min-w-0">
            {surtitre && <div className="font-mono text-[11px] text-fitness mb-1.5">{surtitre}</div>}
            <h2 className="font-display text-xl font-bold text-brand-ink leading-tight">{titre}</h2>
            {sousTitre && <div className="font-mono text-[11px] text-gray-500 mt-1.5">{sousTitre}</div>}
          </div>
          <button onClick={dismiss} className="font-mono text-[11px] text-gray-500 hover:text-brand-ink pt-1">
            fermer ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {typeof children === 'function' ? children(dismiss) : children}
        </div>
        {pied && (
          <footer className="flex-shrink-0 border-t border-brand-ink/15 px-6 py-3 bg-white">
            {typeof pied === 'function' ? pied(dismiss) : pied}
          </footer>
        )}
      </aside>
    </div>
  );
}
