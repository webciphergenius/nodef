// routes/stripeConnectRoutes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/stripeConnectController");

const { authenticateUser } = require("../services/authService");
// Authenticated actions
router.post("/stripe/account", authenticateUser, ctrl.createAccount);
router.post(
  "/stripe/onboarding-link",
  authenticateUser,
  ctrl.createOnboardingLink
);
router.post("/stripe/customer", authenticateUser, ctrl.createCustomer);
router.post(
  "/stripe/payment-intent",
  authenticateUser,
  ctrl.createPaymentIntent
);
router.post(
  "/stripe/attach-payment",
  authenticateUser,
  ctrl.attachPaymentMethod
);
router.post("/stripe/payouts", authenticateUser, ctrl.payouts);

// TEMP: Clear Stripe IDs for authenticated user (for testing)
router.post("/stripe/clear-ids", authenticateUser, ctrl.clearStripeIds);

// Public pages
router.get("/stripe/success/:id", ctrl.success);
router.get("/stripe/reauth/:id", ctrl.reauth);

// Webhooks (must receive raw body -> configured in app.js)
router.post("/stripe/webhook", ctrl.webhook);
router.post("/stripe/connect-webhook", ctrl.connectWebhook);

module.exports = router;
