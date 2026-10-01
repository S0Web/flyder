const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { logAudit } = require('../lib/audit');

// GET /api/cours-types
router.get('/', (req, res) => {
  const rows = db.all('SELECT * FROM cours_types ORDER BY categorie, nom');
  res.json(rows);
});

// Capacité : nombre entier de places, ou absente/vide quand elle n'est pas connue.
function lireCapacite(valeur) {
  if (valeur === undefined || valeur === null || valeur === '') return { ok: true, valeur: null };
  const n = Number(valeur);
  if (!Number.isInteger(n) || n < 1 || n > 500) return { ok: false };
  return { ok: true, valeur: n };
}

// POST /api/cours-types
router.post('/', (req, res) => {
  const { nom, categorie } = req.body;
  if (!nom || !categorie) return res.status(400).json({ error: 'nom et categorie requis' });
  const valid = ['aqua', 'fitness'];
  if (!valid.includes(categorie)) return res.status(400).json({ error: 'categorie invalide' });
  const cap = lireCapacite(req.body.capacite);
  if (!cap.ok) return res.status(400).json({ error: 'La capacité doit être un entier entre 1 et 500.' });
  try {
    const result = db.run(
      'INSERT INTO cours_types (nom, categorie, capacite) VALUES (?, ?, ?)',
      [nom.trim(), categorie, cap.valeur]
    );
    logAudit({ userId: req.user.id, action: 'create_cours_type', entity: 'cours_types', entityId: result.lastInsertRowid,
      details: `${nom.trim()} (${categorie})` });
    res.status(201).json(db.get('SELECT * FROM cours_types WHERE id = ?', [result.lastInsertRowid]));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Ce cours existe déjà' });
    throw err;
  }
});

// PATCH /api/cours-types/:id — { capacite } (null pour l'effacer)
router.patch('/:id', (req, res) => {
  const existant = db.get('SELECT * FROM cours_types WHERE id = ?', [req.params.id]);
  if (!existant) return res.status(404).json({ error: 'Cours introuvable' });
  if (!('capacite' in req.body)) return res.status(400).json({ error: 'capacite requise' });
  const cap = lireCapacite(req.body.capacite);
  if (!cap.ok) return res.status(400).json({ error: 'La capacité doit être un entier entre 1 et 500.' });
  db.run('UPDATE cours_types SET capacite = ? WHERE id = ?', [cap.valeur, existant.id]);
  logAudit({ userId: req.user.id, action: 'update_cours_type', entity: 'cours_types', entityId: existant.id,
    details: `${existant.nom} : capacité → ${cap.valeur ?? 'non renseignée'}` });
  res.json(db.get('SELECT * FROM cours_types WHERE id = ?', [existant.id]));
});

module.exports = router;
