import { useState } from 'react';
import { Search, Star } from 'lucide-react';
import { DISCIPLINE_CATEGORIES, MAX_DISCIPLINES_PREFEREES } from '../lib/constants';

const normalise = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Un volet par catégorie (Fitness / Aqua) : liste de cases à cocher dans un
// panneau défilant, avec une case "Autre" qui révèle un champ libre en mode
// édition (en mode filtre, "Autre" reste une case comme les autres — une
// salle filtre juste sur "ce coach a coché autre chose", sans texte à saisir).
// En mode édition, une case cochée gagne une étoile pour la désigner comme
// spécialité mise en avant sur la carte — jusqu'à MAX_DISCIPLINES_PREFEREES
// à la fois, l'étoile des non-cochées se grise une fois le plafond atteint.
function DisciplineFieldset({ categorie, selected, onToggle, query, autreTexte, onAutreChange, editable, preferees, onToggleFavorite, plafondAtteint }) {
  const items = categorie.disciplines.filter(
    (d) => selected.includes(d.value) || !query || normalise(d.label).includes(normalise(query))
  );
  if (items.length === 0) return null;
  const nbCochees = categorie.disciplines.filter((d) => selected.includes(d.value)).length;

  return (
    <div className="rounded-2xl border border-black/[0.08] bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-black/[0.06] flex items-center justify-between">
        <span className="text-sm font-bold text-brand-ink">{categorie.label}</span>
        {nbCochees > 0 && <span className="badge badge-blue">{nbCochees}</span>}
      </div>
      <div className="max-h-52 overflow-y-auto px-4 py-1">
        {items.map((d) => {
          const coche = selected.includes(d.value);
          const favori = preferees.includes(d.value);
          const desactivee = plafondAtteint && !favori;
          return (
            <div key={d.value}>
              <div className="flex items-center gap-1 py-2">
                <label className="flex items-center gap-3 flex-1 cursor-pointer min-w-0">
                  <input type="checkbox" checked={coche} onChange={() => onToggle(d.value)}
                    className="h-5 w-5 flex-none rounded-md" />
                  <span className="text-sm text-brand-ink flex-1 truncate">{d.label}</span>
                </label>
                {editable && coche && (
                  <button type="button" onClick={() => !desactivee && onToggleFavorite(d.value)} disabled={desactivee}
                    title={favori ? 'Retirer des spécialités' : desactivee ? `Maximum ${MAX_DISCIPLINES_PREFEREES} spécialités` : 'Ajouter comme spécialité'}
                    className={`h-7 w-7 rounded-full flex-none flex items-center justify-center transition ${favori ? 'text-[#C77700]' : desactivee ? 'text-brand-slate/25 cursor-not-allowed' : 'text-brand-slate/50 hover:text-brand-slate'}`}>
                    <Star className="h-4 w-4" fill={favori ? 'currentColor' : 'none'} />
                  </button>
                )}
              </div>
              {editable && d.autre && coche && (
                <input className="field field-grey py-2 text-sm mb-2" placeholder="Précise…" value={autreTexte || ''}
                  onChange={(e) => onAutreChange(e.target.value)} onClick={(e) => e.stopPropagation()} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Sélecteur de disciplines, réutilisé pour éditer un profil (avec champ
// "Autre" libre et étoiles "spécialités") et pour filtrer une recherche
// (cases seulement). Beaucoup de concepts au total (fitness + aqua) : une
// barre de recherche filtre les deux volets en même temps plutôt que de
// faire défiler toute la liste.
export default function DisciplinePicker({
  selected, onToggle,
  editable = false,
  autreFitness, onAutreFitnessChange,
  autreAqua, onAutreAquaChange,
  preferees = [], onTogglePreferee,
}) {
  const [query, setQuery] = useState('');
  const plafondAtteint = preferees.length >= MAX_DISCIPLINES_PREFEREES;

  function toggleFavorite(v) {
    onTogglePreferee?.(preferees.includes(v) ? preferees.filter((p) => p !== v) : [...preferees, v]);
  }

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-slate" />
        <input className="field field-grey pl-10 py-2.5 text-sm" placeholder="Rechercher une discipline…"
          value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {editable && (
        <p className="text-xs text-brand-slate pl-1">
          ⭐ Spécialités mises en avant sur ta carte ({preferees.length}/{MAX_DISCIPLINES_PREFEREES}) : clique l'étoile d'une discipline cochée.
        </p>
      )}
      <div className="space-y-3">
        {DISCIPLINE_CATEGORIES.map((categorie) => (
          <DisciplineFieldset key={categorie.key} categorie={categorie} selected={selected} onToggle={onToggle}
            query={query} editable={editable} preferees={preferees} onToggleFavorite={toggleFavorite} plafondAtteint={plafondAtteint}
            autreTexte={categorie.key === 'fitness' ? autreFitness : autreAqua}
            onAutreChange={categorie.key === 'fitness' ? onAutreFitnessChange : onAutreAquaChange} />
        ))}
      </div>
    </div>
  );
}
