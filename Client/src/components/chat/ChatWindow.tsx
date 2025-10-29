import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Info, X, Smile, Mic, Image, User, Eye, MoreVertical, Settings, Users, Crown, Shield, UserCheck } from "lucide-react";
import { getToken } from "@/utils/getToken";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import GroupChatAdminPanel from "@/components/chat/GroupChatAdminPanel";
import { toast } from "sonner";

// ✅ Create socket instance with better configuration
const createSocket = () => {
  return io(import.meta.env.VITE_API_URL, {
    transports: ['websocket', 'polling'],
    upgrade: true,
    forceNew: true,
    timeout: 10000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
};

// Color system for user avatars and names
const userColors = [
  'from-purple-500 to-pink-500',
  'from-blue-500 to-cyan-500',
  'from-green-500 to-emerald-500',
  'from-orange-500 to-red-500',
  'from-indigo-500 to-purple-500',
  'from-teal-500 to-blue-500',
  'from-yellow-500 to-orange-500',
  'from-pink-500 to-rose-500'
];

const getUserColor = (userId) => {
  if (!userId) return userColors[0];
  const index = userId.toString().charCodeAt(0) % userColors.length;
  return userColors[index];
};

const ChatWindow = ({ selectedChat, isGroup = false, currentUser, onToggleGroupInfo }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [viewedProfile, setViewedProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friendStatus, setFriendStatus] = useState('offline');
  const [friendLastSeen, setFriendLastSeen] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const menuRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const user = currentUser || JSON.parse(localStorage.getItem("user")) || {};
  const userId = user?._id;

  // ✅ Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = createSocket();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      setIsConnected(false);
    });

    return () => {
      console.log('🧹 Cleaning up socket connection');
      newSocket.disconnect();
      newSocket.removeAllListeners();
    };
  }, []);

  // ✅ Join user room when socket is connected and userId is available
  useEffect(() => {
    if (socket && isConnected && userId) {
      console.log('👤 Joining user room:', userId);
      socket.emit('join_user', userId);
    }
  }, [socket, isConnected, userId]);

  // ✅ Join chat room when selectedChat changes
  useEffect(() => {
    if (!socket || !isConnected || !selectedChat?._id) return;

    const roomId = isGroup ? `group_${selectedChat._id}` : `private_${selectedChat._id}`;
    console.log('🚪 Joining chat room:', roomId);
    
    socket.emit('join_chat', roomId);

    return () => {
      console.log('🚪 Leaving chat room:', roomId);
      socket.emit('leave_chat', roomId);
    };
  }, [socket, isConnected, selectedChat?._id, isGroup]);

  // ✅ Set up real-time message listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('👂 Setting up message listeners');

    // Handle incoming messages
    const handleReceiveMessage = (msg) => {
      console.log('📨 Received message:', msg);
      
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(m => m._id === msg._id);
        if (messageExists) return prev;
        
        return [...prev, msg];
      });
    };

    // Handle typing indicators
    const handleTypingStart = (data) => {
      if (data.chatId === selectedChat?._id && data.userId !== userId) {
        setIsTyping(true);
      }
    };

    const handleTypingStop = (data) => {
      if (data.chatId === selectedChat?._id && data.userId !== userId) {
        setIsTyping(false);
      }
    };

    // Listen for events
    socket.on('receive_message', handleReceiveMessage);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);
    socket.on('message_sent', handleReceiveMessage); // Alternative event name

    // Clean up listeners
    return () => {
      console.log('🧹 Cleaning up message listeners');
      socket.off('receive_message', handleReceiveMessage);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
      socket.off('message_sent', handleReceiveMessage);
    };
  }, [socket, isConnected, selectedChat?._id, userId]);

  // ✅ Fetch messages when selected chat changes
  const fetchMessages = useCallback(async () => {
    if (!selectedChat?._id) return;

    const token = getToken();
    if (!token) return;

    try {
      console.log('📋 Fetching messages for chat:', selectedChat._id);
      
      const endpoint = isGroup
        ? `${import.meta.env.VITE_API_URL}/chatroom/${selectedChat._id}/getGroupmessages`
        : `${import.meta.env.VITE_API_URL}/chatroom/messages/${selectedChat._id}`;

      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('✅ Messages fetched:', res.data.messages?.length);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error("❌ Error fetching messages:", err);
      setMessages([]);
    }
  }, [selectedChat?._id, isGroup]);

  // ✅ Initial messages load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // ✅ Friend status functions
  const fetchFriendStatus = async () => {
    if (!selectedChat?._id || isGroup) return;
    
    const token = getToken();
    if (!token) return;

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/status/statuses`,
        { userIds: [selectedChat._id] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const statusData = res.data.statuses?.[selectedChat._id];
      setFriendStatus(statusData?.status || 'offline');
      setFriendLastSeen(statusData?.lastSeen || null);
    } catch (err) {
      console.error("Error fetching friend status:", err);
      setFriendStatus('offline');
      setFriendLastSeen(null);
    }
  };

  // ✅ Listen for real-time status changes
  useEffect(() => {
    if (!selectedChat || !socket) return;

    if (!isGroup) {
      fetchFriendStatus();
      
      socket.on("user-status-change", ({ userId, status, lastSeen }) => {
        if (userId === selectedChat._id) {
          setFriendStatus(status);
          setFriendLastSeen(lastSeen);
        }
      });
    } else {
      socket.on("user-status-change", ({ userId, status, lastSeen }) => {
        setGroupMembers(prev => 
          prev.map(member => {
            const memberId = member.user?._id || member.user;
            if (memberId === userId) {
              return {
                ...member,
                user: {
                  ...member.user,
                  status,
                  lastSeen
                }
              };
            }
            return member;
          })
        );
      });
    }

    return () => {
      socket.off("user-status-change");
    };
  }, [socket, selectedChat?._id, isGroup]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ✅ Fetch group members with status
  const fetchGroupMembers = async () => {
    if (!selectedChat?._id || !isGroup) return;

    const token = getToken();
    if (!token) return;

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/chatroom/${selectedChat._id}/members`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const members = res.data.members || [];
      
      const memberIds = members.map(m => m.user?._id || m.user).filter(id => id);
      if (memberIds.length > 0) {
        const statusRes = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/status/statuses`,
          { userIds: memberIds },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const statuses = statusRes.data.statuses || {};
        
        const membersWithStatus = members.map(member => ({
          ...member,
          user: {
            ...member.user,
            status: statuses[member.user?._id || member.user]?.status || 'offline',
            lastSeen: statuses[member.user?._id || member.user]?.lastSeen || new Date()
          }
        }));
        
        setGroupMembers(membersWithStatus);
      } else {
        setGroupMembers(members);
      }

      let currentUserMember = members.find(m => {
        if (m.user && typeof m.user === 'object' && m.user._id) {
          return String(m.user._id) === String(userId);
        }
        if (m.user && typeof m.user === 'string') {
          return String(m.user) === String(userId);
        }
        return false;
      });

      if (currentUserMember) {
        setUserRole(currentUserMember.role || 'member');
      } else {
        setUserRole('member');
      }

    } catch (err) {
      console.error("Error fetching group members:", err);
      setUserRole('member');
    }
  };

  // ✅ Get online members count
  const getOnlineMembersCount = () => {
    return groupMembers.filter(member => {
      const status = member.user?.status || 'offline';
      return status === 'online';
    }).length;
  };

  const fetchPendingRequests = async () => {
    if (!selectedChat?._id || !isGroup || !isUserAdmin()) return;

    const token = getToken();
    if (!token) return;

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/chatroom/${selectedChat._id}/pending-requests`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingRequests(res.data.requests || []);
    } catch (err) {
      console.error("Error fetching pending requests:", err);
      setPendingRequests([]);
    }
  };

  // View current chat profile
  const handleViewChatProfile = () => {
    if (isGroup) {
      setShowAdminPanel(true);
    } else {
      toast.info("User profile feature coming soon!");
    }
  };

  // Check if user is admin/owner
  const isUserAdmin = () => {
    return userRole === 'admin' || userRole === 'owner';
  };

  // Get role badge color
  const getRoleColor = (role) => {
    switch (role) {
      case "owner": return "bg-gradient-to-r from-amber-500 to-orange-500 text-white";
      case "admin": return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white";
      default: return "bg-gradient-to-r from-gray-600 to-gray-700 text-white";
    }
  };

  // Get role icon
  const getRoleIcon = (role) => {
    switch (role) {
      case "owner": return <Crown className="w-3 h-3" />;
      case "admin": return <Shield className="w-3 h-3" />;
      default: return <Users className="w-3 h-3" />;
    }
  };

  // ✅ Get status color for private chats
  const getStatusColor = (status) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-400";
      case "busy": return "bg-red-500";
      case "offline": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  // ✅ Get status text for private chats
  const getStatusText = (status) => {
    switch (status) {
      case "online": return "Online";
      case "away": return "Away";
      case "busy": return "Busy";
      case "offline": return "Offline";
      default: return "Offline";
    }
  };

  useEffect(() => {
    if (isGroup && selectedChat) {
      fetchGroupMembers();
      if (isUserAdmin()) {
        fetchPendingRequests();
      }
    }
  }, [selectedChat?._id, isGroup, userId]);

  useEffect(scrollToBottom, [messages]);

  // ✅ Improved typing handler with debouncing
  const handleTyping = useCallback(() => {
    if (!socket || !isConnected || !selectedChat?._id) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing start
    socket.emit("typing_start", {
      chatId: selectedChat._id,
      userId: userId,
      isGroup: isGroup
    });

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing_stop", {
        chatId: selectedChat._id,
        userId: userId,
        isGroup: isGroup
      });
    }, 1000);
  }, [socket, isConnected, selectedChat?._id, userId, isGroup]);

  // ✅ Improved send message function
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !socket || !isConnected) return;

    const token = getToken();
    if (!token) return;

    try {
      const msgData = isGroup
        ? { chatRoomId: selectedChat._id, content: newMessage, messageType: "text" }
        : { receiverId: selectedChat._id, content: newMessage, messageType: "text" };

      const endpoint = isGroup
        ? `${import.meta.env.VITE_API_URL}/chatroom/${selectedChat._id}/sendGroupmessages`
        : `${import.meta.env.VITE_API_URL}/chatroom/messages/send`;

      const res = await axios.post(endpoint, msgData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const sentMessage = res.data.message;
      console.log('📤 Message sent:', sentMessage);

      // ✅ Optimistically update UI immediately
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage("");

      // ✅ Emit socket event for real-time delivery
      const roomId = isGroup ? `group_${selectedChat._id}` : `private_${selectedChat._id}`;
      socket.emit("send_message", {
        ...sentMessage,
        roomId: roomId
      });

      // Stop typing
      socket.emit("typing_stop", {
        chatId: selectedChat._id,
        userId: userId,
        isGroup: isGroup
      });

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

    } catch (err) {
      console.error("❌ Error sending message:", err);
      if (err.response?.status !== 403) {
        toast.error("Failed to send message");
      }
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // ✅ Format last seen time
  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return '';
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return lastSeenDate.toLocaleDateString();
  };

  // ✅ Connection status indicator (optional, for debugging)
  const ConnectionStatus = () => (
    <div className={`absolute top-2 right-2 flex items-center gap-2 px-2 py-1 rounded-full text-xs ${
      isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
    }`}>
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
      {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  );

  if (!selectedChat)
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center space-y-6">
          <div className="w-32 h-32 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center shadow-2xl mx-auto">
            <div className="text-4xl">💬</div>
          </div>
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Start a Conversation
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Select a chat from the sidebar to begin messaging
            </p>
          </div>
        </div>
      </div>
    );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 backdrop-blur-sm relative">
      {/* Connection Status Indicator */}
      <ConnectionStatus />

      {/* Header - Fixed height */}
      <div className="h-20 flex-shrink-0 flex items-center justify-between px-6 bg-gradient-to-r from-purple-600 to-blue-600 backdrop-blur-xl border-b border-purple-500/30 shadow-lg z-10">
        {/* ... (rest of your JSX remains the same) */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar 
              className="w-14 h-14 shadow-lg border-2 border-white/30 cursor-pointer hover:scale-105 transition-transform"
              onClick={handleViewChatProfile}
            >
              <AvatarImage src={selectedChat.profilePicture || selectedChat.avatar || "/default-avatar.png"} />
              <AvatarFallback className={`bg-gradient-to-r ${getUserColor(selectedChat._id)} text-white font-semibold`}>
                {selectedChat.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              isGroup ? 'bg-indigo-500' : getStatusColor(friendStatus)
            }`}></div>
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <Eye className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="flex flex-col">
            <h3 
              className="text-lg font-bold text-white cursor-pointer hover:text-purple-200 transition-colors"
              onClick={handleViewChatProfile}
            >
              {selectedChat.name}
            </h3>
            <p className="text-blue-100 text-sm">
              {isTyping ? (
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>typing...</span>
                </div>
              ) : isGroup ? (
                <div className="flex items-center gap-2">
                  <span>{getOnlineMembersCount()} online • {groupMembers.length} total</span>
                  {userRole && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getRoleColor(userRole)}`}>
                      {getRoleIcon(userRole)}
                      <span className="capitalize">{userRole}</span>
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(friendStatus)}`}></span>
                  <span className="capitalize">
                    {getStatusText(friendStatus)}
                    {friendStatus === 'offline' && friendLastSeen && (
                      <span className="ml-1 text-blue-200">
                        • {formatLastSeen(friendLastSeen)}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {!isGroup ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleViewChatProfile}
              className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-200 shadow-sm"
              title="View Profile"
            >
              <User className="w-5 h-5 text-white" />
            </motion.button>
          ) : (
            <div className="relative" ref={menuRef}>
              {isUserAdmin() ? (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-200 shadow-sm"
                    title="Group Settings"
                  >
                    <Settings className="w-5 h-5 text-white" />
                  </motion.button>
                  
                  <AnimatePresence>
                    {showMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-500/30 py-2 z-50"
                      >
                        <button
                          onClick={() => {
                            setShowAdminPanel(true);
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-white hover:bg-purple-600/30 transition-colors flex items-center gap-3 border-b border-purple-500/20"
                        >
                          <Users className="w-4 h-4" />
                          Group Info & Members
                        </button>
                        
                        <div className="px-3 py-2 text-xs font-semibold text-purple-300 uppercase tracking-wide border-b border-purple-500/20">
                          Admin Actions
                        </div>
                        
                        <button
                          onClick={() => {
                            setShowAdminPanel(true);
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-white hover:bg-purple-600/30 transition-colors flex items-center gap-3"
                        >
                          <User className="w-4 h-4" />
                          Manage Members
                        </button>
                        
                        {pendingRequests.length > 0 && (
                          <button
                            onClick={() => {
                              setShowAdminPanel(true);
                              setShowMenu(false);
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-white hover:bg-purple-600/30 transition-colors flex items-center gap-3"
                          >
                            <UserCheck className="w-4 h-4" />
                            Pending Requests
                            <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                              {pendingRequests.length}
                            </span>
                          </button>
                        )}
                        
                        <div className="border-t border-purple-500/20 mt-2 pt-2 px-4">
                          <div className="text-xs text-purple-300 flex items-center justify-between">
                            <span>Your role:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getRoleColor(userRole)}`}>
                              {getRoleIcon(userRole)}
                              <span className="capitalize">{userRole}</span>
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAdminPanel(true)}
                  className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-200 shadow-sm"
                  title="Group Info"
                >
                  <Users className="w-5 h-5 text-white" />
                </motion.button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-800/50 to-gray-900/50 min-h-0 custom-scrollbar"
      >
        <AnimatePresence>
          {messages.map((msg, idx) => {
            const senderId = msg.sender?._id || msg.senderId;
            const isSent = senderId?.toString() === userId?.toString();
            const userColor = getUserColor(senderId);

            return (
              <motion.div
                key={msg._id || idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${isSent ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex items-end gap-3 max-w-[80%] ${isSent ? "flex-row-reverse" : ""}`}>
                  {!isSent && isGroup && (
                    <div className="relative group flex-shrink-0">
                      <Avatar 
                        className="w-10 h-10 shadow-md border-2 border-white/30 cursor-pointer hover:scale-105 transition-transform"
                      >
                        <AvatarImage src={msg.sender?.profilePicture || "/default-avatar.png"} />
                        <AvatarFallback className={`text-xs bg-gradient-to-r ${userColor} text-white`}>
                          {msg.sender?.name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  
                  <div className="flex flex-col space-y-1">
                    {isGroup && !isSent && (
                      <div className="flex items-center space-x-2 mb-1 px-1">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${userColor}`}></div>
                        <span className="text-xs font-semibold text-gray-200">
                          {msg.sender?.name}
                        </span>
                      </div>
                    )}
                    
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className={`px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm border ${
                        isSent
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md border-blue-400/30"
                          : "bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-bl-md border-gray-600/30"
                      }`}
                    >
                      <p className="leading-relaxed text-sm">{msg.content}</p>
                      <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mt-2`}>
                        <p className={`text-xs ${isSent ? 'text-blue-200' : 'text-gray-400'}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 max-w-max"
          >
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-green-300 text-sm font-medium">
              {selectedChat.name} is typing...
            </span>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="h-20 flex-shrink-0 flex items-center gap-3 px-6 bg-gradient-to-r from-gray-800 to-gray-900 backdrop-blur-xl border-t border-purple-500/30 shadow-lg">
        <div className="flex gap-1">
          <motion.button 
            whileHover={{ scale: 1.1 }} 
            whileTap={{ scale: 0.9 }} 
            className="p-3 text-gray-400 hover:text-purple-400 transition-colors hover:bg-white/10 rounded-xl"
          >
            <Paperclip className="w-5 h-5" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1 }} 
            whileTap={{ scale: 0.9 }} 
            className="p-3 text-gray-400 hover:text-purple-400 transition-colors hover:bg-white/10 rounded-xl"
          >
            <Image className="w-5 h-5" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1 }} 
            whileTap={{ scale: 0.9 }} 
            className="p-3 text-gray-400 hover:text-purple-400 transition-colors hover:bg-white/10 rounded-xl"
          >
            <Smile className="w-5 h-5" />
          </motion.button>
        </div>
        
        <div className="flex-1 relative">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type your message..."
            className="w-full pl-4 pr-12 py-3 bg-gray-700/50 border-2 border-purple-500/30 text-white placeholder-gray-400 rounded-2xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 backdrop-blur-sm transition-all"
          />
          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-purple-400 transition-colors"
          >
            <Mic className="w-4 h-4" />
          </motion.button>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || !isConnected}
          className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg shadow-purple-500/25 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border-2 border-purple-400/30"
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {showAdminPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowAdminPanel(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-gradient-to-br from-gray-900 to-purple-900 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-purple-500/30 bg-gradient-to-r from-purple-600 to-blue-600 backdrop-blur-sm">
                <h3 className="text-xl font-bold text-white">
                  Group Settings - {selectedChat.name}
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAdminPanel(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </motion.button>
              </div>
              <div className="overflow-y-auto max-h-[60vh]">
                <GroupChatAdminPanel
                  group={selectedChat}
                  currentUser={currentUser}
                  refreshGroup={fetchGroupMembers}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(168, 85, 247, 0.5) transparent;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #8b5cf6, #3b82f6);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #7c3aed, #2563eb);
        }
      `}</style>
    </div>
  );
};

export default ChatWindow;