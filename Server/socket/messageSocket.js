export const setupChatSockets = (io) => {
  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    socket.userRooms = new Set();
    socket.currentChat = null;

    // Join user's personal room
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.userId = userId;
        const userRoom = `user_${userId}`;
        
        // Leave previous user rooms
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

    // Typing indicators
    socket.on('typing_start', (data) => {
      console.log('🎯 BACKEND: TYPING START received:', JSON.stringify(data, null, 2));
      
      const { chatId, userId, userName, isGroup = false, chatRoomId } = data;
      
      if (!chatId || !userId) {
        console.log('❌ BACKEND: Missing required typing data');
        return;
      }

      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`🎯 BACKEND: ${userName} started typing in ${roomId} (User: ${userId})`);
      
      // Broadcast to others in the room
      socket.to(roomId).emit('user_typing', {
        userId,
        userName: userName || 'Unknown User',
        isTyping: true,
        chatId: chatId,
        roomId: roomId,
        isGroup: isGroup,
        timestamp: new Date().toISOString()
      });
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
      
      socket.to(roomId).emit('user_typing', {
        userId,
        isTyping: false,
        chatId: chatId,
        roomId: roomId,
        isGroup: isGroup
      });
    });

    // Disconnect
    socket.on('disconnect', (reason) => {
      console.log('❌ User disconnected:', socket.id, 'Reason:', reason);
    });
  });
};