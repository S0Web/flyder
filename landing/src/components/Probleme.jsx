import { useEffect, useState } from 'react';
import { useRevealOnce, usePrefersReducedMotion } from '../lib/useReveal';

function useIsDesktop() {
  const [desktop, setDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const onChange = () => setDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return desktop;
}

// Rotation "collage" de chaque pièce : valeurs plus marquées sur ordinateur,
// jamais plus de 1,5° sur mobile. Alternées pour casser l'alignement.
const ROTATIONS = [
  { desktop: -1, mobile: 1 },
  { desktop: -2, mobile: -1.5 },
  { desktop: 1, mobile: 1.5 },
  { desktop: -1.5, mobile: -1 },
];

function Piece({ index, visible, straighten, isDesktop, reduced, children, legende, offsetClass = '' }) {
  const deg = isDesktop ? ROTATIONS[index].desktop : ROTATIONS[index].mobile;
  return (
    <div className={`${offsetClass} ${reduced ? '' : 'transition-all duration-[400ms]'}`}
      style={reduced ? undefined : {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transitionDelay: `${index * 120}ms`,
      }}>
      <div aria-hidden="true"
        className={reduced ? '' : 'transition-transform duration-500'}
        style={{ transform: straighten ? 'rotate(0deg)' : `rotate(${deg}deg)` }}>
        {children}
      </div>
      <p className="mt-3 text-sm sm:text-base font-medium text-brand-cream/80 max-w-xs">
        {legende}
      </p>
    </div>
  );
}

export default function Probleme() {
  const [ref, inView] = useRevealOnce(0.25);
  const [finalRef, finalInView] = useRevealOnce(0.9);
  const reduced = usePrefersReducedMotion();
  const isDesktop = useIsDesktop();

  const visible = reduced || inView;
  const straighten = reduced || finalInView;

  return (
    <section id="probleme" ref={ref} className="py-24 sm:py-32" style={{ backgroundColor: '#12162B' }}>
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <div className="text-xs font-bold uppercase tracking-wide mb-10" style={{ color: '#8395FE' }}>
          Vous connaissez la scène
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-8 sm:gap-10">
          {/* 1. Bulle de message */}
          <Piece index={0} visible={visible} straighten={straighten} isDesktop={isDesktop} reduced={reduced}
            legende="« Rappelle-le-moi la semaine prochaine. »">
            <div className="inline-block max-w-[240px] rounded-2xl rounded-bl-sm px-4 py-3 text-sm font-medium text-brand-ink shadow-sm"
              style={{ backgroundColor: '#E4E2DC' }}>
              Rappelle-le-moi la semaine prochaine.
            </div>
          </Piece>

          {/* 2. Post-it */}
          <Piece index={1} visible={visible} straighten={straighten} isDesktop={isDesktop} reduced={reduced}
            legende="Le post-it qui se perd." offsetClass="sm:mt-6">
            <div className="inline-flex items-center justify-center w-36 h-36 p-4 text-center text-sm font-semibold text-brand-ink shadow-md"
              style={{ backgroundColor: '#F6F5F1' }}>
              Remplaçant mardi 7 h ?
            </div>
          </Piece>

          {/* 3. Journal d'appels */}
          <Piece index={2} visible={visible} straighten={straighten} isDesktop={isDesktop} reduced={reduced}
            legende="Trois coachs appelés avant 8 h, et personne ne sait qui a dit oui.">
            <div className="inline-block w-full max-w-[260px] rounded-xl bg-white shadow-sm divide-y divide-black/5 text-xs text-brand-ink/80">
              <div className="px-4 py-2.5 flex items-baseline gap-3">
                <span className="font-mono text-brand-ink/40 flex-shrink-0">7 h 12</span>
                <span>Coach 1, sans réponse</span>
              </div>
              <div className="px-4 py-2.5 flex items-baseline gap-3">
                <span className="font-mono text-brand-ink/40 flex-shrink-0">7 h 15</span>
                <span>Coach 2, répondeur</span>
              </div>
              <div className="px-4 py-2.5 flex items-baseline gap-3">
                <span className="font-mono text-brand-ink/40 flex-shrink-0">7 h 21</span>
                <span>Coach 3, « je regarde »</span>
              </div>
            </div>
          </Piece>

          {/* 4. Fragment de tableur */}
          <Piece index={3} visible={visible} straighten={straighten} isDesktop={isDesktop} reduced={reduced}
            legende="Les cours recomptés un par un avant la facture." offsetClass="sm:mt-4">
            <div className="inline-block rounded-xl bg-white shadow-sm p-3 font-mono text-[10px] text-brand-ink/70">
              <div className="grid grid-cols-5 gap-1 mb-2.5">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={i}
                    className="h-4 w-4 border border-black/10 flex items-center justify-center"
                    style={i % 3 === 0 ? { backgroundColor: 'rgba(61,90,254,0.1)', color: '#3D5AFE' } : undefined}>
                    {i % 3 === 0 ? '✓' : ''}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-black/10">
                <span className="line-through text-brand-ink/40">Total : 42</span>
                <span className="font-bold" style={{ color: '#FF5A36' }}>?</span>
              </div>
            </div>
          </Piece>
        </div>

        <div ref={finalRef}>
          <p className={`mt-16 text-lg text-brand-cream/50 ${reduced ? '' : 'transition-all duration-500'}`}
            style={reduced ? undefined : {
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              transitionDelay: '480ms',
            }}>
            Un planning ne devrait pas dépendre de la mémoire de quelqu'un.
          </p>
        </div>
      </div>
    </section>
  );
}
