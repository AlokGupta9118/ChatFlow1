// ChatWindow.jsx - COMPLETE FIXED FRONTEND
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

// ✅ Enhanced socket configuration
const createSocket = () => {
  return io(import.meta.env.VITE_API_URL, {
    transports: ['websocket', 'polling'],
    upgrade: true,
    forceNew: false,
    timeout: 10000,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
};

// Color system for better UI differentiation
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
  const index = userId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % userColors.length;
  return userColors[index];
};

const ChatWindow = ({ selectedChat, isGroup = false, currentUser, onToggleGroupInfo }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [userRole, setUserRole] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [friendStatus, setFriendStatus] = useState('offline');
  const [friendLastSeen, setFriendLastSeen] = useState(null);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const menuRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  const user = currentUser || JSON.parse(localStorage.getItem("user")) || {};
  const userId = user?._id;

  // ✅ Enhanced Socket.IO connection management
  useEffect(() => {
    console.log('🔌 Initializing socket connection...');
    const newSocket = createSocket();
    socketRef.current = newSocket;
    setSocket(newSocket);

    const handleConnect = () => {
      console.log('✅ Socket.IO connected:', newSocket.id);
      setIsConnected(true);
      
      // Join user room after connection
      if (userId) {
        newSocket.emit('join_user', userId);
      }
    };

    const handleDisconnect = () => {
      console.log('❌ Socket.IO disconnected');
      setIsConnected(false);
    };

    const handleConnectError = (error) => {
      console.error('❌ Socket.IO connection error:', error);
      setIsConnected(false);
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);

    return () => {
      console.log('🧹 Cleaning up socket connection');
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('connect_error', handleConnectError);
      newSocket.disconnect();
    };
  }, []);

  // ✅ Join user room when connected and userId available
  useEffect(() => {
    if (socket && isConnected && userId) {
      console.log('👤 Joining user room:', userId);
      socket.emit('join_user', userId);
    }
  }, [socket, isConnected, userId]);

  // ✅ Enhanced chat room management
  useEffect(() => {
    if (!socket || !isConnected || !selectedChat?._id) return;

    const roomId = isGroup ? `group_${selectedChat._id}` : `private_${selectedChat._id}`;
    console.log('🚪 Joining chat room:', roomId);
    
    socket.emit('join_chat', roomId);

    // Clear typing users when changing chats
    setTypingUsers(new Map());

    return () => {
      console.log('🚪 Leaving chat room:', roomId);
      socket.emit('leave_chat', roomId);
      setTypingUsers(new Map());
    };
  }, [socket, isConnected, selectedChat?._id, isGroup]);

  // ✅ FIXED: Enhanced real-time message listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('👂 Setting up real-time message listeners');

    const handleReceiveMessage = (msg) => {
      console.log('📨 Received real-time message:', msg);
      
      setMessages(prev => {
        // Enhanced duplicate prevention
        const messageExists = prev.some(m => 
          m._id === msg._id || 
          (m.isRealTime && msg.isRealTime && m.content === msg.content && m.senderId === msg.senderId)
        );
        
        if (messageExists) {
          console.log('🔄 Skipping duplicate message');
          return prev;
        }
        
        const newMessage = {
          ...msg,
          displayTimestamp: new Date().toISOString()
        };
        
        return [...prev, newMessage];
      });
    };

    // ✅ FIXED: Typing indicator handler
    const handleUserTyping = (data) => {
      console.log('⌨️ Typing event received:', data);
      
      setTypingUsers(prev => {
        const newTypingUsers = new Map(prev);
        
        if (data.isTyping) {
          newTypingUsers.set(data.userId, {
            userName: data.userName,
            timestamp: data.timestamp
          });
        } else {
          newTypingUsers.delete(data.userId);
        }
        
        return newTypingUsers;
      });
    };

    // ✅ FIXED: User status changes
    const handleUserStatusChange = (data) => {
      console.log('🔔 User status change:', data);
      
      setOnlineUsers(prev => {
        const newOnlineUsers = new Set(prev);
        
        if (data.status === 'online') {
          newOnlineUsers.add(data.userId);
        } else {
          newOnlineUsers.delete(data.userId);
        }
        
        return newOnlineUsers;
      });

      // Update friend status for private chats
      if (!isGroup && data.userId === selectedChat?._id) {
        setFriendStatus(data.status);
        setFriendLastSeen(data.lastSeen);
      }

      // Update group members status if in group chat
      if (isGroup) {
        setGroupMembers(prev => 
          prev.map(member => {
            const memberId = member.user?._id || member.user;
            if (memberId === data.userId) {
              return {
                ...member,
                status: data.status,
                lastSeen: data.lastSeen
              };
            }
            return member;
          })
        );
      }
    };

    // Set up listeners
    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_status_change', handleUserStatusChange);

    // Clean up
    return () => {
      console.log('🧹 Cleaning up message listeners');
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_status_change', handleUserStatusChange);
      setTypingUsers(new Map());
    };
  }, [socket, isConnected, selectedChat?._id, isGroup]);

  // ✅ Enhanced message fetching
  const fetchMessages = useCallback(async () => {
    if (!selectedChat?._id) return;

    const token = getToken();
    if (!token) {
      console.error('❌ No token found');
      return;
    }

    try {
      console.log('📋 Fetching messages for chat:', selectedChat._id);
      
      const endpoint = isGroup
        ? `${import.meta.env.VITE_API_URL}/chatroom/${selectedChat._id}/getGroupmessages`
        : `${import.meta.env.VITE_API_URL}/chatroom/messages/${selectedChat._id}`;

      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });

      console.log('✅ Messages fetched:', res.data.messages?.length);
      
      const sortedMessages = (res.data.messages || []).sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      setMessages(sortedMessages);

    } catch (err) {
      console.error("❌ Error fetching messages:", err);
      if (err.response?.status === 404) {
        setMessages([]);
      } else {
        toast.error("Failed to load messages");
      }
    }
  }, [selectedChat?._id, isGroup]);

  // ✅ Enhanced group members fetch with online status
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
      setGroupMembers(members);

      // Set current user role
      const currentUserMember = members.find(m => {
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

  // ✅ Enhanced online status for private chats
  useEffect(() => {
    if (!isGroup && selectedChat?._id) {
      // For private chats, initially set as online (you can modify this based on your backend)
      setOnlineUsers(prev => new Set(prev).add(selectedChat._id));
      setFriendStatus('online');
    }
  }, [isGroup, selectedChat?._id]);

  // Initial data fetch
  useEffect(() => {
    fetchMessages();
    if (isGroup) {
      fetchGroupMembers();
    }
  }, [fetchMessages, isGroup]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers.size]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: "smooth",
      block: "end"
    });
  };

  // ✅ Enhanced typing handler with proper debouncing
  const handleTyping = useCallback(() => {
    if (!socket || !isConnected || !selectedChat?._id) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // ✅ FIXED: Emit typing start with correct data structure
    socket.emit("typing_start", {
      chatId: selectedChat._id,
      userId: userId,
      userName: user.name || 'User',
      isGroup: isGroup
    });

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing_stop", {
        chatId: selectedChat._id,
        userId: userId,
        userName: user.name || 'User',
        isGroup: isGroup
      });
    }, 1000);
  }, [socket, isConnected, selectedChat?._id, userId, isGroup, user.name]);

  // ✅ Get online members count for groups
  const getOnlineMembersCount = () => {
    if (!isGroup) return onlineUsers.has(selectedChat?._id) ? 1 : 0;
    
    return groupMembers.filter(member => {
      const memberId = member.user?._id || member.user;
      return onlineUsers.has(memberId?.toString());
    }).length;
  };

  // ✅ Get typing display text
  const getTypingDisplayText = () => {
    if (typingUsers.size === 0) return null;
    
    const typingArray = Array.from(typingUsers.values());
    
    if (typingUsers.size === 1) {
      return `${typingArray[0].userName} is typing...`;
    } else if (typingUsers.size === 2) {
      return `${typingArray[0].userName} and ${typingArray[1].userName} are typing...`;
    } else {
      return `${typingArray[0].userName} and ${typingUsers.size - 1} others are typing...`;
    }
  };

  // ✅ ULTRA-IMPROVED: Send message with optimistic UI update
  const handleSendMessage = async () => {
    const messageContent = newMessage.trim();
    if (!messageContent || !socket || !isConnected || isSending) return;

    const token = getToken();
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setIsSending(true);

    try {
      // ✅ Create optimistic message for immediate UI update
      const tempMessageId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const optimisticMessage = {
        _id: tempMessageId,
        sender: { _id: userId, name: user.name, profilePicture: user.profilePicture },
        senderId: userId,
        content: messageContent,
        createdAt: new Date().toISOString(),
        type: "text",
        isRealTime: true,
        status: 'sending',
        isOptimistic: true
      };

      // ✅ Immediately update UI with optimistic message
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage("");
      
      // ✅ Stop typing
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socket.emit("typing_stop", {
        chatId: selectedChat._id,
        userId: userId,
        userName: user.name || 'User',
        isGroup: isGroup
      });

      // ✅ Prepare API data
      const msgData = isGroup
        ? { 
            chatRoomId: selectedChat._id, 
            content: messageContent, 
            messageType: "text" 
          }
        : { 
            receiverId: selectedChat._id, 
            content: messageContent, 
            messageType: "text" 
          };

      const endpoint = isGroup
        ? `${import.meta.env.VITE_API_URL}/chatroom/${selectedChat._id}/sendGroupmessages`
        : `${import.meta.env.VITE_API_URL}/chatroom/messages/send`;

      // ✅ Send to backend
      const res = await axios.post(endpoint, msgData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });

      const sentMessage = res.data.message;
      console.log('✅ Message saved to DB:', sentMessage);

      // ✅ Replace optimistic message with real message
      setMessages(prev => 
        prev.map(msg => 
          msg._id === tempMessageId ? { ...sentMessage, status: 'sent' } : msg
        )
      );

      // ✅ Emit socket event for real-time delivery
      const roomId = isGroup ? `group_${selectedChat._id}` : `private_${selectedChat._id}`;
      socket.emit("send_message", {
        roomId: roomId,
        message: {
          ...sentMessage,
          senderId: userId,
          isRealTime: true
        },
        chatType: isGroup ? "group" : "private"
      });

    } catch (err) {
      console.error("❌ Error sending message:", err);
      
      // ✅ Update optimistic message to show error
      setMessages(prev => 
        prev.map(msg => 
          msg.isOptimistic ? { ...msg, status: 'error', error: true } : msg
        )
      );

      if (err.response?.status === 403) {
        toast.error("You don't have permission to send messages in this chat");
      } else if (err.code === 'NETWORK_ERROR' || !navigator.onLine) {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error("Failed to send message. Please try again.");
      }
    } finally {
      setIsSending(false);
    }
  };

  // ✅ Enhanced input handler
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  // ✅ Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ✅ Format time utility
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
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

  // ✅ Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-400";
      case "busy": return "bg-red-500";
      case "offline": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  // ✅ Get status text
  const getStatusText = (status) => {
    switch (status) {
      case "online": return "Online";
      case "away": return "Away";
      case "busy": return "Busy";
      case "offline": return "Offline";
      default: return "Offline";
    }
  };

  // ✅ Get role badge color
  const getRoleColor = (role) => {
    switch (role) {
      case "owner": return "bg-gradient-to-r from-amber-500 to-orange-500";
      case "admin": return "bg-gradient-to-r from-blue-500 to-cyan-500";
      default: return "bg-gradient-to-r from-gray-600 to-gray-700";
    }
  };

  // ✅ Get role icon
  const getRoleIcon = (role) => {
    switch (role) {
      case "owner": return <Crown className="w-3 h-3" />;
      case "admin": return <Shield className="w-3 h-3" />;
      default: return <Users className="w-3 h-3" />;
    }
  };

  // ✅ Connection status component
  const ConnectionStatus = () => (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`absolute top-2 right-2 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs backdrop-blur-sm border ${
        isConnected 
          ? 'bg-green-500/20 text-green-400 border-green-500/30' 
          : 'bg-red-500/20 text-red-400 border-red-500/30'
      }`}
    >
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
      {isConnected ? 'Connected' : 'Disconnected'}
    </motion.div>
  );

  // ✅ Render message function
  const renderMessage = (msg, idx) => {
    const senderId = msg.sender?._id || msg.senderId;
    const isSent = senderId?.toString() === userId?.toString();
    const userColor = getUserColor(senderId);
    const isSystem = msg.type === 'system';
    const isOptimistic = msg.isOptimistic;
    const hasError = msg.error;

    if (isSystem) {
      return (
        <motion.div
          key={msg._id || idx}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center my-4"
        >
          <div className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm rounded-full shadow-lg">
            <span className="font-medium">💬 {msg.content}</span>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={msg._id || idx}
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: hasError ? 0.7 : 1, 
          y: 0,
          scale: isOptimistic ? [0.95, 1] : 1
        }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`flex ${isSent ? "justify-end" : "justify-start"} ${hasError ? 'opacity-70' : ''}`}
      >
        <div className={`flex items-end gap-3 max-w-[80%] ${isSent ? "flex-row-reverse" : ""}`}>
          {/* Sender Avatar (only for received messages in groups) */}
          {!isSent && isGroup && (
            <div className="relative group flex-shrink-0">
              <Avatar 
                className="w-8 h-8 shadow-md border-2 border-white/30 cursor-pointer hover:scale-105 transition-transform"
              >
                <AvatarImage src={msg.sender?.profilePicture || "/default-avatar.png"} />
                <AvatarFallback className={`text-xs bg-gradient-to-r ${userColor} text-white`}>
                  {msg.sender?.name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
          
          <div className="flex flex-col space-y-1">
            {/* Sender Name (only for received messages in groups) */}
            {isGroup && !isSent && (
              <div className="flex items-center space-x-2 mb-1 px-1">
                <span className="text-xs font-semibold text-gray-300">
                  {msg.sender?.name}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${userColor}`}></div>
              </div>
            )}
            
            {/* Message Bubble */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              className={`relative px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm border ${
                isSent
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md border-blue-400/30"
                  : "bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-bl-md border-gray-600/30"
              } ${hasError ? 'border-red-400/50' : ''}`}
            >
              {/* Message Status Indicator */}
              {isSent && (
                <div className="absolute -top-1 -right-1">
                  {isOptimistic ? (
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                  ) : hasError ? (
                    <div className="w-3 h-3 bg-red-500 rounded-full" title="Failed to send"></div>
                  ) : (
                    <div className="w-3 h-3 bg-green-500 rounded-full" title="Sent"></div>
                  )}
                </div>
              )}
              
              <p className="leading-relaxed text-sm whitespace-pre-wrap break-words">
                {msg.content}
              </p>
              
              {/* Message Timestamp */}
              <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mt-2`}>
                <p className={`text-xs ${isSent ? 'text-blue-200' : 'text-gray-400'} flex items-center gap-1`}>
                  {formatTime(msg.createdAt)}
                  {isSent && !isOptimistic && !hasError && (
                    <span className="text-[10px]">✓</span>
                  )}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  };

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
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 backdrop-blur-sm relative">
      <ConnectionStatus />

      {/* Header with Online Status & Typing Indicators */}
      <div className="h-20 flex-shrink-0 flex items-center justify-between px-6 bg-gradient-to-r from-purple-600 to-blue-600 backdrop-blur-xl border-b border-purple-500/30 shadow-lg z-10">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar 
              className="w-14 h-14 shadow-lg border-2 border-white/30 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setShowAdminPanel(true)}
            >
              <AvatarImage src={selectedChat.profilePicture || selectedChat.avatar || "/default-avatar.png"} />
              <AvatarFallback className={`bg-gradient-to-r ${getUserColor(selectedChat._id)} text-white font-semibold`}>
                {selectedChat.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* Online Status Dot */}
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              isGroup 
                ? 'bg-indigo-500' 
                : onlineUsers.has(selectedChat._id) 
                  ? 'bg-green-500' 
                  : 'bg-gray-400'
            }`}></div>
          </div>
          
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-white">
              {selectedChat.name}
            </h3>
            
            {/* ✅ FIXED: Online Status & Typing Display */}
            <p className="text-blue-100 text-sm min-h-[20px]">
              {typingUsers.size > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-green-300"
                >
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="font-medium">{getTypingDisplayText()}</span>
                </motion.div>
              ) : (
                <div className="flex items-center gap-2">
                  {isGroup ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-400"></span>
                      <span>{getOnlineMembersCount()} online • {groupMembers.length} members</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(friendStatus)}`}></span>
                      <span className="capitalize">
                        {getStatusText(friendStatus)}
                        {friendStatus === 'offline' && friendLastSeen && (
                          <span className="ml-1 text-blue-200">
                            • {formatLastSeen(friendLastSeen)}
                          </span>
                        )}
                      </span>
                    </span>
                  )}
                  
                  {/* User Role Badge for Groups */}
                  {isGroup && userRole && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getRoleColor(userRole)} text-white`}>
                      {getRoleIcon(userRole)}
                      <span className="capitalize">{userRole}</span>
                    </span>
                  )}
                </div>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAdminPanel(true)}
            className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-200 shadow-sm"
            title={isGroup ? "Group Info" : "User Info"}
          >
            <Info className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-800/50 to-gray-900/50 min-h-0 custom-scrollbar"
      >
        <AnimatePresence>
          {messages.map(renderMessage)}
        </AnimatePresence>
        
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
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            disabled={isSending}
            placeholder={isSending ? "Sending..." : "Type your message..."}
            className="w-full pl-4 pr-12 py-3 bg-gray-700/50 border-2 border-purple-500/30 text-white placeholder-gray-400 rounded-2xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 backdrop-blur-sm transition-all disabled:opacity-50"
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
          disabled={!newMessage.trim() || !isConnected || isSending}
          className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg shadow-purple-500/25 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border-2 border-purple-400/30"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Send className="w-5 h-5" />
          )}
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
                  {isGroup ? 'Group Settings' : 'User Info'} - {selectedChat.name}
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
                {isGroup ? (
                  <GroupChatAdminPanel
                    group={selectedChat}
                    currentUser={currentUser}
                    refreshGroup={fetchGroupMembers}
                  />
                ) : (
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={selectedChat.profilePicture} />
                        <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-2xl">
                          {selectedChat.name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-2xl font-bold text-white">{selectedChat.name}</h3>
                        <p className="text-gray-300">
                          Status: {friendStatus} {friendStatus === 'offline' && friendLastSeen && `• Last seen ${formatLastSeen(friendLastSeen)}`}
                        </p>
                        <p className="text-gray-400 text-sm">Direct Message</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(168, 85, 247, 0.5) transparent;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
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