// components/chat/ChatWindow.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { 
  Send, 
  Paperclip, 
  Smile, 
  Mic, 
  Image, 
  Video, 
  MoreVertical,
  Phone,
  VideoIcon,
  Search,
  Users,
  Crown,
  Shield,
  CheckCheck,
  Check,
  Clock,
  Reply,
  Trash2,
  Edit,
  Pin,
  Menu,
  ArrowLeft,
  Info,
  Zap,
  Star,
  Heart,
  ThumbsUp,
  Eye,
  MessageCircle,
  Settings,
  UserPlus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmojiPicker from "emoji-picker-react";
import { toast } from "sonner";
import { getToken } from "@/utils/getToken";

const ChatWindow = ({ 
  selectedChat, 
  currentUser, 
  onBack,
  socket,
  isGroup = false,
  onToggleGroupInfo,
  showGroupInfo = false
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [replyingTo, setReplyingTo] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [reactionPicker, setReactionPicker] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState("");

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const getUserData = () => {
    try {
      const user = currentUser || JSON.parse(localStorage.getItem("user") || "{}");
      const userId = user?._id || user?.id;
      return { user, userId };
    } catch (error) {
      return { user: null, userId: null };
    }
  };

  const { user, userId } = getUserData();
  const token = getToken();
  const isGroupChat = isGroup || selectedChat?.type === "group";

  // Real-time updates for messages and group members
  useEffect(() => {
    if (!socket || !selectedChat) return;

    // Message events
    const handleNewMessage = (message) => {
      if (message.chatRoom === selectedChat._id) {
        setMessages(prev => [...prev, message]);
        markMessageAsRead(message._id);
      }
    };

    const handleMessageUpdated = (updatedMessage) => {
      if (updatedMessage.chatRoom === selectedChat._id) {
        setMessages(prev => prev.map(msg => 
          msg._id === updatedMessage._id ? updatedMessage : msg
        ));
      }
    };

    const handleMessageDeleted = (data) => {
      if (data.chatRoomId === selectedChat._id) {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, deleted: true, content: "This message was deleted" }
            : msg
        ));
      }
    };

    // Group member events
    const handleMemberAdded = (data) => {
      if (data.groupId === selectedChat._id) {
        setGroupMembers(prev => {
          const exists = prev.some(m => m.user._id === data.newMember.user._id);
          if (!exists) {
            return [...prev, data.newMember];
          }
          return prev;
        });
        
        // Update selectedChat participants for immediate UI update
        if (selectedChat.participants) {
          const updatedChat = {
            ...selectedChat,
            participants: [...selectedChat.participants, data.newMember]
          };
          // You might want to pass this up to parent component
        }
        
        toast.success(`🎉 ${data.newMember.user.name} joined the group!`);
      }
    };

    const handleMemberRemoved = (data) => {
      if (data.groupId === selectedChat._id) {
        setGroupMembers(prev => prev.filter(m => m.user._id !== data.userId));
        toast.info(`👋 A member left the group`);
      }
    };

    const handleRoleUpdated = (data) => {
      if (data.groupId === selectedChat._id) {
        setGroupMembers(prev => prev.map(member =>
          member.user._id === data.userId 
            ? { ...member, role: data.newRole }
            : member
        ));
        
        if (data.userId === userId) {
          setCurrentUserRole(data.newRole);
        }
        
        toast.success(`🛡️ Role updated for a member`);
      }
    };

    // Typing events
    const handleUserTyping = (data) => {
      if (data.chatRoomId === selectedChat._id) {
        setTypingUsers(prev => {
          const newTypingUsers = prev.filter(user => user.userId !== data.userId);
          return [...newTypingUsers, { userId: data.userId, userName: data.userName }];
        });
        setIsTyping(true);
      }
    };

    const handleUserStopTyping = (data) => {
      if (data.chatRoomId === selectedChat._id) {
        setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
        if (typingUsers.length <= 1) {
          setIsTyping(false);
        }
      }
    };

    const handleMessageRead = (data) => {
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, readBy: [...(msg.readBy || []), { user: data.readBy, readAt: data.readAt }] }
          : msg
      ));
    };

    const handleUserStatusChange = (data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.isActive && data.status === "online") {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    };

    // Join the chat room
    socket.emit("join_chat", selectedChat._id);

    // Register all event listeners
    socket.on("new_message", handleNewMessage);
    socket.on("message_updated", handleMessageUpdated);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("member_added", handleMemberAdded);
    socket.on("member_removed", handleMemberRemoved);
    socket.on("role_updated", handleRoleUpdated);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("message_read", handleMessageRead);
    socket.on("user_status_changed", handleUserStatusChange);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_updated", handleMessageUpdated);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("member_added", handleMemberAdded);
      socket.off("member_removed", handleMemberRemoved);
      socket.off("role_updated", handleRoleUpdated);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("message_read", handleMessageRead);
      socket.off("user_status_changed", handleUserStatusChange);
    };
  }, [socket, selectedChat, typingUsers.length, userId]);

  // Load messages and group data
  const loadMessages = useCallback(async (pageNum = 1) => {
    if (!selectedChat || !token) return;
    
    setLoading(true);
    try {
      const [messagesRes, membersRes] = await Promise.all([
        fetch(
          `${import.meta.env.VITE_API_URL}/chatroom/messages/${selectedChat._id}?page=${pageNum}&limit=50`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        ),
        isGroupChat ? 
          fetch(
            `${import.meta.env.VITE_API_URL}/chatroom/${selectedChat._id}/members`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          ) : Promise.resolve(null)
      ]);

      if (!messagesRes.ok) throw new Error('Failed to fetch messages');
      const messagesData = await messagesRes.json();

      if (messagesData.success) {
        if (pageNum === 1) {
          setMessages(messagesData.messages || []);
        } else {
          setMessages(prev => [...(messagesData.messages || []), ...prev]);
        }
        setHasMoreMessages(messagesData.hasMore || false);
        setPage(pageNum);
      }

      // Load group members if it's a group chat
      if (isGroupChat && membersRes) {
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setGroupMembers(membersData.members || []);
          
          // Set current user role
          const currentMember = membersData.members?.find(m => 
            String(m.user._id) === String(userId)
          );
          if (currentMember) {
            setCurrentUserRole(currentMember.role);
          }
        }
      }

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [selectedChat, token, isGroupChat, userId]);

  // Initial load
  useEffect(() => {
    if (selectedChat) {
      setMessages([]);
      setPage(1);
      loadMessages(1);
    }
  }, [selectedChat, loadMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

// components/chat/ChatWindow.jsx - CORRECTED handleSendMessage
const handleSendMessage = async () => {
  if (!newMessage.trim() || !selectedChat || !userId) {
    console.error('❌ Cannot send message: missing data');
    return;
  }

  const messageData = {
    chatRoomId: selectedChat._id,
    content: newMessage,
    replyTo: replyingTo?._id,
    type: "text"
    // Remove userId - it comes from req.user.id in backend
  };

  console.log("📤 Sending message via REST API:", messageData);

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/chatroom/messages/send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send message');
    }

    const result = await response.json();
    
    if (result.success) {
      setNewMessage("");
      setReplyingTo(null);
      socket.emit("typing_stop", selectedChat._id);
      console.log("✅ Message sent successfully via REST API");
    } else {
      throw new Error(result.message);
    }
    
  } catch (error) {
    console.error("❌ Error sending message:", error);
    toast.error(error.message || "Failed to send message");
  }
};


  const handleTyping = () => {
    if (!selectedChat) return;

    socket.emit("typing_start", selectedChat._id);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing_stop", selectedChat._id);
    }, 3000);
  };

  const markMessageAsRead = (messageId) => {
    if (!selectedChat || !userId) return;
    socket.emit("message_read", { messageId, chatRoomId: selectedChat._id });
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    // Handle file upload logic here
  };

  const getMessageStatus = (message) => {
    if (!message.sender || message.sender._id !== userId) return null;
    
    const readByCount = message.readBy?.length || 0;
    const participantCount = (selectedChat.participants?.length || 1) - 1;

    if (readByCount >= participantCount) {
      return <CheckCheck className="w-3 h-3 lg:w-4 lg:h-4 text-blue-500" />;
    } else if (readByCount > 0) {
      return <CheckCheck className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400" />;
    } else {
      return <Check className="w-3 h-3 lg:w-4 lg:h-4 text-gray-400" />;
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getOnlineStatus = (user) => {
    if (!user || !user._id) return "offline";
    return onlineUsers.has(user._id) ? "online" : "offline";
  };

  const getOtherParticipant = () => {
    if (!selectedChat?.participants || !userId) return null;
    
    if (isGroupChat) {
      return null;
    }
    
    const otherParticipant = selectedChat.participants.find(
      p => String(p.user?._id || p.user) !== String(userId)
    );
    
    return otherParticipant?.user || null;
  };

  const isAdmin = currentUserRole === "admin" || currentUserRole === "owner";
  const otherParticipant = getOtherParticipant();

  if (!selectedChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center space-y-6 p-8 max-w-sm">
          <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-blue-400 to-purple-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
            <MessageCircle className="w-10 h-10 lg:w-12 lg:h-12 text-white" />
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white">
            Welcome to Chat
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Select a conversation to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center space-x-3 lg:space-x-4 flex-1 min-w-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack} 
            className="flex-shrink-0 md:hidden h-10 w-10 rounded-2xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-3 lg:space-x-4 flex-1 min-w-0">
            <Avatar className="h-12 w-12 lg:h-14 lg:w-14 border-2 border-white dark:border-gray-700 shadow-lg">
              <AvatarImage src={
                isGroupChat 
                  ? selectedChat.avatar 
                  : otherParticipant?.profilePicture
              } />
              <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-lg">
                {isGroupChat 
                  ? selectedChat.name?.[0] 
                  : otherParticipant?.name?.[0]
                }
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 dark:text-white text-lg lg:text-xl truncate">
                {isGroupChat 
                  ? selectedChat.name 
                  : otherParticipant?.name || "Unknown User"
                }
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                {isGroupChat ? (
                  <div className="flex items-center space-x-2">
                    <span className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{groupMembers.length || selectedChat.participants?.length || 0} members</span>
                    </span>
                    {isAdmin && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      getOnlineStatus(otherParticipant) === "online" 
                        ? "bg-green-500 animate-pulse" 
                        : "bg-gray-400"
                    }`} />
                    <span className="capitalize">
                      {getOnlineStatus(otherParticipant)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 lg:space-x-2 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
            <VideoIcon className="h-5 w-5" />
          </Button>
          {isGroupChat && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onToggleGroupInfo}
              className={`h-10 w-10 rounded-2xl ${
                showGroupInfo ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400' : ''
              }`}
            >
              <Users className="h-5 w-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Enhanced Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
          </div>
        ) : (
          <div className="p-4 lg:p-6 space-y-4 min-h-full">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${message.sender?._id === userId ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex space-x-3 max-w-[85%] lg:max-w-[70%] ${message.sender?._id === userId ? "flex-row-reverse space-x-reverse" : ""}`}>
                    {isGroupChat && message.sender?._id !== userId && (
                      <Avatar className="h-8 w-8 lg:h-10 lg:w-10 flex-shrink-0 border-2 border-white dark:border-gray-700 shadow-sm">
                        <AvatarImage src={message.sender?.profilePicture} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm">
                          {message.sender?.name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`flex flex-col space-y-2 ${message.sender?._id === userId ? "items-end" : "items-start"}`}>
                      {isGroupChat && message.sender?._id !== userId && (
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 px-2">
                          {message.sender?.name || "Unknown User"}
                        </span>
                      )}
                      
                      <div
                        className={`rounded-3xl px-4 lg:px-6 py-3 shadow-lg ${
                          message.sender?._id === userId
                            ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-2xl"
                            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-2xl border border-gray-100 dark:border-gray-700"
                        }`}
                      >
                        {message.replyTo && (
                          <div className={`text-xs border-l-2 pl-2 mb-2 ${
                            message.sender?._id === userId 
                              ? "border-indigo-300 text-indigo-100" 
                              : "border-gray-300 text-gray-500"
                          }`}>
                            Replying to: {message.replyTo.content}
                          </div>
                        )}
                        
                        <p className="text-sm lg:text-base leading-relaxed">
                          {message.content}
                        </p>
                        
                        <div className={`flex items-center space-x-2 mt-2 ${
                          message.sender?._id === userId ? "justify-end" : "justify-start"
                        }`}>
                          <span className={`text-xs ${
                            message.sender?._id === userId 
                              ? "text-indigo-200" 
                              : "text-gray-500"
                          }`}>
                            {formatTime(message.createdAt)}
                          </span>
                          {getMessageStatus(message)}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Enhanced Typing Indicator */}
            {isTyping && typingUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center space-x-3 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 max-w-max ml-4"
              >
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {typingUsers.map(user => user.userName).join(", ")} 
                  {typingUsers.length === 1 ? " is" : " are"} typing...
                </span>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Enhanced Reply Preview */}
      {replyingTo && (
        <div className="px-4 lg:px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-t border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <Reply className="h-3 w-3" />
                Replying to {replyingTo.sender?._id === userId ? "yourself" : replyingTo.sender?.name}
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200 truncate mt-1">
                {replyingTo.content}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setReplyingTo(null)}
              className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Enhanced Input Area */}
      <div className="p-4 lg:p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
        <div className="flex items-end space-x-3">
          <div className="flex space-x-1 lg:space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={isGroupChat ? "Message the group..." : "Type a message..."}
              className="h-12 lg:h-14 rounded-2xl text-base pr-16 bg-gray-50 dark:bg-gray-700 border-0 focus:ring-2 focus:ring-indigo-500/50"
              disabled={!userId}
            />
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !userId}
            size="icon"
            className="h-12 w-12 lg:h-14 lg:w-14 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 transition-all duration-300"
          >
            <Send className="h-5 w-5 lg:h-6 lg:w-6" />
          </Button>
        </div>

        {/* Enhanced Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-20 left-4 lg:left-6 z-50"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  width={320}
                  height={400}
                  theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileUpload}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
      />

      {/* Connection Status */}
      {!userId && (
        <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-3 text-center text-sm font-medium shadow-lg">
          ⚠️ Please log in to send messages
        </div>
      )}
    </div>
  );
};

export default ChatWindow;