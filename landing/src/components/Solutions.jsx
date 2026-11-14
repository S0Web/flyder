import Reveal from './Reveal';

// Mini-aperçus d'interface dessinés en CSS : ils évoquent l'appli (grille de
// planning, univers d'activité, fiches coachs) sans dépendre de captures.
const BLEU = '#3D5AFE';
const CORAIL = '#FF5A36';
const ENCRE = '#12162B';

function ApercuPlanning() {
  // 5 jours × 3 créneaux ; null = créneau libre.
  const grille = [
    [BLEU, null, CORAIL, BLEU, null],
    [CORAIL, BLEU, null, CORAIL, BLEU],
    [null, CORAIL, BLEU, null, CORAIL],
  ];
  return (
    <div className="w-full">
      <div className="mb-2 grid grid-cols-5 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-brand-ink/40">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'].map(j => <span key={j}>{j}</span>)}
      </div>
      <div className="space-y-1.5">
        {grille.map((ligne, i) => (
          <div key={i} className="grid grid-cols-5 gap-1.5">
            {ligne.map((c, j) => (
              <div key={j} className="h-11 rounded-lg border-l-[3px]"
                style={c
                  ? { backgroundColor: `${c}1F`, borderColor: c }
                  : { backgroundColor: 'rgba(18,22,43,0.04)', borderColor: 'transparent' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ApercuUnivers() {
  const univers = [
    { nom: 'Aqua', couleur: BLEU, cours: ['Aquabike', 'Aquagym'] },
    { nom: 'Fitness', couleur: CORAIL, cours: ['Crossfit', 'Pilates'] },
    { nom: 'Cours co', couleur: ENCRE, cours: ['Bodypump', 'Boxe'] },
  ];
  return (
    <div className="w-full space-y-2">
      {univers.map(u => (
        <div key={u.nom} className="flex items-stretch gap-2">
          <div className="flex w-[4.5rem] flex-shrink-0 items-center justify-center rounded-lg px-2 py-3 text-[10px] font-bold uppercase tracking-wide text-white"
            style={{ backgroundColor: u.couleur }}>
            {u.nom}
          </div>
          <div className="flex flex-1 items-center gap-1.5 overflow-hidden rounded-lg px-2" style={{ backgroundColor: `${u.couleur}14` }}>
            {u.cours.map(c => (
              <span key={c} className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-brand-ink/75 shadow-sm">{c}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ApercuCoachs() {
  const coachs = [
    { initiales: 'CB', heures: '32 h', part: '88%' },
    { initiales: 'NL', heures: '26 h', part: '70%' },
    { initiales: 'ZL', heures: '18 h', part: '48%' },
  ];
  return (
    <div className="w-full space-y-2">
      {coachs.map(c => (
        <div key={c.initiales} className="flex items-center gap-3 rounded-xl bg-brand-ink/[0.04] px-3 py-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-ink text-[10px] font-bold text-white">
            {c.initiales}
          </div>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-ink/10">
            <div className="h-full rounded-full bg-brand-blue" style={{ width: c.part }} />
          </div>
          <span className="w-9 text-right text-[11px] font-semibold tabular-nums text-brand-ink/70">{c.heures}</span>
        </div>
      ))}
    </div>
  );
}

const CARDS = [
  {
    Apercu: ApercuPlanning,
    title: 'Salles indépendantes',
    text: "Un outil taillé pour votre quotidien, sans fonctionnalités superflues à payer en trop. Planning, coachs et RH réunis au même endroit.",
  },
  {
    Apercu: ApercuUnivers,
    title: 'Studios spécialisés',
    text: "Aqua, fitness, cours collectifs — organisez plusieurs univers d'activité dans un planning unique, clair pour vos coachs comme pour vous.",
  },
  {
    Apercu: ApercuCoachs,
    title: 'Équipes de coachs',
    text: "Heures, présences, documents administratifs : chaque coach a sa fiche, chaque salle garde une vue d'ensemble à jour en permanence.",
  },
];

export default function Solutions() {
  return (
    <section id="solutions" className="scroll-mt-24 pb-28 sm:pb-40">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto mb-14 max-w-3xl text-center sm:mb-20">
          <h2 className="display-lg text-4xl text-brand-ink sm:text-6xl">
            Un outil qui s'adapte à votre salle, pas l'inverse
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-brand-ink/60">
            Que vous gériez un studio spécialisé ou une salle multi-activités, Flyder s'organise autour de votre fonctionnement réel.
          </p>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-3">
          {CARDS.map(({ Apercu, title, text }, i) => (
            <Reveal key={title} delay={i * 120} className="flex flex-col rounded-[1.75rem] bg-brand-sand p-2">
              <div aria-hidden="true" className="flex h-60 items-center rounded-[1.375rem] bg-white px-5">
                <Apercu />
              </div>
              <div className="px-5 pb-6 pt-6">
                <h3 className="text-2xl font-semibold tracking-tight text-brand-ink">{title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-brand-ink/60">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
