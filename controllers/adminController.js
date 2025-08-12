const db = require("../config/db");
const bcrypt = require("bcryptjs");

exports.getLogin = (req, res) => {
  res.render("admin-login", { error: null });
};

exports.postLogin = async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await db.query("SELECT * FROM admins WHERE username = ?", [
    username,
  ]);
  if (!rows.length) {
    return res.render("admin-login", { error: "Invalid username or password" });
  }
  const admin = rows[0];
  const match = await bcrypt.compare(password, admin.password);
  if (!match) {
    return res.render("admin-login", { error: "Invalid username or password" });
  }
  req.session.adminId = admin.id;
  req.session.adminUsername = admin.username;
  res.redirect("/admin/dashboard");
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
};

exports.getDashboard = (req, res) => {
  res.render("admin-dashboard", {
    admin: { username: req.session.adminUsername },
  });
};

exports.listShippers = async (req, res) => {
  const [shippers] = await db.query(
    "SELECT * FROM users WHERE role = 'shipper'"
  );
  res.render("admin-shippers", {
    admin: { username: req.session.adminUsername },
    shippers,
  });
};

exports.listDrivers = async (req, res) => {
  const [drivers] = await db.query("SELECT * FROM users WHERE role = 'driver'");
  res.render("admin-drivers", {
    admin: { username: req.session.adminUsername },
    drivers,
  });
};

exports.blockUser = async (req, res) => {
  const { id } = req.params;
  await db.query("UPDATE users SET is_blocked = 1 WHERE id = ?", [id]);
  res.redirect("back");
};

exports.unblockUser = async (req, res) => {
  const { id } = req.params;
  await db.query("UPDATE users SET is_blocked = 0 WHERE id = ?", [id]);
  res.redirect("back");
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM users WHERE id = ?", [id]);
  res.redirect("back");
};
