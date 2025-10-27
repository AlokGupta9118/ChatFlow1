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
      <div className="p-6 pb-4 space-y-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Messages
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {friends.length} friends • {groups.length} groups
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {["all", "friends", "groups"].map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium capitalize transition-all duration-200 ${
                activeCategory === category
                  ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : displayedItems.length > 0 ? (
          <AnimatePresence>
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div
                      onClick={() => handleSelect(null, { ...item, isGroup: true }, true)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 group ${
                        isSelected
                          ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-200 dark:border-indigo-800 shadow-lg shadow-indigo-500/10"
                          : "bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/90 dark:hover:bg-gray-800/90 hover:shadow-md hover:scale-105"
                      } backdrop-blur-sm`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="w-14 h-14 shadow-md border-2 border-white dark:border-gray-700">
                            <AvatarImage src={item.avatar || "/default-avatar.png"} />
                            <AvatarFallback className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold">
                              {itemName[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 bg-indigo-500 rounded-full p-1 shadow-lg">
                            <Users className="w-3 h-3 text-white" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {itemName}
                            </h3>
                            {unread > 0 && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg"
                              >
                                {unread}
                              </motion.span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full text-xs">
                              {role}
                            </span>
                            <span>•</span>
                            <span>{memberCount} members</span>
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div
                      onClick={() => handleSelect(item, null, false)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 group ${
                        isSelected
                          ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-200 dark:border-indigo-800 shadow-lg shadow-indigo-500/10"
                          : "bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/90 dark:hover:bg-gray-800/90 hover:shadow-md hover:scale-105"
                      } backdrop-blur-sm`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="w-14 h-14 shadow-md border-2 border-white dark:border-gray-700">
                            <AvatarImage src={item.profilePicture || "/default-avatar.png"} />
                            <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold">
                              {itemName[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${getStatusColor(item.status)}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {itemName}
                            </h3>
                            {unread > 0 && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg"
                              >
                                {unread}
                              </motion.span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
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
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No conversations found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {searchQuery ? "Try a different search" : "Start a new conversation"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
