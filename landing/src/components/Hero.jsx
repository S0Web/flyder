import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import screenshotAnalyse from '../assets/screenshot-analyse.png';
import screenshotPlanning from '../assets/screenshot-planning.png';
import screenshotRecap from '../assets/screenshot-recap.png';

const DELAI_MS = 4000;
const SLIDES = [
  { src: screenshotAnalyse, label: 'Analyse & statistiques' },
  { src: screenshotPlanning, label: 'Planning des cours' },
  { src: screenshotRecap, label: 'Récapitulatif des coachs' },
];

function ProductCarousel() {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => setIndex(i => (i + 1) % SLIDES.length), []);
  const prev = useCallback(() => setIndex(i => (i - 1 + SLIDES.length) % SLIDES.length), []);

  // Le minuteur repart de zéro à chaque changement (auto ou manuel) : cliquer
  // une flèche redonne les 4 secondes complètes, plutôt que d'enchaîner tout
  // de suite sur le défilement automatique déjà en cours.
  useEffect(() => {
    const id = setInterval(next, DELAI_MS);
    return () => clearInterval(id);
  }, [index, next]);

  return (
    <div className="relative max-w-5xl mx-auto">
      <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-brand-ink/20 border border-black/10 bg-white">
        <div className="flex items-center gap-1.5 bg-gray-100 border-b border-black/5 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="ml-3 text-xs text-gray-400 font-medium">{SLIDES[index].label}</span>
        </div>
        <div className="relative">
          {SLIDES.map((slide, i) => (
            <img key={slide.src} src={slide.src} alt={slide.label}
              className={i === index ? 'w-full h-auto block' : 'w-full h-auto absolute inset-0 opacity-0 pointer-events-none'} />
          ))}
        </div>
      </div>

      <button onClick={prev} aria-label="Image précédente"
        className="absolute left-2 sm:-left-5 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow-lg border border-black/5 flex items-center justify-center text-brand-ink hover:bg-gray-50 transition-colors">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button onClick={next} aria-label="Image suivante"
        className="absolute right-2 sm:-right-5 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow-lg border border-black/5 flex items-center justify-center text-brand-ink hover:bg-gray-50 transition-colors">
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="flex items-center justify-center gap-2 mt-5">
        {SLIDES.map((slide, i) => (
          <button key={slide.src} onClick={() => setIndex(i)} aria-label={`Voir ${slide.label}`}
            className="h-2 rounded-full transition-all"
            style={{ width: i === index ? '1.5rem' : '0.5rem', backgroundColor: i === index ? '#3D5AFE' : 'rgba(18,22,43,0.15)' }} />
        ))}
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-16 pb-28 sm:pt-24 sm:pb-36">
      {/* Halo décoratif, dans l'esprit du bleu/corail de la charte, jamais dominant */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[32rem] w-[32rem] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #3D5AFE 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute top-40 -left-32 h-72 w-72 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #FF5A36 0%, transparent 70%)' }} />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-white border border-black/5 rounded-full pl-1.5 pr-4 py-1.5 mb-8 shadow-sm motion-safe:animate-fadeInUp">
          <span className="text-[10px] font-bold uppercase tracking-wide text-white px-2.5 py-0.5 rounded-full" style={{ backgroundColor: '#FF5A36' }}>
            Nouveau
          </span>
          <span className="text-xs font-medium text-brand-ink/70">Facturation automatisée maintenant disponible</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-ink tracking-tight leading-[1.08] motion-safe:animate-fadeInUp" style={{ animationDelay: '60ms' }}>
          Le logiciel de gestion<br className="hidden sm:block" /> pensé pour les salles de sport
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-brand-ink/60 max-w-2xl mx-auto motion-safe:animate-fadeInUp" style={{ animationDelay: '120ms' }}>
          Planning, coachs, RH, facturation et statistiques réunis dans un seul outil.
          Moins de tableurs, moins d'aller-retours — plus de temps pour votre salle.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 motion-safe:animate-fadeInUp" style={{ animationDelay: '180ms' }}>
          <a href="#contact"
            className="inline-flex items-center gap-2 text-white text-sm font-semibold px-7 py-3.5 rounded-full hover:opacity-90 transition-opacity shadow-lg shadow-blue-900/10"
            style={{ backgroundColor: '#3D5AFE' }}>
            Demander une démonstration <ArrowRight className="h-4 w-4" />
          </a>
          <a href="#fonctionnalites"
            className="inline-flex items-center gap-2 text-brand-ink text-sm font-semibold px-7 py-3.5 rounded-full border border-black/10 hover:bg-white transition-colors">
            Découvrir les fonctionnalités
          </a>
        </div>

        <div className="mt-16 sm:mt-20 motion-safe:animate-fadeInUp" style={{ animationDelay: '260ms' }}>
          <ProductCarousel />
        </div>
      </div>
    </section>
  );
}
