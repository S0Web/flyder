const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { isConfigured, getClient } = require('../lib/stripe');

// Traduit le statut Stripe vers le statut interne (mêmes valeurs que
// STATUTS_VALIDES dans clients.js) — un seul mapping plutôt que de gérer
// chaque type d'événement séparément, plus robuste aux transitions oubliées.
function mapStripeStatus(stripeStatus) {
  if (['active', 'trialing'].includes(stripeStatus)) return 'actif';
  if (['past_due', 'unpaid', 'incomplete'].includes(stripeStatus)) return 'suspendu';
  if (['canceled', 'incomplete_expired'].includes(stripeStatus)) return 'resilie';
  return null;
}

// Monté avec express.raw() dans index.js (avant express.json() global) — la
// vérification de signature Stripe a besoin du corps brut, pas parsé.
router.post('/', (req, res) => {
  if (!isConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send('Stripe non configuré');
  }

  const stripe = getClient();
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Signature webhook Stripe invalide :', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      // Premier paiement réussi : c'est le seul événement qui porte notre
      // client_reference_id, donc le seul endroit où on peut faire le lien
      // entre un client du registre et son Customer/Subscription Stripe.
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.client_reference_id) {
          db.run(
            `UPDATE clients SET stripe_customer_id = ?, stripe_subscription_id = ?, statut = 'actif', updated_at = datetime('now') WHERE id = ?`,
            [session.customer, session.subscription, session.client_reference_id]
          );
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const statut = mapStripeStatus(sub.status);
        if (statut) {
          db.run(
            `UPDATE clients SET statut = ?, stripe_subscription_id = ?, updated_at = datetime('now') WHERE stripe_customer_id = ?`,
            [statut, sub.id, sub.customer]
          );
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        db.run(
          `UPDATE clients SET statut = 'resilie', updated_at = datetime('now') WHERE stripe_customer_id = ?`,
          [sub.customer]
        );
        break;
      }
    }
  } catch (e) {
    console.error('Erreur traitement webhook Stripe :', e.message);
  }

  res.json({ received: true });
});

module.exports = router;
