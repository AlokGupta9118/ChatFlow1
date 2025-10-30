// routes/chat.js
import express from "express";
import {
  getChatRooms,
  getOrCreateDirectChat,
  createGroupChat,
  getChatRoomDetails,
  getMessages,
} from "../controllers/chatController.js";
import { sendMessage, deleteMessage, markAsRead } from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();



// Chat rooms
router.get("/rooms", protect,getChatRooms);
router.post("/direct", protect,getOrCreateDirectChat);
router.post("/group",protect, createGroupChat);
router.get("/:chatRoomId",protect, getChatRoomDetails);

// Messages
router.get("/messages/:chatRoomId", protect,getMessages);
router.post("/messages/send", protect,sendMessage);
router.delete("/messages/:messageId",protect, deleteMessage);
router.post("/messages/read",protect, markAsRead);

export default router;