import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, BarChart3, StickyNote } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getLundi, getSemaine, toISO,
  semaineSuivante, semainePrecedente, colorForUser,
} from '../lib/utils';
import MiniCalendar from '../components/MiniCalendar';
import { Onglets } from '../components/equipe/kit';
import PersonnelCreneauModal from '../components/PersonnelCreneauModal';

const TYPE_CONFIG = {
  cp:     { label: 'CP',     bg: '#fef3c7', text: '#92400e' },
  ecole:  { label: 'École',  bg: '#d1fae5', text: '#065f46' },
  ferie:  { label: 'Férié',  bg: '#f3e8ff', text: '#6b21a8' },
  arret:  { label: 'Arrêt',  bg: '#fee2e2', text: '#991b1b' },
  absent: { label: 'Absent', bg: '#ef4444', text: '#ffffff' },
  repos:  { label: 'Repos',  bg: '#f3f4f6', text: '#6b7280' },
};

function fmtTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':');
  const hh = parseInt(h, 10);
  return m === '00' ? `${hh}h` : `${hh}h${m}`;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fmtHeures(totalMinutes) {
  if (!totalMinutes) return '—';
  const h = totalMinutes / 60;
  return (Number.isInteger(h) ? String(h) : h.toFixed(1).replace('.', ',')) + 'h';
}

function toHours(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h + m / 60;
}

// Vue Gantt : une ligne par jour, une barre colorée par créneau de travail (heure
// réelle, initiales de l'employé) sur un axe horaire fixe — pour voir d'un coup d'œil
// qui est présent et quand. Uniquement le travail (pas les absences) ; cliquer une
// barre ouvre la même fiche que le tableau au-dessus.
const AXE_DEBUT = 7.5;
const AXE_FIN = 22;
const AXE_TICKS = [8, 10, 12, 14, 16, 18, 20, 22];

function pctAxe(h) {
  return Math.max(0, Math.min(100, ((h - AXE_DEBUT) / (AXE_FIN - AXE_DEBUT)) * 100));
}

