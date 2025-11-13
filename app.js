import { Server } from "socket.io";
import cors from "cors";
import { createServer } from "http";
import express from "express";

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Menyimpan user_id ↔ socket.id
const userSockets = new Map();

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Client kirim user_id setelah login
  socket.on("register", (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`🔗 User ${userId} terdaftar di socket ${socket.id}`);
  });

  // Saat klien disconnect
  socket.on("disconnect", () => {
    for (const [userId, sId] of userSockets.entries()) {
      if (sId === socket.id) {
        userSockets.delete(userId);
        console.log(`❌ User ${userId} logout`);
        break;
      }
    }
  });
});

// Laravel panggil endpoint ini untuk kirim notifikasi
app.post("/notify", (req, res) => {
  const { user_id, title, message } = req.body;
  console.log("📩 Notifikasi diterima dari Laravel:", req.body);

  const targetSocketId = userSockets.get(user_id);
  if (targetSocketId) {
    io.to(targetSocketId).emit("notification", { title, message });
    console.log(`✅ Notifikasi dikirim ke user ${user_id}`);
  } else {
    console.log(`⚠️ User ${user_id} tidak online`);
  }

  res.json({ success: true });
});

httpServer.listen(9009, () => {
  console.log("✅ Socket.IO server running on http://localhost:9009");
});
