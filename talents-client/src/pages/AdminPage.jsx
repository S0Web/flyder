import { useState, useEffect, useCallback, useMemo } from 'react';
import { LogOut, Trash2, ShieldCheck, Zap, PhoneCall, Building2, Dumbbell } from 'lucide-react';
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

function fmtDateHeure(iso) {
  if (!iso) return '—';
  return new Date(iso.replace(' ', 'T') + 'Z').toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const TILES = ['tile-blue', 'tile-coral', 'tile-green', 'tile-amber', 'tile-violet'];

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
    <div className="min-h-screen bg-brand-ink flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card-white p-7 w-full max-w-sm space-y-5">
        <div className="flex items-center justify-between">
          <Wordmark />
          <span className="tile tile-sm tile-violet"><ShieldCheck className="h-4 w-4" /></span>
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-ink">Administration</h1>
          <p className="text-sm text-brand-slate mt-1">Accès réservé à l'éditeur de Flyder Talents.</p>
        </div>
        {error && <div className="bg-[#FFEDE8] text-brand-coral rounded-2xl px-4 py-3 text-sm font-medium">{error}</div>}
        <input type="password" autoFocus placeholder="Clé admin" value={key} onChange={(e) => setKey(e.target.value)} className="field field-grey" />
        <button type="submit" disabled={busy || !key} className="btn-accent w-full">{busy ? 'Vérification…' : 'Entrer'}</button>
      </form>
    </div>
  );
}

