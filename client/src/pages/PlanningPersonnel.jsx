import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, StickyNote } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getLundi, getSemaine, toISO,
  semaineSuivante, semainePrecedente, colorForUser,
} from '../lib/utils';
import MiniCalendar from '../components/MiniCalendar';
import PersonnelCreneauModal from '../components/PersonnelCreneauModal';
import { Onglets, Feuille, Intertitre, Plaque, BoutonTrait, Rien } from '../components/equipe/kit';
import { TYPES_ABSENCE, fmtHeure, fmtDuree, ecartContrat, minutesCreneau } from '../lib/equipe';
import { useHorairesSalle, graduations } from '../lib/useHorairesSalle';

const heures = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h + m / 60; };

// Frise de la semaine : une ligne par jour, une barre colorée par créneau de travail
// (heure réelle, initiales de l'employé) sur un axe borné par les heures d'ouverture de la
// salle (Préférences) — pour voir d'un coup d'œil qui est présent et quand. Travail
// uniquement (pas les absences) ; cliquer une barre ouvre la même fiche que le tableau.
function PersonnelTimeline({ semaine, creneaux, today, onOpenCell }) {
  const { debut: DEBUT, fin: FIN } = useHorairesSalle();
  const ticks = graduations(DEBUT, FIN);
  const pct = (h) => Math.max(0, Math.min(100, ((h - DEBUT) / (FIN - DEBUT)) * 100));

  return (
    <Feuille className="mt-6 overflow-hidden">
      <div className="flex border-b border-brand-ink/15 bg-brand-cream/60">
        <div className="w-16 sm:w-24 flex-shrink-0" />
        <div className="relative flex-1 h-7 mr-10 sm:mr-14">
          {ticks.map(h => (
            <span key={h} className="absolute top-2 font-mono text-[10px] text-gray-400 -translate-x-1/2" style={{ left: `${pct(h)}%` }}>{h}</span>
          ))}
        </div>
      </div>

      {semaine.map(date => {
        const iso = toISO(date);
        const estAuj = iso === today;
        const parJour = new Map();
        creneaux
          .filter(c => c.date === iso && c.type === 'travail' && c.debut && c.fin)
          .forEach(c => {
            if (!parJour.has(c.employe_id)) parJour.set(c.employe_id, { emp: { id: c.employe_id, prenom: c.prenom, nom: c.nom }, segments: [] });
            parJour.get(c.employe_id).segments.push(c);
          });
        const lignes = [...parJour.values()].sort((a, b) => a.emp.prenom.localeCompare(b.emp.prenom));

        return (
          <div key={iso} className={`flex border-b border-brand-ink/10 last:border-b-0 ${estAuj ? 'bg-fitness/[0.05]' : ''}`}>
            <div className={`w-16 sm:w-24 flex-shrink-0 px-2 sm:px-3 py-2 font-mono text-[11px] uppercase ${estAuj ? 'text-fitness font-semibold' : 'text-gray-500'}`}>
              {date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
              <span className="ml-1.5 text-brand-ink">{date.getDate()}</span>
            </div>
            <div className="relative flex-1 py-2 pl-2 mr-10 sm:mr-14 space-y-2">
              {lignes.length === 0 && <div className="h-5" />}
              {lignes.map(({ emp, segments }) => (
                <div key={emp.id} className="relative h-5">
                  {segments.map(seg => {
                    const left = pct(heures(seg.debut)), width = Math.max(pct(heures(seg.fin)) - left, 2);
                    return (
                      <button
                        key={seg.id}
                        onClick={() => onOpenCell(emp, iso)}
                        title={`${emp.prenom} ${emp.nom || ''} : ${fmtHeure(seg.debut)} – ${fmtHeure(seg.fin)}`}
                        className="absolute inset-y-0 rounded-[2px] hover:opacity-90 transition-opacity flex items-center pl-1.5"
                        style={{ left: `${left}%`, width: `${width}%`, backgroundColor: colorForUser(emp.id) }}
                      >
                        <span className="absolute right-full top-1/2 -translate-y-1/2 pr-1 font-mono text-[10px] text-gray-500 whitespace-nowrap tabular-nums">{fmtHeure(seg.debut)}</span>
                        <span className="font-mono text-white text-[10px] font-semibold whitespace-nowrap">{emp.prenom?.[0]}{emp.nom?.[0]}</span>
                        <span className="absolute left-full top-1/2 -translate-y-1/2 pl-1 font-mono text-[10px] text-gray-500 whitespace-nowrap tabular-nums">{fmtHeure(seg.fin)}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Feuille>
  );
}

function CpSummary() {
  const [cp, setCp] = useState([]);
  useEffect(() => { api.getCpSummary().then(setCp).catch(() => {}); }, []);

  return (
    <div className="mt-6">
      <Intertitre>Congés payés</Intertitre>
      {cp.length === 0 ? (
        <p className="font-mono text-[11px] text-gray-400">— aucun suivi —</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="font-mono text-[10px] text-gray-400 border-b border-brand-ink/15">
              <th className="text-left font-normal pb-1.5">nom</th>
              <th className="text-right font-normal pb-1.5" title="CP pris ce mois">mois</th>
              <th className="text-right font-normal pb-1.5 pl-2" title="CP pris cette année">année</th>
              <th className="text-right font-normal pb-1.5 pl-2" title="CP restants">reste</th>
            </tr>
          </thead>
          <tbody>
            {cp.map(c => (
              <tr key={c.id} className="border-b border-brand-ink/[0.07]">
                <td className="py-1.5 text-sm text-brand-ink truncate max-w-[84px]">{c.prenom}</td>
                <td className="py-1.5 text-right font-mono text-xs tabular-nums text-gray-500">{c.prisMois}</td>
                <td className="py-1.5 pl-2 text-right font-mono text-xs tabular-nums text-gray-500">{c.prisAnnee}</td>
                <td className={`py-1.5 pl-2 text-right font-mono text-sm font-semibold tabular-nums ${c.restant < 0 ? 'text-fitness' : 'text-brand-ink'}`}>
                  {String(c.restant).replace('.', ',')}
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
  return (r % 1 === 0 ? String(r) : r.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')).replace('.', ',') + 'h';
}

// Export pour la paie : un fichier CSV lisible par Excel (séparateur « ; », virgule décimale,
// accents préservés) avec les heures de chaque mois, le total et les CP sur 12 mois.
function exporterCsv(recap, months) {
  const nb = (n) => String(Math.round((n || 0) * 100) / 100).replace('.', ',');
  const entete = ['Employé', ...months.map(m => `${MOIS_COURTS[m.slice(5, 7)]} ${m.slice(0, 4)}`), 'Total heures', 'Heures de cours (12 mois)', 'CP (12 mois)'];
  const lignes = recap.employes.map(e => [
    `${e.prenom} ${e.nom || ''}`.trim(),
    ...months.map(m => (e.mois[m] ? nb(e.mois[m]) : '')),
    nb(e.total),
    e.coach_id ? nb(e.coursTotal) : '',
    String(e.cpTotal || 0),
  ]);
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = '﻿' + [entete, ...lignes].map(l => l.map(esc).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `heures-personnel-${months[months.length - 1]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function RecapMensuel() {
  const [recap, setRecap] = useState(null);
  const { months, debut, fin } = useMemo(getLast12Months, []);
  const moisCourant = months[months.length - 1];

  useEffect(() => { api.getPersonnelRecap(debut, fin).then(setRecap).catch(() => {}); }, [debut, fin]);

  if (!recap) return <p className="py-16 text-center font-mono text-xs text-gray-400">chargement…</p>;

  const entete = 'font-mono text-[10px] text-gray-400 font-normal pb-2';
  return (
    <div>
      <div className="flex justify-end mb-3">
        <BoutonTrait onClick={() => exporterCsv(recap, months)} disabled={recap.employes.length === 0}>Exporter en CSV</BoutonTrait>
      </div>
      <Feuille className="overflow-x-auto p-4">
        <table className="w-full border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b-2 border-brand-ink">
              <th className={`${entete} text-left sticky left-0 bg-white`} style={{ minWidth: 140 }}>employé</th>
              {months.map(m => (
                <th key={m} className={`${entete} text-center ${m === moisCourant ? '!text-fitness' : ''}`}>{MOIS_COURTS[m.slice(5, 7)]}</th>
              ))}
              <th className={`${entete} text-center text-brand-ink`}>total</th>
              <th className={`${entete} text-center`} title="Séances non annulées du salarié relié à une fiche coach. Affichées à part : non additionnées au planning.">cours · 12 mois</th>
              <th className={`${entete} text-center`}>CP · 12 mois</th>
            </tr>
          </thead>
          <tbody>
            {recap.employes.map(e => (
              <tr key={e.id} className={`border-b border-brand-ink/[0.08] ${e.actif ? '' : 'opacity-40'}`}>
                <td className="py-2 pr-3 text-sm text-brand-ink sticky left-0 bg-white">{e.prenom} {e.nom}</td>
                {months.map(m => (
                  <td key={m} className={`py-2 text-center font-mono text-xs tabular-nums text-gray-600 ${m === moisCourant ? 'bg-fitness/[0.06]' : ''}`}>
                    {e.mois[m] ? fmtH(e.mois[m]) : '—'}
                    {e.coursMois?.[m] ? <span className="block text-[10px] text-fitness" title="heures de cours ce mois-là">cours {fmtH(e.coursMois[m])}</span> : null}
                  </td>
                ))}
                <td className="py-2 text-center font-mono text-sm font-semibold tabular-nums text-brand-ink">{fmtH(e.total)}</td>
                <td className="py-2 text-center font-mono text-xs tabular-nums text-gray-600">{e.coach_id ? fmtH(e.coursTotal) : '—'}</td>
                <td className="py-2 text-center font-mono text-xs tabular-nums text-gray-600">{e.cpTotal || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Feuille>
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
  const [contrats, setContrats] = useState(() => new Map()); // id -> heures de contrat (manager)
  const [loading, setLoading] = useState(true);
  const [cellModal, setCellModal] = useState(null); // { employe, date }
  const [dupliquer, setDupliquer] = useState(false);
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
      setCreneaux(await api.getPersonnelCreneaux(toISO(lundi)));
    } finally {
      setLoading(false);
    }
  }, [lundi]);

  useEffect(() => { loadProfils(); }, [loadProfils]);
  useEffect(() => { loadCreneaux(); }, [loadCreneaux]);
  useEffect(() => {
    if (isManager) api.getMembres().then(ms => setContrats(new Map(ms.map(m => [m.id, m.heures_contrat_semaine])))).catch(() => {});
  }, [isManager]);

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
    try {
      const { copies, ignores } = await api.dupliquerSemainePersonnel(toISO(semainePrecedente(lundi)), toISO(lundi));
      await loadCreneaux();
      if (copies === 0) toast.info('Rien à copier (semaine précédente vide ou déjà tout renseigné).');
      else toast.success(`${copies} jour(s) copié(s)${ignores ? `, ${ignores} déjà renseigné(s) conservé(s)` : ''}.`);
    } catch (e) {
      toast.error('Erreur : ' + e.message);
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

  const titreSemaine = `${semaine[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} – ${semaine[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  const entete = 'font-mono text-[10px] text-gray-400 font-normal';

  return (
    <div className="flex gap-6">
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <MiniCalendar sobre lundi={lundi} onSelectDate={(d) => setLundi(getLundi(d))} />
        <CpSummary />
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3 mb-5">
          <Onglets trait={false} actif={qui} onChange={setQui} onglets={[
            { id: 'equipe', label: "Toute l'équipe" },
            { id: 'moi', label: 'Mes horaires' },
          ]} />
          <div className="flex items-center gap-1.5">
            <BoutonTrait onClick={() => setLundi(semainePrecedente(lundi))} aria-label="Semaine précédente" className="!px-2.5 !py-1.5">←</BoutonTrait>
            <BoutonTrait onClick={() => setLundi(getLundi())} className="!px-2.5 !py-1.5">Auj.</BoutonTrait>
            <BoutonTrait onClick={() => setLundi(semaineSuivante(lundi))} aria-label="Semaine suivante" className="!px-2.5 !py-1.5">→</BoutonTrait>
          </div>
          <span className="font-display text-lg font-bold text-brand-ink leading-none pb-1.5">{titreSemaine}</span>
          <div className="flex-1" />
          <div className="flex flex-wrap gap-2">
            {vue === 'semaine' && (
              <BoutonTrait onClick={handleDupliquer} disabled={dupliquer}
                title="Copie tous les jours de la semaine précédente qui ne sont pas déjà renseignés cette semaine">
                {dupliquer ? 'Duplication…' : 'Dupliquer la semaine précédente'}
              </BoutonTrait>
            )}
            {isManager && (
              <BoutonTrait onClick={() => setVue(v => v === 'semaine' ? 'recap' : 'semaine')}>
                {vue === 'semaine' ? 'Récap mensuel' : '← Retour à la semaine'}
              </BoutonTrait>
            )}
          </div>
        </div>

        {vue === 'recap' && isManager ? (
          <RecapMensuel />
        ) : loading ? (
          <p className="py-16 text-center font-mono text-xs text-gray-400">chargement…</p>
        ) : rows.length === 0 ? (
          <Rien>aucun profil — ajoute un membre depuis Équipe &gt; Effectif</Rien>
        ) : (
          <>
            <Feuille className="overflow-x-auto">
              <table className="w-full border-collapse table-fixed min-w-[820px]">
                <colgroup>
                  <col style={{ width: '150px' }} />
                  {semaine.map((_, i) => <col key={i} />)}
                  <col style={{ width: '96px' }} />
                </colgroup>
                <thead>
                  <tr className="border-b-2 border-brand-ink">
                    <th className={`${entete} text-left px-3 py-2 sticky left-0 bg-white`}>employé</th>
                    {semaine.map(date => {
                      const estAuj = toISO(date) === today;
                      return (
                        <th key={toISO(date)} className={`py-2 text-center ${estAuj ? 'bg-fitness/[0.06]' : ''}`}>
                          <div className={`font-mono text-[10px] uppercase font-normal ${estAuj ? 'text-fitness' : 'text-gray-400'}`}>
                            {date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
                          </div>
                          <div className={`font-display text-lg font-bold leading-none mt-0.5 ${estAuj ? 'text-fitness' : 'text-brand-ink'}`}>{date.getDate()}</div>
                        </th>
                      );
                    })}
                    <th className={`${entete} text-center py-2`}>total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(emp => {
                    const empCreneaux = creneaux.filter(c => c.employe_id === emp.id);
                    const totalMinutes = empCreneaux.filter(c => c.type === 'travail').reduce((s, c) => s + minutesCreneau(c), 0);
                    const contrat = isManager ? contrats.get(emp.id) : null;
                    const ecart = contrat && totalMinutes > 0 ? ecartContrat(totalMinutes, contrat) : null;

                    return (
                      <tr key={emp.id} className="group/row border-b border-brand-ink/10 hover:bg-brand-cream/50 transition-colors">
                        <td className="px-3 py-2 sticky left-0 bg-white group-hover/row:bg-brand-cream/50 transition-colors">
                          <span className="flex items-center gap-2.5 min-w-0">
                            <Plaque user={emp} size={26} />
                            <span className="text-sm text-brand-ink truncate">{emp.prenom} {emp.nom}</span>
                          </span>
                        </td>
                        {semaine.map(date => {
                          const iso = toISO(date);
                          const cellCreneaux = empCreneaux.filter(c => c.date === iso).sort((a, b) => a.ordre - b.ordre);
                          const absence = cellCreneaux.length > 0 && cellCreneaux[0].type !== 'travail' ? cellCreneaux[0].type : null;
                          const note = cellCreneaux.map(c => c.notes).filter(Boolean).join(' · ');

                          return (
                            <td key={iso} onClick={() => setCellModal({ employe: emp, date: iso })}
                              className="group/cell p-1 min-w-[100px] h-14 cursor-pointer align-middle">
                              <div className={`relative h-full w-full rounded-[3px] flex flex-col items-center justify-center gap-0.5 ${
                                absence ? 'hachures' : iso === today ? 'bg-fitness/[0.06]' : ''
                              }`}>
                                {note && (
                                  <span title={note} aria-label="Note" className="absolute top-0.5 right-1 text-gray-500 cursor-help">
                                    <StickyNote className="h-3 w-3" />
                                  </span>
                                )}
                                {cellCreneaux.length === 0 && (
                                  <Plus className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                )}
                                {absence && (
                                  <span className={`font-mono text-[11px] uppercase tracking-wide ${['arret', 'absent'].includes(absence) ? 'text-fitness font-semibold' : 'text-brand-ink'}`}>
                                    {TYPES_ABSENCE[absence]?.court || absence}
                                  </span>
                                )}
                                {!absence && cellCreneaux.map(c => (
                                  <div key={c.id} className="font-mono text-[12px] text-brand-ink tabular-nums text-center leading-snug">
                                    {fmtHeure(c.debut)}–{fmtHeure(c.fin)}
                                  </div>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                        <td className="text-center px-1">
                          <div className="font-mono text-sm font-semibold tabular-nums text-brand-ink">{totalMinutes ? fmtDuree(totalMinutes) : '—'}</div>
                          {contrat ? (
                            <div className="font-mono text-[10px] text-gray-400 leading-tight">
                              / {fmtDuree(contrat * 60)}
                              {ecart != null && Math.abs(ecart) >= 30 && (
                                <span className={`ml-1 ${ecart > 0 ? 'text-fitness' : 'text-gray-500'}`} title={ecart > 0 ? 'Planifié au-delà du contrat' : 'Planifié en dessous du contrat'}>
                                  {ecart > 0 ? '+' : '−'}{fmtDuree(Math.abs(ecart))}
                                </span>
                              )}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Feuille>
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
