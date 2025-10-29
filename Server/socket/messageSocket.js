export const setupChatSockets = (io) => {
  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    socket.userData = {
      rooms: new Set(),
      userId: null
    };

    // Join user's personal room
    socket.on('join_user', (userId) => {
      if (!userId) {
        console.log('❌ join_user: Missing userId');
        return;
      }
      
      socket.userData.userId = userId;
      const userRoom = `user_${userId}`;
      
      socket.userData.rooms.forEach(room => {
        if (room.startsWith('user_')) socket.leave(room);
      });
      
      socket.join(userRoom);
      socket.userData.rooms.add(userRoom);
      
      console.log(`👤 User ${userId} joined personal room: ${userRoom}`);
    });

    // Enhanced chat room joining
    socket.on('join_chat', (data) => {
      const { roomId, isGroup = false, chatRoomId } = data;
      
      if (!roomId || !socket.userData.userId) {
        console.log('❌ join_chat: Missing roomId or userId');
        return;
      }

      const actualRoomId = isGroup ? `group_${roomId}` : `private_${chatRoomId || roomId}`;
      
      console.log(`🚪 User ${socket.userData.userId} joining room: ${actualRoomId}`);

      // Leave previous chat rooms
      socket.userData.rooms.forEach(room => {
        if (room.startsWith('group_') || room.startsWith('private_')) {
          socket.leave(room);
          socket.userData.rooms.delete(room);
        }
      });
      
      socket.join(actualRoomId);
      socket.userData.rooms.add(actualRoomId);
      
      console.log(`✅ User ${socket.userData.userId} successfully joined: ${actualRoomId}`);
    });

    // ✅ FIXED: Enhanced typing indicators with user validation
    socket.on('typing_start', (data) => {
      console.log('🎯 BACKEND: TYPING START received:', data);
      
      const { chatId, userId, userName, isGroup = false, chatRoomId } = data;
      
      if (!chatId || !userId) {
        console.log('❌ BACKEND: Missing required typing data - chatId or userId is missing');
        return;
      }

      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`🎯 BACKEND: ${userName} (${userId}) started typing in ${roomId}`);
      
      // Broadcast to others in the room
      socket.to(roomId).emit('user_typing', {
        userId: userId,
        userName: userName || 'Unknown User',
        isTyping: true,
        chatId: chatId,
        roomId: roomId,
        isGroup: isGroup,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('typing_stop', (data) => {
      console.log('🎯 BACKEND: TYPING STOP received:', data);
      
      const { chatId, userId, isGroup = false, chatRoomId } = data;
      
      if (!chatId || !userId) {
        console.log('❌ BACKEND: Missing required typing stop data - chatId or userId is missing');
        return;
      }

      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`🎯 BACKEND: User ${userId} stopped typing in ${roomId}`);
      
      socket.to(roomId).emit('user_typing', {
        userId: userId,
        isTyping: false,
        chatId: chatId,
        roomId: roomId,
        isGroup: isGroup
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ User disconnected:', socket.id, 'Reason:', reason);
    });
  });
};