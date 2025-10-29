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
import { Protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected routes
router.put("/status", Protect, updateUserStatus);
router.get("/status/me", Protect, getMyStatus);
router.post("/statuses", Protect, getUsersStatuses);
router.get("/friends/online", Protect, getOnlineFriends);
router.put("/status/away", Protect, setUserAway);
router.put("/status/busy", Protect, setUserBusy);
router.get("/status/:userId", Protect, getUserStatus);

// Admin routes
router.post("/status/bulk-update", Protect, bulkUpdateStatuses);
router.post("/status/auto-offline", Protect, autoSetOfflineForInactive);

export default router;