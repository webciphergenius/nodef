const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const session = require("express-session");

const chatRoutes = require("./routes/chatRoutes");
const unifiedRoutes = require("./routes/userRoutes");
const shipmentRoutes = require("./routes/shipmentRoutes");

const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const stripeConnectRoutes = require("./routes/stripeConnectRoutes");
const stripeConnectController = require("./controllers/stripeConnectController"); // ⬅️ add this
require("./config/payments_table");

const fs = require("fs");
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// ---------- STATIC ----------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/public", express.static(path.join(__dirname, "public")));

const allowedOrigins = ["http://localhost:8000", "http://127.0.0.1:8000"];

// CORS for /api
app.use(
  "/api",
  cors({
    origin(origin, cb) {
      if (allowedOrigins.indexOf(origin) !== -1 || !origin) cb(null, true);
      else cb(new Error("Not allowed by CORS"));
    },
  })
);

// ---------- PARSERS ----------
// Stripe webhooks must be defined BEFORE body parsers to access the raw body
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeConnectController.webhook
);
app.post(
  "/api/stripe/connect-webhook",
  express.raw({ type: "application/json" }),
  stripeConnectController.connectWebhook
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- ROUTES ----------
app.use("/api/notifications", notificationRoutes);
app.use("/api", stripeConnectRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api", unifiedRoutes);
app.use("/api/shipment", shipmentRoutes);

// ---------- VIEWS & SESSION ----------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Admin after parsers
app.use("/admin", adminRoutes);

module.exports = app;
