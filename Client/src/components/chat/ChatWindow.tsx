// components/chat/ChatWindow.jsx - FINAL CORRECTED VERSION
import { useEffect, useState, useRef } from "react";
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

const socket = io(import.meta.env.VITE_API_URL);

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
  const [canSendMessage, setCanSendMessage] = useState(true); // Default to true
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [viewedProfile, setViewedProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const menuRef = useRef(null);

  const user = currentUser || JSON.parse(localStorage.getItem("user")) || {};
  const userId = user?._id;

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

  // CORRECTED: Fetch group members and user role
  const fetchGroupMembers = async () => {
    if (!selectedChat?._id || !isGroup) {
      // If not a group, allow sending messages
      setCanSendMessage(true);
      return;
    }

    const token = getToken();
    if (!token) {
      setCanSendMessage(true); // Default to allowing messages
      return;
    }

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/chatroom/${selectedChat._id}/members`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const members = res.data.members || [];
      setGroupMembers(members);

      // CORRECTED: Multiple ways to find current user with better error handling
      let currentUserMember = null;

      // Try different possible data structures
      currentUserMember = members.find(m => {
        // Case 1: user is an object with _id
        if (m.user && typeof m.user === 'object' && m.user._id) {
          return String(m.user._id) === String(userId);
        }
        // Case 2: user is directly the ID string
        if (m.user && typeof m.user === 'string') {
          return String(m.user) === String(userId);
        }
        // Case 3: Check for participant structure
        if (m.participant && m.participant.user) {
          return String(m.participant.user._id) === String(userId);
        }
        // Case 4: Check for userId field directly
        if (m.userId) {
          return String(m.userId) === String(userId);
        }
        return false;
      });

      // CORRECTED: If user is not found in members, check if they might be the group creator
      // or use a fallback approach
      if (currentUserMember) {
        const role = currentUserMember.role || 'member';
        setUserRole(role);
        setCanSendMessage(true); // Always allow sending if user is a member
      } else {
        // If user not found in members list, they might still be able to send messages
        // This handles cases where the API structure is different
        setUserRole('member'); // Default to member role
        setCanSendMessage(true); // Allow sending by default
        
        // Try to get role from alternative API endpoint
        try {
          const roleRes = await axios.get(
            `${import.meta.env.VITE_API_URL}/chatroom/${selectedChat._id}/user-role`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (roleRes.data.role) {
            setUserRole(roleRes.data.role);
          }
        } catch (roleErr) {
          console.log("Alternative role endpoint not available, using default");
        }
      }

    } catch (err) {
      console.error("Error fetching group members:", err);
      // On error, default to allowing messages
      setUserRole('member');
      setCanSendMessage(true);
    }
  };

  // CORRECTED: Fetch pending join requests (for admins/owners)
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

  // CORRECTED: Check if user is admin/owner
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

  useEffect(() => {
    if (isGroup && selectedChat) {
      fetchGroupMembers();
      if (isUserAdmin()) {
        fetchPendingRequests();
      }
    } else {
      // For private chats, always allow sending messages
      setCanSendMessage(true);
    }
  }, [selectedChat?._id, isGroup, userId]);

  useEffect(() => {
    if (!selectedChat?._id) return;

    const fetchMessages = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const endpoint = isGroup
          ? `${import.meta.env.VITE_API_URL}/chatroom/${selectedChat._id}/getGroupmessages`
          : `${import.meta.env.VITE_API_URL}/chatroom/messages/${selectedChat._id}`;

        const res = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setMessages(res.data.messages || []);
      } catch (err) {
        console.error("Error fetching messages:", err);
        setMessages([]);
      }
    };

    fetchMessages();

    socket.off("receive_message");
    socket.on("receive_message", (msg) => {
      if (isGroup) {
        if (msg.chatRoom?._id === selectedChat._id) setMessages((prev) => [...prev, msg]);
      } else {
        const senderId = msg.sender?._id || msg.senderId;
        if (senderId === selectedChat._id || senderId === userId) setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("typing_start", () => setIsTyping(true));
    socket.on("typing_stop", () => setIsTyping(false));
  }, [selectedChat?._id, isGroup, userId]);

  useEffect(() => {
    if (userId) socket.emit("join", userId);
  }, [userId]);

  useEffect(scrollToBottom, [messages]);

  const handleTyping = () => {
    socket.emit("typing_start", selectedChat._id);
    setTimeout(() => socket.emit("typing_stop", selectedChat._id), 1000);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !canSendMessage) return;

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
      setMessages((prev) => [...prev, sentMessage]);
      setNewMessage("");
      socket.emit("send_message", sentMessage);
      socket.emit("typing_stop", selectedChat._id);
    } catch (err) {
      console.error("Error sending message:", err);
      // If there's an error sending, show specific error message
      if (err.response?.status === 403) {
        toast.error("You don't have permission to send messages in this group");
        setCanSendMessage(false);
      }
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

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
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 backdrop-blur-sm">
      {/* Header - Fixed height */}
      <div className="h-20 flex-shrink-0 flex items-center justify-between px-6 bg-gradient-to-r from-purple-600 to-blue-600 backdrop-blur-xl border-b border-purple-500/30 shadow-lg z-10">
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
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
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
                  <span>{groupMembers.length} members</span>
                  {userRole && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getRoleColor(userRole)}`}>
                      {getRoleIcon(userRole)}
                      <span className="capitalize">{userRole}</span>
                    </span>
                  )}
                </div>
              ) : "Online"}
            </p>
          </div>
        </div>

        {/* Header Actions - Different icons based on chat type and user role */}
        <div className="flex items-center gap-2">
          {!isGroup ? (
            // Private Chat - Show User Profile Icon
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
            // Group Chat - Different icons based on user role
            <div className="relative" ref={menuRef}>
              {isUserAdmin() ? (
                // ADMIN/OWNER: Show Settings icon with dropdown menu
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
                  
                  {/* Admin Dropdown Menu */}
                  <AnimatePresence>
                    {showMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-500/30 py-2 z-50"
                      >
                        {/* Group Info */}
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
                        
                        {/* Admin Actions Section */}
                        <div className="px-3 py-2 text-xs font-semibold text-purple-300 uppercase tracking-wide border-b border-purple-500/20">
                          Admin Actions
                        </div>
                        
                        {/* Manage Members */}
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
                        
                        {/* Pending Requests */}
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
                        
                        {/* User Role Badge */}
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
                // REGULAR MEMBER: Show simple Group Info icon
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
                  {/* Avatar for received messages */}
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
                  
                  {/* Message Bubble */}
                  <div className="flex flex-col space-y-1">
                    {/* Sender name for group chats */}
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

      {/* CORRECTED: Input Area - Default to allowing messages */}
      <div className="h-20 flex-shrink-0 flex items-center gap-3 px-6 bg-gradient-to-r from-gray-800 to-gray-900 backdrop-blur-xl border-t border-purple-500/30 shadow-lg">
        {canSendMessage ? (
          <>
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
              disabled={!newMessage.trim()}
              className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg shadow-purple-500/25 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border-2 border-purple-400/30"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </>
        ) : (
          <div className="w-full flex items-center justify-center text-gray-400 italic text-sm bg-white/5 backdrop-blur-sm py-3 rounded-xl border border-white/10">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              You are not allowed to send messages in this group
            </div>
          </div>
        )}
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