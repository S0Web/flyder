import { X, Check } from 'lucide-react';
import Reveal from './Reveal';
import TitreRevele from './TitreRevele';

// Comparatif "au tableur" / "avec Flyder", lu situation par situation : chaque
// ligne met face à face l'avant et l'après d'un même moment du quotidien,
// l'étiquette de la situation posée à cheval sur la jointure.
// - md et plus : un seul grand bloc coupé en deux tons (sable / encre).
// - mobile : une carte par situation, l'avant au-dessus, l'après en dessous.
const LIGNES = [
  {
    label: 'Alerte',
    avant: "Le planning se corrige à la main, si quelqu'un y pense.",
    apres: "Une alerte s'affiche dès qu'un cours n'a plus de coach.",
  },
  {
    label: 'Visibilité',
    avant: "Le changement reste chez celui qui l'a fait.",
    apres: "Toute l'équipe le voit tout de suite.",
  },
  {
    label: 'Facture',
    avant: 'Les cours se recomptent un par un, coach par coach.',
    apres: 'Le décompte et le coût de chaque coach se calculent seuls.',
  },
  {
    label: 'Analyse',
    avant: 'Les chiffres du mois se refont à la main.',
    apres: "Le tableau d'analyse se met à jour tout seul.",
  },
];

const ETIQUETTE = 'rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-ink shadow-md shadow-brand-ink/10';

export default function AvantApres() {
  return (
    <section id="avant-apres" className="scroll-mt-24 px-3 py-20 sm:px-5 sm:py-40">
      <TitreRevele texte="Moins de tableurs, moins d'aller-retours — plus de temps pour votre salle."
        className="display-lg mx-auto mb-12 max-w-4xl px-2 text-center text-4xl text-brand-ink sm:mb-20 sm:text-6xl" />

      <div className="relative mx-auto max-w-6xl md:overflow-hidden md:rounded-[2.5rem]">
        {/* Les deux tons du bloc (md et plus). */}
        <div aria-hidden="true" className="absolute inset-y-0 left-0 hidden w-1/2 bg-brand-sand md:block" />
        <div aria-hidden="true" className="absolute inset-y-0 right-0 hidden w-1/2 bg-brand-ink md:block" />

        <div aria-hidden="true" className="relative hidden grid-cols-2 md:grid">
          <div className="px-12 pb-7 pt-12">
            <div className="text-xs font-bold uppercase tracking-wider text-brand-ink/40">Avant</div>
            <div className="mt-1 font-display text-3xl font-semibold tracking-tight text-brand-ink/50">Au tableur</div>
          </div>
          <div className="px-12 pb-7 pt-12">
            <div className="text-xs font-bold uppercase tracking-wider text-white/40">Après</div>
            <div className="mt-1 font-display text-3xl font-semibold tracking-tight text-white">Avec Flyder</div>
          </div>
        </div>

        <Reveal as="ul" stagger className="relative space-y-3 md:space-y-0 md:pb-5">
          {LIGNES.map(({ label, avant, apres }) => (
            <li key={label} className="relative overflow-hidden rounded-[1.5rem] md:grid md:grid-cols-2 md:overflow-visible md:rounded-none">
              <div className="bg-brand-sand px-5 pb-5 pt-5 md:border-t md:border-brand-ink/10 md:bg-transparent md:py-8 md:pl-12 md:pr-20">
                <div className="mb-4 flex items-center justify-between md:hidden">
                  <span className={ETIQUETTE}>{label}</span>
                  <span aria-hidden="true" className="text-[11px] font-bold uppercase tracking-wider text-brand-ink/35">Avant</span>
                </div>
                <p className="flex gap-3 text-base leading-snug text-brand-ink/55 md:text-lg">
                  <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-ink/10 md:h-6 md:w-6">
                    <X className="h-3 w-3 text-brand-ink/50" strokeWidth={3} />
                  </span>
                  <span><span className="sr-only">Avant : </span>{avant}</span>
                </p>
              </div>

              <div className="bg-brand-ink px-5 pb-6 pt-5 md:border-t md:border-white/10 md:bg-transparent md:py-8 md:pl-20 md:pr-12">
                <div aria-hidden="true" className="mb-3 text-[11px] font-bold uppercase tracking-wider text-white/35 md:hidden">Avec Flyder</div>
                <p className="flex gap-3 text-base font-medium leading-snug text-white md:text-lg">
                  <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue md:h-6 md:w-6">
                    <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
                  </span>
                  <span><span className="sr-only">Avec Flyder : </span>{apres}</span>
                </p>
              </div>

              {/* Étiquette à cheval sur la jointure (md et plus). */}
              <span aria-hidden="true" className={`${ETIQUETTE} absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block`}>
                {label}
              </span>
            </li>
          ))}
        </Reveal>
      </div>

      <Reveal className="mx-auto mt-12 max-w-2xl px-2 text-center sm:mt-20">
        <p className="display-lg text-5xl text-brand-blue sm:text-7xl">4 fois moins de temps</p>
        <p className="mt-4 text-lg text-brand-ink/60">passé chaque semaine sur le planning.</p>
        <p className="mt-2 text-xs text-brand-ink/40">Estimation de la direction de la salle Fitnessmov.</p>
      </Reveal>
    </section>
  );
}
