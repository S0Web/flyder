import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Settings as GearIcon, Menu as MenuIcon, X as XIcon,
  CalendarDays, CalendarRange, Dumbbell, BookUser, GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { colorForUser } from '../lib/utils';
import logo from '../assets/logo.png';

const ALL_LINKS = [
  { to: '/',                   label: 'Planning des cours',  icon: CalendarDays,  end: true },
  { to: '/planning-personnel', label: 'Planning personnel',  icon: CalendarRange },
  { to: '/coaches',             label: 'Coaches',             icon: Dumbbell },
  { to: '/annuaire',           label: 'Annuaire',            icon: BookUser },
  { to: '/formation',          label: 'Formation',           icon: GraduationCap },
];

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

function NavItem({ to, label, icon: Icon, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive ? 'bg-sky-50 text-sky-700' : 'text-gray-600 hover:bg-gray-100'
        }`
      }
    >
      <Icon className="h-4.5 w-4.5 flex-shrink-0" strokeWidth={1.8} />
      {label}
    </NavLink>
  );
}

function SidebarContent({ links, salleNom, user, switchProfile, onNavigate }) {
  return (
    <>
      <div className="flex flex-col gap-1.5 px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <img src={logo} alt="Fitnessmov Aqua" className="h-8 w-auto" />
        {salleNom && (
          <span className="text-[11px] font-semibold bg-sky-50 text-sky-700 rounded-full px-2 py-0.5 self-start truncate max-w-full">
            {salleNom}
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {links.map(l => <NavItem key={l.to} {...l} onClick={onNavigate} />)}
      </nav>

      {user && (
        <div className="border-t border-gray-200 p-2 space-y-0.5 flex-shrink-0">
          <NavItem to="/parametres" label="Paramètres" icon={GearIcon} onClick={onNavigate} />
          <button
            onClick={switchProfile}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
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
  const [menuOpen, setMenuOpen] = useState(false);
  const restricted = user?.privileged === false;
  const links = restricted ? ALL_LINKS.filter(l => l.to !== '/annuaire') : ALL_LINKS;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:flex-col w-60 flex-shrink-0 bg-white border-r border-gray-200 sticky top-0 h-screen">
        <SidebarContent links={links} salleNom={salleNom} user={user} switchProfile={switchProfile} />
      </aside>

      {/* Barre + tiroir mobile */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center px-3 gap-3">
        <button
          type="button"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
        >
          {menuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
        <img src={logo} alt="Fitnessmov Aqua" className="h-8 w-auto" />
        {salleNom && (
          <span className="text-[11px] font-semibold bg-sky-50 text-sky-700 rounded-full px-2 py-0.5 whitespace-nowrap truncate">
            {salleNom}
          </span>
        )}
      </div>
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="relative w-64 bg-white flex flex-col h-full shadow-xl">
            <SidebarContent links={links} salleNom={salleNom} user={user} switchProfile={switchProfile} onNavigate={() => setMenuOpen(false)} />
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
        <main className={`flex-1 w-full px-4 sm:px-6 py-6 ${!restricted ? 'mt-14 lg:mt-0' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
