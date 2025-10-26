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
const port = process.env.PORT || 5000; // Changed from 3000 to 5000

// ✅ CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL ||"https://chat-flow1-git-main-alokguptas-projects.vercel.app?_vercel_share=FRSgeNHJiYIbNj0BV9gCSj295wxvxJ1g" ,
  "http://localhost:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("CORS blocked for origin:", origin);
        callback(null, true);
      }
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

// ✅ Basic health check route
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

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

// ✅ Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// ✅ 404 handler - REMOVED THE "*" PARAMETER
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ✅ Start server
server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server listening on port ${port}`);
  console.log(`📱 Client URL: ${process.env.CLIENT_URL}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
});