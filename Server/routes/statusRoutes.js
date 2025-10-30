import express from "express";
import { 
  uploadStory,
  getMyStories,
  getFriendsStories,
  markStoryViewed,
  likeStory,
  addComment,
  deleteStory,
  updateStoryPrivacy,
  getStoryViewers,
  updateStorySettings
} from "../controllers/storyController.js";
import { protect } from "../middleware/authMiddleware.js";
import multer from "multer";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Protected routes
router.post("/upload", protect, upload.single('file'), uploadStory);
router.get("/my", protect, getMyStories);
router.get("/friends", protect, getFriendsStories);
router.post("/viewed", protect, markStoryViewed);
router.post("/:storyId/like", protect, likeStory);
router.post("/:storyId/comment", protect, addComment);
router.delete("/:storyId", protect, deleteStory);
router.put("/:storyId/privacy", protect, updateStoryPrivacy);
router.get("/:storyId/viewers", protect, getStoryViewers);
router.put("/settings/update", protect, updateStorySettings);

export default router;