// components/chat/ChatWindow.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
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
import { toast } from "sonner";
import { getToken } from "@/utils/getToken";

const ChatWindow = ({ 
  selectedChat, 
  currentUser, 
  onBack,
  socket 
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

  const isGroup = selectedChat?.type === "group";
   const token = getToken();
  // Socket event handlers
  useEffect(() => {
    if (!socket || !selectedChat) return;

    const handleNewMessage = (message) => {
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
    if (!selectedChat) return;
    
    setLoading(true);
    try {
     
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/chat/messages/${token}?page=${pageNum}&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        if (pageNum === 1) {
          setMessages(data.messages);
        } else {
          setMessages(prev => [...data.messages, ...prev]);
        }
        setHasMoreMessages(data.hasMore);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [selectedChat]);

  // Initial load and when chat changes
  useEffect(() => {
    if (selectedChat) {
      setMessages([]);
      setPage(1);
      loadMessages(1);
      
      // Join chat room
      socket?.emit("join_chat", selectedChat._id);
    }
  }, [selectedChat, socket, loadMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    const messageData = {
      chatRoomId: selectedChat._id,
      content: newMessage,
      replyTo: replyingTo?._id,
    };

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
    socket.emit("message_read", { messageId, chatRoomId: selectedChat._id });
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Handle file upload logic here
    console.log("File selected:", file);
    // You would typically upload to cloud storage and get URL
  };

  const getMessageStatus = (message) => {
    if (message.sender._id !== currentUser._id) return null;
    
    const readByCount = message.readBy?.length || 0;
    const participantCount = selectedChat.participants.length - 1; // Exclude self

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
    return onlineUsers.has(user._id) ? "online" : "offline";
  };

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
              <AvatarImage src={selectedChat.avatar || selectedChat.participants?.[0]?.user?.profilePicture} />
              <AvatarFallback>
                {selectedChat.name?.[0] || selectedChat.participants?.[0]?.user?.name?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {selectedChat.name || selectedChat.participants?.find(p => p.user._id !== currentUser._id)?.user?.name}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                {isGroup ? (
                  <span>{selectedChat.participants?.length} members</span>
                ) : (
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      getOnlineStatus(selectedChat.participants?.find(p => p.user._id !== currentUser._id)?.user) === "online" 
                        ? "bg-green-500" 
                        : "bg-gray-400"
                    }`} />
                    <span>
                      {getOnlineStatus(selectedChat.participants?.find(p => p.user._id !== currentUser._id)?.user) === "online" 
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
          {isGroup && (
            <Button variant="ghost" size="icon">
              <Users className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900"
      >
        {loading && <div className="text-center">Loading messages...</div>}
        
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.sender._id === currentUser._id ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex space-x-2 max-w-[70%] ${message.sender._id === currentUser._id ? "flex-row-reverse space-x-reverse" : ""}`}>
                {isGroup && message.sender._id !== currentUser._id && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.sender.profilePicture} />
                    <AvatarFallback>{message.sender.name[0]}</AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`flex flex-col space-y-1 ${message.sender._id === currentUser._id ? "items-end" : "items-start"}`}>
                  {isGroup && message.sender._id !== currentUser._id && (
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {message.sender.name}
                    </span>
                  )}
                  
                  {replyingTo?._id === message._id && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-800">
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        Replying to {message.sender._id === currentUser._id ? "yourself" : message.sender.name}
                      </div>
                      <div className="text-sm truncate">{message.content}</div>
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      message.sender._id === currentUser._id
                        ? "bg-blue-500 text-white rounded-br-md"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {message.replyTo && (
                      <div className={`text-xs border-l-2 pl-2 mb-1 ${
                        message.sender._id === currentUser._id 
                          ? "border-blue-300 text-blue-100" 
                          : "border-gray-300 text-gray-500"
                      }`}>
                        Replying to: {message.replyTo.content}
                      </div>
                    )}
                    
                    <p className="text-sm">{message.content}</p>
                    
                    <div className={`flex items-center space-x-1 mt-1 ${
                      message.sender._id === currentUser._id ? "justify-end" : "justify-start"
                    }`}>
                      <span className={`text-xs ${
                        message.sender._id === currentUser._id 
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
                Replying to {replyingTo.sender._id === currentUser._id ? "yourself" : replyingTo.sender.name}
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
            />
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            size="icon"
            className="bg-blue-500 hover:bg-blue-600 text-white"
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