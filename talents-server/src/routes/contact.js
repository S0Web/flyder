const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAnyAuth } = require('../middleware/auth');

// Pas de fil de discussion (hors scope MVP) : un clic "Contacter" journalise
// l'événement et révèle les coordonnées brutes de la cible. La conversation
// continue ensuite sur les outils personnels des deux parties.
const MAX_CONTACTS_PAR_JOUR = 20;

router.post('/:type/:id', requireAnyAuth, (req, res) => {
  const { type } = req.params;
  const id = Number(req.params.id);
  if (!['coach', 'gym'].includes(type) || !Number.isInteger(id)) {
    return res.status(400).json({ error: 'Requête invalide' });
  }
  if (req.actor.type === type && req.actor.id === id) {
    return res.status(400).json({ error: 'Action impossible sur son propre profil' });
  }

  const table = type === 'coach' ? 'coaches' : 'gyms';
  const cible = db.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  if (!cible) return res.status(404).json({ error: 'Profil introuvable' });

  // Revisiter un profil déjà contacté ne doit ni recompter dans le quota
  // journalier ni ajouter une ligne de log supplémentaire.
  const dejaContacte = db.get(
    'SELECT id FROM contact_events WHERE initiateur_type = ? AND initiateur_id = ? AND cible_type = ? AND cible_id = ? LIMIT 1',
    [req.actor.type, req.actor.id, type, id]
  );

  if (!dejaContacte) {
    const today = new Date().toISOString().slice(0, 10);
    const countToday = db.get(
      `SELECT COUNT(*) as n FROM contact_events WHERE initiateur_type = ? AND initiateur_id = ? AND date(created_at) = ?`,
      [req.actor.type, req.actor.id, today]
    ).n;
    if (countToday >= MAX_CONTACTS_PAR_JOUR) {
      return res.status(429).json({ error: 'Trop de contacts envoyés aujourd\'hui, réessaie demain.' });
    }

    db.run(
      'INSERT INTO contact_events (initiateur_type, initiateur_id, cible_type, cible_id) VALUES (?, ?, ?, ?)',
      [req.actor.type, req.actor.id, type, id]
    );
  }

  if (type === 'coach') {
    res.json({ nom: cible.nom, prenom: cible.prenom, email: cible.email, telephone: cible.telephone });
  } else {
    res.json({ nom: cible.nom, contact_nom: cible.contact_nom, contact_email: cible.contact_email, contact_telephone: cible.contact_telephone });
  }
});

// GET /api/contact/:type/:id/status — la cible a-t-elle déjà été contactée par
// l'acteur connecté ? Sert à afficher directement les coordonnées déjà
// révélées lors d'une visite précédente, sans re-consommer le quota.
router.get('/:type/:id/status', requireAnyAuth, (req, res) => {
  const { type } = req.params;
  const id = Number(req.params.id);
  const row = db.get(
    'SELECT id FROM contact_events WHERE initiateur_type = ? AND initiateur_id = ? AND cible_type = ? AND cible_id = ? LIMIT 1',
    [req.actor.type, req.actor.id, type, id]
  );
  res.json({ dejaContacte: !!row });
});

module.exports = router;
