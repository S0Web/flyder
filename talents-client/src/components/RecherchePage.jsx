import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { LocateFixed, SearchX, AlertTriangle, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import TopBar from './TopBar';
import FilterBar, { FILTER_DEFAULTS } from './FilterBar';
import ProfileCard from './ProfileCard';
import EmptyState from './EmptyState';
import { CardSkeleton } from './Skeleton';

// Page de recherche partagée. `type` = ce qu'on cherche ('coach' ou 'gym'),
// `base` = préfixe de route de l'espace connecté. L'origine géographique par
// défaut est l'adresse déjà enregistrée dans le profil — pas de ressaisie.
export default function RecherchePage({ type, base, titre, pluriel, singulier }) {
  const { actor } = useAuth();
  const [origine, setOrigine] = useState(actor.lat != null ? { lat: actor.lat, lng: actor.lng } : null);
  const [filters, setFilters] = useState({ ...FILTER_DEFAULTS });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Sur mobile les filtres prendraient tout le premier écran : repliés par défaut.
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const nbFiltres = filters.disciplines.length
    + (filters.tarif_min || filters.tarif_max ? 1 : 0)
    + (filters.rayon_km !== FILTER_DEFAULTS.rayon_km ? 1 : 0)
    + (filters.remplacements ? 1 : 0);

  const chercher = useCallback(() => {
    setLoading(true); setError(null);
    const params = {
      discipline: filters.disciplines.join(','),
      lat: origine?.lat, lng: origine?.lng,
      rayon_km: origine ? filters.rayon_km : '',
    };
    if (type === 'coach') {
      params.tarif_min = filters.tarif_min;
      params.tarif_max = filters.tarif_max;
      params.remplacements = filters.remplacements ? '1' : '';
    }
    (type === 'coach' ? api.searchCoaches : api.searchGyms)(params)
      .then(setResults)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters, origine, type]);

  useEffect(() => { chercher(); }, [chercher]);

  function utiliserMaPosition() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigine({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError('Impossible de récupérer ta position.')
    );
  }

  const n = results.length;
  const compteur = loading ? '…' : String(n).padStart(2, '0');
  const sousTitre = loading ? 'Recherche en cours'
    : origine ? `${n > 1 ? pluriel : singulier} dans un rayon de ${filters.rayon_km} km`
    : `${n > 1 ? pluriel : singulier} — active ta position pour trier par distance`;

  return (
    <div className="min-h-screen paper">
      <TopBar base={base} />

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-5 mb-6 pb-6 border-b-2 border-brand-ink">
          <div className="animate-fadeInUp min-w-0">
            <p className="ink-bar mb-4">Autour de toi</p>
            <h1 className="display-title text-4xl sm:text-5xl">
              {titre.ink} <span className="text-brand-blue">{titre.blue}.</span>
            </h1>
            <p className="mt-3 flex items-baseline gap-2.5">
              <span className="font-display text-3xl font-bold text-brand-coral leading-none">{compteur}</span>
              <span className="microlabel text-brand-ink/70">{sousTitre}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setFiltresOuverts((o) => !o)} className="btn-secondary lg:hidden">
              <SlidersHorizontal className="h-4 w-4" /> Filtres
              {nbFiltres > 0 && <span className="bg-brand-coral text-white px-1.5 py-0.5 rounded-[1px] text-[10px]">{nbFiltres}</span>}
            </button>
            <button onClick={utiliserMaPosition} className="btn-secondary">
              <LocateFixed className="h-4 w-4 text-brand-blue" /> <span className="hidden sm:inline">Utiliser ma position</span><span className="sm:hidden">Ma position</span>
            </button>
          </div>
        </div>

        {!actor.profil_complet && (
          <Link to={`${base}/profil`}
            className="group flex items-stretch card-hard card-hard-hover mb-6 overflow-hidden animate-fadeInUp">
            <span className="bg-brand-coral text-white flex items-center px-3 border-r-2 border-brand-ink flex-none"><AlertTriangle className="h-5 w-5" /></span>
            <span className="text-sm text-brand-ink/80 flex-1 px-4 py-3">
              <strong className="font-display font-bold uppercase tracking-wide text-brand-ink block text-[12px] mb-0.5">Ton profil n'est pas encore visible</strong>
              Ajoute une adresse et une discipline pour apparaître dans les recherches.
            </span>
            <span className="flex items-center px-4 text-brand-ink"><ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" /></span>
          </Link>
        )}

        <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
          <div className={`${filtresOuverts ? 'block' : 'hidden'} lg:block`}>
            <FilterBar filters={filters} onChange={setFilters} showTarif={type === 'coach'} showRemplacements={type === 'coach'} />
          </div>

          <section>
            {error && <div className="border-2 border-brand-coral text-brand-coral rounded-[2px] px-4 py-2.5 text-sm font-medium mb-4 bg-white">{error}</div>}

            {loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : n === 0 ? (
              <EmptyState icon={SearchX}
                titre={`Aucun ${singulier} ici pour l'instant`}
                texte="Élargis le rayon ou retire un filtre — et reviens bientôt, l'annuaire se remplit."
                action={<button onClick={() => setFilters({ ...FILTER_DEFAULTS, rayon_km: 50 })} className="btn-secondary">Chercher à 50 km</button>} />
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {results.map((r, i) => <ProfileCard key={r.id} type={type} profile={r} index={i} />)}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
