const express = require('express');
const router = express.Router();
const { envoyerLead } = require('../lib/mailer');

// Route publique (montée sans requireAuth dans index.js) : le formulaire de
// contact de la landing page (flyder.fr) y poste directement en cross-origin.
// Aucune donnée n'est stockée en base — on se contente de relayer par email.

const MAX_LONGUEUR = 5000;

router.post('/', async (req, res) => {
  const { nom, email, objet, message, site } = req.body || {};

  // Honeypot : un champ caché côté formulaire, invisible pour un humain,
  // que seuls les bots remplissent généralement. On répond 200 sans envoyer
  // de mail pour ne pas leur signaler que la requête a été détectée.
  if (site) return res.json({ ok: true });

  if (!nom || !nom.trim()) return res.status(400).json({ error: 'Nom requis' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email invalide' });
  if (!objet || !objet.trim()) return res.status(400).json({ error: 'Objet requis' });
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message requis' });
  if (nom.length > 200 || email.length > 200 || objet.length > 300 || message.length > MAX_LONGUEUR) {
    return res.status(400).json({ error: 'Champ trop long' });
  }

  try {
    await envoyerLead({ nom: nom.trim(), email: email.trim(), objet: objet.trim(), message: message.trim() });
    res.json({ ok: true });
  } catch (e) {
    console.error('Échec envoi lead:', e.message);
    res.status(502).json({ error: "Échec de l'envoi, réessayez plus tard" });
  }
});

module.exports = router;
