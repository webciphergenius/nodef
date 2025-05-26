const express = require("express");
const router = express.Router();
const controller = require("../controllers/userController");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

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
router.post("/logout", controller.logoutUser);
router.get("/profile", controller.getUserProfile);
router.put("/profile", controller.updateUserProfile);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);

module.exports = router;
