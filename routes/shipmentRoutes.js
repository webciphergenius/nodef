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
module.exports = router;
