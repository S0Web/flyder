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
  return new Date(iso.replace(' ', 'T') + 'Z').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function numero(id) { return `#${String(id).padStart(4, '0')}`; }

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
    <div className="min-h-screen paper flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card-hard w-full max-w-sm">
        <div className="border-b-2 border-brand-ink flex items-center justify-between pr-3">
          <p className="ink-bar ink-bar-coral py-2.5">Accès réservé</p>
          <Wordmark />
        </div>
        <div className="p-6 space-y-5">
          <h1 className="display-title text-2xl">Administration</h1>
          {error && <div className="border-2 border-brand-coral text-brand-coral rounded-[2px] px-4 py-2.5 text-sm font-medium">{error}</div>}
          <label className="block">
            <span className="microlabel text-brand-ink/70">Clé admin</span>
            <input type="password" autoFocus placeholder="••••••••" value={key} onChange={(e) => setKey(e.target.value)} className="field" />
          </label>
          <button type="submit" disabled={busy || !key} className="btn-primary w-full">{busy ? 'Vérification…' : 'Entrer'}</button>
        </div>
      </form>
    </div>
  );
}

function ActifToggle({ actif, onToggle }) {
  return (
    <button type="button" onClick={onToggle} title={actif ? 'Mettre en pause' : 'Réactiver'}
      className={`stamp stamp-flat ${actif ? 'stamp-green' : 'stamp-slate'} hover:opacity-70 transition`}>
      {actif ? 'Actif' : 'Inactif'}
    </button>
  );
}

// Cartes plutôt que tableau : la priorité est le mobile (c'est comme ça que
// cette page est utilisée en pratique), où un tableau large ne montre que 2-3
// colonnes et cache le statut et les actions — les infos les plus utiles ici.
function EntityCard({ id, nom, email, ville: v, chips, tarif, extra, complet, actif, onToggle, onDelete, dateLabel }) {
  return (
    <div className={`card-hard flex flex-col ${actif ? '' : 'opacity-70'}`}>
      <div className="flex items-center justify-between border-b-2 border-brand-ink pl-3 pr-1 py-1.5">
        <span className="font-display font-bold text-[13px] tracking-[0.06em]">{numero(id)}</span>
        <span className="microlabel">{dateLabel}</span>
        <button type="button" onClick={onDelete} title="Supprimer" className="h-7 w-7 flex items-center justify-center text-brand-ink/40 hover:text-white hover:bg-brand-coral rounded-[2px] transition">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="min-w-0">
          <h3 className="display-title text-lg truncate">{nom}</h3>
          <p className="text-xs text-brand-slate truncate mt-1">{email}</p>
        </div>

        {(v !== '—' || chips.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {v !== '—' && <span className="tag">{v}</span>}
            {chips.map((c) => <span key={c} className="tag tag-soft">{c}</span>)}
          </div>
        )}

        <p className="text-xs text-brand-ink/70 font-medium">{tarif}</p>

        <div className="flex flex-wrap items-center gap-2 pt-3 mt-auto border-t-2 border-brand-ink">
          <ActifToggle actif={actif} onToggle={onToggle} />
          {extra}
          <span className={`ml-auto microlabel ${complet ? 'text-brand-blue' : 'text-brand-coral'}`}>{complet ? '■ Complet' : '■ Incomplet'}</span>
        </div>
      </div>
    </div>
  );
}

function CardGrid({ children, empty }) {
  const items = children.filter(Boolean);
  if (items.length === 0) return <p className="hatch border-2 border-brand-ink text-brand-ink/60 microlabel text-center py-10">{empty}</p>;
  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">{items}</div>;
}

function CoachesCards({ coaches, onToggle, onDelete }) {
  return (
    <CardGrid empty="Aucun coach inscrit.">
      {coaches.map((c) => (
        <EntityCard
          key={c.id}
          id={c.id}
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
          extra={c.disponible_remplacements ? <span className="stamp stamp-flat stamp-blue">Remplaçant</span> : null}
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
          id={g.id}
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

  const TABS = [['coaches', 'Coachs', coaches], ['gyms', 'Salles', gyms]];

  return (
    <div className="min-h-screen paper">
      <header className="bg-brand-cream border-b-2 border-brand-ink sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-shrink">
            <Wordmark className="flex-shrink-0" />
            <span className="stamp stamp-flat hidden sm:inline-flex">Admin</span>
          </div>
          <button type="button" onClick={logout} className="btn-secondary btn-sm flex-shrink-0">
            <LogOut className="h-3.5 w-3.5" /> Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {error && <div className="border-2 border-brand-coral bg-white text-brand-coral rounded-[2px] px-4 py-2.5 text-sm font-medium">{error}</div>}

        <div className="grid grid-cols-2 border-2 border-brand-ink rounded-[2px] overflow-hidden max-w-sm shadow-hard">
          {TABS.map(([id, label, rows], i) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={`flex items-baseline justify-between gap-2 px-4 py-3 font-display font-bold uppercase tracking-[0.12em] text-[12px] transition ${i > 0 ? 'border-l-2 border-brand-ink' : ''} ${
                tab === id ? 'bg-brand-ink text-brand-cream' : 'bg-white text-brand-ink/60 hover:text-brand-ink'
              }`}>
              {label}
              <span className={`font-display text-xl leading-none ${tab === id ? 'text-brand-coral' : 'text-brand-ink/40'}`}>{rows ? String(rows.length).padStart(2, '0') : '··'}</span>
            </button>
          ))}
        </div>

        {coaches === null || gyms === null ? (
          <p className="microlabel">Chargement…</p>
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
