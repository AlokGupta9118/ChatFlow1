// models/ChatRoom.js
import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    type: {
      type: String,
      enum: ["direct", "group"],
      required: true,
      index: true
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["member", "admin", "owner"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        isMuted: {
          type: Boolean,
          default: false,
        },
        lastSeen: {
          type: Date,
          default: Date.now,
        },
        nickname: {
          type: String,
          default: null,
        },
      },
    ],
    pendingParticipants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
        invitedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    settings: {
      isPrivate: { type: Boolean, default: false },
      allowReactions: { type: Boolean, default: true },
      allowMedia: { type: Boolean, default: true },
      allowLinks: { type: Boolean, default: true },
      allowVoice: { type: Boolean, default: true },
      allowGIFs: { type: Boolean, default: true },
      allowMessageEdit: { type: Boolean, default: true },
      allowMessageDelete: { type: Boolean, default: true },
      allowInvites: { type: Boolean, default: true },
    },
    avatar: {
      type: String,
      default: null,
    },
    theme: {
      type: String,
      enum: ["light", "dark", "system", "custom"],
      default: "system",
    },
    pinnedMessages: [
      { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Message" 
      }
    ],
    archivedBy: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    }],
    blockedUsers: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    }],
    typingUsers: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

chatRoomSchema.index({ "participants.user": 1 });
chatRoomSchema.index({ type: 1, "participants.user": 1 });
chatRoomSchema.index({ updatedAt: -1 });

export default mongoose.model("ChatRoom", chatRoomSchema);