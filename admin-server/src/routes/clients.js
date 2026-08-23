const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { hashKey } = require('../middleware/clientAuth');
const stripeLib = require('../lib/stripe');

const STATUTS_VALIDES = ['essai', 'actif', 'suspendu', 'resilie'];

// GET /api/clients — liste, plus récents en premier
router.get('/', (req, res) => {
  res.json(db.all('SELECT * FROM clients ORDER BY created_at DESC'));
});

// GET /api/clients/:id
router.get('/:id', (req, res) => {
  const client = db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });
  res.json(client);
});

function validate(body) {
  if (!body.nom || !body.nom.trim()) return 'Le nom est requis';
  if (body.statut && !STATUTS_VALIDES.includes(body.statut)) return 'Statut invalide';
  return null;
}

// POST /api/clients
router.post('/', (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });

  const { nom, sous_domaine, salle_nom_env, statut, plan, contact_nom, contact_email, contact_telephone, date_debut, notes } = req.body;
  const result = db.run(
    `INSERT INTO clients (nom, sous_domaine, salle_nom_env, statut, plan, contact_nom, contact_email, contact_telephone, date_debut, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nom.trim(), sous_domaine || null, salle_nom_env || null, statut || 'essai', plan || null,
     contact_nom || null, contact_email || null, contact_telephone || null, date_debut || null, notes || null]
  );
  res.status(201).json(db.get('SELECT * FROM clients WHERE id = ?', [result.lastInsertRowid]));
});

// PUT /api/clients/:id
router.put('/:id', (req, res) => {
  const client = db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });

  const { nom, sous_domaine, salle_nom_env, statut, plan, contact_nom, contact_email, contact_telephone, date_debut, notes } = req.body;
  db.run(
    `UPDATE clients SET nom=?, sous_domaine=?, salle_nom_env=?, statut=?, plan=?, contact_nom=?, contact_email=?, contact_telephone=?, date_debut=?, notes=?, updated_at=datetime('now')
     WHERE id=?`,
    [nom.trim(), sous_domaine || null, salle_nom_env || null, statut || 'essai', plan || null,
     contact_nom || null, contact_email || null, contact_telephone || null, date_debut || null, notes || null,
     req.params.id]
  );
  res.json(db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]));
});

// POST /api/clients/:id/regenerate-key — (re)génère la clé de service utilisée
// par le serveur de cette salle pour appeler /api/gym/*. La valeur en clair
// n'est renvoyée qu'ici, une seule fois : seule son empreinte est conservée.
router.post('/:id/regenerate-key', (req, res) => {
  const client = db.get('SELECT id FROM clients WHERE id = ?', [req.params.id]);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });

  const clair = crypto.randomBytes(24).toString('hex');
  db.run('UPDATE clients SET api_key_hash = ?, updated_at = datetime(\'now\') WHERE id = ?', [hashKey(clair), req.params.id]);
  res.json({ apiKey: clair });
});

// POST /api/clients/:id/checkout — crée une session Stripe Checkout (mode
// abonnement) pour ce client et renvoie l'URL à lui transmettre. Réutilise le
// Customer Stripe existant s'il y en a déjà un, pour ne pas en créer un
// second à chaque nouvelle tentative de paiement.
router.post('/:id/checkout', async (req, res) => {
  if (!stripeLib.isConfigured()) return res.status(503).json({ error: 'Stripe non configuré (STRIPE_SECRET_KEY manquant)' });
  if (!process.env.STRIPE_PRICE_ID) return res.status(503).json({ error: 'STRIPE_PRICE_ID non configuré' });

  const client = db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });

  try {
    const stripe = stripeLib.getClient();
    const baseUrl = process.env.ADMIN_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      client_reference_id: String(client.id),
      ...(client.stripe_customer_id
        ? { customer: client.stripe_customer_id }
        : { customer_email: client.contact_email || undefined }),
      line_items: [
        { price: process.env.STRIPE_PRICE_ID, quantity: 1 },
        // Frais de mise en service : facturés une seule fois, à la création de
        // la session — optionnel tant que STRIPE_SETUP_FEE_PRICE_ID n'est pas
        // configuré, pour ne pas casser le paiement si ce produit n'existe pas
        // encore côté Stripe.
        ...(process.env.STRIPE_SETUP_FEE_PRICE_ID ? [{ price: process.env.STRIPE_SETUP_FEE_PRICE_ID, quantity: 1 }] : []),
      ],
      allow_promotion_codes: true,
      payment_method_collection: 'if_required',
      success_url: `${baseUrl}/?checkout=success`,
      cancel_url: `${baseUrl}/?checkout=cancel`,
    });
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/clients/:id/portal — lien vers le Customer Portal Stripe (le
// client y gère lui-même son moyen de paiement / résiliation). Suppose un
// Customer déjà créé, donc un premier paiement déjà passé par /checkout.
router.post('/:id/portal', async (req, res) => {
  if (!stripeLib.isConfigured()) return res.status(503).json({ error: 'Stripe non configuré (STRIPE_SECRET_KEY manquant)' });

  const client = db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });
  if (!client.stripe_customer_id) return res.status(400).json({ error: "Ce client n'a pas encore de compte Stripe — crée d'abord un lien de paiement" });

  try {
    const stripe = stripeLib.getClient();
    const baseUrl = process.env.ADMIN_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const session = await stripe.billingPortal.sessions.create({
      customer: client.stripe_customer_id,
      return_url: baseUrl,
    });
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/clients/:id/reset-stripe — détache le Customer/Subscription Stripe
// de ce client (rien n'est supprimé côté Stripe). Utile après un test, ou si un
// client veut repartir de zéro sur un nouvel abonnement.
router.post('/:id/reset-stripe', (req, res) => {
  const client = db.get('SELECT id FROM clients WHERE id = ?', [req.params.id]);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });

  db.run(
    `UPDATE clients SET stripe_customer_id = NULL, stripe_subscription_id = NULL, stripe_inactif_depuis = NULL, updated_at = datetime('now') WHERE id = ?`,
    [req.params.id]
  );
  res.json(db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]));
});

// DELETE /api/clients/:id
router.delete('/:id', (req, res) => {
  const client = db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });
  db.run('DELETE FROM clients WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
