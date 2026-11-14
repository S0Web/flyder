import { CalendarDays, Users, FileText, Check } from 'lucide-react';
import Reveal from './Reveal';
import TitreRevele from './TitreRevele';
import Carrousel from './Carrousel';

// Mini-aperçus d'interface dessinés en CSS : ils évoquent l'appli (modules
// réunis, univers d'activité, fiches coachs) sans dépendre de captures.
const BLEU = '#3D5AFE';
const CORAIL = '#FF5A36';

// "Planning, coachs et RH réunis au même endroit" : les trois modules dans
// un seul et même panneau.
function ApercuToutEnUn() {
  const modules = [
    { icon: CalendarDays, nom: 'Planning' },
    { icon: Users, nom: 'Coachs' },
    { icon: FileText, nom: 'RH & documents' },
  ];
  return (
    <div className="w-full overflow-hidden rounded-xl border border-brand-ink/10">
      {modules.map(({ icon: Icon, nom }, i) => (
        <div key={nom} className={`flex items-center gap-3 px-3.5 py-3 ${i ? 'border-t border-brand-ink/10' : ''}`}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-ink">
            <Icon className="h-4 w-4 text-white" strokeWidth={1.75} />
          </div>
          <span className="flex-1 text-sm font-semibold text-brand-ink">{nom}</span>
          <Check className="h-4 w-4 text-brand-blue" strokeWidth={2.5} />
        </div>
      ))}
    </div>
  );
}

function ApercuUnivers() {
  const univers = [
    { nom: 'Aqua', couleur: BLEU, cours: ['Aquabike', 'Aquagym'] },
    { nom: 'Fitness', couleur: CORAIL, cours: ['Crossfit', 'Pilates'] },
  ];
  return (
    <div className="w-full space-y-2.5">
      {univers.map(u => (
        <div key={u.nom} className="flex items-stretch gap-2">
          <div className="flex w-[4.5rem] flex-shrink-0 items-center justify-center rounded-lg px-2 py-5 text-[10px] font-bold uppercase tracking-wide text-white"
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
    Apercu: ApercuToutEnUn,
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
    <section id="solutions" className="scroll-mt-24 pb-20 sm:pb-40">
      <div className="mx-auto mb-10 max-w-3xl px-5 text-center sm:mb-20 sm:px-8">
        <TitreRevele texte="Un outil qui s'adapte à votre salle, pas l'inverse"
          className="display-lg text-4xl text-brand-ink sm:text-6xl" />
        <Reveal as="p" className="mx-auto mt-6 max-w-xl text-lg text-brand-ink/60">
          Que vous gériez un studio spécialisé ou une salle multi-activités, Flyder s'organise autour de votre fonctionnement réel.
        </Reveal>
      </div>

      <Carrousel
        classeCarte="rounded-[1.75rem] bg-brand-sand p-2"
        cartes={CARDS.map(({ Apercu, title, text }) => ({
          titre: title,
          contenu: (
            <>
              <div aria-hidden="true" className="flex h-52 items-center rounded-[1.375rem] bg-white px-5 md:h-60">
                <Apercu />
              </div>
              <div className="px-5 pb-6 pt-5 md:pt-6">
                <h3 className="text-2xl font-semibold tracking-tight text-brand-ink">{title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-brand-ink/60">{text}</p>
              </div>
            </>
          ),
        }))}
      />
    </section>
  );
}
