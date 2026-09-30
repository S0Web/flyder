import { Link } from 'react-router-dom';
import { Intertitre, Marque, Lien, Rien } from './kit';
import { aujourdhuiISO, jourCourt, plageSeance } from '../../lib/equipe';

const STATUTS = {
  programme: { label: 'programmé', ton: 'gris' },
  effectue:  { label: 'effectué',  ton: 'encre' },
  paye:      { label: 'payé',      ton: 'encre' },
};

// Cours du salarié qui est aussi coach : ils apparaissent dans sa journée à côté de ses
// tâches (le planning des cours reste la référence, on n'y modifie rien d'ici).
export default function MesCours({ cours }) {
  if (!Array.isArray(cours)) return null;
  const auj = aujourdhuiISO();

  return (
    <div className="mb-8" data-testid="mes-cours">
      <Intertitre actions={<Lien as={Link} to="/">planning des cours</Lien>}>Mes cours</Intertitre>
      {cours.length === 0 ? (
        <Rien>aucun cours cette semaine</Rien>
      ) : (
        <ul className="bg-white border-y border-brand-ink/10 divide-y divide-brand-ink/[0.07]">
          {cours.map(c => {
            const statut = STATUTS[c.statut] || STATUTS.programme;
            return (
              <li key={c.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3">
                <span className={`font-mono text-[11px] w-24 ${c.date === auj ? 'text-fitness font-semibold' : 'text-gray-500'}`}>
                  {c.date === auj ? "aujourd'hui" : jourCourt(c.date)}
                </span>
                <span className="font-mono text-xs tabular-nums text-brand-ink w-28">{plageSeance(c.horaire, c.duree_minutes)}</span>
                <span className="flex-1 min-w-[140px] text-sm text-brand-ink">{c.cours_nom}</span>
                {c.nb_presents != null && (
                  <span className="font-mono text-[11px] text-gray-500 tabular-nums">
                    {c.nb_presents}{c.capacite ? `/${c.capacite}` : ''} présents
                  </span>
                )}
                <Marque ton={statut.ton}>{statut.label}</Marque>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
