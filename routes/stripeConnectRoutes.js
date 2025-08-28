// routes/stripeConnectRoutes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/stripeConnectController");

const { authenticateUser } = require("../services/authService");

// Webhooks
// IMPORTANT: Needs to be before express.json() parser in app.js
router.post("/stripe/webhook", ctrl.webhook);
router.post("/stripe/connect-webhook", ctrl.connectWebhook);

// Authenticated actions
router.post("/stripe/account", express.json(), authenticateUser, ctrl.createAccount);
router.post(
  "/stripe/onboarding-link",
  express.json(),
  authenticateUser,
  ctrl.createOnboardingLink
);
router.post("/stripe/customer", express.json(), authenticateUser, ctrl.createCustomer);
router.post(
  "/stripe/payment-intent",
  express.json(),
  authenticateUser,
  ctrl.createPaymentIntent
);
router.post(
  "/stripe/attach-payment",
  express.json(),
  authenticateUser,
  ctrl.attachPaymentMethod
);
router.post("/stripe/payouts", express.json(), authenticateUser, ctrl.payouts);

// TEMP: Clear Stripe IDs for authenticated user (for testing)
router.post("/stripe/clear-ids", express.json(), authenticateUser, ctrl.clearStripeIds);

// Public pages
router.get("/stripe/success/:id", ctrl.success);
router.get("/stripe/reauth/:id", ctrl.reauth);

module.exports = router;
