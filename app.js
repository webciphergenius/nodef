const express = require("express");
const app = express();
const path = require("path");

const chatRoutes = require("./routes/chatRoutes");
const bodyParser = require("body-parser");
const unifiedRoutes = require("./routes/userRoutes");
const shipmentRoutes = require("./routes/shipmentRoutes");
const stripeWebhookRoutes = require("./routes/stripeWebhookRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);
// ✅ Stripe webhook must be BEFORE express.json()
app.use("/api/webhook", express.raw({ type: "application/json" }));
app.use("/api/webhook", stripeWebhookRoutes); // Mount after raw
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// ✅ All other JSON routes after this
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/chat", chatRoutes);
app.use("/api", unifiedRoutes);
app.use("/api/shipment", shipmentRoutes);

module.exports = app;
