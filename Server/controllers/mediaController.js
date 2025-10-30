// controllers/mediaController.js
import Message from "../models/Message.js";
import ChatRoom from "../models/ChatRoom.js";
import { uploadToCloudinary } from "../utils/cloudinary.js"; // You'll need to set this up

export const uploadMedia = async (req, res) => {
  try {
    const { chatRoomId, type } = req.body;
    const userId = req.user.id;
    const file = req.file;

    if (!file || !chatRoomId) {
      return res.status(400).json({
        success: false,
        message: "File and chat room ID are required"
      });
    }

    // Verify user has access to this chat room
    const chatRoom = await ChatRoom.findOne({
      _id: chatRoomId,
      "participants.user": userId,
      isActive: true
    });

    if (!chatRoom) {
      return res.status(403).json({
        success: false,
        message: "Access denied or chat room not found"
      });
    }

    // Upload to Cloudinary or your preferred storage
    const uploadResult = await uploadToCloudinary(file, type);
    
    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload file to storage"
      });
    }

    // Create message with media
    const message = new Message({
      chatRoom: chatRoomId,
      sender: userId,
      content: `Sent a ${type}`,
      type: type,
      mediaUrl: uploadResult.url,
      mediaType: file.mimetype,
      fileName: file.originalname,
      fileSize: file.size,
      status: "sent"
    });

    await message.save();

    // Populate message
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name profilePicture status")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name profilePicture"
        }
      });

    // Update chat room
    await ChatRoom.findByIdAndUpdate(chatRoomId, {
      lastMessage: message._id,
      updatedAt: new Date()
    });

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(chatRoomId).emit("new_message", populatedMessage);
      
      // Update chat lists for all participants
      chatRoom.participants.forEach(participant => {
        const participantId = participant.user._id?.toString() || participant.user?.toString();
        if (participantId) {
          io.to(participantId).emit("chat_updated", {
            chatRoomId,
            lastMessage: populatedMessage,
            updatedAt: new Date()
          });
        }
      });
    }

    res.status(201).json({
      success: true,
      message: populatedMessage
    });

  } catch (error) {
    console.error("❌ Error uploading media:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload media"
    });
  }
};