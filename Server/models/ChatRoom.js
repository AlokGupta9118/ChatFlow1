import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: null, // only required for group chats
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    type: {
      type: String,
      enum: ["direct", "group"], // direct = 1v1 chat, group = group chat
      required: true,
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
      },
    ],
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
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
      { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    ],
    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reactions: [
      {
        messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: String,
      },
    ],
    readReceipts: [
      {
        messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
    typingUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);

export default ChatRoom;
