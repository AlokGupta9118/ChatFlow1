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

    // ✅ FIXED: Join chat room with BOTH room types
    socket.on('join_chat', (data) => {
      const { roomId, isGroup = false, chatRoomId } = data;
      if (!roomId) return;

      // ✅ CRITICAL: For private chats, use chatRoomId if available
      const actualRoomId = isGroup ? `group_${roomId}` : (chatRoomId ? `private_${chatRoomId}` : `private_${roomId}`);
      
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
          isRealTime: true, // ✅ Always true for socket messages
          status: 'sent'
        };

        // ✅ CRITICAL: Add receiverId for private messages
        if (chatType === "private" && message.receiverId) {
          chatMessage.receiverId = message.receiverId;
        }

        console.log(`📨 Broadcasting to room: ${roomId}`);
        
        // Primary: Emit to the specific room
        io.to(roomId).emit('receive_message', chatMessage);

        // ✅ FIXED: For private messages, also emit to personal rooms
        if (chatType === "private") {
          if (message.senderId) {
            io.to(`user_${message.senderId}`).emit('receive_message', chatMessage);
          }
          if (message.receiverId) {
            io.to(`user_${message.receiverId}`).emit('receive_message', chatMessage);
          }
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
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });
};