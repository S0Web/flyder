// Calcul du cumul de congés payés : un nombre de jours (2,5 par défaut, réglable par
// salle dans Préférences) acquis par mois plein écoulé depuis la date de début de
// contrat, plus un ajustement manuel (cp_ajuste) que le manager peut modifier
// librement (reprise d'ancienneté, régularisation, etc.).

const db = require('../db/database');

// Compte les CP posés par un employé, à partir de sa date de contrat (les CP posés
// avant ne comptent pas). Sans date de contrat, compte tout l'historique. `extraWhere`
// permet de restreindre davantage (ex. sur une année/un mois) via des paramètres liés.
function prisDepuisContrat(employeId, dateDebutContrat, extraWhere = '', extraParams = []) {
  const gate = dateDebutContrat ? 'AND date >= ?' : '';
  const gateParams = dateDebutContrat ? [dateDebutContrat] : [];
  return db.get(
    `SELECT COUNT(*) as n FROM personnel_creneaux WHERE employe_id = ? AND type = 'cp' ${gate} ${extraWhere}`,
    [employeId, ...gateParams, ...extraParams]
  ).n;
}

// Nombre de mois pleins écoulés entre dateDebut (YYYY-MM-DD) et aujourd'hui.
function moisEcoules(dateDebut) {
  const [y1, m1, d1] = dateDebut.split('-').map(Number);
  const debut = new Date(y1, m1 - 1, d1);
  const today = new Date();
  if (debut > today) return 0;
  let mois = (today.getFullYear() - debut.getFullYear()) * 12 + (today.getMonth() - debut.getMonth());
  if (today.getDate() < debut.getDate()) mois -= 1;
  return Math.max(0, mois);
}

// Solde de CP : calculeADate (tauxMensuel j/mois depuis la date de contrat, 2,5 = légal
// standard mais réglable par salle dans Préférences) + ajuste (manuel) - pris.
function soldeCp(dateDebutContrat, cpAjuste, totalPris, tauxMensuel = 2.5) {
  const ajuste = cpAjuste || 0;
  const calculeADate = dateDebutContrat ? Math.round(moisEcoules(dateDebutContrat) * tauxMensuel * 100) / 100 : 0;
  const acquis = Math.round((calculeADate + ajuste) * 100) / 100;
  return {
    calculeADate,
    ajuste,
    acquis,
    pris: totalPris,
    restant: Math.round((acquis - totalPris) * 100) / 100,
  };
}

module.exports = { moisEcoules, soldeCp, prisDepuisContrat };
