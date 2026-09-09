import { NavLink, Link } from 'react-router-dom';
import { Search, UserRound, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Wordmark from './Wordmark';

// Barre de navigation "verre" partagée par les deux espaces connectés.
// `base` = '/coach' ou '/salle'.
export default function TopBar({ base }) {
  const { actor, logout } = useAuth();
  const nom = actor?.prenom ? `${actor.prenom} ${actor.nom}` : actor?.nom;
  const initiale = (actor?.prenom || actor?.nom || '?').charAt(0).toUpperCase();

  const pill = ({ isActive }) =>
    `inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition ${
      isActive ? 'bg-white text-brand-ink shadow-sm' : 'text-brand-ink/60 hover:text-brand-ink'
    }`;

  return (
    <header className="sticky top-0 z-20 bg-brand-cream/85 backdrop-blur-md border-b border-black/5">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        <Link to={`${base}/recherche`} className="flex-none"><Wordmark /></Link>

        <nav className="hidden sm:flex items-center gap-1 rounded-full bg-black/[0.04] p-1">
          <NavLink to={`${base}/recherche`} className={pill}><Search className="h-4 w-4" /> Rechercher</NavLink>
          <NavLink to={`${base}/profil`} className={pill}><UserRound className="h-4 w-4" /> Mon profil</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <Link to={`${base}/profil`} className="flex items-center gap-2.5 rounded-full bg-white border border-black/5 pl-1 pr-3 py-1 hover:border-brand-ink/20 transition">
            <span className="h-7 w-7 rounded-full overflow-hidden bg-brand-ink text-white text-xs font-bold flex items-center justify-center">
              {actor?.photo_url ? <img src={actor.photo_url} alt="" className="h-full w-full object-cover" /> : initiale}
            </span>
            <span className="text-sm font-medium text-brand-ink max-w-[9rem] truncate hidden md:inline">{nom}</span>
          </Link>
          <button onClick={logout} title="Se déconnecter"
            className="h-9 w-9 rounded-full flex items-center justify-center text-brand-slate hover:text-brand-ink hover:bg-black/[0.04] transition">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav className="sm:hidden px-5 pb-3 flex gap-1 rounded-full">
        <NavLink to={`${base}/recherche`} className={pill}><Search className="h-4 w-4" /> Rechercher</NavLink>
        <NavLink to={`${base}/profil`} className={pill}><UserRound className="h-4 w-4" /> Mon profil</NavLink>
      </nav>
    </header>
  );
}
