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
  Pin
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
  onToggleGroupInfo 
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

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // ✅ FIXED: Safe user data handling
  const getUserData = () => {
    try {
      // Use prop first, then fallback to localStorage
      const user = currentUser || JSON.parse(localStorage.getItem("user") || "{}");
      const userId = user?._id || user?.id;
      
      if (!userId) {
        console.error('❌ No user ID available in ChatWindow');
        return { user: null, userId: null };
      }
      
      return { user, userId };
    } catch (error) {
      console.error('❌ Error getting user data in ChatWindow:', error);
      return { user: null, userId: null };
    }
  };

  const { user, userId } = getUserData();
  const token = getToken();
  
  // Determine if it's a group chat
  const isGroupChat = isGroup || selectedChat?.type === "group";

  // Socket event handlers
  useEffect(() => {
    if (!socket || !selectedChat) return;

    console.log("🔌 Setting up socket events for chat:", selectedChat._id);

    const handleNewMessage = (message) => {
      console.log("📨 New message received:", message);
      if (message.chatRoom === selectedChat._id) {
        setMessages(prev => [...prev, message]);
        markMessageAsRead(message._id);
      }
    };

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

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("message_read", handleMessageRead);
    socket.on("user_status_changed", handleUserStatusChange);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("message_read", handleMessageRead);
      socket.off("user_status_changed", handleUserStatusChange);
    };
  }, [socket, selectedChat, typingUsers.length]);

  // Load messages
  const loadMessages = useCallback(async (pageNum = 1) => {
    if (!selectedChat || !token) {
      console.log('❌ Missing selectedChat or token');
      return;
    }
    
    setLoading(true);
    try {
      console.log('📡 Loading messages for chat:', selectedChat._id);
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/chat/messages/${selectedChat._id}?page=${pageNum}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📨 API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('📦 Messages data:', data);

      if (data.success) {
        if (pageNum === 1) {
          setMessages(data.messages || []);
        } else {
          setMessages(prev => [...(data.messages || []), ...prev]);
        }
        setHasMoreMessages(data.hasMore || false);
        setPage(pageNum);
        
        console.log(`✅ Loaded ${data.messages?.length || 0} messages`);
      } else {
        toast.error(data.message || 'Failed to load messages');
      }
    } catch (error) {
      console.error("❌ Error loading messages:", error);
      toast.error("Failed to load messages: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedChat, token]);

  // Initial load and when chat changes
  useEffect(() => {
    if (selectedChat) {
      console.log("🔄 Chat changed, loading messages for:", selectedChat._id);
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !userId) {
      console.error('❌ Cannot send message: missing data', { 
        hasMessage: !!newMessage.trim(), 
        hasChat: !!selectedChat, 
        hasUserId: !!userId 
      });
      return;
    }

    const messageData = {
      chatRoomId: selectedChat._id,
      content: newMessage,
      replyTo: replyingTo?._id,
      userId: userId // ✅ FIXED: Include userId in message data
    };

    console.log("📤 Sending message:", messageData);

    try {
      socket.emit("send_message", messageData);
      setNewMessage("");
      setReplyingTo(null);
      socket.emit("typing_stop", selectedChat._id);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
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

    console.log("File selected:", file);
    // Handle file upload logic here
  };

  const getMessageStatus = (message) => {
    if (!message.sender || message.sender._id !== userId) return null;
    
    const readByCount = message.readBy?.length || 0;
    const participantCount = (selectedChat.participants?.length || 1) - 1;

    if (readByCount >= participantCount) {
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    } else if (readByCount > 0) {
      return <CheckCheck className="w-4 h-4 text-gray-400" />;
    } else {
      return <Check className="w-4 h-4 text-gray-400" />;
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

  // ✅ FIXED: Get other participant for private chats
  const getOtherParticipant = () => {
    if (!selectedChat?.participants || !userId) return null;
    
    if (isGroupChat) {
      return null; // Groups don't have a single "other" participant
    }
    
    // For private chats, find the participant who isn't the current user
    const otherParticipant = selectedChat.participants.find(
      p => String(p.user?._id || p.user) !== String(userId)
    );
    
    return otherParticipant?.user || null;
  };

  const otherParticipant = getOtherParticipant();

  if (!selectedChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <div className="text-3xl">💬</div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
            Welcome to Chat
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Select a conversation to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            ←
          </Button>
          
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={
                isGroupChat 
                  ? selectedChat.avatar 
                  : otherParticipant?.profilePicture
              } />
              <AvatarFallback>
                {isGroupChat 
                  ? selectedChat.name?.[0] 
                  : otherParticipant?.name?.[0]
                }
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {isGroupChat 
                  ? selectedChat.name 
                  : otherParticipant?.name || "Unknown User"
                }
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                {isGroupChat ? (
                  <span>{selectedChat.participants?.length || 0} members</span>
                ) : (
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      getOnlineStatus(otherParticipant) === "online" 
                        ? "bg-green-500" 
                        : "bg-gray-400"
                    }`} />
                    <span>
                      {getOnlineStatus(otherParticipant) === "online" 
                        ? "Online" 
                        : "Offline"
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <VideoIcon className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
          {isGroupChat && (
            <>
              <Button variant="ghost" size="icon" onClick={onToggleGroupInfo}>
                <Users className="h-5 w-5" />
              </Button>
              {/* Admin badge for group admins/owners */}
              {selectedChat.participants?.some(p => 
                String(p.user?._id || p.user) === String(userId) && 
                ["admin", "owner"].includes(p.role)
              ) && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900"
      >
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            <span className="ml-2 text-gray-500">Loading messages...</span>
          </div>
        )}
        
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.sender?._id === userId ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex space-x-2 max-w-[70%] ${message.sender?._id === userId ? "flex-row-reverse space-x-reverse" : ""}`}>
                {isGroupChat && message.sender?._id !== userId && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.sender?.profilePicture} />
                    <AvatarFallback>{message.sender?.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`flex flex-col space-y-1 ${message.sender?._id === userId ? "items-end" : "items-start"}`}>
                  {isGroupChat && message.sender?._id !== userId && (
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {message.sender?.name || "Unknown User"}
                    </span>
                  )}
                  
                  {replyingTo?._id === message._id && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-800">
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        Replying to {message.sender?._id === userId ? "yourself" : message.sender?.name}
                      </div>
                      <div className="text-sm truncate">{message.content}</div>
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      message.sender?._id === userId
                        ? "bg-blue-500 text-white rounded-br-md"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {message.replyTo && (
                      <div className={`text-xs border-l-2 pl-2 mb-1 ${
                        message.sender?._id === userId 
                          ? "border-blue-300 text-blue-100" 
                          : "border-gray-300 text-gray-500"
                      }`}>
                        Replying to: {message.replyTo.content}
                      </div>
                    )}
                    
                    <p className="text-sm">{message.content}</p>
                    
                    <div className={`flex items-center space-x-1 mt-1 ${
                      message.sender?._id === userId ? "justify-end" : "justify-start"
                    }`}>
                      <span className={`text-xs ${
                        message.sender?._id === userId 
                          ? "text-blue-200" 
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

        {/* Typing Indicator */}
        {isTyping && typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
          >
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
            </div>
            <span>
              {typingUsers.map(user => user.userName).join(", ")} 
              {typingUsers.length === 1 ? " is" : " are"} typing...
            </span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                Replying to {replyingTo.sender?._id === userId ? "yourself" : replyingTo.sender?.name}
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200 truncate">
                {replyingTo.content}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setReplyingTo(null)}
              className="h-8 w-8 text-blue-600 dark:text-blue-400"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile className="h-5 w-5" />
          </Button>

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
              placeholder="Type a message..."
              className="pr-12"
              disabled={!userId}
            />
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !userId}
            size="icon"
            className="bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

        {/* Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-20 left-4 z-50"
            >
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                width={350}
                height={400}
              />
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

      {/* Debug info */}
      {!userId && (
        <div className="bg-red-500 text-white p-2 text-center text-sm">
          ⚠️ User not authenticated - Cannot send messages
        </div>
      )}
    </div>
  );
};

export default ChatWindow;