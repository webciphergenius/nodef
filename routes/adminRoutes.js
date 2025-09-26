const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

function ensureAdmin(req, res, next) {
  console.log("🔍 Checking admin authentication:", {
    hasSession: !!req.session,
    adminId: req.session?.adminId,
    adminUsername: req.session?.adminUsername,
    sessionId: req.sessionID,
    url: req.url,
  });

  if (req.session && req.session.adminId) {
    console.log("✅ Admin authenticated, proceeding...");
    return next();
  }

  console.log("❌ Admin not authenticated, redirecting to login");
  res.redirect("/admin/login");
}

router.get("/login", adminController.getLogin);
router.post("/login", adminController.postLogin);
router.get("/logout", adminController.logout);
router.get("/dashboard", ensureAdmin, adminController.getDashboard);
router.get("/shippers", ensureAdmin, adminController.listShippers);
router.get("/drivers", ensureAdmin, adminController.listDrivers);
router.get("/transactions", ensureAdmin, adminController.getTransactions);
router.get("/earnings", ensureAdmin, adminController.getEarnings);
router.post("/user/:id/block", ensureAdmin, adminController.blockUser);
router.post("/user/:id/unblock", ensureAdmin, adminController.unblockUser);
router.post("/user/:id/delete", ensureAdmin, adminController.deleteUser);

module.exports = router;
