// controllers/chatController.js
import ChatRoom from "../models/ChatRoom.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

// ✅ Get messages for private chat
export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    // Find messages between current user and the other user
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: chatId },
        { sender: chatId, receiver: userId }
      ]
    })
    .populate('sender', 'name profilePicture')
    .populate('receiver', 'name profilePicture')
    .sort({ createdAt: 1 });

    res.status(200).json({ messages });
  } catch (error) {
    console.error("Error fetching private messages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get messages for group chat
export const getGroupMessages = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const userId = req.user._id;

    // Check if user is member of the group
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "Chat room not found" });
    }

    const isMember = chatRoom.members.some(member => 
      member.user.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const messages = await Message.find({ chatRoom: chatRoomId })
      .populate('sender', 'name profilePicture')
      .sort({ createdAt: 1 });

    res.status(200).json({ messages });
  } catch (error) {
    console.error("Error fetching group messages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Send private message
export const sendMessage= async (req, res) => {
  try {
    const { receiverId, content, messageType = "text" } = req.body;
    const senderId = req.user._id;

    // Create new message
    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      content,
      messageType
    });

    await newMessage.save();

    // Populate sender info for real-time delivery
    await newMessage.populate('sender', 'name profilePicture');

    res.status(201).json({ 
      message: newMessage,
      success: true 
    });
  } catch (error) {
    console.error("Error sending private message:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Send group message
export const sendGroupMessage = async (req, res) => {
  try {
    const { chatRoomId, content, messageType = "text" } = req.body;
    const senderId = req.user._id;

    // Check if user is member of the group
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "Chat room not found" });
    }

    const isMember = chatRoom.members.some(member => 
      member.user.toString() === senderId.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    // Create new message
    const newMessage = new Message({
      sender: senderId,
      chatRoom: chatRoomId,
      content,
      messageType
    });

    await newMessage.save();

    // Populate sender info for real-time delivery
    await newMessage.populate('sender', 'name profilePicture');

    res.status(201).json({ 
      message: newMessage,
      success: true 
    });
  } catch (error) {
    console.error("Error sending group message:", error);
    res.status(500).json({ message: "Server error" });
  }
};