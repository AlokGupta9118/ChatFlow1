import React, { useEffect, useState } from "react";
import axios from "axios";
import { getToken } from "@/utils/getToken";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserCheck, UserX, Crown, Shield, MoreVertical, LogOut, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";

const GroupChatAdminPanel = ({ group, currentUser, refreshGroup }) => {
  const [members, setMembers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [activeTab, setActiveTab] = useState("members");
  const [kickModal, setKickModal] = useState({ isOpen: false, user: null });
  const [actionLoading, setActionLoading] = useState(false);

  const token = getToken();
  const currentUserId = currentUser?._id;

  const fetchGroupData = async () => {
    try {
      setLoading(true);

      const [membersRes, pendingRes] = await Promise.all([
        axios.get(`http://localhost:3000/chatroom/${group._id}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(
          `http://localhost:3000/chatroom/${group._id}/pending-requests`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ]);

      const membersData = membersRes.data.members || [];
      setMembers(membersData);
      setPendingRequests(pendingRes.data.requests || []);

      const apiUserRole = membersRes.data.currentUserRole;
      setCurrentUserRole(apiUserRole);
      setIsAdmin(apiUserRole === "admin" || apiUserRole === "owner");

    } catch (error) {
      console.error("Error loading group data:", error);
      setMembers([]);
      setPendingRequests([]);
      setIsAdmin(false);
      setCurrentUserRole("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (group?._id) {
      fetchGroupData();
    }
  }, [group]);

  const handleApprove = async (userId) => {
    if (!isAdmin) return;
    try {
      await axios.post(
        `http://localhost:3000/chatroom/${group._id}/join-request/approve`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingRequests((prev) =>
        prev.filter((req) => String(req.user._id) !== String(userId))
      );
      refreshGroup();
      toast.success("Join request approved");
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request");
    }
  };

  const handleReject = async (userId) => {
    if (!isAdmin) return;
    try {
      await axios.post(
        `http://localhost:3000/chatroom/${group._id}/join-request/reject`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingRequests((prev) =>
        prev.filter((req) => String(req.user._id) !== String(userId))
      );
      toast.success("Join request rejected");
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
    }
  };

  const handleKickUser = async (userId) => {
    if (!isAdmin) return;
    
    setActionLoading(true);
    try {
      await axios.post(
        `http://localhost:3000/chatroom/${group._id}/remove-member`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMembers((prev) => prev.filter((member) => String(member.user._id) !== String(userId)));
      setKickModal({ isOpen: false, user: null });
      refreshGroup();
      toast.success("User removed from group");
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error(error.response?.data?.message || "Failed to remove user");
    } finally {
      setActionLoading(false);
    }
  };

  const openKickModal = (user) => {
    setKickModal({ isOpen: true, user });
  };

  const closeKickModal = () => {
    setKickModal({ isOpen: false, user: null });
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "owner":
        return <Crown className="w-4 h-4 text-amber-500" />;
      case "admin":
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "owner":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const canKickUser = (member) => {
  const targetUserId = String(member.user._id);
  const targetUserRole = member.role;
  
  // 1. No one can kick themselves
  if (targetUserId === String(currentUserId)) {
    return false;
  }

  // 2. Only admins and owners can kick users
  if (!isAdmin) {
    return false;
  }

  // 3. Role-based permissions
  if (currentUserRole === "owner") {
    // Owner can kick admins and members, but not other owners
    return targetUserRole !== "owner";
  }

  if (currentUserRole === "admin") {
    // Admin can only kick regular members
    return targetUserRole === "member";
  }

  return false;
};

  // Count how many members can be kicked (for debug info)
  const getKickableMembersCount = () => {
    return members.filter(member => canKickUser(member)).length;
  };

  if (loading)
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );

  return (
    <div className="p-6 bg-transparent">
      {/* Enhanced Debug Info */}
      <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-200">
              ✅ Admin Panel Status
            </p>
            <p className="text-xs text-green-600 dark:text-green-300 mt-1">
              Your Role: <span className="font-mono bg-green-200 dark:bg-green-800 px-2 py-1 rounded">{currentUserRole}</span> • 
              Admin Rights: <span className="font-mono bg-green-200 dark:bg-green-800 px-2 py-1 rounded">{isAdmin ? "YES" : "NO"}</span> • 
              Total Members: <span className="font-mono bg-green-200 dark:bg-green-800 px-2 py-1 rounded">{members.length}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-green-600 dark:text-green-300">
              Can kick: <span className="font-mono bg-green-200 dark:bg-green-800 px-2 py-1 rounded">
                {getKickableMembersCount()} members
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
          {group.avatar ? (
            <img src={group.avatar} alt={group.name} className="w-full h-full rounded-2xl object-cover" />
          ) : (
            <span className="text-2xl text-white font-bold">{group.name?.[0]}</span>
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {group?.name || "Unnamed Group"}
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          {members.length} members • {pendingRequests.length} pending requests
        </p>
        {currentUserRole && (
          <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">
            Your role: <span className="font-semibold capitalize">{currentUserRole}</span>
            {currentUserRole === "owner" && " 👑"}
            {currentUserRole === "admin" && " 🛡️"}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
        <button
          onClick={() => setActiveTab("members")}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === "members"
              ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Members ({members.length})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === "requests"
              ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Requests ({pendingRequests.length})
        </button>
      </div>

      {/* Members Tab */}
      <AnimatePresence mode="wait">
        {activeTab === "members" && (
          <motion.div
            key="members"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Group Members
              </h3>
              {isAdmin && (
                <div className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full">
                  {currentUserRole === "owner" ? "👑 Owner Permissions" : "🛡️ Admin Permissions"}
                </div>
              )}
            </div>
            
            {members.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No members found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member, index) => {
                  const canKick = canKickUser(member);
                  const isCurrentUser = String(member.user._id) === String(currentUserId);
                  
                  return (
                    <motion.div
                      key={member.user?._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${
                        canKick 
                          ? "bg-white/80 dark:bg-gray-800/80 border-orange-200/50 dark:border-orange-700/50 hover:shadow-lg" 
                          : "bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 hover:shadow-md"
                      } backdrop-blur-sm`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="relative">
                          <img
                            src={member.user?.profilePicture || "/default-avatar.png"}
                            alt={member.user?.name}
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-gray-700 shadow-sm"
                          />
                          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 shadow-lg">
                            {getRoleIcon(member.role)}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {member.user?.name}
                            </p>
                            {isCurrentUser && (
                              <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full">
                                You
                              </span>
                            )}
                            {member.role === "owner" && (
                              <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-1 rounded-full">
                                Owner
                              </span>
                            )}
                            {member.role === "admin" && !isCurrentUser && (
                              <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {member.user?.email}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getRoleColor(member.role)}`}>
                          {member.role}
                        </span>
                        
                        {canKick && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openKickModal(member.user)}
                            className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 shadow-lg shadow-red-500/25"
                            title={`Remove ${member.user?.name} from group`}
                          >
                            <LogOut className="w-4 h-4" />
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Requests Tab */}
      <AnimatePresence mode="wait">
        {activeTab === "requests" && (
          <motion.div
            key="requests"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Pending Join Requests
            </h3>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No pending requests</p>
                <p className="text-sm mt-1">All join requests have been processed</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req, index) => (
                  <motion.div
                    key={req._id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={req.user?.profilePicture || "/default-avatar.png"}
                        alt={req.user?.name}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-gray-700 shadow-sm"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {req.user?.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {req.user?.email}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleApprove(req.user._id)}
                          className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-lg shadow-green-500/25"
                        >
                          <UserCheck className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleReject(req.user._id)}
                          className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/25"
                        >
                          <UserX className="w-4 h-4" />
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kick Confirmation Modal */}
      <AnimatePresence>
        {kickModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Remove User
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Are you sure you want to remove <span className="font-semibold text-gray-900 dark:text-gray-100">{kickModal.user?.name}</span> from the group?
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeKickModal}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleKickUser(kickModal.user._id)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      Remove User
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupChatAdminPanel;