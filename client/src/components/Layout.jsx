import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Settings as GearIcon, Menu as MenuIcon, X as XIcon,
  CalendarDays, CalendarRange, ClipboardList, BarChart3, BookUser, GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useTicketsUnreadCount } from '../lib/useTicketsUnreadCount';
import { colorForUser } from '../lib/utils';
import logo from '../assets/logo-flyder-dark.png';

const ALL_LINKS = [
  { to: '/',                   label: 'Planning des cours',  icon: CalendarDays,  end: true },
  { to: '/recapitulatif',      label: 'Récapitulatif',       icon: ClipboardList },
  { to: '/analyse',            label: 'Analyse',             icon: BarChart3 },
  { to: '/planning-personnel', label: 'Planning personnel',  icon: CalendarRange },
  { to: '/annuaire',           label: 'Annuaire',            icon: BookUser },
  { to: '/formation',          label: 'Formation',           icon: GraduationCap },
];

// Fitnessmov (et toute autre salle) est un client Flyder, pas le propriétaire du
// produit — ce badge affiche juste le nom de la salle, sans lien vers une autre
// instance (chaque salle est un client indépendant, il n'y a plus rien à sauter).
// Deux variantes : la sidebar/le tiroir mobile ont la place de laisser le nom
// passer sur deux lignes (ex. "Fitnessmov Corbeil-Essonnes") ; la barre mobile,
// contrainte en hauteur, tronque plutôt que de casser la mise en page.
const SALLE_BADGE_CLASS = 'inline-flex items-center text-[11px] font-semibold bg-white/15 text-white rounded-full px-2 py-0.5 max-w-full truncate';
const SALLE_BADGE_WRAP_CLASS = 'inline-block text-[11px] font-semibold bg-white/15 text-white rounded-lg px-2 py-1 max-w-full leading-snug';

function Bubble({ user, size = 'h-7 w-7' }) {
  return (
    <span
      className={`${size} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
      style={{ backgroundColor: colorForUser(user.id) }}
    >
      {user.prenom?.[0]}{user.nom?.[0]}
    </span>
  );
}

function NavItem({ to, label, icon: Icon, end, onClick, badge }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive ? 'bg-white/20 text-white' : 'text-brand-cream/70 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <span className="relative flex-shrink-0">
        <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-brand-ink animate-pop" aria-label="Nouvelle réponse support" />
        )}
      </span>
      {label}
    </NavLink>
  );
}

function SidebarContent({ links, salleNom, user, switchProfile, onNavigate, ticketsNonLus }) {
  return (
    <>
      <div className="flex flex-col items-start gap-1.5 px-4 py-3 border-b border-white/10 flex-shrink-0">
        <img src={logo} alt="Flyder" className="h-6 w-auto self-start flex-shrink-0" />
        {salleNom && <span className={SALLE_BADGE_WRAP_CLASS}>{salleNom}</span>}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {links.map(l => <NavItem key={l.to} {...l} onClick={onNavigate} />)}
      </nav>

      {user && (
        <div className="border-t border-white/10 p-2 space-y-0.5 flex-shrink-0">
          <NavItem to="/parametres" label="Paramètres" icon={GearIcon} onClick={onNavigate} badge={ticketsNonLus > 0} />
          <button
            onClick={switchProfile}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-brand-cream/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Bubble user={user} />
            <span className="truncate">{user.prenom}</span>
          </button>
        </div>
      )}
    </>
  );
}

export default function Layout({ children }) {
  const { user, switchProfile } = useAuth();
  const { salleNom } = useConfig();
  const { count: ticketsNonLus } = useTicketsUnreadCount(!!user);
  const [menuOpen, setMenuOpen] = useState(false);
  const restricted = user?.privileged === false;
  const links = restricted ? ALL_LINKS.filter(l => l.to !== '/annuaire') : ALL_LINKS;

  return (
    <div className="min-h-screen bg-brand-cream flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:flex-col w-60 flex-shrink-0 bg-brand-ink sticky top-0 h-screen shadow-md">
        <SidebarContent links={links} salleNom={salleNom} user={user} switchProfile={switchProfile} ticketsNonLus={ticketsNonLus} />
      </aside>

      {/* Barre + tiroir mobile */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-brand-ink shadow-md flex items-center px-3 gap-3">
        <button
          type="button"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="p-1.5 rounded text-white hover:bg-white/10 transition-colors"
        >
          {menuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
        <img src={logo} alt="Flyder" className="h-6 w-auto flex-shrink-0" />
        {salleNom && <span className={SALLE_BADGE_CLASS}>{salleNom}</span>}
      </div>
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="relative w-64 bg-brand-ink flex flex-col h-full shadow-xl">
            <SidebarContent links={links} salleNom={salleNom} user={user} switchProfile={switchProfile} onNavigate={() => setMenuOpen(false)} ticketsNonLus={ticketsNonLus} />
          </aside>
        </div>
      )}

      {/* Colonne de contenu */}
      <div className="flex-1 flex flex-col min-w-0">
        {restricted && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-xs sm:text-sm text-center py-1.5 px-4 mt-14 lg:mt-0">
            Lecture seule depuis cet accès — connecte-toi depuis la salle ou avec un compte manager pour modifier.
          </div>
        )}
        <main className={`flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 ${!restricted ? 'mt-14 lg:mt-0' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
