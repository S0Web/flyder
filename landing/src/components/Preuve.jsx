import Reveal from './Reveal';
import TitreRevele from './TitreRevele';

// Preuve fixe, juste sous le hero : la citation du gérant de la salle où
// Flyder a été conçu, lisible sans attendre qu'elle passe dans le bandeau.
export default function Preuve() {
  return (
    <section id="preuve" className="px-5 pt-20 sm:px-8 sm:pt-36">
      <figure className="mx-auto max-w-4xl text-center">
        <blockquote>
          <TitreRevele as="p" texte="« J'ai arrêté de recompter mes cours. »" debut={0.92} fin={0.6}
            className="display-lg text-4xl text-brand-ink sm:text-6xl lg:text-7xl" />
        </blockquote>
        <Reveal as="figcaption" className="mt-8 flex items-center justify-center gap-3 sm:mt-10">
          <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-ink font-display text-lg font-semibold text-white">D</span>
          <span className="text-left">
            <span className="block text-base font-semibold text-brand-ink">Djamel</span>
            <span className="block text-sm text-brand-ink/55">Gérant de la salle Fitnessmov</span>
          </span>
        </Reveal>
        <Reveal as="p" className="mx-auto mt-8 max-w-md text-sm text-brand-ink/50">
          Flyder a été conçu dans la salle Fitnessmov, salle de fitness et d'aqua. Son équipe l'utilise depuis juin 2026.
        </Reveal>
      </figure>
    </section>
  );
}
