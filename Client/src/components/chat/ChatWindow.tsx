// components/chat/ChatWindow.jsx - SIMPLIFIED DEBUG VERSION
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Info, X, Smile, Mic, Image, User, Eye, MoreVertical, Settings, Users, Crown, Shield } from "lucide-react";
import { getToken } from "@/utils/getToken";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import GroupChatAdminPanel from "@/components/chat/GroupChatAdminPanel";
import { toast } from "sonner";

const socket = io(import.meta.env.VITE_API_URL);

// In your ChatWindow component, add this auto-detection:
const ChatWindow = ({ selectedChat, isGroup = false, currentUser, onToggleGroupInfo }) => {
  // Auto-detect if it's a group if the prop is wrong
  const detectedIsGroup = isGroup || (Array.isArray(selectedChat?.participants) && selectedChat.participants.length > 0);
  
  console.log("🚀 ChatWindow DEBUG - Props:", { 
    selectedChat: selectedChat?.name, 
    isGroupProp: isGroup,
    detectedIsGroup,
    hasParticipants: !!selectedChat?.participants 
  });

  // Use detectedIsGroup instead of isGroup in your component
  // ... rest of your component


  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);

  const user = currentUser || JSON.parse(localStorage.getItem("user")) || {};
  const userId = user?._id;

  // Fetch group members and user role
  const fetchGroupMembers = async () => {
    if (!selectedChat?._id || !isGroup) {
      console.log("❌ fetchGroupMembers skipped - missing selectedChat._id or isGroup is false");
      return;
    }

    const token = getToken();
    if (!token) return;

    try {
      console.log("🔄 Fetching group members for:", selectedChat._id);
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/chatroom/${selectedChat._id}/members`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const members = res.data.members || [];
      setGroupMembers(members);
      console.log("✅ Group members fetched:", members.length);

      // Find current user's role
      const currentUserMember = members.find(m => 
        String(m.user?._id) === String(userId) || String(m.user) === String(userId)
      );
      
      if (currentUserMember) {
        setUserRole(currentUserMember.role);
        console.log("🎯 User role found:", currentUserMember.role);
      } else {
        setUserRole(null);
        console.log("❌ User not found in group members");
      }

    } catch (err) {
      console.error("Error fetching group members:", err);
    }
  };

  // Check if user is admin/owner
  const isUserAdmin = () => {
    const isAdmin = userRole === 'admin' || userRole === 'owner';
    console.log("🔍 isUserAdmin check:", { userRole, isAdmin });
    return isAdmin;
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
    console.log("🔄 useEffect triggered", { isGroup, selectedChat: selectedChat?._id });
    if (isGroup && selectedChat) {
      fetchGroupMembers();
    }
  }, [selectedChat?._id, isGroup, userId]);

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

  if (!selectedChat) {
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
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 backdrop-blur-sm">
      {/* Header - Fixed height */}
      <div className="h-20 flex-shrink-0 flex items-center justify-between px-6 bg-gradient-to-r from-purple-600 to-blue-600 backdrop-blur-xl border-b border-purple-500/30 shadow-lg z-10">
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14 shadow-lg border-2 border-white/30">
            <AvatarImage src={selectedChat.profilePicture || selectedChat.avatar || "/default-avatar.png"} />
            <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold">
              {selectedChat.name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-white">
              {selectedChat.name}
            </h3>
            <p className="text-blue-100 text-sm">
              {isGroup ? (
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

        {/* DEBUG: Header Actions */}
        <div className="flex items-center gap-2">
          <div className="text-white text-xs bg-black/50 p-1 rounded">
            isGroup: {isGroup ? "✅" : "❌"}
          </div>
          
          {!isGroup ? (
            // Private Chat - Show User Profile Icon
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => console.log("Private chat profile clicked")}
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
                    onClick={() => {
                      console.log("🎯 Settings button clicked - User is admin!");
                      setShowMenu(!showMenu);
                    }}
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
                        <button
                          onClick={() => {
                            console.log("Opening admin panel");
                            setShowAdminPanel(true);
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-white hover:bg-purple-600/30 transition-colors flex items-center gap-3"
                        >
                          <Settings className="w-4 h-4" />
                          Open Admin Panel
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                // REGULAR MEMBER: Show simple Group Info icon
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    console.log("👥 Group Info button clicked - Regular member");
                    setShowAdminPanel(true);
                  }}
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

      {/* Simple Messages Area for Testing */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-white text-center py-8">
          <p>Chat with: {selectedChat.name}</p>
          <p>isGroup: {isGroup ? "YES" : "NO"}</p>
          <p>User Role: {userRole || "Not set"}</p>
          <p>Group Members: {groupMembers.length}</p>
          <p>isUserAdmin: {isUserAdmin() ? "YES" : "NO"}</p>
        </div>
      </div>

      {/* Simple Input Area */}
      <div className="h-20 flex-shrink-0 flex items-center gap-3 px-6 bg-gradient-to-r from-gray-800 to-gray-900 backdrop-blur-xl border-t border-purple-500/30 shadow-lg">
        <div className="flex-1 relative">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full pl-4 pr-12 py-3 bg-gray-700/50 border-2 border-purple-500/30 text-white placeholder-gray-400 rounded-2xl backdrop-blur-sm"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg shadow-purple-500/25"
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
    </div>
  );
};

export default ChatWindow;