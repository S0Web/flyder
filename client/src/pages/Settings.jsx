import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays, UserCog, Users as UsersIcon, LogIn } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { parseServerDate, colorForUser, formatDate } from '../lib/utils';
import UserModal from '../components/UserModal';
import Preferences from './Preferences';

const AUDIT_PAGE = 50;

// Catégories du filtre "Portée" — alignées sur CATEGORIES côté serveur
// (server/src/routes/appUsers.js). Un manager pense en "qu'est-ce qui a
// changé sur le planning du personnel", pas en nom technique d'action ;
// regrouper par catégorie plutôt que par action brute colle à cette question.
const CATEGORIES = [
  { id: 'cours',      label: 'Planning des cours',    icon: CalendarDays, color: '#3D5AFE', bg: '#EEF1FF' },
  { id: 'personnel',  label: 'Planning du personnel', icon: UserCog,      color: '#7C3AED', bg: '#F3EEFF' },
  { id: 'comptes',    label: 'Comptes utilisateurs',  icon: UsersIcon,    color: '#0F8A5F', bg: '#E8F7F0' },
  { id: 'connexions', label: 'Connexions',            icon: LogIn,        color: '#6B7280', bg: '#F3F4F6' },
];
const CATEGORY_BY_ACTION = {
  update_seance: 'cours',
  update_personnel_creneau: 'personnel',
  dupliquer_semaine_personnel: 'personnel',
  decision_conge: 'personnel',
  create_user: 'comptes',
  delete_user: 'comptes',
  create_profile: 'comptes',
  seed_admin_account: 'comptes',
  recover_manager: 'comptes',
  switch_profile: 'connexions',
  dev_access_login: 'connexions',
};

const ACTION_LABELS = {
  switch_profile: 'Connexion',
  dev_access_login: 'Accès support',
  create_profile: 'Premier profil créé',
  create_user: 'Profil créé',
  delete_user: 'Profil supprimé',
  seed_admin_account: 'Compte créé (système)',
  recover_manager: 'Manager promu (système)',
  update_seance: 'Séance modifiée',
  update_personnel_creneau: 'Planning personnel modifié',
  dupliquer_semaine_personnel: 'Semaine dupliquée (personnel)',
  decision_conge: 'Demande de congé traitée',
};

const STATUT_LABELS = { programme: 'Programmé', effectue: 'Effectué', annule: 'Annulé', paye: 'Payé' };
const TYPE_PERSONNEL_LABELS = { travail: 'Travail', cp: 'CP', ecole: 'École', ferie: 'Férié', arret: 'Arrêt', repos: 'Repos' };

// Transforme une ligne brute d'audit_log en { cible, resume } lisibles.
// Chaque action écrit son champ "details" dans un format différent (voir les
// routes qui l'alimentent : seances.js, personnelCreneaux.js, auth.js,
// appUsers.js) — un seul traitement générique mot à mot ne donnait que des
// fragments ("planning", "travail", ":"...), donc une lecture dédiée par
// action plutôt qu'un hack regex unique.
function lireEntree(a, usersById) {
  switch (a.action) {
    case 'update_seance': {
      const champs = Object.fromEntries(
        (a.details || '').split(',').map((p) => p.trim()).filter(Boolean).map((p) => {
          const i = p.indexOf('=');
          return i === -1 ? [p, ''] : [p.slice(0, i), p.slice(i + 1)];
        })
      );
      const morceaux = [];
      if (champs.statut !== undefined) morceaux.push(`Statut → ${STATUT_LABELS[champs.statut] || champs.statut}`);
      if (champs.nb_presents !== undefined) morceaux.push(`${champs.nb_presents || 0} présent(s)`);
      if (champs.horaire !== undefined) morceaux.push(`Horaire → ${champs.horaire}`);
      if (champs.date !== undefined) morceaux.push(`Date → ${formatDate(champs.date)}`);
      if (champs.coach_id !== undefined) morceaux.push('Coach changé');
      if (champs.cours_type_id !== undefined) morceaux.push('Type de cours changé');
      if (champs.notes !== undefined) morceaux.push(`Note : « ${champs.notes || '(vidée)'} »`);
      const cible = a.cours_nom
        ? `${a.cours_nom} — ${formatDate(a.seance_date)}${a.seance_horaire ? ' ' + a.seance_horaire : ''}`
        : `Séance supprimée depuis (#${a.entity_id})`;
      return { cible, resume: morceaux.join(' · ') || '—' };
    }
    case 'update_personnel_creneau': {
      const m = (a.details || '').match(/^(\d{4}-\d{2}-\d{2}):\s*(.+)$/);
      const employe = usersById.get(a.entity_id);
      return {
        cible: employe ? `${employe.prenom} ${employe.nom}` : `Employé #${a.entity_id}`,
        resume: m ? `${formatDate(m[1])} → ${TYPE_PERSONNEL_LABELS[m[2]] || m[2]}` : (a.details || '—'),
      };
    }
    case 'dupliquer_semaine_personnel':
      return { cible: 'Planning personnel', resume: a.details || '—' };
    case 'create_user':
    case 'create_profile':
      return { cible: a.details || '—', resume: 'Nouveau profil créé' };
    case 'delete_user':
      return { cible: a.details || '—', resume: 'Profil supprimé' };
    case 'switch_profile':
      return { cible: a.user_nom || '—', resume: (a.details || '').replace('Profil sélectionné depuis ', 'Depuis ') || 'Connexion' };
    case 'dev_access_login':
      return { cible: 'Accès support Flyder', resume: (a.details || '').replace('Accès support depuis ', 'Depuis ') };
    case 'seed_admin_account':
      return { cible: 'Compte Admin', resume: a.details || 'Créé automatiquement au premier démarrage' };
    case 'recover_manager':
      return { cible: a.user_nom || '—', resume: a.details || 'Promu manager automatiquement' };
    case 'decision_conge':
      return { cible: a.conge_demandeur || `Demande #${a.entity_id}`, resume: a.details || '—' };
    default:
      return { cible: a.entity || '—', resume: a.details || '—' };
  }
}


