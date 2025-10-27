import { useEffect, useState } from "react";
import axios from "axios";
import { Search, Circle, Users, MessageCircle, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getToken } from "@/utils/getToken";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";

const socket = io(import.meta.env.VITE_API_URL);

const ChatList = ({ onSelectFriend, selectedFriend }) => {
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [activeCategory, setActiveCategory] = useState("all");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchFriends = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFriends(res.data.friends || []);
    } catch (err) {
      console.error("Error fetching friends:", err);
      setFriends([]);
    }
  };

  const fetchGroups = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/chatroom/mygroups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const safeGroups = (res.data.groups || []).filter(
        (g) => Array.isArray(g.participants)
      );
      setGroups(safeGroups);
    } catch (err) {
      console.error("Error fetching groups:", err);
      setGroups([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await Promise.all([fetchFriends(), fetchGroups()]);
      if (mounted) setLoading(false);
    })();

    socket.on("receive_message", (msg) => {
      if (!currentUser?._id) return;
      const senderId = msg.sender?._id || msg.senderId;
      if (senderId === currentUser._id) return;
      const key = msg.chatRoom?._id || senderId;
      setUnreadCounts((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
    });

    socket.on("update_status", ({ userId, status }) => {
      setFriends((prev) =>
        prev.map((f) => (f._id === userId ? { ...f, status } : f))
      );
    });

    return () => {
      mounted = false;
      socket.off("receive_message");
      socket.off("update_status");
    };
  }, []);

  const normalize = (s) => (typeof s === "string" ? s : "");

  const filteredFriends = friends.filter((f) =>
    normalize(f?.name).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter((g) =>
    normalize(g?.name).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (friend, group, isGroup = false) => {
    const key = isGroup ? group._id : friend._id;
    setUnreadCounts((prev) => ({ ...prev, [key]: 0 }));
    onSelectFriend(friend, group, isGroup);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-400";
      case "busy": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "online": return "Online";
      case "away": return "Away";
      case "busy": return "Busy";
      default: return "Offline";
    }
  };

  const displayedItems = activeCategory === "groups" 
    ? filteredGroups 
    : activeCategory === "friends" 
    ? filteredFriends 
    : [...filteredFriends, ...filteredGroups];

  return (
    <div className="w-full h-full bg-transparent flex flex-col">
      {/* Enhanced Header */}
      <div className="p-4 lg:p-6 pb-3 lg:pb-4 space-y-4 flex-shrink-0">
        <div className="px-1">
          <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Messages
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {friends.length} friends • {groups.length} groups
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 lg:w-5 lg:h-5" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 lg:pl-12 pr-4 h-12 lg:h-14 bg-white/70 dark:bg-gray-800/70 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-xl shadow-sm text-base"
          />
        </div>

        {/* Enhanced Category Tabs */}
        <div className="flex space-x-2 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl p-2 backdrop-blur-xl">
          {[
            { key: "all", label: "All", icon: MessageCircle },
            { key: "friends", label: "Friends", icon: Users },
            { key: "groups", label: "Groups", icon: Users }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeCategory === key
                  ? "bg-white dark:bg-gray-700 shadow-lg text-gray-900 dark:text-gray-100 transform scale-105"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden xs:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced Chat List - Fixed Scrolling Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 lg:px-6 pb-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading conversations...</p>
          </div>
        ) : displayedItems.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {displayedItems.map((item, index) => {
              const isGroup = item.participants;
              const itemName = item?.name || "Unnamed";
              const isSelected = selectedFriend?._id === item._id;
              const unread = unreadCounts[item._id] || 0;

              if (isGroup) {
                const participant = item.participants.find(
                  (p) => String(p.user?._id || p.user) === String(currentUser._id)
                );
                const role = participant?.role || "Member";
                const memberCount = item.participants?.length || 0;

                return (
                  <motion.div
                    key={item._id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                      delay: index * 0.05
                    }}
                    className="px-2"
                  >
                    <div
                      onClick={() => handleSelect(null, { ...item, isGroup: true }, true)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 group backdrop-blur-xl border ${
                        isSelected
                          ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-200 dark:border-indigo-800 shadow-2xl shadow-indigo-500/20 transform scale-105"
                          : "bg-white/80 dark:bg-gray-800/80 border-gray-200/50 dark:border-gray-700/50 hover:bg-white/90 dark:hover:bg-gray-800/90 hover:shadow-lg hover:scale-105"
                      }`}
                    >
                      <div className="flex items-center gap-3 lg:gap-4">
                        {/* Avatar Container */}
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-12 h-12 lg:w-14 lg:h-14 shadow-lg border-2 border-white/80 dark:border-gray-700/80">
                            <AvatarImage src={item.avatar || "/default-avatar.png"} />
                            <AvatarFallback className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-lg">
                              {itemName[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 bg-indigo-500 rounded-full p-1 shadow-lg border border-white dark:border-gray-900">
                            <Users className="w-3 h-3 text-white" />
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm lg:text-base">
                              {itemName}
                            </h3>
                            {unread > 0 && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg min-w-6 text-center"
                              >
                                {unread}
                              </motion.span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs lg:text-sm">
                            <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full font-medium">
                              {role}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {memberCount} {memberCount === 1 ? 'member' : 'members'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              } else {
                return (
                  <motion.div
                    key={item._id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                      delay: index * 0.05
                    }}
                    className="px-2"
                  >
                    <div
                      onClick={() => handleSelect(item, null, false)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 group backdrop-blur-xl border ${
                        isSelected
                          ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-200 dark:border-indigo-800 shadow-2xl shadow-indigo-500/20 transform scale-105"
                          : "bg-white/80 dark:bg-gray-800/80 border-gray-200/50 dark:border-gray-700/50 hover:bg-white/90 dark:hover:bg-gray-800/90 hover:shadow-lg hover:scale-105"
                      }`}
                    >
                      <div className="flex items-center gap-3 lg:gap-4">
                        {/* Avatar Container */}
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-12 h-12 lg:w-14 lg:h-14 shadow-lg border-2 border-white/80 dark:border-gray-700/80">
                            <AvatarImage src={item.profilePicture || "/default-avatar.png"} />
                            <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-lg">
                              {itemName[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 rounded-full border-2 border-white dark:border-gray-900 ${getStatusColor(item.status)}`} />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm lg:text-base">
                              {itemName}
                            </h3>
                            {unread > 0 && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg min-w-6 text-center"
                              >
                                {unread}
                              </motion.span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs lg:text-sm">
                            <span className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`} />
                            <span className="text-gray-500 dark:text-gray-400">
                              {getStatusText(item.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              }
            })}
          </AnimatePresence>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-8 text-center h-full"
          >
            <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-3xl flex items-center justify-center mb-4 shadow-lg">
              <MessageCircle className="w-8 h-8 lg:w-10 lg:h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg lg:text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
              {searchQuery ? "No matches found" : "No conversations"}
            </h3>
            <p className="text-sm lg:text-base text-gray-500 dark:text-gray-400 max-w-xs">
              {searchQuery 
                ? "Try adjusting your search terms" 
                : "Start chatting with friends or create a group"
              }
            </p>
          </motion.div>
        )}
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="lg:hidden fixed bottom-6 right-6 z-10">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl shadow-2xl shadow-indigo-500/50 flex items-center justify-center text-white"
        >
          <MessageCircle className="w-6 h-6" />
        </motion.button>
      </div>
    </div>
  );
};

export default ChatList;