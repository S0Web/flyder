const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { creerTicket, ajouterMessage, getTicketAvecMessages } = require('../lib/tickets');

// Routes admin (humain connecté au backoffice, requireAuth appliqué au montage
// dans index.js) — voit tous les tickets, toutes salles confondues.

const STATUTS_VALIDES = ['ouvert', 'resolu'];

// GET /api/tickets?statut=&client_id= — liste avec aperçu du dernier message,
// triée par activité récente (les tickets qui bougent remontent en premier).
router.get('/', (req, res) => {
  const conds = [];
  const params = [];
  if (STATUTS_VALIDES.includes(req.query.statut)) { conds.push('t.statut = ?'); params.push(req.query.statut); }
  if (req.query.client_id) { conds.push('t.client_id = ?'); params.push(req.query.client_id); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const tickets = db.all(`
    SELECT t.*, c.nom AS client_nom,
      (SELECT corps FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS dernier_message,
      (SELECT auteur_role FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS dernier_auteur_role
    FROM tickets t JOIN clients c ON c.id = t.client_id
    ${where}
    ORDER BY t.updated_at DESC
  `, params);
  res.json(tickets);
});

// GET /api/tickets/:id — détail + conversation complète
router.get('/:id', (req, res) => {
  const ticket = getTicketAvecMessages(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });
  const client = db.get('SELECT id, nom FROM clients WHERE id = ?', [ticket.client_id]);
  res.json({ ...ticket, client });
});

// POST /api/tickets — toi qui ouvres un ticket à destination d'une salle
router.post('/', (req, res) => {
  const { client_id, message } = req.body;
  if (!client_id) return res.status(400).json({ error: 'client_id requis' });
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message requis' });

  const client = db.get('SELECT id FROM clients WHERE id = ?', [client_id]);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });

  const ticket = creerTicket({ clientId: client_id, message: message.trim(), auteurNom: 'Flyder', auteurRole: 'admin' });
  res.status(201).json(getTicketAvecMessages(ticket.id));
});

// POST /api/tickets/:id/messages — ta réponse. L'auteur est toujours "Flyder"
// (jamais ton nom personnel admin_users.nom) : c'est la marque qui répond.
router.post('/:id/messages', (req, res) => {
  const ticket = db.get('SELECT id FROM tickets WHERE id = ?', [req.params.id]);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });
  const { corps } = req.body;
  if (!corps || !corps.trim()) return res.status(400).json({ error: 'Message requis' });

  ajouterMessage({ ticketId: ticket.id, corps: corps.trim(), auteurNom: 'Flyder', auteurRole: 'admin' });
  res.status(201).json(getTicketAvecMessages(ticket.id));
});

// PATCH /api/tickets/:id — bascule ouvert/résolu
router.patch('/:id', (req, res) => {
  const ticket = db.get('SELECT id FROM tickets WHERE id = ?', [req.params.id]);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });
  if (!STATUTS_VALIDES.includes(req.body.statut)) return res.status(400).json({ error: 'Statut invalide' });

  db.run("UPDATE tickets SET statut = ?, updated_at = datetime('now') WHERE id = ?", [req.body.statut, ticket.id]);
  res.json(db.get('SELECT * FROM tickets WHERE id = ?', [ticket.id]));
});

module.exports = router;
