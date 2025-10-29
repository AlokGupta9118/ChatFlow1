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

    // Enhanced chat room joining
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

    // ✅ FIXED: Typing indicators - SIMPLIFIED AND DEBUGGED
    socket.on('typing_start', (data) => {
      console.log('🎯 BACKEND: TYPING START received from user:', data.userId, 'for chat:', data.chatId);
      
      const { chatId, userId, userName, isGroup = false, chatRoomId } = data;
      
      if (!chatId || !userId) {
        console.log('❌ BACKEND: Missing required typing data');
        return;
      }

      // ✅ CRITICAL: Calculate room ID EXACTLY like join_chat
      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`🎯 BACKEND: Broadcasting typing start to room: ${roomId}`);
      console.log(`🎯 BACKEND: ${userName} (${userId}) started typing in ${roomId}`);
      
      // ✅ CRITICAL: Use socket.to() to broadcast to OTHER users in the room
      socket.to(roomId).emit('user_typing', {
        userId: userId,
        userName: userName || 'Unknown User',
        isTyping: true,
        chatId: chatId,
        roomId: roomId,
        isGroup: isGroup,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📤 BACKEND: Typing start emitted to room: ${roomId} (excluding user ${userId})`);
      
      // ✅ DEBUG: Check who's in the room
      const room = io.sockets.adapter.rooms.get(roomId);
      if (room) {
        console.log(`👥 BACKEND: Users in room ${roomId}:`, room.size);
      } else {
        console.log(`❌ BACKEND: Room ${roomId} is empty!`);
      }
    });

    socket.on('typing_stop', (data) => {
      console.log('🎯 BACKEND: TYPING STOP received from user:', data.userId, 'for chat:', data.chatId);
      
      const { chatId, userId, isGroup = false, chatRoomId } = data;
      
      if (!chatId || !userId) {
        console.log('❌ BACKEND: Missing required typing stop data');
        return;
      }

      // ✅ CRITICAL: Calculate room ID EXACTLY like typing_start
      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`🎯 BACKEND: Broadcasting typing stop to room: ${roomId}`);
      console.log(`🎯 BACKEND: User ${userId} stopped typing in ${roomId}`);
      
      // ✅ CRITICAL: Use socket.to() to broadcast to OTHER users in the room
      socket.to(roomId).emit('user_typing', {
        userId: userId,
        isTyping: false,
        chatId: chatId,
        roomId: roomId,
        isGroup: isGroup
      });
      
      console.log(`📤 BACKEND: Typing stop emitted to room: ${roomId} (excluding user ${userId})`);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log('❌ User disconnected:', socket.id, 'Reason:', reason, 'User ID:', socket.userData.userId);
    });
  });
};