// Cartes plutôt que tableau : la priorité est le mobile (c'est comme ça que
// cette page est utilisée en pratique), où un tableau large ne montre que 2-3
// colonnes et cache le statut et les actions — les infos les plus utiles ici.
function EntityCard({ id, nom, email, ville: v, chips, tarif, extra, complet, actif, onToggle, onDelete, dateLabel }) {
  return (
    <div className={`card p-4 flex flex-col gap-3 transition ${actif ? '' : 'opacity-60'}`}>
      <div className="flex items-start gap-3">
        <span className={`tile ${TILES[id % TILES.length]} font-display font-bold text-lg`}>{nom.charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-brand-ink truncate leading-tight">{nom}</h3>
          <p className="text-xs text-brand-slate truncate">{email}</p>
        </div>
        <button type="button" onClick={onDelete} title="Supprimer" className="h-9 w-9 rounded-full bg-white text-brand-slate hover:text-white hover:bg-brand-coral flex items-center justify-center flex-none transition">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {v !== '—' && <span className="badge bg-white text-brand-ink">{v}</span>}
        {chips.map((c) => <span key={c} className="badge bg-white text-brand-ink/70">{c}</span>)}
        {extra}
        <span className={`badge ${complet ? 'badge-blue' : 'badge-amber'}`}>{complet ? 'Profil complet' : 'Incomplet'}</span>
      </div>

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-black/[0.06]">
        <div className="text-xs text-brand-slate min-w-0"><span className="text-brand-ink font-medium">{tarif}</span> · #{id} · {dateLabel}</div>
        <label className="flex items-center gap-2 text-xs font-semibold text-brand-ink/70 flex-none">
          {actif ? 'Actif' : 'Inactif'}
          <button type="button" role="switch" aria-checked={actif} onClick={onToggle} className="switch !h-7 !w-12"><span className="knob !h-5 !w-5" /></button>
        </label>
      </div>
    </div>
  );
}

function CardGrid({ children, empty }) {
  const items = children.filter(Boolean);
  if (items.length === 0) return <p className="card text-brand-slate text-sm text-center py-10">{empty}</p>;
  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{items}</div>;
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
          extra={c.disponible_remplacements ? <span className="badge badge-green"><Zap className="h-3 w-3" /> Remplacements</span> : null}
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

// "Qui a contacté qui, et combien de fois" — les deux questions que le log
// contact_events permet de répondre sans fil de discussion (voir plan).
function TopListe({ titre, icon: Icon, rows }) {
  return (
    <div className="card-white p-5">
      <h3 className="font-display font-bold text-brand-ink flex items-center gap-2 mb-4">
        <span className="tile tile-sm tile-blue"><Icon className="h-4 w-4" /></span> {titre}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-brand-slate">Aucun contact pour l'instant.</p>
      ) : (
        <ol className="space-y-2.5">
          {rows.map(({ nom, n }, i) => (
            <li key={nom + i} className="flex items-center gap-3">
              <span className="microlabel w-5 flex-none">{i + 1}</span>
              <span className="text-sm text-brand-ink font-medium truncate flex-1">{nom}</span>
              <span className="badge badge-blue flex-none">{n} contact{n > 1 ? 's' : ''}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ContactsView({ contacts }) {
  const { topCoaches, topGyms } = useMemo(() => {
    const compte = (filtre) => {
      const map = new Map();
      for (const e of contacts.filter(filtre)) map.set(e.cible_nom, (map.get(e.cible_nom) || 0) + 1);
      return Array.from(map, ([nom, n]) => ({ nom, n })).sort((a, b) => b.n - a.n).slice(0, 5);
    };
    return {
      topCoaches: compte((e) => e.cible_type === 'coach'),
      topGyms: compte((e) => e.cible_type === 'gym'),
    };
  }, [contacts]);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <TopListe titre="Coachs les plus contactés" icon={Dumbbell} rows={topCoaches} />
        <TopListe titre="Salles les plus contactées" icon={Building2} rows={topGyms} />
      </div>

      <div className="card-white p-5">
        <h3 className="font-display font-bold text-brand-ink flex items-center gap-2 mb-4">
          <span className="tile tile-sm tile-green"><PhoneCall className="h-4 w-4" /></span> Historique des mises en contact
          <span className="microlabel !normal-case !tracking-normal ml-auto">{contacts.length} au total</span>
        </h3>
        {contacts.length === 0 ? (
          <p className="text-sm text-brand-slate text-center py-6">Aucune mise en contact enregistrée pour l'instant.</p>
        ) : (
          <ul className="space-y-2">
            {contacts.map((e) => (
              <li key={e.id} className="row !bg-brand-cream">
                <span className={`tile tile-sm ${e.initiateur_type === 'gym' ? 'tile-blue' : 'tile-coral'}`}>
                  {e.initiateur_type === 'gym' ? <Building2 className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold text-brand-ink">{e.initiateur_nom}</span>
                  <span className="text-brand-slate"> a contacté </span>
                  <span className="font-semibold text-brand-ink">{e.cible_nom}</span>
                </span>
                <span className="text-xs text-brand-slate flex-none">{fmtDateHeure(e.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const [tab, setTab] = useState('coaches');
  const [coaches, setCoaches] = useState(null);
  const [gyms, setGyms] = useState(null);
  const [contacts, setContacts] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([adminApi.getCoaches(), adminApi.getGyms(), adminApi.getContacts()])
      .then(([c, g, ct]) => { setCoaches(c); setGyms(g); setContacts(ct); })
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
    <div className="min-h-screen bg-white">
      <header className="hero !bg-brand-ink">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-4 sm:pt-5 pb-7 sm:pb-9">
          <div className="flex items-center justify-between gap-3">
            <Wordmark tone="light" />
            <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-full bg-white/15 hover:bg-white/25 px-3.5 py-2 text-sm font-semibold transition">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60 mb-2">Administration</p>
              <h1 className="text-3xl sm:text-4xl font-bold">Coachs &amp; salles</h1>
            </div>
            <div className="seg bg-white/15">
              {[['coaches', 'Coachs', coaches], ['gyms', 'Salles', gyms], ['contacts', 'Contacts', contacts]].map(([id, label, rows]) => (
                <button key={id} type="button" data-on={tab === id} onClick={() => setTab(id)} className={tab === id ? '' : '!text-white/70 hover:!text-white'}>
                  {label} {rows ? <span className="opacity-60">({rows.length})</span> : ''}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-5">
        {error && <div className="bg-[#FFEDE8] text-brand-coral rounded-2xl px-4 py-3 text-sm font-medium">{error}</div>}
        {coaches === null || gyms === null || contacts === null ? (
          <p className="text-brand-slate text-sm">Chargement…</p>
        ) : tab === 'coaches' ? (
          <CoachesCards coaches={coaches} onToggle={toggleCoach} onDelete={deleteCoach} />
        ) : tab === 'gyms' ? (
          <GymsCards gyms={gyms} onToggle={toggleGym} onDelete={deleteGym} />
        ) : (
          <ContactsView contacts={contacts} />
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
