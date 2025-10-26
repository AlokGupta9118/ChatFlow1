import mongoose from "mongoose";
import ChatRoom from "../models/ChatRoom.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id; // correct _id usage
    const { receiverId, content, messageType } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ message: "Receiver and content required" });
    }

    const receiverObjId = mongoose.Types.ObjectId(receiverId);

    // Check friend exists
    const friend = await User.findById(receiverObjId);
    if (!friend) return res.status(404).json({ message: "Friend not found" });

    // Find existing direct chat room
    let chatRoom = await ChatRoom.findOne({
      type: "direct",
      "participants.user": { $all: [senderId, receiverObjId] },
    });

    // If no room, create one
    if (!chatRoom) {
      chatRoom = new ChatRoom({
        type: "direct",
        createdBy: senderId,
        participants: [
          { user: senderId, role: "owner" },
          { user: receiverObjId, role: "member" },
        ],
      });
      await chatRoom.save();
    }

    // Create message
    const newMessage = new Message({
      chatRoom: chatRoom._id,
      sender: senderId,
      type: messageType || "text",
      content,
    });
    await newMessage.save();

    // Update chatRoom
    chatRoom.messages.push(newMessage._id);
    chatRoom.lastMessage = newMessage._id;
    await chatRoom.save();

    // Populate message
    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "name profilePicture")
      .lean();

    // Emit via socket if io exists
    if (req.io) {
      req.io.to(receiverId.toString()).emit("receive_message", {
        ...populatedMessage,
        senderId: senderId.toString(),
        receiverId: receiverId.toString(),
      });
    }

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    console.error("SendMessage ERROR:", error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
};

/**
 * Get messages for a chat room (direct chat)
 */
export const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const friendId = req.params.friendId;

    if (!friendId) return res.status(400).json({ message: "Friend ID required" });

    // ✅ Find the direct chat room
    const chatRoom = await ChatRoom.findOne({
      type: "direct",
      "participants.user": { $all: [currentUserId, friendId] },
      $expr: { $eq: [{ $size: "$participants" }, 2] },
    })
      .populate({
        path: "messages",
        populate: { path: "sender", select: "name profilePicture" },
        options: { sort: { createdAt: 1 } }, // oldest first
      })
      .populate("participants.user", "name profilePicture status");

    if (!chatRoom) {
      return res.status(404).json({ message: "No chat room found" });
    }

    res.json({ 
      roomId: chatRoom._id,
      messages: chatRoom.messages,
      participants: chatRoom.participants,
    });
  } catch (error) {
    console.error("Error in getMessages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

