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

function Badge({ ok, labelOk, labelKo }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ok ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>
      {ok ? labelOk : labelKo}
    </span>
  );
}

// Cartes plutôt que tableau : la priorité est le mobile (c'est comme ça que
// cette page est utilisée en pratique), où un tableau large ne montre que 2-3
// colonnes et cache le statut et les actions — les infos les plus utiles ici.
function EntityCard({ nom, email, ville: v, chips, tarif, extra, complet, actif, onToggle, onDelete, dateLabel }) {
  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display font-bold text-brand-ink truncate">{nom}</h3>
          <p className="text-xs text-brand-slate truncate">{email}</p>
        </div>
        <button type="button" onClick={onDelete} title="Supprimer" className="text-red-400 hover:text-red-600 flex-shrink-0 p-1">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {(v !== '—' || chips.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {v !== '—' && <span className="chip chip-off !py-1 !px-2.5">{v}</span>}
          {chips.map((c) => <span key={c} className="chip chip-off !py-1 !px-2.5">{c}</span>)}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-brand-slate">
        <span>{tarif}</span>
        <span>{dateLabel}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-black/5">
        <ActifToggle actif={actif} onToggle={onToggle} />
        {extra}
        <Badge ok={complet} labelOk="Profil complet" labelKo="Profil incomplet" />
      </div>
    </div>
  );
}

function CardGrid({ children, empty }) {
  const items = children.filter(Boolean);
  if (items.length === 0) return <p className="text-brand-slate text-sm italic text-center py-10">{empty}</p>;
  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{items}</div>;
}

function CoachesCards({ coaches, onToggle, onDelete }) {
  return (
    <CardGrid empty="Aucun coach inscrit.">
      {coaches.map((c) => (
        <EntityCard
          key={c.id}
          nom={`${c.prenom} ${c.nom}`}
          email={c.email}
          ville={ville(c.adresse)}
          chips={(c.disciplines || '').split(',').filter(Boolean).map(labelDiscipline)}
          tarif={c.tarif_horaire != null ? `${c.tarif_horaire} €/h` : 'Tarif non renseigné'}
          dateLabel={fmtDate(c.created_at)}
          complet={!!c.profil_complet}
          actif={!!c.actif}
          onToggle={() => onToggle(c)}
          onDelete={() => onDelete(c)}
          extra={c.disponible_remplacements && (
            <span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[11px] font-semibold">Remplacements</span>
          )}
        />
      ))}
    </CardGrid>
  );
}

function GymsCards({ gyms, onToggle, onDelete }) {
  return (
    <CardGrid empty="Aucune salle inscrite.">
      {gyms.map((g) => (
        <EntityCard
          key={g.id}
          nom={g.nom}
          email={g.email}
          ville={ville(g.adresse)}
          chips={(g.disciplines_recherchees || '').split(',').filter(Boolean).map(labelDiscipline)}
          tarif={g.contact_telephone || g.contact_email || 'Contact non renseigné'}
          dateLabel={fmtDate(g.created_at)}
          complet={!!g.profil_complet}
          actif={!!g.actif}
          onToggle={() => onToggle(g)}
          onDelete={() => onDelete(g)}
        />
      ))}
    </CardGrid>
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
      <header className="bg-white border-b border-black/5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
            <Wordmark className="flex-shrink-0" />
            <span className="microlabel hidden sm:inline flex-shrink-0">Admin</span>
          </div>
          <button type="button" onClick={logout} className="btn-secondary py-2 px-3 sm:px-4 text-xs flex-shrink-0">
            <LogOut className="h-3.5 w-3.5" /> Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-5">
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
          <CoachesCards coaches={coaches} onToggle={toggleCoach} onDelete={deleteCoach} />
        ) : (
          <GymsCards gyms={gyms} onToggle={toggleGym} onDelete={deleteGym} />
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
