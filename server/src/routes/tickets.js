const express = require('express');
const router = express.Router();
const { adminApi, SupportIndisponibleError } = require('../lib/adminApi');

// Support : tout profil actif de la salle peut lire/écrire (pas de
// requireManager — "conversation de groupe", cf. plan). L'auteur n'est
// jamais pris du corps envoyé par le navigateur : toujours req.user, déjà
// vérifié par requireAuth en amont (monté dans index.js).

const MESSAGE_INDISPONIBLE =
  "Oups, le service de support est en maintenance pour quelques instants ! " +
  "Reviens un peu plus tard, ou écris-nous directement à support@flyder.fr, on s'occupe de tout !";

async function relay(res, fn) {
  try {
    res.json(await fn());
  } catch (err) {
    if (err instanceof SupportIndisponibleError) {
      return res.status(503).json({ error: MESSAGE_INDISPONIBLE });
    }
    res.status(err.status || 500).json({ error: err.message });
  }
}

router.get('/', (req, res) => relay(res, () => adminApi('/tickets')));

router.get('/unread-count', (req, res) => relay(res, () => adminApi('/tickets/unread-count')));

router.get('/:id', (req, res) => relay(res, () => adminApi(`/tickets/${req.params.id}`)));

router.post('/', (req, res) => relay(res, () => adminApi('/tickets', {
  method: 'POST',
  body: JSON.stringify({ message: req.body.message, auteur_nom: req.user.prenom }),
})));

router.post('/:id/messages', (req, res) => relay(res, () => adminApi(`/tickets/${req.params.id}/messages`, {
  method: 'POST',
  body: JSON.stringify({ corps: req.body.corps, auteur_nom: req.user.prenom }),
})));

router.patch('/:id', (req, res) => relay(res, () => adminApi(`/tickets/${req.params.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ statut: req.body.statut }),
})));

module.exports = router;
