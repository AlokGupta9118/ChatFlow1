// controllers/messageController.js
import Message from "../models/Message.js";
import ChatRoom from "../models/ChatRoom.js";

export const sendMessage = async (req, res) => {
  try {
    const { chatRoomId, content, replyTo, type, mediaUrl } = req.body;
    const userId = req.user.id;

    // Verify user has access to chat room
    const chatRoom = await ChatRoom.findOne({
      _id: chatRoomId,
      "participants.user": userId,
      isActive: true
    });

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found"
      });
    }

    const message = new Message({
      chatRoom: chatRoomId,
      sender: userId,
      content,
      type: type || "text",
      mediaUrl,
      replyTo,
      status: "sent"
    });

    await message.save();
    await message.populate([
      { path: "sender", select: "name profilePicture status" },
      { path: "replyTo", populate: { path: "sender", select: "name" } }
    ]);

    // Update last message
    await ChatRoom.findByIdAndUpdate(chatRoomId, {
      lastMessage: message._id,
      updatedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    console.error("Error sending message:", error);
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