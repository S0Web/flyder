import { Link } from 'react-router-dom';
import { Building2, Dumbbell, ChevronRight, MapPin, Sparkles, Handshake, BadgePercent, Navigation, MessageCircle } from 'lucide-react';
import Wordmark from '../components/Wordmark';

const ETAPES = [
  { icon: Sparkles, tile: 'tile-blue', titre: 'Crée ton profil', texte: 'Deux minutes, ta ville, tes disciplines. Pas de CV, pas de dossier.' },
  { icon: MapPin, tile: 'tile-coral', titre: 'Regarde autour de toi', texte: 'On te montre qui cherche, à combien de kilomètres — rien de national, que du local.' },
  { icon: Handshake, tile: 'tile-green', titre: 'Contacte en direct', texte: 'Un clic révèle les coordonnées. Vous vous parlez sans intermédiaire.' },
];

const PROMESSES = [
  { icon: BadgePercent, tile: 'tile-violet', k: '0 %', v: 'de commission' },
  { icon: Navigation, tile: 'tile-amber', k: 'Local', v: 'trié par distance réelle' },
  { icon: MessageCircle, tile: 'tile-blue', k: 'Direct', v: 'vos coordonnées, vos échanges' },
];

// Deux grandes cartes d'entrée, comme les tuiles d'accueil d'une app de club.
function OptionCard({ to, icon: Icon, tile, badge, titre, texte, delay }) {
  return (
    <Link to={to} className="group card card-hover p-5 sm:p-6 flex items-center gap-4 sm:gap-5 animate-fadeInUp" style={{ animationDelay: delay }}>
      <span className={`tile tile-lg ${tile} group-hover:scale-105 transition`}><Icon className="h-6 w-6" /></span>
      <span className="min-w-0 flex-1">
        <span className="microlabel text-brand-blue">{badge}</span>
        <span className="block font-display text-lg sm:text-xl font-bold text-brand-ink leading-tight mt-0.5">{titre}</span>
        <span className="block text-sm text-brand-ink/60 mt-1">{texte}</span>
      </span>
      <span className="h-9 w-9 rounded-full bg-white flex items-center justify-center flex-none text-brand-ink group-hover:bg-brand-ink group-hover:text-white transition">
        <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

export default function RoleLanding() {
  return (
    <div className="min-h-screen bg-white">
      <header className="hero">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-4 sm:pt-5 pb-10 sm:pb-16">
          <div className="flex items-center justify-between">
            <Wordmark tone="light" />
            <a href="https://flyder.fr" className="text-sm font-semibold text-white/75 hover:text-white transition">Un projet Flyder</a>
          </div>

          <div className="mt-10 sm:mt-16 max-w-2xl">
            <span className="badge badge-white animate-fadeInUp"><span className="h-1.5 w-1.5 rounded-full bg-brand-coral" /> Bêta gratuite · Île-de-France</span>
            <h1 className="mt-4 text-[2.75rem] sm:text-6xl lg:text-7xl font-bold leading-[1.02] animate-fadeInUp" style={{ animationDelay: '60ms' }}>
              Le bon coach,<br />la bonne salle.
            </h1>
            <p className="mt-5 text-base sm:text-xl text-white/80 max-w-xl animate-fadeInUp" style={{ animationDelay: '120ms' }}>
              L'annuaire local qui met en relation les salles de sport et les coachs indépendants — près de chez toi, sans commission.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8">
        <section className="-mt-6 sm:-mt-10 relative grid sm:grid-cols-2 gap-4">
          <div className="card-white p-2 sm:p-3 animate-fadeInUp" style={{ animationDelay: '180ms' }}>
            <OptionCard to="/salle" icon={Building2} tile="tile-blue" badge="Pour les salles" titre="Je cherche un coach"
              texte="Un indépendant dispo près de ta salle, par discipline et par tarif." />
          </div>
          <div className="card-white p-2 sm:p-3 animate-fadeInUp" style={{ animationDelay: '240ms' }}>
            <OptionCard to="/coach" icon={Dumbbell} tile="tile-coral" badge="Pour les coachs" titre="Je cherche des salles"
              texte="Sois visible des salles qui recrutent autour de toi. Zéro prospection." />
          </div>
        </section>

        <section className="mt-12 sm:mt-16">
          <div className="grid gap-3 sm:grid-cols-3">
            {PROMESSES.map((p) => (
              <div key={p.k} className="row">
                <span className={`tile tile-sm ${p.tile}`}><p.icon className="h-4 w-4" /></span>
                <span><span className="font-display font-bold text-brand-ink">{p.k}</span> <span className="text-sm text-brand-ink/60">{p.v}</span></span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 sm:mt-16 pb-16">
          <h2 className="h-section mb-5">Comment ça marche</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {ETAPES.map((e, i) => (
              <div key={e.titre} className="card p-5 sm:p-6 animate-fadeInUp" style={{ animationDelay: `${300 + i * 60}ms` }}>
                <div className="flex items-center justify-between mb-5">
                  <span className={`tile ${e.tile}`}><e.icon className="h-5 w-5" /></span>
                  <span className="font-display text-3xl font-bold text-brand-ink/15">0{i + 1}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-brand-ink">{e.titre}</h3>
                <p className="mt-1.5 text-sm text-brand-ink/60 leading-relaxed">{e.texte}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex items-center justify-between text-xs text-brand-slate border-t border-black/[0.06]">
        <span>© Flyder — Talents</span>
        <a href="https://flyder.fr" className="hover:text-brand-ink transition">flyder.fr</a>
      </footer>
    </div>
  );
}
