import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { parseServerDate, colorForUser } from '../lib/utils';
import { useTicketsUnreadCount } from '../lib/useTicketsUnreadCount';
import UserModal from '../components/UserModal';
import ImportFichesDePaieModal from '../components/ImportFichesDePaieModal';
import TicketsTab from '../components/TicketsTab';

const AUDIT_PAGE = 50;

const ACTION_LABELS = {
  switch_profile: 'Connexion au profil',
  create_profile: 'Profil créé',
  update_seance: 'Séance modifiée',
  update_personnel_creneau: 'Planning personnel modifié',
  dupliquer_semaine_personnel: 'Semaine dupliquée (personnel)',
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

function AccesTab() {
  const toast = useToast();
  const [ips, setIps] = useState([]);
  const [votreIp, setVotreIp] = useState(null);
  const [form, setForm] = useState({ ip: '', label: '' });
  const [saving, setSaving] = useState(false);

  function load() {
    api.getIpAutorisees().then(({ ips, votreIp }) => { setIps(ips); setVotreIp(votreIp); }).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.ip.trim()) return;
    setSaving(true);
    try {
      await api.addIpAutorisee(form.ip.trim(), form.label.trim());
      setForm({ ip: '', label: '' });
      toast.success('IP autorisée ajoutée');
      load();
    } catch (err) {
      toast.error('Échec : ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Retirer cette IP de la liste autorisée ?')) return;
    try {
      await api.deleteIpAutorisee(id);
      load();
    } catch (err) {
      toast.error('Échec : ' + err.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-600">
          Un manager peut toujours tout modifier. Depuis un compte utilisateur simple, la modification et
          l'accès à l'annuaire ne sont possibles que depuis une IP de cette liste (typiquement le Wi-Fi de
          la salle) — ailleurs, l'accès est en lecture seule et l'annuaire est masqué.
        </p>
        {votreIp && (
          <p className="text-xs text-gray-400 mt-2">
            Votre adresse IP actuelle : <span className="font-mono text-gray-600">{votreIp}</span>
          </p>
        )}
      </div>

      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Adresse IP</label>
          <input value={form.ip} onChange={e => setForm(f => ({ ...f, ip: e.target.value }))}
            placeholder={votreIp || '203.0.113.42'}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Libellé (optionnel)</label>
          <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            placeholder="Wi-Fi de la salle"
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
        </div>
        <button type="submit" disabled={saving}
          className="flex items-center gap-1.5 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#3D5AFE' }}>
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </form>

      {ips.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4 text-center">Aucune IP autorisée pour l'instant.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {ips.map((row, i) => (
            <div key={row.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }}
              className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <div className="font-mono text-sm text-gray-700">{row.ip}</div>
                {row.label && <div className="text-xs text-gray-400 truncate">{row.label}</div>}
              </div>
              <button onClick={() => handleDelete(row.id)} className="text-xs text-red-500 hover:underline flex-shrink-0">
                Retirer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const { salleNom, corbeilHistoriqueImporte, refetch: refetchConfig } = useConfig();
  const toast = useToast();
  const isManager = me?.role === 'manager';
  const { count: ticketsNonLus, refetch: refetchTicketsNonLus } = useTicketsUnreadCount(!!me);
  const [tab, setTab]     = useState('profil');
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditFilters, setAuditFilters] = useState({ action: '', user_id: '', from: '', to: '', order: 'desc' });
  const [modal, setModal] = useState(null);
  const [importModal, setImportModal] = useState(false);
  const [backing, setBacking] = useState(false);
  const [backupError, setBackupError] = useState(null);
  const [seedingBallancourt, setSeedingBallancourt] = useState(false);
  const [seedBallancourtResult, setSeedBallancourtResult] = useState(null);
  const [seedingCorbeil, setSeedingCorbeil] = useState(false);
  const [seedCorbeilResult, setSeedCorbeilResult] = useState(null);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [seedDemoResult, setSeedDemoResult] = useState(null);

  async function handleSeedBallancourt() {
    setSeedingBallancourt(true);
    setSeedBallancourtResult(null);
    try {
      const res = await api.seedBallancourt();
      setSeedBallancourtResult({
        ok: true,
        message: `${res.seancesCreees} séance(s) et ${res.joursCreees} jour(s) de planning personnel importés (${res.seancesIgnorees} séance(s) et ${res.joursIgnores} jour(s) déjà présents ignorés).`,
      });
    } catch (err) {
      setSeedBallancourtResult({ ok: false, message: err.message });
    } finally {
      setSeedingBallancourt(false);
    }
  }

  async function handleSeedCorbeil() {
    setSeedingCorbeil(true);
    setSeedCorbeilResult(null);
    try {
      const res = await api.seedCorbeilHistorique();
      setSeedCorbeilResult({
        ok: true,
        message: `${res.seancesCreees} séance(s) importées (${res.seancesIgnorees} déjà présentes ignorées).`,
      });
      await refetchConfig();
    } catch (err) {
      setSeedCorbeilResult({ ok: false, message: err.message });
    } finally {
      setSeedingCorbeil(false);
    }
  }

  async function handleSeedDemo() {
    if (!confirm('Réinitialiser les données de démonstration ? Les coachs et séances fictifs actuels seront effacés puis régénérés.')) return;
    setSeedingDemo(true);
    setSeedDemoResult(null);
    try {
      const res = await api.seedDemo(true);
      setSeedDemoResult({ ok: true, message: `${res.coachsCrees} coach(s) fictif(s) et ${res.seancesCreees} séance(s) régénérés.` });
    } catch (err) {
      setSeedDemoResult({ ok: false, message: err.message });
    } finally {
      setSeedingDemo(false);
    }
  }

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

  async function handleToggleActif(u) {
    try {
      await api.updateAppUser(u.id, { actif: u.actif ? 0 : 1 });
      api.getAppUsers().then(setUsers);
    } catch (e) {
      toast.error('Échec : ' + e.message);
    }
  }

  async function handleDeleteUser(u) {
    if (!confirm(`Supprimer définitivement ${u.prenom} ${u.nom} ?\n\nIl disparaît de la liste mais son nom reste visible sur les plannings passés où il apparaît.`)) return;
    try {
      await api.deleteAppUser(u.id);
      api.getAppUsers().then(setUsers);
      toast.success('Profil supprimé');
    } catch (e) {
      toast.error('Échec : ' + e.message);
    }
  }

  async function handleBackup() {
    setBacking(true);
    setBackupError(null);
    try {
      await api.downloadBackup();
      toast.success('Sauvegarde téléchargée');
    } catch (e) {
      setBackupError(e.message);
      toast.error('Échec de la sauvegarde : ' + e.message);
    } finally {
      setBacking(false);
    }
  }

  const TABS = [
    { id: 'profil', label: 'Mon profil' },
    // Visible par tout profil (pas seulement les managers) — le support est
    // ouvert à toute la salle, cf. plan.
    { id: 'tickets', label: 'Support', badge: ticketsNonLus > 0 },
    ...(isManager ? [{ id: 'users', label: 'Utilisateurs' }, { id: 'audit', label: 'Historique' }, { id: 'acces', label: 'Accès' }] : []),
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
            <button onClick={() => navigate(`/parametres/utilisateurs/${me.id}`)}
              className="text-sm px-4 py-2 rounded text-white font-medium"
              style={{ backgroundColor: '#3D5AFE' }}>
              Ouvrir ma fiche
            </button>
          </div>
        </div>
      )}

      {/* Support */}
      {tab === 'tickets' && (
        <div className="motion-safe:animate-fadeIn"><TicketsTab onRead={refetchTicketsNonLus} /></div>
      )}

      {/* Utilisateurs */}
      {tab === 'users' && isManager && (
        <div className="motion-safe:animate-fadeIn">
          <div className="flex justify-between items-center mb-3 gap-3">
            <span className="text-sm text-gray-500">{users.length} utilisateur(s)</span>
            <div className="flex gap-2">
              <button onClick={() => setImportModal(true)}
                className="text-sm px-4 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">
                Importer les fiches de paie
              </button>
              <button onClick={() => setModal({})}
                className="flex items-center gap-1.5 text-white px-4 py-2 rounded text-sm font-medium"
                style={{ backgroundColor: '#3D5AFE' }}>
                <Plus className="h-4 w-4" /> Nouveau
              </button>
            </div>
          </div>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full border-collapse text-sm min-w-[520px]">
            <thead>
              <tr style={{ backgroundColor: '#3D5AFE', color: '#fff' }}>
                {['Nom', 'Email', 'Rôle', 'Statut', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : '#fff' }} className={u.actif ? '' : 'opacity-40'}>
                  <td className="px-3 py-2 font-medium">{u.prenom} {u.nom}</td>
                  <td className="px-3 py-2 text-gray-500">{u.email}</td>
                  <td className="px-3 py-2">{u.role === 'manager' ? 'Manager' : 'Utilisateur'}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => handleToggleActif(u)}
                      title="Cliquer pour changer le statut"
                      className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${u.actif ? 'text-green-700 bg-green-50 hover:bg-green-100' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'}`}>
                      {u.actif ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button onClick={() => navigate(`/parametres/utilisateurs/${u.id}`)} className="text-xs text-sky-600 hover:underline">Ouvrir la fiche</button>
                    {!u.actif && u.id !== me?.id && (
                      <button onClick={() => handleDeleteUser(u)} className="ml-3 text-xs text-red-500 hover:underline">
                        Supprimer définitivement
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Import ponctuel de l'historique Ballancourt — visible uniquement sur cette instance */}
          {salleNom === 'Ballancourt-sur-Essonne' && (
            <div className="mt-6 text-right">
              <button onClick={handleSeedBallancourt} disabled={seedingBallancourt}
                className="text-xs text-gray-400 hover:text-gray-600 hover:underline disabled:opacity-50">
                {seedingBallancourt ? 'Import…' : "⬇ Importer l'historique Ballancourt (cours, coachs, séances, planning personnel)"}
              </button>
              {seedBallancourtResult && (
                <div className={`text-xs mt-1 ${seedBallancourtResult.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {seedBallancourtResult.ok ? '' : 'Erreur : '}{seedBallancourtResult.message}
                </div>
              )}
            </div>
          )}

          {/* Import ponctuel de l'historique Corbeil (juin 2024 - août 2025) — visible
              uniquement sur cette instance ; le bouton disparaît une fois l'import
              effectué, mais le résultat reste affiché le temps de la session */}
          {salleNom === 'Corbeil-Essonnes' && (!corbeilHistoriqueImporte || seedCorbeilResult) && (
            <div className="mt-6 text-right">
              {!corbeilHistoriqueImporte && (
                <button onClick={handleSeedCorbeil} disabled={seedingCorbeil}
                  className="text-xs text-gray-400 hover:text-gray-600 hover:underline disabled:opacity-50">
                  {seedingCorbeil ? 'Import…' : "⬇ Importer l'historique des cours (juin 2024 - août 2025)"}
                </button>
              )}
              {seedCorbeilResult && (
                <div className={`text-xs mt-1 ${seedCorbeilResult.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {seedCorbeilResult.ok ? '' : 'Erreur : '}{seedCorbeilResult.message}
                </div>
              )}
            </div>
          )}

          {/* Données de démo — visible uniquement sur l'instance "Demo-Portfolio" dédiée,
              jamais sur une vraie salle. Permet de régénérer un jeu de données 100%
              fictif avant de montrer l'appli (ex. entretien). */}
          {salleNom === 'Demo-Portfolio' && (
            <div className="mt-6 text-right">
              <button onClick={handleSeedDemo} disabled={seedingDemo}
                className="text-xs text-gray-400 hover:text-gray-600 hover:underline disabled:opacity-50">
                {seedingDemo ? 'Génération…' : '⟳ Régénérer les données de démonstration'}
              </button>
              {seedDemoResult && (
                <div className={`text-xs mt-1 ${seedDemoResult.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {seedDemoResult.ok ? '' : 'Erreur : '}{seedDemoResult.message}
                </div>
              )}
            </div>
          )}

          {/* Sauvegarde — discrète (usage exceptionnel) */}
          <div className="mt-6 text-right">
            <button onClick={handleBackup} disabled={backing}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 hover:underline disabled:opacity-50">
              <Download className="h-3.5 w-3.5" /> {backing ? 'Préparation…' : 'Télécharger une sauvegarde de la base'}
            </button>
            {backupError && <div className="text-xs text-red-500 mt-1">Erreur : {backupError}</div>}
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

      {tab === 'acces' && isManager && <div className="motion-safe:animate-fadeIn"><AccesTab /></div>}

      {modal !== null && (
        <UserModal
          user={modal?.id ? modal : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {importModal && (
        <ImportFichesDePaieModal
          users={users}
          onClose={() => setImportModal(false)}
          onImported={() => {}}
        />
      )}
    </div>
  );
}
