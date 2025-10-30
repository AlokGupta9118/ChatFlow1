// controllers/mediaController.js
import Message from "../models/Message.js";
import ChatRoom from "../models/ChatRoom.js";
import { uploadToCloudinary } from "../utils/Cloudinary.js";

export const uploadMedia = async (req, res) => {
  try {
    console.log("📤 Media upload started...");
    console.log("🔍 Request body:", req.body);
    console.log("🔍 Request file:", req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : "No file");
    console.log("🔍 User:", req.user ? {
      id: req.user.id,
      name: req.user.name
    } : "No user");

    const { chatRoomId, type = "file" } = req.body;
    const userId = req.user.id;
    const file = req.file;

    // Validate required fields
    if (!file) {
      console.log("❌ No file provided");
      return res.status(400).json({
        success: false,
        message: "No file provided"
      });
    }

    if (!chatRoomId) {
      console.log("❌ No chatRoomId provided");
      return res.status(400).json({
        success: false,
        message: "Chat room ID is required"
      });
    }

    console.log("🔍 Validating chat room access...");
    
    // Verify user has access to this chat room
    const chatRoom = await ChatRoom.findOne({
      _id: chatRoomId,
      "participants.user": userId,
      isActive: true
    }).populate("participants.user", "name profilePicture status");

    console.log("🔍 Chat room found:", !!chatRoom);
    
    if (!chatRoom) {
      console.log("❌ Chat room not found or access denied");
      return res.status(403).json({
        success: false,
        message: "Access denied or chat room not found"
      });
    }

    console.log("📤 Uploading to Cloudinary...");
    
    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(file, type);
    
    console.log("🔍 Cloudinary result:", uploadResult);
    
    if (!uploadResult.success) {
      console.log("❌ Cloudinary upload failed:", uploadResult.error);
      return res.status(500).json({
        success: false,
        message: "Failed to upload file to storage: " + (uploadResult.error || "Unknown error")
      });
    }

    console.log("💾 Creating message in database...");
    
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

    // Populate message for response
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

    console.log("✅ Media upload completed successfully");
    
    res.status(201).json({
      success: true,
      message: populatedMessage
    });

  } catch (error) {
    console.error("❌ Error in uploadMedia:", error);
    console.error("❌ Error stack:", error.stack);
    
    res.status(500).json({
      success: false,
      message: "Failed to upload media",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};