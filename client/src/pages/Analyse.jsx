import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Calendar, CalendarRange, Infinity as InfinityIcon,
  Sparkles, TrendingUp, Clock, Dumbbell, Users, ShieldAlert,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  getAcademicYear, periodeLabel, previousPeriodRange, fmtDateFr, ANNEES_DISPONIBLES,
} from '../lib/periodes';
import {
  ChartCard, LegendItem, LineChart, ColumnChart, HBarChart,
  Heatmap, RampLegend, ScatterChart, SplitBar, StatTile,
} from '../components/Charts';
import {
  VIZ, CAT_COLOR, CAT_LABEL, fmtInt, fmtDec, fmtPct, moisCourt, JOURS_COURTS, JOURS_LONGS,
} from '../lib/chartTheme';

// ── Sections de la page ────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'essentiel',     label: "L'essentiel",   Icon: Sparkles },
  { id: 'evolution',     label: 'Évolution',     Icon: TrendingUp },
  { id: 'frequentation', label: 'Fréquentation', Icon: Clock },
  { id: 'cours',         label: 'Cours',         Icon: Dumbbell },
  { id: 'coachs',        label: 'Coachs',        Icon: Users },
  { id: 'qualite',       label: 'Qualité',       Icon: ShieldAlert },
];

// Métriques du graphique d'évolution. Un sélecteur plutôt que plusieurs courbes
// superposées : des séances (unités) et des participants (dizaines) n'ont pas le
// même ordre de grandeur, et les empiler sur deux axes inventerait une corrélation.
const METRIQUES = [
  { key: 'effectues',     label: 'Séances',       fmt: fmtInt, get: m => m.effectues },
  { key: 'participants',  label: 'Participants',  fmt: fmtInt, get: m => m.participants },
  { key: 'heures',        label: 'Heures',        fmt: fmtInt, get: m => Math.round((m.minutes || 0) / 60) },
  { key: 'effectif_moyen',label: 'Effectif moyen',fmt: v => fmtDec(v), get: m => m.effectif_moyen },
];

