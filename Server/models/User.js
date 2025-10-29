// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // Profile
    bio: { type: String, default: "" },
    profilePicture: { type: String, default: "" },
    coverPhoto: { type: String, default: "" },
    status: { 
      type: String, 
      enum: ["online", "offline", "away", "busy"], 
      default: "offline" 
    },
    lastSeen: { type: Date, default: Date.now },
    theme: { type: String, enum: ["light", "dark", "system"], default: "system" },

    // Social / Friends
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    incomingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    outgoingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Status
    isActive: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now },
    socketId: { type: String, default: null },

    // Privacy & Settings
    isTwoFactorEnabled: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    allowFriendRequests: { type: Boolean, default: true },

    // Notifications
    deviceTokens: [{ type: String }],
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ status: 1 });
userSchema.index({ isActive: 1 });

export default mongoose.model("User", userSchema);