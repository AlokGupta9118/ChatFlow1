// Server/socket/messageSocket.js
import ChatRoom from "../../models/ChatRoom.js";
import Message from "../../models/Message.js";

export const setupChatSockets = (io) => {
  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    socket.userRooms = new Set();

    // ✅ FIXED: Join user's personal room
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.userId = userId;
        const userRoom = `user_${userId}`;
        
        // Leave previous user room
        socket.userRooms.forEach(room => {
          if (room.startsWith('user_')) socket.leave(room);
        });
        
        socket.join(userRoom);
        socket.userRooms.add(userRoom);
        
        console.log(`👤 User ${userId} joined personal room: ${userRoom}`);
        
        // ✅ FIXED: Broadcast online status to ALL users
        socket.broadcast.emit('user_status_change', { 
          userId,
          status: 'online',
          lastSeen: new Date().toISOString()
        });
      }
    });

    // ✅ FIXED: Enhanced chat room joining
    socket.on('join_chat', (data) => {
      const { roomId, isGroup = false, chatRoomId } = data;
      if (!roomId) return;

      // ✅ CRITICAL: Use consistent room naming
      const actualRoomId = isGroup ? `group_${roomId}` : `private_${chatRoomId || roomId}`;
      
      // Leave previous chat rooms
      socket.userRooms.forEach(room => {
        if (room.startsWith('group_') || room.startsWith('private_')) {
          socket.leave(room);
          socket.userRooms.delete(room);
        }
      });
      
      socket.join(actualRoomId);
      socket.userRooms.add(actualRoomId);
      socket.currentChat = { roomId, isGroup, actualRoomId };
      
      console.log(`🚪 User ${socket.userId} joined room: ${actualRoomId}`);
    });

    // ✅ FIXED: Enhanced typing indicators
    socket.on('typing_start', (data) => {
      const { chatId, userId, userName, isGroup = false, chatRoomId } = data;
      
      // ✅ CRITICAL: Use same room logic as join_chat
      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`⌨️ ${userName} started typing in ${roomId}`);
      
      // Broadcast to all other users in the room
      socket.to(roomId).emit('user_typing', {
        userId,
        userName,
        isTyping: true,
        chatId: chatId,
        roomId: roomId,
        isGroup: isGroup,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('typing_stop', (data) => {
      const { chatId, userId, isGroup = false, chatRoomId } = data;
      
      // ✅ CRITICAL: Use same room logic as join_chat
      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`⌨️ User ${userId} stopped typing in ${roomId}`);
      
      socket.to(roomId).emit('user_typing', {
        userId,
        isTyping: false,
        chatId: chatId,
        roomId: roomId,
        isGroup: isGroup
      });
    });

    // ✅ FIXED: REAL-TIME Message handling
    socket.on('send_message', async (data) => {
      try {
        const { roomId, message, chatType = "private" } = data;
        
        console.log('💬 Processing real-time message to room:', roomId, 'Type:', chatType);

        if (!roomId) {
          console.error('❌ No roomId provided for message');
          return;
        }

        // Create message object
        const chatMessage = {
          _id: message._id || `temp_${Date.now()}`,
          sender: message.sender,
          senderId: message.senderId,
          content: message.content,
          createdAt: message.createdAt || new Date().toISOString(),
          type: message.type || "text",
          chatType: chatType,
          roomId: roomId,
          isRealTime: true,
          status: 'sent'
        };

        console.log(`📨 Broadcasting to room: ${roomId}`);
        
        // Primary: Emit to the specific room
        io.to(roomId).emit('receive_message', chatMessage);

      } catch (error) {
        console.error('❌ Error in send_message:', error);
        socket.emit('chat_error', { error: 'Failed to send message' });
      }
    });

    // ✅ FIXED: User status management
    socket.on('user_online', (data) => {
      console.log('👤 User online:', data.userId);
      socket.broadcast.emit('user_status_change', {
        userId: data.userId,
        status: 'online',
        lastSeen: new Date().toISOString()
      });
    });

    socket.on('user_away', (data) => {
      socket.broadcast.emit('user_status_change', {
        userId: data.userId,
        status: 'away',
        lastSeen: new Date().toISOString()
      });
    });

    // ✅ FIXED: Message read receipts
    socket.on('mark_messages_read', async (data) => {
      try {
        const { messageIds, chatRoomId, userId } = data;
        
        // Update messages as read in database
        await Message.updateMany(
          { _id: { $in: messageIds }, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );

        // Notify other users in the chat room
        const roomId = chatRoomId.startsWith('group_') ? chatRoomId : `private_${chatRoomId}`;
        socket.to(roomId).emit('messages_read', {
          messageIds,
          userId,
          readAt: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Error marking messages as read:', error);
      }
    });

    // ✅ FIXED: Handle user presence
    socket.on('user_presence', (data) => {
      const { userId, status, currentChat } = data;
      
      if (currentChat) {
        const roomId = currentChat.isGroup ? `group_${currentChat.roomId}` : `private_${currentChat.chatRoomId || currentChat.roomId}`;
        socket.to(roomId).emit('user_presence_update', {
          userId,
          status,
          lastSeen: new Date().toISOString()
        });
      }
    });

    // ✅ FIXED: Enhanced disconnect handling
    socket.on('disconnect', (reason) => {
      console.log('❌ User disconnected:', socket.id, 'Reason:', reason);
      
      if (socket.userId) {
        socket.broadcast.emit('user_status_change', {
          userId: socket.userId,
          status: 'offline',
          lastSeen: new Date().toISOString()
        });
      }

      // Clean up user rooms
      socket.userRooms.forEach(room => {
        socket.leave(room);
      });
      socket.userRooms.clear();
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    // ✅ FIXED: Handle connection testing
    socket.on('ping', (data) => {
      socket.emit('pong', {
        timestamp: new Date().toISOString(),
        userId: socket.userId,
        ...data
      });
    });
  });

  // ✅ FIXED: Add global error handling for the IO instance
  io.engine.on("connection_error", (err) => {
    console.log('❌ Socket.IO connection error:', err);
  });
};

export default setupChatSockets;