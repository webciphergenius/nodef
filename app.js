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

/**
 * ---------- RAW BODY + DIRECT HANDLERS (must be BEFORE express.json) ----------
 * Mount the webhook endpoints *with* express.raw and the controller handlers here.
 */
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeConnectController.webhook // <-- your platform/checkout webhook handler (if you have one)
);

app.post(
  "/api/stripe/connect-webhook",
  express.raw({ type: "application/json" }),
  stripeConnectController.connectWebhook // <-- your Connect webhook handler
);

// ---------- NORMAL PARSERS AFTER RAW ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- STATIC ----------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/public", express.static(path.join(__dirname, "public")));

// ---------- ROUTES ----------
app.use("/api/notifications", notificationRoutes);
app.use("/api", stripeConnectRoutes); // <-- safe now: NO webhook endpoints inside this router
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
