const db = require('../db/database');
const { envoyerNotificationTicket } = require('./mailer');

// Notifie le propriétaire uniquement quand une SALLE écrit (jamais sur ses
// propres messages admin, ça n'aurait aucun sens de s'auto-notifier).
function notifier(clientId, auteurNom, message) {
  const client = db.get('SELECT nom FROM clients WHERE id = ?', [clientId]);
  envoyerNotificationTicket({ clientNom: client?.nom || 'Salle inconnue', auteurNom, message }).catch(() => {});
}

// Le sujet affiché dans les listes n'est jamais saisi séparément (le formulaire
// n'a qu'un seul champ, cf. la capture d'écran d'origine) — on le dérive du
// début du premier message.
const LONGUEUR_SUJET = 60;
function deriverSujet(message) {
  const texte = message.trim().replace(/\s+/g, ' ');
  return texte.length > LONGUEUR_SUJET ? `${texte.slice(0, LONGUEUR_SUJET)}…` : texte;
}

function creerTicket({ clientId, message, auteurNom, auteurRole }) {
  const sujet = deriverSujet(message);
  const result = db.run(
    'INSERT INTO tickets (client_id, sujet) VALUES (?, ?)',
    [clientId, sujet]
  );
  const ticketId = result.lastInsertRowid;
  db.run(
    'INSERT INTO ticket_messages (ticket_id, auteur_nom, auteur_role, corps) VALUES (?, ?, ?, ?)',
    [ticketId, auteurNom, auteurRole, message]
  );
  if (auteurRole === 'salle') notifier(clientId, auteurNom, message);
  return db.get('SELECT * FROM tickets WHERE id = ?', [ticketId]);
}

// `role` = qui écrit ('salle' ou 'admin') — détermine quel côté doit être
// notifié (le badge rouge côté salle s'allume seulement sur un message admin ;
// l'inverse n'a pas de badge dédié, cf. plan).
function ajouterMessage({ ticketId, corps, auteurNom, auteurRole }) {
  db.run(
    'INSERT INTO ticket_messages (ticket_id, auteur_nom, auteur_role, corps) VALUES (?, ?, ?, ?)',
    [ticketId, auteurNom, auteurRole, corps]
  );
  if (auteurRole === 'admin') {
    db.run("UPDATE tickets SET non_lu_salle = 1, updated_at = datetime('now') WHERE id = ?", [ticketId]);
  } else {
    db.run("UPDATE tickets SET updated_at = datetime('now') WHERE id = ?", [ticketId]);
    const ticket = db.get('SELECT client_id FROM tickets WHERE id = ?', [ticketId]);
    if (ticket) notifier(ticket.client_id, auteurNom, corps);
  }
}

function getTicketAvecMessages(ticketId) {
  const ticket = db.get('SELECT * FROM tickets WHERE id = ?', [ticketId]);
  if (!ticket) return null;
  const messages = db.all('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC', [ticketId]);
  return { ...ticket, messages };
}

module.exports = { deriverSujet, creerTicket, ajouterMessage, getTicketAvecMessages };
