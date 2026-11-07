import { useEffect, useState } from 'react';
import { useRevealOnce, usePrefersReducedMotion } from '../lib/useReveal';

export default function Resultat() {
  const [ref, inView] = useRevealOnce(0.5);
  const reduced = usePrefersReducedMotion();
  const [swapped, setSwapped] = useState(false);

  useEffect(() => {
    if (inView && !reduced) {
      // Léger délai avant le basculement pour que l'arrivée dans le viewport
      // se remarque avant l'animation du chiffre (ensemble < 600ms, voir brief).
      const t = setTimeout(() => setSwapped(true), 100);
      return () => clearTimeout(t);
    }
  }, [inView, reduced]);

  return (
    <section id="resultat" ref={ref} className="bg-brand-cream py-24 sm:py-32">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-brand-ink tracking-tight max-w-2xl mb-14 sm:mb-16">
          Moins de temps à compter. Plus de temps à décider.
        </h2>

        <div className="grid sm:grid-cols-2 gap-10 sm:gap-16 items-start">
          <div>
            {reduced ? (
              <p className="font-mono text-3xl sm:text-5xl font-semibold text-brand-ink">
                De 1 h par jour à 2 h par semaine
              </p>
            ) : (
              <div className="grid" aria-hidden="true">
                <span className="[grid-area:1/1] font-mono text-3xl sm:text-5xl font-semibold text-brand-ink transition-opacity duration-500 whitespace-nowrap"
                  style={{ opacity: swapped ? 0 : 1 }}>
                  1 h par jour
                </span>
                <span className="[grid-area:1/1] font-mono text-3xl sm:text-5xl font-semibold transition-opacity duration-500 whitespace-nowrap"
                  style={{ opacity: swapped ? 1 : 0, color: '#3D5AFE' }}>
                  2 h par semaine
                </span>
              </div>
            )}
            {!reduced && <span className="sr-only">De 1 h par jour à 2 h par semaine</span>}
            <p className="mt-6 text-sm text-brand-ink/50">
              Passées sur le planning, les vérifications et l'analyse, dans la salle où Flyder est né.
            </p>
          </div>

          <p className="text-brand-ink/60 leading-relaxed text-base sm:text-lg">
            Avant, le planning demandait une attention et des compétences d'analyse que l'équipe
            n'a pas forcément : il était propice aux erreurs. Aujourd'hui, il vérifie et analyse
            tout seul. On coche, on décide, et la voiture avance d'un coup de pédale.
          </p>
        </div>
      </div>
    </section>
  );
}
