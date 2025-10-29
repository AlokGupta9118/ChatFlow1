// Server/socket/messageSocket.js - FIXED VERSION
export const setupChatSockets = (io) => {
  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    socket.userRooms = new Set();

    // Join user's personal room
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.userId = userId;
        const userRoom = `user_${userId}`;
        
        socket.userRooms.forEach(room => {
          if (room.startsWith('user_')) socket.leave(room);
        });
        
        socket.join(userRoom);
        socket.userRooms.add(userRoom);
        
        console.log(`👤 User ${userId} joined personal room: ${userRoom}`);
      }
    });

    // Enhanced chat room joining
    socket.on('join_chat', (data) => {
      const { roomId, isGroup = false, chatRoomId } = data;
      if (!roomId) return;

      const actualRoomId = isGroup ? `group_${roomId}` : `private_${chatRoomId || roomId}`;
      
      console.log(`🚪 User ${socket.userId} joining room: ${actualRoomId}`);

      // Leave previous chat rooms
      socket.userRooms.forEach(room => {
        if (room.startsWith('group_') || room.startsWith('private_')) {
          socket.leave(room);
          socket.userRooms.delete(room);
        }
      });
      
      socket.join(actualRoomId);
      socket.userRooms.add(actualRoomId);
      socket.currentChat = { 
        roomId: roomId, 
        isGroup: isGroup, 
        actualRoomId: actualRoomId,
        chatRoomId: chatRoomId 
      };
      
      console.log(`✅ User ${socket.userId} successfully joined: ${actualRoomId}`);
    });

    // ✅ FIXED: Enhanced typing indicators with BETTER debugging
    socket.on('typing_start', (data) => {
      console.log('🎯 BACKEND: TYPING START received:', JSON.stringify(data, null, 2));
      
      const { chatId, userId, userName, isGroup = false, chatRoomId } = data;
      
      if (!chatId || !userId) {
        console.log('❌ BACKEND: Missing required typing data');
        return;
      }

      // Calculate room ID
      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`🎯 BACKEND: ${userName} started typing in ${roomId} (User: ${userId})`);
      
      // ✅ FIXED: Use socket.to(roomId) to broadcast to others in the room
      socket.to(roomId).emit('user_typing', {
        userId,
        userName: userName || 'Someone',
        isTyping: true,
        chatId: chatId,
        roomId: roomId,
        isGroup: isGroup,
        timestamp: new Date().toISOString()
      });

      console.log(`📢 BACKEND: Emitted typing start to room: ${roomId} (excluding sender)`);
    });

    socket.on('typing_stop', (data) => {
      console.log('🎯 BACKEND: TYPING STOP received:', JSON.stringify(data, null, 2));
      
      const { chatId, userId, isGroup = false, chatRoomId } = data;
      
      if (!chatId || !userId) {
        console.log('❌ BACKEND: Missing required typing stop data');
        return;
      }

      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`🎯 BACKEND: User ${userId} stopped typing in ${roomId}`);
      
      // ✅ FIXED: Use socket.to(roomId) to broadcast to others in the room
      socket.to(roomId).emit('user_typing', {
        userId,
        isTyping: false,
        chatId: chatId,
        roomId: roomId,
        isGroup: isGroup
      });

      console.log(`📢 BACKEND: Emitted typing stop to room: ${roomId} (excluding sender)`);
    });

    // Real-time messages
    socket.on('send_message', async (data) => {
      try {
        const { roomId, message, chatType = "private" } = data;
        
        console.log('💬 Socket send_message received for room:', roomId);

        if (!roomId) {
          console.error('❌ No roomId provided for message');
          return;
        }

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
        io.to(roomId).emit('receive_message', chatMessage);

      } catch (error) {
        console.error('❌ Error in send_message:', error);
        socket.emit('chat_error', { error: 'Failed to send message' });
      }
    });

    // Disconnect
    socket.on('disconnect', (reason) => {
      console.log('❌ User disconnected:', socket.id, 'Reason:', reason);
    });
  });
};