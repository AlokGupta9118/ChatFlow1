import Story from "../models/Story.js";
import User from "../models/User.js";
import { uploadToCloudinary } from "../utils/Cloudinary.js";

// Upload story
export const uploadStory = async (req, res) => {
  try {
    const { caption, location, privacy = "friends", hideFrom = [] } = req.body;
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "File is required"
      });
    }

    // Validate file type and size
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum size is 50MB"
      });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "File type not supported"
      });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(file, file.mimetype.startsWith('video/') ? 'video' : 'image');
    
    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload file"
      });
    }

    // Create story
    const story = new Story({
      user: userId,
      mediaUrl: uploadResult.url,
      type: file.mimetype.startsWith('video/') ? 'video' : 'image',
      caption: caption || "",
      location: location || "",
      duration: file.mimetype.startsWith('video/') ? 15000 : 5000, // 15s for video, 5s for image
      privacy,
      hideFrom: Array.isArray(hideFrom) ? hideFrom : [],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    await story.save();

    // Populate user data
    await story.populate('user', 'name profilePicture status');

    res.status(201).json({
      success: true,
      message: "Story uploaded successfully",
      story
    });

  } catch (error) {
    console.error("Error uploading story:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload story"
    });
  }
};

// Get user's stories
export const getMyStories = async (req, res) => {
  try {
    const userId = req.user.id;

    const stories = await Story.find({ 
      user: userId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
    .populate('user', 'name profilePicture status')
    .populate('viewers.user', 'name profilePicture')
    .populate('likes.user', 'name profilePicture')
    .populate('comments.user', 'name profilePicture')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      stories
    });

  } catch (error) {
    console.error("Error fetching user stories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stories"
    });
  }
};

// Get friends' stories (using your existing friends field)
export const getFriendsStories = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user with friends populated
    const user = await User.findById(userId).populate('friends', '_id');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const friendIds = user.friends.map(friend => friend._id);
    friendIds.push(userId); // Include own stories

    // Get user's story settings
    const currentUser = await User.findById(userId).select('storySettings');
    const userHiddenUsers = currentUser.storySettings?.hideStoryFrom || [];

    // Get active stories from friends and self
    const stories = await Story.find({
      user: { $in: friendIds },
      isActive: true,
      expiresAt: { $gt: new Date() },
      hideFrom: { $nin: [userId] }, // Don't show stories where user is hidden
      user: { $nin: userHiddenUsers } // Don't show stories from users hidden by current user
    })
    .populate('user', 'name profilePicture status')
    .populate('viewers.user', 'name profilePicture')
    .populate('likes.user', 'name profilePicture')
    .populate('comments.user', 'name profilePicture')
    .sort({ createdAt: -1 });

    // Apply privacy filters
    const filteredStories = stories.filter(story => {
      // Public stories are always visible
      if (story.privacy === 'public') return true;
      
      // Friends stories are visible to friends
      if (story.privacy === 'friends' && friendIds.includes(story.user._id.toString())) {
        return true;
      }
      
      // Private stories only visible to owner
      if (story.privacy === 'private' && story.user._id.toString() === userId) {
        return true;
      }
      
      // Custom privacy handled by hideFrom array in query
      return false;
    });

    // Group stories by user
    const storiesByUser = {};
    filteredStories.forEach(story => {
      const userId = story.user._id.toString();
      if (!storiesByUser[userId]) {
        storiesByUser[userId] = {
          user: story.user,
          stories: [],
          isViewed: false
        };
      }
      storiesByUser[userId].stories.push(story);
      
      // Check if any story is unviewed by current user
      const hasUnviewed = story.viewers.some(viewer => 
        viewer.user._id.toString() === userId
      );
      if (!hasUnviewed) {
        storiesByUser[userId].isViewed = true;
      }
    });

    const friendsStories = Object.values(storiesByUser);
    const myStories = filteredStories.filter(story => story.user._id.toString() === userId);

    res.json({
      success: true,
      friendsStories,
      myStories
    });

  } catch (error) {
    console.error("Error fetching friends stories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch friends stories"
    });
  }
};

