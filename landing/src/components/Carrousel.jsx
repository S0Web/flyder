import { useEffect, useId, useState } from 'react';
import Reveal from './Reveal';

// Rangée de cartes. Sur mobile : carrousel horizontal à cran, la carte
// suivante dépasse pour inviter au swipe, avec des points de repère. À partir
// de md : grille classique dont `grille` donne les colonnes.
// `cartes` : [{ titre, contenu }] — `titre` sert de clé et de libellé aux points.
export default function Carrousel({ cartes, grille = 'md:grid-cols-3', classeCarte = '' }) {
  const id = useId();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const rangee = document.getElementById(id);
    if (!rangee) return;
    let raf = 0;
    const maj = () => {
      raf = 0;
      const centre = rangee.scrollLeft + rangee.clientWidth / 2;
      let proche = 0;
      let ecartMin = Infinity;
      [...rangee.children].forEach((carte, i) => {
        const ecart = Math.abs(carte.offsetLeft + carte.offsetWidth / 2 - centre);
        if (ecart < ecartMin) { ecartMin = ecart; proche = i; }
      });
      setActive(proche);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(maj); };
    rangee.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      rangee.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [id]);

  function allerA(i) {
    const rangee = document.getElementById(id);
    const carte = rangee?.children[i];
    if (!carte) return;
    rangee.scrollTo({ left: carte.offsetLeft - (rangee.clientWidth - carte.offsetWidth) / 2, behavior: 'smooth' });
  }

  return (
    <>
      <Reveal stagger id={id}
        className={`sans-barre relative flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 md:mx-auto md:grid md:max-w-6xl md:gap-4 md:overflow-visible md:px-8 ${grille}`}>
        {cartes.map(({ titre, contenu }) => (
          <div key={titre} className={`flex w-[84%] flex-shrink-0 snap-center flex-col md:w-auto ${classeCarte}`}>
            {contenu}
          </div>
        ))}
      </Reveal>

      <div className="mt-5 flex justify-center gap-1 md:hidden">
        {cartes.map(({ titre }, i) => (
          <button key={titre} type="button" onClick={() => allerA(i)}
            aria-label={`Afficher : ${titre}`} aria-current={active === i || undefined}
            className="flex h-9 items-center px-1.5">
            <span className={`block h-1.5 rounded-full transition-all duration-300 ${active === i ? 'w-6 bg-brand-ink' : 'w-1.5 bg-brand-ink/20'}`} />
          </button>
        ))}
      </div>
    </>
  );
}
