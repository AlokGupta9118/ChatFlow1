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


router.get("/profile", getProfile);
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
