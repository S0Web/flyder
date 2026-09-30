const db = require('../db/database');
const { horaireEnMinutes } = require('./dates');

// Nombre de séances pleines consécutives à partir duquel on signale un créneau.
const SEUIL_COMPLET = 3;
// Une série ne compte que si sa dernière séance pleine est récente : un créneau
// supprimé depuis longtemps ne doit plus alerter.
const FRAICHEUR_JOURS = 60;

function jourSemaine(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

// Clé d'un créneau récurrent : même cours, même jour de semaine, même heure de début.
function cleCreneau(coursTypeId, dateIso, horaire) {
  return `${coursTypeId}|${jourSemaine(dateIso)}|${horaireEnMinutes(horaire)}`;
}

// Créneaux dont les dernières séances réalisées ont toutes affiché complet
// (nombre de présents ≥ capacité du cours). Suggère d'ouvrir une séance de plus.
function alertesComplet() {
  const limite = new Date();
  limite.setDate(limite.getDate() - 180);
  const pad = (n) => String(n).padStart(2, '0');
  const depuis = `${limite.getFullYear()}-${pad(limite.getMonth() + 1)}-${pad(limite.getDate())}`;

  const rows = db.all(`
    SELECT s.cours_type_id, ct.nom AS cours_nom, ct.capacite, ct.categorie,
           s.date, s.horaire, s.nb_presents
    FROM seances s JOIN cours_types ct ON ct.id = s.cours_type_id
    WHERE s.statut IN ('effectue','paye') AND s.nb_presents IS NOT NULL
      AND ct.capacite IS NOT NULL AND s.date >= ?
    ORDER BY s.date DESC, s.horaire DESC
  `, [depuis]);

  const parCreneau = new Map();
  for (const r of rows) {
    const minutes = horaireEnMinutes(r.horaire);
    if (minutes === null) continue;
    const cle = cleCreneau(r.cours_type_id, r.date, r.horaire);
    if (!parCreneau.has(cle)) parCreneau.set(cle, []);
    parCreneau.get(cle).push(r);
  }

  const aujourdhui = new Date();
  aujourdhui.setDate(aujourdhui.getDate() - FRAICHEUR_JOURS);
  const seuilFraicheur = `${aujourdhui.getFullYear()}-${pad(aujourdhui.getMonth() + 1)}-${pad(aujourdhui.getDate())}`;

  const alertes = [];
  for (const [cle, seances] of parCreneau) {
    // Les plus récentes d'abord (ORDER BY ci-dessus) : on compte la série en tête.
    let serie = 0;
    for (const s of seances) {
      if (s.nb_presents >= s.capacite) serie++; else break;
    }
    if (serie < SEUIL_COMPLET) continue;
    const derniere = seances[0];
    if (derniere.date < seuilFraicheur) continue;
    const [, jour, minutes] = cle.split('|').map(Number);
    alertes.push({
      cours_type_id: derniere.cours_type_id,
      cours_nom: derniere.cours_nom,
      categorie: derniere.categorie,
      capacite: derniere.capacite,
      jour_semaine: jour,
      horaire_minutes: minutes,
      serie,
      derniere_date: derniere.date,
    });
  }
  alertes.sort((a, b) => b.serie - a.serie || b.derniere_date.localeCompare(a.derniere_date));
  return alertes;
}

module.exports = { alertesComplet, SEUIL_COMPLET };
