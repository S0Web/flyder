import { useState } from 'react';
import { Table2, ChevronDown } from 'lucide-react';
import { VIZ, RAMP, fmtInt, fmtDec, JOURS_COURTS, JOURS_LONGS } from '../lib/chartTheme';

// ── Carte porteuse ─────────────────────────────────────────────────────────────
// Chaque graphique vit dans une carte qui porte : une question en français
// (le titre dit ce qu'on cherche, pas le nom de la métrique), une phrase
// d'interprétation, et un dépliant « Voir les données » — le tableau équivalent,
// pour qui préfère les chiffres bruts (et pour l'accessibilité : aucune valeur
// n'est accessible uniquement par la couleur ou le survol).
export function ChartCard({ title, hint, legend, actions, children, table, className = '' }) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className={`bg-white border border-gray-200 rounded-xl p-4 sm:p-5 ${className}`}>
      <header className="mb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-bold text-gray-800 leading-snug">{title}</h3>
          {actions}
        </div>
        {hint && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{hint}</p>}
        {legend && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5">{legend}</div>}
      </header>

      {children}

      {table && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => setShowTable(s => !s)}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-sky-600 transition-colors"
            aria-expanded={showTable}
          >
            <Table2 className="h-3.5 w-3.5" />
            {showTable ? 'Masquer les données' : 'Voir les données'}
            <ChevronDown className={`h-3 w-3 transition-transform ${showTable ? 'rotate-180' : ''}`} />
          </button>
          {showTable && (
            <div className="mt-2 overflow-x-auto animate-fadeIn">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    {table.head.map((h, i) => (
                      <th key={i} className={`px-2 py-1.5 font-semibold text-gray-600 border-b border-gray-200 ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {r.map((c, j) => (
                        <td key={j} className={`px-2 py-1 border-b border-gray-100 ${j === 0 ? 'text-left text-gray-700' : 'text-right tabular-nums text-gray-600'}`}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function LegendItem({ color, label, shape = 'line' }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-600">
      {shape === 'line'
        ? <span className="w-4 h-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        : <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />}
      {label}
    </span>
  );
}

// Enveloppe de défilement : plutôt que de rétrécir le texte sur mobile (illisible),
// on garde une largeur mini et on laisse la carte défiler horizontalement.
function Scroller({ minWidth = 560, children }) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}

// Info-bulle HTML positionnée au-dessus du SVG (plus simple à styler qu'un <text>).
function Tip({ x, y, children }) {
  return (
    <div
      className="pointer-events-none absolute z-20 rounded-lg bg-brand-ink text-white text-[11px] leading-snug px-2.5 py-1.5 shadow-lg whitespace-nowrap"
      style={{ left: `${x}%`, top: y, transform: 'translate(-50%, -100%)' }}
    >
      {children}
    </div>
  );
}

function EmptyState({ height = 160 }) {
  return (
    <div className="flex items-center justify-center text-xs text-gray-400 italic" style={{ height }}>
      Aucune donnée sur cette période.
    </div>
  );
}

// ── Courbe (évolution dans le temps) ───────────────────────────────────────────
// Une seule échelle Y, toujours : deux mesures d'ordres de grandeur différents ne
// partagent jamais un axe (l'alignement serait arbitraire et inventerait une
// corrélation). Pour comparer deux mesures, on change de métrique via le sélecteur.
export function LineChart({ data, series, yFmt = fmtInt, height = 230, xKey = 'label' }) {
  const [hover, setHover] = useState(null);
  if (!data?.length) return <EmptyState height={height} />;

  const W = 720, H = height;
  const PAD = { top: 14, right: 16, bottom: 30, left: 52 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const allVals = data.flatMap(d => series.map(s => d[s.key] ?? 0));
  const maxVal  = Math.max(...allVals, 1);
  // Marge de 15 % au-dessus du max : sans elle, le point le plus haut touche
  // pile le plafond du tracé et se lit comme « coupé ».
  const axisMax = maxVal * 1.15;
  const step    = data.length > 1 ? iW / (data.length - 1) : 0;
  const xAt     = (i) => PAD.left + (data.length > 1 ? i * step : iW / 2);
  const yAt     = (v) => PAD.top + iH - ((v ?? 0) / axisMax) * iH;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => axisMax * f);
  // Sur une longue série, n'étiqueter qu'un point sur N pour éviter la bouillie.
  const labelEvery = Math.ceil(data.length / 12);

  return (
    <Scroller minWidth={560}>
      <div className="relative" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height }} role="img">
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={PAD.left} y1={yAt(t)} x2={W - PAD.right} y2={yAt(t)} stroke={VIZ.grid} strokeWidth="1" />
              <text x={PAD.left - 8} y={yAt(t) + 3.5} textAnchor="end" fontSize="10" fill={VIZ.muted} className="tabular-nums">
                {yFmt(t)}
              </text>
            </g>
          ))}

          {series.map(s => {
            const pts = data.map((d, i) => `${xAt(i).toFixed(1)},${yAt(d[s.key]).toFixed(1)}`);
            const line = `M${pts.join(' L')}`;
            const area = `${line} L${xAt(data.length - 1).toFixed(1)},${(PAD.top + iH).toFixed(1)} L${PAD.left},${(PAD.top + iH).toFixed(1)} Z`;
            return (
              <g key={s.key}>
                {series.length === 1 && <path d={area} fill={s.color} fillOpacity="0.10" />}
                <path d={line} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              </g>
            );
          })}

          {hover != null && (
            <line x1={xAt(hover)} y1={PAD.top} x2={xAt(hover)} y2={PAD.top + iH} stroke={VIZ.axis} strokeWidth="1" />
          )}
          {hover != null && series.map(s => (
            <circle key={s.key} cx={xAt(hover)} cy={yAt(data[hover][s.key])} r="4.5"
              fill={s.color} stroke={VIZ.surface} strokeWidth="2" />
          ))}

          {data.map((d, i) => (
            (i % labelEvery === 0 || i === data.length - 1) && (
              <text key={i} x={xAt(i)} y={H - 10} textAnchor="middle" fontSize="10" fill={VIZ.muted}>
                {d[xKey]}
              </text>
            )
          ))}

          {/* Zones de survol larges : on ne vise jamais un point au pixel près. */}
          {data.map((d, i) => (
            <rect key={i} x={xAt(i) - (step || iW) / 2} y={PAD.top} width={step || iW} height={iH}
              fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>

        {hover != null && (
          <Tip x={(xAt(hover) / W) * 100} y={Math.max(Math.min(...series.map(s => yAt(data[hover][s.key]))) - 8, PAD.top + 4)}>
            <div className="font-semibold mb-0.5">{data[hover][xKey]}</div>
            {series.map(s => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-white/70">{s.label}</span>
                <span className="font-semibold tabular-nums ml-auto">{yFmt(data[hover][s.key])}</span>
              </div>
            ))}
          </Tip>
        )}
      </div>
    </Scroller>
  );
}

// ── Colonnes (profil par jour / par heure / distribution) ──────────────────────
// Une seule série = une seule couleur pour toutes les barres. On ne teinte pas
// « plus foncé quand plus grand » : la longueur dit déjà la grandeur, la couleur
// n'ajouterait rien et brûlerait le seul canal libre.
export function ColumnChart({ data, color = VIZ.aqua, yFmt = fmtInt, height = 210, tipExtra }) {
  const [hover, setHover] = useState(null);
  if (!data?.length) return <EmptyState height={height} />;

  const W = 720, H = height;
  const PAD = { top: 14, right: 12, bottom: 30, left: 52 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.map(d => d.value ?? 0), 1);
  // Même marge que LineChart : la barre la plus haute ne doit jamais toucher le plafond.
  const axisMax = maxVal * 1.15;
  const slot = iW / data.length;
  const barW = Math.min(slot - 8, 54);
  const ticks = [0, 0.5, 1].map(f => axisMax * f);

  return (
    <Scroller minWidth={520}>
      <div className="relative" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height }} role="img">
          {ticks.map((t, i) => {
            const y = PAD.top + iH - (t / axisMax) * iH;
            return (
              <g key={i}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke={VIZ.grid} strokeWidth="1" />
                <text x={PAD.left - 8} y={y + 3.5} textAnchor="end" fontSize="10" fill={VIZ.muted} className="tabular-nums">{yFmt(t)}</text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const h = ((d.value ?? 0) / axisMax) * iH;
            const x = PAD.left + i * slot + (slot - barW) / 2;
            const y = PAD.top + iH - h;
            return (
              <g key={i} onMouseEnter={() => setHover(i)}>
                <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={iH} fill="transparent" />
                <rect x={x} y={y} width={barW} height={Math.max(h, 1)} rx="4"
                  fill={d.color || color} opacity={hover == null || hover === i ? 1 : 0.45} />
                <text x={x + barW / 2} y={H - 10} textAnchor="middle" fontSize="10" fill={VIZ.muted}>{d.label}</text>
              </g>
            );
          })}
        </svg>
        {hover != null && (
          <Tip x={((PAD.left + hover * slot + slot / 2) / W) * 100}
            y={Math.max(PAD.top + iH - ((data[hover].value ?? 0) / axisMax) * iH - 8, PAD.top + 4)}>
            <div className="font-semibold">{data[hover].full || data[hover].label}</div>
            <div className="tabular-nums">{yFmt(data[hover].value)}</div>
            {tipExtra && <div className="text-white/70">{tipExtra(data[hover])}</div>}
          </Tip>
        )}
      </div>
    </Scroller>
  );
}

// ── Barres horizontales (classements à noms longs) ─────────────────────────────
export function HBarChart({ data, color = VIZ.aqua, valueFmt = fmtInt, rowH = 26, tipExtra }) {
  const [hover, setHover] = useState(null);
  if (!data?.length) return <EmptyState height={120} />;
  const maxVal = Math.max(...data.map(d => d.value ?? 0), 1);

  return (
    <div className="relative space-y-1" onMouseLeave={() => setHover(null)}>
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 group" style={{ height: rowH }}
          onMouseEnter={() => setHover(i)}>
          <span className="w-[38%] sm:w-[30%] flex-shrink-0 text-[11px] text-gray-700 truncate" title={d.label}>{d.label}</span>
          <div className="flex-1 min-w-0 h-full flex items-center">
            <div className="h-[14px] rounded-r-[4px] rounded-l-sm transition-[width] duration-500"
              style={{
                width: `${Math.max(((d.value ?? 0) / maxVal) * 100, 1)}%`,
                backgroundColor: d.color || color,
                opacity: hover == null || hover === i ? 1 : 0.45,
              }} />
          </div>
          <span className="w-14 flex-shrink-0 text-right text-[11px] font-semibold tabular-nums text-gray-700">
            {valueFmt(d.value)}
          </span>
        </div>
      ))}
      {hover != null && tipExtra && (
        <div className="text-[11px] text-gray-500 pt-1.5 border-t border-gray-100 mt-1">
          <span className="font-semibold text-gray-700">{data[hover].label}</span> · {tipExtra(data[hover])}
        </div>
      )}
    </div>
  );
}

// ── Carte de chaleur jour × heure ──────────────────────────────────────────────
// La grille la plus utile du lot : elle répond à « quand la salle tourne-t-elle
// vraiment ? » d'un seul coup d'œil, ce qu'aucune moyenne ne montre.
export function Heatmap({ cells, hours, valueFmt = fmtDec, emptyLabel = 'aucune séance' }) {
  const [hover, setHover] = useState(null);
  if (!hours?.length) return <EmptyState height={200} />;

  const maxVal = Math.max(...cells.map(c => c.value ?? 0), 1);
  const stepFor = (v) => {
    if (v == null) return null;
    const idx = Math.min(RAMP.length - 1, Math.max(1, Math.round((v / maxVal) * (RAMP.length - 1))));
    return RAMP[idx];
  };
  const byKey = new Map(cells.map(c => [`${c.jour}-${c.heure}`, c]));

  return (
    <Scroller minWidth={520}>
      <div className="relative" onMouseLeave={() => setHover(null)}>
        <div className="flex">
          <div className="w-10 flex-shrink-0" />
          <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0,1fr))` }}>
            {hours.map(h => (
              <div key={h} className="text-[9px] text-center text-gray-400 tabular-nums pb-1">{h}h</div>
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5, 6, 0].map(jour => (
          <div key={jour} className="flex items-center mb-[2px]">
            <div className="w-10 flex-shrink-0 text-[10px] text-gray-500 pr-1.5 text-right">{JOURS_COURTS[jour]}</div>
            <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0,1fr))` }}>
              {hours.map(h => {
                const c = byKey.get(`${jour}-${h}`);
                const bg = stepFor(c?.value);
                const on = hover && hover.jour === jour && hover.heure === h;
                return (
                  <div
                    key={h}
                    onMouseEnter={() => setHover({ jour, heure: h, cell: c })}
                    className="h-7 rounded-[3px] cursor-default transition-transform"
                    style={{
                      backgroundColor: bg || '#F4F4F2',
                      outline: on ? `2px solid ${VIZ.ink}` : 'none',
                      outlineOffset: '-1px',
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {hover && (
          <div className="mt-2 text-[11px] text-gray-600 border-t border-gray-100 pt-2">
            <span className="font-semibold text-gray-800">{JOURS_LONGS[hover.jour]} {hover.heure}h</span>
            {' — '}
            {hover.cell
              ? <>{valueFmt(hover.cell.value)} · {fmtInt(hover.cell.effectues)} séance{hover.cell.effectues > 1 ? 's' : ''}</>
              : <span className="italic text-gray-400">{emptyLabel}</span>}
          </div>
        )}
      </div>
    </Scroller>
  );
}

export function RampLegend({ maxVal, label, fmt = fmtDec }) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-gray-500">
      <span>{label} : 0</span>
      <div className="flex gap-[2px]">
        {RAMP.slice(1).map(c => <span key={c} className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: c }} />)}
      </div>
      <span className="tabular-nums">{fmt(maxVal)}</span>
    </div>
  );
}

// ── Nuage de points : fréquence × effectif moyen ───────────────────────────────
// Le graphique qui fait réfléchir : il sépare les cours « souvent programmés mais
// peu remplis » (à réduire) des « rarement programmés mais pleins » (à multiplier).
// Deux séries seulement (aqua/fitness) — la paire validée tient en toutes-paires.
export function ScatterChart({ points, xLabel, yLabel, height = 300 }) {
  const [hover, setHover] = useState(null);
  if (!points?.length) return <EmptyState height={height} />;

  const W = 720, H = height;
  const PAD = { top: 16, right: 20, bottom: 40, left: 54 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const maxX = Math.max(...points.map(p => p.x), 1);
  const maxY = Math.max(...points.map(p => p.y), 1);
  const xAt = (v) => PAD.left + (v / maxX) * iW;
  const yAt = (v) => PAD.top + iH - (v / maxY) * iH;

  // Médianes = les deux lignes qui découpent les quadrants.
  const med = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };
  const medX = med(points.map(p => p.x));
  const medY = med(points.map(p => p.y));

  return (
    <Scroller minWidth={560}>
      <div className="relative" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height }} role="img">
          {[0, 0.5, 1].map((f, i) => (
            <g key={i}>
              <line x1={PAD.left} y1={yAt(maxY * f)} x2={W - PAD.right} y2={yAt(maxY * f)} stroke={VIZ.grid} strokeWidth="1" />
              <text x={PAD.left - 8} y={yAt(maxY * f) + 3.5} textAnchor="end" fontSize="10" fill={VIZ.muted} className="tabular-nums">{fmtDec(maxY * f, 0)}</text>
            </g>
          ))}
          {[0, 0.5, 1].map((f, i) => (
            <text key={i} x={xAt(maxX * f)} y={H - 22} textAnchor="middle" fontSize="10" fill={VIZ.muted} className="tabular-nums">{fmtInt(maxX * f)}</text>
          ))}

          <line x1={xAt(medX)} y1={PAD.top} x2={xAt(medX)} y2={PAD.top + iH} stroke={VIZ.axis} strokeWidth="1" />
          <line x1={PAD.left} y1={yAt(medY)} x2={W - PAD.right} y2={yAt(medY)} stroke={VIZ.axis} strokeWidth="1" />
          <text x={W - PAD.right - 4} y={PAD.top + 12} textAnchor="end" fontSize="9.5" fill={VIZ.muted}>fréquents et remplis</text>
          <text x={PAD.left + 4} y={PAD.top + 12} fontSize="9.5" fill={VIZ.muted}>rares mais remplis</text>
          <text x={W - PAD.right - 4} y={PAD.top + iH - 5} textAnchor="end" fontSize="9.5" fill={VIZ.muted}>fréquents mais peu remplis</text>

          {points.map((p, i) => (
            <circle key={i} cx={xAt(p.x)} cy={yAt(p.y)} r={hover === i ? 8 : 5.5}
              fill={p.color} fillOpacity={hover == null || hover === i ? 0.85 : 0.3}
              stroke={VIZ.surface} strokeWidth="2"
              onMouseEnter={() => setHover(i)} style={{ cursor: 'default' }} />
          ))}

          <text x={PAD.left + iW / 2} y={H - 6} textAnchor="middle" fontSize="10" fill={VIZ.secondary}>{xLabel}</text>
          <text x={13} y={PAD.top + iH / 2} textAnchor="middle" fontSize="10" fill={VIZ.secondary}
            transform={`rotate(-90, 13, ${PAD.top + iH / 2})`}>{yLabel}</text>
        </svg>
        {hover != null && (
          <Tip x={(xAt(points[hover].x) / W) * 100} y={yAt(points[hover].y) - 6}>
            <div className="font-semibold">{points[hover].label}</div>
            <div className="tabular-nums">{fmtInt(points[hover].x)} séances · {fmtDec(points[hover].y)} pers./séance</div>
          </Tip>
        )}
      </div>
    </Scroller>
  );
}

// ── Barre part-à-tout (une seule ligne, deux segments) ─────────────────────────
// Deux tranches → surtout pas un camembert : une barre empilée se lit d'un coup
// et compare les proportions sans effort d'angle.
export function SplitBar({ segments, fmt = fmtInt }) {
  const total = segments.reduce((s, x) => s + (x.value || 0), 0) || 1;
  return (
    <div>
      <div className="flex gap-[2px] h-9 rounded-lg overflow-hidden">
        {segments.map((s, i) => {
          const pct = (s.value / total) * 100;
          return (
            <div key={i} className="flex items-center justify-center transition-[width] duration-500"
              style={{ width: `${pct}%`, backgroundColor: s.color, minWidth: pct > 0 ? 2 : 0 }}
              title={`${s.label} — ${fmt(s.value)}`}>
              {pct > 12 && <span className="text-[11px] font-bold text-white">{pct.toFixed(0)} %</span>}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {segments.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-[11px] text-gray-600">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
            {s.label} <span className="font-semibold text-gray-800 tabular-nums">{fmt(s.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Tuile d'indicateur ─────────────────────────────────────────────────────────
export function StatTile({ label, value, delta, invert = false, spark, sparkColor = VIZ.aqua, hint }) {
  const hasDelta = delta != null && Number.isFinite(delta);
  const up = hasDelta && delta > 0;
  const flat = hasDelta && Math.abs(delta) < 0.05;
  const good = invert ? !up : up;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between min-h-[112px]
      shadow-sm hover:shadow-md hover:border-gray-300 transition-[box-shadow,border-color] duration-150">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 leading-tight">{label}</div>
      <div className="flex items-end justify-between gap-2 mt-2">
        <div>
          {/* Chiffres proportionnels (pas tabular) : à cette taille, tabular fait respirer les chiffres de travers. */}
          <div className="text-[26px] font-extrabold leading-none text-brand-ink">{value}</div>
          {hasDelta && !flat && (
            <div className={`text-[11px] font-bold mt-1.5 ${good ? 'text-[#0CA30C]' : 'text-[#D03B3B]'}`}>
              {up ? '▲' : '▼'} {Math.abs(delta).toFixed(1).replace('.', ',')} %
              <span className="font-normal text-gray-400"> vs préc.</span>
            </div>
          )}
          {hasDelta && flat && <div className="text-[11px] text-gray-400 mt-1.5">stable vs préc.</div>}
          {!hasDelta && hint && <div className="text-[11px] text-gray-400 mt-1.5">{hint}</div>}
        </div>
        {spark?.length > 1 && <Sparkline data={spark} color={sparkColor} />}
      </div>
    </div>
  );
}

export function Sparkline({ data, color = VIZ.aqua, w = 62, h = 26 }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = w / (data.length - 1 || 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / span) * h).toFixed(1)}`);
  return (
    <svg width={w} height={h} className="flex-shrink-0 overflow-visible" aria-hidden="true">
      <path d={`M${pts.join(' L')}`} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" opacity="0.75" />
      <circle cx={(data.length - 1) * step} cy={h - ((data[data.length - 1] - min) / span) * h} r="2.5" fill={color} />
    </svg>
  );
}
