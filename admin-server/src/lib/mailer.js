// Notification par email quand une salle écrit sur un ticket, et envoi des
// demandes de contact de la landing page — via l'API HTTP de Resend plutôt
// que du SMTP : Railway bloque le SMTP sortant (ENETUNREACH puis timeout
// identique constatés en prod sur les ports 465 et 587), alors que le HTTPS
// sortant, lui, fonctionne normalement (c'est ce que le reste de l'appli
// utilise déjà). Ni RESEND_API_KEY ni RESEND_TO_EMAIL ne sont jamais écrits
// dans le code, uniquement lus depuis les variables d'environnement.
function isConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.RESEND_TO_EMAIL);
}

const RESEND_TIMEOUT = 10000;

async function envoyerEmail({ subject, text, replyTo }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // onboarding@resend.dev fonctionne sans domaine vérifié — remplacer
      // par une adresse @flyder.fr (via RESEND_FROM) une fois le domaine
      // vérifié dans Resend.
      from: process.env.RESEND_FROM || 'Flyder <onboarding@resend.dev>',
      to: process.env.RESEND_TO_EMAIL,
      subject,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
    signal: AbortSignal.timeout(RESEND_TIMEOUT),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend a répondu ${res.status} : ${body.slice(0, 300)}`);
  }
}

// N'échoue jamais bruyamment : un souci d'envoi ne doit pas empêcher la salle
// d'écrire son ticket, juste priver le propriétaire de la notification.
async function envoyerNotificationTicket({ clientNom, auteurNom, message }) {
  if (!isConfigured()) {
    console.warn('Mailer non configuré (RESEND_API_KEY/RESEND_TO_EMAIL manquants) — notification ticket non envoyée');
    return;
  }
  try {
    await envoyerEmail({
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
    throw new Error('Mailer non configuré (RESEND_API_KEY/RESEND_TO_EMAIL manquants)');
  }
  await envoyerEmail({
    subject: `[Flyder — Contact] ${objet}`,
    text: `Nouvelle demande depuis la landing page flyder.fr\n\nNom : ${nom}\nEmail : ${email}\n\n${message}`,
    replyTo: email,
  });
}

module.exports = { envoyerNotificationTicket, envoyerLead, isConfigured };
