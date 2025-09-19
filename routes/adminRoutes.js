const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

function ensureAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
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
