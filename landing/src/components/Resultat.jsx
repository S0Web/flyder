import { useEffect, useState } from 'react';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { useRevealOnce, usePrefersReducedMotion } from '../lib/useReveal';

function Carte({ titre, chiffre, texte, accent }) {
  return (
    <div className={`flex-1 rounded-2xl p-6 sm:p-7 ${accent ? '' : 'border border-black/10 bg-white'}`}
      style={accent ? { backgroundColor: '#12162B' } : undefined}>
      <div className="text-xs font-bold uppercase tracking-wide mb-4"
        style={{ color: accent ? '#8395FE' : '#8B93A7' }}>
        {titre}
      </div>
      <div className={`font-mono text-3xl sm:text-4xl font-semibold mb-3 ${accent ? 'text-white' : 'text-brand-ink'}`}>
        {chiffre}
      </div>
      <p className={`text-sm leading-relaxed ${accent ? 'text-brand-cream/70' : 'text-brand-ink/60'}`}>
        {texte}
      </p>
    </div>
  );
}

export default function Resultat() {
  const [ref, inView] = useRevealOnce(0.4);
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0); // 0 : rien, 1 : "Avant" visible, 2 : "Avec Flyder" visible

  useEffect(() => {
    if (!inView || reduced) return;
    const t1 = setTimeout(() => setStep(1), 0);
    // Les deux cartes apparaissent l'une après l'autre ; ensemble (délai +
    // transition) toujours sous les 500ms demandés par le brief.
    const t2 = setTimeout(() => setStep(2), 150);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [inView, reduced]);

  const avantVisible = reduced || step >= 1;
  const flyderVisible = reduced || step >= 2;

  return (
    <section id="resultat" ref={ref} className="bg-brand-cream py-24 sm:py-32">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-brand-ink tracking-tight max-w-2xl mb-14 sm:mb-16">
          Moins de temps à compter. Plus de temps à décider.
        </h2>

        <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-6">
          <div className={`flex-1 ${reduced ? '' : 'transition-all duration-200'}`}
            style={reduced ? undefined : {
              opacity: avantVisible ? 1 : 0,
              transform: avantVisible ? 'translateY(0)' : 'translateY(8px)',
            }}>
            <Carte titre="Avant" chiffre="8 h par semaine"
              texte="À compter, vérifier, recouper, sept jours sur sept. Une analyse partielle, quand elle se faisait." />
          </div>

          <div className="flex sm:flex-col items-center justify-center gap-1.5 flex-shrink-0 py-1 sm:py-0 sm:px-2">
            <ArrowRight aria-hidden="true" className="hidden sm:block h-5 w-5 text-brand-slate" />
            <ArrowDown aria-hidden="true" className="sm:hidden h-5 w-5 text-brand-slate" />
            <span className="text-xs font-semibold text-brand-slate uppercase tracking-wide">devient</span>
          </div>

          <div className={`flex-1 ${reduced ? '' : 'transition-all duration-200'}`}
            style={reduced ? undefined : {
              opacity: flyderVisible ? 1 : 0,
              transform: flyderVisible ? 'translateY(0)' : 'translateY(8px)',
            }}>
            <Carte titre="Avec Flyder" chiffre="2 h par semaine"
              texte="À lire le tableau d'analyse et décider. Une analyse complète, mise à jour toute seule." accent />
          </div>
        </div>

        <div className="mt-10 text-center sm:text-left">
          <span className="font-mono text-2xl sm:text-3xl font-bold" style={{ color: '#3D5AFE' }}>
            4 fois moins de temps
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 justify-center sm:justify-start">
          <span className="text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border border-black/10 text-brand-ink/70">
            Moins de temps passé
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border border-black/10 text-brand-ink/70">
            Des décisions mieux informées
          </span>
        </div>

        <p className="mt-4 text-xs text-brand-slate text-center sm:text-left">
          Temps hebdomadaire passé sur le planning, estimé par la direction de la salle.
        </p>

        <p className="mt-12 text-brand-ink/60 leading-relaxed text-base sm:text-lg max-w-2xl">
          Avant, le planning demandait une attention et des compétences d'analyse que l'équipe
          n'a pas forcément : il était propice aux erreurs. Aujourd'hui, il vérifie et analyse
          tout seul. On coche, on décide, et la voiture avance d'un coup de pédale.
        </p>
      </div>
    </section>
  );
}
