// controllers/messageController.js
import Message from "../models/Message.js";
import ChatRoom from "../models/ChatRoom.js";

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