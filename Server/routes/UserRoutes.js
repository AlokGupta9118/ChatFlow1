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


// friendsController.js



// Get user profile by ID - Public or Protected endpoint
router.get('profiles/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Check if user exists
    const user = await User.findById(userId)
      .select('-password -refreshTokens -__v -blockedUsers -incomingRequests -outgoingRequests')
      .populate('friends', 'name profilePicture status email bio phone location birthday lastSeen')
      .lean();

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Function to convert image URLs to absolute URLs (EXACTLY like other controllers)
    const getAbsoluteUrl = (path) => {
      if (!path) return null;
      if (path.startsWith('http')) {
        // Replace http with https for consistency
        return path.replace('http://', 'https://');
      }
      // For relative paths, use HTTPS
      return `https://${req.get('host')}${path}`;
    };

    // Process main user profile picture
    let profilePicture = getAbsoluteUrl(user.profilePicture);
    let coverPhoto = getAbsoluteUrl(user.coverPhoto);

    // Process friends with absolute URLs
    const processedFriends = (user.friends || []).map(friend => ({
      _id: friend._id,
      name: friend.name,
      email: friend.email,
      profilePicture: getAbsoluteUrl(friend.profilePicture),
      status: friend.status,
      bio: friend.bio || '',
      phone: friend.phone || '',
      location: friend.location || '',
      birthday: friend.birthday || '',
      lastSeen: friend.lastSeen,
      isOnline: friend.status === 'online'
    }));

    // Process stories with absolute URLs
    const processedStories = (user.stories || []).map(story => ({
      _id: story._id,
      mediaUrl: getAbsoluteUrl(story.mediaUrl),
      mediaType: story.mediaType,
      caption: story.caption,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt
    }));

    // Construct the response object
    const userProfile = {
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: profilePicture,
      coverPhoto: coverPhoto,
      bio: user.bio || '',
      phone: user.phone || '',
      location: user.location || '',
      birthday: user.birthday || '',
      status: user.status || 'offline',
      lastSeen: user.lastSeen || user.updatedAt,
      friends: processedFriends,
      stories: processedStories,
      isOnline: user.status === 'online',
      joinedAt: user.createdAt,
      // Additional stats
      friendsCount: processedFriends.length,
      storiesCount: processedStories.length
    };

    res.json({
      success: true,
      message: 'Profile fetched successfully',
      user: userProfile
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    
    // Handle specific errors
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid user ID format' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching profile',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message 
    });
  }
});

// Get friends, incoming and outgoing requests
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'name profilePicture status email bio phone location birthday lastSeen')
      .populate('incomingRequests', 'name profilePicture status email lastSeen')
      .populate('outgoingRequests', 'name profilePicture status email lastSeen');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Function to convert image URLs to absolute URLs (EXACTLY like profile controller)
    const getAbsoluteUrl = (path) => {
      if (!path) return null;
      if (path.startsWith('http')) {
        // Replace http with https
        return path.replace('http://', 'https://');
      }
      // For relative paths, use HTTPS
      return `https://${req.get('host')}${path}`;
    };

    // Process friends with absolute URLs
    const processedFriends = (user.friends || []).map(friend => ({
      _id: friend._id,
      name: friend.name,
      email: friend.email,
      profilePicture: getAbsoluteUrl(friend.profilePicture),
      status: friend.status,
      bio: friend.bio || '',
      phone: friend.phone || '',
      location: friend.location || '',
      birthday: friend.birthday || '',
      lastSeen: friend.lastSeen,
      isOnline: friend.status === 'online'
    }));

    // Process incoming requests
    const processedIncoming = (user.incomingRequests || []).map(reqUser => ({
      _id: reqUser._id,
      name: reqUser.name,
      email: reqUser.email,
      profilePicture: getAbsoluteUrl(reqUser.profilePicture),
      status: reqUser.status,
      lastSeen: reqUser.lastSeen,
      isOnline: reqUser.status === 'online'
    }));

    // Process outgoing requests
    const processedOutgoing = (user.outgoingRequests || []).map(reqUser => ({
      _id: reqUser._id,
      name: reqUser.name,
      email: reqUser.email,
      profilePicture: getAbsoluteUrl(reqUser.profilePicture),
      status: reqUser.status,
      lastSeen: reqUser.lastSeen,
      isOnline: reqUser.status === 'online'
    }));

    res.json({
      friends: processedFriends,
      incomingRequests: processedIncoming,
      outgoingRequests: processedOutgoing
    });

  } catch (error) {
    console.error('Friends fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users for discover section
router.get('/users', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const users = await User.find({ _id: { $ne: currentUserId } })
      .select('name profilePicture status email bio phone location birthday lastSeen')
      .lean();

    // Function to convert image URLs to absolute URLs
    const getAbsoluteUrl = (path) => {
      if (!path) return null;
      if (path.startsWith('http')) {
        return path.replace('http://', 'https://');
      }
      return `https://${req.get('host')}${path}`;
    };

    // Process users with absolute URLs
    const processedUsers = users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: getAbsoluteUrl(user.profilePicture),
      status: user.status,
      bio: user.bio || '',
      phone: user.phone || '',
      location: user.location || '',
      birthday: user.birthday || '',
      lastSeen: user.lastSeen,
      isOnline: user.status === 'online'
    }));

    res.json({ users: processedUsers });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});




/* ===========================
   USER LIST (for suggestions)
=========================== */



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
