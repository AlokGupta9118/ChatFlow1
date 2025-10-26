import express from "express";
import {
  getUser,
  updateUser,
  loginUser,
  deleteUser,
  registerUser,
  getProfile,
  getFriends,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  updateProfile,
  uploadStory,
  getUserStories,
  viewStory,
  markStoryViewed,
} from "../controllers/userController.js";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

/* ===========================
   STATUS & STORY SYSTEM
=========================== */

router.post("/stories/upload", protect, upload.single("file"), uploadStory);
router.get("/stories/:userId", protect, getUserStories);
router.post("/stories/view/:storyId", protect, viewStory);

router.post("/status/viewed", protect, markStoryViewed);

/* ===========================
   USER AUTHENTICATION
=========================== */
router.post("/login", loginUser);
router.post("/register", registerUser);

/* ===========================
   PROFILE MANAGEMENT
=========================== */
router.delete("/:id", protect, deleteUser);
router.post("/profile-image", protect, upload.single("image"), updateProfile);


router.get("/profile", protect, getProfile);
router.put("/profile",protect, updateProfile);


/* ===========================
   FRIEND SYSTEM (FIXED URLs)
=========================== */
router.get("/friends", protect, getFriends);
router.post("/friends/request/:id", protect, sendFriendRequest);
router.put("/friends/accept/:id", protect, acceptFriendRequest);
router.put("/friends/decline/:id", protect, declineFriendRequest);

/* ===========================
   USER LIST (for suggestions)
=========================== */
router.get("/users", protect, getUser);


// Get user profile by ID
router.get('/profile/:userId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -refreshTokens -__v')
      .populate('friends', 'name profilePicture status')
      .populate('stories', 'mediaUrl createdAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the requesting user is blocked by the target user
    if (user.blockedUsers.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are blocked from viewing this profile' });
    }

    res.json({
      message: 'Profile fetched successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio,
        phone: user.phone,
        location: user.location,
        birthday: user.birthday,
        status: user.status,
        lastSeen: user.lastSeen,
        friends: user.friends,
        stories: user.stories,
        isOnline: user.status === 'online',
        joinedAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get multiple users profiles (for group members)
router.post('/profiles', protect, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }

    const users = await User.find({ _id: { $in: userIds } })
      .select('name profilePicture status lastSeen bio email')
      .where('blockedUsers').ne(req.user._id);

    res.json({
      message: 'Profiles fetched successfully',
      users
    });
  } catch (error) {
    console.error('Multiple profiles fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


export default router;
