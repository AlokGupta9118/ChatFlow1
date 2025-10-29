// services/socketService.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ChatRoom from "../models/ChatRoom.js";
import Message from "../models/Message.js";

class SocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.connectedUsers = new Map();
    this.setupSocketEvents();
  }

  setupSocketEvents() {
    this.io.use(this.authenticateSocket.bind(this));
    
    this.io.on("connection", (socket) => {
      console.log(`User ${socket.userId} connected`);

      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id);
      
      // Update user status
      this.updateUserStatus(socket.userId, "online", true);

      // Join user to their personal room and chat rooms
      socket.join(socket.userId);
      this.joinUserChatRooms(socket);

      // Message events
      socket.on("send_message", this.handleSendMessage.bind(this, socket));
      socket.on("typing_start", this.handleTypingStart.bind(this, socket));
      socket.on("typing_stop", this.handleTypingStop.bind(this, socket));
      socket.on("message_read", this.handleMessageRead.bind(this, socket));
      
      // Call events
      socket.on("call_user", this.handleCallUser.bind(this, socket));
      socket.on("answer_call", this.handleAnswerCall.bind(this, socket));
      socket.on("end_call", this.handleEndCall.bind(this, socket));
      socket.on("call_ice_candidate", this.handleICECandidate.bind(this, socket));

      // Status events
      socket.on("update_status", this.handleStatusUpdate.bind(this, socket));

      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });
    });
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error("User not found"));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  }

  async joinUserChatRooms(socket) {
    try {
      const chatRooms = await ChatRoom.find({
        "participants.user": socket.userId,
        isActive: true
      });

      chatRooms.forEach(room => {
        socket.join(room._id.toString());
      });
    } catch (error) {
      console.error("Error joining chat rooms:", error);
    }
  }

  async updateUserStatus(userId, status, isActive) {
    try {
      await User.findByIdAndUpdate(userId, {
        status,
        isActive,
        lastActive: new Date(),
        lastSeen: status === "offline" ? new Date() : undefined
      });

      // Notify friends and chat participants
      this.io.emit("user_status_changed", {
        userId,
        status,
        isActive,
        lastSeen: status === "offline" ? new Date() : undefined
      });
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  }

  async handleSendMessage(socket, data) {
    try {
      const { chatRoomId, content, replyTo, type = "text", mediaUrl } = data;
      
      // Validate chat room access
      const chatRoom = await ChatRoom.findOne({
        _id: chatRoomId,
        "participants.user": socket.userId,
        isActive: true
      });

      if (!chatRoom) {
        socket.emit("error", { message: "Chat room not found or access denied" });
        return;
      }

      // Create message
      const message = new Message({
        chatRoom: chatRoomId,
        sender: socket.userId,
        content,
        type,
        mediaUrl,
        replyTo,
        status: "sent"
      });

      await message.save();
      
      // Populate message for response
      await message.populate([
        { path: "sender", select: "name profilePicture status" },
        { path: "replyTo", populate: { path: "sender", select: "name" } }
      ]);

      // Update last message in chat room
      await ChatRoom.findByIdAndUpdate(chatRoomId, {
        lastMessage: message._id,
        updatedAt: new Date()
      });

      // Emit to all participants in the chat room
      this.io.to(chatRoomId).emit("new_message", message);

      // Emit to update chat lists for participants
      chatRoom.participants.forEach(participant => {
        this.io.to(participant.user.toString()).emit("chat_updated", {
          chatRoomId,
          lastMessage: message
        });
      });

    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  }

  async handleTypingStart(socket, chatRoomId) {
    try {
      const chatRoom = await ChatRoom.findById(chatRoomId);
      if (!chatRoom || !chatRoom.participants.some(p => p.user.toString() === socket.userId)) {
        return;
      }

      // Add to typing users if not already there
      if (!chatRoom.typingUsers.includes(socket.userId)) {
        chatRoom.typingUsers.push(socket.userId);
        await chatRoom.save();
      }

      socket.to(chatRoomId).emit("user_typing", {
        userId: socket.userId,
        userName: socket.user.name,
        chatRoomId
      });

    } catch (error) {
      console.error("Error handling typing start:", error);
    }
  }

  async handleTypingStop(socket, chatRoomId) {
    try {
      const chatRoom = await ChatRoom.findById(chatRoomId);
      if (!chatRoom) return;

      chatRoom.typingUsers = chatRoom.typingUsers.filter(
        userId => userId.toString() !== socket.userId
      );
      await chatRoom.save();

      socket.to(chatRoomId).emit("user_stop_typing", {
        userId: socket.userId,
        chatRoomId
      });

    } catch (error) {
      console.error("Error handling typing stop:", error);
    }
  }

  async handleMessageRead(socket, data) {
    try {
      const { messageId, chatRoomId } = data;

      const message = await Message.findById(messageId);
      if (!message) return;

      // Check if user has already read the message
      const alreadyRead = message.readBy.some(read => 
        read.user.toString() === socket.userId
      );

      if (!alreadyRead) {
        message.readBy.push({
          user: socket.userId,
          readAt: new Date()
        });

        await message.save();

        // Emit to sender that message was read
        this.io.to(message.sender.toString()).emit("message_read", {
          messageId,
          readBy: socket.userId,
          readAt: new Date()
        });
      }

    } catch (error) {
      console.error("Error handling message read:", error);
    }
  }

  async handleCallUser(socket, data) {
    const { targetUserId, offer, chatRoomId } = data;
    
    const targetSocketId = this.connectedUsers.get(targetUserId);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit("incoming_call", {
        from: socket.userId,
        fromName: socket.user.name,
        offer,
        chatRoomId
      });
    }
  }

  async handleAnswerCall(socket, data) {
    const { to, answer } = data;
    
    const targetSocketId = this.connectedUsers.get(to);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit("call_answered", {
        answer,
        from: socket.userId
      });
    }
  }

  async handleEndCall(socket, data) {
    const { to } = data;
    
    const targetSocketId = this.connectedUsers.get(to);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit("call_ended", {
        from: socket.userId
      });
    }
  }

  async handleICECandidate(socket, data) {
    const { to, candidate } = data;
    
    const targetSocketId = this.connectedUsers.get(to);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit("ice_candidate", {
        candidate,
        from: socket.userId
      });
    }
  }

  async handleStatusUpdate(socket, data) {
    const { status } = data;
    await this.updateUserStatus(socket.userId, status, true);
  }

  async handleDisconnect(socket) {
    this.connectedUsers.delete(socket.userId);
    await this.updateUserStatus(socket.userId, "offline", false);
    console.log(`User ${socket.userId} disconnected`);
  }

  getIO() {
    return this.io;
  }
}

export default SocketService;