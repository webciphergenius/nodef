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

  return { token, user };
};

exports.tokenBlacklist = new Set();

exports.logout = (token) => {
  exports.tokenBlacklist.add(token);
};
