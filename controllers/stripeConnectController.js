// controllers/stripeConnectController.js
const path = require("path");
const db = require("../config/db");
const {
  getStripe,
  webhookSecret,
  connectWebhookSecret,
} = require("../services/stripe");

// DRIVER: create Stripe Connect Express account
exports.createAccount = async (req, res) => {
  try {
    const stripe = getStripe();
    const [[user]] = await db.query(
      "SELECT id, email FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    await db.query("UPDATE users SET stripe_account_id = ? WHERE id = ?", [
      account.id,
      user.id,
    ]);
    res.status(201).json({ accountId: account.id });
  } catch (error) {
    console.error("createAccount error:", error);
    res.status(500).json({ error: error.message });
  }
};

// DRIVER: onboarding link (bank connect)
exports.createOnboardingLink = async (req, res) => {
  try {
    const stripe = getStripe();
    const { accountId } = req.body;
    if (!accountId)
      return res.status(400).json({ error: "Account ID is required" });

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.DOMAIN}/api/stripe/reauth/${accountId}`,
      return_url: `${process.env.DOMAIN}/api/stripe/success/${accountId}`,
      type: "account_onboarding",
    });

    res.status(200).json({ url: link.url });
  } catch (error) {
    console.error("createOnboardingLink error:", error);
    res.status(500).json({ error: error.message });
  }
};

// SHIPPER: create Stripe Customer
exports.createCustomer = async (req, res) => {
  try {
    const stripe = getStripe();
    const [[user]] = await db.query(
      "SELECT id, email, CONCAT(first_name,' ',last_name) AS name FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });

    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: user.name || undefined,
    });

    await db.query("UPDATE users SET stripe_customer_id = ? WHERE id = ?", [
      customer.id,
      user.id,
    ]);
    res.json({ success: true, customerId: customer.id });
  } catch (error) {
    console.error("createCustomer error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// SHIPPER: create PaymentIntent (manual capture for later)
exports.createPaymentIntent = async (req, res) => {
  try {
    const stripe = getStripe();
    const { customerId, amount } = req.body;
    if (!customerId || !amount) {
      return res
        .status(400)
        .json({ success: false, error: "customerId and amount are required" });
    }

    const pi = await stripe.paymentIntents.create({
      amount: Number(amount) * 100, // cents,
      currency: "usd",
      customer: customerId,
      capture_method: "manual",
      payment_method_types: ["card"], // explicit
    });

    res.json({ success: true, client_secret: pi.client_secret });
  } catch (error) {
    console.error("createPaymentIntent error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// SHIPPER: attach payment method to customer
exports.attachPaymentMethod = async (req, res) => {
  try {
    const stripe = getStripe();
    const { customerId, paymentMethodId } = req.body;
    if (!customerId || !paymentMethodId) {
      return res.status(400).json({
        success: false,
        error: "customerId and paymentMethodId are required",
      });
    }

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    res.json({ success: true, message: "Payment method saved successfully!" });
  } catch (error) {
    console.error("attachPaymentMethod error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Payouts placeholder (implement once you have bookings/fees in MySQL)
exports.payouts = async (_req, res) => {
  try {
    return res.status(200).json({
      message:
        "Payouts will be implemented after bookings/fees schema is available.",
    });
  } catch (error) {
    console.error("payouts error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Onboarding success page
exports.success = async (req, res) => {
  try {
    const accountId = req.params.id;
    const [[user]] = await db.query(
      "SELECT id, is_stripe_verified FROM users WHERE stripe_account_id = ?",
      [accountId]
    );
    if (!user) return res.json({ success: false, message: "User not found." });

    const file = user.is_stripe_verified
      ? "congratulations.html"
      : "completed.html";
    res.sendFile(path.join(__dirname, "..", "public", file));
  } catch (error) {
    console.error("success error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Onboarding refresh/reauth
exports.reauth = async (_req, res) => {
  try {
    res.sendFile(path.join(__dirname, "..", "public", "expired.html"));
  } catch (error) {
    console.error("reauth error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// PLATFORM webhook (customers/payment_intents/etc.)
exports.webhook = async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Platform webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "charge.succeeded":
      // handle charge success if needed
      break;
    case "payment_intent.succeeded":
      // handle PI success if needed
      break;
    default:
      console.log(`Unhandled platform event ${event.type}`);
  }

  res.sendStatus(200);
};

// CONNECT webhook (driver account events)
exports.connectWebhook = async (req, res) => {
  console.log("connectWebhook route hit");
  const stripe = getStripe();
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, connectWebhookSecret);
  } catch (err) {
    console.error("Connect webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "account.updated": {
      const acct = event.data.object;
      console.log(
        "Stripe account.updated event received:",
        JSON.stringify(acct, null, 2)
      );
      if (acct.payouts_enabled) {
        const [result] = await db.query(
          "UPDATE users SET is_stripe_verified = 1 WHERE stripe_account_id = ?",
          [acct.id]
        );
        console.log("DB update result for is_stripe_verified:", result);
        // Optional: push notification + DB notification here, if you want.
      }
      break;
    }
    default:
      console.log(`Unhandled connect event ${event.type}`);
  }

  res.sendStatus(200);
};

// TEMP: Clear stripe_customer_id and stripe_account_id for authenticated user (for testing)
exports.clearStripeIds = async (req, res) => {
  try {
    await db.query(
      "UPDATE users SET stripe_customer_id = NULL, stripe_account_id = NULL WHERE id = ?",
      [req.user.id]
    );
    res.json({ success: true, message: "Stripe IDs cleared for user." });
  } catch (error) {
    console.error("clearStripeIds error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
