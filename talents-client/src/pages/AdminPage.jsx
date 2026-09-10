import { useState, useEffect, useCallback } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { adminApi, getAdminKey, setAdminKey, clearAdminKey } from '../lib/adminApi';
import { labelDiscipline } from '../lib/constants';
import Wordmark from '../components/Wordmark';

function ville(adresse) {
  const m = (adresse || '').match(/\d{5}\s+(.+)$/);
  return m ? m[1] : (adresse || '—');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso.replace(' ', 'T') + 'Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Page non référencée (aucun lien nulle part dans l'appli) — accès direct par
// URL, gardé par une clé partagée (ADMIN_KEY). Un seul utilisateur prévu
// (l'éditeur de Flyder Talents), donc pas de vrai système de comptes ici.
function LoginForm({ onLoggedIn }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      await adminApi.login(key);
      setAdminKey(key);
      onLoggedIn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-black/5 shadow-card p-8 w-full max-w-sm space-y-4">
        <Wordmark />
        <h1 className="font-display text-lg font-bold text-brand-ink">Accès admin</h1>
        {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>}
        <input type="password" autoFocus placeholder="Clé admin" value={key} onChange={(e) => setKey(e.target.value)} className="field" />
        <button type="submit" disabled={busy || !key} className="btn-primary w-full">{busy ? 'Vérification…' : 'Entrer'}</button>
      </form>
    </div>
  );
}

function ActifToggle({ actif, onToggle }) {
  return (
    <button type="button" onClick={onToggle}
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
        actif ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}>
      {actif ? 'Actif' : 'Inactif'}
    </button>
  );
}

