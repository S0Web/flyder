import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Lock } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Wordmark from './Wordmark';

function Champ({ label, children }) {
  return (
    <label className="block">
      <span className="microlabel block mb-1.5 pl-1">{label}</span>
      {children}
    </label>
  );
}

// Écran d'inscription/connexion : bloc bleu en en-tête (accroche, promesses),
// feuille blanche qui remonte dessus avec le formulaire. Mécanique identique
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
    <div className="min-h-screen bg-white">
      <header className="hero">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-4 sm:pt-5 pb-14 sm:pb-20">
          <div className="flex items-center justify-between">
            <Link to="/"><Wordmark tone="light" /></Link>
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 px-3.5 py-2 text-sm font-semibold transition">
              <ArrowLeft className="h-4 w-4" /> Changer de rôle
            </Link>
          </div>
          <div className="mt-8 sm:mt-12 lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div className="animate-fadeInUp">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">{eyebrow}</p>
              <h1 className="mt-2 text-4xl sm:text-5xl font-bold leading-[1.05]">{titre.ink} {titre.blue}.</h1>
              <p className="mt-4 text-base sm:text-lg text-white/80 max-w-md">{accroche}</p>
              <ul className="mt-6 space-y-2.5">
                {promesses.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm text-white/90">
                    <span className="mt-0.5 h-5 w-5 rounded-full bg-white/20 flex items-center justify-center flex-none"><Check className="h-3 w-3" /></span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="hidden lg:block" />
        <section className="card-white p-5 sm:p-7 -mt-8 sm:-mt-12 lg:-mt-[22rem] relative mb-16 animate-fadeInUp" style={{ animationDelay: '90ms' }}>
          <div className="seg w-full mb-6">
            {[['signup', 'Créer un compte'], ['login', 'Se connecter']].map(([m, label]) => (
              <button key={m} type="button" data-on={mode === m} onClick={() => { setMode(m); setError(null); }}>{label}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-[#FFEDE8] text-brand-coral rounded-2xl px-4 py-3 text-sm font-medium">{error}</div>}

            {mode === 'signup' && role === 'coach' && (
              <div className="grid grid-cols-2 gap-3">
                <Champ label="Prénom"><input className="field field-grey" placeholder="Julie" required autoFocus value={form.prenom} onChange={(e) => set('prenom', e.target.value)} /></Champ>
                <Champ label="Nom"><input className="field field-grey" placeholder="Martin" required value={form.nom} onChange={(e) => set('nom', e.target.value)} /></Champ>
              </div>
            )}
            {mode === 'signup' && role === 'gym' && (
              <Champ label="Nom de la salle"><input className="field field-grey" placeholder="Magic Form Mennecy" required autoFocus value={form.nom} onChange={(e) => set('nom', e.target.value)} /></Champ>
            )}
            <Champ label="Email"><input className="field field-grey" type="email" placeholder="toi@exemple.fr" required value={form.email} onChange={(e) => set('email', e.target.value)} /></Champ>
            <Champ label={mode === 'signup' ? 'Mot de passe (8 caractères min.)' : 'Mot de passe'}>
              <input className="field field-grey" type="password" placeholder="••••••••" required value={form.password} onChange={(e) => set('password', e.target.value)} />
            </Champ>

            <button type="submit" disabled={busy} className="btn-accent w-full py-4 !mt-6">
              {busy ? 'Un instant…' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
            </button>
          </form>

          <p className="mt-5 text-xs text-brand-slate flex items-center justify-center gap-1.5 text-center">
            <Lock className="h-3 w-3 flex-none" /> Gratuit, sans engagement. Tes coordonnées ne sont jamais publiques.
          </p>
        </section>
      </main>
    </div>
  );
}
