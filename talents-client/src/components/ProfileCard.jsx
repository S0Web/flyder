import { useState } from 'react';
import { MapPin, Phone, Mail, ArrowRight, Check, Copy } from 'lucide-react';
import { api } from '../lib/api';
import { labelDiscipline } from '../lib/constants';

// Extrait la ville d'une adresse "12 rue X, 91100 Corbeil-Essonnes".
function ville(adresse) {
  const m = (adresse || '').match(/\d{5}\s+(.+)$/);
  return m ? m[1] : adresse;
}

// Carte photo-forward (esprit Malt) : visuel en tête, badges "verre" en
// superposition, chips de disciplines, bouton pilule "Contacter" qui laisse
// place aux coordonnées brutes une fois cliqué — pas de messagerie (plan).
export default function ProfileCard({ type, profile, index = 0 }) {
  const [reveal, setReveal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [deplie, setDeplie] = useState(false);
  const [refCopiee, setRefCopiee] = useState(false);

  function copierRef() {
    navigator.clipboard?.writeText(String(profile.id)).catch(() => {});
    setRefCopiee(true);
    setTimeout(() => setRefCopiee(false), 1800);
  }

  const isCoach = type === 'coach';
  const disciplines = ((isCoach ? profile.disciplines : profile.disciplines_recherchees) || '').split(',').filter(Boolean);
  const titre = isCoach ? `${profile.prenom} ${profile.nom}` : profile.nom;
  const texte = isCoach ? profile.bio : profile.description;
  const initiale = (isCoach ? profile.prenom : profile.nom || '?').charAt(0).toUpperCase();

  async function handleContacter() {
    setBusy(true); setError(null);
    try { setReveal(await api.contact(type, profile.id)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const email = reveal?.email || reveal?.contact_email;
  const tel = reveal?.telephone || reveal?.contact_telephone;

  return (
    <article
      className="group bg-white rounded-3xl border border-black/5 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col animate-fadeInUp"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-brand-ink via-[#1B2352] to-[#2743C4]">
        {profile.photo_url ? (
          <img src={profile.photo_url} alt={titre}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-6xl font-bold text-white/15 select-none">{initiale}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" />

        {profile.distance_km != null && (
          <span className="absolute top-3 left-3 glass rounded-full pl-2 pr-2.5 py-1 text-[11px] font-semibold text-brand-ink inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 text-brand-blue" /> {profile.distance_km} km
          </span>
        )}
        {isCoach && profile.tarif_horaire != null && (
          <span className="absolute top-3 right-3 rounded-full bg-brand-ink/85 backdrop-blur-md text-white px-2.5 py-1 text-[11px] font-semibold">
            {profile.tarif_horaire} €<span className="text-white/60 font-normal">/h</span>
          </span>
        )}
        <div className="absolute left-4 right-4 bottom-3 text-white">
          <h3 className="font-display text-lg font-bold leading-tight truncate drop-shadow-sm">{titre}</h3>
          {profile.adresse && <p className="text-xs text-white/80 truncate">{ville(profile.adresse)}</p>}
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1">
        {texte ? (
          <div>
            <p className={`text-sm text-brand-ink/70 leading-relaxed ${deplie ? '' : 'line-clamp-2'}`}>{texte}</p>
            {texte.length > 90 && (
              <button type="button" onClick={() => setDeplie((d) => !d)}
                className="mt-1 text-xs font-semibold text-brand-blue hover:underline">
                {deplie ? 'Voir moins' : 'Voir plus'}
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-brand-slate italic">Pas encore de description.</p>
        )}

        {disciplines.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {disciplines.slice(0, 4).map((d) => (
              <span key={d} className="rounded-full bg-sky-50 text-sky-700 px-2.5 py-1 text-[11px] font-semibold">{labelDiscipline(d)}</span>
            ))}
            {disciplines.length > 4 && (
              <span className="rounded-full bg-brand-cream text-brand-slate px-2.5 py-1 text-[11px] font-semibold">+{disciplines.length - 4}</span>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="mt-auto pt-1">
          {reveal ? (
            <div className="rounded-2xl bg-brand-cream p-4 space-y-2.5 animate-pop">
              <p className="microlabel flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-600" /> Coordonnées</p>
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-2.5 text-sm font-medium text-brand-ink hover:text-brand-blue transition">
                  <span className="h-8 w-8 rounded-full bg-white flex items-center justify-center flex-none"><Mail className="h-4 w-4 text-brand-blue" /></span>
                  <span className="truncate">{email}</span>
                </a>
              )}
              {tel && (
                <a href={`tel:${tel}`} className="flex items-center gap-2.5 text-sm font-medium text-brand-ink hover:text-brand-blue transition">
                  <span className="h-8 w-8 rounded-full bg-white flex items-center justify-center flex-none"><Phone className="h-4 w-4 text-brand-blue" /></span>
                  <span>{tel}</span>
                </a>
              )}
              {reveal.contact_nom && <p className="text-xs text-brand-slate pl-1">À demander : {reveal.contact_nom}</p>}
              {isCoach && (
                <button type="button" onClick={copierRef} title="Colle cette référence dans Flyder > Coachs > Nouveau coach pour pré-remplir sa fiche"
                  className="mt-1 w-full flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs text-brand-ink/70 hover:text-brand-ink transition">
                  <span>Réf. Flyder Talents <strong className="font-semibold text-brand-ink">#{profile.id}</strong></span>
                  <span className="inline-flex items-center gap-1 text-brand-blue font-semibold">
                    {refCopiee ? <><Check className="h-3 w-3" /> Copié</> : <><Copy className="h-3 w-3" /> Copier</>}
                  </span>
                </button>
              )}
            </div>
          ) : profile.deja_contacte ? (
            <button onClick={handleContacter} disabled={busy} className="btn-secondary w-full">
              <Check className="h-4 w-4 text-emerald-600" /> {busy ? 'Un instant…' : 'Voir les coordonnées'}
            </button>
          ) : (
            <button onClick={handleContacter} disabled={busy} className="btn-primary w-full">
              {busy ? 'Un instant…' : <>Contacter <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
