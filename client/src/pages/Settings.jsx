import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { parseServerDate, colorForUser } from '../lib/utils';
import UserModal from '../components/UserModal';
import Preferences from './Preferences';

const AUDIT_PAGE = 50;

const ACTION_LABELS = {
  switch_profile: 'Connexion au profil',
  create_profile: 'Profil créé',
  update_seance: 'Séance modifiée',
  update_personnel_creneau: 'Planning personnel modifié',
  dupliquer_semaine_personnel: 'Semaine dupliquée (personnel)',
  decision_conge: 'Demande de congé traitée',
};

// Traduit les valeurs brutes présentes dans le champ "détails"
const DETAIL_TERMS = {
  effectue: 'Effectué', programme: 'Programmé', annule: 'Annulé', paye: 'Payé',
  travail: 'Travail', cp: 'CP', ecole: 'École', ferie: 'Férié', arret: 'Arrêt', repos: 'Repos',
  statut: 'statut', nb_presents: 'présents',
};

function prettyDetails(details) {
  if (!details) return '—';
  return details.replace(/[a-zA-Zé_]+/g, (w) => DETAIL_TERMS[w] || w);
}


export default function Settings() {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const toast = useToast();
  const isManager = me?.role === 'manager';
  const [tab, setTab]     = useState('profil');
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditFilters, setAuditFilters] = useState({ action: '', user_id: '', from: '', to: '', order: 'desc' });
  const [modal, setModal] = useState(null);

  

  const loadAudit = (offset = 0) => {
    api.getAuditLog({ ...auditFilters, limit: AUDIT_PAGE, offset }).then(rows => {
      setAudit(prev => offset === 0 ? rows : [...prev, ...rows]);
      setAuditHasMore(rows.length === AUDIT_PAGE);
    }).catch(() => {});
  };

  useEffect(() => {
    if (isManager) api.getAppUsers().then(setUsers).catch(() => {});
  }, [isManager]);

  useEffect(() => {
    if (isManager && tab === 'audit') loadAudit(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager, tab, auditFilters]);

  function setAuditFilter(k, v) { setAuditFilters(f => ({ ...f, [k]: v })); }

  async function handleSave(form) {
    try {
      if (modal?.id) await api.updateAppUser(modal.id, form);
      else           await api.createAppUser(form);
      api.getAppUsers().then(setUsers);
      toast.success(modal?.id ? 'Profil mis à jour' : 'Profil créé');
    } catch (e) {
      toast.error('Échec : ' + e.message);
      throw e;
    }
  }

  const TABS = [
    { id: 'profil', label: 'Mon profil' },
    ...(isManager ? [
      { id: 'audit', label: 'Historique' },
      { id: 'preferences', label: 'Préférences' },
    ] : []),
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-lg font-bold text-gray-800">Paramètres</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`relative px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
            {t.badge && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pop" aria-label="Nouvelle réponse" />
            )}
          </button>
        ))}
      </div>

      {/* Mon profil */}
      {tab === 'profil' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 motion-safe:animate-fadeIn">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-14 w-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: colorForUser(me?.id) }}>
              {me?.prenom?.[0]}{me?.nom?.[0]}
            </div>
            <div>
              <div className="font-bold text-gray-800">{me?.prenom} {me?.nom}</div>
              <div className="text-sm text-gray-500">{me?.email}</div>
              <div className="text-xs mt-0.5 px-2 py-0.5 rounded inline-block" style={{ backgroundColor: me?.role === 'manager' ? '#eef9fd' : '#f3f4f6', color: me?.role === 'manager' ? '#12162B' : '#6b7280' }}>
                {me?.role === 'manager' ? 'Manager' : 'Utilisateur'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setModal(me)}
              className="text-sm px-4 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">
              Modifier mes informations
            </button>
            <button onClick={() => navigate(`/equipe/membres/${me.id}`)}
              className="text-sm px-4 py-2 rounded text-white font-medium"
              style={{ backgroundColor: '#3D5AFE' }}>
              Ouvrir ma fiche
            </button>
          </div>
        </div>
      )}

      {/* Historique */}
      {tab === 'audit' && isManager && (
        <div className="motion-safe:animate-fadeIn">
          {/* Filtres & tri */}
          <div className="flex flex-wrap items-end gap-2 mb-3 text-xs">
            <label className="flex flex-col gap-0.5">
              <span className="text-gray-500">Action</span>
              <select value={auditFilters.action} onChange={e => setAuditFilter('action', e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-300">
                <option value="">Toutes</option>
                {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-gray-500">Utilisateur</span>
              <select value={auditFilters.user_id} onChange={e => setAuditFilter('user_id', e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-300">
                <option value="">Tous</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-gray-500">Du</span>
              <input type="date" value={auditFilters.from} onChange={e => setAuditFilter('from', e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-300" />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-gray-500">Au</span>
              <input type="date" value={auditFilters.to} onChange={e => setAuditFilter('to', e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-300" />
            </label>
            <button onClick={() => setAuditFilter('order', auditFilters.order === 'desc' ? 'asc' : 'desc')}
              className="px-2.5 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-100">
              {auditFilters.order === 'desc' ? '↓ Récent' : '↑ Ancien'}
            </button>
            {(auditFilters.action || auditFilters.user_id || auditFilters.from || auditFilters.to) && (
              <button onClick={() => setAuditFilters({ action: '', user_id: '', from: '', to: '', order: auditFilters.order })}
                className="px-2.5 py-1.5 text-sky-600 hover:underline">Réinitialiser</button>
            )}
          </div>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full border-collapse text-xs min-w-[560px]">
              <thead>
                <tr style={{ backgroundColor: '#3D5AFE', color: '#fff' }}>
                  {['Date', 'Utilisateur', 'Action', 'Détails'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audit.map((a, i) => (
                  <tr key={a.id} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {parseServerDate(a.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-3 py-2 font-medium">{a.user_nom || '—'}</td>
                    <td className="px-3 py-2">{ACTION_LABELS[a.action] || a.action}</td>
                    <td className="px-3 py-2 text-gray-500">{prettyDetails(a.details)}</td>
                  </tr>
                ))}
                {audit.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400 italic">Aucune entrée.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {auditHasMore && (
            <div className="text-center mt-3">
              <button onClick={() => loadAudit(audit.length)}
                className="text-sm px-4 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">
                Charger plus
              </button>
            </div>
          )}
        </div>
      )}
      {/* Préférences */}
      {tab === 'preferences' && isManager && <div className="motion-safe:animate-fadeIn"><Preferences /></div>}

      {modal !== null && (
        <UserModal
          user={modal?.id ? modal : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

    </div>
  );
}