export default function Settings() {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const toast = useToast();
  const isManager = me?.role === 'manager';
  const [tab, setTab]     = useState('profil');
  const [users, setUsers] = useState([]);
  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const [audit, setAudit] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(0);
  const [auditFilters, setAuditFilters] = useState({ categorie: '', user_id: '', from: '', to: '', order: 'desc' });
  const [modal, setModal] = useState(null);

  

  // Pagination par page de 50, pas par défilement infini : un manager qui
  // cherche "qui a changé ce cours" veut pouvoir dire "page 3", pas recharger
  // un "Charger plus" en boucle jusqu'à retrouver la bonne ligne.
  const loadAudit = (page) => {
    api.getAuditLog({ ...auditFilters, limit: AUDIT_PAGE, offset: page * AUDIT_PAGE }).then(({ rows, total }) => {
      setAudit(rows);
      setAuditTotal(total);
    }).catch(() => {});
  };

  function gotoAuditPage(page) {
    if (page < 0) return;
    setAuditPage(page);
    loadAudit(page);
  }

  useEffect(() => {
    if (isManager) api.getAppUsers().then(setUsers).catch(() => {});
  }, [isManager]);

  useEffect(() => {
    if (isManager && tab === 'audit') { setAuditPage(0); loadAudit(0); }
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
              <span className="text-gray-500">Portée</span>
              <select value={auditFilters.categorie} onChange={e => setAuditFilter('categorie', e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-300">
                <option value="">Tout</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
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
            {(auditFilters.categorie || auditFilters.user_id || auditFilters.from || auditFilters.to) && (
              <button onClick={() => setAuditFilters({ categorie: '', user_id: '', from: '', to: '', order: auditFilters.order })}
                className="px-2.5 py-1.5 text-sky-600 hover:underline">Réinitialiser</button>
            )}
          </div>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full border-collapse text-xs min-w-[640px]">
              <thead>
                <tr style={{ backgroundColor: '#3D5AFE', color: '#fff' }}>
                  {['Date', 'Utilisateur', 'Action', 'Concerne', 'Détail'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audit.map((a, i) => {
                  const cat = CATEGORIES.find(c => c.id === CATEGORY_BY_ACTION[a.action]);
                  const { cible, resume } = lireEntree(a, usersById);
                  return (
                    <tr key={a.id} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                        {parseServerDate(a.created_at).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{a.user_nom || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-medium"
                          style={{ backgroundColor: cat?.bg || '#F3F4F6', color: cat?.color || '#6B7280' }}>
                          {cat && <cat.icon className="h-3.5 w-3.5" />}
                          {ACTION_LABELS[a.action] || a.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-700">{cible}</td>
                      <td className="px-3 py-2 text-gray-500">{resume}</td>
                    </tr>
                  );
                })}
                {audit.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400 italic">Aucune entrée.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination par page (plutôt qu'un "Charger plus" sans fin) : un
              manager qui cherche une entrée précise doit pouvoir avancer page
              par page sans tout recharger à chaque fois. */}
          <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
            <span>
              {auditTotal === 0 ? 'Aucun résultat' :
                `Résultats ${auditPage * AUDIT_PAGE + 1}–${auditPage * AUDIT_PAGE + audit.length} sur ${auditTotal}`}
            </span>
            <div className="flex gap-2">
              <button onClick={() => gotoAuditPage(auditPage - 1)} disabled={auditPage === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="h-3.5 w-3.5" /> Précédent
              </button>
              <button onClick={() => gotoAuditPage(auditPage + 1)} disabled={(auditPage + 1) * AUDIT_PAGE >= auditTotal}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                Suivant <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
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
