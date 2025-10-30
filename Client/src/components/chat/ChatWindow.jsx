// components/chat/ChatWindow.jsx
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { 
  Send, 
  Paperclip, 
  Smile, 
  Mic, 
  Image, 
  MoreVertical,
  Phone,
  VideoIcon,
  Search,
  Users,
  Crown,
  Shield,
  CheckCheck,
  Check,
  Reply,
  Trash2,
  Edit,
  Pin,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Initialize socket
const socket = io(import.meta.env.VITE_API_URL);

const ChatWindow = ({ 
  selectedChat, 
  isGroup = false, 
  currentUser, 
  onToggleGroupInfo 
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ✅ SAFE: Get chat ID with null checks
  const chatId = selectedChat?._id;
  const isGroupChat = isGroup;

  // Debug logging
  useEffect(() => {
    console.log("🔍 ChatWindow Debug:", {
      selectedChat,
      chatId,
      isGroup: isGroupChat,
      currentUser: currentUser?._id,
      hasParticipants: selectedChat?.participants,
      participantsCount: selectedChat?.participants?.length
    });
  }, [selectedChat, chatId, isGroupChat, currentUser]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !chatId) return;

    console.log("🎯 Setting up socket events for chat:", chatId);

    const handleNewMessage = (message) => {
      console.log("📨 New message received:", message);
      if (message.chatRoom === chatId || message.chatRoomId === chatId) {
        setMessages(prev => [...prev, message]);
        markMessageAsRead(message._id);
      }
    };

    const handleUserTyping = (data) => {
      console.log("⌨️ User typing:", data);
      if (data.chatRoomId === chatId) {
        setTypingUsers(prev => {
          const newTypingUsers = prev.filter(user => user.userId !== data.userId);
          return [...newTypingUsers, { userId: data.userId, userName: data.userName }];
        });
        setIsTyping(true);
      }
    };

    const handleUserStopTyping = (data) => {
      console.log("💤 User stopped typing:", data);
      if (data.chatRoomId === chatId) {
        setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
        if (typingUsers.length <= 1) {
          setIsTyping(false);
        }
      }
    };

    const handleMessageRead = (data) => {
      console.log("📖 Message read:", data);
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { 
              ...msg, 
              readBy: [...(msg.readBy || []), { 
                user: data.readBy, 
                readAt: data.readAt 
              }] 
            }
          : msg
      ));
    };

    const handleUserStatusChange = (data) => {
      console.log("🔵 User status changed:", data);
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

    // Join chat room
    socket.emit("join_chat", chatId);

    // Set up event listeners
    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("message_read", handleMessageRead);
    socket.on("user_status_changed", handleUserStatusChange);

    return () => {
      console.log("🧹 Cleaning up socket events for chat:", chatId);
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("message_read", handleMessageRead);
      socket.off("user_status_changed", handleUserStatusChange);
    };
  }, [socket, chatId, typingUsers.length]);

  // Load messages when chat changes
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    loadMessages();
  }, [chatId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    if (!chatId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/chatroom/messages/${chatId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        console.log("📥 Loaded messages:", data.messages?.length);
        setMessages(data.messages || []);
      } else {
        toast.error("Failed to load messages");
      }
    } catch (error) {
      console.error("❌ Error loading messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatId) {
      console.log("🚫 Cannot send message - no content or chat ID");
      return;
    }

    const messageData = {
      chatRoomId: chatId,
      content: newMessage,
      replyTo: replyingTo?._id,
    };

    console.log("📤 Sending message:", messageData);

    try {
      socket.emit("send_message", messageData);
      setNewMessage("");
      setReplyingTo(null);
      socket.emit("typing_stop", chatId);
    } catch (error) {
      console.error("❌ Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleTyping = () => {
    if (!chatId) return;

    socket.emit("typing_start", chatId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing_stop", chatId);
    }, 3000);
  };

  const markMessageAsRead = (messageId) => {
    if (!chatId || !messageId) return;
    socket.emit("message_read", { messageId, chatRoomId: chatId });
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log("📎 File selected:", file);
    toast.info("File upload feature coming soon!");
  };

  // ✅ SAFE: Get message status with null checks
  const getMessageStatus = (message) => {
    if (!message?.sender || !currentUser) return null;
    
    const senderId = message.sender._id || message.sender;
    if (senderId !== currentUser._id) return null;
    
    const readByCount = message.readBy?.length || 0;
    const participantCount = (selectedChat?.participants?.length || 1) - 1;

    if (readByCount >= participantCount) {
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    } else if (readByCount > 0) {
      return <CheckCheck className="w-4 h-4 text-gray-400" />;
    } else {
      return <Check className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ✅ SAFE: Get online status with null checks
  const getOnlineStatus = (user) => {
    if (!user?._id) return "offline";
    return onlineUsers.has(user._id) ? "online" : "offline";
  };

  // ✅ SAFE: Get other participant for direct chats
  const getOtherParticipant = () => {
    if (!selectedChat?.participants || !currentUser) return null;
    
    return selectedChat.participants.find(
      participant => {
        const participantId = participant.user?._id || participant.user;
        return participantId !== currentUser._id;
      }
    );
  };

  const otherParticipant = getOtherParticipant();

  if (!selectedChat || !chatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <div className="text-3xl">💬</div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
            Select a Chat
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a conversation from the sidebar to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={
                  isGroupChat 
                    ? selectedChat.avatar 
                    : otherParticipant?.user?.profilePicture
                } 
              />
              <AvatarFallback>
                {isGroupChat 
                  ? selectedChat.name?.[0] 
                  : otherParticipant?.user?.name?.[0]
                }
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {isGroupChat 
                  ? selectedChat.name 
                  : otherParticipant?.user?.name
                }
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                {isGroupChat ? (
                  <span>{selectedChat.participants?.length || 0} members</span>
                ) : (
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      getOnlineStatus(otherParticipant?.user) === "online" 
                        ? "bg-green-500" 
                        : "bg-gray-400"
                    }`} />
                    <span>
                      {getOnlineStatus(otherParticipant?.user) === "online" 
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
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onToggleGroupInfo}
            >
              <Info className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900"
      >
        {loading && (
          <div className="text-center text-gray-500 dark:text-gray-400">
            Loading messages...
          </div>
        )}
        
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${
                message.sender?._id === currentUser?._id || message.sender === currentUser?._id 
                  ? "justify-end" 
                  : "justify-start"
              }`}
            >
              <div className={`flex space-x-2 max-w-[70%] ${
                message.sender?._id === currentUser?._id || message.sender === currentUser?._id 
                  ? "flex-row-reverse space-x-reverse" 
                  : ""
              }`}>
                {(isGroupChat && (message.sender?._id !== currentUser?._id && message.sender !== currentUser?._id)) && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.sender?.profilePicture} />
                    <AvatarFallback>
                      {message.sender?.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`flex flex-col space-y-1 ${
                  message.sender?._id === currentUser?._id || message.sender === currentUser?._id 
                    ? "items-end" 
                    : "items-start"
                }`}>
                  {isGroupChat && (message.sender?._id !== currentUser?._id && message.sender !== currentUser?._id) && (
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {message.sender?.name}
                    </span>
                  )}
                  
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      message.sender?._id === currentUser?._id || message.sender === currentUser?._id
                        ? "bg-blue-500 text-white rounded-br-md"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    
                    <div className={`flex items-center space-x-1 mt-1 ${
                      message.sender?._id === currentUser?._id || message.sender === currentUser?._id 
                        ? "justify-end" 
                        : "justify-start"
                    }`}>
                      <span className={`text-xs ${
                        message.sender?._id === currentUser?._id || message.sender === currentUser?._id
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
            />
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
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
    </div>
  );
};

export default ChatWindow;