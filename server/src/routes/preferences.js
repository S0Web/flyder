const express = require('express');
const router = express.Router();
const { requireManager } = require('../middleware/auth');
const { getPreferences, setPreferences } = require('../lib/preferences');
const { logAudit } = require('../lib/audit');

// Lecture ouverte à tout profil connecté (ex. le délai de déconnexion s'applique
// à tout le monde, pas seulement aux managers) ; écriture réservée aux managers.
router.get('/', (req, res) => {
  res.json(getPreferences());
});

// Libellés lisibles pour l'historique (Historique > Paramètres) — sans ça, le
// journal afficherait des clés techniques (ouverture_heure, aqua_active...).
const LABELS = {
  salle_nom: 'Nom de la salle',
  salle_adresse: 'Adresse de facturation',
  deconnexion_delai_min: 'Délai de déconnexion automatique',
  conges_taux_mensuel: 'Taux mensuel de CP',
  alerte_sans_coach_jours: 'Délai alerte séance sans coach',
  ouverture_heure: "Heure d'ouverture (frises Équipe)",
  fermeture_heure: 'Heure de fermeture (frises Équipe)',
  aqua_active: 'Cours Aqua',
};

function fmtValeur(cle, v) {
  if (cle === 'aqua_active') return v === '1' ? 'activés' : 'désactivés';
  if (cle === 'deconnexion_delai_min') return v === '0' ? 'jamais' : v === 'jour' ? 'fin de journée' : `${v} min`;
  if (cle === 'ouverture_heure' || cle === 'fermeture_heure') return `${v}h`;
  return v;
}

router.patch('/', requireManager, (req, res) => {
  const { ouverture_heure: o, fermeture_heure: f } = req.body;
  if (o !== undefined || f !== undefined) {
    const prefs = getPreferences();
    const ouverture = Number(o !== undefined ? o : prefs.ouverture_heure);
    const fermeture = Number(f !== undefined ? f : prefs.fermeture_heure);
    if (!Number.isInteger(ouverture) || !Number.isInteger(fermeture)
        || ouverture < 0 || fermeture > 24 || ouverture >= fermeture) {
      return res.status(400).json({ error: "Heures d'ouverture invalides : deux heures entières, l'ouverture avant la fermeture." });
    }
  }
  const avant = getPreferences();
  setPreferences(req.body);
  const apres = getPreferences();

  const changements = Object.keys(LABELS)
    .filter((cle) => avant[cle] !== apres[cle])
    .map((cle) => `${LABELS[cle]} → ${fmtValeur(cle, apres[cle])}`);
  if (changements.length) {
    logAudit({ userId: req.user.id, action: 'update_preferences', entity: 'preferences', details: changements.join(' · ') });
  }

  res.json(apres);
});

module.exports = router;
