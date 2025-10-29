export const setupChatSockets = (io) => {
  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // ✅ FIXED: Track user's rooms and user data
    socket.userRooms = new Set();
    socket.userData = {};

    // ✅ FIXED: Join user's personal room
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.userId = userId;
        socket.userData.userId = userId;
        
        const userRoom = `user_${userId}`;
        
        // Leave previous user room if exists
        socket.userRooms.forEach(room => {
          if (room.startsWith('user_')) {
            socket.leave(room);
          }
        });
        
        socket.join(userRoom);
        socket.userRooms.add(userRoom);
        
        console.log(`👤 User ${userId} joined personal room: ${userRoom}`);
        
        // ✅ FIXED: Notify ALL users that this user is online
        io.emit('user_status_change', { 
          userId,
          status: 'online',
          lastSeen: new Date().toISOString()
        });
      }
    });

    // ✅ FIXED: Join chat room - SIMPLIFIED
    socket.on('join_chat', (data) => {
      const { roomId, isGroup = false } = data;
      if (!roomId) return;

      const formattedRoomId = isGroup ? `group_${roomId}` : `private_${roomId}`;
      
      // Leave previous chat rooms
      socket.userRooms.forEach(room => {
        if (room.startsWith('group_') || room.startsWith('private_')) {
          socket.leave(room);
          socket.userRooms.delete(room);
        }
      });
      
      socket.join(formattedRoomId);
      socket.userRooms.add(formattedRoomId);
      socket.currentChat = { roomId, isGroup, formattedRoomId };
      
      console.log(`🚪 User ${socket.userId} joined room: ${formattedRoomId}`);
    });

    // ✅ FIXED: REAL-TIME Message handling - SIMPLIFIED
    socket.on('send_message', async (data) => {
      try {
        const { roomId, message, chatType = "private" } = data;
        
        console.log('💬 Processing real-time message to room:', roomId);

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

        // ✅ CRITICAL FIX: Broadcast to the room AND to user's personal rooms
        console.log(`📨 Broadcasting to room: ${roomId}`);
        io.to(roomId).emit('receive_message', chatMessage);

        // ✅ ALSO send to sender's personal room for backup
        if (message.senderId) {
          io.to(`user_${message.senderId}`).emit('receive_message', chatMessage);
        }

        // ✅ For private messages, also send to receiver's personal room
        if (chatType === "private" && message.receiverId) {
          io.to(`user_${message.receiverId}`).emit('receive_message', chatMessage);
        }

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
      
      socket.to(roomId).emit('user_typing', {
        userId,
        isTyping: false,
        chatId: chatId,
        roomId: roomId
      });
    });

    // ✅ FIXED: User status management
    socket.on('user_online', (data) => {
      console.log('👤 User online:', data.userId);
      io.emit('user_status_change', {
        userId: data.userId,
        status: 'online',
        lastSeen: new Date().toISOString()
      });
    });

    socket.on('user_away', (data) => {
      io.emit('user_status_change', {
        userId: data.userId,
        status: 'away',
        lastSeen: new Date().toISOString()
      });
    });

    // ✅ FIXED: Enhanced disconnect handling
    socket.on('disconnect', (reason) => {
      console.log('❌ User disconnected:', socket.id, 'Reason:', reason);
      
      if (socket.userId) {
        // Notify ALL users that this user went offline
        io.emit('user_status_change', {
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