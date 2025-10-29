export const setupChatSockets = (io) => {
  io.on('connection', (socket) => {
    console.log('✅ User connected to chat:', socket.id);

    // Store user info
    socket.userData = {
      userId: null,
      currentRooms: new Set()
    };

    // ✅ User authentication and room setup
    socket.on('authenticate', (userId) => {
      if (!userId) return;
      
      socket.userData.userId = userId;
      const userRoom = `user_${userId}`;
      
      // Leave previous user room
      socket.userData.currentRooms.forEach(room => {
        if (room.startsWith('user_')) {
          socket.leave(room);
        }
      });
      
      socket.join(userRoom);
      socket.userData.currentRooms.add(userRoom);
      console.log(`👤 User ${userId} authenticated and joined user room`);
    });

    // ✅ Join chat room (both private and group)
    socket.on('join_chat_room', (data) => {
      const { chatId, isGroup = false, chatRoomId } = data;
      
      if (!chatId || !socket.userData.userId) {
        console.log('❌ Missing data for joining chat room');
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
        }
      });

      // Join new room
      socket.join(roomId);
      socket.userData.currentRooms.add(roomId);
      
      console.log(`✅ User ${socket.userData.userId} successfully joined: ${roomId}`);
    });

    // ✅ Leave chat room
    socket.on('leave_chat_room', (data) => {
      const { chatId, isGroup = false, chatRoomId } = data;
      
      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      socket.leave(roomId);
      socket.userData.currentRooms.delete(roomId);
      
      console.log(`🚪 User ${socket.userData.userId} left room: ${roomId}`);
    });

    // ✅ TYPING: Start typing
    socket.on('typing_start', (data) => {
      const { chatId, isGroup = false, chatRoomId, userName } = data;
      
      if (!chatId || !socket.userData.userId) return;

      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`⌨️ ${userName} started typing in ${roomId}`);
      
      // Broadcast to other users in the room
      socket.to(roomId).emit('user_typing', {
        userId: socket.userData.userId,
        userName: userName,
        isTyping: true,
        roomId: roomId
      });
    });

    // ✅ TYPING: Stop typing
    socket.on('typing_stop', (data) => {
      const { chatId, isGroup = false, chatRoomId } = data;
      
      if (!chatId || !socket.userData.userId) return;

      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`⌨️ User stopped typing in ${roomId}`);
      
      // Broadcast to other users in the room
      socket.to(roomId).emit('user_typing', {
        userId: socket.userData.userId,
        isTyping: false,
        roomId: roomId
      });
    });

    // ✅ Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log('❌ User disconnected from chat:', socket.id, 'Reason:', reason);
    });
  });
};