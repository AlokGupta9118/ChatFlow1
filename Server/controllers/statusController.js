// controllers/statusController.js
import UserModel from "../models/User.js";
import mongoose from "mongoose";

// ✅ Update user status
export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user._id;

    // Validate status
    const validStatuses = ["online", "offline", "away", "busy"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status",
        validStatuses: validStatuses
      });
    }

    const updateData = {
      status,
      lastSeen: new Date()
    };

    // If user is going online, update lastLogin
    if (status === "online") {
      updateData.lastLogin = new Date();
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("name email status lastSeen lastLogin profilePicture");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Emit socket event for real-time status update
    if (req.app.get("io")) {
      req.app.get("io").emit("user-status-change", {
        userId: user._id,
        status: user.status,
        lastSeen: user.lastSeen,
        name: user.name,
        profilePicture: user.profilePicture
      });
    }

    res.json({
      message: `Status updated to ${status}`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        lastSeen: user.lastSeen,
        lastLogin: user.lastLogin,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Get current user status
export const getMyStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await UserModel.findById(userId)
      .select("name email status lastSeen lastLogin profilePicture");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        lastSeen: user.lastSeen,
        lastLogin: user.lastLogin,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error("Error fetching user status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Get statuses for multiple users (for friends list)
export const getUsersStatuses = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ 
        error: "User IDs array is required" 
      });
    }

    // Validate ObjectIds
    const validUserIds = userIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    
    if (validUserIds.length === 0) {
      return res.json({ statuses: {} });
    }

    const users = await UserModel.find(
      { _id: { $in: validUserIds } },
      { _id: 1, name: 1, status: 1, lastSeen: 1, profilePicture: 1 }
    );

    const statuses = {};
    users.forEach(user => {
      statuses[user._id] = {
        status: user.status || "offline",
        lastSeen: user.lastSeen,
        name: user.name,
        profilePicture: user.profilePicture
      };
    });

    // Fill in missing users as offline
    validUserIds.forEach(userId => {
      if (!statuses[userId]) {
        statuses[userId] = {
          status: "offline",
          lastSeen: new Date(),
          name: "Unknown User",
          profilePicture: ""
        };
      }
    });

    res.json({ statuses });

  } catch (error) {
    console.error("Error fetching users statuses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Get online friends
export const getOnlineFriends = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await UserModel.findById(userId)
      .populate("friends", "name status lastSeen profilePicture")
      .select("friends");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const onlineFriends = user.friends.filter(friend => 
      friend.status === "online"
    );

    const awayFriends = user.friends.filter(friend => 
      friend.status === "away"
    );

    const busyFriends = user.friends.filter(friend => 
      friend.status === "busy"
    );

    const offlineFriends = user.friends.filter(friend => 
      friend.status === "offline"
    );

    res.json({
      online: onlineFriends,
      away: awayFriends,
      busy: busyFriends,
      offline: offlineFriends,
      total: user.friends.length,
      onlineCount: onlineFriends.length
    });

  } catch (error) {
    console.error("Error fetching online friends:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Set user as away (auto-trigger after inactivity)
export const setUserAway = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        status: "away",
        lastSeen: new Date()
      },
      { new: true }
    ).select("name email status lastSeen profilePicture");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Emit socket event
    if (req.app.get("io")) {
      req.app.get("io").emit("user-status-change", {
        userId: user._id,
        status: user.status,
        lastSeen: user.lastSeen,
        name: user.name,
        profilePicture: user.profilePicture
      });
    }

    res.json({
      message: "Status set to away",
      user: {
        _id: user._id,
        name: user.name,
        status: user.status,
        lastSeen: user.lastSeen,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error("Error setting user as away:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Set user as busy
export const setUserBusy = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        status: "busy",
        lastSeen: new Date()
      },
      { new: true }
    ).select("name email status lastSeen profilePicture");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Emit socket event
    if (req.app.get("io")) {
      req.app.get("io").emit("user-status-change", {
        userId: user._id,
        status: user.status,
        lastSeen: user.lastSeen,
        name: user.name,
        profilePicture: user.profilePicture
      });
    }

    res.json({
      message: "Status set to busy",
      user: {
        _id: user._id,
        name: user.name,
        status: user.status,
        lastSeen: user.lastSeen,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error("Error setting user as busy:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Get user status by ID (for profile viewing)
export const getUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await UserModel.findById(userId)
      .select("name status lastSeen profilePicture isPrivate");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If user profile is private, return limited information
    if (user.isPrivate && req.user._id.toString() !== userId) {
      return res.json({
        user: {
          _id: user._id,
          name: user.name,
          profilePicture: user.profilePicture,
          isPrivate: true
        }
      });
    }

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        status: user.status,
        lastSeen: user.lastSeen,
        profilePicture: user.profilePicture,
        isPrivate: user.isPrivate
      }
    });

  } catch (error) {
    console.error("Error fetching user status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Bulk status update for multiple users (admin feature)
export const bulkUpdateStatuses = async (req, res) => {
  try {
    const { updates } = req.body; // [{ userId, status }, ...]

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: "Updates must be an array" });
    }

    const validStatuses = ["online", "offline", "away", "busy"];
    const results = [];
    const io = req.app.get("io");

    for (const update of updates) {
      const { userId, status } = update;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        results.push({ userId, status: "error", error: "Invalid user ID" });
        continue;
      }

      if (!validStatuses.includes(status)) {
        results.push({ userId, status: "error", error: "Invalid status" });
        continue;
      }

      try {
        const user = await UserModel.findByIdAndUpdate(
          userId,
          {
            status,
            lastSeen: new Date()
          },
          { new: true }
        ).select("name status lastSeen profilePicture");

        if (user) {
          results.push({ 
            userId, 
            status: "success", 
            user: {
              _id: user._id,
              name: user.name,
              status: user.status,
              lastSeen: user.lastSeen
            }
          });

          // Emit socket event for each user
          if (io) {
            io.emit("user-status-change", {
              userId: user._id,
              status: user.status,
              lastSeen: user.lastSeen,
              name: user.name,
              profilePicture: user.profilePicture
            });
          }
        } else {
          results.push({ userId, status: "error", error: "User not found" });
        }
      } catch (error) {
        results.push({ userId, status: "error", error: error.message });
      }
    }

    res.json({ results });

  } catch (error) {
    console.error("Error in bulk status update:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Auto-set offline for inactive users (cron job)
export const autoSetOfflineForInactive = async (req, res) => {
  try {
    // Find users who were last seen more than 5 minutes ago but are still online/away/busy
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const inactiveUsers = await UserModel.find({
      status: { $in: ["online", "away", "busy"] },
      lastSeen: { $lt: fiveMinutesAgo }
    });

    const updateResult = await UserModel.updateMany(
      {
        status: { $in: ["online", "away", "busy"] },
        lastSeen: { $lt: fiveMinutesAgo }
      },
      {
        status: "offline",
        lastSeen: new Date()
      }
    );

    // Emit socket events for updated users
    const io = req.app.get("io");
    if (io && inactiveUsers.length > 0) {
      inactiveUsers.forEach(user => {
        io.emit("user-status-change", {
          userId: user._id,
          status: "offline",
          lastSeen: new Date(),
          name: user.name,
          profilePicture: user.profilePicture
        });
      });
    }

    res.json({
      message: `Set ${updateResult.modifiedCount} inactive users to offline`,
      updatedCount: updateResult.modifiedCount
    });

  } catch (error) {
    console.error("Error setting inactive users offline:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};