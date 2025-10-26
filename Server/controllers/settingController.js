import User from "../models/User.js";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken"; // Needed for getUserIdFromReq

// Helper: Extract user ID from token
const getUserIdFromReq = (req) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch {
    return null;
  }
};

// GET PROFILE
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    // Ensure full URLs for profile and cover photos
    if (user.profilePicture && !user.profilePicture.startsWith("http")) {
      user.profilePicture = `${req.protocol}://${req.get("host")}${user.profilePicture}`;
    }
    if (user.coverPhoto && !user.coverPhoto.startsWith("http")) {
      user.coverPhoto = `${req.protocol}://${req.get("host")}${user.coverPhoto}`;
    }

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET USER SETTINGS
export const getUserSettings = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId).select(
      "name email bio profilePicture coverPhoto theme status isTwoFactorEnabled isPrivate allowFriendRequests allowStoryView"
    ).lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    // Ensure full URLs
    if (user.profilePicture && !user.profilePicture.startsWith("http")) {
      user.profilePicture = `${req.protocol}://${req.get("host")}${user.profilePicture}`;
    }
    if (user.coverPhoto && !user.coverPhoto.startsWith("http")) {
      user.coverPhoto = `${req.protocol}://${req.get("host")}${user.coverPhoto}`;
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("❌ getUserSettings error:", err);
    res.status(500).json({ message: "Failed to fetch user settings" });
  }
};

// UPDATE PROFILE
export const updateProfile = async (req, res) => {
  try {
    const { name, bio, email, phone, location, birthday } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = name || user.name;
    user.bio = bio || user.bio;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.location = location || user.location;
    user.birthday = birthday || user.birthday;

    await user.save();

    // Full URLs for response
    if (user.profilePicture && !user.profilePicture.startsWith("http")) {
      user.profilePicture = `${req.protocol}://${req.get("host")}${user.profilePicture}`;
    }
    if (user.coverPhoto && !user.coverPhoto.startsWith("http")) {
      user.coverPhoto = `${req.protocol}://${req.get("host")}${user.coverPhoto}`;
    }

    res.json({ message: "Profile updated", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPLOAD PROFILE PICTURE
export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.profilePicture && fs.existsSync(`.${user.profilePicture}`)) {
      fs.unlinkSync(`.${user.profilePicture}`);
    }

    user.profilePicture = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({ message: "Profile picture updated", url: `${req.protocol}://${req.get("host")}${user.profilePicture}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPLOAD COVER PHOTO
export const uploadCoverPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.coverPhoto && fs.existsSync(`.${user.coverPhoto}`)) {
      fs.unlinkSync(`.${user.coverPhoto}`);
    }

    user.coverPhoto = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({ message: "Cover photo updated", url: `${req.protocol}://${req.get("host")}${user.coverPhoto}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};



// ✅ 2. Update User Settings
export const updateUserSettings = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      name,
      bio,
      theme,
      status,
      isTwoFactorEnabled,
      isPrivate,
      allowFriendRequests,
      allowStoryView,
    } = req.body;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        name,
        bio,
        theme,
        status,
        isTwoFactorEnabled,
        isPrivate,
        allowFriendRequests,
        allowStoryView,
      },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      message: "Settings updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("❌ updateUserSettings error:", err);
    res.status(500).json({ message: "Failed to update user settings" });
  }
};

// ✅ 3. Upload Profile Picture



// ✅ 4. Upload Cover Photo


// ✅ 5. Get Login History / Devices
export const getUserDevices = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await UserModel.findById(userId).select("loginHistory deviceTokens");
    res.status(200).json(user);
  } catch (err) {
    console.error("❌ getUserDevices error:", err);
    res.status(500).json({ message: "Failed to fetch devices" });
  }
};

// ✅ 6. Logout from all devices
export const logoutAllDevices = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    await UserModel.findByIdAndUpdate(userId, { deviceTokens: [] });
    res.status(200).json({ message: "Logged out from all devices" });
  } catch (err) {
    console.error("❌ logoutAllDevices error:", err);
    res.status(500).json({ message: "Failed to logout all devices" });
  }
};

// ✅ 7. Delete Account (soft delete or permanent)
export const deleteUserAccount = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    await UserModel.findByIdAndDelete(userId);
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("❌ deleteUserAccount error:", err);
    res.status(500).json({ message: "Failed to delete account" });
  }
};
