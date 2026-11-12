const ETAPES = [
  'Vous nous envoyez votre planning actuel (Google Sheets, Excel…).',
  'Nous préparons votre espace avec vos vrais cours et reprenons vos données.',
  'Vous jugez sur votre propre planning, sans engagement.',
];

export default function Demarrage() {
  return (
    <section id="demarrage" className="bg-cream-textured py-24 sm:py-32">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-brand-ink tracking-tight text-center mb-16">
          On le prépare avec votre vrai planning
        </h2>

        <div className="grid sm:grid-cols-3 gap-8 sm:gap-6">
          {ETAPES.map((texte, i) => (
            <div key={texte} className="text-center sm:text-left">
              <div className="h-10 w-10 rounded-full flex items-center justify-center font-mono font-semibold text-white mb-4 mx-auto sm:mx-0"
                style={{ backgroundColor: '#3D5AFE' }}>
                {i + 1}
              </div>
              <p className="text-brand-ink/70 text-sm leading-relaxed">{texte}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 card-light rounded-xl p-6 sm:p-7 max-w-2xl mx-auto text-center sm:text-left">
          <p className="font-semibold text-brand-ink mb-2">
            Un coach manque et personne n'est disponible ?
          </p>
          <p className="text-sm text-brand-ink/60">
            Flyder Talents est l'annuaire gratuit de coachs indépendants.{' '}
            <a href="https://talents.flyder.fr" target="_blank" rel="noopener noreferrer"
              className="underline text-brand-ink">
              talents.flyder.fr
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
