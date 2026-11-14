// Bandeau défilant en continu sous le hero. Les chiffres viennent de la salle
// Fitnessmov (temps hebdomadaire passé sur le planning, estimé par sa
// direction) — ne pas en ajouter qui ne soient pas mesurés quelque part.
const ITEMS = [
  { fort: '4 fois moins de temps', texte: 'passé sur le planning' },
  { fort: 'Depuis juin 2026', texte: 'utilisé chaque jour en salle' },
  { fort: '« J’ai arrêté de recompter mes cours. »', texte: 'Djamel, gérant de Fitnessmov' },
  { fort: 'Une alerte', texte: 'dès qu’un cours n’a plus de coach' },
  { fort: 'Zéro ressaisie', texte: 'on reprend votre planning Excel ou Google Sheets' },
];

function Piste({ cache = false }) {
  return (
    <ul aria-hidden={cache || undefined} className="bandeau-piste flex flex-shrink-0 items-center">
      {ITEMS.map(({ fort, texte }) => (
        <li key={fort} className="flex items-center whitespace-nowrap">
          <span className="font-display text-lg font-semibold tracking-tight text-brand-ink sm:text-xl">{fort}</span>
          <span className="ml-2.5 text-sm text-brand-ink/55 sm:text-base">{texte}</span>
          <span aria-hidden="true" className="mx-7 h-1.5 w-1.5 rounded-full bg-brand-blue sm:mx-10" />
        </li>
      ))}
    </ul>
  );
}

export default function Bandeau() {
  return (
    <section aria-label="Flyder en quelques chiffres" className="pt-12 sm:pt-20">
      <div className="bandeau flex overflow-hidden border-y border-brand-ink/[0.08] py-5 sm:py-6">
        <Piste />
        {/* Copie identique, masquée aux lecteurs d'écran, pour boucler sans raccord. */}
        <Piste cache />
      </div>
      <p className="mt-3 px-5 text-center text-xs text-brand-ink/40">
        Chiffres de la salle Fitnessmov, estimés par sa direction.
      </p>
    </section>
  );
}
