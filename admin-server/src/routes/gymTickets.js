const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { creerTicket, ajouterMessage, getTicketAvecMessages } = require('../lib/tickets');

// Routes appelées par le SERVEUR d'une salle (jamais directement par un
// navigateur), authentifiées par clé API (requireClientApiKey, monté dans
// index.js). Tout est scopé à req.client.id — aucune route n'accepte de
// client_id en paramètre, pour qu'une salle ne puisse structurellement pas
// lire les tickets d'une autre.

router.get('/', (req, res) => {
  const tickets = db.all(`
    SELECT t.*,
      (SELECT corps FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS dernier_message
    FROM tickets t WHERE t.client_id = ? ORDER BY t.updated_at DESC
  `, [req.client.id]);
  res.json(tickets);
});

router.get('/unread-count', (req, res) => {
  const row = db.get('SELECT COUNT(*) AS n FROM tickets WHERE client_id = ? AND non_lu_salle = 1', [req.client.id]);
  res.json({ count: row.n });
});

// Ouvrir un ticket = le marquer comme lu par la salle (effet de bord assumé,
// cf. plan — même logique qu'un e-mail qui se marque lu à l'ouverture).
router.get('/:id', (req, res) => {
  const ticket = getTicketAvecMessages(req.params.id);
  if (!ticket || ticket.client_id !== req.client.id) return res.status(404).json({ error: 'Ticket introuvable' });

  if (ticket.non_lu_salle) {
    db.run('UPDATE tickets SET non_lu_salle = 0 WHERE id = ?', [ticket.id]);
    ticket.non_lu_salle = 0;
  }
  res.json(ticket);
});

router.post('/', (req, res) => {
  const { message, auteur_nom } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message requis' });
  if (!auteur_nom) return res.status(400).json({ error: 'auteur_nom requis' });

  const ticket = creerTicket({ clientId: req.client.id, message: message.trim(), auteurNom: auteur_nom, auteurRole: 'salle' });
  res.status(201).json(getTicketAvecMessages(ticket.id));
});

router.post('/:id/messages', (req, res) => {
  const ticket = db.get('SELECT id, client_id FROM tickets WHERE id = ?', [req.params.id]);
  if (!ticket || ticket.client_id !== req.client.id) return res.status(404).json({ error: 'Ticket introuvable' });
  const { corps, auteur_nom } = req.body;
  if (!corps || !corps.trim()) return res.status(400).json({ error: 'Message requis' });
  if (!auteur_nom) return res.status(400).json({ error: 'auteur_nom requis' });

  ajouterMessage({ ticketId: ticket.id, corps: corps.trim(), auteurNom: auteur_nom, auteurRole: 'salle' });
  res.status(201).json(getTicketAvecMessages(ticket.id));
});

// N'importe quel profil de la salle peut rouvrir/résoudre — "conversation de
// groupe", pas de restriction manager (cf. plan).
router.patch('/:id', (req, res) => {
  const ticket = db.get('SELECT id, client_id FROM tickets WHERE id = ?', [req.params.id]);
  if (!ticket || ticket.client_id !== req.client.id) return res.status(404).json({ error: 'Ticket introuvable' });
  if (!['ouvert', 'resolu'].includes(req.body.statut)) return res.status(400).json({ error: 'Statut invalide' });

  db.run("UPDATE tickets SET statut = ?, updated_at = datetime('now') WHERE id = ?", [req.body.statut, ticket.id]);
  res.json(db.get('SELECT * FROM tickets WHERE id = ?', [ticket.id]));
});

module.exports = router;