function PersonnelTimeline({ semaine, creneaux, today, onOpenCell }) {
  return (
    <div className="mt-4 border border-gray-300 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Axe des heures */}
      <div className="flex border-b-2 border-gray-300 bg-gray-50">
        <div className="w-16 sm:w-24 flex-shrink-0" />
        <div className="relative flex-1 h-7 mr-8 sm:mr-12">
          {AXE_TICKS.map(h => (
            <span key={h} className="absolute top-1.5 text-[10px] text-gray-400 -translate-x-1/2" style={{ left: `${pctAxe(h)}%` }}>
              {h}h
            </span>
          ))}
        </div>
      </div>

      {semaine.map((date, i) => {
        const iso = toISO(date);
        const isToday = iso === today;
        const parJour = new Map();
        creneaux
          .filter(c => c.date === iso && c.type === 'travail' && c.debut && c.fin)
          .forEach(c => {
            if (!parJour.has(c.employe_id)) parJour.set(c.employe_id, { emp: { id: c.employe_id, prenom: c.prenom, nom: c.nom }, segments: [] });
            parJour.get(c.employe_id).segments.push(c);
          });
        const lignes = [...parJour.values()].sort((a, b) => a.emp.prenom.localeCompare(b.emp.prenom));
        const rowBg = isToday ? 'bg-sky-50' : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50/70');

        return (
          <div key={iso} className={`flex border-b-2 border-gray-200 last:border-b-0 ${rowBg}`}>
            <div className={`w-16 sm:w-24 flex-shrink-0 px-1.5 sm:px-3 py-2 text-[11px] sm:text-xs font-medium capitalize truncate ${isToday ? 'text-sky-600' : 'text-gray-500'}`}>
              {date.toLocaleDateString('fr-FR', { weekday: 'long' })}
            </div>
            <div className="relative flex-1 py-2 pl-2 mr-8 sm:mr-12 space-y-2.5">
              {lignes.length === 0 && <div className="h-5" />}
              {lignes.map(({ emp, segments }) => (
                <div key={emp.id} className="relative h-5">
                  {segments.map(seg => {
                    const start = toHours(seg.debut), end = toHours(seg.fin);
                    const left = pctAxe(start), width = Math.max(pctAxe(end) - left, 2);
                    return (
                      <button
                        key={seg.id}
                        onClick={() => onOpenCell(emp, iso)}
                        title={`${emp.prenom} ${emp.nom} : ${fmtTime(seg.debut)} - ${fmtTime(seg.fin)}`}
                        className="absolute inset-y-0 rounded hover:opacity-90 transition-opacity flex items-center pl-1.5"
                        style={{ left: `${left}%`, width: `${width}%`, backgroundColor: colorForUser(emp.id) }}
                      >
                        <span className="absolute right-full top-1/2 -translate-y-1/2 pr-1 text-[10px] font-medium text-gray-500 whitespace-nowrap tabular-nums">
                          {fmtTime(seg.debut)}
                        </span>
                        <span className="text-white text-[10px] font-bold whitespace-nowrap">
                          {emp.prenom?.[0]}{emp.nom?.[0]}
                        </span>
                        <span className="absolute left-full top-1/2 -translate-y-1/2 pl-1 text-[10px] font-medium text-gray-500 whitespace-nowrap tabular-nums">
                          {fmtTime(seg.fin)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CpSummary() {
  const [cp, setCp] = useState([]);

  useEffect(() => { api.getCpSummary().then(setCp).catch(() => {}); }, []);

  return (
    <div className="mt-3 bg-white border border-gray-200 rounded-lg overflow-hidden text-xs">
      <div className="px-3 py-2 border-b border-gray-100">
        <span className="font-semibold text-gray-500 text-[11px] uppercase tracking-wide">Congés payés</span>
      </div>
      {cp.length === 0 ? (
        <p className="text-gray-400 italic px-3 py-2">Aucun profil.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-gray-400 text-[10px] uppercase tracking-wide">
              <th className="text-left font-medium px-3 py-1">Nom</th>
              <th className="text-right font-medium px-1.5 py-1" title="CP pris ce mois">Mois</th>
              <th className="text-right font-medium px-1.5 py-1" title="CP pris cette année">Année</th>
              <th className="text-right font-medium px-3 py-1" title="CP restants">Restant</th>
            </tr>
          </thead>
          <tbody>
            {cp.map(c => (
              <tr key={c.id} className="border-t border-gray-50">
                <td className="px-3 py-1 text-gray-600 truncate max-w-[90px]">{c.prenom}</td>
                <td className="px-1.5 py-1 text-right text-gray-600 tabular-nums">{c.prisMois}</td>
                <td className="px-1.5 py-1 text-right text-gray-600 tabular-nums">{c.prisAnnee}</td>
                <td className={`px-3 py-1 text-right font-semibold tabular-nums ${c.restant < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {c.restant}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const MOIS_COURTS = {
  '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Jun',
  '07': 'Jul', '08': 'Aoû', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
};

function getLast12Months() {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const debut = months[0] + '-01';
  const finD  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fin   = `${finD.getFullYear()}-${String(finD.getMonth() + 1).padStart(2, '0')}-${String(finD.getDate()).padStart(2, '0')}`;
  return { months, debut, fin };
}

function fmtH(val) {
  if (!val && val !== 0) return '—';
  const r = Math.round(val * 100) / 100;
  return (r % 1 === 0 ? String(r) : r.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')) + 'h';
}

function RecapMensuel() {
  const [recap, setRecap] = useState(null);
  const { months, debut, fin } = useMemo(getLast12Months, []);
  const currentMois = months[months.length - 1];

  useEffect(() => { api.getPersonnelRecap(debut, fin).then(setRecap).catch(() => {}); }, [debut, fin]);

  if (!recap) return <div className="text-center py-8 text-gray-400 text-sm">Chargement…</div>;

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-x-auto">
      <table className="w-full border-collapse text-xs min-w-[760px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-500" style={{ minWidth: 140 }}>Employé</th>
            {months.map(m => (
              <th key={m} className="border-b border-gray-200 px-2 py-2 text-center font-semibold text-gray-500"
                style={m === currentMois ? { color: '#0369a1', backgroundColor: '#eef9fd' } : {}}>
                {MOIS_COURTS[m.slice(5, 7)]}
              </th>
            ))}
            <th className="border-b border-gray-200 px-3 py-2 text-center font-bold text-sky-700">Total</th>
            <th className="border-b border-gray-200 px-3 py-2 text-center font-semibold text-amber-700">CP (12 mois)</th>
          </tr>
        </thead>
        <tbody>
          {recap.employes.map((e, i) => (
            <tr key={e.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }} className={e.actif ? '' : 'opacity-40'}>
              <td className="sticky left-0 z-10 px-3 py-1.5 font-medium text-gray-700" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                {e.prenom} {e.nom}
              </td>
              {months.map(m => (
                <td key={m} className="px-2 py-1.5 text-center tabular-nums text-gray-600"
                  style={m === currentMois ? { backgroundColor: '#eef9fd' } : {}}>
                  {e.mois[m] ? fmtH(e.mois[m]) : '—'}
                </td>
              ))}
              <td className="px-3 py-1.5 text-center font-bold text-sky-700 tabular-nums">{fmtH(e.total)}</td>
              <td className="px-3 py-1.5 text-center text-amber-700 tabular-nums">{e.cpTotal || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PlanningPersonnel() {
  const { user } = useAuth();
  const toast = useToast();
  const isManager = user?.role === 'manager';

  const [lundi, setLundi]     = useState(() => getLundi());
  const [profils, setProfils] = useState([]);
  const [creneaux, setCreneaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cellModal, setCellModal] = useState(null); // { employe, date }
  const [dupliquer, setDupliquer] = useState(false);
  const [dupliquerMsg, setDupliquerMsg] = useState(null);
  const [vue, setVue] = useState('semaine'); // 'semaine' | 'recap'
  // Chacun voit le planning de toute l'équipe (qui travaille avec moi, qui me
  // relaie) mais peut n'afficher que ses propres horaires.
  const [qui, setQui] = useState('equipe'); // 'equipe' | 'moi'

  const semaine = getSemaine(lundi);

  const loadProfils = useCallback(() => {
    api.getProfiles().then(setProfils).catch(() => {});
  }, []);

  const loadCreneaux = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getPersonnelCreneaux(toISO(lundi));
      setCreneaux(data);
    } finally {
      setLoading(false);
    }
  }, [lundi]);

  useEffect(() => { loadProfils(); }, [loadProfils]);
  useEffect(() => { loadCreneaux(); }, [loadCreneaux]);

  async function handleSaveCreneau(payload) {
    try {
      await api.upsertPersonnelCreneau(cellModal.employe.id, cellModal.date, payload);
      loadCreneaux();
      toast.success('Créneau enregistré');
    } catch (e) {
      toast.error('Échec de l\'enregistrement : ' + e.message);
      throw e;
    }
  }

  async function handleDupliquer() {
    if (!confirm('Copier le planning de la semaine précédente vers cette semaine ?\n\n(Les jours déjà renseignés ne sont pas touchés.)')) return;
    setDupliquer(true);
    setDupliquerMsg(null);
    try {
      const source = toISO(semainePrecedente(lundi));
      const { copies, ignores } = await api.dupliquerSemainePersonnel(source, toISO(lundi));
      await loadCreneaux();
      setDupliquerMsg(
        copies === 0
          ? 'Rien à copier (semaine précédente vide ou déjà tout renseigné).'
          : `${copies} jour(s) copié(s)${ignores ? `, ${ignores} déjà renseigné(s) conservé(s)` : ''}.`
      );
    } catch (e) {
      setDupliquerMsg('Erreur : ' + e.message);
    } finally {
      setDupliquer(false);
    }
  }

  const today = toISO(new Date());

  // Profils actifs + profils inactifs ayant au moins un créneau cette semaine
  const rows = useMemo(() => {
    const activeIds = new Set(profils.map(p => p.id));
    const extras = new Map();
    creneaux.forEach(c => {
      if (!activeIds.has(c.employe_id) && !extras.has(c.employe_id)) {
        extras.set(c.employe_id, { id: c.employe_id, prenom: c.prenom, nom: c.nom });
      }
    });
    const tous = [...profils, ...extras.values()].sort((a, b) => a.prenom.localeCompare(b.prenom));
    return qui === 'moi' ? tous.filter(p => p.id === user?.id) : tous;
  }, [profils, creneaux, qui, user?.id]);

  return (
    <div className="flex gap-4">
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <MiniCalendar lundi={lundi} onSelectDate={(d) => setLundi(getLundi(d))} />
        <CpSummary />
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Onglets trait={false} actif={qui} onChange={setQui} onglets={[
            { id: 'equipe', label: "Toute l'équipe" },
            { id: 'moi', label: 'Mes horaires' },
          ]} />
          <span className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />
          <button onClick={() => setLundi(semainePrecedente(lundi))} aria-label="Semaine précédente"
            className="px-2.5 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded">←</button>
          <button onClick={() => setLundi(getLundi())}
            className="px-2.5 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded">Auj.</button>
          <button onClick={() => setLundi(semaineSuivante(lundi))} aria-label="Semaine suivante"
            className="px-2.5 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded">→</button>
          <span className="ml-1 text-sm font-semibold text-gray-700">
            {semaine[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            {' – '}
            {semaine[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap gap-2">
            {vue === 'semaine' && (
              <button onClick={handleDupliquer} disabled={dupliquer}
                title="Copie tous les jours de la semaine précédente qui ne sont pas déjà renseignés cette semaine"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded disabled:opacity-50">
                {dupliquer ? 'Duplication…' : '⧉ Dupliquer la semaine précédente'}
              </button>
            )}
            {isManager && (
              <button onClick={() => setVue(v => v === 'semaine' ? 'recap' : 'semaine')}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded">
                {vue === 'semaine' ? <><BarChart3 className="h-4 w-4" /> Récap mensuel</> : '← Retour à la semaine'}
              </button>
            )}
          </div>
        </div>
        {dupliquerMsg && vue === 'semaine' && (
          <p className="text-xs text-gray-400 -mt-2 mb-3">{dupliquerMsg}</p>
        )}

        {vue === 'recap' && isManager ? (
          <RecapMensuel />
        ) : loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Chargement…</div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">Aucun profil — ajoute un membre depuis Équipe &gt; Membres.</p>
        ) : (
          <>
          <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-x-auto">
            <table className="w-full border-collapse table-fixed text-sm min-w-[800px]">
              <colgroup>
                <col style={{ width: '44px' }} />
                <col style={{ width: '132px' }} />
                {semaine.map((_, i) => <col key={i} />)}
                <col style={{ width: '68px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 border-b border-gray-200 rounded-tl-xl" />
                  <th className="z-20 bg-gray-50 border-b border-gray-200 p-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                    Employé
                  </th>
                  {semaine.map((date) => {
                    const iso = toISO(date);
                    const isToday = iso === today;
                    return (
                      <th key={iso} className={`z-20 border-b border-gray-200 p-1.5 text-center ${isToday ? 'bg-sky-50' : 'bg-gray-50'}`}>
                        <div className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? 'text-sky-500' : 'text-gray-400'}`}>
                          {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                        </div>
                        <div className={`text-sm font-bold leading-none mt-0.5 ${isToday ? 'text-sky-700' : 'text-gray-600'}`}>
                          {date.getDate()}
                        </div>
                      </th>
                    );
                  })}
                  <th className="z-20 bg-sky-50 border-b border-gray-200 rounded-tr-xl p-2 text-center text-[11px] font-bold text-sky-700 uppercase tracking-wide">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(emp => {
                  const empCreneaux = creneaux.filter(c => c.employe_id === emp.id);
                  const travail = empCreneaux.filter(c => c.type === 'travail');
                  const totalMinutes = travail.reduce((sum, c) => sum + (toMinutes(c.fin) - toMinutes(c.debut)), 0);

                  return (
                    <tr key={emp.id} className="group/row hover:bg-gray-50/60 transition-colors">
                      <td className="sticky left-0 z-10 bg-white group-hover/row:bg-gray-50/60 pl-3 align-middle transition-colors">
                        <span
                          className="h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: colorForUser(emp.id) }}
                        >
                          {emp.prenom?.[0]}{emp.nom?.[0]}
                        </span>
                      </td>
                      <td className="bg-white group-hover/row:bg-gray-50/60 border-r border-gray-100 pr-3 py-2 align-middle transition-colors">
                        <span className="font-medium text-gray-700 truncate block">{emp.prenom} {emp.nom}</span>
                      </td>
                      {semaine.map(date => {
                        const iso = toISO(date);
                        const cellCreneaux = empCreneaux
                          .filter(c => c.date === iso)
                          .sort((a, b) => a.ordre - b.ordre);
                        const isAbsence = cellCreneaux.length > 0 && cellCreneaux[0].type !== 'travail';
                        const typeCfg = isAbsence ? TYPE_CONFIG[cellCreneaux[0].type] : null;

                        const noteText = cellCreneaux.map(c => c.notes).filter(Boolean).join(' · ');

                        return (
                          <td key={iso} onClick={() => setCellModal({ employe: emp, date: iso })}
                            className="group/cell p-1 min-w-[100px] h-14 cursor-pointer align-middle">
                            <div
                              className="relative h-full w-full rounded-lg flex flex-col items-center justify-center gap-1 transition-colors"
                              style={{ backgroundColor: typeCfg ? typeCfg.bg : 'transparent' }}
                            >
                              {noteText && (
                                <span title={noteText} aria-label="Note" className="absolute top-0.5 right-1 text-gray-500 cursor-help">
                                  <StickyNote className="h-3 w-3" />
                                </span>
                              )}
                              {cellCreneaux.length === 0 && (
                                <Plus className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                              )}
                              {typeCfg && (
                                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: typeCfg.text }}>
                                  {typeCfg.label}
                                </span>
                              )}
                              {!isAbsence && cellCreneaux.map(c => (
                                <div key={c.id} className="text-[13px] font-semibold text-gray-600 tabular-nums text-center leading-snug">
                                  {fmtTime(c.debut)} - {fmtTime(c.fin)}
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                      <td className="text-center text-sm font-bold text-sky-700 bg-sky-50/60 tabular-nums">
                        {fmtHeures(totalMinutes)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PersonnelTimeline
            semaine={semaine}
            creneaux={qui === 'moi' ? creneaux.filter(c => c.employe_id === user?.id) : creneaux}
            today={today}
            onOpenCell={(emp, iso) => setCellModal({ employe: emp, date: iso })}
          />
          </>
        )}
      </div>

      {cellModal && (
        <PersonnelCreneauModal
          employe={cellModal.employe}
          date={cellModal.date}
          creneaux={creneaux.filter(c => c.employe_id === cellModal.employe.id && c.date === cellModal.date).sort((a, b) => a.ordre - b.ordre)}
          onSave={handleSaveCreneau}
          onClose={() => setCellModal(null)}
        />
      )}
    </div>
  );
}
