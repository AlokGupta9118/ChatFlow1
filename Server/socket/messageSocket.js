export const setupChatSockets = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 New socket connection:', socket.id);

    // Store user data
    socket.userData = {
      userId: null,
      currentRooms: new Set()
    };

    // ✅ Authenticate user
    socket.on('authenticate', (userId) => {
      if (!userId) {
        console.log('❌ Authentication failed: No user ID');
        return;
      }

      socket.userData.userId = userId;
      const userRoom = `user_${userId}`;
      
      // Leave previous user rooms
      socket.userData.currentRooms.forEach(room => {
        if (room.startsWith('user_')) {
          socket.leave(room);
        }
      });
      
      socket.join(userRoom);
      socket.userData.currentRooms.add(userRoom);
      
      console.log(`✅ User ${userId} authenticated, joined room: ${userRoom}`);
    });

    // ✅ Join chat room
    socket.on('join_chat_room', (data) => {
      const { chatId, isGroup = false, chatRoomId } = data;
      
      if (!chatId || !socket.userData.userId) {
        console.log('❌ Cannot join room: Missing chatId or userId');
        return;
      }

      // Calculate room ID
      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`🚪 User ${socket.userData.userId} joining ${isGroup ? 'group' : 'private'} room: ${roomId}`);

      // Leave previous chat rooms
      socket.userData.currentRooms.forEach(room => {
        if (room.startsWith('group_') || room.startsWith('private_')) {
          socket.leave(room);
          socket.userData.currentRooms.delete(room);
          console.log(`⬅️  Left previous room: ${room}`);
        }
      });

      // Join new room
      socket.join(roomId);
      socket.userData.currentRooms.add(roomId);
      
      console.log(`✅ User ${socket.userData.userId} successfully joined: ${roomId}`);
      console.log(`📊 Current rooms:`, Array.from(socket.userData.currentRooms));
    });

    // ✅ Typing indicators
    socket.on('typing_start', (data) => {
      const { chatId, isGroup = false, chatRoomId, userName } = data;
      
      if (!chatId || !socket.userData.userId) {
        console.log('❌ Typing start failed: Missing data');
        return;
      }

      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`⌨️ ${userName} started typing in ${roomId}`);
      
      // Broadcast to others in the room
      socket.to(roomId).emit('user_typing', {
        userId: socket.userData.userId,
        userName: userName,
        isTyping: true,
        roomId: roomId,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('typing_stop', (data) => {
      const { chatId, isGroup = false, chatRoomId } = data;
      
      if (!chatId || !socket.userData.userId) {
        console.log('❌ Typing stop failed: Missing data');
        return;
      }

      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`⌨️ User stopped typing in ${roomId}`);
      
      // Broadcast to others in the room
      socket.to(roomId).emit('user_typing', {
        userId: socket.userData.userId,
        isTyping: false,
        roomId: roomId
      });
    });

    // ✅ Handle message delivery status
    socket.on('message_delivered', (data) => {
      const { messageId, roomId } = data;
      console.log(`✓ Message ${messageId} delivered in ${roomId}`);
      
      // Notify sender that message was delivered
      socket.to(roomId).emit('message_status_update', {
        messageId,
        status: 'delivered'
      });
    });

    // ✅ Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log('❌ User disconnected:', socket.id, 'Reason:', reason);
      console.log(`📊 Final rooms for ${socket.userData.userId}:`, Array.from(socket.userData.currentRooms));
    });

    // ✅ Error handling
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });
};