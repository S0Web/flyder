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

// Barre flottante purement décorative (rien n'est cliquable) — reprend
// l'esprit "chrome d'appli" façon Railway, avec une jauge par section qui se
// remplit en suivant la lecture réelle de la vidéo (comme des stories).
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
    <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-1 rounded-full bg-brand-ink/85 backdrop-blur-sm px-1.5 py-1.5 shadow-xl shadow-black/20 border border-white/10">
        {SEGMENTS.map(({ icon: Icon, label }, i) => (
          <div key={label} className="relative overflow-hidden rounded-full">
            <div ref={(el) => { fillRefs.current[i] = el; }}
              className="absolute inset-y-0 left-0 rounded-full" style={{ width: '0%', backgroundColor: '#3D5AFE' }} />
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
  return (
    <div className="relative max-w-5xl mx-auto">
      <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-brand-ink/20 border border-black/10 bg-white">
        <div className="flex items-center gap-1.5 bg-gray-100 border-b border-black/5 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="ml-3 text-xs text-gray-400 font-medium">Flyder en conditions réelles</span>
        </div>
        <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover object-top"
            poster={posterScreenshot}
            autoPlay loop muted playsInline preload="auto">
            <source src={tourWebm} type="video/webm" />
            <source src={tourMp4} type="video/mp4" />
          </video>
          <FloatingNavBar videoRef={videoRef} />
        </div>
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
          <ProductTour />
        </div>
      </div>
    </section>
  );
}
