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
        console.log(`📨 User ${socket.userId} joined chat: ${chatRoomId}`);
      });

      // Leave chat room
      socket.on("leave_chat", (chatRoomId) => {
        socket.leave(chatRoomId);
        console.log(`📨 User ${socket.userId} left chat: ${chatRoomId}`);
      });

      // Handle sending messages via socket (for real-time backup)
      socket.on("send_message", async (data) => {
        await this.handleSendMessage(socket, data);
      });

      // Typing indicators
      socket.on("typing_start", (chatRoomId) => {
        console.log(`⌨️ User ${socket.userId} typing in ${chatRoomId}`);
        socket.to(chatRoomId).emit("user_typing", {
          userId: socket.userId,
          userName: socket.userName, // You need to set this
          chatRoomId
        });
      });

      socket.on("typing_stop", (chatRoomId) => {
        console.log(`💤 User ${socket.userId} stopped typing in ${chatRoomId}`);
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

  // Handle sending messages via socket
  async handleSendMessage(socket, data) {
    try {
      const { chatRoomId, content, replyTo, type = "text", mediaUrl } = data;
      const userId = socket.userId; // Get from socket, not from data
      
      console.log("📨 Socket received send_message:", { 
        chatRoomId, 
        content: content?.substring(0, 50) + '...', 
        userId 
      });

      if (!content?.trim() || !chatRoomId || !userId) {
        socket.emit("error", { message: "Missing required fields" });
        return;
      }

      // Verify user has access to chat room
      const chatRoom = await ChatRoom.findOne({
        _id: chatRoomId,
        "participants.user": userId,
        
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

      // Populate message for response
      const populatedMessage = await Message.findById(message._id)
        .populate("sender", "name profilePicture status")
        .populate({
          path: "replyTo",
          populate: {
            path: "sender",
            select: "name profilePicture"
          }
        });

      // Update chat room
      await ChatRoom.findByIdAndUpdate(chatRoomId, {
        lastMessage: message._id,
        updatedAt: new Date()
      });
      // In SocketService.js - Add to handleSendMessage method

// After saving the message and before emitting
// Update last message for all participants
const participants = chatRoom.participants.map(p => p.user._id.toString());

// Emit to update chat lists for all participants
participants.forEach(participantId => {
  if (participantId !== userId) {
    this.sendToUser(participantId, "receive_message", populatedMessage);
  }
});


      // Emit to all participants in the chat room
      this.io.to(chatRoomId).emit("new_message", populatedMessage);

      console.log(`✅ Socket: Message sent to room ${chatRoomId}`);

    } catch (error) {
      console.error("❌ Error in socket send_message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  }

  async handleUserConnected(socket, userId) {
    try {
      console.log(`👤 User ${userId} connected`);
      
      // Get user details
      const user = await User.findById(userId).select("name profilePicture status");
      if (!user) {
        console.error(`❌ User ${userId} not found`);
        return;
      }

      this.connectedUsers.set(userId, socket.id);
      socket.userId = userId;
      socket.userName = user.name; // Store userName for typing indicators

      // Update user status
      await User.findByIdAndUpdate(userId, {
        status: "online",
        socketId: socket.id,
        lastActive: new Date()
      });

      // Join user's chat rooms
      const chatRooms = await ChatRoom.find({
        "participants.user": userId
        
      });

      chatRooms.forEach(room => {
        socket.join(room._id.toString());
        console.log(`🔗 User ${userId} auto-joined room: ${room._id}`);
      });

      // Notify all connected clients about user online status
      this.io.emit("user_status_changed", {
        userId: userId,
        status: "online",
        isActive: true,
        lastActive: new Date()
      });

      console.log(`✅ User ${userId} fully connected to socket`);

    } catch (error) {
      console.error("❌ Error handling user connection:", error);
    }
  }

  async handleMessageRead(socket, data) {
    try {
      const { messageId, chatRoomId } = data;
      const userId = socket.userId;

      if (!messageId || !chatRoomId || !userId) {
        console.error("❌ Missing data for message read");
        return;
      }

      const message = await Message.findById(messageId);
      if (!message) {
        console.error(`❌ Message ${messageId} not found`);
        return;
      }

      // Check if user has already read this message
      const alreadyRead = message.readBy.some(read => 
        read.user.toString() === userId
      );

      if (!alreadyRead) {
        message.readBy.push({
          user: userId,
          readAt: new Date()
        });
        
        // Update status to "read" only if all participants have read it
        const chatRoom = await ChatRoom.findById(chatRoomId);
        if (chatRoom) {
          const participantCount = chatRoom.participants.length;
          if (message.readBy.length >= participantCount - 1) { // -1 to exclude sender
            message.status = "read";
          } else {
            message.status = "delivered";
          }
        }
        
        await message.save();

        // Notify the message sender that their message was read
        if (message.sender.toString() !== userId) {
          this.io.to(message.sender.toString()).emit("message_read", {
            messageId,
            readBy: userId,
            readAt: new Date(),
            chatRoomId
          });
        }

        console.log(`📖 Message ${messageId} read by user ${userId}`);
      }
    } catch (error) {
      console.error("❌ Error handling message read:", error);
    }
  }

  async handleDisconnect(socket) {
    const userId = socket.userId;
    
    if (userId) {
      this.connectedUsers.delete(userId);
      
      try {
        await User.findByIdAndUpdate(userId, {
          status: "offline",
          isActive: false,
          lastSeen: new Date()
        });

        // Notify all connected clients about user offline status
        this.io.emit("user_status_changed", {
          userId: userId,
          status: "offline",
          isActive: false,
          lastSeen: new Date()
        });

        console.log(`❌ User ${userId} disconnected`);
      } catch (error) {
        console.error("❌ Error updating user status on disconnect:", error);
      }
    }
  }

  // Utility method to get socket by user ID
  getSocketByUserId(userId) {
    return this.connectedUsers.get(userId);
  }

  // Utility method to send message to specific user
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }
}

export default SocketService;