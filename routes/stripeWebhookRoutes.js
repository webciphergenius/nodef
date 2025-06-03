const express = require("express");
const router = express.Router();
const stripeWebhookController = require("../controllers/stripeWebhookController");

router.post("/", stripeWebhookController.handleStripeWebhook);
module.exports = router;
