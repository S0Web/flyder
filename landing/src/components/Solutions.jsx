import { Dumbbell, Waves, Users } from 'lucide-react';

const CARDS = [
  {
    icon: Dumbbell,
    title: 'Salles indépendantes',
    text: "Un outil taillé pour votre quotidien, sans fonctionnalités superflues à payer en trop. Planning, coachs et RH réunis au même endroit.",
  },
  {
    icon: Waves,
    title: 'Studios spécialisés',
    text: "Aqua, fitness, cours collectifs — organisez plusieurs univers d'activité dans un planning unique, clair pour vos coachs comme pour vous.",
  },
  {
    icon: Users,
    title: 'Équipes de coachs',
    text: "Heures, présences, documents administratifs : chaque coach a sa fiche, chaque salle garde une vue d'ensemble à jour en permanence.",
  },
];

export default function Solutions() {
  return (
    <section id="solutions" className="bg-brand-cream py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-brand-ink tracking-tight">
            Un outil qui s'adapte à votre salle, pas l'inverse
          </h2>
          <p className="mt-4 text-brand-ink/60">
            Que vous gériez un studio spécialisé ou une salle multi-activités, Flyder s'organise autour de votre fonctionnement réel.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          {CARDS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl p-7 text-brand-cream" style={{ backgroundColor: '#12162B' }}>
              <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-5" style={{ backgroundColor: '#3D5AFE' }}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">{title}</h3>
              <p className="text-sm text-brand-cream/60 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
