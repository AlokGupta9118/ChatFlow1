import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import UserModel from "../models/User.js";

// GET current user profile
 const getProfile = async (req, res) => {
  try {
    const userId = req.user._id; // assuming you have auth middleware
    const user = await UserModel.findById(userId)
      .select("-password")
      .populate("friends", "name profilePicture")
      .populate("incomingRequests outgoingRequests blockedUsers", "name");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE current user profile
 const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, bio, email, phone, location, birthday } = req.body;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { name, bio, email, phone, location, birthday },
      { new: true }
    ).select("-password");

    res.status(200).json({ user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};



// Upload a new status/story



export const uploadStory = async (req, res) => {
  try {
    const userId = req.user._id; // assuming you have auth middleware
    const file = req.file; // multer file

    if (!file) return res.status(400).json({ message: "No file uploaded" });

    // Optional caption from req.body
    const { caption, expiresInHours } = req.body;

    // Build media URL
    const mediaUrl = `/uploads/stories/${file.filename}`;

    // Optional expiration
    const expiresAt = expiresInHours
      ? new Date(Date.now() + parseInt(expiresInHours) * 60 * 60 * 1000)
      : null;

    const user = await UserModel.findById(userId);
    user.stories.push({ mediaUrl, caption, expiresAt });
    await user.save();

    res.json({ message: "Story uploaded!", story: user.stories[user.stories.length - 1] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to upload story" });
  }
};

// Get all stories of a user
export const getUserStories = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await UserModel.findById(userId).populate("stories.viewers", "name profilePicture");

    if (!user) return res.status(404).json({ message: "User not found" });

    // Filter expired stories
    const now = new Date();
    const activeStories = user.stories.filter(
      (s) => !s.expiresAt || s.expiresAt > now
    );

    res.json({ stories: activeStories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch stories" });
  }
};

// Mark a story as viewed
export const viewStory = async (req, res) => {
  try {
    const userId = req.user._id; // viewer
    const { storyId } = req.params;

    const user = await UserModel.findOne({ "stories._id": storyId });
    if (!user) return res.status(404).json({ message: "Story not found" });

    const story = user.stories.id(storyId);
    if (!story.viewers.includes(userId)) {
      story.viewers.push(userId);
      await user.save();
    }

    res.json({ message: "Story viewed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to mark story as viewed" });
  }
};


// Mark a status/story as viewed
export const markStoryViewed = async (req, res) => {
  try {
    const userId = req.user._id;
    const { storyId, ownerId } = req.body;

    const owner = await UserModel.findById(ownerId);
    if (!owner) return res.status(404).json({ message: "Owner not found" });

    const story = owner.stories.id(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });

    if (!story.viewers.includes(userId)) {
      story.viewers.push(userId);
      await owner.save();
    }

    res.status(200).json({ success: true, story });
  } catch (err) {
    console.error("Mark story viewed error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// ================== UPDATE PROFILE IMAGE ==================


// ================== REGISTER ==================
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email & password required" });

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({ name, email: normalizedEmail, password: hashedPassword });

    await newUser.save();
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: { id: newUser._id, name: newUser.name, email: newUser.email, token },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ================== LOGIN ==================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email & password required" });

    const user = await UserModel.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    user.lastLogin = new Date();
    user.status = "online";
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: { id: user._id, name: user.name, email: user.email, userType: user.userType, token }
      
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ================== SEND FRIEND REQUEST ==================
 const sendFriendRequest = async (req, res) => {
  try {
    const recipientId = req.params.id;
    const requesterId = req.user._id;

    if (recipientId === requesterId.toString())
      return res.status(400).json({ message: "You cannot add yourself" });

    const recipient = await UserModel.findById(recipientId);
    const requester = await UserModel.findById(requesterId);

    if (!recipient || !requester)
      return res.status(404).json({ message: "User not found" });

    if (recipient.friends.includes(requesterId))
      return res.status(400).json({ message: "Already friends" });

    if (recipient.incomingRequests.includes(requesterId))
      return res.status(400).json({ message: "Request already sent" });

    recipient.incomingRequests.push(requesterId);
    requester.outgoingRequests.push(recipientId);

    await recipient.save();
    await requester.save();

    const updatedFriends = await UserModel.findById(requesterId)
      .populate("friends", "name email profilePicture")
      .populate("incomingRequests", "name email profilePicture")
      .populate("outgoingRequests", "name email profilePicture");

    res.status(200).json({
      message: "Friend request sent",
      friends: updatedFriends,
    });
  } catch (err) {
    console.error("Error sending request:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================== ACCEPT FRIEND REQUEST ==================
 const acceptFriendRequest = async (req, res) => {
  try {
    const requesterId = req.params.id;
    const recipientId = req.user._id;

    const recipient = await UserModel.findById(recipientId);
    const requester = await UserModel.findById(requesterId);

    if (!recipient || !requester)
      return res.status(404).json({ message: "User not found" });

    if (!recipient.incomingRequests.includes(requesterId))
      return res.status(400).json({ message: "No such friend request" });

    recipient.incomingRequests = recipient.incomingRequests.filter(
      (id) => id.toString() !== requesterId.toString()
    );
    requester.outgoingRequests = requester.outgoingRequests.filter(
      (id) => id.toString() !== recipientId.toString()
    );

    recipient.friends.push(requesterId);
    requester.friends.push(recipientId);

    await recipient.save();
    await requester.save();

    const updatedFriends = await UserModel.findById(recipientId)
      .populate("friends", "name email profilePicture")
      .populate("incomingRequests", "name email profilePicture")
      .populate("outgoingRequests", "name email profilePicture");

    res.status(200).json({
      message: "Friend request accepted",
      friends: updatedFriends,
    });
  } catch (err) {
    console.error("Error accepting request:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================== DECLINE FRIEND REQUEST ==================
 const declineFriendRequest = async (req, res) => {
  try {
    const requesterId = req.params.id;
    const recipientId = req.user._id;

    const recipient = await UserModel.findById(recipientId);
    const requester = await UserModel.findById(requesterId);

    if (!recipient || !requester)
      return res.status(404).json({ message: "User not found" });

    recipient.incomingRequests = recipient.incomingRequests.filter(
      (id) => id.toString() !== requesterId.toString()
    );
    requester.outgoingRequests = requester.outgoingRequests.filter(
      (id) => id.toString() !== recipientId.toString()
    );

    await recipient.save();
    await requester.save();

    const updatedFriends = await UserModel.findById(recipientId)
      .populate("friends", "name email profilePicture")
      .populate("incomingRequests", "name email profilePicture")
      .populate("outgoingRequests", "name email profilePicture");

    res.status(200).json({
      message: "Friend request declined",
      friends: updatedFriends,
    });
  } catch (err) {
    console.error("Error declining request:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================== GET FRIENDS ==================
// ================== GET FRIENDS ==================
const getFriends = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized. Invalid token." });
    }

    const user = await UserModel.findById(req.user._id)
      .populate("friends", "name email profilePicture status")
      .populate("incomingRequests", "name email profilePicture status")
      .populate("outgoingRequests", "name email profilePicture status");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      friends: user.friends || [],
      incomingRequests: user.incomingRequests || [],
      outgoingRequests: user.outgoingRequests || [],
    });
  } catch (err) {
    console.error("Error fetching friends:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ================== GET ALL USERS ==================
// controllers/User.js
 // controllers/User.js
 const getUser = async (req, res) => {
   try {
    const currentUserId = req.user._id;

    
     const allUsers  = await UserModel.find({ _id: { $ne: currentUserId } }).select("-password");
     if (!allUsers || allUsers.length === 0) {
       return res.status(404).json({ success: false, message: "No users found" });
     }
     res.status(200).json({ success: true, users: allUsers });
   } catch (err) {
     console.error("GetUser error:", err);
     res.status(500).json({ success: false, message: "Internal Server Error" });
   }
 };
 



// ================== UPDATE USER ==================
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedUser = await UserModel.findByIdAndUpdate(id, req.body, { new: true }).select("-password");
    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json({ success: true, user: updatedUser });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ================== DELETE USER ==================
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await UserModel.findByIdAndDelete(id);
    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ================== PROFILE ==================


// ================== EXPORTS ==================
export {
  registerUser,
  loginUser,
  getUser,
  updateUser,
  deleteUser,
  getProfile,
  updateProfile,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriends,
};
