// routes/challengeRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  sendInvite,
  acceptInvite,
  getMyInvites,
  startChallenge,
  submitChallenge
} from "../controllers/challengeController.js";

const router = express.Router();
router.post("/start", protect, startChallenge);
router.post("/submit", protect, submitChallenge);

router.post("/invite", protect, sendInvite);
router.post("/accept", protect, acceptInvite);
router.get("/myinvites", protect, getMyInvites);


export default router;
