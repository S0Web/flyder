import { useRef, useState } from 'react';
import { Camera, Check, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import TopBar from './TopBar';

// Effet immédiat, hors formulaire : c'est le contrôle le plus consulté et le
// plus urgent (se mettre en pause / se rendre visible), il ne doit jamais
// dépendre d'un clic sur "Enregistrer" ni être caché en bas de page.
// Visuellement : une grande fiche encre avec le tampon d'état et un
// interrupteur physique OUI/NON.
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
    <div className={`mb-8 rounded-sm border-2 border-brand-ink flex items-stretch overflow-hidden animate-fadeInUp ${actif ? 'bg-white shadow-hard' : 'bg-brand-ink text-brand-cream shadow-hard-coral'}`}>
      <div className={`w-2.5 flex-none ${actif ? 'bg-brand-green' : 'bg-brand-coral'}`} />
      <div className="flex-1 min-w-0 px-4 sm:px-6 py-4 sm:py-5 grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] gap-x-4 sm:gap-x-6 gap-y-3 items-center">
        <span key={String(actif)} className={`stamp stamp-slam ${actif ? 'stamp-green' : ''}`}>{actif ? 'Visible' : 'En pause'}</span>
        <button type="button" onClick={toggle} disabled={busy} role="switch" aria-checked={actif} aria-label="Visibilité du profil"
          className="switch-hard justify-self-end sm:order-last">
          <span className="knob">{actif ? 'Oui' : 'Non'}</span>
        </button>
        <div className="min-w-0 col-span-2 sm:col-span-1">
          <p className="display-title text-lg sm:text-xl">
            {actif ? 'Ton profil est dans les recherches' : 'Ton profil est masqué'}
          </p>
          <p className={`text-xs mt-1 ${error ? 'text-brand-coral font-medium' : actif ? 'text-brand-slate' : 'text-brand-cream/60'}`}>
            {error || (actif ? 'Bascule en pause à tout moment, sans rien perdre. Effet immédiat.' : 'Personne ne te voit tant que tu es en pause. Réactive quand tu veux.')}
          </p>
        </div>
      </div>
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
    <div className="min-h-screen paper">
      <TopBar base={base} />

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <div className="mb-6 pb-6 border-b-2 border-brand-ink animate-fadeInUp">
          <p className="ink-bar mb-4">Mon profil <span className="text-brand-coral">■</span> #{String(actor.id).padStart(4, '0')}</p>
          <h1 className="display-title text-4xl sm:text-5xl">
            {titre.ink} <span className="text-brand-blue">{titre.blue}.</span>
          </h1>
        </div>

        <VisibiliteSwitch base={base} actor={actor} updateActor={updateActor} />

        <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
          <aside className="space-y-5 lg:sticky lg:top-24 animate-fadeInUp" style={{ animationDelay: '60ms' }}>
            <div className="card-hard overflow-hidden">
              <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading}
                className="group relative w-full aspect-square overflow-hidden hatch border-b-2 border-brand-ink">
                {actor.photo_url
                  ? <img src={actor.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  : <span className="absolute inset-0 flex items-center justify-center display-title text-[8rem] text-brand-ink/10">{initiale}</span>}
                <span className="absolute inset-0 bg-brand-ink/0 group-hover:bg-brand-ink/50 transition flex items-center justify-center">
                  <span className="btn-secondary btn-sm opacity-0 group-hover:opacity-100 transition">
                    <Camera className="h-3.5 w-3.5" /> {uploading ? 'Envoi…' : actor.photo_url ? 'Changer' : 'Ajouter'}
                  </span>
                </span>
              </button>
              <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handlePhoto} />
              <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading}
                className="w-full ink-bar justify-between py-2.5 hover:bg-brand-blue transition">
                <span>Photo</span>
                <span className="inline-flex items-center gap-1.5 text-brand-cream/70"><Camera className="h-3 w-3" /> {actor.photo_url ? 'Changer' : 'Ajouter'}</span>
              </button>
            </div>

            <div className="card-hard">
              <div className="flex items-center justify-between border-b-2 border-brand-ink">
                <p className="ink-bar py-2.5">Complétion</p>
                <p className={`font-display text-2xl font-bold px-3 leading-none ${pct === 100 ? 'text-brand-green' : 'text-brand-coral'}`}>{pct}<span className="text-xs">%</span></p>
              </div>
              {/* Jauge en segments : un bloc par point de la checklist. */}
              <div className="grid gap-1 p-3 border-b border-brand-ink/15" style={{ gridTemplateColumns: `repeat(${checklist.length}, 1fr)` }}>
                {checklist.map((c) => (
                  <span key={c.label} className={`h-2.5 border border-brand-ink ${c.ok ? (pct === 100 ? 'bg-brand-green' : 'bg-brand-ink') : 'bg-white'}`} />
                ))}
              </div>
              <ul>
                {checklist.map((c) => (
                  <li key={c.label} className={`flex items-center gap-3 px-4 py-2.5 text-sm border-b border-brand-ink/15 last:border-b-0 ${c.ok ? 'text-brand-ink line-through decoration-brand-coral decoration-2' : 'text-brand-ink/70'}`}>
                    <span className={`h-4 w-4 border-2 border-brand-ink flex items-center justify-center flex-none rounded-[1px] ${c.ok ? 'bg-brand-ink text-brand-cream' : 'bg-white'}`}>
                      {c.ok && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    {c.label}
                  </li>
                ))}
              </ul>
              <p className={`microlabel px-4 py-3 border-t-2 border-brand-ink ${actor.profil_complet ? 'text-brand-green' : 'text-brand-coral'}`}>
                {actor.profil_complet ? '■ Fiche recevable' : '■ Adresse + discipline requises'}
              </p>
            </div>
          </aside>

          <form onSubmit={onSubmit} className="space-y-5 animate-fadeInUp" style={{ animationDelay: '120ms' }}>
            {error && <div className="border-2 border-brand-coral bg-white text-brand-coral rounded-[2px] px-4 py-2.5 text-sm font-medium">{error}</div>}
            {form}
            <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 card-ink pl-4 pr-2 py-2">
              <span className="text-xs sm:text-sm text-brand-cream/80 inline-flex items-center gap-2 min-w-0">
                {saved ? <><CheckCircle2 className="h-4 w-4 text-brand-green flex-none" /> <span className="truncate">Modifications enregistrées</span></> : <span className="truncate">Pense à enregistrer tes modifications</span>}
              </span>
              <button type="submit" disabled={saving} className="btn-coral !py-2.5 flex-none">
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

// Bloc de section du formulaire : barre encre en titre + champs.
export function Section({ titre, aide, children }) {
  return (
    <section className="card-hard">
      <div className="border-b-2 border-brand-ink flex flex-wrap items-center gap-x-4 gap-y-1">
        <h2 className="ink-bar py-2.5">{titre}</h2>
        {aide && <p className="text-xs text-brand-slate pr-4 py-1.5">{aide}</p>}
      </div>
      <div className="p-5 sm:p-6 space-y-5">{children}</div>
    </section>
  );
}

export function Field({ label, aide, children }) {
  return (
    <label className="block">
      <span className="microlabel text-brand-ink/70">{label}</span>
      <div className="mt-1">{children}</div>
      {aide && <span className="block mt-1.5 text-xs text-brand-slate">{aide}</span>}
    </label>
  );
}
