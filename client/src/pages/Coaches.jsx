import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Calendar, CalendarRange, Infinity as InfinityIcon, FileDown, SlidersHorizontal } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { api } from '../lib/api';
import { useConfig } from '../context/ConfigContext';
import { DISCIPLINE_CONFIG, colorForUser, STATUT_CONFIG, CATEGORIE_CONFIG } from '../lib/utils';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MOIS_LABELS = {
  '01':'Janvier','02':'Février','03':'Mars','04':'Avril','05':'Mai','06':'Juin',
  '07':'Juillet','08':'Août','09':'Septembre','10':'Octobre','11':'Novembre','12':'Décembre',
};
const MOIS_COURTS = {
  '01':'Jan','02':'Fév','03':'Mar','04':'Avr','05':'Mai','06':'Jun',
  '07':'Jul','08':'Aoû','09':'Sep','10':'Oct','11':'Nov','12':'Déc',
};

function getLast13Months() {
  const now    = new Date();
  const months = [];
  for (let i = 12; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }
  const debut = months[0] + '-01';
  const finD  = new Date(now.getFullYear(), now.getMonth()+1, 0);
  const fin   = `${finD.getFullYear()}-${String(finD.getMonth()+1).padStart(2,'0')}-${String(finD.getDate()).padStart(2,'0')}`;
  return { months, debut, fin };
}

