const db = require('../db/database');

// Valeurs par défaut : salle_nom/salle_adresse reprennent les variables d'env
// historiques (une salle peut aussi ne jamais passer par Préférences), les
// autres sont de vrais défauts métier.
const DEFAULTS = {
  salle_nom: () => process.env.SALLE_NOM || '',
  salle_adresse: () => process.env.SALLE_ADRESSE || '',
  deconnexion_delai_min: () => '0', // '0' = jamais, 'jour' = fin de journée, sinon des minutes
  conges_taux_mensuel: () => '2.5',
  alerte_sans_coach_jours: () => '3',
  aqua_active: () => '1', // '1' = affiché partout (défaut), '0' = masqué (salles sans piscine)
};

const EDITABLE_KEYS = Object.keys(DEFAULTS);

function getPreferences() {
  const rows = db.all('SELECT cle, valeur FROM preferences');
  const stored = Object.fromEntries(rows.map(r => [r.cle, r.valeur]));
  const out = {};
  for (const key of EDITABLE_KEYS) {
    out[key] = stored[key] !== undefined ? stored[key] : DEFAULTS[key]();
  }
  return out;
}

function getPreference(key) {
  const row = db.get('SELECT valeur FROM preferences WHERE cle = ?', [key]);
  if (row) return row.valeur;
  return DEFAULTS[key] ? DEFAULTS[key]() : undefined;
}

function setPreferences(values) {
  for (const [key, value] of Object.entries(values)) {
    if (!EDITABLE_KEYS.includes(key)) continue;
    db.run(
      `INSERT INTO preferences (cle, valeur) VALUES (?, ?)
       ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur`,
      [key, String(value)]
    );
  }
}

module.exports = { getPreferences, getPreference, setPreferences, EDITABLE_KEYS };
