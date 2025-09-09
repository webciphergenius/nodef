const app = require("./app");
const http = require("http");
const socketio = require("socket.io");
const db = require("./config/db"); // Needed for saving messages
const { sendChatNotification } = require("./services/pushNotificationService");
require("dotenv").config();

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*", // change to actual frontend origin in production
    methods: ["GET", "POST"],
  },
});

const userSockets = {}; // Track connected users (last seen socketId)
const socketUser = {}; // Track socketId -> userId

io.on("connection", (socket) => {
  console.log("[socket] connected", {
    socketId: socket.id,
    ts: new Date().toISOString(),
  });

  socket.on("join", (userId) => {
    const room = String(userId);
    userSockets[userId] = socket.id;
    socketUser[socket.id] = room;
    socket.join(room); // Join personal room
    console.log("[socket] join", {
      userId: room,
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
      const senderRoom = String(senderId);

      // Get room info for debugging
      const receiverRoomInfo = io.sockets.adapter.rooms.get(receiverRoom);
      const senderRoomInfo = io.sockets.adapter.rooms.get(senderRoom);
      const receiverCount = receiverRoomInfo?.size || 0;
      const senderCount = senderRoomInfo?.size || 0;

      console.log("[socket] room_info", {
        receiverRoom,
        senderRoom,
        receiverRoomExists: !!receiverRoomInfo,
        senderRoomExists: !!senderRoomInfo,
        receiverCount,
        senderCount,
        allRooms: Array.from(io.sockets.adapter.rooms.keys()),
        userSockets,
        socketUser,
      });

      // Broadcast to BOTH sender and receiver rooms (multi-device-safe)
      io.to([receiverRoom, senderRoom]).emit("private_message", {
        id: result.insertId,
        senderId,
        receiverId,
        message,
        shipmentId,
        created_at: new Date().toISOString(),
      });
      console.log("[socket] private_message:emitted", {
        toRooms: [receiverRoom, senderRoom],
        receiverCount,
        senderCount,
        ...meta,
      });

      // Send push notification to receiver if they're not online
      if (receiverCount === 0) {
        try {
          // Get receiver's device token and sender's name
          const [receiverData] = await db.query(
            "SELECT device_token FROM users WHERE id = ?",
            [receiverId]
          );
          const [senderData] = await db.query(
            "SELECT first_name, last_name FROM users WHERE id = ?",
            [senderId]
          );

          if (receiverData.length > 0 && receiverData[0].device_token) {
            const senderName =
              senderData.length > 0
                ? `${senderData[0].first_name} ${senderData[0].last_name}`.trim()
                : "Someone";

            await sendChatNotification(
              receiverData[0].device_token,
              senderName,
              message,
              shipmentId
            );
            console.log(
              "[socket] push notification sent to receiver",
              receiverId
            );
          }
        } catch (pushError) {
          console.error("[socket] push notification error:", pushError);
        }
      }

      if (typeof ack === "function") {
        ack({ ok: true, id: result.insertId, receiverCount, senderCount });
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

  // Add a test endpoint to verify socket is working
  socket.on("ping", (callback) => {
    console.log("[socket] ping received from", socket.id);
    if (typeof callback === "function") {
      callback({
        pong: true,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });
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
    delete socketUser[socket.id];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
