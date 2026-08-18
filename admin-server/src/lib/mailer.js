const nodemailer = require('nodemailer');

// Notification par email quand une salle écrit sur un ticket — pas de service
// tiers, on envoie depuis le Gmail perso du propriétaire vers lui-même via un
// mot de passe d'application. Ni GMAIL_USER ni GMAIL_APP_PASSWORD ne sont
// jamais écrits dans le code, uniquement lus depuis les variables d'environnement.
function isConfigured() {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

// N'échoue jamais bruyamment : un souci d'envoi ne doit pas empêcher la salle
// d'écrire son ticket, juste priver le propriétaire de la notification.
async function envoyerNotificationTicket({ clientNom, auteurNom, message }) {
  if (!isConfigured()) {
    console.warn('Mailer non configuré (GMAIL_USER/GMAIL_APP_PASSWORD manquants) — notification ticket non envoyée');
    return;
  }
  try {
    await getTransporter().sendMail({
      from: `Flyder <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `[Flyder] Nouveau message — ${clientNom}`,
      text: `${auteurNom} (${clientNom}) a écrit sur un ticket de support :\n\n${message}\n\n— Réponds depuis le back-office : admin.flyder.fr`,
    });
  } catch (e) {
    console.error('Échec envoi notification ticket:', e.message);
  }
}

module.exports = { envoyerNotificationTicket, isConfigured };
