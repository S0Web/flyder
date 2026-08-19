import { StickyNote } from 'lucide-react';
import { STATUT_CONFIG, CATEGORIE_CONFIG } from '../lib/utils';
import { nextStatut } from '../lib/statutCycle';
import { useFlashOnChange } from '../lib/useFlashOnChange';
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

// Jours restants avant la séance (négatif si déjà passée) — sert à ne signaler
// une séance sans coach que si elle approche (seuil réglable dans Préférences),
// pour ne pas alerter sur un planning encore squelettique très en avance.
function joursAvant(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

export default function SeanceCard({ seance, profils = [], onPatch, onDelete, onClick, alerteSansCoachJours = Infinity }) {
  const statut = STATUT_CONFIG[seance.statut] || STATUT_CONFIG.programme;
  const sansCoach = !seance.coach_prenom && !seance.coach_nom && joursAvant(seance.date) <= alerteSansCoachJours;
  const cat = CATEGORIE_CONFIG[seance.categorie] || CATEGORIE_CONFIG.fitness;
  const bg = sansCoach ? '#fee2e2' : cat.card;
  const accent = sansCoach ? '#ef4444' : cat.accent;

  const startMins = parseMinutes(seance.horaire);
  const endMins   = startMins + (seance.duree_minutes || 60);
  const statutFlash = useFlashOnChange(seance.statut);

  function cycleStatut(e) {
    e.stopPropagation();
    onPatch(seance.id, { statut: nextStatut(seance.statut) });
  }

  return (
    <div
      onClick={() => onClick(seance)}
      style={{ backgroundColor: bg }}
      className={`relative pl-4 pr-2 py-1.5 cursor-pointer group rounded-lg
        transition-[box-shadow,border-color] duration-150
        border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300
        animate-fadeIn
        has-[.animate-popoverIn]:z-40
        ${seance.statut === 'annule' ? 'opacity-40' : ''}
      `}
    >
      {/* Trait d'accent (catégorie / alerte) */}
      <span className="absolute left-1.5 top-1.5 bottom-1.5 w-1 rounded-full" style={{ backgroundColor: accent }} />

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
            ${statut.bg} ${statut.text} hover:opacity-80 transition-opacity active:scale-90
            ${statutFlash ? 'animate-pop' : ''}`}
        >
          <span className="sm:hidden">{statut.shortLabel || statut.label}</span>
          <span className="hidden sm:inline">{statut.label}</span>
        </button>

        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
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
        className="absolute top-0.5 right-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 active:scale-90 transition-all text-base leading-none"
        title="Supprimer" aria-label="Supprimer la séance"
      >×</button>
    </div>
  );
}
