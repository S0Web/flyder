import { Link } from 'react-router-dom';
import { Building2, Dumbbell, ChevronRight, MapPin, Sparkles, Handshake } from 'lucide-react';
import Wordmark from '../components/Wordmark';

const ETAPES = [
  { icon: Sparkles, titre: 'Crée ton profil', texte: 'Deux minutes, une adresse, tes disciplines. Pas de CV, pas de dossier.' },
  { icon: MapPin, titre: 'Regarde autour de toi', texte: 'On te montre qui cherche, à combien de kilomètres — rien de national, que du local.' },
  { icon: Handshake, titre: 'Contacte en direct', texte: 'Un clic révèle les coordonnées. Vous vous parlez sans intermédiaire.' },
];

function OptionCard({ to, icon: Icon, badge, titre, texte, delay }) {
  return (
    <Link to={to}
      className="group relative bg-white rounded-4xl border border-black/5 shadow-card hover:shadow-card-hover hover:-translate-y-1 hover:border-brand-ink/15 transition-all duration-300 p-6 sm:p-7 flex items-center gap-5 animate-fadeInUp"
      style={{ animationDelay: delay }}>
      <span className="h-14 w-14 rounded-2xl bg-sky-50 text-brand-blue flex items-center justify-center flex-none group-hover:bg-brand-blue group-hover:text-white transition-colors duration-300">
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-blue">{badge}</span>
        <span className="block font-display text-xl font-bold text-brand-ink leading-tight mt-0.5">{titre}</span>
        <span className="block text-sm text-brand-ink/60 mt-1">{texte}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-brand-slate group-hover:text-brand-ink group-hover:translate-x-0.5 transition flex-none" />
    </Link>
  );
}

export default function RoleLanding() {
  return (
    <div className="min-h-screen bg-brand-cream relative overflow-hidden">
      <div className="pointer-events-none absolute -top-48 -right-40 h-[36rem] w-[36rem] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #3D5AFE 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute top-96 -left-32 h-80 w-80 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #FF5A36 0%, transparent 70%)' }} />

      <header className="relative max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Wordmark />
        <a href="https://flyder.fr" className="text-sm font-medium text-brand-ink/60 hover:text-brand-ink transition">Un projet Flyder</a>
      </header>

      <main className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <section className="pt-10 sm:pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-black/5 rounded-full pl-1.5 pr-4 py-1.5 mb-8 shadow-sm animate-fadeInUp">
            <span className="text-[10px] font-bold uppercase tracking-wide text-white px-2.5 py-0.5 rounded-full bg-brand-coral">Nouveau</span>
            <span className="text-xs font-medium text-brand-ink/70">Gratuit pendant le lancement, Île-de-France</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] text-brand-ink animate-fadeInUp" style={{ animationDelay: '60ms' }}>
            Le bon coach,<br />
            <span className="text-brand-blue">la bonne salle.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-brand-ink/60 max-w-xl mx-auto animate-fadeInUp" style={{ animationDelay: '120ms' }}>
            L'annuaire local qui met en relation les salles de sport et les coachs indépendants — près de chez toi, sans commission.
          </p>

          <div className="mt-12 grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto text-left">
            <OptionCard to="/salle" icon={Building2} badge="Pour les salles" titre="Je cherche un coach"
              texte="Trouve un indépendant dispo près de ta salle, par discipline et par tarif." delay="180ms" />
            <OptionCard to="/coach" icon={Dumbbell} badge="Pour les coachs" titre="Je cherche des salles"
              texte="Sois visible des salles qui recrutent autour de toi. Zéro prospection." delay="240ms" />
          </div>
        </section>

        <section className="pb-20">
          <p className="microlabel text-center mb-6">Comment ça marche</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {ETAPES.map((e, i) => (
              <div key={e.titre} className="bg-white rounded-3xl border border-black/5 shadow-card p-6 animate-fadeInUp" style={{ animationDelay: `${300 + i * 60}ms` }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="h-9 w-9 rounded-xl bg-brand-ink text-white font-display font-bold text-sm flex items-center justify-center">{i + 1}</span>
                  <e.icon className="h-5 w-5 text-brand-blue" />
                </div>
                <h3 className="font-display text-lg font-bold text-brand-ink">{e.titre}</h3>
                <p className="mt-1.5 text-sm text-brand-ink/60 leading-relaxed">{e.texte}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-16">
          <div className="rounded-4xl bg-brand-ink text-white px-8 py-10 sm:px-12 sm:py-12 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
              style={{ background: 'radial-gradient(circle, #3D5AFE 0%, transparent 70%)' }} />
            <div className="relative grid sm:grid-cols-3 gap-8">
              {[['0 %', 'de commission, aujourd\'hui comme demain sur le socle'], ['Local', 'trié par distance réelle, pas par budget publicitaire'], ['Direct', 'vos coordonnées, vos échanges — sans messagerie imposée']].map(([k, v]) => (
                <div key={k}>
                  <p className="font-display text-3xl font-bold">{k}</p>
                  <p className="mt-1.5 text-sm text-white/60 leading-relaxed">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative max-w-6xl mx-auto px-5 sm:px-8 py-8 flex items-center justify-between text-xs text-brand-slate">
        <span>© Flyder — Talents</span>
        <a href="https://flyder.fr" className="hover:text-brand-ink transition">flyder.fr</a>
      </footer>
    </div>
  );
}
