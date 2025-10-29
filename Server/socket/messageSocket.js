// controllers/chatController.js
import ChatRoom from "../models/ChatRoom.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

// ✅ FIXED: Send private message - SINGLE EMISSION
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId, content, messageType = "text" } = req.body;

    if (!senderId || !receiverId || !content?.trim()) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    console.log('📤 Sending message from:', senderId, 'to:', receiverId);

    // Find or create chat room
    let chatRoom = await ChatRoom.findOne({
      type: "direct",
      participants: {
        $all: [
          { $elemMatch: { user: senderId } },
          { $elemMatch: { user: receiverId } }
        ]
      }
    });

    if (!chatRoom) {
      chatRoom = new ChatRoom({
        type: "direct",
        participants: [
          { user: senderId, role: "member" },
          { user: receiverId, role: "member" },
        ],
        createdBy: senderId,
      });
      await chatRoom.save();
      console.log('✅ Created new chat room:', chatRoom._id);
    }

    // Create and save message
    const newMessage = new Message({
      chatRoom: chatRoom._id,
      sender: senderId,
      type: messageType,
      content: content.trim(),
      status: 'delivered'
    });

    await newMessage.save();

    // Update chat room
    chatRoom.messages.push(newMessage._id);
    chatRoom.lastMessage = newMessage._id;
    chatRoom.lastActivity = new Date();
    await chatRoom.save();

    // Populate message with sender info
    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "name profilePicture")
      .lean();

    // ✅ FIXED: SINGLE room ID for private chats
    const roomId = `private_${chatRoom._id}`;
    const messageForRealTime = {
      ...populatedMessage,
      senderId: senderId,
      receiverId: receiverId,
      roomId: roomId,
      chatRoom: chatRoom._id,
      isRealTime: true,
      chatType: 'private'
    };

    console.log('📨 Emitting to private room ONLY:', roomId);

    // ✅ FIXED: SINGLE emission to the correct room
    const io = req.app.get('io');
    if (io) {
      // ONLY emit to the private chat room - NO duplicate emissions
      io.to(roomId).emit('receive_message', messageForRealTime);
      console.log('✅ Private message emitted to SINGLE room:', roomId);
    }

    res.status(201).json({ 
      success: true, 
      message: populatedMessage,
      chatRoomId: chatRoom._id
    });

  } catch (err) {
    console.error("❌ Error in sendMessage:", err);
    res.status(500).json({ message: "Failed to send message", error: err.message });
  }
};

// ✅ FIXED: Send group message - SINGLE EMISSION
export const sendGroupMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, mediaUrl, messageType = "text" } = req.body;
    const userId = req.user._id;

    if (!content?.trim() && !mediaUrl) {
      return res.status(400).json({ message: "Message content cannot be empty" });
    }

    console.log('📤 Sending group message to room:', roomId);

    // Find the chat room
    const room = await ChatRoom.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    // Check if user is a participant
    const isParticipant = room.participants.some(
      (p) => p.user.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ message: "You are not a participant of this room" });
    }

    // Create and save message
    const newMessage = await Message.create({
      chatRoom: roomId,
      sender: userId,
      content: content?.trim() || null,
      mediaUrl: mediaUrl || null,
      type: messageType,
      status: 'delivered'
    });

    // Update chat room
    room.messages.push(newMessage._id);
    room.lastMessage = newMessage._id;
    room.lastActivity = new Date();
    await room.save();

    // Populate sender info
    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "name profilePicture")
      .lean();

    // ✅ FIXED: SINGLE room ID for group chats
    const groupRoomId = `group_${roomId}`;
    const messageForRealTime = {
      ...populatedMessage,
      senderId: userId,
      roomId: groupRoomId,
      chatRoom: roomId,
      isRealTime: true,
      chatType: 'group'
    };

    console.log('📨 Emitting group message to room ONLY:', groupRoomId);

    // ✅ FIXED: SINGLE emission to the correct room
    const io = req.app.get('io');
    if (io) {
      // ONLY emit to group room - NO duplicate emissions
      io.to(groupRoomId).emit('receive_message', messageForRealTime);
      console.log('✅ Group message emitted to SINGLE room:', groupRoomId);
    }

    return res.status(201).json({ 
      success: true, 
      message: populatedMessage 
    });

  } catch (err) {
    console.error("❌ sendGroupMessage error:", err);
    res.status(500).json({ message: "Failed to send message", error: err.message });
  }
};