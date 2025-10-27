import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { getToken } from "@/utils/getToken";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Users, 
  Crown, 
  Clock, 
  Search, 
  Shield,
  Sparkles,
  MoreVertical,
  UserPlus,
  Settings,
  TrendingUp,
  CheckCircle2,
  X,
  Image,
  Hash
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const GroupChatSidebar = ({ onSelectGroup, currentUser }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", avatar: "", description: "" });
  const [pendingRequestsMap, setPendingRequestsMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  const user = currentUser || JSON.parse(localStorage.getItem("user")) || null;
  const token = getToken();
  const userId = user?._id;

  const fetchGroups = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data: groupData } = await axios.get(
        `${import.meta.env.VITE_API_URL}/chatroom/getallgroups`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const allGroups = groupData.groups || [];

      const { data: pendingData } = await axios.get(
        `${import.meta.env.VITE_API_URL}/chatroom/my-join-requests`,
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
        `${import.meta.env.VITE_API_URL}/chatroom/groups/create`,
        newGroup,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Group created successfully!");
      setShowCreateModal(false);
      setNewGroup({ name: "", avatar: "", description: "" });
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
        `${import.meta.env.VITE_API_URL}/chatroom/${groupId}/join-request`,
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
    console.log("📱 Group clicked:", group);
    
    const isMember = group?.participants?.some(
      (p) => String(p.user._id) === String(userId)
    );
    
    if (!isMember) {
      toast.error("You must join this group to view messages");
      return;
    }
    
    if (onSelectGroup) {
      onSelectGroup(group);
    } else {
      console.error("onSelectGroup prop is not defined");
    }
  };

  const getRoleBadge = (role) => {
    const variants = {
      owner: { color: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300", icon: Crown },
      admin: { color: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300", icon: Shield },
      member: { color: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300", icon: Users }
    };
    
    const variant = variants[role] || variants.member;
    const Icon = variant.icon;
    
    return (
      <Badge variant="outline" className={`${variant.color} border text-xs px-2 py-1`}>
        <Icon className="w-3 h-3 mr-1" />
        {role}
      </Badge>
    );
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const popularGroups = groups
    .filter(group => group.participants?.length >= 10)
    .slice(0, 3);

  if (!user)
    return (
      <div className="flex justify-center items-center h-full text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50/50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-800/50 dark:to-purple-900/20">
      {/* Header */}
      <div className="p-6 pb-4 space-y-6 flex-shrink-0">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                  Groups
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Connect and collaborate with communities
                </p>
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1 text-gray-500">
                <Users className="w-3 h-3" />
                <span>{groups.length} groups</span>
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                <UserPlus className="w-3 h-3" />
                <span>
                  {groups.reduce((total, group) => total + (group.participants?.length || 0), 0)} total members
                </span>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white p-3 rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 group relative overflow-hidden"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Plus className="w-5 h-5" />
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search groups by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm placeholder-gray-400"
          />
        </div>

        {/* Popular Groups */}
        {popularGroups.length > 0 && searchQuery === "" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Popular Communities
            </div>
            <div className="grid grid-cols-1 gap-2">
              {popularGroups.map((group) => (
                <motion.div
                  key={group._id}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 cursor-pointer"
                  onClick={() => handleGroupClick(group)}
                >
                  <Avatar className="w-8 h-8 border-2 border-green-300 dark:border-green-600">
                    <AvatarImage src={group.avatar} />
                    <AvatarFallback className="bg-green-500 text-white text-xs">
                      {group.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                      {group.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {group.participants?.length} members
                    </p>
                  </div>
                  <Sparkles className="w-4 h-4 text-green-500 flex-shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            <p className="text-sm text-gray-500">Loading communities...</p>
          </div>
        ) : filteredGroups.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredGroups.map((group, index) => {
              const isMember = group.participants?.some(
                (p) => String(p.user._id) === String(userId)
              );
              const userRole = group.participants?.find(
                (p) => String(p.user._id) === String(userId)
              )?.role;
              const isPending = pendingRequestsMap[group._id];
              const memberCount = group.participants?.length || 0;

              return (
                <motion.div
                  key={group._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    delay: index * 0.05
                  }}
                  className="group relative"
                >
                  <Card 
                    className={`backdrop-blur-sm border transition-all duration-300 cursor-pointer overflow-hidden ${
                      isMember
                        ? "bg-white/70 dark:bg-gray-800/70 border-gray-200/50 dark:border-gray-700/50 hover:bg-white/90 dark:hover:bg-gray-800/90 hover:shadow-lg hover:shadow-indigo-500/10 hover:scale-105"
                        : "bg-gray-100/50 dark:bg-gray-800/50 border-gray-200/30 dark:border-gray-700/30 cursor-not-allowed"
                    }`}
                    onClick={() => isMember && handleGroupClick(group)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-12 h-12 border-2 border-indigo-200 dark:border-indigo-600 shadow-lg">
                            <AvatarImage src={group.avatar} />
                            <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold">
                              {group.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {userRole && ["owner", "admin"].includes(userRole) && (
                            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full p-1 shadow-lg border border-white dark:border-gray-800">
                              <Crown className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-base">
                                  {group.name}
                                </h3>
                                {isPending && (
                                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                )}
                              </div>
                              
                              {group.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                                  {group.description}
                                </p>
                              )}
                            </div>

                            {/* Action Button */}
                            {!isMember && !isPending && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestJoin(group._id);
                                }}
                                className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg text-xs font-medium shadow-lg shadow-green-500/25 transition-all duration-200 whitespace-nowrap flex items-center gap-1"
                              >
                                <UserPlus className="w-3 h-3" />
                                Join
                              </motion.button>
                            )}

                            {isPending && (
                              <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{memberCount} members</span>
                              </div>
                              {userRole && getRoleBadge(userRole)}
                            </div>
                            
                            {isMember && (
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Joined</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>

                    {/* Hover Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-300 pointer-events-none" />
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-8 text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-3xl flex items-center justify-center mb-4 shadow-lg">
              <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
              {searchQuery ? "No groups found" : "No groups yet"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
              {searchQuery 
                ? "Try adjusting your search terms" 
                : "Create your first group to start collaborating"
              }
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            )}
          </motion.div>
        )}
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Create New Group
                      </h3>
                      <p className="text-indigo-100 text-sm">
                        Build your community
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Hash className="w-4 h-4" />
                    Group Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter group name..."
                    value={newGroup.name}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, name: e.target.value })
                    }
                    className="w-full"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Image className="w-4 h-4" />
                    Avatar URL (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="https://example.com/avatar.jpg"
                    value={newGroup.avatar}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, avatar: e.target.value })
                    }
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Settings className="w-4 h-4" />
                    Description (Optional)
                  </label>
                  <textarea
                    placeholder="Describe your group..."
                    value={newGroup.description}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Group
                  </Button>
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