import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Info, X, Smile, Mic, Image, File, User, Eye } from "lucide-react";
import { getToken } from "@/utils/getToken";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import GroupChatAdminPanel from "@/components/chat/GroupChatAdminPanel";

const socket = io("http://localhost:3000");
const nameColors = ["#F87171", "#60A5FA", "#34D399", "#FBBF24", "#A78BFA", "#F472B6"];

const ChatWindow = ({ selectedChat, isGroup = false, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [canSendMessage, setCanSendMessage] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [viewedProfile, setViewedProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const user = currentUser || JSON.parse(localStorage.getItem("user")) || {};
  const userId = user?._id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch user profile
  const fetchUserProfile = async (userId) => {
    const token = getToken();
    if (!token) return;

    setProfileLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:3000/api/profile/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setViewedProfile(res.data.user);
      setShowProfileModal(true);
    } catch (err) {
      console.error("Error fetching user profile:", err);
      alert("Failed to load profile");
    } finally {
      setProfileLoading(false);
    }
  };

  // View profile handler
  const handleViewProfile = (userData) => {
    if (!userData?._id) return;
    fetchUserProfile(userData._id);
  };

  // View current chat profile
  const handleViewChatProfile = () => {
    if (isGroup) {
      // For groups, show group info instead
      setShowAdminPanel(true);
    } else {
      // For individual chats, view the other user's profile
      handleViewProfile(selectedChat);
    }
  };

  useEffect(() => {
    if (!selectedChat?._id || !isGroup) return;

    const fetchMembers = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const res = await axios.get(
          `http://localhost:3000/chatroom/${selectedChat._id}/members`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const members = res.data.members || [];
        const isAllowed = members.some(
          (m) =>
            m.user._id === userId ||
            m.role === "admin" ||
            m.role === "owner"
        );

        setCanSendMessage(isAllowed);
      } catch (err) {
        console.error("Error fetching group members:", err);
        setCanSendMessage(false);
      }
    };

    fetchMembers();
  }, [selectedChat?._id, isGroup, userId]);

  useEffect(() => {
    if (!selectedChat?._id) return;

    const fetchMessages = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const endpoint = isGroup
          ? `http://localhost:3000/chatroom/${selectedChat._id}/getGroupmessages`
          : `http://localhost:3000/chatroom/messages/${selectedChat._id}`;

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

    // Typing indicators
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
        ? `http://localhost:3000/chatroom/${selectedChat._id}/sendGroupmessages`
        : "http://localhost:3000/chatroom/messages/send";

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
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-indigo-50/30 via-white to-purple-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900/20 relative">
      {/* Enhanced Header with Profile View */}
      <div className="h-20 flex items-center justify-between px-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar 
              className="w-14 h-14 shadow-lg border-2 border-white dark:border-gray-700 cursor-pointer hover:scale-105 transition-transform"
              onClick={handleViewChatProfile}
            >
              <AvatarImage src={selectedChat.profilePicture || selectedChat.avatar || "/default-avatar.png"} />
              <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold">
                {selectedChat.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <Eye className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="flex flex-col">
            <h3 
              className="text-lg font-bold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-indigo-600 transition-colors"
              onClick={handleViewChatProfile}
            >
              {selectedChat.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isTyping ? "typing..." : "Online"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isGroup && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleViewChatProfile}
              className="p-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/50 transition-all duration-200 shadow-sm"
              title="View Profile"
            >
              <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </motion.button>
          )}
          {isGroup && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAdminPanel(true)}
              className="p-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/50 transition-all duration-200 shadow-sm"
            >
              <Info className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Enhanced Messages Area - FIXED */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-transparent min-h-0"
        style={{ height: 'calc(100vh - 160px)' }}
      >
        <AnimatePresence>
          {messages.map((msg, idx) => {
            const senderId = msg.sender?._id || msg.senderId;
            const isSent = senderId?.toString() === userId?.toString();
            const nameColor = nameColors[senderId?.toString().charCodeAt(0) % nameColors.length];

            return (
              <motion.div
                key={msg._id || idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${isSent ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex items-end gap-3 max-w-[70%] ${isSent ? "flex-row-reverse" : ""}`}>
                  {!isSent && (
                    <div className="relative group">
                      <Avatar 
                        className="w-10 h-10 shadow-md border-2 border-white dark:border-gray-700 cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => handleViewProfile(msg.sender)}
                      >
                        <AvatarImage src={msg.sender?.profilePicture || "/default-avatar.png"} />
                        <AvatarFallback className="text-xs">
                          {msg.sender?.name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <Eye className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col space-y-1">
                    {isGroup && !isSent && (
                      <span 
                        className="text-xs font-semibold px-1 cursor-pointer hover:underline transition-all"
                        style={{ color: nameColor }}
                        onClick={() => handleViewProfile(msg.sender)}
                      >
                        {msg.sender?.name}
                      </span>
                    )}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className={`px-4 py-3 rounded-2xl shadow-sm backdrop-blur-sm border ${
                        isSent
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-md border-indigo-200"
                          : "bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 rounded-bl-md border-gray-200/50 dark:border-gray-700/50"
                      }`}
                    >
                      <p className="leading-relaxed">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isSent ? 'text-indigo-100' : 'text-gray-500'}`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-sm text-gray-500 px-4"
          >
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>{selectedChat.name} is typing...</span>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input Area */}
      {canSendMessage ? (
        <div className="h-20 flex items-center gap-3 px-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 shadow-lg">
          <div className="flex gap-1">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-3 text-gray-500 hover:text-indigo-500 transition-colors">
              <Paperclip className="w-5 h-5" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-3 text-gray-500 hover:text-indigo-500 transition-colors">
              <Image className="w-5 h-5" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-3 text-gray-500 hover:text-indigo-500 transition-colors">
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
              placeholder="Type a message..."
              className="w-full pl-4 pr-12 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm"
            />
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-indigo-500 transition-colors"
            >
              <Mic className="w-4 h-4" />
            </motion.button>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      ) : (
        <div className="h-20 flex items-center justify-center bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-500 italic text-sm border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            You are not allowed to send messages in this group
          </div>
        </div>
      )}

      {/* Profile View Modal */}
      <AnimatePresence>
        {showProfileModal && viewedProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  User Profile
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowProfileModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="w-24 h-24 border-4 border-indigo-100 dark:border-gray-700">
                    <AvatarImage 
                      src={viewedProfile.profilePicture || "/default-avatar.png"} 
                      onError={(e) => e.target.src = "/default-avatar.png"}
                    />
                    <AvatarFallback className="text-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                      {viewedProfile.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {viewedProfile.name}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                      @{viewedProfile.name?.toLowerCase().replace(/\s+/g, '')}
                    </p>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="space-y-4">
                  {viewedProfile.bio && (
                    <div>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Bio</h4>
                      <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        {viewedProfile.bio}
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Status</h4>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${viewedProfile.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {viewedProfile.status || 'offline'}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Last Seen</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {viewedProfile.lastSeen ? new Date(viewedProfile.lastSeen).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                  
                  {viewedProfile.email && (
                    <div>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Email</h4>
                      <p className="text-gray-600 dark:text-gray-400">{viewedProfile.email}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
                    Send Message
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Add Friend
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed Admin Panel Modal */}
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
              className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Group Settings - {selectedChat.name}
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAdminPanel(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="overflow-y-auto max-h-[60vh]">
                <GroupChatAdminPanel
                  group={selectedChat}
                  currentUser={currentUser}
                  refreshGroup={() => {}}
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