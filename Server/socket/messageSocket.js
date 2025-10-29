// Server/socket/messageSocket.js
export const setupChatSockets = (io) => {
  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // Store user's current rooms
    socket.userRooms = new Set();

    // ✅ FIXED: Join user's personal room
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.userId = userId;
        const userRoom = `user_${userId}`;
        
        // Leave previous user room if any
        if (socket.userRooms.has(userRoom)) {
          socket.leave(userRoom);
        }
        
        socket.join(userRoom);
        socket.userRooms.add(userRoom);
        
        console.log(`👤 User ${userId} joined personal room: ${userRoom}`);
        
        // Broadcast online status
        socket.broadcast.emit('user_status_change', { 
          userId,
          status: 'online',
          lastSeen: new Date().toISOString()
        });
      }
    });

    // ✅ FIXED: Enhanced chat room joining
    socket.on('join_chat', (data) => {
      const { roomId, isGroup = false, chatRoomId } = data;
      if (!roomId) return;

      // ✅ CRITICAL: Consistent room naming
      const actualRoomId = isGroup ? `group_${roomId}` : `private_${chatRoomId || roomId}`;
      
      console.log(`🚪 User ${socket.userId} joining room: ${actualRoomId}`);

      // Leave previous chat rooms (only one active chat at a time)
      socket.userRooms.forEach(room => {
        if (room.startsWith('group_') || room.startsWith('private_')) {
          socket.leave(room);
          socket.userRooms.delete(room);
          console.log(`🚪 Left previous room: ${room}`);
        }
      });
      
      // Join new room
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

    // ✅ FIXED: Enhanced typing indicators with PROPER room handling
    socket.on('typing_start', (data) => {
      const { chatId, userId, userName, isGroup = false, chatRoomId } = data;
      
      // ✅ CRITICAL: Use EXACT same room logic as join_chat
      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`⌨️ ${userName} started typing in ${roomId}`);
      
      // Broadcast to all OTHER users in the room
      socket.to(roomId).emit('user_typing', {
        userId,
        userName,
        isTyping: true,
        chatId: chatId,
        roomId: roomId,
        isGroup: isGroup,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('typing_stop', (data) => {
      const { chatId, userId, isGroup = false, chatRoomId } = data;
      
      // ✅ CRITICAL: Use EXACT same room logic as join_chat
      const roomId = isGroup ? `group_${chatId}` : `private_${chatRoomId || chatId}`;
      
      console.log(`⌨️ User ${userId} stopped typing in ${roomId}`);
      
      socket.to(roomId).emit('user_typing', {
        userId,
        isTyping: false,
        chatId: chatId,
        roomId: roomId,
        isGroup: isGroup
      });
    });

    // ✅ FIXED: REAL-TIME Message handling - PREVENT DUPLICATES
    socket.on('send_message', async (data) => {
      try {
        const { roomId, message, chatType = "private" } = data;
        
        console.log('💬 Socket send_message received for room:', roomId);

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
          isRealTime: true,
          status: 'sent'
        };

        console.log(`📨 Broadcasting to SINGLE room: ${roomId}`);
        
        // ✅ FIXED: SINGLE emission to the specific room ONLY
        io.to(roomId).emit('receive_message', chatMessage);

        console.log(`✅ Socket message emitted to room: ${roomId}`);

      } catch (error) {
        console.error('❌ Error in send_message:', error);
        socket.emit('chat_error', { error: 'Failed to send message' });
      }
    });

    // User status management
    socket.on('user_online', (data) => {
      console.log('👤 User online:', data.userId);
      socket.broadcast.emit('user_status_change', {
        userId: data.userId,
        status: 'online',
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

      // Clean up rooms
      socket.userRooms.clear();
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });
};