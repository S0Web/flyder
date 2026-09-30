const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { requireManager } = require('../middleware/auth');
const { dateLocaleISO } = require('../lib/dates');
const { genererChecklists, responsablesDuJour, lireJours, MOMENTS } = require('../lib/checklists');

// Modèles de checklist (ouverture, fermeture, bassin) : gérés par les managers. Les tâches
// qui en découlent sont de simples tâches (Équipe > Tâches, Ma journée).

const PRIORITES = ['basse', 'normale', 'haute', 'urgente'];

function lireJoursRequete(v) {
  if (v === undefined) return { valeur: undefined };
  if (!Array.isArray(v) || !v.length || !v.every(j => Number.isInteger(j) && j >= 0 && j <= 6)) {
    return { erreur: 'Choisis au moins un jour de la semaine.' };
  }
  return { valeur: JSON.stringify([...new Set(v)].sort((a, b) => a - b)) };
}

const exposer = (m) => ({ ...m, jours: lireJours(m.jours), actif: !!m.actif });

// GET /api/checklists — modèles + qui ouvre / ferme aujourd'hui (d'après le planning du personnel)
router.get('/', requireManager, (req, res) => {
  const modeles = db.all('SELECT * FROM checklist_modeles ORDER BY moment, id').map(exposer);
  res.json({ modeles, responsables: responsablesDuJour(dateLocaleISO()) });
});

// POST /api/checklists
router.post('/', requireManager, (req, res) => {
  const { moment, titre, description, priorite } = req.body;
  if (!MOMENTS.includes(moment)) return res.status(400).json({ error: 'Moment invalide (ouverture, fermeture ou bassin).' });
  if (!titre || !String(titre).trim()) return res.status(400).json({ error: 'Le titre est requis' });
  const jours = lireJoursRequete(req.body.jours ?? [0, 1, 2, 3, 4, 5, 6]);
  if (jours.erreur) return res.status(400).json({ error: jours.erreur });
  const result = db.run(
    `INSERT INTO checklist_modeles (moment, titre, description, priorite, jours, cree_par) VALUES (?, ?, ?, ?, ?, ?)`,
    [moment, String(titre).trim(), String(description || '').trim(), PRIORITES.includes(priorite) ? priorite : 'normale', jours.valeur, req.user.id]
  );
  genererChecklists();
  res.status(201).json(exposer(db.get('SELECT * FROM checklist_modeles WHERE id = ?', [result.lastInsertRowid])));
});

// PUT /api/checklists/:id — les tâches du jour pas encore commencées suivent le modèle
router.put('/:id', requireManager, (req, res) => {
  const m = db.get('SELECT * FROM checklist_modeles WHERE id = ?', [req.params.id]);
  if (!m) return res.status(404).json({ error: 'Modèle introuvable' });
  const next = { ...m };
  if (req.body.moment !== undefined) {
    if (!MOMENTS.includes(req.body.moment)) return res.status(400).json({ error: 'Moment invalide.' });
    next.moment = req.body.moment;
  }
  if (req.body.titre !== undefined) {
    if (!String(req.body.titre).trim()) return res.status(400).json({ error: 'Le titre est requis' });
    next.titre = String(req.body.titre).trim();
  }
  if (req.body.description !== undefined) next.description = String(req.body.description).trim();
  if (req.body.priorite !== undefined && PRIORITES.includes(req.body.priorite)) next.priorite = req.body.priorite;
  const jours = lireJoursRequete(req.body.jours);
  if (jours.erreur) return res.status(400).json({ error: jours.erreur });
  if (jours.valeur !== undefined) next.jours = jours.valeur;
  if (req.body.actif !== undefined) next.actif = req.body.actif ? 1 : 0;

  db.run(
    'UPDATE checklist_modeles SET moment=?, titre=?, description=?, priorite=?, jours=?, actif=? WHERE id=?',
    [next.moment, next.titre, next.description, next.priorite, next.jours, next.actif, m.id]
  );
  // Tâches générées et pas commencées : elles reprennent le contenu du modèle. Si le moment change,
  // on les supprime : elles seront régénérées pour la bonne personne.
  const ouvertes = db.all("SELECT id FROM taches WHERE modele_id = ? AND statut = 'a_faire'", [m.id]);
  if (next.moment !== m.moment || !next.actif) {
    for (const t of ouvertes) db.run('DELETE FROM taches WHERE id = ?', [t.id]);
  } else {
    for (const t of ouvertes) {
      db.run("UPDATE taches SET titre = ?, description = ?, priorite = ?, updated_at = datetime('now') WHERE id = ?",
        [next.titre, next.description, next.priorite, t.id]);
    }
  }
  genererChecklists();
  res.json(exposer(db.get('SELECT * FROM checklist_modeles WHERE id = ?', [m.id])));
});

// DELETE /api/checklists/:id — supprime le modèle et ses tâches pas encore commencées ;
// l'historique (tâches faites ou en cours) reste.
router.delete('/:id', requireManager, (req, res) => {
  const m = db.get('SELECT id FROM checklist_modeles WHERE id = ?', [req.params.id]);
  if (!m) return res.status(404).json({ error: 'Modèle introuvable' });
  db.run("DELETE FROM taches WHERE modele_id = ? AND statut = 'a_faire'", [m.id]);
  db.run('DELETE FROM checklist_modeles WHERE id = ?', [m.id]);
  res.json({ ok: true });
});

module.exports = router;
