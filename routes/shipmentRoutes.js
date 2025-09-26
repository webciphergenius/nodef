const express = require("express");
const router = express.Router();
const controller = require("../controllers/shipmentController");
const multer = require("multer");
const path = require("path");
const { authenticateUser } = require("../services/authService");
const { getMulterStorage } = require("../utils/uploadConfig");

const storage = getMulterStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB per file
    fieldSize: 20 * 1024 * 1024, // 20 MB per text field
    fields: 100,
    fieldNameSize: 200,
  },
});
router.post(
  "/create",
  authenticateUser,
  upload.array("shipment_images"),
  (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer Error:", err);
      if (err.code === "UNEXPECTED_FIELD") {
        console.error("Unexpected field:", err.field);
        return res.status(400).json({
          msg: `Unexpected field: ${err.field}. Expected only 'shipment_images' for file uploads.`,
        });
      }
      return res.status(400).json({ msg: "File upload error: " + err.message });
    }
    next(err);
  },
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

// Shipment cancellation endpoints
router.post(
  "/cancel-by-shipper/:shipmentId",
  authenticateUser,
  controller.cancelShipmentByShipper
);

router.post(
  "/cancel-by-driver/:shipmentId",
  authenticateUser,
  controller.cancelShipmentByDriver
);

module.exports = router;