// Mark story as viewed
export const markStoryViewed = async (req, res) => {
  try {
    const { storyId } = req.body;
    const userId = req.user.id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found"
      });
    }

    // Check if user is blocked from viewing
    if (story.hideFrom.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: "Cannot view this story"
      });
    }

    // Check if already viewed
    const alreadyViewed = story.viewers.some(viewer => 
      viewer.user.toString() === userId
    );

    if (!alreadyViewed) {
      story.viewers.push({
        user: userId,
        viewedAt: new Date()
      });
      await story.save();
    }

    res.json({
      success: true,
      message: "Story marked as viewed"
    });

  } catch (error) {
    console.error("Error marking story viewed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark story as viewed"
    });
  }
};

// Like/unlike story
export const likeStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user.id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found"
      });
    }

    const alreadyLiked = story.likes.some(like => 
      like.user.toString() === userId
    );

    if (alreadyLiked) {
      // Unlike
      story.likes = story.likes.filter(like => 
        like.user.toString() !== userId
      );
    } else {
      // Like
      story.likes.push({
        user: userId,
        likedAt: new Date()
      });
    }

    await story.save();
    await story.populate('likes.user', 'name profilePicture');

    res.json({
      success: true,
      message: alreadyLiked ? "Story unliked" : "Story liked",
      likes: story.likes
    });

  } catch (error) {
    console.error("Error liking story:", error);
    res.status(500).json({
      success: false,
      message: "Failed to like story"
    });
  }
};

// Add comment to story
export const addComment = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required"
      });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found"
      });
    }

    // Check if user is allowed to comment based on story settings
    const storyOwner = await User.findById(story.user).select('storySettings');
    if (storyOwner.storySettings?.allowReplies === false) {
      return res.status(403).json({
        success: false,
        message: "Replies are disabled for this story"
      });
    }

    story.comments.push({
      user: userId,
      text: text.trim(),
      createdAt: new Date()
    });

    await story.save();
    await story.populate('comments.user', 'name profilePicture');

    const newComment = story.comments[story.comments.length - 1];

    res.status(201).json({
      success: true,
      message: "Comment added",
      comment: newComment
    });

  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add comment"
    });
  }
};

// Delete story
export const deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user.id;

    const story = await Story.findOne({
      _id: storyId,
      user: userId
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found"
      });
    }

    story.isActive = false;
    await story.save();

    res.json({
      success: true,
      message: "Story deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting story:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete story"
    });
  }
};

// Update story privacy
export const updateStoryPrivacy = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { privacy, hideFrom } = req.body;
    const userId = req.user.id;

    const story = await Story.findOne({
      _id: storyId,
      user: userId
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found"
      });
    }

    if (privacy) story.privacy = privacy;
    if (hideFrom) story.hideFrom = hideFrom;

    await story.save();

    res.json({
      success: true,
      message: "Story privacy updated",
      story
    });

  } catch (error) {
    console.error("Error updating story privacy:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update story privacy"
    });
  }
};

// Get story viewers
export const getStoryViewers = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user.id;

    const story = await Story.findOne({
      _id: storyId,
      user: userId
    }).populate('viewers.user', 'name profilePicture status');

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found"
      });
    }

    res.json({
      success: true,
      viewers: story.viewers
    });

  } catch (error) {
    console.error("Error fetching story viewers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch story viewers"
    });
  }
};

// Update user story settings
export const updateStorySettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { allowReplies, saveToGallery, hideStoryFrom } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Initialize storySettings if not exists
    if (!user.storySettings) {
      user.storySettings = {};
    }

    if (typeof allowReplies === 'boolean') {
      user.storySettings.allowReplies = allowReplies;
    }
    
    if (typeof saveToGallery === 'boolean') {
      user.storySettings.saveToGallery = saveToGallery;
    }
    
    if (Array.isArray(hideStoryFrom)) {
      user.storySettings.hideStoryFrom = hideStoryFrom;
    }

    await user.save();

    res.json({
      success: true,
      message: "Story settings updated",
      storySettings: user.storySettings
    });

  } catch (error) {
    console.error("Error updating story settings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update story settings"
    });
  }
};