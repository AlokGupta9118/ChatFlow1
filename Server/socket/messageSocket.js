// Server/socket/messageSocket.js - MINIMAL TEST VERSION
export const setupChatSockets = (io) => {
  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // Join user room
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.userId = userId;
        socket.join(`user_${userId}`);
        console.log(`👤 User ${userId} joined personal room`);
      }
    });

    // Join chat room
    socket.on('join_chat', (data) => {
      const { roomId, isGroup = false, chatRoomId } = data;
      if (!roomId) return;

      const actualRoomId = isGroup ? `group_${roomId}` : `private_${chatRoomId || roomId}`;
      socket.join(actualRoomId);
      console.log(`🚪 User joined room: ${actualRoomId}`);
    });

    // ✅ SIMPLIFIED TYPING - TEST VERSION
    socket.on('typing_start', (data) => {
      console.log('🎯 TYPING START TEST:', data);
      
      const { chatId, userId, isGroup = false, chatRoomId } = data;
      
      // Simple room calculation
      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`🎯 Emitting typing to room: ${roomId}`);
      
      // Emit to everyone in the room including sender (for testing)
      io.to(roomId).emit('user_typing', {
        userId: userId || 'test-user',
        userName: 'Test User',
        isTyping: true,
        roomId: roomId,
        isGroup: isGroup,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('typing_stop', (data) => {
      console.log('🎯 TYPING STOP TEST:', data);
      
      const { chatId, userId, isGroup = false, chatRoomId } = data;
      
      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`🎯 Emitting typing stop to room: ${roomId}`);
      
      io.to(roomId).emit('user_typing', {
        userId: userId || 'test-user',
        isTyping: false,
        roomId: roomId,
        isGroup: isGroup
      });
    });

    // Real-time messages
    socket.on('send_message', (data) => {
      const { roomId, message } = data;
      if (roomId) {
        io.to(roomId).emit('receive_message', {
          ...message,
          roomId: roomId,
          isRealTime: true
        });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id);
    });
  });
};