import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { getToken } from "@/utils/getToken";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, Crown, Clock, Search } from "lucide-react";

const GroupChatSidebar = ({ onSelectGroup, currentUser }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", avatar: "" });
  const [pendingRequestsMap, setPendingRequestsMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const user = currentUser || JSON.parse(localStorage.getItem("user")) || null;
  const token = getToken();
  const userId = user?._id;

  const fetchGroups = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data: groupData } = await axios.get(
        "http://localhost:3000/chatroom/getallgroups",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const allGroups = groupData.groups || [];

      const { data: pendingData } = await axios.get(
        "http://localhost:3000/chatroom/my-join-requests",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const pendingRequests = pendingData.requests || [];

      const pendingMap = {};
      pendingRequests.forEach((r) => {
        if (r._id) pendingMap[r._id] = true;
      });

      setPendingRequestsMap(pendingMap);
      setGroups(allGroups);
    } catch (err) {
      console.error("❌ fetchGroups error:", err);
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroup.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    try {
      await axios.post(
        "http://localhost:3000/chatroom/groups/create",
        newGroup,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Group created successfully!");
      setShowCreateModal(false);
      setNewGroup({ name: "", avatar: "" });
      fetchGroups();
    } catch (err) {
      console.error("❌ handleCreateGroup:", err);
      toast.error(err.response?.data?.message || "Failed to create group");
    }
  };

  const handleRequestJoin = async (groupId) => {
    if (!groupId) return toast.error("Invalid group");
    if (pendingRequestsMap[groupId]) return;

    try {
      const res = await axios.post(
        `http://localhost:3000/chatroom/${groupId}/join-request`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(res.data.message || "Request sent");
      setPendingRequestsMap((prev) => ({ ...prev, [groupId]: true }));
    } catch (err) {
      console.error("❌ handleRequestJoin:", err);
      const msg = err.response?.data?.message || "Failed to send request";
      toast.error(msg);
    }
  };

  const handleGroupClick = (group) => {
    const isMember = group?.participants?.some(
      (p) => String(p.user._id) === String(userId)
    );
    if (!isMember) {
      toast.error("You must join this group to view messages");
      return;
    }
    onSelectGroup(group);
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user)
    return (
      <div className="flex justify-center items-center h-full text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Enhanced Header */}
      <div className="p-6 pb-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Groups
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Connect and collaborate
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white p-3 rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : filteredGroups.length > 0 ? (
          <AnimatePresence>
            {filteredGroups.map((group, index) => {
              const isMember = group.participants.some(
                (p) => String(p.user._id) === String(userId)
              );
              const isAdmin = group.participants.some(
                (p) =>
                  String(p.user._id) === String(userId) &&
                  ["owner", "admin"].includes(p.role)
              );
              const isPending = pendingRequestsMap[group._id];
              const memberCount = group.participants?.length || 0;

              return (
                <motion.div
                  key={group._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative"
                >
                  <div
                    className={`flex items-center justify-between p-4 rounded-2xl backdrop-blur-sm border transition-all duration-300 cursor-pointer ${
                      isMember
                        ? "bg-white/70 dark:bg-gray-800/70 border-gray-200/50 dark:border-gray-700/50 hover:bg-white/90 dark:hover:bg-gray-800/90 hover:shadow-lg hover:scale-105"
                        : "bg-gray-100/50 dark:bg-gray-800/50 border-gray-200/30 dark:border-gray-700/30"
                    }`}
                  >
                    <div
                      className="flex items-center gap-4 flex-1"
                      onClick={() => isMember && handleGroupClick(group)}
                    >
                      <div className="relative">
                        <img
                          src={group.avatar || "/default-avatar.png"}
                          alt={group.name}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-200 dark:border-indigo-600 shadow-md"
                        />
                        {isAdmin && (
                          <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-1 shadow-lg">
                            <Crown className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                            {group.name}
                          </p>
                          {isPending && (
                            <Clock className="w-3 h-3 text-amber-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Users className="w-3 h-3" />
                          <span>{memberCount} members</span>
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700">
                            {isAdmin ? "Admin" : isMember ? "Member" : isPending ? "Pending" : "Join"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isMember && !isPending && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRequestJoin(group._id)}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-green-500/25 transition-all duration-200"
                      >
                        Join
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No groups found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Create a group to get started
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Create Group Modal */}
      <AnimatePresence>
        {showCreateModal && (
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
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Create New Group
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter group name..."
                    value={newGroup.name}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Avatar URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="https://example.com/avatar.jpg"
                    value={newGroup.avatar}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, avatar: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/25 transition-all"
                  >
                    Create Group
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupChatSidebar;
