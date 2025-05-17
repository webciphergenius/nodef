const db = require("../config/db");
const { sendOTP } = require("../utils/otp");

exports.generateAndSendOTP = async (phone) => {
  const otpCode = Math.floor(100000 + Math.random() * 900000);
  await db.query(
    "INSERT INTO otp_codes (phone, code, expires_at) VALUES (?, ?, NOW() + INTERVAL 5 MINUTE)",
    [phone, otpCode]
  );
  await sendOTP(phone, otpCode);
};

exports.verifyOTP = async (phone, code) => {
  const [rows] = await db.query(
    "SELECT * FROM otp_codes WHERE phone = ? AND code = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
    [phone, code]
  );
  return rows.length > 0;
};
