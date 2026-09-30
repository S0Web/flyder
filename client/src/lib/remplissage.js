// Alerte « complet plusieurs fois de suite » : le serveur renvoie les créneaux
// (cours + jour de semaine + heure de début) concernés ; on retrouve ici celui d'une séance.

function minutesDe(horaire) {
  const m = /^(\d{1,2})\s*[h:]\s*(\d{0,2})/i.exec(String(horaire || ''));
  return m ? Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0) : null;
}

// Nombre de séances pleines consécutives du créneau de cette séance (0 si aucune alerte).
export function serieCompletDe(alertes, seance) {
  if (!alertes?.length) return 0;
  const [y, m, d] = seance.date.split('-').map(Number);
  const jour = new Date(y, m - 1, d).getDay();
  const minutes = minutesDe(seance.horaire);
  const a = alertes.find(x =>
    x.cours_type_id === seance.cours_type_id && x.jour_semaine === jour && x.horaire_minutes === minutes);
  return a ? a.serie : 0;
}
