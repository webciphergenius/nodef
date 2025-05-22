const express = require("express");
const router = express.Router();
const controller = require("../controllers/driverController");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post(
  "/register",
  upload.fields([
    { name: "license_file", maxCount: 1 },
    { name: "insurance_file", maxCount: 1 },
    { name: "registration_file", maxCount: 1 },
  ]),
  controller.registerDriver
);

router.post("/verify-otp", controller.verifyOtp);
router.post("/login", controller.loginDriver);
router.post("/logout", controller.logoutDriver);
router.get("/profile", controller.getDriverProfile);
router.put("/profile", controller.updateDriverProfile);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);
module.exports = router;
