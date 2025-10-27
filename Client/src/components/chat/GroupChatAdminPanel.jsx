import React, { useEffect, useState } from "react";
import axios from "axios";
import { getToken } from "@/utils/getToken";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserCheck, UserX, Crown, Shield, MoreVertical, LogOut, AlertTriangle, Settings, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

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
        axios.get(`${import.meta.env.VITE_API_URL}/chatroom/${group._id}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(
          `${import.meta.env.VITE_API_URL}/chatroom/${group._id}/pending-requests`,
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
        `${import.meta.env.VITE_API_URL}/chatroom/${group._id}/join-request/approve`,
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
        `${import.meta.env.VITE_API_URL}/chatroom/${group._id}/join-request/reject`,
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
        `${import.meta.env.VITE_API_URL}/chatroom/${group._id}/remove-member`,
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
        return <Crown className="w-3 h-3 lg:w-4 lg:h-4 text-amber-500" />;
      case "admin":
        return <Shield className="w-3 h-3 lg:w-4 lg:h-4 text-blue-500" />;
      default:
        return <Users className="w-3 h-3 lg:w-4 lg:h-4 text-gray-500" />;
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
    
    if (targetUserId === String(currentUserId)) {
      return false;
    }

    if (!isAdmin) {
      return false;
    }

    if (currentUserRole === "owner") {
      return targetUserRole !== "owner";
    }

    if (currentUserRole === "admin") {
      return targetUserRole === "member";
    }

    return false;
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading group info...</p>
      </div>
    );

  return (
    <div className="h-full flex flex-col bg-transparent overflow-hidden">
      {/* Header */}
      <div className="p-4 lg:p-6 pb-0 flex-shrink-0">
        <div className="text-center mb-6">
          <div className="w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg relative overflow-hidden">
            {group.avatar ? (
              <img 
                src={group.avatar} 
                alt={group.name} 
                className="w-full h-full rounded-2xl object-cover" 
              />
            ) : (
              <span className="text-xl lg:text-2xl text-white font-bold">
                {group.name?.[0]?.toUpperCase()}
              </span>
            )}
            <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
          </div>
          
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 px-2 line-clamp-2">
            {group?.name || "Unnamed Group"}
          </h2>
          
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {members.length} members
            </span>
            {pendingRequests.length > 0 && (
              <span className="flex items-center gap-1">
                <UserPlus className="w-4 h-4" />
                {pendingRequests.length} pending
              </span>
            )}
          </div>
          
          {currentUserRole && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${getRoleColor(currentUserRole)}`}>
              {getRoleIcon(currentUserRole)}
              <span className="capitalize">{currentUserRole}</span>
              {currentUserRole === "owner" && "👑"}
              {currentUserRole === "admin" && "🛡️"}
            </div>
          )}
        </div>

        {/* Enhanced Tabs */}
        <div className="flex space-x-1 p-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl backdrop-blur-xl">
          {[
            { key: "members", label: "Members", icon: Users, count: members.length },
            { key: "requests", label: "Requests", icon: UserCheck, count: pendingRequests.length }
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === key
                  ? "bg-white dark:bg-gray-700 shadow-lg text-gray-900 dark:text-gray-100 transform scale-105"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === key 
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300" 
                  : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-3 lg:px-6 pb-4">
        {/* Members Tab */}
        <AnimatePresence mode="wait">
          {activeTab === "members" && (
            <motion.div
              key="members"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3 pt-4"
            >
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Group Members
                </h3>
                {isAdmin && (
                  <div className={`text-xs px-3 py-1.5 rounded-full font-medium ${getRoleColor(currentUserRole)}`}>
                    {currentUserRole === "owner" ? "👑 Owner" : "🛡️ Admin"}
                  </div>
                )}
              </div>
              
              {members.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-gray-500 dark:text-gray-400"
                >
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No members found</p>
                  <p className="text-sm">This group doesn't have any members yet</p>
                </motion.div>
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
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 backdrop-blur-sm ${
                          canKick 
                            ? "bg-white/80 dark:bg-gray-800/80 border-orange-200/50 dark:border-orange-700/50 hover:shadow-lg" 
                            : "bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 hover:shadow-md"
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={member.user?.profilePicture || "/default-avatar.png"}
                            alt={member.user?.name}
                            className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl object-cover border-2 border-white dark:border-gray-700 shadow-sm"
                          />
                          <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-900 rounded-full p-0.5 shadow-lg">
                            {getRoleIcon(member.role)}
                          </div>
                        </div>
                        
                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base truncate">
                              {member.user?.name}
                            </p>
                            {isCurrentUser && (
                              <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getRoleColor(member.role)}`}>
                              {member.role}
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {member.user?.email}
                            </p>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
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
              className="space-y-3 pt-4"
            >
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Join Requests
                </h3>
                {!isAdmin && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Admin only
                  </span>
                )}
              </div>
              
              {pendingRequests.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-gray-500 dark:text-gray-400"
                >
                  <UserCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No pending requests</p>
                  <p className="text-sm">All join requests have been processed</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((req, index) => (
                    <motion.div
                      key={req._id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50"
                    >
                      <img
                        src={req.user?.profilePicture || "/default-avatar.png"}
                        alt={req.user?.name}
                        className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl object-cover border-2 border-white dark:border-gray-700 shadow-sm flex-shrink-0"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base truncate">
                          {req.user?.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {req.user?.email}
                        </p>
                      </div>
                      
                      {isAdmin && (
                        <div className="flex gap-2 flex-shrink-0">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleApprove(req.user._id)}
                            className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-lg shadow-green-500/25"
                            title="Approve request"
                          >
                            <UserCheck className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleReject(req.user._id)}
                            className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/25"
                            title="Reject request"
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
      </div>

      {/* Enhanced Kick Confirmation Modal */}
      <AnimatePresence>
        {kickModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={closeKickModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm lg:max-w-md p-6 mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Remove User
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm lg:text-base">
                  Remove <span className="font-semibold text-gray-900 dark:text-gray-100">{kickModal.user?.name}</span> from the group?
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  This action cannot be undone
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeKickModal}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm lg:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleKickUser(kickModal.user._id)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm lg:text-base"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      Remove
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