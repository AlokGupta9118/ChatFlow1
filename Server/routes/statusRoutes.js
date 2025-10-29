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
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Protected routes
router.put("/status", auth, updateUserStatus);
router.get("/status/me", auth, getMyStatus);
router.post("/statuses", auth, getUsersStatuses);
router.get("/friends/online", auth, getOnlineFriends);
router.put("/status/away", auth, setUserAway);
router.put("/status/busy", auth, setUserBusy);
router.get("/status/:userId", auth, getUserStatus);

// Admin routes
router.post("/status/bulk-update", auth, bulkUpdateStatuses);
router.post("/status/auto-offline", auth, autoSetOfflineForInactive);

export default router;