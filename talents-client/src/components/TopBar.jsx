import { NavLink, Link } from 'react-router-dom';
import { Search, UserRound, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Wordmark from './Wordmark';

// Barre supérieure des deux espaces connectés, style "en-tête de tableau
// d'affichage" : trait encre épais, onglets en capitales soulignés au corail,
// avatar carré. `base` = '/coach' ou '/salle'.
export default function TopBar({ base }) {
  const { actor, logout } = useAuth();
  const nom = actor?.prenom ? `${actor.prenom} ${actor.nom}` : actor?.nom;
  const initiale = (actor?.prenom || actor?.nom || '?').charAt(0).toUpperCase();

  const tab = ({ isActive }) =>
    `relative inline-flex items-center gap-2 px-1 sm:px-2 h-full font-display font-bold uppercase tracking-[0.14em] text-[11px] sm:text-[12px] whitespace-nowrap transition after:absolute after:left-0 after:right-0 after:-bottom-[2px] after:h-[3px] ${
      isActive ? 'text-brand-ink after:bg-brand-coral' : 'text-brand-ink/50 hover:text-brand-ink after:bg-transparent'
    }`;

  return (
    <header className="sticky top-0 z-20 bg-brand-cream border-b-2 border-brand-ink">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 sm:h-16 flex items-stretch justify-between gap-4">
        <Link to={`${base}/recherche`} className="flex items-center flex-none"><Wordmark /></Link>

        <nav className="hidden sm:flex items-stretch gap-6">
          <NavLink to={`${base}/recherche`} className={tab}><Search className="h-4 w-4" /> Rechercher</NavLink>
          <NavLink to={`${base}/profil`} className={tab}><UserRound className="h-4 w-4" /> Mon profil</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <Link to={`${base}/profil`} className="flex items-center gap-2.5 border-2 border-brand-ink bg-white pl-0 pr-0 sm:pr-3 h-9 rounded-[2px] hover:bg-brand-cream transition">
            <span className="h-full aspect-square border-r-2 border-brand-ink overflow-hidden bg-brand-ink text-brand-cream font-display text-xs font-bold flex items-center justify-center">
              {actor?.photo_url ? <img src={actor.photo_url} alt="" className="h-full w-full object-cover" /> : initiale}
            </span>
            <span className="font-display text-[12px] font-bold uppercase tracking-[0.08em] text-brand-ink max-w-[9rem] truncate hidden sm:inline">{nom}</span>
          </Link>
          <button onClick={logout} title="Se déconnecter"
            className="h-9 w-9 border-2 border-brand-ink bg-white rounded-[2px] flex items-center justify-center text-brand-ink hover:bg-brand-coral hover:text-white hover:border-brand-ink transition">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav className="sm:hidden px-5 h-10 flex items-stretch gap-6 border-t border-brand-ink/15">
        <NavLink to={`${base}/recherche`} className={tab}><Search className="h-4 w-4" /> Rechercher</NavLink>
        <NavLink to={`${base}/profil`} className={tab}><UserRound className="h-4 w-4" /> Mon profil</NavLink>
      </nav>
    </header>
  );
}
