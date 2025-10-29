// routes/statusRoutes.js
import express from "express";
import { 
  updateUserStatus,
  getMyStatus,
  getUsersStatuses,
  getOnlineFriends,
  setUserAway,
  setUserBusy,
  getUserStatus,
  bulkUpdateStatuses,
  autoSetOfflineForInactive
} from "../controllers/statusController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected routes
router.put("/status", protect, updateUserStatus);
router.get("/status/me", protect, getMyStatus);
router.post("/statuses", protect, getUsersStatuses);
router.get("/friends/online", protect, getOnlineFriends);
router.put("/status/away", protect, setUserAway);
router.put("/status/busy", protect, setUserBusy);
router.get("/status/:userId", protect, getUserStatus);

// Admin routes
router.post("/status/bulk-update", protect, bulkUpdateStatuses);
router.post("/status/auto-offline", protect, autoSetOfflineForInactive);

export default router;