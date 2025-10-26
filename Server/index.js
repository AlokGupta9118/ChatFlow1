// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import UserRoutes from "./routes/UserRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import challengeRoutes from "./routes/challengeRoutes.js";
import collectionRoutes from "./routes/collectionRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import chatRoomRoutes from "./routes/chatRoomRoutes.js";
import settingRoutes from "./routes/settingRoutes.js";
import { getProfile } from "./controllers/settingController.js";
import { protect } from "./middleware/authMiddleware.js";
import gameSocket from "./socket/gameSocket.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ✅ CORS configuration
const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ MongoDB
connectDB();

// ✅ Static uploads
const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ REST API routes
app.use("/api", UserRoutes);
app.use("/question", questionRoutes);
app.use("/quiz", questionRoutes);
app.use("/challenge", challengeRoutes);
app.use("/collection", collectionRoutes);
app.use("/messages", messageRoutes);
app.use("/chatroom", chatRoomRoutes);
app.use("/api/user", settingRoutes);
app.get("/api/user/profile", protect, getProfile);

// ✅ HTTP server + Socket.IO
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ✅ Register socket handlers
gameSocket(io);

// ✅ Start server
server.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
