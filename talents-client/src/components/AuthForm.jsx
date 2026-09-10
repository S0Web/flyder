import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Wordmark from './Wordmark';

function Champ({ label, children }) {
  return (
    <label className="block">
      <span className="microlabel text-brand-ink/70">{label}</span>
      {children}
    </label>
  );
}

// Écran d'inscription/connexion : à gauche le panneau de marque (barre encre,
// titre affiche, promesses en liste réglée), à droite la "fiche d'inscription"
// — cadre posé, onglets à bord franc, champs soulignés. Mécanique identique
// pour coach et salle — seuls les champs d'inscription diffèrent.
export default function AuthForm({ role, eyebrow, titre, accroche, promesses }) {
  const { login } = useAuth();
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ email: '', password: '', nom: '', prenom: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      let data;
      if (mode === 'signup') {
        data = role === 'coach'
          ? await api.coachSignup({ email: form.email, password: form.password, nom: form.nom, prenom: form.prenom })
          : await api.gymSignup({ email: form.email, password: form.password, nom: form.nom });
      } else {
        data = role === 'coach'
          ? await api.coachLogin({ email: form.email, password: form.password })
          : await api.gymLogin({ email: form.email, password: form.password });
      }
      login(role, data.token, role === 'coach' ? data.coach : data.gym);
    } catch (err) {
      setError(err.message); setBusy(false);
    }
  }

  return (
    <div className="min-h-screen paper">
      <header className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between border-b-2 border-brand-ink">
        <Link to="/"><Wordmark /></Link>
        <Link to="/" className="microlabel text-brand-ink/60 hover:text-brand-ink inline-flex items-center gap-1.5 transition">
          <ArrowLeft className="h-3.5 w-3.5" /> Changer de rôle
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-16 grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-start">
        <section className="animate-fadeInUp">
          <p className="ink-bar mb-6">{eyebrow}</p>
          <h1 className="display-title text-[2.75rem] sm:text-6xl">
            {titre.ink}<br />
            <span className="text-brand-blue">{titre.blue}.</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-brand-ink/70 max-w-md leading-snug">{accroche}</p>
          <ul className="mt-8 max-w-md">
            {promesses.map((p, i) => (
              <li key={p} className="flex items-start gap-4 py-3.5 border-t-2 border-brand-ink last:border-b-2 text-sm text-brand-ink/85">
                <span className="font-display font-bold text-brand-coral text-sm leading-5 w-6 flex-none">0{i + 1}</span>
                {p}
              </li>
            ))}
          </ul>
        </section>

        <section className="card-hard animate-fadeInUp" style={{ animationDelay: '90ms' }}>
          <div className="grid grid-cols-2 border-b-2 border-brand-ink">
            {[['signup', 'Créer un compte'], ['login', 'Se connecter']].map(([m, label], i) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(null); }}
                className={`py-3.5 font-display text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.14em] transition ${i === 0 ? 'border-r-2 border-brand-ink' : ''} ${
                  mode === m ? 'bg-brand-ink text-brand-cream' : 'bg-white text-brand-ink/50 hover:text-brand-ink'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            <p className="microlabel text-brand-ink flex items-center justify-between">
              <span>{mode === 'signup' ? "Fiche d'inscription" : 'Connexion'}</span>
              <span className="text-brand-coral">{role === 'coach' ? 'Coach' : 'Salle'}</span>
            </p>
            {error && <div className="border-2 border-brand-coral text-brand-coral px-4 py-2.5 text-sm font-medium rounded-[2px]">{error}</div>}

            {mode === 'signup' && role === 'coach' && (
              <div className="grid grid-cols-2 gap-5">
                <Champ label="Prénom"><input className="field" placeholder="Julie" required autoFocus value={form.prenom} onChange={(e) => set('prenom', e.target.value)} /></Champ>
                <Champ label="Nom"><input className="field" placeholder="Martin" required value={form.nom} onChange={(e) => set('nom', e.target.value)} /></Champ>
              </div>
            )}
            {mode === 'signup' && role === 'gym' && (
              <Champ label="Nom de la salle"><input className="field" placeholder="Magic Form Mennecy" required autoFocus value={form.nom} onChange={(e) => set('nom', e.target.value)} /></Champ>
            )}

            <Champ label="Email"><input className="field" type="email" placeholder="toi@exemple.fr" required value={form.email} onChange={(e) => set('email', e.target.value)} /></Champ>
            <Champ label={mode === 'signup' ? 'Mot de passe (8 caractères min.)' : 'Mot de passe'}>
              <input className="field" type="password" placeholder="••••••••" required value={form.password} onChange={(e) => set('password', e.target.value)} />
            </Champ>

            <button type="submit" disabled={busy} className="btn-primary w-full py-4 !mt-7">
              {busy ? 'Un instant…' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
            </button>

            <p className="text-xs text-brand-slate flex items-center justify-center gap-1.5 !mt-4">
              <Lock className="h-3 w-3" /> Gratuit, sans engagement. Tes coordonnées ne sont jamais publiques.
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}
