import { useState } from 'react';
import { MapPin, Phone, Mail, ArrowRight, Check, Copy } from 'lucide-react';
import { api } from '../lib/api';
import { labelDiscipline } from '../lib/constants';

// Extrait la ville d'une adresse "12 rue X, 91100 Corbeil-Essonnes".
function ville(adresse) {
  const m = (adresse || '').match(/\d{5}\s+(.+)$/);
  return m ? m[1] : adresse;
}

function numero(id) { return `#${String(id).padStart(4, '0')}`; }

// Carte "dossard" : cadre encre, ombre pleine, numéro en cartouche, photo
// bord à bord (hachures si absente), tarif en bloc encre, tampons pour la
// distance et la dispo remplacements. Le bouton "Contacter" laisse place aux
// coordonnées brutes une fois cliqué — pas de messagerie (plan).
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
      className="group card-hard card-hard-hover overflow-hidden flex flex-col animate-fadeInUp"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b-2 border-brand-ink hatch">
        {profile.photo_url ? (
          <img src={profile.photo_url} alt={titre}
            className="absolute inset-0 h-full w-full object-cover" style={{ filter: 'contrast(1.05)' }} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="display-title text-[7rem] text-brand-ink/10 select-none">{initiale}</span>
          </div>
        )}

        <span className="absolute top-3 left-3 dossard">{numero(profile.id)}</span>

        {isCoach && profile.tarif_horaire != null && (
          <span className="absolute top-0 right-0 bg-brand-ink text-brand-cream border-l-2 border-b-2 border-brand-ink px-3 py-2 font-display font-bold leading-none">
            <span className="text-xl">{profile.tarif_horaire}</span><span className="text-[10px] uppercase tracking-wider ml-1 text-brand-cream/60">€/h</span>
          </span>
        )}

        {profile.distance_km != null && (
          <span className="absolute bottom-3 right-3 stamp">
            <MapPin className="h-3 w-3" /> {profile.distance_km} km
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1">
        <div>
          <h3 className="display-title text-xl leading-none truncate">{titre}</h3>
          <p className="microlabel mt-2 truncate">{profile.adresse ? ville(profile.adresse) : 'Ville non renseignée'}</p>
        </div>

        {disciplines.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {disciplines.slice(0, 4).map((d) => <span key={d} className="tag">{labelDiscipline(d)}</span>)}
            {disciplines.length > 4 && <span className="tag tag-soft">+{disciplines.length - 4}</span>}
          </div>
        )}

        {isCoach && !!profile.disponible_remplacements && (
          <span className="stamp stamp-green stamp-flat self-start">Dispo remplacements</span>
        )}

        <div className="rule-thin" />

        {texte ? (
          <div>
            <p className={`text-sm text-brand-ink/70 leading-relaxed ${deplie ? '' : 'line-clamp-2'}`}>{texte}</p>
            {texte.length > 90 && (
              <button type="button" onClick={() => setDeplie((d) => !d)}
                className="mt-1 microlabel text-brand-blue hover:text-brand-ink transition">
                {deplie ? 'Voir moins' : 'Voir plus'}
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-brand-slate italic">Pas encore de description.</p>
        )}

        {error && <p className="text-xs font-medium text-brand-coral">{error}</p>}

        <div className="mt-auto pt-1">
          {reveal ? (
            <div className="border-2 border-brand-ink rounded-[2px] bg-brand-cream animate-pop">
              <p className="ink-bar w-full"><Check className="h-3 w-3 text-brand-coral" /> Coordonnées</p>
              <div className="p-3 space-y-1">
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center gap-2.5 py-1.5 text-sm font-semibold text-brand-ink hover:text-brand-blue transition">
                    <Mail className="h-4 w-4 text-brand-coral flex-none" /><span className="break-all">{email}</span>
                  </a>
                )}
                {tel && (
                  <a href={`tel:${tel}`} className="flex items-center gap-2.5 py-1.5 font-display text-base font-bold text-brand-ink hover:text-brand-blue transition">
                    <Phone className="h-4 w-4 text-brand-coral flex-none" /><span>{tel}</span>
                  </a>
                )}
                {reveal.contact_nom && <p className="text-xs text-brand-slate">À demander : <strong className="text-brand-ink">{reveal.contact_nom}</strong></p>}
                {isCoach && (
                  <button type="button" onClick={copierRef} title="Colle cette référence dans Flyder > Coachs > Nouveau coach pour pré-remplir sa fiche"
                    className="mt-2 w-full flex items-center justify-between border-t-2 border-brand-ink pt-2.5 text-xs text-brand-ink/70 hover:text-brand-ink transition">
                    <span>Réf. Flyder <strong className="font-display font-bold text-brand-ink">{numero(profile.id)}</strong></span>
                    <span className="microlabel text-brand-blue inline-flex items-center gap-1">
                      {refCopiee ? <><Check className="h-3 w-3" /> Copié</> : <><Copy className="h-3 w-3" /> Copier</>}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : profile.deja_contacte ? (
            <button onClick={handleContacter} disabled={busy} className="btn-secondary w-full">
              <Check className="h-4 w-4 text-brand-green" /> {busy ? 'Un instant…' : 'Voir les coordonnées'}
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
