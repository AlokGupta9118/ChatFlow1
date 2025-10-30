import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    mediaUrl: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ["image", "video"],
      required: true
    },
    caption: {
      type: String,
      default: ""
    },
    location: {
      type: String,
      default: ""
    },
    duration: {
      type: Number,
      default: 5000 // milliseconds
    },
    viewers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      viewedAt: {
        type: Date,
        default: Date.now
      }
    }],
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      likedAt: {
        type: Date,
        default: Date.now
      }
    }],
    comments: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      text: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    privacy: {
      type: String,
      enum: ["public", "friends", "custom", "private"],
      default: "friends"
    },
    hideFrom: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Index for expiration
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for user stories
storySchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Story", storySchema);