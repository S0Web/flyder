import TitreRevele from './TitreRevele';

const TEXTE = "Moins de tableurs, moins d'aller-retours — plus de temps pour votre salle.";

// Grande phrase d'accroche, seule dans sa section.
export default function Statement() {
  return (
    <section className="py-20 sm:py-44">
      <TitreRevele as="p" texte={TEXTE} debut={0.85} fin={0.35}
        className="display-lg mx-auto max-w-4xl px-5 text-center text-3xl text-brand-ink sm:px-8 sm:text-5xl lg:text-6xl" />
    </section>
  );
}
