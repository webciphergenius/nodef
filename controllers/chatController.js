exports.getChatHistory = async (req, res) => {
  const { userId, otherUserId, shipmentId } = req.query;

  try {
    const [rows] = await db.query(
      `SELECT * FROM messages
         WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND (shipment_id = ? OR ? IS NULL)
         ORDER BY created_at ASC`,
      [userId, otherUserId, otherUserId, userId, shipmentId, shipmentId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Chat fetch error:", err);
    res.status(500).json({ msg: "Failed to fetch chat history" });
  }
};
