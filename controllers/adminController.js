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

exports.getDashboard = async (req, res) => {
  try {
    // Get comprehensive dashboard statistics
    const [
      totalUsers,
      totalShippers,
      totalDrivers,
      totalShipments,
      activeShipments,
      completedShipments,
      totalRevenue,
      recentTransactions,
      topDrivers,
      topShippers,
    ] = await Promise.all([
      // Total users
      db.query("SELECT COUNT(*) as count FROM users"),

      // Total shippers
      db.query("SELECT COUNT(*) as count FROM users WHERE role = 'shipper'"),

      // Total drivers
      db.query("SELECT COUNT(*) as count FROM users WHERE role = 'driver'"),

      // Total shipments
      db.query("SELECT COUNT(*) as count FROM shipments"),

      // Active shipments (accepted, picked_up, in_transit, awaiting_confirmation)
      db.query(
        "SELECT COUNT(*) as count FROM shipments WHERE status IN ('accepted', 'picked_up', 'in_transit', 'awaiting_confirmation')"
      ),

      // Completed shipments
      db.query(
        "SELECT COUNT(*) as count FROM shipments WHERE status = 'delivered'"
      ),

      // Total revenue from payments
      db.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid'"
      ),

      // Recent transactions (last 10)
      db.query(`
        SELECT p.*, s.shipment_identifier, 
               shipper.first_name as shipper_name, shipper.last_name as shipper_lastname,
               driver.first_name as driver_name, driver.last_name as driver_lastname
        FROM payments p
        LEFT JOIN shipments s ON p.shipment_id = s.id
        LEFT JOIN users shipper ON p.shipper_id = shipper.id
        LEFT JOIN users driver ON p.driver_id = driver.id
        WHERE p.status = 'paid'
        ORDER BY p.created_at DESC
        LIMIT 10
      `),

      // Top drivers by earnings
      db.query(`
        SELECT d.id, d.first_name, d.last_name, d.phone, d.email,
               COUNT(p.id) as total_shipments,
               COALESCE(SUM(p.amount), 0) as total_earnings
        FROM users d
        LEFT JOIN payments p ON d.id = p.driver_id AND p.status = 'paid'
        WHERE d.role = 'driver'
        GROUP BY d.id
        ORDER BY total_earnings DESC
        LIMIT 5
      `),

      // Top shippers by spending
      db.query(`
        SELECT s.id, s.first_name, s.last_name, s.phone, s.email,
               COUNT(p.id) as total_shipments,
               COALESCE(SUM(p.amount), 0) as total_spent
        FROM users s
        LEFT JOIN payments p ON s.id = p.shipper_id AND p.status = 'paid'
        WHERE s.role = 'shipper'
        GROUP BY s.id
        ORDER BY total_spent DESC
        LIMIT 5
      `),
    ]);

    const stats = {
      totalUsers: totalUsers[0][0].count,
      totalShippers: totalShippers[0][0].count,
      totalDrivers: totalDrivers[0][0].count,
      totalShipments: totalShipments[0][0].count,
      activeShipments: activeShipments[0][0].count,
      completedShipments: completedShipments[0][0].count,
      totalRevenue: parseFloat(totalRevenue[0][0].total),
      recentTransactions: recentTransactions[0],
      topDrivers: topDrivers[0],
      topShippers: topShippers[0],
    };

    res.render("admin-dashboard", {
      admin: { username: req.session.adminUsername },
      stats,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.render("admin-dashboard", {
      admin: { username: req.session.adminUsername },
      stats: null,
      error: "Failed to load dashboard statistics",
    });
  }
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

exports.getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    // Get total count
    const [totalCount] = await db.query(
      "SELECT COUNT(*) as count FROM payments WHERE status = 'paid'"
    );

    // Get paginated transactions
    const [transactions] = await db.query(
      `
      SELECT p.*, s.shipment_identifier, s.status as shipment_status,
             shipper.first_name as shipper_name, shipper.last_name as shipper_lastname, shipper.phone as shipper_phone,
             driver.first_name as driver_name, driver.last_name as driver_lastname, driver.phone as driver_phone
      FROM payments p
      LEFT JOIN shipments s ON p.shipment_id = s.id
      LEFT JOIN users shipper ON p.shipper_id = shipper.id
      LEFT JOIN users driver ON p.driver_id = driver.id
      WHERE p.status = 'paid'
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [limit, offset]
    );

    // Get summary statistics
    const [summary] = await db.query(`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_revenue,
        COALESCE(AVG(amount), 0) as average_transaction,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN amount ELSE 0 END), 0) as today_revenue,
        COALESCE(SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN amount ELSE 0 END), 0) as week_revenue,
        COALESCE(SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN amount ELSE 0 END), 0) as month_revenue
      FROM payments 
      WHERE status = 'paid'
    `);

    const totalPages = Math.ceil(totalCount[0].count / limit);

    res.render("admin-transactions", {
      admin: { username: req.session.adminUsername },
      transactions,
      summary: summary[0],
      pagination: {
        currentPage: page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextPage: page + 1,
        prevPage: page - 1,
      },
    });
  } catch (error) {
    console.error("Transactions error:", error);
    res.render("admin-transactions", {
      admin: { username: req.session.adminUsername },
      transactions: [],
      summary: null,
      error: "Failed to load transactions",
    });
  }
};

exports.getEarnings = async (req, res) => {
  try {
    // Get driver earnings summary
    const [driverEarnings] = await db.query(`
      SELECT d.id, d.first_name, d.last_name, d.phone, d.email,
             COUNT(p.id) as total_shipments,
             COALESCE(SUM(p.amount), 0) as total_earnings,
             COALESCE(AVG(p.amount), 0) as average_earning,
             MAX(p.created_at) as last_payment
      FROM users d
      LEFT JOIN payments p ON d.id = p.driver_id AND p.status = 'paid'
      WHERE d.role = 'driver'
      GROUP BY d.id
      ORDER BY total_earnings DESC
    `);

    // Get platform revenue summary
    const [platformStats] = await db.query(`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_revenue,
        COALESCE(AVG(amount), 0) as average_transaction,
        COUNT(DISTINCT shipper_id) as unique_shippers,
        COUNT(DISTINCT driver_id) as unique_drivers
      FROM payments 
      WHERE status = 'paid'
    `);

    res.render("admin-earnings", {
      admin: { username: req.session.adminUsername },
      driverEarnings,
      platformStats: platformStats[0],
    });
  } catch (error) {
    console.error("Earnings error:", error);
    res.render("admin-earnings", {
      admin: { username: req.session.adminUsername },
      driverEarnings: [],
      platformStats: null,
      error: "Failed to load earnings data",
    });
  }
};
