import { RotateCcw } from 'lucide-react';
import { DISCIPLINES } from '../lib/constants';

const RAYONS = [5, 10, 20, 50];
const DEFAULTS = { disciplines: [], rayon_km: 20, tarif_min: '', tarif_max: '', remplacements: false };

export { DEFAULTS as FILTER_DEFAULTS };

// Panneau de filtres : une fiche posée avec barre encre, cases à cocher
// "ticket" pour les disciplines, sélecteur de rayon en blocs jointifs,
// tarifs sur lignes soulignées. Collant au scroll sur desktop.
export default function FilterBar({ filters, onChange, showTarif, showRemplacements }) {
  const actifs = filters.disciplines.length + (filters.tarif_min || filters.tarif_max ? 1 : 0)
    + (filters.rayon_km !== DEFAULTS.rayon_km ? 1 : 0) + (filters.remplacements ? 1 : 0);

  function toggleDiscipline(value) {
    const set = new Set(filters.disciplines);
    set.has(value) ? set.delete(value) : set.add(value);
    onChange({ ...filters, disciplines: Array.from(set) });
  }

  return (
    <aside className="card-hard lg:sticky lg:top-24">
      <div className="flex items-center justify-between border-b-2 border-brand-ink">
        <h2 className="ink-bar h-full py-2.5">
          Filtres {actifs > 0 && <span className="bg-brand-coral text-white px-1.5 py-0.5 rounded-[1px]">{actifs}</span>}
        </h2>
        {actifs > 0 && (
          <button type="button" onClick={() => onChange({ ...DEFAULTS })}
            className="microlabel text-brand-ink/60 hover:text-brand-coral inline-flex items-center gap-1 transition px-3">
            <RotateCcw className="h-3 w-3" /> Effacer
          </button>
        )}
      </div>

      <div className="p-5 space-y-6">
        <div className="space-y-2.5">
          <p className="microlabel text-brand-ink">Discipline</p>
          <div className="flex flex-wrap gap-1.5">
            {DISCIPLINES.map((d) => {
              const on = filters.disciplines.includes(d.value);
              return (
                <button key={d.value} type="button" onClick={() => toggleDiscipline(d.value)}
                  className={`chip ${on ? 'chip-on' : 'chip-off'}`}>{d.label}</button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2.5">
          <p className="microlabel text-brand-ink">Rayon</p>
          <div className="grid grid-cols-4 border-2 border-brand-ink rounded-[2px] overflow-hidden">
            {RAYONS.map((r, i) => (
              <button key={r} type="button" onClick={() => onChange({ ...filters, rayon_km: r })}
                className={`py-2 font-display text-[12px] font-bold tracking-wide transition ${i > 0 ? 'border-l-2 border-brand-ink' : ''} ${
                  filters.rayon_km === r ? 'bg-brand-ink text-brand-cream' : 'bg-white text-brand-ink/60 hover:bg-brand-cream hover:text-brand-ink'
                }`}>
                {r}<span className="text-[10px] ml-0.5 opacity-70">km</span>
              </button>
            ))}
          </div>
        </div>

        {showTarif && (
          <div className="space-y-2.5">
            <p className="microlabel text-brand-ink">Tarif horaire</p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div className="relative">
                <input type="number" min="0" placeholder="Min" value={filters.tarif_min}
                  onChange={(e) => onChange({ ...filters, tarif_min: e.target.value })}
                  className="field pr-6 py-1.5 font-display font-bold" />
                <span className="absolute right-0 bottom-2.5 text-xs font-bold text-brand-slate">€</span>
              </div>
              <span className="text-brand-ink font-display font-bold pb-2">—</span>
              <div className="relative">
                <input type="number" min="0" placeholder="Max" value={filters.tarif_max}
                  onChange={(e) => onChange({ ...filters, tarif_max: e.target.value })}
                  className="field pr-6 py-1.5 font-display font-bold" />
                <span className="absolute right-0 bottom-2.5 text-xs font-bold text-brand-slate">€</span>
              </div>
            </div>
          </div>
        )}

        {showRemplacements && (
          <div className="space-y-2.5">
            <p className="microlabel text-brand-ink">Urgence</p>
            <button type="button" onClick={() => onChange({ ...filters, remplacements: !filters.remplacements })}
              className={`chip w-full !justify-start !py-2.5 ${filters.remplacements ? 'chip-on' : 'chip-off'}`}>
              Dispo remplacements
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