function fmtDateFr(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function periodeLabel(mode, anneeScolaire, plageDebut, plageFin) {
  if (mode === 'tout') return 'De tout temps';
  if (mode === 'scolaire') return `Saison ${anneeScolaire}–${anneeScolaire + 1}`;
  if (!plageDebut || !plageFin) return 'Plage personnalisée';
  return `${fmtDateFr(plageDebut)} → ${fmtDateFr(plageFin)}`;
}

function getAcademicYear() {
  const now  = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1; // septembre = mois 8
  const debut = `${year}-09-01`;
  const fin   = `${year + 1}-08-31`;
  return { year, debut, fin };
}

function fmtH(val) {
  if (!val && val !== 0) return '';
  const r = Math.round(val * 100) / 100;
  return r % 1 === 0 ? String(r) : r.toFixed(2).replace(/\.?0+$/, '');
}

function fmtDuree(min) {
  if (!min) return '';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

function fmtDateLongue(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function fmtEuros(v) {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// ── Export PDF du récapitulatif d'heures d'un coach ─────────────────────────────
// Sert de pièce de comparaison face à la facture envoyée par le coach : heures
// effectuées sur la période, et — si renseignés sur sa fiche — SIRET/adresse et
// montant dû (tarif horaire × heures). Toutes ces infos sont facultatives.

function exportSeancesPdf({ coach, seances, periodeLabel, salleNom, salleAdresse }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const marginX = 15;
  const pageH = doc.internal.pageSize.getHeight();
  let y = 20;

  function ensureSpace(next) {
    if (y + next > pageH - 15) { doc.addPage(); y = 20; }
  }

  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(salleNom ? `FitnessMov — ${salleNom}` : 'FitnessMov', marginX, y);
  doc.setFont(undefined, 'normal');
  y += 6;
  if (salleAdresse) {
    doc.setFontSize(10);
    doc.text(salleAdresse, marginX, y);
    y += 8;
  } else {
    y += 4;
  }

  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text(`Récapitulatif d'heures — ${coach.prenom} ${coach.nom}`, marginX, y);
  doc.setFont(undefined, 'normal');
  y += 6;
  doc.setFontSize(10);
  doc.text(`Période : ${periodeLabel}`, marginX, y);
  y += 5;
  if (coach.adresse) { doc.text(`Adresse : ${coach.adresse}`, marginX, y); y += 5; }
  if (coach.siret)   { doc.text(`SIRET : ${coach.siret}`, marginX, y); y += 5; }
  y += 4;

  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('Date', marginX, y);
  doc.text('Cours', marginX + 35, y);
  doc.text('Horaire', marginX + 105, y);
  doc.text('Durée', marginX + 135, y);
  doc.setFont(undefined, 'normal');
  y += 2;
  doc.setLineWidth(0.2);
  doc.line(marginX, y, 210 - marginX, y);
  y += 4;

  for (const s of seances) {
    ensureSpace(5);
    doc.text(fmtDateFr(s.date), marginX, y);
    doc.text(s.cours_nom, marginX + 35, y, { maxWidth: 65 });
    doc.text(s.horaire, marginX + 105, y);
    doc.text(fmtDuree(s.duree_minutes), marginX + 135, y);
    y += 5;
  }

  const totalHeures = seances.reduce((sum, s) => sum + s.duree_minutes, 0) / 60;

  y += 3;
  ensureSpace(10);
  doc.setLineWidth(0.2);
  doc.line(marginX, y, 210 - marginX, y);
  y += 6;

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text(`Total : ${seances.length} cours · ${fmtH(totalHeures)} h`, marginX, y);
  doc.setFont(undefined, 'normal');
  y += 6;

  if (coach.tarif_horaire) {
    ensureSpace(8);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    const montant = totalHeures * coach.tarif_horaire;
    doc.text(`Montant dû (${fmtEuros(coach.tarif_horaire)}/h) : ${fmtEuros(montant)}`, marginX, y);
    doc.setFont(undefined, 'normal');
    y += 6;
  }

  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
  doc.save(`heures-${slug(coach.prenom)}-${slug(coach.nom)}-${slug(periodeLabel)}.pdf`);
}

// ── Tableau de bord : comparatif vs période précédente ──────────────────────────
// La période de comparaison est celle, de même durée, qui précède immédiatement
// la période affichée — ça couvre aussi bien "mois précédent" (plage d'un mois)
// que "année précédente" (saison scolaire) sans mode dédié à choisir.

function previousPeriodRange(debut, fin) {
  if (!debut || !fin) return null;
  const [y0, m0, d0] = debut.split('-').map(Number);
  const [y1, m1, d1] = fin.split('-').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  const lastDayOfMonth = (y, m) => new Date(y, m, 0).getDate(); // m 1-indexé

  // Plage alignée sur des mois civils complets (ex. un mois entier, ou une saison
  // scolaire) : on décale d'autant de mois civils plutôt que d'un nombre de jours,
  // sinon "septembre" se comparerait à "2 août → 31 août" au lieu d'août entier.
  if (d0 === 1 && d1 === lastDayOfMonth(y1, m1)) {
    const nbMois = (y1 - y0) * 12 + (m1 - m0) + 1;
    let endY = y0, endM = m0 - 1;
    if (endM === 0) { endM = 12; endY -= 1; }
    let startY = endY, startM = endM - nbMois + 1;
    while (startM <= 0) { startM += 12; startY -= 1; }
    return {
      debut: `${startY}-${pad(startM)}-01`,
      fin:   `${endY}-${pad(endM)}-${pad(lastDayOfMonth(endY, endM))}`,
    };
  }

  // Plage arbitraire (ex. dates piochées à la main) : décalage par durée en jours.
  const start = new Date(y0, m0 - 1, d0);
  const end   = new Date(y1, m1 - 1, d1);
  const dureeJours = Math.round((end - start) / 86400000) + 1;
  const prevFin = new Date(start); prevFin.setDate(prevFin.getDate() - 1);
  const prevDebut = new Date(prevFin); prevDebut.setDate(prevDebut.getDate() - (dureeJours - 1));
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { debut: iso(prevDebut), fin: iso(prevFin) };
}

function aggregateDashboard(dash) {
  if (!dash) return null;
  const mensuel = dash.mensuel || [];
  const heures = mensuel.reduce((s, m) => s + (m.total_minutes || 0), 0) / 60;
  const effectifSum  = mensuel.reduce((s, m) => s + (m.effectif  || 0), 0);
  const effectuesSum = mensuel.reduce((s, m) => s + (m.effectues || 0), 0);
  return {
    programmes:     dash.kpi?.total    || 0,
    effectues:      dash.kpi?.effectues || 0,
    annules:        dash.kpi?.annules   || 0,
    tauxAnnulation: dash.kpi?.total ? (dash.kpi.annules / dash.kpi.total * 100) : null,
    heures,
    effectifMoyen:  effectuesSum ? effectifSum / effectuesSum : null,
  };
}

function DeltaBadge({ current, previous, invert = false }) {
  if (current == null || previous == null || !previous) return null;
  const delta = (current - previous) / previous * 100;
  if (!Number.isFinite(delta)) return null;
  if (Math.abs(delta) < 0.05) {
    return <span className="block text-[11px] font-medium text-gray-400 mt-1">= vs période préc.</span>;
  }
  const up   = delta > 0;
  const good = invert ? !up : up;
  return (
    <span className={`block text-[11px] font-bold mt-1 ${good ? 'text-green-600' : 'text-red-500'}`}>
      {up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)} % <span className="font-normal text-gray-400">vs préc.</span>
    </span>
  );
}

const KPI_DEFS = [
  { key: 'programmes',     label: 'Cours programmés',  border: '#94a3b8', bg: '#f8fafc', color: '#475569',
    get: a => a?.programmes, fmt: v => v ?? '—' },
  { key: 'effectues',      label: 'Cours effectués',    border: '#86efac', bg: '#f0fdf4', color: '#16a34a',
    get: a => a?.effectues, fmt: v => v ?? '—' },
  { key: 'heures',         label: 'Heures réalisées',   border: '#5bcae8', bg: '#eef9fd', color: '#1a7a9b',
    get: a => a?.heures, fmt: v => v != null ? `${fmtH(v)} h` : '—' },
  { key: 'effectifMoyen',  label: 'Effectif moyen',     border: '#fcd34d', bg: '#fffbeb', color: '#b45309',
    get: a => a?.effectifMoyen, fmt: v => v != null ? fmtH(v) : '—' },
  { key: 'tauxAnnulation', label: "Taux d'annulation",  border: '#fca5a5', bg: '#fef2f2', color: '#dc2626',
    get: a => a?.tauxAnnulation, fmt: v => v != null ? v.toFixed(1).replace('.', ',') + ' %' : '—', invert: true },
];

const DEFAULT_WIDGETS = {
  kpi_programmes: false,
  kpi_effectues: true,
  kpi_heures: true,
  kpi_effectifMoyen: true,
  kpi_tauxAnnulation: true,
  comparatif: true,
  tableauMensuel: true,
  graphique: true,
  topCours: true,
  topCoachs: true,
};

const WIDGETS_STORAGE_KEY = 'fitnessmov.dashboardWidgets';

function loadWidgetPrefs() {
  try {
    const raw = localStorage.getItem(WIDGETS_STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGETS;
    return { ...DEFAULT_WIDGETS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_WIDGETS;
  }
}

function DashboardSettingsPopover({ widgets, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    function handleEscape(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const Item = ({ k, label }) => (
    <label className="flex items-center gap-2 text-sm text-gray-700 py-1 cursor-pointer">
      <input type="checkbox" checked={!!widgets[k]} onChange={() => onToggle(k)} className="rounded" />
      {label}
    </label>
  );

  return (
    <span className="relative inline-block" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
        <SlidersHorizontal size={15} /> Personnaliser
      </button>
      {open && (
        <div onClick={e => e.stopPropagation()}
          className="absolute z-30 top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Indicateurs</div>
          {KPI_DEFS.map(d => <Item key={d.key} k={`kpi_${d.key}`} label={d.label} />)}
          <Item k="comparatif" label="Comparatif vs période précédente" />
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mt-3 mb-1">Sections</div>
          <Item k="tableauMensuel" label="Tableau fréquentation mensuelle" />
          <Item k="graphique" label="Graphique heures par mois" />
          <Item k="topCours" label="Top cours" />
          <Item k="topCoachs" label="Top coachs" />
        </div>
      )}
    </span>
  );
}

// ── Mini graphique SVG ─────────────────────────────────────────────────────────

function LineChart({ data, xKey, yKey, color = '#5bcae8', label = '' }) {
  if (!data || data.length === 0) return null;
  const vals   = data.map(d => d[yKey] || 0);
  const maxVal = Math.max(...vals, 1);
  const W = 500, H = 160, PAD = { top: 16, right: 16, bottom: 40, left: 48 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top  - PAD.bottom;
  const step = iW / (data.length - 1 || 1);

  const pts = data.map((d, i) => ({
    x: PAD.left + i * step,
    y: PAD.top + iH - (d[yKey] || 0) / maxVal * iH,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${path} L${pts[pts.length-1].x.toFixed(1)},${(PAD.top+iH).toFixed(1)} L${PAD.left},${(PAD.top+iH).toFixed(1)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
      {/* Grille */}
      {yTicks.map((t, i) => {
        const y = PAD.top + iH - (t / maxVal) * iH;
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W-PAD.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{t}</text>
          </g>
        );
      })}
      {/* Aire */}
      <path d={area} fill={color} fillOpacity="0.12" />
      {/* Ligne */}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {/* Points */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
      {/* Labels X */}
      {data.map((d, i) => (
        <text key={i} x={pts[i].x} y={H - 4} textAnchor="middle" fontSize="9" fill="#6b7280"
          transform={`rotate(-35, ${pts[i].x}, ${H-4})`}>
          {MOIS_COURTS[d[xKey]?.slice(5,7)] || d[xKey]}
        </text>
      ))}
      {/* Label Y */}
      {label && (
        <text x={12} y={PAD.top + iH/2} textAnchor="middle" fontSize="10" fill="#9ca3af"
          transform={`rotate(-90, 12, ${PAD.top + iH/2})`}>{label}</text>
      )}
    </svg>
  );
}

// ── Modale coach ───────────────────────────────────────────────────────────────

function CoachModal({ coach, onSave, onToggle, onDelete, onClose }) {
  const isNew = !coach?.id;
  const [form, setForm] = useState({
    nom:           coach?.nom           || '',
    prenom:        coach?.prenom        || '',
    email:         coach?.email         || '',
    telephone:     coach?.telephone     || '',
    aqua:          coach?.aqua          || false,
    fitness:       coach?.fitness       || false,
    boxe:          coach?.boxe          || false,
    crosstraining: coach?.crosstraining || false,
    poledance:     coach?.poledance     || false,
    siret:         coach?.siret         || '',
    adresse:       coach?.adresse       || '',
    tarif_horaire: coach?.tarif_horaire ?? '',
  });
  const [error, setSaving2] = useState(null);
  const [saving, setSaving]  = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaving2(null);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setSaving2(err.message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">
            {isNew ? 'Nouveau coach' : `${coach.prenom} ${coach.nom}`}
          </h2>
          {!isNew && (
            <div className="flex items-center gap-1">
              {!coach.actif && (
                <button
                  onClick={() => { onDelete(coach); onClose(); }}
                  className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50"
                >
                  Supprimer définitivement
                </button>
              )}
              <button
                onClick={() => { onToggle(coach); onClose(); }}
                className={`text-xs px-2 py-1 rounded ${coach.actif ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
              >
                {coach.actif ? 'Désactiver' : 'Réactiver'}
              </button>
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
              <input value={form.prenom} onChange={e => set('prenom', e.target.value)} required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
              <input value={form.nom} onChange={e => set('nom', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
            <input value={form.telephone} onChange={e => set('telephone', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Discipline(s)</label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {Object.entries(DISCIPLINE_CONFIG).map(([key, cfg]) => (
                <label key={key} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} className={`rounded ${cfg.accent}`} />
                  {cfg.label}
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Facturation <span className="normal-case font-normal text-gray-400">(facultatif — utilisé pour l'export PDF)</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
                <input value={form.adresse} onChange={e => set('adresse', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">N° SIRET</label>
                  <input value={form.siret} onChange={e => set('siret', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tarif horaire (€)</label>
                  <input type="number" min="0" step="0.01" value={form.tarif_horaire}
                    onChange={e => set('tarif_horaire', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 rounded py-2 text-sm hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={saving}
              className="flex-1 text-white rounded py-2 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#2fa8cc' }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modale statistiques coach ───────────────────────────────────────────────────

function CoachStatsModal({ coach, onEdit, onClose }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getCoachStats(coach.id).then(s => { if (!cancelled) setStats(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, [coach.id]);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const ROWS = [
    { key: 'nbCours',       label: 'Cours donnés',      fmt: (v) => v ?? '—' },
    { key: 'heures',        label: 'Heures de cours',   fmt: (v) => v ? fmtH(v) : '—' },
    { key: 'effectifMoyen', label: 'Effectif moyen',    fmt: (v) => v ?? '—' },
  ];
  const COLONNES = [
    { key: 'derniers30j',     label: '30 derniers jours' },
    { key: 'depuisSeptembre', label: 'Depuis septembre' },
    { key: 'toutTemps',       label: 'De tout temps' },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b flex items-center gap-3">
          <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{ backgroundColor: colorForUser(coach.id) }}>
            {coach.prenom?.[0]}{coach.nom?.[0]}
          </div>
          <h2 className="text-lg font-bold text-gray-800 truncate">{coach.prenom} {coach.nom}</h2>
        </div>
        <div className="px-6 py-4">
          {stats === null ? (
            <div className="text-center py-8 text-gray-400 text-sm">Chargement…</div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-left px-2 py-1.5 text-xs font-bold text-gray-500 uppercase">​</th>
                  {COLONNES.map(c => (
                    <th key={c.key} className="px-2 py-1.5 text-xs font-bold text-gray-500 uppercase text-center">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => (
                  <tr key={row.key} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : '#ffffff' }}>
                    <td className="px-2 py-2 font-medium text-gray-700">{row.label}</td>
                    {COLONNES.map(c => (
                      <td key={c.key} className="px-2 py-2 text-center tabular-nums font-semibold" style={{ color: '#1a7a9b' }}>
                        {row.fmt(stats[c.key]?.[row.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 pb-5 flex gap-2">
          <button onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-600 rounded py-2 text-sm hover:bg-gray-50">Fermer</button>
          <button onClick={onEdit}
            className="flex-1 text-white rounded py-2 text-sm font-medium hover:opacity-90"
            style={{ backgroundColor: '#2fa8cc' }}>
            Modifier les informations
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modale détail des séances (clic sur un nombre d'heures) ────────────────────

function CoachSeancesModal({ coach, periodeLabel, debut, fin, inclureEffectue, inclurePaye, onClose }) {
  const { salleNom, salleAdresse } = useConfig();
  const [seances, setSeances] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getCoachSeancesDetail(coach.id, { debut, fin, effectue: inclureEffectue ? 1 : 0, paye: inclurePaye ? 1 : 0 })
      .then(s => { if (!cancelled) setSeances(s); })
      .catch(() => { if (!cancelled) setSeances([]); });
    return () => { cancelled = true; };
  }, [coach.id, debut, fin, inclureEffectue, inclurePaye]);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const groupes = [];
  if (seances) {
    for (const s of seances) {
      const dernier = groupes[groupes.length - 1];
      if (dernier && dernier.date === s.date) dernier.items.push(s);
      else groupes.push({ date: s.date, items: [s] });
    }
  }
  const totalHeures = seances ? seances.reduce((sum, s) => sum + s.duree_minutes, 0) / 60 : 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b flex items-center gap-3 flex-shrink-0">
          <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{ backgroundColor: colorForUser(coach.id) }}>
            {coach.prenom?.[0]}{coach.nom?.[0]}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-800 truncate">{coach.prenom} {coach.nom}</h2>
            <div className="text-xs text-gray-400">
              {periodeLabel}{seances && seances.length > 0 && ` · ${seances.length} cours · ${fmtH(totalHeures)}h`}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 overflow-y-auto">
          {seances === null ? (
            <div className="text-center py-8 text-gray-400 text-sm">Chargement…</div>
          ) : seances.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Aucun cours sur cette période.</div>
          ) : (
            <div className="space-y-4">
              {groupes.map(g => (
                <div key={g.date}>
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">
                    {fmtDateLongue(g.date)}
                  </div>
                  <div className="space-y-1.5">
                    {g.items.map(s => {
                      const cat = CATEGORIE_CONFIG[s.cours_categorie] || CATEGORIE_CONFIG.fitness;
                      const statut = STATUT_CONFIG[s.statut] || STATUT_CONFIG.effectue;
                      return (
                        <div key={s.id} className="flex items-center gap-2.5 rounded-lg border border-gray-100 px-3 py-2" style={{ backgroundColor: cat.cell }}>
                          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cat.dot}`} />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-800 text-sm truncate">{s.cours_nom}</div>
                            <div className="text-xs text-gray-500">{s.horaire} · {fmtDuree(s.duree_minutes)}</div>
                          </div>
                          {s.nb_presents != null && (
                            <div className="text-xs text-gray-500 flex-shrink-0">{s.nb_presents} pers.</div>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statut.bg} ${statut.text}`}>
                            {statut.shortLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 pb-5 pt-2 flex-shrink-0 flex gap-2">
          <button onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-600 rounded py-2 text-sm hover:bg-gray-50">Fermer</button>
          {seances && seances.length > 0 && (
            <button
              onClick={() => exportSeancesPdf({ coach, seances, periodeLabel, salleNom, salleAdresse })}
              className="flex-1 flex items-center justify-center gap-1.5 text-white rounded py-2 text-sm font-medium hover:opacity-90"
              style={{ backgroundColor: '#2fa8cc' }}>
              <FileDown className="h-4 w-4" /> Exporter en PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function Coaches() {
  const [recap, setRecap]       = useState(null);
  const [dashboard, setDash]    = useState(null);
  const [dashboardPrev, setDashPrev] = useState(null); // période précédente, pour le comparatif
  const [widgets, setWidgets]   = useState(loadWidgetPrefs);
  const [modal, setModal]       = useState(null);
  const [statsModal, setStatsModal] = useState(null);
  const [seancesModal, setSeancesModal] = useState(null); // { coach, mois } — mois=null pour le total
  const [showInactifs, setShowInactifs] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const reqIdRef = useRef(0);

  // Récapitulatif des heures : quels statuts comptent comme "réalisé"
  const [inclureEffectue, setInclureEffectue] = useState(true);
  const [inclurePaye, setInclurePaye]         = useState(true);

  // Tableau de bord : période
  const [periodeMode, setPeriodeMode] = useState('scolaire'); // 'tout' | 'scolaire' | 'plage'
  const [anneeScolaire, setAnneeScolaire] = useState(() => getAcademicYear().year);
  const [plageDebut, setPlageDebut] = useState(() => getAcademicYear().debut);
  const [plageFin, setPlageFin]     = useState(() => getAcademicYear().fin);
  const { months, debut, fin } = getLast13Months();
  const currentMois = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
  })();

  function dashboardParams() {
    return periodeMode === 'tout' ? { periode: 'tout' }
      : periodeMode === 'scolaire' ? { debut: `${anneeScolaire}-09-01`, fin: `${anneeScolaire + 1}-08-31` }
      : { debut: plageDebut, fin: plageFin };
  }

  const load = useCallback(async () => {
    const myId = ++reqIdRef.current;
    setRefreshing(true);
    try {
      const params = dashboardParams();
      const prevRange = params.periode === 'tout' ? null : previousPeriodRange(params.debut, params.fin);
      const [r, d, dPrev] = await Promise.all([
        api.getCoachesRecap({ debut, fin, effectue: inclureEffectue ? 1 : 0, paye: inclurePaye ? 1 : 0 }),
        api.getDashboard(params),
        prevRange ? api.getDashboard(prevRange) : Promise.resolve(null),
      ]);
      if (myId !== reqIdRef.current) return; // une requête plus récente est en cours : on ignore
      setRecap(r);
      setDash(d);
      setDashPrev(dPrev);
    } catch(e) { console.error(e); }
    finally {
      if (myId === reqIdRef.current) setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inclureEffectue, inclurePaye, periodeMode, anneeScolaire, plageDebut, plageFin]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    try { localStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(widgets)); } catch { /* stockage indisponible, tant pis */ }
  }, [widgets]);
  function toggleWidget(key) { setWidgets(w => ({ ...w, [key]: !w[key] })); }

  async function handleSave(form) {
    if (modal?.id) await api.updateCoach(modal.id, form);
    else           await api.createCoach(form);
    load();
  }
  async function handleToggle(coach) {
    await api.toggleCoach(coach.id, !coach.actif);
    load();
  }
  async function handleDelete(coach) {
    if (!confirm(`Supprimer définitivement ${coach.prenom} ${coach.nom} ?\n\nIl disparaît de la liste mais reste visible sur les séances passées.`)) return;
    await api.deleteCoach(coach.id, true);
    load();
  }

  const coaches   = recap?.coaches || [];
  const displayed = showInactifs ? coaches : coaches.filter(c => c.actif);

  // Ligne total
  const totauxMois = {};
  let grandTotal = 0;
  for (const c of displayed) {
    for (const m of months) {
      totauxMois[m] = (totauxMois[m] || 0) + (c.mois[m] || 0);
    }
    grandTotal += c.total || 0;
  }

  const TH = 'z-20 bg-gray-100 px-2 py-2 text-xs font-bold text-gray-600 uppercase border border-gray-200 text-center whitespace-nowrap';

  const mensuel = dashboard?.mensuel || [];
  const topCours = dashboard?.topCours || [];
  const topCoachs = dashboard?.topCoachs || [];
  const ANNEES_DISPONIBLES = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 5 + i);

  return (
    <div className="space-y-8">

      {/* ════════════════════════════════════════════════════════════
          SECTION 1 — Récapitulatif heures par coach
      ════════════════════════════════════════════════════════════ */}

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Récapitulatif des heures effectuées</h1>
            <p className="text-xs text-gray-400 mt-0.5">13 derniers mois</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer">
              <input type="checkbox" checked={inclureEffectue} onChange={e => setInclureEffectue(e.target.checked)} className="rounded" />
              Effectuées
            </label>
            <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer">
              <input type="checkbox" checked={inclurePaye} onChange={e => setInclurePaye(e.target.checked)} className="rounded" />
              Payées
            </label>
            <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer">
              <input type="checkbox" checked={showInactifs} onChange={e => setShowInactifs(e.target.checked)} className="rounded" />
              Inactifs
            </label>
            <button onClick={() => setModal({})}
              className="flex items-center gap-1.5 text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90"
              style={{ backgroundColor: '#2fa8cc' }}>
              <Plus className="h-4 w-4" /> Nouveau coach
            </button>
          </div>
        </div>

        {recap === null ? (
          <div className="text-center py-10 text-gray-400 text-sm">Chargement…</div>
        ) : (
          <div className={`overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 transition-opacity duration-200 ${refreshing ? 'opacity-60' : 'opacity-100'}`}>
          <table className="w-full border-collapse text-sm min-w-[860px]">
            <thead>
              <tr>
                <th className={`${TH} text-left sticky left-0 z-30 bg-gray-100`} style={{ minWidth: 92 }}>Coach</th>
                {months.map(m => (
                  <th key={m} className={`${TH}`}
                    style={m === currentMois ? { color: '#2fa8cc', backgroundColor: '#eef9fd' } : {}}>
                    {MOIS_COURTS[m.slice(5,7)]}
                  </th>
                ))}
                <th className={`${TH}`} style={{ color: '#1a7a9b' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((coach, i) => {
                const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
                return (
                  <tr key={coach.id} style={{ backgroundColor: bg }} className={coach.actif ? '' : 'opacity-40'}>
                    <td className="sticky left-0 z-10 border-b border-gray-100 px-2 py-1.5 font-semibold" style={{ backgroundColor: bg, maxWidth: 92 }}>
                      <button onClick={() => setStatsModal(coach)} title={`${coach.prenom} ${coach.nom}`}
                        className="hover:underline text-left truncate block w-full" style={{ color: '#1a7a9b' }}>
                        {coach.prenom} {coach.nom}
                      </button>
                    </td>
                    {months.map(m => {
                      const v = coach.mois[m];
                      return (
                        <td key={m} className="border-b border-gray-100 p-0 text-center text-xs tabular-nums"
                          style={{ backgroundColor: m === currentMois ? '#eef9fd' : undefined }}>
                          {v ? (
                            <button onClick={() => setSeancesModal({ coach, mois: m })}
                              className="w-full h-full px-2 py-1.5 tabular-nums hover:underline hover:bg-sky-50/60"
                              style={{ color: '#111' }}>
                              {fmtH(v)}
                            </button>
                          ) : (
                            <span className="block px-2 py-1.5" style={{ color: '#d1d5db' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-gray-100 p-0 text-center font-bold text-xs tabular-nums">
                      {coach.total ? (
                        <button onClick={() => setSeancesModal({ coach, mois: null })}
                          className="w-full h-full px-3 py-1.5 tabular-nums hover:underline hover:bg-sky-50/60" style={{ color: '#1a7a9b' }}>
                          {fmtH(coach.total)}
                        </button>
                      ) : (
                        <span className="block px-3 py-1.5" style={{ color: '#1a7a9b' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Ligne total */}
              <tr style={{ backgroundColor: '#f0f9ff' }}>
                <td className="sticky left-0 z-10 px-3 py-2 font-extrabold text-xs uppercase tracking-wide border-t-2 border-gray-300" style={{ backgroundColor: '#f0f9ff', color: '#1a7a9b' }}>
                  Total
                </td>
                {months.map(m => (
                  <td key={m} className="px-2 py-2 text-center text-xs font-bold tabular-nums border-t-2 border-gray-300"
                    style={{ color: '#1a7a9b', backgroundColor: m === currentMois ? '#d6f3fb' : undefined }}>
                    {totauxMois[m] ? fmtH(Math.round(totauxMois[m] * 100)/100) : '—'}
                  </td>
                ))}
                <td className="px-3 py-2 text-center font-extrabold text-xs tabular-nums border-t-2 border-gray-300" style={{ color: '#1a7a9b' }}>
                  {fmtH(Math.round(grandTotal * 100)/100)}
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 2 — Dashboard KPI (saison en cours)
      ════════════════════════════════════════════════════════════ */}

      {dashboard && (
        <div className={`transition-opacity duration-200 ${refreshing ? 'opacity-60' : 'opacity-100'}`}>
          {/* Titre dashboard */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-bold text-gray-800">
              Tableau de bord · {periodeLabel(periodeMode, anneeScolaire, plageDebut, plageFin)}
            </h2>
            <DashboardSettingsPopover widgets={widgets} onToggle={toggleWidget} />
          </div>

          {/* Filtre période */}
          <div className="flex flex-wrap items-center gap-3 mb-1 text-sm">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 gap-1">
              {[
                { mode: 'scolaire', label: 'Année scolaire', Icon: Calendar },
                { mode: 'plage', label: 'Plage personnalisée', Icon: CalendarRange },
                { mode: 'tout', label: 'De tout temps', Icon: InfinityIcon },
              ].map(({ mode, label, Icon }) => (
                <button
                  key={mode}
                  onClick={() => setPeriodeMode(mode)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    periodeMode === mode
                      ? 'bg-white text-sky-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
            {periodeMode === 'scolaire' && (
              <select value={anneeScolaire} onChange={e => setAnneeScolaire(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300">
                {ANNEES_DISPONIBLES.map(y => <option key={y} value={y}>{y}–{y + 1}</option>)}
              </select>
            )}
            {periodeMode === 'plage' && (
              <div className="inline-flex items-center gap-2">
                <input type="date" value={plageDebut} onChange={e => setPlageDebut(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300" />
                <span className="text-gray-400">→</span>
                <input type="date" value={plageFin} onChange={e => setPlageFin(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300" />
              </div>
            )}
          </div>

          {widgets.comparatif && periodeMode !== 'tout' && dashboardPrev && (
            <p className="text-xs text-gray-400 mb-4">
              Comparé à la période précédente : {fmtDateFr(dashboardPrev.debut)} → {fmtDateFr(dashboardPrev.fin)}
            </p>
          )}
          {(!widgets.comparatif || periodeMode === 'tout' || !dashboardPrev) && <div className="mb-4" />}

          {/* KPI cards */}
          {(() => {
            const visibleKpis = KPI_DEFS.filter(d => widgets[`kpi_${d.key}`]);
            if (visibleKpis.length === 0) return null;
            const aggCur  = aggregateDashboard(dashboard);
            const aggPrev = widgets.comparatif ? aggregateDashboard(dashboardPrev) : null;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                {visibleKpis.map(d => {
                  const val     = d.get(aggCur);
                  const prevVal = aggPrev ? d.get(aggPrev) : null;
                  return (
                    <div key={d.key} className="border-2 rounded-lg p-5 text-center" style={{ borderColor: d.border, backgroundColor: d.bg }}>
                      <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">{d.label}</div>
                      <div className="text-4xl font-extrabold" style={{ color: d.color }}>{d.fmt(val)}</div>
                      {widgets.comparatif && aggPrev && <DeltaBadge current={val} previous={prevVal} invert={d.invert} />}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Tableau mensuel + graphique */}
          {(widgets.tableauMensuel || widgets.graphique) && (
            <div className={`grid grid-cols-1 gap-6 mb-6 ${widgets.tableauMensuel && widgets.graphique ? 'lg:grid-cols-2' : ''}`}>
              {/* Tableau fréquentation mensuelle */}
              {widgets.tableauMensuel && (
                <div className="overflow-x-auto">
                  <h3 className="text-sm font-bold text-gray-700 mb-2">Fréquentation mensuelle</h3>
                  <table className="w-full border-collapse text-xs min-w-[520px]">
                    <thead>
                      <tr style={{ backgroundColor: '#2fa8cc', color: '#fff' }}>
                        {['Mois','Prog.','Effect.','Annulés','Annul. %','Effectif','Moy.','Heures'].map((h, i) => (
                          <th key={h} className={`px-2 py-1.5 font-bold ${i === 0 ? 'text-left' : 'text-center'}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mensuel.map((row, i) => {
                        const taux = row.programmes ? (row.annules / row.programmes * 100).toFixed(2) : '0';
                        const moy  = row.effectues  ? Math.round(row.effectif / row.effectues) : 0;
                        const heurs = Math.round((row.total_minutes || 0) / 60 * 100) / 100;
                        const bg   = i % 2 === 0 ? '#f9fafb' : '#ffffff';
                        return (
                          <tr key={row.mois} style={{ backgroundColor: bg }}>
                            <td className="px-2 py-1 border-b border-gray-100 capitalize font-medium">
                              {MOIS_LABELS[row.mois.slice(5,7)]}
                            </td>
                            <td className="px-2 py-1 border-b border-gray-100 text-center tabular-nums">{row.programmes}</td>
                            <td className="px-2 py-1 border-b border-gray-100 text-center tabular-nums text-green-700">{row.effectues}</td>
                            <td className="px-2 py-1 border-b border-gray-100 text-center tabular-nums text-red-500">{row.annules}</td>
                            <td className="px-2 py-1 border-b border-gray-100 text-center tabular-nums">{taux} %</td>
                            <td className="px-2 py-1 border-b border-gray-100 text-center tabular-nums">{row.effectif || 0}</td>
                            <td className="px-2 py-1 border-b border-gray-100 text-center tabular-nums">{moy || '—'}</td>
                            <td className="px-2 py-1 border-b border-gray-100 text-center tabular-nums font-medium" style={{ color: '#1a7a9b' }}>{fmtH(heurs)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Graphique heures par mois */}
              {widgets.graphique && (
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-2">Total heures par mois</h3>
                  <div className="border border-gray-200 rounded-lg p-3 bg-white">
                    <LineChart
                      data={mensuel.map(m => ({ mois: m.mois, heures: Math.round((m.total_minutes||0)/60*100)/100 }))}
                      xKey="mois"
                      yKey="heures"
                      color="#5bcae8"
                      label="Heures"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top cours + Top coachs */}
          {(widgets.topCours || widgets.topCoachs) && (
            <div className={`grid grid-cols-1 gap-6 ${widgets.topCours && widgets.topCoachs ? 'lg:grid-cols-2' : ''}`}>
              {widgets.topCours && (
                <div className="overflow-x-auto">
                  <h3 className="text-sm font-bold text-gray-700 mb-2">Top Cours</h3>
                  <table className="w-full border-collapse text-xs min-w-[360px]">
                    <thead>
                      <tr style={{ backgroundColor: '#2fa8cc', color: '#fff' }}>
                        {['Cours','Séances','Participants','Moyenne'].map((h, i) => (
                          <th key={h} className={`px-3 py-1.5 font-bold ${i === 0 ? 'text-left' : 'text-center'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topCours.map((row, i) => (
                        <tr key={row.nom} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : '#ffffff' }}>
                          <td className="px-3 py-1.5 border-b border-gray-100 font-medium">{row.nom}</td>
                          <td className="px-3 py-1.5 border-b border-gray-100 text-center tabular-nums">{row.seances}</td>
                          <td className="px-3 py-1.5 border-b border-gray-100 text-center tabular-nums">{row.total_presents || '—'}</td>
                          <td className="px-3 py-1.5 border-b border-gray-100 text-center tabular-nums">{row.moy_presents ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {widgets.topCoachs && (
                <div className="overflow-x-auto">
                  <h3 className="text-sm font-bold text-gray-700 mb-2">Top Coachs</h3>
                  <table className="w-full border-collapse text-xs min-w-[360px]">
                    <thead>
                      <tr style={{ backgroundColor: '#c9a464', color: '#fff' }}>
                        {['Coach','Heures','Séances','Moy. présents'].map((h, i) => (
                          <th key={h} className={`px-3 py-1.5 font-bold ${i === 0 ? 'text-left' : 'text-center'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topCoachs.map((row, i) => (
                        <tr key={row.coach} style={{ backgroundColor: i % 2 === 0 ? '#fdf6ec' : '#ffffff' }}>
                          <td className="px-3 py-1.5 border-b border-gray-100 font-medium">{row.coach}</td>
                          <td className="px-3 py-1.5 border-b border-gray-100 text-center tabular-nums font-bold" style={{ color: '#1a7a9b' }}>{fmtH(row.heures)}</td>
                          <td className="px-3 py-1.5 border-b border-gray-100 text-center tabular-nums">{row.seances}</td>
                          <td className="px-3 py-1.5 border-b border-gray-100 text-center tabular-nums">{row.moy_presents ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modale détail des séances (clic sur un nombre d'heures) */}
      {seancesModal !== null && (() => {
        let modalDebut, modalFin, modalLabel;
        if (seancesModal.mois) {
          const [y, m] = seancesModal.mois.split('-').map(Number);
          modalDebut = `${seancesModal.mois}-01`;
          modalFin = `${seancesModal.mois}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
          modalLabel = `${MOIS_LABELS[String(m).padStart(2, '0')]} ${y}`;
        } else {
          modalDebut = debut;
          modalFin = fin;
          modalLabel = '13 derniers mois';
        }
        return (
          <CoachSeancesModal
            coach={seancesModal.coach}
            periodeLabel={modalLabel}
            debut={modalDebut}
            fin={modalFin}
            inclureEffectue={inclureEffectue}
            inclurePaye={inclurePaye}
            onClose={() => setSeancesModal(null)}
          />
        );
      })()}

      {/* Modale statistiques coach */}
      {statsModal !== null && (
        <CoachStatsModal
          coach={statsModal}
          onEdit={() => { setModal(statsModal); setStatsModal(null); }}
          onClose={() => setStatsModal(null)}
        />
      )}

      {/* Modale coach */}
      {modal !== null && (
        <CoachModal
          coach={modal?.id ? modal : null}
          onSave={handleSave}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
