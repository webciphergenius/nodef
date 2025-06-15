const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { authenticateUser } = require("../services/authService");

router.get("/", authenticateUser, notificationController.getNotifications);

module.exports = router;
