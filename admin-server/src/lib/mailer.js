const nodemailer = require('nodemailer');
const dns = require('dns');

// Notification par email quand une salle écrit sur un ticket — pas de service
// tiers, on envoie depuis le Gmail perso du propriétaire vers lui-même via un
// mot de passe d'application. Ni GMAIL_USER ni GMAIL_APP_PASSWORD ne sont
// jamais écrits dans le code, uniquement lus depuis les variables d'environnement.
function isConfigured() {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

const HOST_TTL = 5 * 60 * 1000;
let transporter = null;
let transporterHost = null;
let transporterExpires = 0;

// nodemailer résout smtp.gmail.com lui-même en interne, mais pioche ensuite
// une adresse AU HASARD parmi les IPv4 ET IPv6 obtenues (voir son
// lib/shared/index.js#resolveHostname) sans jamais consulter l'option
// `family` du transport — la passer ne change donc rien. Railway ne route
// pas l'IPv6 sortant vers Gmail (ENETUNREACH constaté en prod), donc on
// résout nous-mêmes l'adresse en IPv4 et on la fournit comme `host` : voyant
// un host déjà résolu (littéral), nodemailer saute entièrement sa propre
// résolution DNS aléatoire.
async function getTransporter() {
  const now = Date.now();
  if (!transporter || now >= transporterExpires) {
    const [host] = await dns.promises.resolve4('smtp.gmail.com');
    if (host !== transporterHost) {
      transporterHost = host;
      transporter = nodemailer.createTransport({
        host,
        port: 465,
        secure: true,
        // host est une IP littérale : servername restaure le nom attendu
        // par le certificat TLS de Gmail pour la vérification SNI.
        tls: { servername: 'smtp.gmail.com' },
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
        // Sans ça, une connexion SMTP sortante bloquée par l'hébergeur (port
        // filtré, paquets silencieusement ignorés) fait attendre l'appelant
        // indéfiniment au lieu d'échouer proprement.
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
    }
    transporterExpires = now + HOST_TTL;
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
    const t = await getTransporter();
    await t.sendMail({
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
  const t = await getTransporter();
  await t.sendMail({
    from: `Flyder <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    replyTo: email,
    subject: `[Flyder — Contact] ${objet}`,
    text: `Nouvelle demande depuis la landing page flyder.fr\n\nNom : ${nom}\nEmail : ${email}\n\n${message}`,
  });
}

module.exports = { envoyerNotificationTicket, envoyerLead, isConfigured };
