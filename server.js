const app = require("./app");
const http = require("http");
const socketio = require("socket.io");
const db = require("./config/db"); // Needed for saving messages
require("dotenv").config();

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*", // change to actual frontend origin in production
    methods: ["GET", "POST"],
  },
});

const userSockets = {}; // Track connected users

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    userSockets[userId] = socket.id;
    socket.join(userId); // Join personal room
  });

  socket.on(
    "private_message",
    async ({ senderId, receiverId, message, shipmentId }) => {
      try {
        await db.query(
          "INSERT INTO messages (sender_id, receiver_id, shipment_id, message) VALUES (?, ?, ?, ?)",
          [senderId, receiverId, shipmentId || null, message]
        );

        const receiverSocket = userSockets[receiverId];
        if (receiverSocket) {
          io.to(receiverSocket).emit("private_message", { senderId, message });
        }
      } catch (err) {
        console.error("Error saving message:", err);
      }
    }
  );

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // Optional: cleanup userSockets
    for (const userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        delete userSockets[userId];
        break;
      }
    }
  });
});
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on(
    "location_update",
    async ({ shipmentId, driverId, latitude, longitude }) => {
      try {
        // Save to locations table
        await db.query(
          "INSERT INTO locations (shipment_id, driver_id, latitude, longitude) VALUES (?, ?, ?, ?)",
          [shipmentId, driverId, latitude, longitude]
        );

        // Emit to clients who might be watching this shipment
        io.emit(`shipment_${shipmentId}_location`, {
          driverId,
          latitude,
          longitude,
          shipmentId,
          timestamp: new Date(),
        });
      } catch (err) {
        console.error("Location update error:", err);
      }
    }
  );
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
