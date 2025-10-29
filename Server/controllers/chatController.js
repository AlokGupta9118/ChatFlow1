// controllers/chatController.js
import ChatRoom from "../models/ChatRoom.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import GroupJoinRequest from "../models/GroupJoinRequest.js";




// ✅ FIXED: Send private message with immediate real-time delivery
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId, content, messageType = "text" } = req.body;

    if (!senderId || !receiverId || !content?.trim()) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find or create chat room
    let chatRoom = await ChatRoom.findOne({
      type: "direct",
      $and: [
        { "participants.user": senderId },
        { "participants.user": receiverId },
      ],
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
    }

    // ✅ Create and save message immediately
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

    // ✅ FIXED: Consistent room naming for real-time
    const roomId = `private_${chatRoom._id}`;
    const messageForRealTime = {
      ...populatedMessage,
      senderId: senderId,
      receiverId: receiverId, // ✅ ADDED: Include receiverId for backup delivery
      roomId: roomId,
      isRealTime: false,
      chatType: 'private'
    };

    // ✅ FIXED: Emit socket message with consistent room naming
    const io = req.app.get('io');
    if (io) {
      // PRIMARY: Emit to the specific private chat room
      io.to(roomId).emit('receive_message', messageForRealTime);
      
      // SECONDARY: Emit to both users' personal rooms as backup
      io.to(`user_${receiverId}`).emit('receive_message', messageForRealTime);
      io.to(`user_${senderId}`).emit('receive_message', messageForRealTime);
      
      console.log(`📨 Controller emitted PRIVATE message to room: ${roomId}`);
    }

    res.status(201).json({ 
      success: true, 
      message: populatedMessage 
    });

  } catch (err) {
    console.error("❌ Error in sendMessage:", err);
    res.status(500).json({ message: "Failed to send message", error: err.message });
  }
};

// ✅ FIXED: Send group message
export const sendGroupMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, mediaUrl, messageType = "text" } = req.body;
    const userId = req.user._id;

    if (!content?.trim() && !mediaUrl) {
      return res.status(400).json({ message: "Message content cannot be empty" });
    }

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

    // ✅ Create and save message immediately
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

    // ✅ FIXED: Consistent room naming
    const groupRoomId = `group_${roomId}`;
    const messageForRealTime = {
      ...populatedMessage,
      senderId: userId,
      roomId: groupRoomId,
      isRealTime: false,
      chatType: 'group'
    };

    // ✅ FIXED: Emit to group room consistently
    const io = req.app.get('io');
    if (io) {
      // Primary: Emit to group room
      io.to(groupRoomId).emit('receive_message', messageForRealTime);
      
      // Secondary: Emit to all participants' personal rooms
      room.participants.forEach(participant => {
        io.to(`user_${participant.user}`).emit('receive_message', messageForRealTime);
      });
      
      console.log(`📨 Controller emitted GROUP message to room: ${groupRoomId}`);
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

// ✅ Keep existing getMessages and getGroupMessages (they're fine)
export const getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const friendId = req.params.friendId;

    // Check if friend exists
    const friend = await User.findById(friendId);
    if (!friend) return res.status(404).json({ message: "Friend not found" });

    // Find chat room
    let chatRoom = await ChatRoom.findOne({
      type: "direct",
      $and: [
        { "participants.user": userId },
        { "participants.user": friendId },
      ],
    }).populate({
      path: "messages",
      populate: { 
        path: "sender", 
        select: "name profilePicture" 
      },
      options: { 
        sort: { createdAt: 1 } 
      }
    });

    if (!chatRoom) {
      return res.status(200).json({ messages: [] });
    }

    res.status(200).json({ 
      success: true,
      messages: chatRoom.messages || [] 
    });

  } catch (err) {
    console.error("❌ Error in getMessages:", err);
    res.status(500).json({ message: "Failed to fetch messages", error: err.message });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await ChatRoom.findById(roomId)
      .populate({
        path: "messages",
        populate: { 
          path: "sender", 
          select: "name profilePicture" 
        },
        options: { 
          sort: { createdAt: 1 } 
        }
      })
      .populate("participants.user", "name profilePicture");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Check if user is participant
    const isParticipant = room.participants.some(
      (p) => {
        const participantId = p.user?._id?.toString() || p.user?.toString();
        return participantId === userId.toString();
      }
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not a participant of this room",
      });
    }

    return res.status(200).json({
      success: true,
      messages: room.messages || [],
    });

  } catch (err) {
    console.error("❌ getGroupMessages error:", err);
    res.status(500).json({ message: "Failed to fetch messages", error: err.message });
  }
};


