const express = require("express");
const router = express.Router();
const controller = require("../controllers/shipmentController");
const multer = require("multer");
const path = require("path");
const authMiddleware = require("../middleware/auth");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.post(
  "/create",
  authMiddleware,
  upload.array("shipment_images"),
  controller.createShipment
);

module.exports = router;
