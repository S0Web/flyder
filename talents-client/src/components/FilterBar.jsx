import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { DISCIPLINES } from '../lib/constants';

const RAYONS = [5, 10, 20, 50];
const DEFAULTS = { disciplines: [], rayon_km: 20, tarif_min: '', tarif_max: '', remplacements: false };

export { DEFAULTS as FILTER_DEFAULTS };

export function nbFiltresActifs(filters) {
  return filters.disciplines.length + (filters.tarif_min || filters.tarif_max ? 1 : 0)
    + (filters.rayon_km !== DEFAULTS.rayon_km ? 1 : 0) + (filters.remplacements ? 1 : 0);
}

// Pastilles de disciplines, en ligne défilante sur mobile.
export function DisciplineChips({ filters, onChange }) {
  function toggle(value) {
    const set = new Set(filters.disciplines);
    set.has(value) ? set.delete(value) : set.add(value);
    onChange({ ...filters, disciplines: Array.from(set) });
  }
  return (
    <div className="scroll-x">
      <button type="button" onClick={() => onChange({ ...filters, disciplines: [] })}
        className={`chip ${filters.disciplines.length === 0 ? 'chip-on' : 'chip-off'}`}>Toutes</button>
      {DISCIPLINES.map((d) => (
        <button key={d.value} type="button" onClick={() => toggle(d.value)}
          className={`chip ${filters.disciplines.includes(d.value) ? 'chip-on' : 'chip-off'}`}>{d.label}</button>
      ))}
    </div>
  );
}

// Panneau de réglages : rayon en contrôle segmenté, tarif, interrupteur
// remplacements. Collant au scroll sur desktop.
export default function FilterBar({ filters, onChange, showTarif, showRemplacements }) {
  const actifs = nbFiltresActifs(filters);

  return (
    <aside className="card p-5 space-y-6 lg:sticky lg:top-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-brand-ink inline-flex items-center gap-2">
          <span className="tile tile-sm bg-white text-brand-blue"><SlidersHorizontal className="h-4 w-4" /></span> Filtres
          {actifs > 0 && <span className="badge badge-blue">{actifs}</span>}
        </h2>
        {actifs > 0 && (
          <button type="button" onClick={() => onChange({ ...DEFAULTS })}
            className="text-xs font-semibold text-brand-slate hover:text-brand-ink inline-flex items-center gap-1 transition">
            <RotateCcw className="h-3 w-3" /> Effacer
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        <p className="microlabel pl-1">Rayon autour de toi</p>
        <div className="seg seg-ink w-full bg-white">
          {RAYONS.map((r) => (
            <button key={r} type="button" data-on={filters.rayon_km === r} onClick={() => onChange({ ...filters, rayon_km: r })}>{r} km</button>
          ))}
        </div>
      </div>

      {showTarif && (
        <div className="space-y-2.5">
          <p className="microlabel pl-1">Tarif horaire</p>
          <div className="flex items-center gap-2">
            {[['tarif_min', 'Min'], ['tarif_max', 'Max']].map(([k, ph], i) => (
              <div key={k} className="relative flex-1 flex items-center gap-2">
                {i === 1 && <span className="text-brand-slate">–</span>}
                <div className="relative flex-1">
                  <input type="number" min="0" placeholder={ph} value={filters[k]} onChange={(e) => onChange({ ...filters, [k]: e.target.value })} className="field pr-8 py-3" />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-brand-slate">€</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showRemplacements && (
        <label className="row cursor-pointer">
          <span className="flex-1 text-sm font-semibold text-brand-ink leading-tight">Dispo remplacements<br /><span className="font-normal text-xs text-brand-ink/55">de dernière minute</span></span>
          <button type="button" role="switch" aria-checked={filters.remplacements} onClick={() => onChange({ ...filters, remplacements: !filters.remplacements })} className="switch"><span className="knob" /></button>
        </label>
      )}
    </aside>
  );
}
