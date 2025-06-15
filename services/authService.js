const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.loginUser = async (table, phone, password) => {
  const [rows] = await db.query(`SELECT * FROM ${table} WHERE phone = ?`, [
    phone,
  ]);
  const user = rows[0];
  if (!user || !user.is_verified) return null;

  const match = await bcrypt.compare(password, user.password);
  if (!match) return null;

  const token = jwt.sign(
    { id: user.id, username: user.username, phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  delete user.password; // 🔐 Remove password before returning

  return { token, user };
};

exports.tokenBlacklist = new Set();

exports.logout = (token) => {
  exports.tokenBlacklist.add(token);
};
exports.authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ msg: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  if (exports.tokenBlacklist.has(token)) {
    return res.status(401).json({ msg: "Token has been invalidated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      phone: decoded.phone,
      role: decoded.role, // <- Ensure 'role' is included in the token
    }; // Save user info to req
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
};
