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
    status: { type: String, enum: ["online", "offline", "away", "busy"], default: "offline" },
    lastSeen: { type: Date, default: Date.now },
    theme: { type: String, enum: ["light", "dark", "system"], default: "system" },

    // Social / Friends
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
    incomingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    outgoingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Stories / Status Updates
    stories: [
      {
        mediaUrl: String,
        caption: String,
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date },
        viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      },
    ],

    // Privacy & Settings
    isTwoFactorEnabled: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    allowFriendRequests: { type: Boolean, default: true },
    allowStoryView: { type: Boolean, default: true },

    // Activity & Analytics
    lastLogin: { type: Date },
    deviceTokens: [{ type: String }], // For push notifications
    loginHistory: [
      {
        ip: String,
        device: String,
        time: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
