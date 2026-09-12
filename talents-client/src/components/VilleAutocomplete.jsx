import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, Check } from 'lucide-react';

// Champ ville "inbugable" : jamais de saisie libre enregistrée, seulement une
// commune réelle choisie dans une liste — impossible d'enregistrer "aulnay" à
// la place d'"Aulnay-sous-Bois" et de fausser le tri par distance en silence.
// Appelle directement l'API Adresse du gouvernement français (Base Adresse
// Nationale, gratuite, CORS ouvert) — mêmes données que le géocodage serveur.
export default function VilleAutocomplete({ ville, onSelect, placeholder }) {
  const [query, setQuery] = useState(ville || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [valide, setValide] = useState(!!ville);
  const debounceRef = useRef(null);

  // Le profil peut charger sa valeur après le premier rendu (fetch /me) : on
  // resynchronise le texte affiché tant que l'utilisateur n'a rien tapé.
  useEffect(() => { setQuery(ville || ''); setValide(!!ville); }, [ville]);

  const rechercher = useCallback((texte) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!texte || texte.trim().length < 2) { setSuggestions([]); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(texte.trim())}&type=municipality&limit=8`;
        const res = await fetch(url);
        const data = await res.json();
        setSuggestions((data.features || []).map((f) => ({
          ville: f.properties.city,
          codePostal: f.properties.postcode,
          contexte: f.properties.context,
        })));
      } catch (_) {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, []);

  function handleChange(e) {
    const texte = e.target.value;
    setQuery(texte);
    setValide(false);
    setOpen(true);
    rechercher(texte);
  }

  function choisir(s) {
    setQuery(s.ville);
    setValide(true);
    setOpen(false);
    setSuggestions([]);
    onSelect(s.ville, s.codePostal);
  }

  function handleBlur() {
    // Laisse le temps au clic sur une suggestion de s'exécuter avant de fermer.
    setTimeout(() => {
      setOpen(false);
      // Pas de sélection valide au moment de quitter le champ : on revient à
      // la dernière ville enregistrée plutôt que de laisser du texte non
      // validé qui donnerait l'illusion d'être pris en compte.
      if (!valide) { setQuery(ville || ''); setSuggestions([]); }
    }, 150);
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-slate pointer-events-none" />
        <input
          type="text"
          className="field pl-11 pr-9"
          value={query}
          onChange={handleChange}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder || 'Commence à taper une ville…'}
          autoComplete="off"
        />
        {loading && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-slate animate-spin" />}
        {!loading && valide && query && <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0F8A5F]" />}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1.5 w-full card-white p-1.5 max-h-64 overflow-y-auto space-y-0.5">
          {suggestions.map((s, i) => (
            <li key={`${s.ville}-${s.codePostal}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choisir(s)}
                className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-brand-cream transition flex items-center justify-between gap-2"
              >
                <span className="text-sm font-medium text-brand-ink">{s.ville}</span>
                <span className="text-xs text-brand-slate flex-none">{s.codePostal} · {s.contexte?.split(',').slice(1).join(',').trim()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!valide && query.trim().length > 0 && (
        <p className="mt-1.5 text-xs text-brand-slate">Choisis ta ville dans la liste pour la valider.</p>
      )}
    </div>
  );
}
