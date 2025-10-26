import mongoose from "mongoose";

const groupJoinRequestSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// ✅ Ensure that a user cannot have multiple requests for the same group
groupJoinRequestSchema.index({ group: 1, user: 1 }, { unique: true });

const GroupJoinRequest = mongoose.model("GroupJoinRequest", groupJoinRequestSchema);

export default GroupJoinRequest;
