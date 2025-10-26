import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {getAllGroups,requestToJoinGroup,getMyPendingRequests,sendJoinRequest,getMyJoinRequests, getGroupMembers,getMyGroups,getMessages, sendMessage,getGroupMessages,createGroupChat,sendGroupMessage, addParticipant,
  removeParticipant,
  getPendingRequests,
  approveRequest,
  rejectRequest,} from "../controllers/chatController.js";
const router = express.Router();

// GET messages with a friend
router.get("/messages/:friendId", protect, getMessages);
router.get("/mygroups", protect, getMyGroups);
// POST send a message
router.post("/messages/send", protect, sendMessage);
router.get("/:id/members", protect,getGroupMembers );
// Group routes
router.get("/:roomId/getGroupmessages", protect, getGroupMessages);
router.post("/:roomId/sendGroupmessages", protect, sendGroupMessage);
router.get("/getallgroups", protect, getAllGroups);
router.post("/groups/create", protect, createGroupChat);
router.post("/groups/:groupId/remove", protect, removeParticipant);

router.post("/:groupId/join-request", protect, requestToJoinGroup);
router.get("/my-join-requests", protect, getMyPendingRequests);
// For admin things 
// routes/chatRoutes.js

// Request join


router.post("/:groupId/invite", addParticipant);
router.post("/:groupId/remove-member", removeParticipant);
router.get("/:groupId/pending-requests", getPendingRequests);
router.post("/:groupId/join-request/approve", approveRequest);
router.post("/:groupId/join-request/reject", rejectRequest);


// GET /chatroom/my-join-requests
router.get("/my-join-requests", protect, getMyJoinRequests);


export default router;
