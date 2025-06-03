const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const db = require("../config/db");
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook Error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const sessionId = session.id;

    // ✅ Mark shipment as paid in DB
    await db.query(
      "UPDATE shipments SET payment_status = 'paid' WHERE stripe_payment_id = ?",
      [sessionId]
    );

    console.log("✅ Shipment marked as paid:", sessionId);
  }

  res.status(200).send("Received");
};
