import { useState } from 'react';
import { MapPin, Phone, Mail, ChevronDown, Check, Copy, Zap } from 'lucide-react';
import { api } from '../lib/api';
import { labelDiscipline } from '../lib/constants';

// Extrait la ville d'une adresse "12 rue X, 91100 Corbeil-Essonnes".
function ville(adresse) {
  const m = (adresse || '').match(/\d{5}\s+(.+)$/);
  return m ? m[1] : adresse;
}

const TILES = ['tile-blue', 'tile-coral', 'tile-green', 'tile-amber', 'tile-violet'];

// Carte "ligne de planning" : tuile de distance à gauche (comme l'heure d'un
// cours), carte douce avec nom / ville / disciplines, avatar carré arrondi à
// droite. "Contacter" déplie les coordonnées brutes — pas de messagerie (plan).
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
  const tile = TILES[profile.id % TILES.length];

  async function handleContacter() {
    setBusy(true); setError(null);
    try { setReveal(await api.contact(type, profile.id)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const email = reveal?.email || reveal?.contact_email;
  const tel = reveal?.telephone || reveal?.contact_telephone;

  return (
    <article className="flex gap-3 animate-fadeInUp" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      <div className="card w-[4.5rem] flex-none self-start py-4 flex flex-col items-center justify-center text-brand-ink">
        {profile.distance_km != null ? (
          <>
            <MapPin className="h-4 w-4 text-brand-blue mb-1" />
            <span className="font-display text-lg font-bold leading-none">{profile.distance_km}</span>
            <span className="text-[11px] text-brand-slate">km</span>
          </>
        ) : (
          <><MapPin className="h-4 w-4 text-brand-slate mb-1" /><span className="text-[11px] text-brand-slate">—</span></>
        )}
      </div>

      <div className="card card-hover flex-1 min-w-0 p-4 sm:p-5 flex flex-col gap-3.5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold text-brand-ink leading-tight truncate">{titre}</h3>
            <p className="text-sm text-brand-ink/55 truncate">{profile.adresse ? ville(profile.adresse) : 'Ville non renseignée'}</p>
            {isCoach && profile.tarif_horaire != null && (
              <p className="mt-1 font-display font-bold text-brand-ink">{profile.tarif_horaire} €<span className="text-brand-slate font-normal text-sm">/h</span></p>
            )}
          </div>
          <span className={`tile tile-lg ${tile} overflow-hidden font-display text-xl font-bold`}>
            {profile.photo_url ? <img src={profile.photo_url} alt="" className="h-full w-full object-cover" /> : initiale}
          </span>
        </div>

        {(disciplines.length > 0 || (isCoach && !!profile.disponible_remplacements)) && (
          <div className="flex flex-wrap gap-1.5">
            {isCoach && !!profile.disponible_remplacements && <span className="badge badge-green"><Zap className="h-3 w-3" /> Remplacements</span>}
            {disciplines.slice(0, 4).map((d) => <span key={d} className="badge bg-white text-brand-ink/75">{labelDiscipline(d)}</span>)}
            {disciplines.length > 4 && <span className="badge bg-white text-brand-slate">+{disciplines.length - 4}</span>}
          </div>
        )}

        {texte ? (
          <div>
            <p className={`text-sm text-brand-ink/70 leading-relaxed ${deplie ? '' : 'line-clamp-2'}`}>{texte}</p>
            {texte.length > 90 && (
              <button type="button" onClick={() => setDeplie((d) => !d)} className="mt-1 text-xs font-semibold text-brand-blue inline-flex items-center gap-0.5">
                {deplie ? 'Voir moins' : 'Voir plus'} <ChevronDown className={`h-3 w-3 transition ${deplie ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-brand-slate italic">Pas encore de description.</p>
        )}

        {error && <p className="text-xs font-medium text-brand-coral">{error}</p>}

        {reveal ? (
          <div className="card-white p-4 space-y-1 animate-pop">
            <p className="microlabel mb-2 flex items-center gap-1.5"><Check className="h-3 w-3 text-[#0F8A5F]" /> Coordonnées</p>
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-3 py-1.5 text-sm font-semibold text-brand-ink hover:text-brand-blue transition">
                <span className="tile tile-sm tile-blue"><Mail className="h-4 w-4" /></span><span className="break-all">{email}</span>
              </a>
            )}
            {tel && (
              <a href={`tel:${tel}`} className="flex items-center gap-3 py-1.5 text-sm font-semibold text-brand-ink hover:text-brand-blue transition">
                <span className="tile tile-sm tile-green"><Phone className="h-4 w-4" /></span><span>{tel}</span>
              </a>
            )}
            {reveal.contact_nom && <p className="text-xs text-brand-slate pl-1 pt-1">À demander : <strong className="text-brand-ink">{reveal.contact_nom}</strong></p>}
            {isCoach && (
              <button type="button" onClick={copierRef} title="Colle cette référence dans Flyder > Coachs > Nouveau coach pour pré-remplir sa fiche"
                className="mt-2 w-full flex items-center justify-between rounded-xl bg-brand-cream px-3 py-2.5 text-xs text-brand-ink/70 hover:text-brand-ink transition">
                <span>Réf. Flyder Talents <strong className="font-semibold text-brand-ink">#{profile.id}</strong></span>
                <span className="inline-flex items-center gap-1 text-brand-blue font-semibold">
                  {refCopiee ? <><Check className="h-3 w-3" /> Copié</> : <><Copy className="h-3 w-3" /> Copier</>}
                </span>
              </button>
            )}
          </div>
        ) : profile.deja_contacte ? (
          <button onClick={handleContacter} disabled={busy} className="btn-secondary w-full !py-3">
            <Check className="h-4 w-4 text-[#0F8A5F]" /> {busy ? 'Un instant…' : 'Voir les coordonnées'}
          </button>
        ) : (
          <button onClick={handleContacter} disabled={busy} className="btn-primary w-full !py-3">
            {busy ? 'Un instant…' : 'Contacter'}
          </button>
        )}
      </div>
    </article>
  );
}
