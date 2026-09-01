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
      // Sans ça, une connexion SMTP sortante bloquée par l'hébergeur (port
      // filtré, paquets silencieusement ignorés) fait attendre l'appelant
      // indéfiniment au lieu d'échouer proprement.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      // Railway ne route pas correctement l'IPv6 sortant vers Gmail (constaté
      // en prod : ENETUNREACH sur une adresse IPv6 de smtp.gmail.com) alors
      // que l'IPv4 fonctionne — on force IPv4 pour éviter cette impasse réseau.
      family: 4,
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

// Contrairement à envoyerNotificationTicket, celle-ci propage l'erreur : ici
// l'envoi EST l'action demandée (le formulaire de contact de la landing page),
// donc l'appelant doit savoir si ça a échoué pour prévenir le visiteur plutôt
// que de lui faire croire que sa demande est bien partie.
async function envoyerLead({ nom, email, objet, message }) {
  if (!isConfigured()) {
    throw new Error('Mailer non configuré (GMAIL_USER/GMAIL_APP_PASSWORD manquants)');
  }
  await getTransporter().sendMail({
    from: `Flyder <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    replyTo: email,
    subject: `[Flyder — Contact] ${objet}`,
    text: `Nouvelle demande depuis la landing page flyder.fr\n\nNom : ${nom}\nEmail : ${email}\n\n${message}`,
  });
}

module.exports = { envoyerNotificationTicket, envoyerLead, isConfigured };
