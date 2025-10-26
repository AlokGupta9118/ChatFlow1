// models/Challenge.js
import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  numQuestions: { type: Number, default: 5 },
  status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Challenge", challengeSchema);
