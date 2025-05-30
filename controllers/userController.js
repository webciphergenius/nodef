const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  generateAndSendOTP,
  verifyOTP,
  handleOtpResend,
} = require("../services/otpService");
const {
  loginUser,
  logout,
  tokenBlacklist,
} = require("../services/authService");

exports.registerUser = async (req, res) => {
  const {
    role,
    first_name,
    last_name,
    phone,
    email,
    zipcode,
    country,
    address,
    username,
    password,
    confirm_password,
    vehicle_type,
    vehicle_number,
    load_capacity,
    company,
  } = req.body;

  const license_file = req.files?.license_file?.[0]?.filename;
  const insurance_file = req.files?.insurance_file?.[0]?.filename;
  const registration_file = req.files?.registration_file?.[0]?.filename;

  if (!role || !["shipper", "driver"].includes(role))
    return res
      .status(400)
      .json({ msg: "Valid role (shipper/driver) is required" });

  if (
    !first_name ||
    !last_name ||
    !phone ||
    !username ||
    !password ||
    !confirm_password
  )
    return res.status(400).json({ msg: "Required fields missing" });

  if (password !== confirm_password)
    return res.status(400).json({ msg: "Passwords do not match" });

  try {
    const [existing] = await db.query(
      "SELECT * FROM users WHERE phone = ? OR username = ?",
      [phone, username]
    );
    if (existing.length)
      return res.status(409).json({ msg: "Phone or username already exists" });

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (
      role, first_name, last_name, phone, email, zipcode, country, address,
      username, password, company,
      vehicle_type, vehicle_number, load_capacity,
      license_file, insurance_file, registration_file
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        role,
        first_name,
        last_name,
        phone,
        email,
        zipcode,
        country,
        address,
        username,
        hash,
        company || null,
        vehicle_type || null,
        vehicle_number || null,
        load_capacity || null,
        license_file || null,
        insurance_file || null,
        registration_file || null,
      ]
    );

    await generateAndSendOTP(phone);
    res.status(201).json({ msg: `${role} registered. OTP sent to phone.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  try {
    const valid = await verifyOTP(phone, otp);
    if (!valid) return res.status(400).json({ msg: "Invalid or expired OTP" });
    await db.query("UPDATE users SET is_verified = true WHERE phone = ?", [
      phone,
    ]);
    res.status(200).json({ msg: "Phone verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "OTP verification failed" });
  }
};

exports.resendOtp = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ msg: "Phone number is required" });
  try {
    const result = await handleOtpResend(phone);
    if (result.tooSoon)
      return res
        .status(429)
        .json({ msg: "Please wait before requesting another OTP" });
    res.status(200).json({ msg: "OTP resent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error resending OTP" });
  }
};

exports.loginUser = async (req, res) => {
  const { phone, password } = req.body;
  try {
    const result = await loginUser("users", phone, password);
    if (!result) return res.status(401).json({ msg: "Login failed" });
    res.status(200).json({
      msg: "Login successful",
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Login error" });
  }
};

exports.logoutUser = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ msg: "No token provided" });
  const token = authHeader.split(" ")[1];
  logout(token);
  res.status(200).json({ msg: "Logged out successfully" });
};

exports.getUserProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ msg: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    if (tokenBlacklist.has(token))
      return res.status(401).json({ msg: "Token has been invalidated" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [
      decoded.id,
    ]);
    if (!rows.length) return res.status(404).json({ msg: "User not found" });
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(401).json({ msg: "Invalid or expired token" });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ msg: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    if (tokenBlacklist.has(token))
      return res.status(401).json({ msg: "Token has been invalidated" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const {
      first_name,
      last_name,
      email,
      company,
      zipcode,
      address,
      vehicle_type,
      vehicle_number,
      load_capacity,
      country,
    } = req.body;
    await db.query(
      "UPDATE users SET first_name = ?, last_name = ?, email = ?, company = ?, zipcode = ?, address = ?, vehicle_type = ?, vehicle_number = ?, load_capacity = ?, country = ? WHERE id = ?",
      [
        first_name,
        last_name,
        email,
        company,
        zipcode,
        address,
        vehicle_type,
        vehicle_number,
        load_capacity,
        country,
        decoded.id,
      ]
    );
    res.status(200).json({ msg: "Profile updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Profile update failed" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ msg: "Phone number is required" });
  try {
    const [user] = await db.query("SELECT id FROM users WHERE phone = ?", [
      phone,
    ]);
    if (!user.length) return res.status(404).json({ msg: "Phone not found" });
    await generateAndSendOTP(phone);
    res.status(200).json({ msg: "OTP sent to phone" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to send OTP" });
  }
};

exports.resetPassword = async (req, res) => {
  const { phone, otp, password, confirm_password } = req.body;
  if (!phone || !otp || !password || !confirm_password)
    return res.status(400).json({ msg: "All fields are required" });
  if (password !== confirm_password)
    return res.status(400).json({ msg: "Passwords do not match" });
  try {
    const valid = await verifyOTP(phone, otp);
    if (!valid) return res.status(400).json({ msg: "Invalid or expired OTP" });
    const hash = await bcrypt.hash(password, 10);
    await db.query("UPDATE users SET password = ? WHERE phone = ?", [
      hash,
      phone,
    ]);
    res.status(200).json({ msg: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to reset password" });
  }
};
