const db = require("../config/db");

exports.sendNotification = async (userId, message) => {
  await db.query("INSERT INTO notifications (user_id, message) VALUES (?, ?)", [
    userId,
    message,
  ]);
};

// Lightweight QR helper; consider moving to utils/qr.js later
const QRCode = require("qrcode");
exports.generateQrDataUrl = async (text) => {
  return QRCode.toDataURL(text, { errorCorrectionLevel: "M" });
};
