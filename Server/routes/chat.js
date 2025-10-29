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

router.use(protect);

// Chat rooms
router.get("/rooms", getChatRooms);
router.post("/direct", getOrCreateDirectChat);
router.post("/group", createGroupChat);
router.get("/:chatRoomId", getChatRoomDetails);

// Messages
router.get("/messages/:chatRoomId", getMessages);
router.post("/messages/send", sendMessage);
router.delete("/messages/:messageId", deleteMessage);
router.post("/messages/read", markAsRead);

export default router;