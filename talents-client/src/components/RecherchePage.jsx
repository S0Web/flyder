import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { LocateFixed, SearchX, AlertCircle, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { AppHeader, BottomNav } from './AppShell';
import FilterBar, { FILTER_DEFAULTS, nbFiltresActifs } from './FilterBar';
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
  // Sur mobile le panneau de réglages est replié par défaut (les disciplines
  // restent toujours accessibles en pastilles).
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const nbFiltres = nbFiltresActifs(filters);

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
  const sousTitre = loading ? 'Recherche en cours…'
    : origine ? `${n} ${n > 1 ? pluriel : singulier} dans un rayon de ${filters.rayon_km} km`
    : `${n} ${n > 1 ? pluriel : singulier} — active ta position pour trier par distance`;

  return (
    <div className="min-h-screen bg-white">
      <AppHeader base={base} eyebrow="Autour de toi" titre={<>{titre.ink} {titre.blue}.</>} sousTitre={sousTitre}>
        <button onClick={utiliserMaPosition} className="inline-flex items-center gap-2 rounded-full bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-semibold transition">
          <LocateFixed className="h-4 w-4" /> <span className="hidden sm:inline">Utiliser ma position</span><span className="sm:hidden">Ma position</span>
        </button>
      </AppHeader>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-6 sm:py-8">
        {!actor.profil_complet && (
          <Link to={`${base}/profil`} className="row card-hover mb-5 animate-fadeInUp">
            <span className="tile tile-amber"><AlertCircle className="h-5 w-5" /></span>
            <span className="text-sm text-brand-ink/70 flex-1 leading-snug">
              <strong className="block font-semibold text-brand-ink">Ton profil n'est pas encore visible</strong>
              Ajoute une adresse et une discipline pour apparaître dans les recherches.
            </span>
            <ChevronRight className="h-4 w-4 text-brand-slate flex-none" />
          </Link>
        )}

        <div className="flex justify-end mb-5 lg:hidden">
          <button onClick={() => setFiltresOuverts((o) => !o)} className="btn-secondary btn-sm">
            <SlidersHorizontal className="h-4 w-4" /> Filtres {nbFiltres > 0 && <span className="badge badge-blue">{nbFiltres}</span>}
          </button>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
          <div className={`${filtresOuverts ? 'block animate-fadeInUp' : 'hidden'} lg:block`}>
            <FilterBar filters={filters} onChange={setFilters} showTarif={type === 'coach'} showRemplacements={type === 'coach'} />
          </div>

          <section>
            {error && <div className="bg-[#FFEDE8] text-brand-coral rounded-2xl px-4 py-3 text-sm font-medium mb-4">{error}</div>}

            {loading ? (
              <div className="grid xl:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : n === 0 ? (
              <EmptyState icon={SearchX}
                titre={`Aucun ${singulier} ici pour l'instant`}
                texte="Élargis le rayon ou retire un filtre — et reviens bientôt, l'annuaire se remplit."
                action={<button onClick={() => setFilters({ ...FILTER_DEFAULTS, rayon_km: 50 })} className="btn-secondary">Chercher à 50 km</button>} />
            ) : (
              <div className="grid xl:grid-cols-2 gap-4">
                {results.map((r, i) => <ProfileCard key={r.id} type={type} profile={r} index={i} />)}
              </div>
            )}
          </section>
        </div>
      </main>

      <BottomNav base={base} fab={{ icon: SlidersHorizontal, label: 'Filtres', onClick: () => { setFiltresOuverts((o) => !o); window.scrollTo({ top: 0, behavior: 'smooth' }); } }} />
    </div>
  );
}
