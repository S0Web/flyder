import { useRef, useState } from 'react';
import { Camera, Check, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { AppHeader, BottomNav } from './AppShell';

// Effet immédiat, hors formulaire : c'est le contrôle le plus consulté et le
// plus urgent (se mettre en pause / se rendre visible), il ne doit jamais
// dépendre d'un clic sur "Enregistrer" ni être caché en bas de page. Grande
// carte colorée selon l'état, gros interrupteur.
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
    <div className={`rounded-3xl p-4 sm:p-5 flex items-center gap-4 transition-colors duration-300 animate-fadeInUp ${actif ? 'bg-[#E6F7EF]' : 'bg-[#FFF4DB]'}`}>
      <span className={`tile ${actif ? 'bg-[#0F8A5F] text-white' : 'bg-[#C77700] text-white'}`}>{actif ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</span>
      <div className="min-w-0 flex-1">
        <p className={`font-display font-bold leading-tight ${actif ? 'text-[#0B6B49]' : 'text-[#8A5300]'}`}>
          {actif ? 'Profil visible dans les recherches' : 'Profil en pause — invisible'}
        </p>
        <p className={`text-xs mt-0.5 ${error ? 'text-brand-coral font-medium' : actif ? 'text-[#0B6B49]/70' : 'text-[#8A5300]/70'}`}>
          {error || (actif ? 'Mets-toi en pause à tout moment, sans rien perdre.' : 'Personne ne te voit. Réactive quand tu veux, effet immédiat.')}
        </p>
      </div>
      <button type="button" onClick={toggle} disabled={busy} role="switch" aria-checked={actif} aria-label="Visibilité du profil" className="switch">
        <span className="knob" />
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
    <div className="min-h-screen bg-white">
      <AppHeader base={base} eyebrow="Mon profil" titre={<>{titre.ink} {titre.blue}.</>} />

      <main className="max-w-6xl mx-auto px-5 sm:px-8 -mt-3 sm:-mt-4 relative pb-8">
        <div className="card-white p-1.5 mb-6">
          <VisibiliteSwitch base={base} actor={actor} updateActor={updateActor} />
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
          <aside className="space-y-4 lg:sticky lg:top-6 animate-fadeInUp" style={{ animationDelay: '60ms' }}>
            <div className="card p-5 flex items-center gap-4 lg:flex-col lg:text-center">
              <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading}
                className="relative flex-none h-24 w-24 lg:h-36 lg:w-36 rounded-[2rem] overflow-hidden bg-brand-blue text-white focus:outline-none focus:ring-4 focus:ring-brand-blue/20">
                {actor.photo_url
                  ? <img src={actor.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  : <span className="absolute inset-0 flex items-center justify-center font-display text-5xl font-bold">{initiale}</span>}
                <span className="absolute bottom-1.5 right-1.5 h-8 w-8 rounded-full bg-white text-brand-ink shadow flex items-center justify-center"><Camera className="h-4 w-4" /></span>
              </button>
              <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handlePhoto} />
              <div className="min-w-0">
                <p className="font-display font-bold text-brand-ink truncate">{actor.prenom ? `${actor.prenom} ${actor.nom}` : actor.nom}</p>
                <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="text-sm font-semibold text-brand-blue">
                  {uploading ? 'Envoi…' : actor.photo_url ? 'Changer la photo' : 'Ajouter une photo'}
                </button>
                {!actor.photo_url && <p className="text-xs text-brand-slate mt-1">Une photo multiplie les contacts.</p>}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-end justify-between mb-2">
                <p className="font-display font-bold text-brand-ink">Complétion</p>
                <p className={`font-display text-2xl font-bold leading-none ${pct === 100 ? 'text-[#0F8A5F]' : 'text-brand-blue'}`}>{pct}<span className="text-sm text-brand-slate">%</span></p>
              </div>
              <div className="h-2.5 rounded-full bg-white overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-[#0F8A5F]' : 'bg-brand-blue'}`} style={{ width: `${pct}%` }} />
              </div>
              <ul className="mt-4 space-y-1.5">
                {checklist.map((c) => (
                  <li key={c.label} className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm ${c.ok ? 'text-brand-ink' : 'text-brand-slate bg-white/60'}`}>
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center flex-none ${c.ok ? 'bg-[#0F8A5F] text-white' : 'bg-white border border-black/10'}`}>
                      {c.ok && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <form onSubmit={onSubmit} className="space-y-4 animate-fadeInUp" style={{ animationDelay: '120ms' }}>
            {error && <div className="bg-[#FFEDE8] text-brand-coral rounded-2xl px-4 py-3 text-sm font-medium">{error}</div>}
            {form}
            <div className="sticky bottom-24 md:bottom-4 z-10 flex items-center justify-between gap-3 rounded-full bg-brand-ink text-white pl-5 pr-1.5 py-1.5 shadow-nav">
              <span className="text-sm text-white/80 inline-flex items-center gap-2 min-w-0">
                {saved ? <><CheckCircle2 className="h-4 w-4 text-[#4ADE80] flex-none" /> <span className="truncate">Enregistré</span></> : <span className="truncate">Pense à enregistrer</span>}
              </span>
              <button type="submit" disabled={saving} className="btn-accent !py-3 !px-5 flex-none">
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </main>

      <BottomNav base={base} />
    </div>
  );
}

// Bloc de section du formulaire : titre + micro-description + champs.
export function Section({ titre, aide, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-display text-base font-bold text-brand-ink">{titre}</h2>
      {aide ? <p className="text-xs text-brand-slate mt-0.5 mb-4">{aide}</p> : <div className="mb-4" />}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Field({ label, aide, children }) {
  return (
    <label className="block">
      <span className="microlabel pl-1">{label}</span>
      <div className="mt-1.5">{children}</div>
      {aide && <span className="block mt-1.5 text-xs text-brand-slate pl-1">{aide}</span>}
    </label>
  );
}
