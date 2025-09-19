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
const { uploadFile, getFileUrlFromFilename } = require("../utils/uploadConfig");

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
    city,
    state,
    apartment,
    username,
    password,
    confirm_password,
    vehicle_type,
    vehicle_number,
    load_capacity,
    company,
  } = req.body;

  // Handle file uploads (R2 or local)
  let license_file = null;
  let insurance_file = null;
  let registration_file = null;

  try {
    if (req.files?.license_file?.[0]) {
      const result = await uploadFile(
        req.files.license_file[0],
        "driver-documents"
      );
      license_file = result.filename;
    }
    if (req.files?.insurance_file?.[0]) {
      const result = await uploadFile(
        req.files.insurance_file[0],
        "driver-documents"
      );
      insurance_file = result.filename;
    }
    if (req.files?.registration_file?.[0]) {
      const result = await uploadFile(
        req.files.registration_file[0],
        "driver-documents"
      );
      registration_file = result.filename;
    }
  } catch (uploadError) {
    console.error("File upload error:", uploadError);
    return res.status(500).json({ msg: "File upload failed" });
  }

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
      role, first_name, last_name, phone, email, zipcode, country, address, city, state, apartment,
      username, password, company,
      vehicle_type, vehicle_number, load_capacity,
      license_file, insurance_file, registration_file
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        role,
        first_name,
        last_name,
        phone,
        email,
        zipcode,
        country,
        address,
        city || null,
        state || null,
        apartment || null,
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
  const { phone, password, device_token } = req.body;
  try {
    const result = await loginUser("users", phone, password);
    if (!result) return res.status(401).json({ msg: "Login failed" });

    // Update device token if provided
    if (device_token) {
      await db.query("UPDATE users SET device_token = ? WHERE id = ?", [
        device_token,
        result.user.id,
      ]);
    }

    res.status(200).json({
      msg: "Login successful",
      token: result.token,
      user: result.user,
      userType: result.user.role, // Return role for frontend to determine type
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

    const user = rows[0];

    // Convert file paths to proper URLs
    if (user.profile_image) {
      user.profile_image = getFileUrlFromFilename(user.profile_image);
    }
    if (user.license_file) {
      user.license_file = getFileUrlFromFilename(user.license_file);
    }
    if (user.insurance_file) {
      user.insurance_file = getFileUrlFromFilename(user.insurance_file);
    }
    if (user.registration_file) {
      user.registration_file = getFileUrlFromFilename(user.registration_file);
    }

    res.status(200).json(user);
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
      city,
      state,
      apartment,
      vehicle_type,
      vehicle_number,
      load_capacity,
      country,
    } = req.body;

    // Handle profile image upload (R2 or local)
    let profile_image = null;

    if (req.file) {
      try {
        const result = await uploadFile(req.file, "profile-images");
        profile_image = result.url;
      } catch (uploadError) {
        console.error("Profile image upload error:", uploadError);
        return res.status(500).json({ msg: "Profile image upload failed" });
      }
    }

    let query = `
      UPDATE users 
      SET first_name = ?, last_name = ?, email = ?, company = ?, zipcode = ?, address = ?, city = ?, state = ?, apartment = ?, vehicle_type = ?, vehicle_number = ?, load_capacity = ?, country = ?
    `;
    const params = [
      first_name,
      last_name,
      email,
      company,
      zipcode,
      address,
      city,
      state,
      apartment,
      vehicle_type,
      vehicle_number,
      load_capacity,
      country,
    ];

    if (profile_image) {
      query += `, profile_image = ?`;
      params.push(profile_image);
    }

    query += ` WHERE id = ?`;
    params.push(decoded.id);

    await db.query(query, params);

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

exports.getShipperPayments = async (req, res) => {
  try {
    const shipperId = req.user.id;

    const [shipments] = await db.query(
      "SELECT * FROM shipments WHERE shipper_id = ?",
      [shipperId]
    );

    const totalPayments = shipments.reduce((acc, shipment) => {
      return acc + parseFloat(shipment.declared_value);
    }, 0);

    res.status(200).json({ shipments, totalPayments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch shipper payments" });
  }
};

exports.getDriverPayments = async (req, res) => {
  try {
    const driverId = req.user.id;

    const [payments] = await db.query(
      "SELECT p.*, s.shipment_identifier, s.pickup_location_name, s.dropoff_location_name, s.package_instructions, s.status FROM payments p JOIN shipments s ON p.shipment_id = s.id WHERE p.driver_id = ?",
      [driverId]
    );

    const totalEarnings = payments.reduce((acc, payment) => {
      return acc + parseFloat(payment.amount);
    }, 0);

    res.status(200).json({ payments, totalEarnings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch driver payments" });
  }
};
