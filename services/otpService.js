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
exports.handleOtpResend = async (phone) => {
  const [recent] = await db.query(
    "SELECT * FROM otp_codes WHERE phone = ? ORDER BY created_at DESC LIMIT 1",
    [phone]
  );

  if (recent.length > 0) {
    const lastSent = new Date(recent[0].created_at);
    const now = new Date();
    const diff = (now - lastSent) / 1000;
    if (diff < 60) {
      return { tooSoon: true };
    }
  }

  await exports.generateAndSendOTP(phone);
  return { tooSoon: false };
};
