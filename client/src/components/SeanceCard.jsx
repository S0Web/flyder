import { StickyNote } from 'lucide-react';
import { STATUT_CONFIG } from '../lib/utils';
import { nextStatut } from '../lib/statutCycle';
import HeadcountPopover from './HeadcountPopover';
import PointeurBadge from './PointeurBadge';

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

const BORDER_COLOR = { aqua: '#5bcae8', fitness: '#e8cb9f' };

export default function SeanceCard({ seance, profils = [], onPatch, onDelete, onClick }) {
  const statut = STATUT_CONFIG[seance.statut] || STATUT_CONFIG.programme;
  const sansCoach = !seance.coach_prenom && !seance.coach_nom;

  const startMins = parseMinutes(seance.horaire);
  const endMins   = startMins + (seance.duree_minutes || 60);

  function cycleStatut(e) {
    e.stopPropagation();
    onPatch(seance.id, { statut: nextStatut(seance.statut) });
  }

  const borderLeft = sansCoach
    ? '4px solid #ef4444'
    : `4px solid ${BORDER_COLOR[seance.categorie] || '#5bcae8'}`;

  return (
    <div
      onClick={() => onClick(seance)}
      style={{ borderLeft, backgroundColor: sansCoach ? '#fee2e2' : '#ffffff' }}
      className={`relative px-2 py-1.5 cursor-pointer group rounded-md transition-all
        border hover:shadow-sm hover:border-gray-300
        ${sansCoach ? 'border-red-300' : 'border-gray-200'}
        ${seance.statut === 'annule' ? 'opacity-40' : ''}
      `}
    >
      {/* Alerte sans coach */}
      {sansCoach && (
        <div className="text-[10px] font-bold text-red-600 uppercase tracking-wide mb-0.5">
          ⚠ Sans coach
        </div>
      )}

      {/* Heure */}
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] font-bold text-gray-500 tabular-nums">
          {formatHoraire(startMins)} – {formatHoraire(endMins)}
        </span>
        {seance.notes && (
          <span title={seance.notes} className="text-gray-400 cursor-help" aria-label="Cette séance a une note">
            <StickyNote className="h-3 w-3" />
          </span>
        )}
      </div>

      {/* Nom du cours */}
      <div className="text-xs font-semibold text-gray-800 leading-tight">
        {seance.cours_nom}
      </div>

      {/* Coach */}
      {!sansCoach && (
        <div className="text-[11px] text-gray-500 mt-0.5">
          {seance.coach_prenom} {seance.coach_nom}
        </div>
      )}

      {/* Ligne inférieure : statut + présents */}
      <div className="flex items-center justify-between mt-1 gap-1">
        <button
          onClick={cycleStatut}
          title={statut.label}
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide leading-none flex-shrink-0
            ${statut.bg} ${statut.text} hover:opacity-80 transition-opacity`}
        >
          <span className="sm:hidden">{statut.shortLabel || statut.label}</span>
          <span className="hidden sm:inline">{statut.label}</span>
        </button>

        <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
          <PointeurBadge
            pointeurUserId={seance.pointeur_user_id}
            pointeurNom={seance.pointeur_nom}
            profils={profils}
            onSelect={(id) => onPatch(seance.id, { pointeur_user_id: id })}
          />
          <HeadcountPopover value={seance.nb_presents} onSelect={(n) => onPatch(seance.id, { nb_presents: n })} />
        </div>
      </div>

      {/* Supprimer (hover) */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(seance.id); }}
        className="absolute top-0.5 right-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all text-base leading-none"
        title="Supprimer" aria-label="Supprimer la séance"
      >×</button>
    </div>
  );
}
