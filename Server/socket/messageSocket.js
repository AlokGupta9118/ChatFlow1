export const setupChatSockets = (io) => {
  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // Track user's rooms
    const userRooms = new Set();

    // ✅ FIXED: Join user's personal room
    socket.on('join_user', (userId) => {
      if (userId) {
        const userRoom = `user_${userId}`;
        
        // Leave previous user room if exists
        userRooms.forEach(room => {
          if (room.startsWith('user_')) {
            socket.leave(room);
            userRooms.delete(room);
          }
        });
        
        socket.join(userRoom);
        userRooms.add(userRoom);
        socket.userId = userId;
        
        console.log(`👤 User ${userId} joined personal room: ${userRoom}`);
        
        // Notify others that user is online
        socket.broadcast.emit('user_status_change', { 
          userId,
          status: 'online',
          lastSeen: new Date().toISOString()
        });
      }
    });

    // ✅ FIXED: Join chat room with consistent naming
    socket.on('join_chat', (data) => {
      const { roomId, isGroup = false } = data;
      const formattedRoomId = isGroup ? `group_${roomId}` : `private_${roomId}`;
      
      socket.join(formattedRoomId);
      userRooms.add(formattedRoomId);
      
      console.log(`🚪 User ${socket.userId} joined room: ${formattedRoomId}`);
      
      // Notify room that user joined
      socket.to(formattedRoomId).emit('user_joined', { 
        userId: socket.userId,
        roomId: formattedRoomId
      });
    });

    // ✅ FIXED: Leave chat room
    socket.on('leave_chat', (data) => {
      const { roomId, isGroup = false } = data;
      const formattedRoomId = isGroup ? `group_${roomId}` : `private_${roomId}`;
      
      socket.leave(formattedRoomId);
      userRooms.delete(formattedRoomId);
      console.log(`🚪 User left room: ${formattedRoomId}`);
    });

    // ✅ FIXED: REAL-TIME Message handling
    socket.on('send_message', async (data) => {
      try {
        const { roomId, message, chatType = "private" } = data;
        
        console.log('💬 Processing real-time message to room:', roomId, message);

        if (!roomId) {
          console.error('❌ No roomId provided for message');
          return;
        }

        // Create enhanced message object
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

        // ✅ CRITICAL FIX: Use consistent room naming
        // Broadcast to ALL users in the room INCLUDING sender
        io.to(roomId).emit('receive_message', chatMessage);
        console.log(`📨 Real-time message broadcast to room ${roomId}:`, chatMessage.content);

      } catch (error) {
        console.error('❌ Error in send_message:', error);
        socket.emit('chat_error', { error: 'Failed to send message' });
      }
    });

    // ✅ FIXED: Enhanced typing indicators
    socket.on('typing_start', (data) => {
      const { chatId, userId, userName, isGroup = false } = data;
      const roomId = isGroup ? `group_${chatId}` : `private_${chatId}`;
      
      console.log(`⌨️ ${userName} started typing in ${roomId}`);
      
      // Broadcast to all other users in the room
      socket.to(roomId).emit('user_typing', {
        userId,
        userName,
        isTyping: true,
        chatId: chatId,
        roomId: roomId,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('typing_stop', (data) => {
      const { chatId, userId, isGroup = false } = data;
      const roomId = isGroup ? `group_${chatId}` : `private_${chatId}`;
      
      console.log(`⌨️ User ${userId} stopped typing in ${roomId}`);
      
      // Broadcast to all other users in the room
      socket.to(roomId).emit('user_typing', {
        userId,
        isTyping: false,
        chatId: chatId,
        roomId: roomId
      });
    });

    // ✅ FIXED: User status management
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

    // ✅ FIXED: Enhanced disconnect handling
    socket.on('disconnect', (reason) => {
      console.log('❌ User disconnected:', socket.id, 'Reason:', reason);
      
      // Notify all rooms that user went offline
      if (socket.userId) {
        socket.broadcast.emit('user_status_change', {
          userId: socket.userId,
          status: 'offline',
          lastSeen: new Date().toISOString()
        });
        
        // Leave all rooms
        userRooms.forEach(room => {
          socket.leave(room);
        });
        userRooms.clear();
      }
    });

    // ✅ Error handling
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });
};