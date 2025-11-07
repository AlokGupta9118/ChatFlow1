import { useEffect, useState } from "react";
import axios from "axios";
import { Search, Circle, Users, MessageCircle, MoreVertical, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getToken } from "@/utils/getToken";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const socket = io(import.meta.env.VITE_API_URL);

const ChatList = ({ onSelectChat, selectedChat }) => {
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [activeCategory, setActiveCategory] = useState("all");
  const [showAdminPanel, setShowAdminPanel] = useState(null);
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

  // Fetch chat previews with last messages and unread counts
  const fetchChatPreviews = async () => {
    const token = getToken();
    if (!token || !currentUser?._id) return;

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/chatroom/chat-previews`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        const { lastMessages: newLastMessages, unreadCounts: newUnreadCounts } = res.data;
        
        setLastMessages(prev => ({ ...prev, ...newLastMessages }));
        setUnreadCounts(prev => ({ ...prev, ...newUnreadCounts }));
      }
    } catch (error) {
      console.error("Error fetching chat previews:", error);
    }
  };

  // Mark chat as read
  const markChatAsRead = async (chatRoomId) => {
    const token = getToken();
    if (!token) return;

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/chatroom/${chatRoomId}/mark-as-read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // Update local state immediately
      setUnreadCounts(prev => ({ ...prev, [chatRoomId]: 0 }));
    } catch (error) {
      console.error("Error marking chat as read:", error);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([fetchFriends(), fetchGroups(), fetchChatPreviews()]);
      if (mounted) setLoading(false);
    };

    initializeData();

    // Socket event for new messages
    socket.on("new_message", (msg) => {
      if (!currentUser?._id) return;
      
      const senderId = msg.sender?._id || msg.senderId;
      const chatRoomId = msg.chatRoom?._id || msg.chatRoom;
      
      // Don't count your own messages as unread
      if (senderId === currentUser._id) return;

      const key = chatRoomId;

      // Update unread count
      setUnreadCounts((prev) => ({ 
        ...prev, 
        [key]: (prev[key] || 0) + 1 
      }));

      // Update last message preview
      setLastMessages((prev) => ({
        ...prev,
        [key]: {
          content: msg.content,
          type: msg.type,
          timestamp: msg.createdAt || new Date(),
          senderName: msg.sender?.name || "Unknown",
          senderId: msg.sender?._id
        }
      }));

      // If this is a private chat, also update under friend ID
      const chatRoom = msg.chatRoom;
      if (chatRoom && !chatRoom.isGroup && chatRoom.type === "direct") {
        const otherParticipant = chatRoom.participants?.find(
          p => p.user?._id !== currentUser._id
        );
        if (otherParticipant?.user?._id) {
          setLastMessages((prev) => ({
            ...prev,
            [otherParticipant.user._id]: {
              content: msg.content,
              type: msg.type,
              timestamp: msg.createdAt || new Date(),
              senderName: msg.sender?.name || "Unknown",
              senderId: msg.sender?._id
            }
          }));
        }
      }
    });

    // Listen for message read events
    socket.on("messages_read", ({ chatRoomId, count }) => {
      setUnreadCounts((prev) => ({ 
        ...prev, 
        [chatRoomId]: Math.max(0, (prev[chatRoomId] || 0) - count) 
      }));
    });

    socket.on("update_status", ({ userId, status }) => {
      setFriends((prev) =>
        prev.map((f) => (f._id === userId ? { ...f, status } : f))
      );
    });

    return () => {
      mounted = false;
      socket.off("new_message");
      socket.off("messages_read");
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

  const handleSelect = async (chat, isGroup = false) => {
    console.log("🎯 ChatList: handleSelect called", {
      chat: chat?.name,
      isGroup,
      chatType: isGroup ? "GROUP" : "PRIVATE"
    });

    const key = chat._id;
    
    // Clear unread count when chat is selected
    if (unreadCounts[key] > 0) {
      await markChatAsRead(key);
    }

    if (isGroup) {
      if (onSelectChat) {
        onSelectChat(chat, isGroup);
      }
    } else {
      try {
        const token = getToken();
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/chatroom/private/${chat._id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (data.success && data.chatRoom) {
          console.log("✅ Found/Created chat room:", data.chatRoom);
          if (onSelectChat) {
            onSelectChat(data.chatRoom, isGroup);
          }
        } else {
          console.error("❌ Failed to get/create chat room:", data.message);
          toast.error("Failed to start chat");
        }
      } catch (error) {
        console.error("❌ Error getting chat room:", error);
        toast.error("Failed to load chat");
      }
    }
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

  const getLastMessagePreview = (chatId, isGroup = false) => {
    const lastMessage = lastMessages[chatId];
    if (!lastMessage) return "No messages yet";
    
    const isCurrentUserSender = lastMessage.senderId === currentUser._id;
    const prefix = isGroup && !isCurrentUserSender && lastMessage.senderName 
      ? `${lastMessage.senderName}: ` 
      : isCurrentUserSender ? "You: " : "";
    
    if (lastMessage.type === "image") {
      return `${prefix}📷 Image`;
    } else if (lastMessage.type === "file") {
      return `${prefix}📎 File`;
    } else if (lastMessage.type === "voice") {
      return `${prefix}🎤 Voice message`;
    } else {
      // Truncate long messages
      const content = lastMessage.content || "";
      return `${prefix}${content.length > 40 ? content.substring(0, 40) + '...' : content}`;
    }
  };

  const getMessageTime = (chatId) => {
    const lastMessage = lastMessages[chatId];
    if (!lastMessage?.timestamp) return "";
    
    const messageTime = new Date(lastMessage.timestamp);
    const now = new Date();
    const diffInHours = (now - messageTime) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getUserRoleInGroup = (group) => {
    const participant = group.participants.find(
      (p) => String(p.user?._id || p.user) === String(currentUser._id)
    );
    return participant?.role || "member";
  };

  const isGroupAdmin = (group) => {
    const role = getUserRoleInGroup(group);
    return role === "admin" || role === "owner";
  };

  const toggleAdminPanel = (groupId, e) => {
    e.stopPropagation();
    setShowAdminPanel(showAdminPanel === groupId ? null : groupId);
  };

  const handleAdminAction = (action, groupId) => {
    console.log(`Admin action: ${action} for group: ${groupId}`);
    setShowAdminPanel(null);
  };

  const displayedItems = activeCategory === "groups" 
    ? filteredGroups 
    : activeCategory === "friends" 
    ? filteredFriends 
    : [...filteredFriends, ...filteredGroups];

  return (
    <div className="w-full h-full bg-transparent flex flex-col">
      {/* Header */}
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

        {/* Category Tabs */}
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
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden xs:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 lg:px-6 pb-4 space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading conversations...</p>
          </div>
        ) : displayedItems.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {displayedItems.map((item, index) => {
              const isGroup = item.participants && item.type === "group";
              const itemName = item?.name || "Unnamed";
              const isSelected = selectedChat?._id === item._id;
              const unread = unreadCounts[item._id] || 0;
              const lastMessagePreview = getLastMessagePreview(item._id, isGroup);
              const messageTime = getMessageTime(item._id);

              if (isGroup) {
                const participant = item.participants.find(
                  (p) => String(p.user?._id || p.user) === String(currentUser._id)
                );
                const role = participant?.role || "Member";
                const memberCount = item.participants?.length || 0;
                const isAdmin = isGroupAdmin(item);

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
                      onClick={() => handleSelect(item, true)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 group backdrop-blur-xl border ${
                        isSelected
                          ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-200 dark:border-indigo-800 shadow-2xl shadow-indigo-500/20 transform scale-105"
                          : "bg-white/80 dark:bg-gray-800/80 border-gray-200/50 dark:border-gray-700/50 hover:bg-white/90 dark:hover:bg-gray-800/90 hover:shadow-lg hover:scale-105"
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className="flex items-center gap-3 lg:gap-4">
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
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm lg:text-base">
                              {itemName}
                            </h3>
                            <div className="flex items-center gap-2">
                              {messageTime && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {messageTime}
                                </span>
                              )}
                              {unread > 0 && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg min-w-6 text-center"
                                >
                                  {unread}
                                </motion.span>
                              )}
                              {isAdmin && activeCategory === "groups" && (
                                <button
                                  onClick={(e) => toggleAdminPanel(item._id, e)}
                                  className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
                                >
                                  <Settings className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* Last Message Preview */}
                          <p className={`text-sm truncate mb-2 ${
                            unread > 0 
                              ? "text-gray-900 dark:text-gray-100 font-medium" 
                              : "text-gray-600 dark:text-gray-400"
                          }`}>
                            {lastMessagePreview}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs lg:text-sm">
                            <span className={`px-2 py-1 rounded-full font-medium ${
                              role === "owner" 
                                ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300"
                                : role === "admin"
                                ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                                : "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                            }`}>
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
                // Private chat (friend)
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
                      onClick={() => handleSelect(item, false)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 group backdrop-blur-xl border ${
                        isSelected
                          ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-200 dark:border-indigo-800 shadow-2xl shadow-indigo-500/20 transform scale-105"
                          : "bg-white/80 dark:bg-gray-800/80 border-gray-200/50 dark:border-gray-700/50 hover:bg-white/90 dark:hover:bg-gray-800/90 hover:shadow-lg hover:scale-105"
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className="flex items-center gap-3 lg:gap-4">
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-12 h-12 lg:w-14 lg:h-14 shadow-lg border-2 border-white/80 dark:border-gray-700/80">
                            <AvatarImage src={item.profilePicture || "/default-avatar.png"} />
                            <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-lg">
                              {itemName[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 rounded-full border-2 border-white dark:border-gray-900 ${getStatusColor(item.status)}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm lg:text-base">
                              {itemName}
                            </h3>
                            <div className="flex items-center gap-2">
                              {messageTime && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {messageTime}
                                </span>
                              )}
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
                          </div>
                          
                          {/* Last Message Preview */}
                          <p className={`text-sm truncate mb-2 ${
                            unread > 0 
                              ? "text-gray-900 dark:text-gray-100 font-medium" 
                              : "text-gray-600 dark:text-gray-400"
                          }`}>
                            {lastMessagePreview}
                          </p>
                          
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
    </div>
  );
};

export default ChatList;