const express = require("express");
const router = express.Router();
const controller = require("../controllers/userController");
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
  "/register",
  upload.fields([
    { name: "license_file", maxCount: 1 },
    { name: "insurance_file", maxCount: 1 },
    { name: "registration_file", maxCount: 1 },
  ]),
  controller.registerUser
);

router.post("/verify-otp", controller.verifyOtp);
router.post("/resend-otp", controller.resendOtp);
router.post("/login", controller.loginUser);
router.post("/logout", authenticateUser, controller.logoutUser);
router.get("/profile", authenticateUser, controller.getUserProfile);
router.put(
  "/profile",
  authenticateUser,
  upload.single("profile_image"),
  controller.updateUserProfile
);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);

router.get(
  "/shipper/payments",
  authenticateUser,
  controller.getShipperPayments
);

router.get("/driver/payments", authenticateUser, controller.getDriverPayments);

module.exports = router;
