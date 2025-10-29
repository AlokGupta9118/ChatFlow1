import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {getAllGroups,requestToJoinGroup,getMyPendingRequests,sendJoinRequest,getMyJoinRequests, getGroupMembers,getMyGroups,sendMessage,
  getMessages,createGroupChat, addParticipant,
  removeParticipant,
  getPendingRequests,
  approveRequest,
  rejectRequest,} from "../controllers/chatController.js";
const router = express.Router();

// GET messages with a friend

router.get("/mygroups", protect, getMyGroups);
// POST send a message
router.post("/messages/send", protect, sendMessage);
router.get("/:id/members", protect,getGroupMembers );


router.get("/getallgroups", protect, getAllGroups);
router.post("/groups/create", protect, createGroupChat);
router.post("/groups/:groupId/remove", protect, removeParticipant);

router.post("/:groupId/join-request", protect, requestToJoinGroup);
router.get("/my-join-requests", protect, getMyPendingRequests);
// For admin things 
// routes/chatRoutes.js

// Request join


router.post("/:groupId/invite",protect, addParticipant);
router.post("/:groupId/remove-member",protect, removeParticipant);
router.get("/:groupId/pending-requests",protect, getPendingRequests);
router.post("/:groupId/join-request/approve", protect,approveRequest);
router.post("/:groupId/join-request/reject", protect,rejectRequest);


// GET /chatroom/my-join-requests
router.get("/my-join-requests", protect, getMyJoinRequests);








// Messages
router.post('/messages/send', sendMessage);
router.get('/messages/:chatId', getMessages);

// Groups
router.get('/groups/my', getMyGroups);
router.post('/groups/create', createGroupChat);
router.get('/groups/:id/members', getGroupMembers);

export default router;
