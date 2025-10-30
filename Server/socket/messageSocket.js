// services/socketService.js
import Message from "../models/Message.js";
import ChatRoom from "../models/ChatRoom.js";
import User from "../models/User.js";

class SocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
    this.setupSocketEvents();
  }

  setupSocketEvents() {
    this.io.on("connection", (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);

      // User identification
      socket.on("user_connected", (userId) => {
        this.handleUserConnected(socket, userId);
      });

      // Join specific chat room
      socket.on("join_chat", (chatRoomId) => {
        socket.join(chatRoomId);
        console.log(`📨 User joined chat: ${chatRoomId}`);
      });

      // Leave chat room
      socket.on("leave_chat", (chatRoomId) => {
        socket.leave(chatRoomId);
        console.log(`📨 User left chat: ${chatRoomId}`);
      });

      // ✅ ADDED: Handle sending messages via socket
      socket.on("send_message", async (data) => {
        await this.handleSendMessage(socket, data);
      });

      // Typing indicators
      socket.on("typing_start", (chatRoomId) => {
        socket.to(chatRoomId).emit("user_typing", {
          userId: socket.userId,
          chatRoomId
        });
      });

      socket.on("typing_stop", (chatRoomId) => {
        socket.to(chatRoomId).emit("user_stop_typing", {
          userId: socket.userId,
          chatRoomId
        });
      });

      // Message read receipt
      socket.on("message_read", async (data) => {
        await this.handleMessageRead(socket, data);
      });

      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });
    });
  }

  // ✅ ADDED: Handle sending messages via socket
  async handleSendMessage(socket, data) {
    try {
      const { chatRoomId, content, replyTo, type = "text", mediaUrl, userId } = data;
      
      console.log("📨 Socket received send_message:", { chatRoomId, content, userId });

      if (!content?.trim() || !chatRoomId || !userId) {
        socket.emit("error", { message: "Missing required fields" });
        return;
      }

      // Verify user has access to chat room
      const chatRoom = await ChatRoom.findOne({
        _id: chatRoomId,
        "participants.user": userId,
        isActive: true
      }).populate("participants.user", "name profilePicture status");

      if (!chatRoom) {
        socket.emit("error", { message: "Access denied or chat room not found" });
        return;
      }

      // Create message
      const message = new Message({
        chatRoom: chatRoomId,
        sender: userId,
        content: content.trim(),
        type,
        mediaUrl,
        replyTo,
        status: "sent"
      });

      await message.save();

      // Populate message
      await message.populate([
        { 
          path: "sender", 
          select: "name profilePicture status" 
        },
        { 
          path: "replyTo",
          populate: {
            path: "sender",
            select: "name profilePicture"
          }
        }
      ]);

      // Update chat room
      await ChatRoom.findByIdAndUpdate(chatRoomId, {
        lastMessage: message._id,
        updatedAt: new Date()
      });

      // Emit to all participants in the chat room
      this.io.to(chatRoomId).emit("new_message", message);

      console.log(`✅ Socket: Message sent to room ${chatRoomId}`);

    } catch (error) {
      console.error("❌ Error in socket send_message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  }

  async handleUserConnected(socket, userId) {
    try {
      console.log(`👤 User ${userId} connected`);
      
      this.connectedUsers.set(userId, socket.id);
      socket.userId = userId;

      // Update user status
      await User.findByIdAndUpdate(userId, {
        status: "online",
        isActive: true,
        socketId: socket.id,
        lastActive: new Date()
      });

      // Join user's chat rooms
      const chatRooms = await ChatRoom.find({
        "participants.user": userId,
        isActive: true
      });

      chatRooms.forEach(room => {
        socket.join(room._id.toString());
      });

      // Notify friends
      socket.broadcast.emit("user_online", { userId });

    } catch (error) {
      console.error("Error handling user connection:", error);
    }
  }

  async handleMessageRead(socket, data) {
    try {
      const { messageId, chatRoomId } = data;
      const userId = socket.userId;

      const message = await Message.findById(messageId);
      if (!message) return;

      const alreadyRead = message.readBy.some(read => 
        read.user.toString() === userId
      );

      if (!alreadyRead) {
        message.readBy.push({
          user: userId,
          readAt: new Date()
        });
        message.status = "read";
        await message.save();

        // Notify sender
        this.io.to(message.sender.toString()).emit("message_read", {
          messageId,
          readBy: userId,
          readAt: new Date()
        });
      }
    } catch (error) {
      console.error("Error handling message read:", error);
    }
  }

  async handleDisconnect(socket) {
    const userId = socket.userId;
    
    if (userId) {
      this.connectedUsers.delete(userId);
      
      await User.findByIdAndUpdate(userId, {
        status: "offline",
        isActive: false,
        lastSeen: new Date()
      });

      // Notify friends
      socket.broadcast.emit("user_offline", { userId });
      
      console.log(`❌ User ${userId} disconnected`);
    }
  }
}

export default SocketService;