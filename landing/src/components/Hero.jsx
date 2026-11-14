import { useEffect, useRef } from 'react';
import { ArrowRight, Calendar, BarChart3, Users } from 'lucide-react';
import posterScreenshot from '../assets/poster-tour.jpg';
import tourMp4 from '../assets/tour-flyder.mp4';
import tourWebm from '../assets/tour-flyder.webm';

// Bornes (en secondes) de chaque section du tour — vidéo composée de 3
// captures d'écran réelles (pas des enregistrements synthétiques) découpées
// et mises bout à bout : Planning 0-7s, Analyse 7-14s, Coachs 14-20s.
const SEGMENTS = [
  { icon: Calendar, label: 'Planning', start: 0, end: 7 },
  { icon: BarChart3, label: 'Analyse', start: 7, end: 14 },
  { icon: Users, label: 'Coachs', start: 14, end: 20 },
];

// Barre flottante purement décorative (rien n'est cliquable) : une jauge par
// section qui se remplit en suivant la lecture réelle de la vidéo (comme des
// stories).
function FloatingNavBar({ videoRef }) {
  const fillRefs = useRef([]);
  const textRefs = useRef([]);

  useEffect(() => {
    let raf;
    const tick = () => {
      const video = videoRef.current;
      if (video) {
        const t = video.currentTime;
        SEGMENTS.forEach((seg, i) => {
          const frac = t >= seg.end ? 1 : t < seg.start ? 0 : (t - seg.start) / (seg.end - seg.start);
          if (fillRefs.current[i]) fillRefs.current[i].style.width = `${frac * 100}%`;
          if (textRefs.current[i]) textRefs.current[i].style.color = frac > 0 ? '#fff' : 'rgba(255,255,255,0.5)';
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [videoRef]);

  return (
    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 sm:bottom-6" aria-hidden="true">
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-brand-ink/85 px-1.5 py-1.5 shadow-xl shadow-black/20 backdrop-blur-sm">
        {SEGMENTS.map(({ icon: Icon, label }, i) => (
          <div key={label} className="relative overflow-hidden rounded-full">
            <div ref={(el) => { fillRefs.current[i] = el; }}
              className="absolute inset-y-0 left-0 rounded-full bg-brand-blue" style={{ width: '0%' }} />
            <div ref={(el) => { textRefs.current[i] = el; }}
              className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductTour() {
  const videoRef = useRef(null);

  // Lecture lancée ici plutôt que par l'attribut autoplay : un visiteur en
  // mode "économie de données" garde l'image fixe et ne télécharge pas la vidéo.
  useEffect(() => {
    if (navigator.connection?.saveData) return;
    videoRef.current?.play().catch(() => {});
  }, []);

  return (
    <div className="relative overflow-hidden rounded-[1.25rem] border border-black/[0.08] bg-white shadow-2xl shadow-brand-ink/15 sm:rounded-[2rem]">
      <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover object-top"
          poster={posterScreenshot}
          aria-label="Aperçu de Flyder : planning, analyse et gestion des coachs"
          loop muted playsInline preload="none">
          <source src={tourWebm} type="video/webm" />
          <source src={tourMp4} type="video/mp4" />
        </video>
        <FloatingNavBar videoRef={videoRef} />
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section id="top" className="pt-32 sm:pt-40">
      <div className="mx-auto max-w-6xl px-5 text-center sm:px-8">
        <h1 className="display-xl mx-auto max-w-5xl text-[2.6rem] motion-safe:animate-fadeInUp sm:text-7xl lg:text-[5.25rem]" style={{ animationDelay: '60ms' }}>
          Moins de temps à compter, plus de temps à décider
        </h1>

        <p className="mx-auto mt-7 max-w-2xl text-lg text-brand-ink/60 motion-safe:animate-fadeInUp sm:text-xl" style={{ animationDelay: '120ms' }}>
          Flyder, le logiciel de gestion pensé pour les salles de sport : planning, coachs, RH, facturation et statistiques réunis dans un seul outil.
        </p>

        <div className="mt-9 flex flex-col items-stretch justify-center gap-3 motion-safe:animate-fadeInUp sm:flex-row sm:items-center" style={{ animationDelay: '180ms' }}>
          <a href="#contact" className="btn-primary">
            Demander une démonstration <ArrowRight className="h-4 w-4" />
          </a>
          <a href="#fonctionnalites" className="btn-secondary">
            Découvrir les fonctionnalités
          </a>
        </div>
      </div>

      <div className="mx-auto mt-14 max-w-[84rem] px-3 motion-safe:animate-fadeInUp sm:mt-20 sm:px-5" style={{ animationDelay: '260ms' }}>
        <ProductTour />
      </div>
    </section>
  );
}
