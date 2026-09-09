import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Lock } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Wordmark from './Wordmark';

// Écran d'inscription/connexion : panneau de marque à gauche (eyebrow, titre
// bicolore, promesses), carte formulaire à droite. Mécanique identique pour
// coach et salle — seuls les champs d'inscription diffèrent.
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
    <div className="min-h-screen bg-brand-cream relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[30rem] w-[30rem] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #3D5AFE 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #FF5A36 0%, transparent 70%)' }} />

      <header className="relative max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/"><Wordmark /></Link>
        <Link to="/" className="text-sm font-medium text-brand-ink/60 hover:text-brand-ink inline-flex items-center gap-1.5 transition">
          <ArrowLeft className="h-4 w-4" /> Changer de rôle
        </Link>
      </header>

      <main className="relative max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-16 grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">
        <section className="animate-fadeInUp">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-blue mb-4">{eyebrow}</p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-[1.05] text-brand-ink">
            {titre.ink}<br />
            <span className="text-brand-blue">{titre.blue}.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-brand-ink/60 max-w-md">{accroche}</p>
          <ul className="mt-8 space-y-3">
            {promesses.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-brand-ink/80">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-sky-50 text-brand-blue flex items-center justify-center flex-none"><Check className="h-3 w-3" /></span>
                {p}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-4xl border border-black/5 shadow-card p-6 sm:p-8 animate-fadeInUp" style={{ animationDelay: '90ms' }}>
          <div className="grid grid-cols-2 rounded-full bg-brand-cream p-1 mb-6">
            {[['signup', 'Créer un compte'], ['login', 'Se connecter']].map(([m, label]) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(null); }}
                className={`rounded-full py-2 text-sm font-semibold transition ${mode === m ? 'bg-white text-brand-ink shadow-sm' : 'text-brand-ink/50 hover:text-brand-ink'}`}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>}

            {mode === 'signup' && role === 'coach' && (
              <div className="grid grid-cols-2 gap-3">
                <input className="field" placeholder="Prénom" required autoFocus value={form.prenom} onChange={(e) => set('prenom', e.target.value)} />
                <input className="field" placeholder="Nom" required value={form.nom} onChange={(e) => set('nom', e.target.value)} />
              </div>
            )}
            {mode === 'signup' && role === 'gym' && (
              <input className="field" placeholder="Nom de la salle" required autoFocus value={form.nom} onChange={(e) => set('nom', e.target.value)} />
            )}

            <input className="field" type="email" placeholder="Email" required value={form.email} onChange={(e) => set('email', e.target.value)} />
            <input className="field" type="password" placeholder={mode === 'signup' ? 'Mot de passe (8 caractères min.)' : 'Mot de passe'} required
              value={form.password} onChange={(e) => set('password', e.target.value)} />

            <button type="submit" disabled={busy} className="btn-primary w-full py-3.5 mt-1">
              {busy ? 'Un instant…' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
            </button>
          </form>

          <p className="mt-5 text-xs text-brand-slate flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3" /> Gratuit, sans engagement. Tes coordonnées ne sont jamais publiques.
          </p>
        </section>
      </main>
    </div>
  );
}
