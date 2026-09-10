import { useRef, useState } from 'react';
import { Camera, Check, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import TopBar from './TopBar';

// Effet immédiat, hors formulaire : c'est le contrôle le plus consulté et le
// plus urgent (se mettre en pause / se rendre visible), il ne doit jamais
// dépendre d'un clic sur "Enregistrer" ni être caché en bas de page.
function VisibiliteSwitch({ base, actor, updateActor }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const actif = actor.actif !== 0;

  async function toggle() {
    setBusy(true); setError(null);
    try {
      const updateFn = base === '/coach' ? api.updateCoachMe : api.updateGymMe;
      updateActor(await updateFn({ actif: !actif }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`mb-6 rounded-2xl border p-4 flex items-center justify-between gap-3 animate-fadeInUp ${
      actif ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
    }`}>
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${actif ? 'text-emerald-800' : 'text-amber-800'}`}>
          {actif ? 'Profil actif — visible dans les recherches' : 'Profil en pause — invisible dans les recherches'}
        </p>
        <p className="text-xs text-brand-ink/50 mt-0.5">
          {error || "Bascule à tout moment, sans perdre tes informations. Effet immédiat."}
        </p>
      </div>
      <button type="button" onClick={toggle} disabled={busy} role="switch" aria-checked={actif}
        className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${actif ? 'bg-emerald-500' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${actif ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

// Gabarit commun aux deux pages de profil : colonne gauche collante (photo +
// jauge de complétion + checklist), colonne droite = le formulaire passé en
// enfant. La checklist rend concret le "profil_complet" du serveur.
export default function ProfilLayout({ base, titre, checklist, form, onSubmit, saving, saved, error, setError }) {
  const { actor, updateActor } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  const ok = checklist.filter((c) => c.ok).length;
  const pct = Math.round((ok / checklist.length) * 100);
  const initiale = (actor.prenom || actor.nom || '?').charAt(0).toUpperCase();

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null);
    try { updateActor(await api.uploadPhoto(file)); }
    catch (err) { setError(err.message); }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = ''; }
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <TopBar base={base} />

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <div className="mb-6 animate-fadeInUp">
          <p className="microlabel mb-2">Mon profil</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-brand-ink leading-tight">
            {titre.ink} <span className="text-brand-blue">{titre.blue}.</span>
          </h1>
        </div>

        <VisibiliteSwitch base={base} actor={actor} updateActor={updateActor} />

        <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
          <aside className="space-y-4 lg:sticky lg:top-24 animate-fadeInUp" style={{ animationDelay: '60ms' }}>
            <div className="bg-white rounded-3xl border border-black/5 shadow-card p-4">
              <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading}
                className="group relative w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-brand-ink via-[#1B2352] to-[#2743C4] focus:outline-none focus:ring-4 focus:ring-sky-500/20">
                {actor.photo_url
                  ? <img src={actor.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  : <span className="absolute inset-0 flex items-center justify-center font-display text-7xl font-bold text-white/15">{initiale}</span>}
                <span className="absolute inset-0 bg-brand-ink/0 group-hover:bg-brand-ink/40 transition flex items-center justify-center">
                  <span className="glass rounded-full px-3.5 py-2 text-xs font-semibold text-brand-ink inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                    <Camera className="h-3.5 w-3.5" /> {uploading ? 'Envoi…' : actor.photo_url ? 'Changer' : 'Ajouter une photo'}
                  </span>
                </span>
              </button>
              <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handlePhoto} />
              {!actor.photo_url && (
                <p className="mt-3 text-xs text-brand-slate text-center">Une photo multiplie les contacts. Clique pour en ajouter une.</p>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-black/5 shadow-card p-5">
              <div className="flex items-end justify-between mb-2">
                <p className="microlabel">Complétion</p>
                <p className={`font-display text-2xl font-bold ${pct === 100 ? 'text-emerald-600' : 'text-brand-ink'}`}>{pct}<span className="text-sm text-brand-slate">%</span></p>
              </div>
              <div className="h-2 rounded-full bg-brand-cream overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-brand-blue'}`} style={{ width: `${pct}%` }} />
              </div>
              <ul className="mt-4 space-y-2">
                {checklist.map((c) => (
                  <li key={c.label} className={`flex items-center gap-2.5 text-sm ${c.ok ? 'text-brand-ink' : 'text-brand-slate'}`}>
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center flex-none ${c.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-cream'}`}>
                      {c.ok && <Check className="h-3 w-3" />}
                    </span>
                    {c.label}
                  </li>
                ))}
              </ul>
              <p className={`mt-4 text-xs rounded-xl px-3 py-2 ${actor.profil_complet ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {actor.profil_complet ? 'Visible dans les recherches.' : 'Pas encore visible — adresse + discipline requises.'}
              </p>
            </div>
          </aside>

          <form onSubmit={onSubmit} className="space-y-4 animate-fadeInUp" style={{ animationDelay: '120ms' }}>
            {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>}
            {form}
            <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 glass rounded-full pl-5 pr-2 py-2 shadow-card">
              <span className="text-sm text-brand-ink/70 inline-flex items-center gap-2">
                {saved ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Modifications enregistrées</> : 'Pense à enregistrer tes modifications'}
              </span>
              <button type="submit" disabled={saving} className="btn-primary py-2.5 px-5">
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

// Bloc de section du formulaire : titre + micro-description + champs.
export function Section({ titre, aide, children }) {
  return (
    <section className="bg-white rounded-3xl border border-black/5 shadow-card p-5 sm:p-6">
      <h2 className="font-display text-base font-bold text-brand-ink">{titre}</h2>
      {aide && <p className="text-xs text-brand-slate mt-0.5 mb-4">{aide}</p>}
      {!aide && <div className="mb-4" />}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Field({ label, aide, children }) {
  return (
    <label className="block">
      <span className="microlabel">{label}</span>
      <div className="mt-1.5">{children}</div>
      {aide && <span className="block mt-1.5 text-xs text-brand-slate">{aide}</span>}
    </label>
  );
}
