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
import statusRoutes from "./routes/statusRoutes.js";
import chatRoutes from "./routes/chat.js";
import SocketService from "./socket/messageSocket.js"; // Your updated SocketService

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB
connectDB();

// Static uploads
const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

// REST API routes
app.use("/api", UserRoutes);
app.use("/question", questionRoutes);
app.use("/quiz", questionRoutes);
app.use("/challenge", challengeRoutes);
app.use("/collection", collectionRoutes);
app.use("/messages", messageRoutes);
app.use("/chatroom", chatRoomRoutes);
app.use("/api/user", settingRoutes);
app.get("/api/user/profile", protect, getProfile);
app.use("/api/status", statusRoutes);
app.use("/api/chat", chatRoutes);

// HTTP server + SINGLE Socket.IO instance
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

// Initialize all socket handlers with the SAME io instance
app.set('io', io);

// Initialize SocketService with existing io instance
new SocketService(io);

// Initialize game socket with existing io instance
gameSocket(io);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server listening on port ${port}`);
});