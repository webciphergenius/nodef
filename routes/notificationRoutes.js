const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { authenticateUser } = require("../middleware/auth");

router.get("/", authenticateUser, notificationController.getNotifications);

module.exports = router;
