const express = require("express");
const router = express.Router();
const controller = require("../controllers/shipperController");

router.post("/register", controller.registerShipper);
router.post("/verify-otp", controller.verifyOtp);
router.post("/resend-otp", controller.resendOtp);
router.post("/login", controller.loginShipper);
router.post("/logout", controller.logoutShipper);
//router.get("/protected", controller.protectedRoute);
router.get("/profile", controller.getShipperProfile);
router.put("/profile", controller.updateShipperProfile);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);

module.exports = router;
