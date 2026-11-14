import { useEffect, useRef } from 'react';

const OPACITE_MIN = 0.22;
const borne = (v) => Math.min(1, Math.max(0, v));

// Texte dont les mots passent d'estompés à nets au fil du scroll. Le plancher
// d'opacité reste lisible (le texte n'est jamais invisible), et tout est
// affiché net d'emblée si l'utilisateur réduit les animations.
// `debut` / `fin` : position du haut du bloc dans la fenêtre (0 = haut,
// 1 = bas) à laquelle l'effet commence puis se termine.
export default function TitreRevele({ as: Tag = 'h2', texte, debut = 0.9, fin = 0.55, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mots = el.querySelectorAll('[data-mot]');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      mots.forEach(m => { m.style.opacity = 1; });
      return;
    }
    let raf = 0;
    const maj = () => {
      raf = 0;
      const { top } = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // En bas de page, un titre peut ne jamais remonter jusqu'à `fin` : on
      // l'affiche alors entièrement.
      const enBas = window.scrollY + vh >= document.documentElement.scrollHeight - 4;
      const p = enBas ? 1 : borne((vh * debut - top) / (vh * (debut - fin)));
      mots.forEach((m, i) => {
        m.style.opacity = OPACITE_MIN + (1 - OPACITE_MIN) * borne(p * (mots.length + 1) - i);
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
  }, [debut, fin]);

  return (
    <Tag ref={ref} className={className}>
      {texte.split(' ').map((mot, i) => (
        <span key={i} data-mot className="transition-opacity duration-300" style={{ opacity: OPACITE_MIN }}>
          {mot}{' '}
        </span>
      ))}
    </Tag>
  );
}