function CoachesTable({ coaches, onToggle, onDelete }) {
  return (
    <div className="overflow-x-auto bg-white rounded-3xl border border-black/5 shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-brand-slate border-b border-black/5">
            <th className="px-4 py-3">Nom</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Ville</th>
            <th className="px-4 py-3">Disciplines</th>
            <th className="px-4 py-3">Tarif</th>
            <th className="px-4 py-3">Remplacements</th>
            <th className="px-4 py-3">Complet</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Créé le</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {coaches.map((c, i) => (
            <tr key={c.id} className={`border-b border-black/5 last:border-0 ${i % 2 === 1 ? 'bg-brand-cream/40' : ''}`}>
              <td className="px-4 py-2.5 font-medium text-brand-ink whitespace-nowrap">{c.prenom} {c.nom}</td>
              <td className="px-4 py-2.5 text-brand-ink/70">{c.email}</td>
              <td className="px-4 py-2.5 text-brand-ink/70 whitespace-nowrap">{ville(c.adresse)}</td>
              <td className="px-4 py-2.5 text-brand-ink/70">
                {(c.disciplines || '').split(',').filter(Boolean).map(labelDiscipline).join(', ') || '—'}
              </td>
              <td className="px-4 py-2.5 text-brand-ink/70 whitespace-nowrap">{c.tarif_horaire != null ? `${c.tarif_horaire} €/h` : '—'}</td>
              <td className="px-4 py-2.5">{c.disponible_remplacements ? '✅' : '—'}</td>
              <td className="px-4 py-2.5">{c.profil_complet ? '✅' : '—'}</td>
              <td className="px-4 py-2.5"><ActifToggle actif={!!c.actif} onToggle={() => onToggle(c)} /></td>
              <td className="px-4 py-2.5 text-brand-slate whitespace-nowrap">{fmtDate(c.created_at)}</td>
              <td className="px-4 py-2.5">
                <button type="button" onClick={() => onDelete(c)} title="Supprimer" className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
              </td>
            </tr>
          ))}
          {coaches.length === 0 && (
            <tr><td colSpan={10} className="px-4 py-8 text-center text-brand-slate italic">Aucun coach inscrit.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function GymsTable({ gyms, onToggle, onDelete }) {
  return (
    <div className="overflow-x-auto bg-white rounded-3xl border border-black/5 shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-brand-slate border-b border-black/5">
            <th className="px-4 py-3">Nom</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Ville</th>
            <th className="px-4 py-3">Disciplines recherchées</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Complet</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Créé le</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {gyms.map((g, i) => (
            <tr key={g.id} className={`border-b border-black/5 last:border-0 ${i % 2 === 1 ? 'bg-brand-cream/40' : ''}`}>
              <td className="px-4 py-2.5 font-medium text-brand-ink whitespace-nowrap">{g.nom}</td>
              <td className="px-4 py-2.5 text-brand-ink/70">{g.email}</td>
              <td className="px-4 py-2.5 text-brand-ink/70 whitespace-nowrap">{ville(g.adresse)}</td>
              <td className="px-4 py-2.5 text-brand-ink/70">
                {(g.disciplines_recherchees || '').split(',').filter(Boolean).map(labelDiscipline).join(', ') || '—'}
              </td>
              <td className="px-4 py-2.5 text-brand-ink/70 whitespace-nowrap">{g.contact_telephone || g.contact_email || '—'}</td>
              <td className="px-4 py-2.5">{g.profil_complet ? '✅' : '—'}</td>
              <td className="px-4 py-2.5"><ActifToggle actif={!!g.actif} onToggle={() => onToggle(g)} /></td>
              <td className="px-4 py-2.5 text-brand-slate whitespace-nowrap">{fmtDate(g.created_at)}</td>
              <td className="px-4 py-2.5">
                <button type="button" onClick={() => onDelete(g)} title="Supprimer" className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
              </td>
            </tr>
          ))}
          {gyms.length === 0 && (
            <tr><td colSpan={9} className="px-4 py-8 text-center text-brand-slate italic">Aucune salle inscrite.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Dashboard() {
  const [tab, setTab] = useState('coaches');
  const [coaches, setCoaches] = useState(null);
  const [gyms, setGyms] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([adminApi.getCoaches(), adminApi.getGyms()])
      .then(([c, g]) => { setCoaches(c); setGyms(g); })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleCoach(c) {
    try { await adminApi.toggleCoachActif(c.id, !c.actif); load(); }
    catch (err) { setError(err.message); }
  }
  async function toggleGym(g) {
    try { await adminApi.toggleGymActif(g.id, !g.actif); load(); }
    catch (err) { setError(err.message); }
  }
  async function deleteCoach(c) {
    if (!confirm(`Supprimer définitivement le profil de ${c.prenom} ${c.nom} ?`)) return;
    try { await adminApi.deleteCoach(c.id); load(); }
    catch (err) { setError(err.message); }
  }
  async function deleteGym(g) {
    if (!confirm(`Supprimer définitivement la fiche de ${g.nom} ?`)) return;
    try { await adminApi.deleteGym(g.id); load(); }
    catch (err) { setError(err.message); }
  }

  function logout() {
    clearAdminKey();
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="bg-white border-b border-black/5">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="microlabel">Admin</span>
          </div>
          <button type="button" onClick={logout} className="btn-secondary py-2 px-4 text-xs">
            <LogOut className="h-3.5 w-3.5" /> Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8 space-y-5">
        {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>}

        <div className="inline-flex rounded-full bg-white border border-black/5 p-1 gap-1">
          <button type="button" onClick={() => setTab('coaches')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === 'coaches' ? 'bg-brand-ink text-white' : 'text-brand-ink/60 hover:text-brand-ink'}`}>
            Coachs {coaches ? `(${coaches.length})` : ''}
          </button>
          <button type="button" onClick={() => setTab('gyms')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === 'gyms' ? 'bg-brand-ink text-white' : 'text-brand-ink/60 hover:text-brand-ink'}`}>
            Salles {gyms ? `(${gyms.length})` : ''}
          </button>
        </div>

        {coaches === null || gyms === null ? (
          <p className="text-brand-slate text-sm">Chargement…</p>
        ) : tab === 'coaches' ? (
          <CoachesTable coaches={coaches} onToggle={toggleCoach} onDelete={deleteCoach} />
        ) : (
          <GymsTable gyms={gyms} onToggle={toggleGym} onDelete={deleteGym} />
        )}
      </main>
    </div>
  );
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(!!getAdminKey());

  if (!loggedIn) return <LoginForm onLoggedIn={() => setLoggedIn(true)} />;
  return <Dashboard />;
}
