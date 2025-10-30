// controllers/chatController.js
import ChatRoom from "../models/ChatRoom.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import GroupJoinRequest from "../models/GroupJoinRequest.js";


export const getChatRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const chatRooms = await ChatRoom.find({
      "participants.user": userId,
      isActive: true
    })
    .populate("participants.user", "name profilePicture status lastSeen")
    .populate("lastMessage")
    .populate("createdBy", "name profilePicture")
    .sort({ updatedAt: -1 });

    res.json({
      success: true,
      chatRooms
    });
  } catch (error) {
    console.error("Error fetching chat rooms:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chat rooms"
    });
  }
};

export const getOrCreateDirectChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    if (userId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot create chat with yourself"
      });
    }

    // Check if direct chat already exists
    let chatRoom = await ChatRoom.findOne({
      type: "direct",
      "participants.user": { $all: [userId, targetUserId] },
      isActive: true
    })
    .populate("participants.user", "name profilePicture status lastSeen")
    .populate("lastMessage");

    if (!chatRoom) {
      // Create new direct chat
      chatRoom = new ChatRoom({
        type: "direct",
        participants: [
          { user: userId, role: "member" },
          { user: targetUserId, role: "member" }
        ],
        createdBy: userId,
        settings: {
          isPrivate: true
        }
      });

      await chatRoom.save();
      await chatRoom.populate("participants.user", "name profilePicture status lastSeen");
    }

    res.json({
      success: true,
      chatRoom
    });
  } catch (error) {
    console.error("Error creating direct chat:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create chat"
    });
  }
};

export const createGroupChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, participantIds, settings } = req.body;

    const participants = [
      { user: userId, role: "owner" },
      ...participantIds.map(id => ({ user: id, role: "member" }))
    ];

    const chatRoom = new ChatRoom({
      name,
      description,
      type: "group",
      participants,
      createdBy: userId,
      settings: {
        ...settings,
        isPrivate: true
      }
    });

    await chatRoom.save();
    await chatRoom.populate([
      { path: "participants.user", select: "name profilePicture status" },
      { path: "createdBy", select: "name profilePicture" }
    ]);

    res.status(201).json({
      success: true,
      chatRoom
    });
  } catch (error) {
    console.error("Error creating group chat:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create group chat"
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    console.log(`📨 Fetching messages for chat: ${chatRoomId}, user: ${userId}`);

    // Verify user has access to this chat room
    const chatRoom = await ChatRoom.findOne({
      _id: chatRoomId,
      "participants.user": userId,
      isActive: true
    }).populate("participants.user", "name profilePicture status");

    if (!chatRoom) {
      return res.status(403).json({
        success: false,
        message: "Access denied or chat room not found"
      });
    }

    // Get messages with pagination
    const messages = await Message.find({
      chatRoom: chatRoomId,
      deleted: false
    })
    .populate("sender", "name profilePicture status")
    .populate({
      path: "replyTo",
      populate: {
        path: "sender",
        select: "name profilePicture"
      }
    })
    .populate("reactions.user", "name profilePicture")
    .sort({ createdAt: -1 }) // Get latest messages first
    .limit(limit)
    .skip((page - 1) * limit);

    // Reverse to show oldest first in UI
    const sortedMessages = messages.reverse();

    // Mark messages as delivered (not read yet)
    const unreadMessages = await Message.updateMany(
      {
        chatRoom: chatRoomId,
        sender: { $ne: userId },
        "readBy.user": { $ne: userId },
        deleted: false
      },
      {
        $set: { status: "delivered" }
      }
    );

    console.log(`✅ Found ${sortedMessages.length} messages for chat ${chatRoomId}`);

    res.json({
      success: true,
      messages: sortedMessages,
      hasMore: messages.length === limit,
      chatRoom: {
        _id: chatRoom._id,
        name: chatRoom.name,
        type: chatRoom.type,
        participants: chatRoom.participants,
        settings: chatRoom.settings
      }
    });

  } catch (error) {
    console.error("❌ Error fetching messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages"
    });
  }
};

