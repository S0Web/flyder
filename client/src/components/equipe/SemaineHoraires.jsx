import { useMemo } from 'react';
import { getLundi, getSemaine, toISO } from '../../lib/utils';
import { TYPES_ABSENCE, fmtHeure, fmtDuree, minutesCreneau, aujourdhuiISO } from '../../lib/equipe';

// Bande des 7 jours de la semaine courante pour une personne, séparés par des
// filets comme les colonnes d'un planning papier. Aujourd'hui est en négatif ;
// les absences sont hachurées. `creneaux` = lignes personnel_creneaux de la semaine.
export default function SemaineHoraires({ creneaux }) {
  const jours = useMemo(() => getSemaine(getLundi()).map(d => toISO(d)), []);
  const auj = aujourdhuiISO();
  const total = creneaux.filter(c => c.type === 'travail').reduce((s, c) => s + minutesCreneau(c), 0);

  return (
    <div>
      <div className="grid grid-cols-7 border border-brand-ink/15 rounded-[3px] overflow-hidden bg-white">
        {jours.map(iso => {
          const duJour = creneaux.filter(c => c.date === iso).sort((a, b) => a.ordre - b.ordre);
          const absence = duJour.find(c => c.type !== 'travail');
          const travail = duJour.filter(c => c.type === 'travail');
          const estAuj = iso === auj;
          const d = new Date(`${iso}T12:00:00`);
          return (
            <div key={iso}
              className={`min-h-[96px] flex flex-col border-r border-brand-ink/10 last:border-r-0 px-1 sm:px-2 py-2 ${
                estAuj ? 'bg-brand-ink text-white' : absence ? 'hachures' : ''
              } ${iso < auj && !estAuj ? 'opacity-45' : ''}`}>
              <div className={`font-mono text-[10px] uppercase ${estAuj ? 'text-fitness' : 'text-gray-400'}`}>
                {d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
              </div>
              <div className={`font-display text-lg font-bold leading-none ${estAuj ? 'text-white' : 'text-brand-ink'}`}>{d.getDate()}</div>
              <div className="mt-auto pt-2 space-y-0.5">
                {absence ? (
                  <div className={`font-mono text-[10px] uppercase leading-tight ${estAuj ? 'text-white' : 'text-brand-ink'}`}>{TYPES_ABSENCE[absence.type]?.court}</div>
                ) : travail.length ? travail.map(c => (
                  <div key={c.id} className={`font-mono text-[10px] sm:text-[11px] leading-tight tabular-nums ${estAuj ? 'text-white' : 'text-brand-ink'}`}>
                    {fmtHeure(c.debut)}<br className="sm:hidden" /><span className="hidden sm:inline">–</span>{fmtHeure(c.fin)}
                  </div>
                )) : <div className={`font-mono text-[11px] ${estAuj ? 'text-white/40' : 'text-gray-300'}`}>—</div>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-end font-mono text-[11px] text-gray-500">
        total semaine <span className="ml-2 text-brand-ink font-semibold">{fmtDuree(total)}</span>
      </div>
    </div>
  );
}
