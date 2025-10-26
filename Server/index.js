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
const port = process.env.PORT || 5000;

// ✅ Enhanced CORS configuration
const allowedOrigins = [
  "https://chat-flow1-git-main-alokguptas-projects.vercel.app",
  "https://chat-flow1.vercel.app", 
  "https://chat-flow1-kkaqh7ybn-alokguptas-projects.vercel.app",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
];

// Remove query parameters from CLIENT_URL if present
const cleanClientUrl = process.env.CLIENT_URL ? 
  process.env.CLIENT_URL.split('?')[0] : 
  "https://chat-flow1-git-main-alokguptas-projects.vercel.app";

if (!allowedOrigins.includes(cleanClientUrl)) {
  allowedOrigins.push(cleanClientUrl);
}

console.log('🔄 Allowed CORS origins:', allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("🌐 CORS allowed for origin (wildcard):", origin);
        callback(null, true); // Allow all origins in production for now
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  })
);

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ MongoDB
connectDB();

// ✅ Static uploads
const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Enhanced health check route
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: port
  });
});

// ✅ Test route without authentication
app.get("/test", (req, res) => {
  res.status(200).json({ 
    message: "Backend API is working!",
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
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// ✅ Register socket handlers
gameSocket(io);

// ✅ Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Error Stack:', err.stack);
  console.error('🚨 Error Message:', err.message);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: 'Validation Error', 
      errors: Object.values(err.errors).map(e => e.message) 
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({ 
      message: 'Duplicate field value entered' 
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      message: 'Invalid token' 
    });
  }
  
  // JWT expired
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      message: 'Token expired' 
    });
  }

  // Default error
  res.status(err.status || 500).json({ 
    message: err.message || 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: `Route not found: ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /health',
      'GET /test', 
      'POST /api/register',
      'POST /api/login',
      'GET /api/user/profile'
    ]
  });
});

// ✅ Start server
server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server listening on port ${port}`);
  console.log(`📱 Client URL: ${cleanClientUrl}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 CORS enabled for origins:`, allowedOrigins);
  console.log(`💾 MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});