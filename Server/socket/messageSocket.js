// socketHandlers.js (Updated)
export const setupChatSockets = (io) => {
  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // ✅ Join user's personal room
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`👤 User ${userId} joined personal room`);
      }
    });

    // ✅ Join chat room
    socket.on('join_chat', (roomId) => {
      socket.join(roomId);
      console.log(`🚪 User joined room: ${roomId}`);
    });

    // ✅ Leave chat room
    socket.on('leave_chat', (roomId) => {
      socket.leave(roomId);
      console.log(`🚪 User left room: ${roomId}`);
    });

    // ✅ REAL-TIME: Send message with proper room handling
    socket.on('send_message', async (data) => {
      try {
        const { roomId, message, chatType = "private" } = data;
        
        console.log('💬 Processing real-time message:', message);

        // Create message object for real-time delivery
        const chatMessage = {
          _id: message._id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

        // ✅ CRITICAL: Broadcast to ALL users in the room INCLUDING sender for immediate UI update
        io.to(roomId).emit('receive_message', chatMessage);
        console.log(`📨 Real-time message broadcast to room ${roomId}`);

      } catch (error) {
        console.error('❌ Error in send_message:', error);
        socket.emit('chat_error', { error: 'Failed to send message' });
      }
    });

    // ✅ TYPING: Enhanced typing indicators
    socket.on('typing_start', (data) => {
      const { chatId, userId, isGroup = false } = data;
      const roomId = isGroup ? `group_${chatId}` : `private_${chatId}`;
      
      // Broadcast to all other users in the room
      socket.to(roomId).emit('typing_start', {
        chatId,
        userId,
        userName: data.userName,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { chatId, userId, isGroup = false } = data;
      const roomId = isGroup ? `group_${chatId}` : `private_${chatId}`;
      
      // Broadcast to all other users in the room
      socket.to(roomId).emit('typing_stop', {
        chatId,
        userId,
        isTyping: false
      });
    });

    // ✅ MESSAGE STATUS: For delivery/read receipts
    socket.on('message_delivered', ({ messageId, roomId }) => {
      socket.to(roomId).emit('message_delivery_update', {
        messageId,
        status: 'delivered',
        timestamp: new Date().toISOString()
      });
    });

    socket.on('message_read', ({ messageId, roomId }) => {
      socket.to(roomId).emit('message_delivery_update', {
        messageId,
        status: 'read',
        timestamp: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id);
    });
  });
};