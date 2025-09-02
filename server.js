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

const userSockets = {}; // Track connected users (last seen socketId)

io.on("connection", (socket) => {
  console.log("[socket] connected", {
    socketId: socket.id,
    ts: new Date().toISOString(),
  });

  socket.on("join", (userId) => {
    const room = String(userId);
    userSockets[userId] = socket.id;
    socket.join(room); // Join personal room (supports multi-device)
    console.log("[socket] join", {
      userId,
      room,
      socketId: socket.id,
      rooms: Array.from(socket.rooms || []),
    });
  });

  socket.on("private_message", async (payload, ack) => {
    const { senderId, receiverId, message, shipmentId } = payload || {};
    const meta = {
      senderId,
      receiverId,
      shipmentId,
      socketId: socket.id,
      ts: new Date().toISOString(),
    };
    console.log("[socket] private_message:received", {
      ...meta,
      messageLength: (message || "").length,
    });
    try {
      const [result] = await db.query(
        "INSERT INTO messages (sender_id, receiver_id, shipment_id, message) VALUES (?, ?, ?, ?)",
        [senderId, receiverId, shipmentId || null, message]
      );
      console.log("[socket] private_message:saved", {
        insertId: result.insertId,
        ...meta,
      });

      const receiverRoom = String(receiverId);
      const delivered = io.sockets.adapter.rooms.get(receiverRoom)?.size || 0;

      // Emit to receiver room (all devices)
      io.to(receiverRoom).emit("private_message", {
        id: result.insertId,
        senderId,
        receiverId,
        message,
        shipmentId,
        created_at: new Date().toISOString(),
      });
      console.log("[socket] private_message:emitted", {
        toRoom: receiverRoom,
        deliveredCount: delivered,
        ...meta,
      });

      // Echo to sender for immediate UI update
      socket.emit("private_message", {
        id: result.insertId,
        senderId,
        receiverId,
        message,
        shipmentId,
        created_at: new Date().toISOString(),
        self: true,
      });

      if (typeof ack === "function") {
        ack({ ok: true, id: result.insertId, deliveredCount: delivered });
      }
    } catch (err) {
      console.error("[socket] private_message:error", {
        error: err.message,
        stack: err.stack,
        ...meta,
      });
      if (typeof ack === "function") ack({ ok: false, error: err.message });
    }
  });

  socket.on(
    "location_update",
    async ({ shipmentId, driverId, latitude, longitude }) => {
      const meta = {
        shipmentId,
        driverId,
        socketId: socket.id,
        ts: new Date().toISOString(),
      };
      console.log("[socket] location_update:received", {
        ...meta,
        latitude,
        longitude,
      });
      try {
        const [result] = await db.query(
          "INSERT INTO locations (shipment_id, driver_id, latitude, longitude) VALUES (?, ?, ?, ?)",
          [shipmentId, driverId, latitude, longitude]
        );
        console.log("[socket] location_update:saved", {
          insertId: result.insertId,
          ...meta,
        });

        io.emit(`shipment_${shipmentId}_location`, {
          driverId,
          latitude,
          longitude,
          shipmentId,
          timestamp: new Date(),
        });
        console.log("[socket] location_update:emitted", {
          channel: `shipment_${shipmentId}_location`,
          ...meta,
        });
      } catch (err) {
        console.error("[socket] location_update:error", {
          error: err.message,
          stack: err.stack,
          ...meta,
        });
      }
    }
  );

  socket.on("disconnect", () => {
    console.log("[socket] disconnected", {
      socketId: socket.id,
      ts: new Date().toISOString(),
    });
    for (const userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        delete userSockets[userId];
        console.log("[socket] cleanup", { userId });
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
