import { useEffect, useRef } from 'react';

const TEXTE = "Moins de tableurs, moins d'aller-retours — plus de temps pour votre salle.";

// Grande phrase dont les mots passent d'estompés à nets au fil du scroll.
// Le plancher d'opacité reste lisible (le texte n'est jamais invisible), et
// tout est affiché net d'emblée si l'utilisateur réduit les animations.
export default function Statement() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mots = el.querySelectorAll('[data-mot]');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      mots.forEach(m => { m.style.opacity = 1; });
      return;
    }
    const borne = (v) => Math.min(1, Math.max(0, v));
    let raf = 0;
    const maj = () => {
      raf = 0;
      const { top } = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 quand le haut du bloc arrive à 85 % de la fenêtre, 1 à 35 %.
      const p = borne((vh * 0.85 - top) / (vh * 0.5));
      mots.forEach((m, i) => {
        m.style.opacity = 0.22 + 0.78 * borne(p * (mots.length + 1) - i);
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(maj); };
    maj();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="py-28 sm:py-44">
      <p ref={ref} className="display-lg mx-auto max-w-4xl px-5 text-center text-3xl text-brand-ink sm:px-8 sm:text-5xl lg:text-6xl">
        {TEXTE.split(' ').map((mot, i) => (
          <span key={i} data-mot className="transition-opacity duration-300" style={{ opacity: 0.22 }}>
            {mot}{' '}
          </span>
        ))}
      </p>
    </section>
  );
}
