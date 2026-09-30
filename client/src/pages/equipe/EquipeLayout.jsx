import { useState, useEffect, useCallback, Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { dateDepuisISO, aujourdhuiISO } from '../../lib/equipe';
import { rafraichirPastille } from '../../lib/useEquipePastille';

// Onglet « Équipe » : remplace l'ancien « Planning personnel » et regroupe tout
// ce qui concerne le personnel de la salle — planning, tâches, comptes rendus,
// fiches. Le manager a une vue d'ensemble ; chaque salarié voit sa journée et sa
// propre fiche.
export default function EquipeLayout() {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';
  const location = useLocation();
  const [membres, setMembres] = useState([]);

  // Liste des membres actifs (pour assigner une tâche, filtrer…) : la liste
  // publique des profils suffit, elle ne contient ni email ni donnée RH.
  const chargerMembres = useCallback(() => {
    api.getProfiles().then(ps => setMembres(ps.map(({ id, prenom, nom, role }) => ({ id, prenom, nom, role })))).catch(() => {});
  }, []);
  useEffect(() => { chargerMembres(); }, [chargerMembres]);

  const onglets = isManager ? [
    { to: '/equipe', label: "Vue d'ensemble", end: true },
    { to: '/equipe/ma-journee', label: 'Ma journée' },
    { to: '/equipe/planning', label: 'Planning' },
    { to: '/equipe/taches', label: 'Tâches' },
    { to: '/equipe/comptes-rendus', label: 'Comptes rendus' },
    { to: '/equipe/incidents', label: 'Incidents' },
    { to: '/equipe/membres', label: 'Effectif' },
  ] : [
    { to: '/equipe', label: 'Ma journée', end: true },
    { to: '/equipe/planning', label: 'Planning' },
    { to: '/equipe/taches', label: 'Mes tâches' },
    { to: '/equipe/comptes-rendus', label: 'Mes comptes rendus' },
    { to: '/equipe/incidents', label: 'Incidents' },
    { to: `/equipe/membres/${user?.id}`, label: 'Ma fiche' },
  ];

  const d = dateDepuisISO(aujourdhuiISO());
  const semaine = (() => {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    return Math.ceil((((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
  })();

  return (
    <div className="pb-12">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <h1 className="font-display text-[34px] sm:text-[40px] font-bold text-brand-ink leading-none tracking-tight">Équipe</h1>
        <div className="font-mono text-[11px] text-gray-500 text-right leading-relaxed">
          <div className="text-brand-ink">{d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div>semaine {String(semaine).padStart(2, '0')}</div>
        </div>
      </div>

      <div className="sticky top-14 lg:top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-brand-cream/95 backdrop-blur mb-6">
        <nav className="flex items-end gap-6 overflow-x-auto no-scrollbar border-b border-brand-ink/15">
          {onglets.map(o => (
            <NavLink key={o.to} to={o.to} end={o.end}
              className={({ isActive }) => `relative flex-shrink-0 pt-3 pb-3 text-[15px] transition-colors ${
                isActive ? 'text-brand-ink font-semibold' : 'text-gray-500 hover:text-brand-ink'
              }`}>
              {({ isActive }) => (
                <>
                  {o.label}
                  {isActive && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-fitness" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div key={location.pathname} className="motion-safe:animate-fadeIn">
        {/* Suspense local : les sous-pages sont chargées à la demande, sans faire
            disparaître l'en-tête et les onglets pendant le chargement. */}
        <Suspense fallback={<p className="py-20 text-center font-mono text-xs text-gray-400">chargement…</p>}>
          <Outlet context={{ membres, rafraichirCompteurs: rafraichirPastille, rechargerMembres: chargerMembres }} />
        </Suspense>
      </div>
    </div>
  );
}