function SectionTitle({ id, Icon, children, sub }) {
  return (
    <div id={id} className="scroll-mt-24 flex items-start gap-2.5 mt-8 mb-3 first:mt-0">
      <span className="mt-0.5 h-7 w-7 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-sky-600" strokeWidth={2} />
      </span>
      <div>
        <h2 className="text-base font-bold text-brand-ink leading-tight">{children}</h2>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Segmented({ value, onChange, options, size = 'sm' }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-colors active:scale-[0.97] ${
            size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-sm'
          } ${value === o.value ? 'bg-white text-sky-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {o.Icon && <o.Icon size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Analyse() {
  const [periodeMode, setPeriodeMode]     = useState('scolaire');
  const [anneeScolaire, setAnneeScolaire] = useState(() => getAcademicYear().year);
  const [plageDebut, setPlageDebut]       = useState(() => getAcademicYear().debut);
  const [plageFin, setPlageFin]           = useState(() => getAcademicYear().fin);
  const [categorie, setCategorie]         = useState('');

  const [data, setData]   = useState(null);
  const [prev, setPrev]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const reqIdRef = useRef(0);

  const [metrique, setMetrique]   = useState('participants');
  const [heatMode, setHeatMode]   = useState('effectif_moyen');
  const [activeSection, setActiveSection] = useState('essentiel');

  const params = useMemo(() => {
    const base = periodeMode === 'tout' ? { periode: 'tout' }
      : periodeMode === 'scolaire' ? { debut: `${anneeScolaire}-09-01`, fin: `${anneeScolaire + 1}-08-31` }
      : { debut: plageDebut, fin: plageFin };
    return categorie ? { ...base, categorie } : base;
  }, [periodeMode, anneeScolaire, plageDebut, plageFin, categorie]);

  const load = useCallback(async () => {
    const myId = ++reqIdRef.current;
    setRefreshing(true);
    setError(null);
    try {
      const prevRange = params.periode === 'tout' ? null : previousPeriodRange(params.debut, params.fin);
      const [cur, pr] = await Promise.all([
        api.getAnalytics(params),
        prevRange ? api.getAnalytics({ ...prevRange, ...(categorie ? { categorie } : {}) }) : Promise.resolve(null),
      ]);
      if (myId !== reqIdRef.current) return; // une requête plus récente a pris la main
      setData(cur);
      setPrev(pr);
    } catch (e) {
      if (myId === reqIdRef.current) setError(e.message);
    } finally {
      if (myId === reqIdRef.current) { setRefreshing(false); setLoading(false); }
    }
  }, [params, categorie]);

  useEffect(() => { load(); }, [load]);

  // Surlignage de la section courante dans la barre de navigation.
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-100px 0px -60% 0px' }
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [loading]);

  // ── Données dérivées ─────────────────────────────────────────────
  const k     = data?.kpi;
  const kPrev = prev?.kpi;
  // Mémorisés : `data?.x || []` crée un tableau neuf à chaque rendu, ce qui
  // invaliderait tous les useMemo qui en dépendent (et les recalculerait pour rien).
  const mensuel = useMemo(() => data?.mensuel || [], [data]);
  const cours   = useMemo(() => data?.cours   || [], [data]);
  const coachs  = useMemo(() => data?.coachs  || [], [data]);

  const agg = useMemo(() => {
    const of = (kk) => kk && ({
      effectues:      kk.effectues || 0,
      participants:   kk.participants || 0,
      heures:         (kk.minutes || 0) / 60,
      effectifMoyen:  kk.effectif_moyen,
      tauxAnnulation: kk.programmes ? (kk.annules / kk.programmes) * 100 : null,
    });
    return { cur: of(k), prev: of(kPrev) };
  }, [k, kPrev]);

  const delta = (key) => {
    const c = agg.cur?.[key], p = agg.prev?.[key];
    if (c == null || p == null || !p) return null;
    return ((c - p) / p) * 100;
  };

  const serieMensuelle = useMemo(() => {
    const def = METRIQUES.find(m => m.key === metrique);
    return mensuel.map(m => ({ label: moisCourt(m.mois), mois: m.mois, value: def.get(m) ?? 0 }));
  }, [mensuel, metrique]);

  const serieCategorie = useMemo(() => {
    const byMois = new Map();
    for (const r of data?.mensuelCategorie || []) {
      if (!byMois.has(r.mois)) byMois.set(r.mois, { label: moisCourt(r.mois), mois: r.mois, aqua: 0, fitness: 0 });
      byMois.get(r.mois)[r.categorie] = r.participants || 0;
    }
    return [...byMois.values()].sort((a, b) => a.mois.localeCompare(b.mois));
  }, [data]);

  const heures = useMemo(() => {
    const set = new Set((data?.heatmap || []).map(c => c.heure));
    return [...set].sort((a, b) => a - b);
  }, [data]);

  const heatCells = useMemo(() => (data?.heatmap || []).map(c => ({
    jour: c.jour, heure: c.heure, effectues: c.effectues,
    value: heatMode === 'effectif_moyen' ? c.effectif_moyen : c.effectues,
  })), [data, heatMode]);

  const parJour = useMemo(() => {
    const by = new Map((data?.parJour || []).map(r => [r.jour, r]));
    return [1, 2, 3, 4, 5, 6, 0].map(j => {
      const r = by.get(j);
      return {
        label: JOURS_COURTS[j], full: JOURS_LONGS[j],
        value: r?.effectif_moyen ?? 0,
        seances: r?.effectues ?? 0,
      };
    });
  }, [data]);

  const parHeure = useMemo(() => (data?.parHeure || []).map(r => ({
    label: `${r.heure}h`, full: `${r.heure}h – ${r.heure + 1}h`,
    value: r.effectif_moyen ?? 0, seances: r.effectues ?? 0,
  })), [data]);

  const topCoursParticipants = useMemo(
    () => [...cours].filter(c => c.effectues > 0)
      .sort((a, b) => (b.participants || 0) - (a.participants || 0)).slice(0, 10)
      .map(c => ({ label: c.nom, value: c.participants || 0, color: CAT_COLOR[c.categorie], meta: c })),
    [cours]);

  const nuageCours = useMemo(
    () => cours.filter(c => c.effectues >= 3 && c.effectif_moyen != null)
      .map(c => ({ label: c.nom, x: c.effectues, y: c.effectif_moyen, color: CAT_COLOR[c.categorie] })),
    [cours]);

  const topCoachsHeures = useMemo(
    () => [...coachs].sort((a, b) => (b.minutes || 0) - (a.minutes || 0)).slice(0, 10)
      .map(c => ({ label: c.coach, value: Math.round((c.minutes || 0) / 60), meta: c })),
    [coachs]);

  const annulationsMensuelles = useMemo(() => mensuel.map(m => ({
    label: moisCourt(m.mois),
    value: m.programmes ? (m.annules / m.programmes) * 100 : 0,
    annules: m.annules, programmes: m.programmes,
  })), [mensuel]);

  const topAnnules = useMemo(
    () => [...cours].filter(c => c.annules > 0)
      .sort((a, b) => (b.annules / b.programmes) - (a.annules / a.programmes)).slice(0, 8)
      .map(c => ({ label: c.nom, value: (c.annules / c.programmes) * 100, color: VIZ.critical, meta: c })),
    [cours]);

  const distribution = useMemo(() => {
    const ordre = ['0', '1-4', '5-9', '10-14', '15-19', '20+'];
    const by = new Map((data?.distribution || []).map(d => [d.tranche, d.seances]));
    return ordre.map(t => ({ label: t, full: `${t} participants`, value: by.get(t) || 0 }));
  }, [data]);

  const categories = data?.categories || [];
  const segments = ['aqua', 'fitness']
    .map(c => categories.find(x => x.categorie === c))
    .filter(Boolean)
    .map(c => ({ label: CAT_LABEL[c.categorie], value: c.participants || 0, color: CAT_COLOR[c.categorie] }));

  const sparkOf = (get) => mensuel.slice(-12).map(get);
  const metriqueDef = METRIQUES.find(m => m.key === metrique);
  const prevRange = params.periode === 'tout' ? null : previousPeriodRange(params.debut, params.fin);

  if (loading) {
    return <div className="text-center py-20 text-gray-400 text-sm">Chargement des analyses…</div>;
  }

  return (
    <div className="pb-10">
      {/* ── En-tête + filtres ───────────────────────────────────── */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-brand-ink">Analyse</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {periodeLabel(periodeMode, anneeScolaire, plageDebut, plageFin)}
          {categorie && ` · ${CAT_LABEL[categorie]}`}
          {prevRange && <span className="text-gray-400"> — comparé à {fmtDateFr(prevRange.debut)} → {fmtDateFr(prevRange.fin)}</span>}
        </p>
      </div>

      <div className="sticky top-14 lg:top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-brand-cream/95 backdrop-blur border-b border-gray-200 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={periodeMode} onChange={setPeriodeMode} size="md"
            options={[
              { value: 'scolaire', label: 'Année scolaire',   Icon: Calendar },
              { value: 'plage',    label: 'Plage',            Icon: CalendarRange },
              { value: 'tout',     label: 'Tout l\'historique', Icon: InfinityIcon },
            ]}
          />
          {periodeMode === 'scolaire' && (
            <select value={anneeScolaire} onChange={e => setAnneeScolaire(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-300">
              {ANNEES_DISPONIBLES.map(y => <option key={y} value={y}>{y}–{y + 1}</option>)}
            </select>
          )}
          {periodeMode === 'plage' && (
            <div className="inline-flex items-center gap-1.5">
              <input type="date" value={plageDebut} onChange={e => setPlageDebut(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-300" />
              <span className="text-gray-400 text-sm">→</span>
              <input type="date" value={plageFin} onChange={e => setPlageFin(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-300" />
            </div>
          )}

          <span className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

          <Segmented
            value={categorie} onChange={setCategorie} size="md"
            options={[
              { value: '',        label: 'Tous les cours' },
              { value: 'aqua',    label: 'Aqua' },
              { value: 'fitness', label: 'Fitness' },
            ]}
          />

          <div className="flex-1" />

          <nav className="hidden xl:flex items-center gap-0.5">
            {SECTIONS.map(s => (
              <button key={s.id}
                onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  activeSection === s.id ? 'bg-brand-ink text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}>
                {s.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4">
          Erreur : {error} — <button onClick={load} className="underline">Réessayer</button>
        </div>
      )}

      <div className={`transition-opacity duration-200 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>

        {/* ══ 1. L'essentiel ══════════════════════════════════════ */}
        <SectionTitle id="essentiel" Icon={Sparkles} sub="Les cinq chiffres qui résument la période, avec l'écart par rapport à la période précédente.">
          L'essentiel
        </SectionTitle>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <StatTile label="Séances effectuées" value={fmtInt(agg.cur?.effectues)} delta={delta('effectues')}
            spark={sparkOf(m => m.effectues)} />
          <StatTile label="Participants" value={fmtInt(agg.cur?.participants)} delta={delta('participants')}
            spark={sparkOf(m => m.participants)} />
          <StatTile label="Heures de cours" value={`${fmtInt(agg.cur?.heures)} h`} delta={delta('heures')}
            spark={sparkOf(m => (m.minutes || 0) / 60)} />
          <StatTile label="Effectif moyen" value={fmtDec(agg.cur?.effectifMoyen)} delta={delta('effectifMoyen')}
            spark={sparkOf(m => m.effectif_moyen || 0)} hint="participants par séance" />
          <StatTile label="Taux d'annulation" value={fmtPct(agg.cur?.tauxAnnulation)} delta={delta('tauxAnnulation')}
            invert spark={sparkOf(m => (m.programmes ? (m.annules / m.programmes) * 100 : 0))} sparkColor={VIZ.critical} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          <StatTile label="Cours au catalogue" value={fmtInt(k?.cours_distincts)} hint="types de cours donnés" />
          <StatTile label="Coachs actifs" value={fmtInt(k?.coachs_actifs)} hint="ont assuré au moins un cours" />
          <StatTile label="Séances programmées" value={fmtInt(k?.programmes)} hint="effectuées + annulées + à venir" />
          <StatTile label="Séances sans coach" value={fmtInt(k?.sans_coach)}
            hint={k?.sans_coach ? 'à attribuer' : 'tout est attribué'} />
        </div>

        {/* ══ 2. Évolution ════════════════════════════════════════ */}
        <SectionTitle id="evolution" Icon={TrendingUp} sub="Comment l'activité bouge mois après mois.">
          Évolution dans le temps
        </SectionTitle>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <ChartCard
            className="xl:col-span-2"
            title="Comment la fréquentation évolue-t-elle&nbsp;?"
            hint="Choisis la mesure à suivre. Une courbe qui monte régulièrement = activité en croissance ; des creux marqués correspondent souvent aux vacances scolaires."
            actions={<Segmented value={metrique} onChange={setMetrique}
              options={METRIQUES.map(m => ({ value: m.key, label: m.label }))} />}
            table={{
              head: ['Mois', metriqueDef.label],
              rows: serieMensuelle.map(r => [r.label, metriqueDef.fmt(r.value)]),
            }}
          >
            <LineChart
              data={serieMensuelle}
              series={[{ key: 'value', label: metriqueDef.label, color: VIZ.aqua }]}
              yFmt={metriqueDef.fmt}
              height={250}
            />
          </ChartCard>

          <ChartCard
            title="Aqua ou Fitness&nbsp;: qui tire l'activité&nbsp;?"
            hint="Participants par mois dans chaque univers. Un écart qui se creuse indique où se déplace la demande."
            legend={<>
              <LegendItem color={VIZ.aqua} label="Aqua" />
              <LegendItem color={VIZ.fitness} label="Fitness" />
            </>}
            table={{
              head: ['Mois', 'Aqua', 'Fitness'],
              rows: serieCategorie.map(r => [r.label, fmtInt(r.aqua), fmtInt(r.fitness)]),
            }}
          >
            <LineChart
              data={serieCategorie}
              series={[
                { key: 'aqua', label: 'Aqua', color: VIZ.aqua },
                { key: 'fitness', label: 'Fitness', color: VIZ.fitness },
              ]}
              height={250}
            />
          </ChartCard>
        </div>

        {/* ══ 3. Fréquentation ════════════════════════════════════ */}
        <SectionTitle id="frequentation" Icon={Clock} sub="Les moments où la salle se remplit — et ceux où elle tourne à vide.">
          Quand la salle tourne-t-elle&nbsp;?
        </SectionTitle>

        <ChartCard
          title="La carte des créneaux"
          hint="Chaque case = un créneau. Plus elle est foncée, plus il est rempli. Les cases pâles ou vides sont des créneaux à questionner : soit ils manquent de monde, soit ils n'existent pas encore."
          actions={<Segmented value={heatMode} onChange={setHeatMode}
            options={[
              { value: 'effectif_moyen', label: 'Effectif moyen' },
              { value: 'effectues', label: 'Nb de séances' },
            ]} />}
          legend={<RampLegend
            maxVal={Math.max(...heatCells.map(c => c.value ?? 0), 1)}
            label={heatMode === 'effectif_moyen' ? 'Effectif moyen' : 'Séances'}
            fmt={heatMode === 'effectif_moyen' ? (v => fmtDec(v)) : fmtInt}
          />}
          table={{
            head: ['Créneau', 'Séances', 'Effectif moyen'],
            rows: [...heatCells]
              .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 25)
              .map(c => [`${JOURS_LONGS[c.jour]} ${c.heure}h`, fmtInt(c.effectues), fmtDec(c.value)]),
          }}
        >
          <Heatmap cells={heatCells} hours={heures}
            valueFmt={heatMode === 'effectif_moyen' ? (v => `${fmtDec(v)} pers./séance`) : (v => `${fmtInt(v)} séances`)} />
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <ChartCard
            title="Quels jours remplissent le mieux&nbsp;?"
            hint="Effectif moyen par séance selon le jour. Un jour haut avec peu de séances = potentiel à exploiter."
            table={{
              head: ['Jour', 'Effectif moyen', 'Séances'],
              rows: parJour.map(r => [r.full, fmtDec(r.value), fmtInt(r.seances)]),
            }}
          >
            <ColumnChart data={parJour} color={VIZ.aqua} yFmt={v => fmtDec(v, 0)} height={200}
              tipExtra={d => `${fmtInt(d.seances)} séances`} />
          </ChartCard>

          <ChartCard
            title="Quels horaires remplissent le mieux&nbsp;?"
            hint="Même lecture, par heure de début. Compare la hauteur (remplissage) au nombre de séances dans l'info-bulle : un pic sur peu de séances mérite d'être testé plus souvent."
            table={{
              head: ['Créneau', 'Effectif moyen', 'Séances'],
              rows: parHeure.map(r => [r.full, fmtDec(r.value), fmtInt(r.seances)]),
            }}
          >
            <ColumnChart data={parHeure} color={VIZ.aqua} yFmt={v => fmtDec(v, 0)} height={200}
              tipExtra={d => `${fmtInt(d.seances)} séances`} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <ChartCard
            title="Les séances sont-elles bien remplies&nbsp;?"
            hint="Répartition des séances par nombre de participants. Une moyenne de 10 peut cacher « toujours 10 » comme « moitié vides, moitié pleines » — c'est ce graphique qui tranche."
            table={{
              head: ['Participants', 'Séances'],
              rows: distribution.map(r => [r.full, fmtInt(r.value)]),
            }}
          >
            <ColumnChart data={distribution} color={VIZ.aqua} height={200} />
          </ChartCard>

          <ChartCard
            title="Aqua / Fitness — la part de chacun"
            hint="Répartition des participants sur la période."
            table={{
              head: ['Univers', 'Participants', 'Séances', 'Effectif moyen'],
              rows: categories.map(c => [CAT_LABEL[c.categorie], fmtInt(c.participants), fmtInt(c.effectues), fmtDec(c.effectif_moyen)]),
            }}
          >
            <div className="pt-2">
              <SplitBar segments={segments} />
              <div className="grid grid-cols-2 gap-3 mt-5">
                {categories.map(c => (
                  <div key={c.categorie} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: CAT_COLOR[c.categorie] }} />
                      {CAT_LABEL[c.categorie]}
                    </div>
                    <div className="text-lg font-extrabold text-brand-ink mt-1">{fmtDec(c.effectif_moyen)}</div>
                    <div className="text-[11px] text-gray-500">pers./séance · {fmtInt(c.effectues)} séances</div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* ══ 4. Cours ════════════════════════════════════════════ */}
        <SectionTitle id="cours" Icon={Dumbbell} sub="Ce qui marche, ce qui mérite plus de créneaux, ce qui s'essouffle.">
          Les cours
        </SectionTitle>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            title="Les cours qui rassemblent le plus"
            hint="Total de participants sur la période. La couleur indique l'univers : bleu pour l'aqua, corail pour le fitness."
            legend={<>
              <LegendItem color={VIZ.aqua} label="Aqua" shape="square" />
              <LegendItem color={VIZ.fitness} label="Fitness" shape="square" />
            </>}
            table={{
              head: ['Cours', 'Participants', 'Séances', 'Effectif moyen'],
              rows: topCoursParticipants.map(r => [r.label, fmtInt(r.value), fmtInt(r.meta.effectues), fmtDec(r.meta.effectif_moyen)]),
            }}
          >
            <HBarChart data={topCoursParticipants} valueFmt={fmtInt}
              tipExtra={d => `${fmtInt(d.meta.effectues)} séances · ${fmtDec(d.meta.effectif_moyen)} pers./séance`} />
          </ChartCard>

          <ChartCard
            title="Quels cours programmer davantage&nbsp;?"
            hint="Chaque point est un cours (3 séances minimum). En haut à gauche : peu programmés mais toujours pleins — les meilleurs candidats à un créneau de plus. En bas à droite : souvent programmés mais peu remplis."
            legend={<>
              <LegendItem color={VIZ.aqua} label="Aqua" shape="square" />
              <LegendItem color={VIZ.fitness} label="Fitness" shape="square" />
            </>}
            table={{
              head: ['Cours', 'Séances', 'Effectif moyen'],
              rows: [...nuageCours].sort((a, b) => b.y - a.y).map(p => [p.label, fmtInt(p.x), fmtDec(p.y)]),
            }}
          >
            <ScatterChart points={nuageCours} xLabel="Nombre de séances" yLabel="Effectif moyen" height={300} />
          </ChartCard>
        </div>

        {/* ══ 5. Coachs ═══════════════════════════════════════════ */}
        <SectionTitle id="coachs" Icon={Users} sub="Charge de travail et remplissage par intervenant.">
          Les coachs
        </SectionTitle>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            title="Qui assure le plus d'heures&nbsp;?"
            hint="Heures réellement effectuées sur la période (les séances annulées ne comptent pas)."
            table={{
              head: ['Coach', 'Heures', 'Séances', 'Effectif moyen'],
              rows: topCoachsHeures.map(r => [r.label, fmtInt(r.value), fmtInt(r.meta.effectues), fmtDec(r.meta.effectif_moyen)]),
            }}
          >
            <HBarChart data={topCoachsHeures} valueFmt={v => `${fmtInt(v)} h`}
              tipExtra={d => `${fmtInt(d.meta.effectues)} séances · ${fmtDec(d.meta.effectif_moyen)} pers./séance`} />
          </ChartCard>

          <ChartCard
            title="Qui remplit le mieux ses séances&nbsp;?"
            hint="Effectif moyen par séance. À lire avec le nombre de séances : une moyenne élevée sur 3 séances ne vaut pas la même chose que sur 100. Le type de cours pèse aussi — un aquabike ne se remplit pas comme un pilates."
            table={{
              head: ['Coach', 'Effectif moyen', 'Séances'],
              rows: [...coachs].filter(c => c.effectues >= 5 && c.effectif_moyen != null)
                .sort((a, b) => b.effectif_moyen - a.effectif_moyen)
                .map(c => [c.coach, fmtDec(c.effectif_moyen), fmtInt(c.effectues)]),
            }}
          >
            <HBarChart
              data={[...coachs].filter(c => c.effectues >= 5 && c.effectif_moyen != null)
                .sort((a, b) => b.effectif_moyen - a.effectif_moyen).slice(0, 10)
                .map(c => ({ label: c.coach, value: c.effectif_moyen, meta: c }))}
              valueFmt={v => fmtDec(v)}
              tipExtra={d => `${fmtInt(d.meta.effectues)} séances assurées`} />
          </ChartCard>
        </div>

        {/* ══ 6. Qualité ══════════════════════════════════════════ */}
        <SectionTitle id="qualite" Icon={ShieldAlert} sub="Les annulations : combien, quand, sur quels cours.">
          Fiabilité du planning
        </SectionTitle>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            title="Le taux d'annulation se dégrade-t-il&nbsp;?"
            hint="Part des séances annulées chaque mois. Une barre isolée peut être un aléa (météo, travaux) ; c'est la tendance sur plusieurs mois qui compte."
            table={{
              head: ['Mois', "Taux d'annulation", 'Annulées', 'Programmées'],
              rows: annulationsMensuelles.map(r => [r.label, fmtPct(r.value), fmtInt(r.annules), fmtInt(r.programmes)]),
            }}
          >
            <ColumnChart data={annulationsMensuelles} color={VIZ.critical}
              yFmt={v => `${Math.round(v)} %`} height={210}
              tipExtra={d => `${fmtInt(d.annules)} annulées sur ${fmtInt(d.programmes)}`} />
          </ChartCard>

          <ChartCard
            title="Quels cours sont le plus souvent annulés&nbsp;?"
            hint="En pourcentage de leurs séances programmées — pas en volume, sinon les cours les plus fréquents sortiraient toujours en tête."
            table={{
              head: ['Cours', "Taux d'annulation", 'Annulées', 'Programmées'],
              rows: topAnnules.map(r => [r.label, fmtPct(r.value), fmtInt(r.meta.annules), fmtInt(r.meta.programmes)]),
            }}
          >
            <HBarChart data={topAnnules} color={VIZ.critical} valueFmt={v => fmtPct(v, 0)}
              tipExtra={d => `${fmtInt(d.meta.annules)} annulées sur ${fmtInt(d.meta.programmes)} programmées`} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
