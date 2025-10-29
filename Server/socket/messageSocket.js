export const setupChatSockets = (io) => {
  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // Store user info
    socket.userData = {
      rooms: new Set(),
      userId: null
    };

    // Join user's personal room
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.userData.userId = userId;
        const userRoom = `user_${userId}`;
        
        // Leave previous user room if exists
        if (socket.userData.rooms.has(userRoom)) {
          socket.leave(userRoom);
        }
        
        socket.join(userRoom);
        socket.userData.rooms.add(userRoom);
        
        console.log(`👤 User ${userId} joined personal room: ${userRoom}`);
      }
    });

    // ✅ FIXED: Enhanced chat room joining with PROPER room management
    socket.on('join_chat', (data) => {
      const { roomId, isGroup = false, chatRoomId } = data;
      
      if (!roomId) {
        console.log('❌ join_chat: Missing roomId');
        return;
      }

      // ✅ CRITICAL: Calculate room ID EXACTLY like message emission
      let actualRoomId;
      if (isGroup) {
        actualRoomId = `group_${roomId}`;
      } else {
        // For private chats, use chatRoomId if available, otherwise use roomId
        actualRoomId = `private_${chatRoomId || roomId}`;
      }
      
      console.log(`🚪 User ${socket.userData.userId} joining room:`, {
        originalRoomId: roomId,
        actualRoomId: actualRoomId,
        isGroup: isGroup,
        chatRoomId: chatRoomId
      });

      // Leave previous chat rooms (only group/private rooms, not user rooms)
      socket.userData.rooms.forEach(room => {
        if (room.startsWith('group_') || room.startsWith('private_')) {
          socket.leave(room);
          socket.userData.rooms.delete(room);
          console.log(`🚪 Left previous room: ${room}`);
        }
      });
      
      // Join new room
      socket.join(actualRoomId);
      socket.userData.rooms.add(actualRoomId);
      
      console.log(`✅ User ${socket.userData.userId} successfully joined: ${actualRoomId}`);
      console.log(`📊 User ${socket.userData.userId} current rooms:`, Array.from(socket.userData.rooms));
    });

    // ✅ FIXED: Typing indicators with PROPER room emission
    socket.on('typing_start', (data) => {
      console.log('🎯 BACKEND: TYPING START received:', data);
      
      const { chatId, userId, userName, isGroup = false, chatRoomId } = data;
      
      if (!chatId || !userId) {
        console.log('❌ BACKEND: Missing required typing data');
        return;
      }

      // ✅ CRITICAL: Calculate room ID EXACTLY like join_chat and message emission
      let roomId;
      if (isGroup) {
        roomId = `group_${chatId}`;
      } else {
        roomId = `private_${chatRoomId || chatId}`;
      }
      
      console.log(`🎯 BACKEND: ${userName} (${userId}) started typing in ${roomId}`);
      
      // ✅ CRITICAL: Broadcast to ALL OTHER users in the room (excluding sender)
      socket.to(roomId).emit('user_typing', {
        userId: userId,
        userName: userName || 'Unknown User',
        isTyping: true,
        chatId: chatId,
        roomId: roomId, // Include roomId for frontend validation
        isGroup: isGroup,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📤 BACKEND: Typing start emitted to room: ${roomId} (excluding user ${userId})`);
    });

    socket.on('typing_stop', (data) => {
      console.log('🎯 BACKEND: TYPING STOP received:', data);
      
      const { chatId, userId, isGroup = false, chatRoomId } = data;
      
      if (!chatId || !userId) {
        console.log('❌ BACKEND: Missing required typing stop data');
        return;
      }

      // ✅ CRITICAL: Calculate room ID EXACTLY like typing_start
      let roomId;
      if (isGroup) {
        roomId = `group_${chatId}`;
      } else {
        roomId = `private_${chatRoomId || chatId}`;
      }
      
      console.log(`🎯 BACKEND: User ${userId} stopped typing in ${roomId}`);
      
      // ✅ CRITICAL: Broadcast to ALL OTHER users in the room (excluding sender)
      socket.to(roomId).emit('user_typing', {
        userId: userId,
        isTyping: false,
        chatId: chatId,
        roomId: roomId, // Include roomId for frontend validation
        isGroup: isGroup
      });
      
      console.log(`📤 BACKEND: Typing stop emitted to room: ${roomId} (excluding user ${userId})`);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log('❌ User disconnected:', socket.id, 'Reason:', reason, 'User ID:', socket.userData.userId);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });
};