import { useRevealOnce, usePrefersReducedMotion } from '../lib/useReveal';

const LIGNES = [
  '« Rappelle-le-moi la semaine prochaine. »',
  'Le post-it qui se perd.',
  'Trois coachs appelés avant 8 h, et personne ne sait qui a dit oui.',
  'Les cours recomptés un par un avant la facture.',
];

export default function Probleme() {
  const [ref, inView] = useRevealOnce(0.3);
  const reduced = usePrefersReducedMotion();
  const visible = reduced || inView;

  return (
    <section id="probleme" ref={ref} className="py-24 sm:py-32" style={{ backgroundColor: '#12162B' }}>
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <div className="text-xs font-bold uppercase tracking-wide mb-8" style={{ color: '#8395FE' }}>
          Vous connaissez la scène
        </div>

        <ul className="space-y-5 sm:space-y-6">
          {LIGNES.map((ligne, i) => (
            <li key={ligne}
              className={`text-xl sm:text-2xl font-display font-semibold text-white leading-snug ${
                reduced ? '' : 'transition-all duration-500'
              }`}
              style={reduced ? undefined : {
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(12px)',
                transitionDelay: `${i * 120}ms`,
              }}>
              {ligne}
            </li>
          ))}
        </ul>

        <p className={`mt-12 text-lg text-brand-cream/50 ${reduced ? '' : 'transition-all duration-500'}`}
          style={reduced ? undefined : {
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transitionDelay: `${LIGNES.length * 120}ms`,
          }}>
          Un planning ne devrait pas dépendre de la mémoire de quelqu'un.
        </p>
      </div>
    </section>
  );
}
