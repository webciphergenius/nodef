const db = require("../config/db");

exports.sendNotification = async (userId, message) => {
  await db.query("INSERT INTO notifications (user_id, message) VALUES (?, ?)", [
    userId,
    message,
  ]);
};