// 🔹 Send join request
export const requestToJoinGroup = async (req, res) => {
  const { groupId } = req.params; // match the route
  const userId = req.user._id;

  const group = await ChatRoom.findById(groupId); // use groupId
  if (!group) return res.status(404).json({ message: "Group not found" });

  // Already participant?
  if (group.participants.some(p => p.user.toString() === userId.toString())) {
    return res.status(400).json({ message: "Already a member" });
  }

  // Already requested?
  if (group.pendingParticipants.some(p => p.user.toString() === userId.toString())) {
    return res.status(400).json({ message: "Join request already pending" });
  }

  group.pendingParticipants.push({ user: userId });
  await group.save();

  res.json({ message: "Join request sent" });
};


// 🔹 Fetch all user's pending join requests
export const getMyPendingRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all groups where user is in pendingParticipants
    const requests = await ChatRoom.find({
      type: "group",
      "pendingParticipants.user": userId,
    }).select("name avatar");

    res.json({ requests });
  } catch (err) {
    console.error("❌ Error in getMyPendingRequests:", err);
    res.status(500).json({ message: "Failed to fetch my pending requests" });
  }
};


// GET /chatroom/my-join-requests
export const getMyJoinRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await ChatRoom.find({
      type: "group",
      "pendingParticipants.user": userId,
    })
      .select("name avatar participants")
      .populate("participants.user", "name profilePicture")
      .lean();

    res.status(200).json({ requests });
  } catch (err) {
    console.error("❌ getMyJoinRequests error:", err);
    res.status(500).json({ message: "Failed to fetch your join requests" });
  }
};



