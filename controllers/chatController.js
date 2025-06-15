const db = require("../config/db");
exports.getChatHistory = async (req, res) => {
  try {
    const { userId, otherUserId, shipmentID } = req.query;

    if (!userId || !otherUserId || !shipmentID) {
      return res.status(400).json({ msg: "Missing required query parameters" });
    }

    // Fetch messages
    const [messages] = await db.query(
      `SELECT * FROM messages 
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       AND shipment_id = ?
       ORDER BY created_at ASC`,
      [userId, otherUserId, otherUserId, userId, shipmentID]
    );

    // Get sender and receiver info
    const [[sender]] = await db.query(
      "SELECT id, CONCAT(first_name, ' ', last_name) AS name, profile_image FROM users WHERE id = ?",
      [userId]
    );

    const [[receiver]] = await db.query(
      "SELECT id, CONCAT(first_name, ' ', last_name) AS name, profile_image FROM users WHERE id = ?",
      [otherUserId]
    );

    res.status(200).json({
      messages,
      sender: {
        id: sender.id,
        name: sender.name,
        image: sender.profile_image || null,
      },
      receiver: {
        id: receiver.id,
        name: receiver.name,
        image: receiver.profile_image || null,
      },
    });
  } catch (err) {
    console.error("Error fetching chat history:", err);
    res.status(500).json({ msg: "Failed to fetch chat history" });
  }
};
