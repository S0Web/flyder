const db = require('../db/database');
const { dateLocaleISO, depuisISO } = require('./dates');
const { getPreference } = require('./preferences');

const MOMENTS = ['ouverture', 'fermeture', 'bassin'];

// Marge : la première personne planifiée n'« ouvre » que si elle commence au plus tard 2 h après
// l'heure d'ouverture de la salle (Préférences) ; la dernière ne « ferme » que si elle finit au
// plus tôt 2 h avant la fermeture. Sinon personne ne couvre le créneau ce jour-là.
const MARGE_MIN = 120;

const enMinutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

// Qui ouvre, qui ferme, à partir du planning du personnel (créneaux « travail » des membres actifs).
// Rien n'est saisi à part : on lit les horaires déjà planifiés. Le contrôle du bassin revient à la
// personne qui ouvre (contrôle avant l'ouverture au public).
function responsablesDuJour(date) {
  const rows = db.all(
    `SELECT pc.employe_id, pc.debut, pc.fin, u.prenom, u.nom
     FROM personnel_creneaux pc JOIN app_users u ON u.id = pc.employe_id
     WHERE pc.date = ? AND pc.type = 'travail' AND pc.debut IS NOT NULL AND pc.fin IS NOT NULL
       AND u.actif = 1 AND u.supprime = 0 AND u.masque = 0`,
    [date]
  );
  const ouvertureH = Number(getPreference('ouverture_heure')) * 60;
  const fermetureH = Number(getPreference('fermeture_heure')) * 60;

  const premier = [...rows].sort((a, b) => enMinutes(a.debut) - enMinutes(b.debut) || a.employe_id - b.employe_id)[0];
  const dernier = [...rows].sort((a, b) => enMinutes(b.fin) - enMinutes(a.fin) || a.employe_id - b.employe_id)[0];
  const qui = (r) => r && { id: r.employe_id, prenom: r.prenom, nom: r.nom };
  const ouvre = premier && enMinutes(premier.debut) <= ouvertureH + MARGE_MIN ? qui(premier) : null;
  const ferme = dernier && enMinutes(dernier.fin) >= fermetureH - MARGE_MIN ? qui(dernier) : null;
  return { ouverture: ouvre, bassin: ouvre, fermeture: ferme };
}

function lireJours(texte) {
  try {
    const j = JSON.parse(texte);
    return Array.isArray(j) ? j : [];
  } catch (_) { return []; }
}

// Génère les tâches du jour pour chaque modèle actif concerné, pour la personne planifiée sur le
// créneau. Idempotent : à rappeler autant qu'on veut. Tant qu'une tâche générée n'est pas commencée,
// elle suit le planning (si le planning change, elle change de responsable).
function genererChecklists(date = dateLocaleISO()) {
  const modeles = db.all('SELECT * FROM checklist_modeles WHERE actif = 1');
  if (!modeles.length) return { crees: 0, reassignes: 0 };
  const jour = depuisISO(date).getDay();
  const resp = responsablesDuJour(date);
  let crees = 0, reassignes = 0;

  for (const m of modeles) {
    if (!lireJours(m.jours).includes(jour)) continue;
    const responsable = resp[m.moment];
    if (!responsable) continue;
    const existante = db.get('SELECT id, assigne_a, statut FROM taches WHERE modele_id = ? AND echeance = ?', [m.id, date]);
    if (!existante) {
      try {
        db.run(
          `INSERT INTO taches (titre, description, assigne_a, cree_par, echeance, priorite, recurrence, moment, modele_id)
           VALUES (?, ?, ?, ?, ?, ?, 'aucune', ?, ?)`,
          [m.titre, m.description, responsable.id, m.cree_par, date, m.priorite, m.moment, m.id]
        );
        crees++;
      } catch (e) {
        if (!String(e.message).includes('UNIQUE')) throw e; // créée entre-temps par un autre appel
      }
    } else if (existante.statut === 'a_faire' && existante.assigne_a !== responsable.id) {
      db.run("UPDATE taches SET assigne_a = ?, updated_at = datetime('now') WHERE id = ?", [responsable.id, existante.id]);
      reassignes++;
    }
  }
  return { crees, reassignes };
}

module.exports = { genererChecklists, responsablesDuJour, lireJours, MOMENTS };
