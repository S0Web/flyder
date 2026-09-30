import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { colorForUser } from '../../lib/utils';
import { TYPES_ABSENCE, fmtHeure } from '../../lib/equipe';
import { useHorairesSalle, graduations } from '../../lib/useHorairesSalle';

const heures = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h + m / 60; };

// Qui travaille aujourd'hui, et quand : une ligne par personne sur un axe borné par
// les heures d'ouverture de la salle (Préférences), avec l'heure actuelle en trait
// rouge. Les absents sont listés à part.
export default function TimelineJour({ presents, lienFiche = false, surligner }) {
  const { debut: DEBUT, fin: FIN } = useHorairesSalle();
  const TICKS = graduations(DEBUT, FIN);
  const pct = (h) => Math.max(0, Math.min(100, ((h - DEBUT) / (FIN - DEBUT)) * 100));
  const [maintenant, setMaintenant] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setMaintenant(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const hNow = maintenant.getHours() + maintenant.getMinutes() / 60;
  const travaillent = presents.filter(p => p.creneaux.length);
  const absents = presents.filter(p => !p.creneaux.length && p.absence && p.absence !== 'repos');
  const libelleNow = maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (!travaillent.length && !absents.length) {
    return <p className="text-sm text-gray-400 py-6 text-center">Personne n'est planifié aujourd'hui.</p>;
  }

  const Col = 'w-24 sm:w-32 flex-shrink-0';
  return (
    <div>
      <div className="flex">
        <div className={Col} />
        <div className="relative flex-1 h-5">
          {TICKS.map(h => (
            <span key={h} className="absolute text-[10px] text-gray-400 -translate-x-1/2" style={{ left: `${pct(h)}%` }}>{h}</span>
          ))}
          {hNow >= DEBUT && hNow <= FIN && (
            <span className="absolute -top-0.5 -translate-x-1/2 text-[10px] font-semibold text-white bg-red-500 px-1 rounded z-10" style={{ left: `${pct(hNow)}%` }}>
              {libelleNow}
            </span>
          )}
        </div>
      </div>
      <div className="relative border-t border-gray-200">
        {travaillent.map(p => {
          const enPoste = p.creneaux.some(c => heures(c.debut) <= hNow && hNow < heures(c.fin));
          const Nom = lienFiche ? Link : 'span';
          return (
            <div key={p.id} className={`flex items-center border-b border-gray-100 ${surligner === p.id ? 'bg-sky-50' : ''}`}>
              <Nom {...(lienFiche ? { to: `/equipe/membres/${p.id}` } : {})} className={`${Col} py-2 pr-2 min-w-0 group`}>
                <span className={`block text-sm truncate ${enPoste ? 'text-brand-ink font-semibold' : 'text-gray-500'} ${lienFiche ? 'group-hover:underline underline-offset-4' : ''}`}>
                  {p.prenom}
                </span>
                <span className="block text-[10px] text-gray-400 truncate">{enPoste ? 'en poste' : p.intitule.split('·')[0].trim().toLowerCase()}</span>
              </Nom>
              <div className="relative flex-1 h-9">
                {TICKS.map(h => <span key={h} className="absolute inset-y-0 w-px bg-gray-100" style={{ left: `${pct(h)}%` }} />)}
                {p.creneaux.map((c, i) => {
                  const l = pct(heures(c.debut)), w = Math.max(pct(heures(c.fin)) - l, 2);
                  return (
                    <div key={i} title={`${fmtHeure(c.debut)} – ${fmtHeure(c.fin)}`}
                      className="absolute top-2 bottom-2 rounded flex items-center overflow-hidden"
                      style={{ left: `${l}%`, width: `${w}%`, backgroundColor: colorForUser(p.id) }}>
                      <span className="text-[10px] font-semibold text-white whitespace-nowrap px-1.5 tabular-nums">
                        {fmtHeure(c.debut)}–{fmtHeure(c.fin)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {hNow >= DEBUT && hNow <= FIN && travaillent.length > 0 && (
          <div className="absolute inset-0 pointer-events-none flex">
            <div className={Col} />
            <div className="relative flex-1">
              <div className="absolute top-0 bottom-0 w-[2px] bg-red-500" style={{ left: `${pct(hNow)}%` }} />
            </div>
          </div>
        )}
      </div>
      {absents.length > 0 && (
        <p className="mt-3 text-[11px] text-gray-500">
          absents : {absents.map((p, i) => (
            <span key={p.id}>{i > 0 && ' · '}<span className="text-brand-ink">{p.prenom}</span> ({TYPES_ABSENCE[p.absence]?.label.toLowerCase()})</span>
          ))}
        </p>
      )}
    </div>
  );
}
