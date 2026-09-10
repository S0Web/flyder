import { Link } from 'react-router-dom';
import { Building2, Dumbbell, ArrowUpRight } from 'lucide-react';
import Wordmark from '../components/Wordmark';

const ETAPES = [
  { num: '01', titre: 'Crée ton profil', texte: 'Deux minutes, une adresse, tes disciplines. Pas de CV, pas de dossier.' },
  { num: '02', titre: 'Regarde autour de toi', texte: 'On te montre qui cherche, à combien de kilomètres — rien de national, que du local.' },
  { num: '03', titre: 'Contacte en direct', texte: 'Un clic révèle les coordonnées. Vous vous parlez sans intermédiaire.' },
];

const TAPE = ['Gratuit pendant le lancement', 'Île-de-France', 'Sans commission', 'Coachs indépendants', 'Salles de sport', 'Trié par distance réelle'];

// Les deux entrées, comme deux fiches punaisées côte à côte : numéro, tampon
// de rôle, titre en capitales, flèche. Celle des salles est en encre pleine,
// celle des coachs en blanc — deux faces d'un même panneau.
function OptionCard({ to, icon: Icon, num, badge, titre, texte, ink, delay }) {
  return (
    <Link to={to}
      className={`group relative rounded-sm border-2 border-brand-ink p-6 sm:p-7 flex flex-col gap-5 min-h-[15rem] card-hard-hover animate-fadeInUp ${
        ink ? 'bg-brand-ink text-brand-cream shadow-hard-blue' : 'bg-white text-brand-ink shadow-hard'
      }`}
      style={{ animationDelay: delay }}>
      <div className="flex items-start justify-between">
        <span className={`font-display text-5xl font-bold leading-none ${ink ? 'text-brand-cream/25' : 'text-brand-ink/15'}`}>{num}</span>
        <span className={`stamp ${ink ? '' : 'stamp-blue'}`}>{badge}</span>
      </div>
      <div className="mt-auto pr-12">
        <Icon className={`h-6 w-6 mb-3 ${ink ? 'text-brand-coral' : 'text-brand-blue'}`} />
        <span className="display-title block text-2xl sm:text-[1.75rem]">{titre}</span>
        <span className={`block text-sm mt-2 max-w-xs ${ink ? 'text-brand-cream/65' : 'text-brand-ink/60'}`}>{texte}</span>
      </div>
      <span className={`absolute bottom-5 right-5 h-10 w-10 border-2 flex items-center justify-center rounded-[2px] transition ${
        ink ? 'border-brand-cream/40 group-hover:bg-brand-coral group-hover:border-brand-coral' : 'border-brand-ink group-hover:bg-brand-ink group-hover:text-brand-cream'
      }`}>
        <ArrowUpRight className="h-5 w-5" />
      </span>
    </Link>
  );
}

export default function RoleLanding() {
  return (
    <div className="min-h-screen paper">
      <header className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between border-b-2 border-brand-ink">
        <Wordmark />
        <a href="https://flyder.fr" className="microlabel text-brand-ink/60 hover:text-brand-ink transition">Un projet Flyder</a>
      </header>

      <div className="tape py-2">
        <div className="tape-track">
          {[...TAPE, ...TAPE].map((t, i) => <span key={i} className="mx-6">{t} <span className="mx-2 text-brand-ink">■</span></span>)}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-5 sm:px-8">
        <section className="pt-10 sm:pt-16 pb-14 grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-end">
          <div>
            <p className="ink-bar mb-6 animate-fadeInUp">Annuaire local <span className="text-brand-coral">■</span> coachs &amp; salles</p>
            <h1 className="display-title text-[3.25rem] sm:text-7xl lg:text-[6.5rem] animate-fadeInUp" style={{ animationDelay: '60ms' }}>
              Le bon<br />coach,<br />
              <span className="outline-blue">la bonne</span><br />
              <span className="text-brand-blue">salle.</span>
            </h1>
          </div>
          <div className="lg:pb-3 animate-fadeInUp" style={{ animationDelay: '120ms' }}>
            <div className="rule mb-5" />
            <p className="text-lg sm:text-xl text-brand-ink/75 leading-snug max-w-md">
              L'annuaire qui met en relation les salles de sport et les coachs indépendants — près de chez toi, sans commission.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 microlabel text-brand-ink">
              <span><span className="text-brand-coral">■</span> 0 % de commission</span>
              <span><span className="text-brand-coral">■</span> Trié par distance</span>
              <span><span className="text-brand-coral">■</span> Coordonnées en direct</span>
            </div>
          </div>
        </section>

        <section className="pb-20 grid sm:grid-cols-2 gap-5 sm:gap-6">
          <OptionCard to="/salle" icon={Building2} num="01" badge="Salles" ink titre="Je cherche un coach"
            texte="Trouve un indépendant dispo près de ta salle, par discipline et par tarif." delay="180ms" />
          <OptionCard to="/coach" icon={Dumbbell} num="02" badge="Coachs" titre="Je cherche des salles"
            texte="Sois visible des salles qui recrutent autour de toi. Zéro prospection." delay="240ms" />
        </section>

        {/* Déroulé comme une grille horaire : numéro en colonne, trait, texte. */}
        <section className="pb-20">
          <div className="flex items-center gap-4 mb-2">
            <p className="ink-bar">Comment ça marche</p>
            <div className="rule flex-1" />
          </div>
          <ol>
            {ETAPES.map((e, i) => (
              <li key={e.num} className="grid grid-cols-[3.5rem_1fr] sm:grid-cols-[6rem_1fr_1.4fr] gap-x-4 sm:gap-x-8 items-baseline py-6 border-b-2 border-brand-ink animate-fadeInUp" style={{ animationDelay: `${300 + i * 60}ms` }}>
                <span className="font-display text-4xl sm:text-6xl font-bold leading-none text-brand-coral">{e.num}</span>
                <h3 className="display-title text-xl sm:text-2xl">{e.titre}</h3>
                <p className="col-start-2 sm:col-start-3 text-sm sm:text-base text-brand-ink/65 leading-relaxed mt-2 sm:mt-0">{e.texte}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="pb-16">
          <div className="card-ink grid sm:grid-cols-3 shadow-hard-coral">
            {[['0 %', 'de commission, aujourd\'hui comme demain sur le socle'], ['Local', 'trié par distance réelle, pas par budget publicitaire'], ['Direct', 'vos coordonnées, vos échanges — sans messagerie imposée']].map(([k, v], i) => (
              <div key={k} className={`px-6 py-7 sm:px-8 sm:py-9 ${i > 0 ? 'border-t-2 sm:border-t-0 sm:border-l-2 border-brand-cream/20' : ''}`}>
                <p className="display-title text-4xl sm:text-5xl">{k}</p>
                <p className="mt-3 text-sm text-brand-cream/60 leading-relaxed">{v}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex items-center justify-between microlabel border-t-2 border-brand-ink">
        <span>© Flyder — Talents</span>
        <a href="https://flyder.fr" className="hover:text-brand-ink transition">flyder.fr</a>
      </footer>
    </div>
  );
}
