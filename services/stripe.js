const Stripe = require("stripe");

let stripe;
function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-05-28.basil",
    });
  }
  return stripe;
}

module.exports = {
  getStripe,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET, // platform webhook
  connectWebhookSecret: process.env.STRIPE_CONNECT_WEBHOOK_SECRET, // connect webhook
};
