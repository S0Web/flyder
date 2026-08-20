const Stripe = require('stripe');

function isConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

function getClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

module.exports = { isConfigured, getClient };