export const getChatRoomDetails = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const userId = req.user.id;

    const chatRoom = await ChatRoom.findOne({
      _id: chatRoomId,
      "participants.user": userId,
      isActive: true
    })
    .populate("participants.user", "name profilePicture status lastSeen")
    .populate("createdBy", "name profilePicture")
    .populate("lastMessage");

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found"
      });
    }

    res.json({
      success: true,
      chatRoom
    });
  } catch (error) {
    console.error("Error fetching chat room details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chat room details"
    });
  }
};

// ✅ Get user's groups
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await ChatRoom.find({
      type: "group",
      "participants.user": userId,
    })
    .populate("participants.user", "name profilePicture")
    .populate("lastMessage")
    .sort({ lastActivity: -1 });

    res.status(200).json({ groups });
  } catch (err) {
    console.error("❌ Error fetching groups:", err);
    res.status(500).json({ message: "Failed to fetch groups" });
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


export const sendMessage = async (req, res) => {
  try {
    const { chatRoomId, content, replyTo, type = "text", mediaUrl, mediaType } = req.body;
    const userId = req.user.id;

    console.log("📤 Sending message:", { chatRoomId, content, type, userId });

    // Validate required fields
    if (!content?.trim() && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: "Message content or media is required"
      });
    }

    // Verify user has access to this chat room
    const chatRoom = await ChatRoom.findOne({
      _id: chatRoomId,
      "participants.user": userId,
      isActive: true
    }).populate("participants.user", "name profilePicture status socketId");

    if (!chatRoom) {
      return res.status(403).json({
        success: false,
        message: "Access denied or chat room not found"
      });
    }

    // Check if user is blocked in this chat
    if (chatRoom.blockedUsers.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: "You are blocked from sending messages in this chat"
      });
    }

    // Create new message
    const message = new Message({
      chatRoom: chatRoomId,
      sender: userId,
      content: content?.trim(),
      type,
      mediaUrl,
      mediaType,
      replyTo,
      status: "sent"
    });

    await message.save();

    // Populate message for response
    await message.populate([
      { 
        path: "sender", 
        select: "name profilePicture status" 
      },
      { 
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name profilePicture"
        }
      }
    ]);

    // Update chat room's last message and timestamp
    await ChatRoom.findByIdAndUpdate(chatRoomId, {
      lastMessage: message._id,
      updatedAt: new Date()
    });

    // Get populated message for real-time emission
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name profilePicture status")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name profilePicture"
        }
      });

    // Emit real-time event to all participants
    const io = req.app.get('io');
    if (io) {
      io.to(chatRoomId).emit("new_message", populatedMessage);
      
      // Also emit to update chat lists
      chatRoom.participants.forEach(participant => {
        io.to(participant.user._id.toString()).emit("chat_updated", {
          chatRoomId,
          lastMessage: populatedMessage,
          updatedAt: new Date()
        });
      });

      console.log(`✅ Message emitted to room ${chatRoomId}`);
    }

    res.status(201).json({
      success: true,
      message: populatedMessage
    });

  } catch (error) {
    console.error("❌ Error sending message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message"
    });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    // Check if user is the sender or has admin rights
    const chatRoom = await ChatRoom.findOne({
      _id: message.chatRoom,
      "participants.user": userId,
      isActive: true
    });

    if (!chatRoom) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const userParticipant = chatRoom.participants.find(
      p => p.user.toString() === userId
    );

    if (message.sender.toString() !== userId && 
        !["admin", "owner"].includes(userParticipant.role)) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete this message"
      });
    }

    message.deleted = true;
    message.deletedAt = new Date();
    message.content = "This message was deleted";
    await message.save();

    res.json({
      success: true,
      message: "Message deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message"
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    // Check if already read
    const alreadyRead = message.readBy.some(
      read => read.user.toString() === userId
    );

    if (!alreadyRead) {
      message.readBy.push({
        user: userId,
        readAt: new Date()
      });
      await message.save();
    }

    res.json({
      success: true,
      message: "Message marked as read"
    });
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark message as read"
    });
  }
};