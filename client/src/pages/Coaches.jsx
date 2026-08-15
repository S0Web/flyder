import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { DISCIPLINE_CONFIG, colorForUser, STATUT_CONFIG, CATEGORIE_CONFIG } from '../lib/utils';
import CoachDocumentsSection from '../components/CoachDocumentsSection';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MOIS_LABELS = {
  '01':'Janvier','02':'Février','03':'Mars','04':'Avril','05':'Mai','06':'Juin',
  '07':'Juillet','08':'Août','09':'Septembre','10':'Octobre','11':'Novembre','12':'Décembre',
};
const MOIS_COURTS = {
  '01':'Jan','02':'Fév','03':'Mar','04':'Avr','05':'Mai','06':'Jun',
  '07':'Jul','08':'Aoû','09':'Sep','10':'Oct','11':'Nov','12':'Déc',
};

// Initiale affichée dans les puces discipline discrètes (mêmes couleurs que l'annuaire)
const DISCIPLINE_LETTERS = { aqua: 'A', fitness: 'F', boxe: 'B', crosstraining: 'C', poledance: 'P' };

function DisciplineBadges({ coach }) {
  const actives = Object.keys(DISCIPLINE_LETTERS).filter(k => coach[k]);
  if (actives.length === 0) return null;
  return (
    <span className="flex items-center gap-0.5 flex-shrink-0">
      {actives.map(key => {
        const cfg = DISCIPLINE_CONFIG[key];
        return (
          <span key={key} title={cfg.label}
            className={`h-3.5 w-3.5 rounded-full flex items-center justify-center text-[8px] font-bold leading-none ${cfg.bg} ${cfg.text}`}>
            {DISCIPLINE_LETTERS[key]}
          </span>
        );
      })}
    </span>
  );
}

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
  doc.text(salleNom || 'Récapitulatif', marginX, y);
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

// ── Modale coach ───────────────────────────────────────────────────────────────

function CoachModal({ coach, onSave, onToggle, onDelete, onClose, isManager }) {
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
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
        <div className="px-6 py-4 space-y-3">
        <form id="coach-form" onSubmit={handleSubmit} className="space-y-3">
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

        </form>

          {!isNew && isManager && <CoachDocumentsSection coachId={coach.id} />}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 rounded py-2 text-sm hover:bg-gray-50">Annuler</button>
            <button type="submit" form="coach-form" disabled={saving}
              className="flex-1 text-white rounded py-2 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#3D5AFE' }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
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
                      <td key={c.key} className="px-2 py-2 text-center tabular-nums font-semibold" style={{ color: '#12162B' }}>
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
            style={{ backgroundColor: '#3D5AFE' }}>
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
              style={{ backgroundColor: '#3D5AFE' }}>
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
  const { user: me } = useAuth();
  const isManager = me?.role === 'manager';
  const [recap, setRecap]       = useState(null);
  const [modal, setModal]       = useState(null);
  const [statsModal, setStatsModal] = useState(null);
  const [seancesModal, setSeancesModal] = useState(null); // { coach, mois } — mois=null pour le total
  const [showInactifs, setShowInactifs] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const reqIdRef = useRef(0);

  // Récapitulatif des heures : quels statuts comptent comme "réalisé"
  const [inclureEffectue, setInclureEffectue] = useState(true);
  const [inclurePaye, setInclurePaye]         = useState(true);

  const { months, debut, fin } = getLast13Months();
  const currentMois = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
  })();

  const load = useCallback(async () => {
    const myId = ++reqIdRef.current;
    setRefreshing(true);
    try {
      const r = await api.getCoachesRecap({
        debut, fin, effectue: inclureEffectue ? 1 : 0, paye: inclurePaye ? 1 : 0,
      });
      if (myId !== reqIdRef.current) return; // une requête plus récente est en cours : on ignore
      setRecap(r);
    } catch(e) { console.error(e); }
    finally {
      if (myId === reqIdRef.current) setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inclureEffectue, inclurePaye]);

  useEffect(() => { load(); }, [load]);

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


  return (
    <div className="space-y-8">

      {/* ════════════════════════════════════════════════════════════
          SECTION 1 — Récapitulatif heures par coach
      ════════════════════════════════════════════════════════════ */}

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Récapitulatif des heures effectuées</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              13 derniers mois · les graphiques et statistiques sont désormais dans{' '}
              <Link to="/analyse" className="text-sky-600 hover:underline font-medium">Analyse</Link>
            </p>
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
              style={{ backgroundColor: '#3D5AFE' }}>
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
                <th className={`${TH} text-left sticky left-0 z-30 bg-gray-100`} style={{ minWidth: 120 }}>Coach</th>
                {months.map(m => (
                  <th key={m} className={`${TH}`}
                    style={m === currentMois ? { color: '#3D5AFE', backgroundColor: '#eef9fd' } : {}}>
                    {MOIS_COURTS[m.slice(5,7)]}
                  </th>
                ))}
                <th className={`${TH}`} style={{ color: '#12162B' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((coach, i) => {
                const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
                return (
                  <tr key={coach.id} style={{ backgroundColor: bg }} className={coach.actif ? '' : 'opacity-40'}>
                    <td className="sticky left-0 z-10 border-b border-gray-100 px-2 py-1.5 font-semibold" style={{ backgroundColor: bg, maxWidth: 120 }}>
                      <button onClick={() => setStatsModal(coach)} title={`${coach.prenom} ${coach.nom}`}
                        className="hover:underline text-left flex items-center gap-1 w-full" style={{ color: '#12162B' }}>
                        <span className="truncate">{coach.prenom} {coach.nom}</span>
                        <DisciplineBadges coach={coach} />
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
                          className="w-full h-full px-3 py-1.5 tabular-nums hover:underline hover:bg-sky-50/60" style={{ color: '#12162B' }}>
                          {fmtH(coach.total)}
                        </button>
                      ) : (
                        <span className="block px-3 py-1.5" style={{ color: '#12162B' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Ligne total */}
              <tr style={{ backgroundColor: '#f0f9ff' }}>
                <td className="sticky left-0 z-10 px-3 py-2 font-extrabold text-xs uppercase tracking-wide border-t-2 border-gray-300" style={{ backgroundColor: '#f0f9ff', color: '#12162B' }}>
                  Total
                </td>
                {months.map(m => (
                  <td key={m} className="px-2 py-2 text-center text-xs font-bold tabular-nums border-t-2 border-gray-300"
                    style={{ color: '#12162B', backgroundColor: m === currentMois ? '#d6f3fb' : undefined }}>
                    {totauxMois[m] ? fmtH(Math.round(totauxMois[m] * 100)/100) : '—'}
                  </td>
                ))}
                <td className="px-3 py-2 text-center font-extrabold text-xs tabular-nums border-t-2 border-gray-300" style={{ color: '#12162B' }}>
                  {fmtH(Math.round(grandTotal * 100)/100)}
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        )}
      </div>
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
          isManager={isManager}
        />
      )}
    </div>
  );
}
