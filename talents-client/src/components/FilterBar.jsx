import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { DISCIPLINES } from '../lib/constants';

const RAYONS = [5, 10, 20, 50];
const DEFAULTS = { disciplines: [], rayon_km: 20, tarif_min: '', tarif_max: '' };

export { DEFAULTS as FILTER_DEFAULTS };

// Panneau de filtres latéral (esprit Malt), collant au scroll sur desktop.
export default function FilterBar({ filters, onChange, showTarif }) {
  const actifs = filters.disciplines.length + (filters.tarif_min || filters.tarif_max ? 1 : 0) + (filters.rayon_km !== DEFAULTS.rayon_km ? 1 : 0);

  function toggleDiscipline(value) {
    const set = new Set(filters.disciplines);
    set.has(value) ? set.delete(value) : set.add(value);
    onChange({ ...filters, disciplines: Array.from(set) });
  }

  return (
    <aside className="bg-white rounded-3xl border border-black/5 shadow-card p-5 sm:p-6 space-y-6 lg:sticky lg:top-24">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-brand-ink inline-flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-brand-blue" /> Filtres
          {actifs > 0 && <span className="rounded-full bg-brand-blue text-white text-[10px] font-bold h-5 min-w-5 px-1.5 inline-flex items-center justify-center">{actifs}</span>}
        </h2>
        {actifs > 0 && (
          <button type="button" onClick={() => onChange({ ...DEFAULTS })}
            className="text-xs font-medium text-brand-slate hover:text-brand-ink inline-flex items-center gap-1 transition">
            <RotateCcw className="h-3 w-3" /> Réinitialiser
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        <p className="microlabel">Discipline</p>
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
        <p className="microlabel">Autour de toi</p>
        <div className="grid grid-cols-4 gap-1 rounded-full bg-brand-cream p-1">
          {RAYONS.map((r) => (
            <button key={r} type="button" onClick={() => onChange({ ...filters, rayon_km: r })}
              className={`rounded-full py-1.5 text-xs font-semibold transition ${
                filters.rayon_km === r ? 'bg-brand-ink text-white shadow-sm' : 'text-brand-ink/60 hover:text-brand-ink'
              }`}>
              {r} km
            </button>
          ))}
        </div>
      </div>

      {showTarif && (
        <div className="space-y-2.5">
          <p className="microlabel">Tarif horaire</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input type="number" min="0" placeholder="Min" value={filters.tarif_min}
                onChange={(e) => onChange({ ...filters, tarif_min: e.target.value })}
                className="field pr-7 py-2.5" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-slate">€</span>
            </div>
            <span className="text-brand-slate">–</span>
            <div className="relative flex-1">
              <input type="number" min="0" placeholder="Max" value={filters.tarif_max}
                onChange={(e) => onChange({ ...filters, tarif_max: e.target.value })}
                className="field pr-7 py-2.5" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-slate">€</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
