// socket/messageSocket.js - COMPLETE FIXED VERSION
export const setupChatSockets = (io) => {
  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // Track online users
    const userRooms = new Set();

    // ✅ Join user's personal room
    socket.on('join_user', (userId) => {
      if (userId) {
        const userRoom = `user_${userId}`;
        socket.join(userRoom);
        userRooms.add(userRoom);
        
        // Store userId in socket for later use
        socket.userId = userId;
        
        // Notify others that user is online
        socket.broadcast.emit('user_status_change', { 
          userId,
          status: 'online',
          lastSeen: new Date().toISOString()
        });
        console.log(`👤 User ${userId} joined personal room`);
      }
    });

    // ✅ Join chat room
    socket.on('join_chat', (roomId) => {
      socket.join(roomId);
      console.log(`🚪 User joined room: ${roomId}`);
      
      // Notify room that user joined
      socket.to(roomId).emit('user_joined', { 
        userId: socket.userId,
        roomId 
      });
    });

    // ✅ Leave chat room
    socket.on('leave_chat', (roomId) => {
      socket.leave(roomId);
      console.log(`🚪 User left room: ${roomId}`);
    });

    // ✅ REAL-TIME: Send message with proper room handling
    socket.on('send_message', async (data) => {
      try {
        const { roomId, message, chatType = "private" } = data;
        
        console.log('💬 Processing real-time message:', message);

        // Create message object for real-time delivery
        const chatMessage = {
          _id: message._id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

        // ✅ CRITICAL: Broadcast to ALL users in the room INCLUDING sender for immediate UI update
        io.to(roomId).emit('receive_message', chatMessage);
        console.log(`📨 Real-time message broadcast to room ${roomId}`);

      } catch (error) {
        console.error('❌ Error in send_message:', error);
        socket.emit('chat_error', { error: 'Failed to send message' });
      }
    });

    // ✅ TYPING: Enhanced typing indicators
    socket.on('typing_start', (data) => {
      const { chatId, userId, userName, isGroup = false } = data;
      const roomId = isGroup ? `group_${chatId}` : `private_${chatId}`;
      
      console.log(`⌨️ ${userName} started typing in ${roomId}`);
      
      // Broadcast to all other users in the room
      socket.to(roomId).emit('user_typing', {
        userId,
        userName,
        isTyping: true,
        roomId: chatId,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('typing_stop', (data) => {
      const { chatId, userId, userName, isGroup = false } = data;
      const roomId = isGroup ? `group_${chatId}` : `private_${chatId}`;
      
      console.log(`⌨️ ${userName || userId} stopped typing in ${roomId}`);
      
      // Broadcast to all other users in the room
      socket.to(roomId).emit('user_typing', {
        userId,
        userName,
        isTyping: false,
        roomId: chatId
      });
    });

    // ✅ User status management
    socket.on('user_online', (data) => {
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

    socket.on('user_offline', (data) => {
      socket.broadcast.emit('user_status_change', {
        userId: data.userId,
        status: 'offline',
        lastSeen: new Date().toISOString()
      });
    });

    // ✅ Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log('❌ User disconnected:', socket.id, 'Reason:', reason);
      
      // Notify all rooms that user went offline
      if (socket.userId) {
        socket.broadcast.emit('user_status_change', {
          userId: socket.userId,
          status: 'offline',
          lastSeen: new Date().toISOString()
        });
      }
    });

    // ✅ Error handling
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });
};