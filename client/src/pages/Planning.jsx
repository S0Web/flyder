import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Copy, LayoutGrid, List } from 'lucide-react';
import { api } from '../lib/api';
import {
  getLundi, getSemaine, toISO,
  semaineSuivante, semainePrecedente, STATUT_CONFIG, CATEGORIE_CONFIG,
} from '../lib/utils';
import { useToast } from '../context/ToastContext';
import SeanceCard from '../components/SeanceCard';
import SeanceModal from '../components/SeanceModal';
import MiniCalendar from '../components/MiniCalendar';
import TaskWidget from '../components/TaskWidget';
import HeadcountPopover from '../components/HeadcountPopover';
import PointeurBadge from '../components/PointeurBadge';
import { nextStatut } from '../lib/statutCycle';

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseMinutes(horaire) {
  if (!horaire) return 0;
  if (horaire.includes('h')) {
    const [h, m] = horaire.split('h');
    return parseInt(h) * 60 + (m ? parseInt(m) || 0 : 0);
  }
  if (horaire.includes(':')) {
    const [h, m] = horaire.split(':');
    return parseInt(h) * 60 + parseInt(m);
  }
  return parseInt(horaire) * 60;
}

function formatHoraire(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

const CUTOFF = 14 * 60;

const ROWS = [
  { id: 'aqua-matin',     l1: 'Aqua',    l2: 'Matin',      categorie: 'aqua',    matin: true },
  { id: 'fitness-matin',  l1: 'Fitness', l2: 'Matin',      categorie: 'fitness', matin: true },
  { id: 'aqua-apmidi',    l1: 'Aqua',    l2: 'Après-midi', categorie: 'aqua',    matin: false },
  { id: 'fitness-apmidi', l1: 'Fitness', l2: 'Après-midi', categorie: 'fitness', matin: false },
];

// ── Vue grille ─────────────────────────────────────────────────────────────────

function VueGrille({ semaine, seances, loading, today, profils, onOpenCard, onPatch, onDelete, onAdd }) {
  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <table className="w-full border-collapse table-fixed min-w-[860px] mx-4 md:mx-0">
        <colgroup>
          <col style={{ width: '72px' }} />
          {semaine.map((_, i) => <col key={i} />)}
        </colgroup>

        <thead>
          <tr>
            <th className="z-20 bg-gray-100 border border-gray-300 p-0" />
            {semaine.map((date) => {
              const iso = toISO(date);
              const isToday = iso === today;
              return (
                <th key={iso} className={`z-20 border border-gray-300 p-0 text-center ${isToday ? 'bg-sky-600' : 'bg-gray-100'}`}>
                  <div className={`px-1 py-1.5 ${isToday ? 'text-white' : 'text-gray-700'}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? 'text-sky-100' : 'text-gray-400'}`}>
                      {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </div>
                    <div className={`text-lg font-bold leading-none ${isToday ? 'text-white' : 'text-gray-800'}`}>
                      {date.getDate()}
                    </div>
                    <div className={`text-[10px] ${isToday ? 'text-sky-200' : 'text-gray-400'}`}>
                      {date.toLocaleDateString('fr-FR', { month: 'short' })}
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {ROWS.map(row => {
            const cat = CATEGORIE_CONFIG[row.categorie] || CATEGORIE_CONFIG.fitness;
            return (
            <tr key={row.id}>
              {/* Label en 2 lignes */}
              <td
                style={{ backgroundColor: cat.label }}
                className="sticky left-0 z-10 border border-gray-200 px-2 py-2 align-middle"
              >
                <div className="text-[11px] font-bold uppercase leading-tight text-white">{row.l1}</div>
                <div className="text-[10px] font-medium text-white/70 leading-tight">{row.l2}</div>
              </td>

              {semaine.map((date) => {
                const iso = toISO(date);
                const cellSeances = seances.filter(s =>
                  s.date === iso &&
                  s.categorie === row.categorie &&
                  (row.matin ? parseMinutes(s.horaire) < CUTOFF : parseMinutes(s.horaire) >= CUTOFF)
                );
                return (
                  <td key={iso} style={{ backgroundColor: cat.cell }} className="border border-gray-100 align-top p-1 min-w-[110px]">
                    <div className="space-y-1.5">
                      {loading && cellSeances.length === 0 && (
                        <div className="h-4 bg-white/60 rounded-md animate-pulse" />
                      )}
                      {cellSeances.map(s => (
                        <SeanceCard key={s.id} seance={s} profils={profils} onPatch={onPatch} onDelete={onDelete} onClick={onOpenCard} />
                      ))}
                      <button
                        onClick={() => onAdd(iso)}
                        aria-label="Ajouter une séance"
                        className="w-full flex items-center justify-center text-gray-400 hover:text-sky-600 py-0.5 hover:bg-white/70 rounded-md transition-colors"
                      ><Plus className="h-3 w-3" /></button>
                    </div>
                  </td>
                );
              })}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Vue liste ──────────────────────────────────────────────────────────────────

function VueListe({ seances, loading, profils, onOpenCard, onPatch, onDelete }) {
  if (loading) return <div className="text-center py-10 text-gray-400 text-sm">Chargement…</div>;
  if (!seances.length) return null;

  // Grouper par date pour insérer des séparateurs
  const byDate = seances.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

  const TH = 'z-20 bg-gray-100 px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide border border-gray-200';

  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <table className="w-full border-collapse text-sm min-w-[720px]">
        <thead>
          <tr>
            <th className={`${TH} text-left`}>Horaire</th>
            <th className={`${TH} text-left`}>Cours</th>
            <th className={`${TH} text-left`}>Catégorie</th>
            <th className={`${TH} text-left`}>Coach</th>
            <th className={`${TH} text-left`}>Statut</th>
            <th className={`${TH} text-center`}>Présents</th>
            <th className={`${TH} text-left`}>Pointeur</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(byDate).map(([date, rows]) => {
            const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long'
            });
            return [
              // Séparateur de jour
              <tr key={`sep-${date}`}>
                <td colSpan={7} style={{ backgroundColor: '#5bcae8' }} className="text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider capitalize">
                  {dayLabel}
                </td>
              </tr>,
              // Lignes de séances
              ...rows.map((s, i) => {
                const startMins = parseMinutes(s.horaire);
                const endMins = startMins + (s.duree_minutes || 60);
                const statut = STATUT_CONFIG[s.statut] || STATUT_CONFIG.programme;
                const isAqua = s.categorie === 'aqua';
                const sansCoach = !s.coach_prenom && !s.coach_nom;
                const bg = sansCoach ? '#fee2e2' : (i % 2 === 0 ? '#ffffff' : '#f9fafb');

                return (
                  <tr
                    key={s.id}
                    onClick={() => onOpenCard(s)}
                    style={{ backgroundColor: bg }}
                    className={`relative hover:opacity-80 cursor-pointer has-[.animate-popoverIn]:z-40
                      ${s.statut === 'annule' ? 'opacity-40' : ''}`}
                  >
                    <td className="px-3 py-1.5 border-b border-gray-100 tabular-nums text-xs text-gray-600 whitespace-nowrap">
                      {formatHoraire(startMins)} – {formatHoraire(endMins)}
                    </td>
                    <td className="px-3 py-1.5 border-b border-gray-100 font-semibold text-gray-800 text-xs">
                      {s.cours_nom}
                    </td>
                    <td className="px-3 py-1.5 border-b border-gray-100">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide
                        ${isAqua ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isAqua ? 'Aqua' : 'Fitness'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 border-b border-gray-100 text-xs text-gray-600">
                      {s.coach_prenom} {s.coach_nom}
                    </td>
                    <td className="px-3 py-1.5 border-b border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPatch(s.id, { statut: nextStatut(s.statut) });
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide hover:opacity-80 ${statut.bg} ${statut.text}`}
                      >
                        {statut.label}
                      </button>
                    </td>
                    <td className="px-3 py-1.5 border-b border-gray-100 text-center">
                      <HeadcountPopover value={s.nb_presents} onSelect={(n) => onPatch(s.id, { nb_presents: n })} />
                    </td>
                    <td className="px-3 py-1.5 border-b border-gray-100 text-xs text-gray-500">
                      <PointeurBadge
                        variant="text"
                        pointeurUserId={s.pointeur_user_id}
                        pointeurNom={s.pointeur_nom}
                        profils={profils}
                        onSelect={(id) => onPatch(s.id, { pointeur_user_id: id })}
                      />
                    </td>
                  </tr>
                );
              })
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function Planning() {
  const toast = useToast();
  const [lundi, setLundi]         = useState(() => getLundi());
  const [seances, setSeances]     = useState([]);
  const [coaches, setCoaches]     = useState([]);
  const [coursTypes, setCoursTypes] = useState([]);
  const [profils, setProfils]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [modal, setModal]         = useState(null);
  const [vue, setVue]             = useState('grille');
  const [dupliquer, setDupliquer] = useState(false);
  const [filtreCours, setFiltreCours] = useState(() => new Set());

  const semaine = getSemaine(lundi);

  const loadSeances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getSeances(toISO(lundi));
      setSeances(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [lundi]);

  useEffect(() => {
    api.getCoaches().then(setCoaches).catch(() => {});
    api.getCoursTypes().then(setCoursTypes).catch(() => {});
    api.getProfiles().then(setProfils).catch(() => {});
  }, []);

  useEffect(() => { loadSeances(); }, [loadSeances]);

  // Retire du filtre les cours qui n'ont plus lieu cette semaine (sinon un filtre actif
  // sur un cours absent de la nouvelle semaine masquerait silencieusement toute la liste).
  useEffect(() => {
    if (filtreCours.size === 0) return;
    const idsPresents = new Set(seances.map(s => s.cours_type_id));
    setFiltreCours(prev => {
      const next = new Set([...prev].filter(id => idsPresents.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seances]);

  async function handlePatch(id, data) {
    try {
      await api.patchSeance(id, data);
      loadSeances();
    } catch (e) {
      toast.error('Échec de la mise à jour : ' + e.message);
    }
  }
  async function handleDelete(id) {
    if (!confirm('Supprimer cette séance ?')) return;
    try {
      await api.deleteSeance(id);
      setSeances(prev => prev.filter(s => s.id !== id));
      toast.success('Séance supprimée');
    } catch (e) {
      toast.error('Échec de la suppression : ' + e.message);
    }
  }
  async function handleSave(payload) {
    try {
      if (modal && typeof modal === 'object') {
        await api.patchSeance(modal.id, payload);
      } else if (modal && typeof modal === 'string') {
        await api.createSeance({ ...payload, date: modal.replace('new:', '') });
      }
      setModal(null);
      loadSeances();
      toast.success('Séance enregistrée');
    } catch (e) {
      toast.error('Échec de l\'enregistrement : ' + e.message);
      throw e;
    }
  }
  async function handleDupliquer() {
    if (!confirm('Copier les cours de la semaine précédente vers cette semaine ?\n\n(Les cours déjà présents ne sont pas touchés.)')) return;
    const source = toISO(semainePrecedente(lundi));
    setDupliquer(true);
    try {
      const { count, ignores } = await api.dupliquerSemaine(source, toISO(lundi));
      await loadSeances();
      toast.success(
        count === 0
          ? 'Rien à copier (semaine précédente vide ou déjà présente).'
          : `${count} cours copié(s)${ignores ? `, ${ignores} déjà présent(s) conservé(s)` : ''}.`
      );
    } catch (e) {
      toast.error('Erreur : ' + e.message);
    } finally {
      setDupliquer(false);
    }
  }

  function toggleFiltre(id) {
    setFiltreCours(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Cours réellement présents sur la semaine affichée (évite un filtre surchargé avec
  // tout le catalogue alors qu'une poignée de cours seulement ont lieu cette semaine-là).
  const coursTypesSemaine = useMemo(() => {
    const idsPresents = new Set(seances.map(s => s.cours_type_id));
    return coursTypes.filter(ct => idsPresents.has(ct.id));
  }, [coursTypes, seances]);

  function toggleFiltreCategorie(categorie) {
    const ids = coursTypesSemaine.filter(ct => ct.categorie === categorie).map(ct => ct.id);
    setFiltreCours(prev => {
      const tousCoches = ids.length > 0 && ids.every(id => prev.has(id));
      const next = new Set(prev);
      ids.forEach(id => tousCoches ? next.delete(id) : next.add(id));
      return next;
    });
  }

  const coursTypesParCategorie = useMemo(() => {
    return coursTypesSemaine.reduce((acc, ct) => {
      (acc[ct.categorie] ||= []).push(ct);
      return acc;
    }, {});
  }, [coursTypesSemaine]);

  const filteredSeances = useMemo(
    () => (filtreCours.size === 0 ? seances : seances.filter(s => filtreCours.has(s.cours_type_id))),
    [seances, filtreCours]
  );

  const today = toISO(new Date());
  const isCurrentWeek = semaine.some(d => toISO(d) === today);
  const total     = seances.length;
  const effectues = seances.filter(s => s.statut === 'effectue' || s.statut === 'paye').length;
  const annules   = seances.filter(s => s.statut === 'annule').length;
  const seanceEnEdition = modal && typeof modal === 'object' ? modal : null;

  return (
    <div className="flex gap-4">

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="hidden lg:block w-48 flex-shrink-0">
        <MiniCalendar lundi={lundi} onSelectDate={(d) => setLundi(getLundi(d))} />

        {/* Filtrer par cours */}
        <div className="mt-3 bg-white border border-gray-200 rounded text-xs">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="font-semibold text-gray-600 text-[11px] uppercase tracking-wide">Filtrer par…</span>
            {filtreCours.size > 0 && (
              <button onClick={() => setFiltreCours(new Set())} className="text-[11px] text-sky-600 hover:underline">Tout</button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto px-3 pb-2 space-y-0.5">
            {[['aqua', 'Aqua'], ['fitness', 'Fitness']].map(([cat, label]) => {
              const items = coursTypesParCategorie[cat] || [];
              if (items.length === 0) return null;
              const tousCoches = items.every(ct => filtreCours.has(ct.id));
              return (
                <div key={cat} className="mb-1">
                  <label className="flex items-center gap-1.5 py-0.5 cursor-pointer hover:text-gray-900 text-gray-700 font-semibold">
                    <input
                      type="checkbox"
                      checked={tousCoches}
                      onChange={() => toggleFiltreCategorie(cat)}
                      className="rounded accent-sky-500"
                    />
                    <span>{label}</span>
                  </label>
                  {items.map(ct => (
                    <label key={ct.id} className="flex items-center gap-1.5 py-0.5 pl-4 cursor-pointer hover:text-gray-900 text-gray-600">
                      <input
                        type="checkbox"
                        checked={filtreCours.has(ct.id)}
                        onChange={() => toggleFiltre(ct.id)}
                        className="rounded accent-sky-500"
                      />
                      <span className="truncate">{ct.nom}</span>
                    </label>
                  ))}
                </div>
              );
            })}
            {coursTypesSemaine.length === 0 && <p className="text-gray-400 italic py-1">Aucun cours cette semaine</p>}
          </div>
        </div>

        <div className="mt-3 bg-white border border-gray-200 rounded px-3 py-2 text-xs space-y-1.5">
          <div className="font-semibold text-gray-600 text-[11px] uppercase tracking-wide mb-1">Séances</div>
          <div className="flex justify-between text-gray-600"><span>Total</span><span className="font-bold">{total}</span></div>
          <div className="flex justify-between text-green-700"><span>Effectués</span><span className="font-bold">{effectues}</span></div>
          {annules > 0 && <div className="flex justify-between text-red-600"><span>Annulés</span><span className="font-bold">{annules}</span></div>}
        </div>

        <div className="mt-3">
          <TaskWidget lundi={lundi} />
        </div>
      </aside>

      {/* ── Contenu ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">

        {/* Barre navigation */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={() => setLundi(semainePrecedente(lundi))} aria-label="Semaine précédente"
              className="flex-shrink-0 px-2.5 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded">←</button>
            <button onClick={() => setLundi(getLundi())}
              style={isCurrentWeek ? { backgroundColor: '#3D5AFE', color: '#fff' } : {}}
              className={`flex-shrink-0 px-2.5 py-1.5 text-sm font-medium rounded transition-colors ${
                isCurrentWeek ? '' : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}>Auj.</button>
            <button onClick={() => setLundi(semaineSuivante(lundi))} aria-label="Semaine suivante"
              className="flex-shrink-0 px-2.5 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded">→</button>
            <span className="ml-1 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-700">
              <span className="hidden sm:inline">
                {semaine[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                {' – '}
                {semaine[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="sm:hidden">
                {semaine[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                {' – '}
                {semaine[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            </span>
          </div>

          <button onClick={handleDupliquer} disabled={dupliquer}
            title="Copie les cours de la semaine précédente (sans écraser ceux déjà présents)"
            className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-100 text-xs font-medium rounded disabled:opacity-50">
            <Copy className="h-3.5 w-3.5" /> {dupliquer ? 'Duplication…' : 'Dupliquer'}
          </button>

          <div className="flex items-center bg-gray-100 rounded p-0.5 gap-0.5 flex-shrink-0">
            <button onClick={() => setVue('grille')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                vue === 'grille' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}><LayoutGrid className="h-3.5 w-3.5" /> Grille</button>
            <button onClick={() => setVue('liste')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                vue === 'liste' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}><List className="h-3.5 w-3.5" /> Liste</button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded px-4 py-3 text-sm text-red-700 mb-3">
            Erreur : {error} — <button onClick={loadSeances} className="underline">Réessayer</button>
          </div>
        )}

        {vue === 'grille' && (
          <VueGrille
            semaine={semaine}
            seances={filteredSeances}
            loading={loading}
            today={today}
            profils={profils}
            onOpenCard={(s) => setModal(s)}
            onPatch={handlePatch}
            onDelete={handleDelete}
            onAdd={(iso) => setModal(`new:${iso}`)}
          />
        )}

        {vue === 'liste' && (
          filteredSeances.length === 0 && !loading ? (
            <p className="text-sm text-gray-400 py-10 text-center">Aucune séance à afficher.</p>
          ) : (
            <VueListe
              seances={filteredSeances}
              loading={loading}
              profils={profils}
              onOpenCard={(s) => setModal(s)}
              onPatch={handlePatch}
              onDelete={handleDelete}
            />
          )
        )}
      </div>

      {modal !== null && (
        <SeanceModal
          seance={seanceEnEdition}
          coaches={coaches}
          coursTypes={coursTypes}
          appUsers={profils}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onCoursCreated={(ct) => setCoursTypes(prev => [...prev, ct])}
        />
      )}
    </div>
  );
}