// Raise a join request to a group chat
// controllers/chatController.js
// User requests to join a group
export const sendJoinRequest= async (req, res) => {
  try {
    const userId = req.user._id;
    const group = await ChatRoom.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Check if already participant
    if (group.participants.some((p) => p.user.toString() === userId.toString())) {
      return res.status(400).json({ message: "You are already a member" });
    }

    // Check if request already exists
    const existingRequest = await GroupJoinRequest.findOne({
      group: group._id,
      user: userId,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Join request already pending" });
    }

    const joinRequest = await GroupJoinRequest.create({
      group: group._id,
      user: userId,
    });

    res.json({ message: "Join request sent successfully!", joinRequest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send join request" });
  }
};


// GET /api/chatrooms/:chatId/members
// controllers/chatRoomController.js

export const getGroupMembers = async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id).populate(
      "participants.user",
      "name profilePicture"
    );

    if (!chatRoom) {
      return res.status(404).json({ message: "Chat room not found" });
    }

    // Filter out null participants before mapping
    const members = chatRoom.participants
      .filter((p) => p && p.user) // skip null users
      .map((p) => ({
        user: {
          _id: p.user._id,
          name: p.user.name,
          profilePicture: p.user.profilePicture,
        },
        role: p.role,
      }));

    // Get current user role
    const currentUser = chatRoom.participants.find(
      (p) => String(p.user._id) === String(req.user._id)
    );
    const currentUserRole = currentUser ? currentUser.role : null;

    res.json({ members, currentUserRole });
  } catch (err) {
    console.error("❌ getChatRoomMembers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



    // Find chat room and populate user details
   
export const createGroupChat = async (req, res) => {
  try {
    const { name, description = "", participants = [] } = req.body;
    if (!name) return res.status(400).json({ message: "Group name is required" });

    const creatorId = req.user._id;

    // Ensure all participants are user IDs only
    const participantIds = [
      ...new Set(
        participants
          .map((p) => (typeof p === "object" ? p.user || p._id : p))
          .filter(Boolean)
          .map(String)
      ),
    ];

    // Add creator as owner if not included
    if (!participantIds.includes(String(creatorId))) {
      participantIds.push(String(creatorId));
    }

    const chatRoom = new ChatRoom({
      name,
      description,
      type: "group",
      participants: participantIds.map((id) => ({
        user: id,
        role: id.toString() === creatorId.toString() ? "owner" : "member",
      })),
      createdBy: creatorId,
    });

    // Optional: create welcome message
    const welcomeMessage = new Message({
      sender: creatorId,
      content: `🎉 Group "${name}" was created by ${req.user.name || "Admin"}.`,
      messageType: "system",
      chatRoom: chatRoom._id,
    });

    await welcomeMessage.save();
    chatRoom.messages.push(welcomeMessage._id);
    chatRoom.lastMessage = welcomeMessage._id;

    await chatRoom.save();

    const populatedChat = await ChatRoom.findById(chatRoom._id)
      .populate("participants.user", "name profilePicture")
      .populate("lastMessage");

    res.status(201).json({
      message: "Group chat created successfully",
      chatRoom: populatedChat,
    });
  } catch (err) {
    console.error("❌ Error creating group chat:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};










// Leave a Group Chat
export const leaveGroupChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await ChatRoom.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Group not found" });

    chat.participants = chat.participants.filter(
      (p) => p.user.toString() !== userId.toString()
    );

    await chat.save();
    res.json({ message: "Left group successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};



// Get Group Chat List



// controllers/chatController.js







export const getAllGroups = async (req, res) => {
  try {
    const groups = await ChatRoom.find({ type: "group" })
      .populate("participants.user", "name profilePicture")
      .populate("createdBy", "name profilePicture");

    // Filter OUT groups where user is a participant
    const otherGroups = groups.filter(
      (group) =>
        !group.participants.some(
          (p) => p?.user && String(p.user._id) === String(req.user._id)
        )
    );

    res.status(200).json({ groups: otherGroups });
  } catch (err) {
    console.error("❌ Error fetching all groups:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await ChatRoom.find({
      type: "group",
      "participants.user": userId,
    })
      .populate("participants.user", "name profilePicture")
      .populate("lastMessage", "content createdAt");

    res.status(200).json({ groups });
  } catch (err) {
    console.error("❌ Error fetching groups:", err);
    res.status(500).json({ message: "Failed to fetch your groups" });
  }
};

  



// controllers/chatController.js (add these)

// Send join request





// controllers/groupChatController.js



// Send a join request (or invite) to a user
export const addParticipant = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const group = await ChatRoom.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Check if user is already participant
    if (group.participants.some((p) => p.user.toString() === user._id.toString())) {
      return res.status(400).json({ message: "User is already a member" });
    }

    // Create a join request
    const existingRequest = await GroupJoinRequest.findOne({
      group: group._id,
      user: user._id,
      status: "pending",
    });

    if (existingRequest)
      return res.status(400).json({ message: "Join request already pending" });

    const joinRequest = await GroupJoinRequest.create({
      group: group._id,
      user: user._id,
    });

    res.json({ message: "Join request created", joinRequest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add participant" });
  }
};

// Remove a participant from group
export const removeParticipant = async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await ChatRoom.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    group.participants = group.participants.filter(
      (p) => p.user.toString() !== userId
    );

    await group.save();
    res.json({ message: "User removed from group" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to remove participant" });
  }
};


// ✅ Get all pending join requests for a group

export const getPendingRequests = async (req, res) => {
  try {
    const groupId = req.params.groupId;

    // Find the group
    const group = await ChatRoom.findById(groupId)
      .populate("pendingParticipants.user", "name email profilePicture")
      .lean();

    if (!group) return res.status(404).json({ message: "Group not found" });

    // Return pending participants
    res.status(200).json({ requests: group.pendingParticipants || [] });
  } catch (err) {
    console.error("❌ Failed to fetch pending requests:", err);
    res.status(500).json({ message: "Failed to fetch pending requests" });
  }
};

// Approve join request
// Approve pending request
export const approveRequest = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body; // <-- must match frontend field

    if (!userId) return res.status(400).json({ message: "userId is required" });

    const group = await ChatRoom.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const index = group.pendingParticipants.findIndex(
      (p) => p.user && String(p.user) === String(userId)
    );

    if (index === -1) return res.status(404).json({ message: "Request not found" });

    // Push to participants and remove from pending
    group.participants.push({ user: userId, role: "member" });
    group.pendingParticipants.splice(index, 1);

    await group.save();

    res.status(200).json({ message: "User approved and added to group" });
  } catch (err) {
    console.error("❌ Failed to approve request:", err);
    res.status(500).json({ message: "Failed to approve request" });
  }
};


// Reject pending request
export const rejectRequest = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!userId)
      return res.status(400).json({ message: "userId is required" });

    const group = await ChatRoom.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const currentUserRole = group.participants.find(
      (p) => p.user.toString() === currentUserId.toString()
    )?.role;

    if (currentUserRole !== "admin" && currentUserRole !== "owner") {
      return res.status(403).json({ message: "Unauthorized" });
    }
    // Remove from pending
    const pending = group.pendingParticipants.find(
      (p) => p.user.toString() === userId
    );
    if (!pending) return res.status(404).json({ message: "Request not found" });

    group.pendingParticipants = group.pendingParticipants.filter(
      (p) => p.user.toString() !== userId
    );

    await group.save();

    res.status(200).json({ message: "Pending request rejected" });
  } catch (err) {
    console.error("❌ Failed to reject request:", err);
    res.status(500).json({ message: "Failed to reject request" });
  }
};
