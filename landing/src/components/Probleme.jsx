import { useRevealOnce, usePrefersReducedMotion } from '../lib/useReveal';

function Carte({ index, visible, reduced, children, legende }) {
  return (
    <div className={reduced ? '' : 'transition-all duration-[400ms]'}
      style={reduced ? undefined : {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transitionDelay: `${index * 120}ms`,
      }}>
      <div aria-hidden="true"
        className="rounded-2xl border border-white/10 p-6 sm:p-7 flex items-center justify-center"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', minHeight: 220 }}>
        {children}
      </div>
      <p className="mt-4 text-sm sm:text-base font-medium text-brand-cream/70 text-center">
        {legende}
      </p>
    </div>
  );
}

export default function Probleme() {
  const [ref, inView] = useRevealOnce(0.25);
  const [finalRef, finalInView] = useRevealOnce(0.8);
  const reduced = usePrefersReducedMotion();

  const visible = reduced || inView;
  const finalVisible = reduced || finalInView;

  return (
    <section id="probleme" ref={ref} className="py-24 sm:py-32" style={{ backgroundColor: '#12162B' }}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <div className="text-xs font-bold uppercase tracking-wide mb-10 text-center" style={{ color: '#8395FE' }}>
          Vous connaissez la scène
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* 1. Bulle de message */}
          <Carte index={0} visible={visible} reduced={reduced}
            legende="« Rappelle-le-moi la semaine prochaine. »">
            <div className="w-full max-w-[280px]">
              <div className="text-[11px] font-mono text-brand-cream/30 mb-2">05.11 · 13:08</div>
              <div className="inline-block rounded-2xl rounded-bl-sm px-4 py-3 text-sm font-medium text-brand-ink shadow-sm"
                style={{ backgroundColor: '#E4E2DC' }}>
                Rappelle-le-moi la semaine prochaine.
              </div>
            </div>
          </Carte>

          {/* 2. Post-it */}
          <Carte index={1} visible={visible} reduced={reduced}
            legende="Le post-it qui se perd.">
            <div className="relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 rounded-sm opacity-60"
                style={{ backgroundColor: '#8B93A7' }} />
              <div className="flex items-center justify-center w-40 h-40 p-5 text-center text-base font-display font-semibold text-brand-ink shadow-md"
                style={{ backgroundColor: '#F6F5F1' }}>
                Remplaçant mardi 7 h ?
              </div>
            </div>
          </Carte>

          {/* 3. Journal d'appels */}
          <Carte index={2} visible={visible} reduced={reduced}
            legende="Trois coachs appelés avant 8 h, et personne ne sait qui a dit oui.">
            <div className="w-full max-w-[300px] rounded-xl bg-white shadow-sm overflow-hidden text-xs text-brand-ink/80">
              <div className="px-4 py-2.5 font-display font-bold text-sm text-brand-ink border-b border-black/5">
                Appels
              </div>
              <div className="divide-y divide-black/5">
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
            </div>
          </Carte>

          {/* 4. Fragment de tableur */}
          <Carte index={3} visible={visible} reduced={reduced}
            legende="Les cours recomptés un par un avant la facture.">
            <div className="rounded-xl bg-white shadow-sm p-4 font-mono text-xs text-brand-ink/70">
              <div className="grid grid-cols-5 gap-1.5 mb-3">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={i}
                    className="h-5 w-5 border border-black/10 flex items-center justify-center"
                    style={i % 3 === 0 ? { backgroundColor: 'rgba(61,90,254,0.1)', color: '#3D5AFE' } : undefined}>
                    {i % 3 === 0 ? '✓' : ''}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-6 pt-2 border-t border-black/10">
                <span className="line-through text-brand-ink/40">Total : 42</span>
                <span className="font-bold" style={{ color: '#FF5A36' }}>?</span>
              </div>
            </div>
          </Carte>
        </div>

        <div ref={finalRef}>
          <p className={`mt-16 text-lg text-brand-cream/50 text-center ${reduced ? '' : 'transition-all duration-500'}`}
            style={reduced ? undefined : {
              opacity: finalVisible ? 1 : 0,
              transform: finalVisible ? 'translateY(0)' : 'translateY(12px)',
            }}>
            Un planning ne devrait pas dépendre de la mémoire de quelqu'un.
          </p>
        </div>
      </div>
    </section>
  );
}
