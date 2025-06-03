const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { authenticateUser } = require("../services/authService");

router.get("/history", authenticateUser, chatController.getChatHistory);

module.exports = router;
