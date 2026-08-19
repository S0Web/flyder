import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo-flyder-dark.png';

const LINKS = [
  { to: '/', label: 'Clients', end: true },
  { to: '/tickets', label: 'Tickets' },
  { to: '/nouveautes', label: 'Nouveautés' },
];

export default function AdminLayout({ children }) {
  const { admin, logout } = useAuth();

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="bg-brand-ink px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <img src={logo} alt="Flyder" className="h-6 flex-shrink-0" />
          <nav className="flex items-center gap-1">
            {LINKS.map(l => (
              <NavLink key={l.to} to={l.to} end={l.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-white/20 text-white' : 'text-brand-slate hover:bg-white/10 hover:text-white'
                  }`
                }>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-brand-slate hidden sm:inline">{admin?.nom || admin?.email}</span>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-brand-slate hover:text-white">
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {children}
      </main>
    </div>
  );
}
