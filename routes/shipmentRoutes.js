const express = require("express");
const router = express.Router();
const controller = require("../controllers/shipmentController");
const multer = require("multer");
const path = require("path");
const { authenticateUser } = require("../services/authService");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });
router.post(
  "/create",
  authenticateUser,
  upload.array("shipment_images"),
  controller.createShipment
);
router.get("/available", authenticateUser, controller.listAvailableShipments);
router.get("/active", authenticateUser, controller.getActiveShipments);
router.get("/completed", authenticateUser, controller.getCompletedShipments);
router.post("/accept/:shipmentId", authenticateUser, controller.acceptShipment);
router.get("/accepted", authenticateUser, controller.listAcceptedShipments);
router.post(
  "/:shipmentId/location",
  authenticateUser,
  controller.updateLocation
);
router.get(
  "/:shipmentId/location",
  authenticateUser,
  controller.getLatestLocation
);
router.get(
  "/latest/:shipmentId",
  authenticateUser,
  controller.getLatestLocation
);
router.get("/counts", authenticateUser, controller.getShipmentCounts);
router.get(
  "/driver/dashboard",
  authenticateUser,
  controller.getDriverDashboardStats
);
router.post(
  "/mark-picked-up/:shipmentId",
  authenticateUser,
  controller.markPickedUp
);
router.post(
  "/mark-in-transit/:shipmentId",
  authenticateUser,
  controller.markInTransit
);
router.post(
  "/mark-delivered/:shipmentId",
  authenticateUser,
  controller.markDelivered
);

// QR & confirmation
router.get("/:shipmentId/qr", authenticateUser, controller.getShipmentQr);

// Driver manually verifies OTP (when recipient tells driver the OTP)
router.post(
  "/:shipmentId/confirm-driver-otp",
  authenticateUser,
  controller.confirmDriverOtp
);

// Recipient confirms via web page (QR code opens this) - no auth required
router.post("/confirm-recipient-web", controller.confirmRecipientWeb);

module.exports = router;
