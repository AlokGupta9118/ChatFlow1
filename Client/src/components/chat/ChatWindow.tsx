import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Info, X, Smile, Mic, Image } from "lucide-react";
import { getToken } from "@/utils/getToken";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Socket configuration
const createSocket = () => {
  return io(import.meta.env.VITE_API_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
};

const ChatWindow = ({ selectedChat, isGroup = false, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatRoomId, setCurrentChatRoomId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  const user = currentUser || JSON.parse(localStorage.getItem("user")) || {};
  const userId = user?._id;

  // ✅ Initialize socket connection
  useEffect(() => {
    if (!userId) {
      console.log('❌ No user ID available');
      toast.error("Please log in to use chat");
      return;
    }

    console.log('🔌 Initializing socket connection...');
    const newSocket = createSocket();
    socketRef.current = newSocket;
    setSocket(newSocket);

    const handleConnect = () => {
      console.log('✅ Socket connected');
      setIsConnected(true);
      
      // Authenticate user with socket
      newSocket.emit('authenticate', userId);
      toast.success("Connected to chat");
    };

    const handleDisconnect = () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
      toast.error("Disconnected from chat");
    };

    const handleConnectError = (error) => {
      console.error('❌ Socket connection error:', error);
      toast.error("Failed to connect to chat");
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);

    return () => {
      console.log('🧹 Cleaning up socket');
      newSocket.disconnect();
    };
  }, [userId]);

  // ✅ Fetch messages when chat changes
  const fetchMessages = useCallback(async () => {
    if (!selectedChat?._id || !userId) {
      console.log('❌ Cannot fetch messages: missing chat ID or user ID');
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('📋 Fetching messages for:', selectedChat._id);
      
      const endpoint = `${import.meta.env.VITE_API_URL}/chatroom/messages/${selectedChat._id}?isGroup=${isGroup}`;

      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });

      console.log('✅ Messages fetched:', res.data.messages?.length);
      
      const sortedMessages = (res.data.messages || []).sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      setMessages(sortedMessages);
      
      // Store chatRoomId for private chats
      if (!isGroup && res.data.chatRoomId) {
        setCurrentChatRoomId(res.data.chatRoomId);
        console.log('💾 Stored chatRoomId for private chat:', res.data.chatRoomId);
      } else if (isGroup) {
        setCurrentChatRoomId(selectedChat._id);
      }

    } catch (err) {
      console.error("❌ Error fetching messages:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to load messages");
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedChat?._id, isGroup, userId]);

  // ✅ Join/leave chat rooms when chat changes
  useEffect(() => {
    if (!socket || !isConnected || !selectedChat?._id || !userId) {
      console.log('⏳ Chat room joining delayed:', {
        socket: !!socket,
        connected: isConnected,
        selectedChat: !!selectedChat?._id,
        userId: !!userId
      });
      return;
    }

    const joinChatRoom = async () => {
      await fetchMessages();
      
      const roomData = {
        chatId: selectedChat._id,
        isGroup: isGroup,
        chatRoomId: currentChatRoomId
      };
      
      console.log('🚪 Joining chat room:', roomData);
      socket.emit('join_chat_room', roomData);
    };

    joinChatRoom();

    return () => {
      if (socket && isConnected && selectedChat?._id) {
        const leaveData = {
          chatId: selectedChat._id,
          isGroup: isGroup,
          chatRoomId: currentChatRoomId
        };
        console.log('🚪 Leaving chat room');
        socket.emit('leave_chat_room', leaveData);
        setTypingUsers(new Map()); // Clear typing indicators
      }
    };
  }, [socket, isConnected, selectedChat?._id, isGroup, currentChatRoomId, userId, fetchMessages]);

  // ✅ REAL-TIME: Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg) => {
      console.log('📨 Received real-time message:', msg._id, msg.content);
      
      setMessages(prev => {
        // Prevent duplicates
        const messageExists = prev.some(m => m._id === msg._id);
        if (messageExists) {
          console.log('🔄 Skipping duplicate message');
          return prev;
        }
        
        console.log('➕ Adding new message to state');
        return [...prev, msg];
      });
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket]);

  // ✅ REAL-TIME: Listen for typing indicators
  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = (data) => {
      console.log('⌨️ Typing event received:', data);
      
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        
        if (data.isTyping) {
          newMap.set(data.userId, data.userName || 'Someone');
          console.log('➕ Added typing user:', data.userName);
        } else {
          newMap.delete(data.userId);
          console.log('➖ Removed typing user');
        }
        
        return newMap;
      });
    };

    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket]);

  // ✅ Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typingUsers.size]);

  // ✅ TYPING: Handle typing events
  const handleTyping = useCallback(() => {
    if (!socket || !isConnected || !selectedChat?._id || !userId) {
      console.log('❌ Cannot emit typing: missing requirements');
      return;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing start
    const typingData = {
      chatId: selectedChat._id,
      isGroup: isGroup,
      chatRoomId: currentChatRoomId,
      userName: user.name || user.username || 'User'
    };

    console.log('⌨️ Emitting typing start');
    socket.emit('typing_start', typingData);

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      const stopData = {
        chatId: selectedChat._id,
        isGroup: isGroup,
        chatRoomId: currentChatRoomId
      };
      console.log('⌨️ Emitting typing stop');
      socket.emit('typing_stop', stopData);
      typingTimeoutRef.current = null;
    }, 2000);
  }, [socket, isConnected, selectedChat?._id, isGroup, userId, user, currentChatRoomId]);

  // ✅ Handle input change with typing indicator
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (value.trim() && socket && isConnected) {
      handleTyping();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ✅ Send message with optimistic update
  const handleSendMessage = async () => {
    const messageContent = newMessage.trim();
    if (!messageContent || !socket || !isConnected || isSending || !userId) {
      console.log('❌ Cannot send message: missing requirements');
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setIsSending(true);

    try {
      // Stop typing
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      socket.emit('typing_stop', {
        chatId: selectedChat._id,
        isGroup: isGroup,
        chatRoomId: currentChatRoomId
      });

      // Create optimistic message
      const tempMessageId = `temp_${Date.now()}`;
      const optimisticMessage = {
        _id: tempMessageId,
        content: messageContent,
        sender: {
          _id: userId,
          name: user.name || user.username,
          profilePicture: user.profilePicture
        },
        senderId: userId,
        createdAt: new Date().toISOString(),
        type: "text",
        isOptimistic: true
      };

      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage("");

      // Prepare message data
      const msgData = {
        receiverId: selectedChat._id,
        content: messageContent,
        isGroup: isGroup
      };

      const endpoint = `${import.meta.env.VITE_API_URL}/chatroom/messages/send`;

      console.log('📤 Sending message to backend:', msgData);

      // Send to backend
      const res = await axios.post(endpoint, msgData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });

      console.log('✅ Message sent successfully:', res.data.message._id);

      // Replace optimistic message with real one
      setMessages(prev => {
        const filtered = prev.filter(msg => msg._id !== tempMessageId);
        const exists = filtered.some(msg => msg._id === res.data.message._id);
        
        if (!exists) {
          return [...filtered, { ...res.data.message, status: 'delivered' }];
        }
        return filtered;
      });

      // Update chatRoomId if this is a new private chat
      if (!isGroup && res.data.chatRoomId) {
        setCurrentChatRoomId(res.data.chatRoomId);
      }

    } catch (err) {
      console.error("❌ Error sending message:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to send message");
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => !msg.isOptimistic));
    } finally {
      setIsSending(false);
    }
  };

  // ✅ Render typing indicator
  const renderTypingIndicator = () => {
    if (typingUsers.size === 0) return null;

    const typingArray = Array.from(typingUsers.values());
    let typingText = '';
    
    if (typingArray.length === 1) {
      typingText = `${typingArray[0]} is typing...`;
    } else if (typingArray.length === 2) {
      typingText = `${typingArray[0]} and ${typingArray[1]} are typing...`;
    } else {
      typingText = `${typingArray[0]} and ${typingArray.length - 1} others are typing...`;
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-start mb-4 px-4"
      >
        <div className="flex items-center gap-3 max-w-[80%]">
          <div className="px-4 py-3 rounded-2xl bg-blue-600 text-white rounded-bl-md border border-blue-400 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm font-medium">{typingText}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // ✅ Render message
  const renderMessage = (msg, idx) => {
    const senderId = msg.sender?._id || msg.senderId;
    const isSent = senderId?.toString() === userId?.toString();
    const isOptimistic = msg.isOptimistic;

    return (
      <motion.div
        key={msg._id || idx}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isSent ? "justify-end" : "justify-start"} mb-4 px-4`}
      >
        <div className={`flex items-end gap-3 max-w-[80%] ${isSent ? "flex-row-reverse" : ""}`}>
          
          {/* Avatar for received messages in groups */}
          {!isSent && isGroup && (
            <Avatar className="w-8 h-8">
              <AvatarImage src={msg.sender?.profilePicture} />
              <AvatarFallback className="bg-blue-600 text-white text-xs">
                {msg.sender?.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div className="flex flex-col space-y-1">
            {/* Sender name for groups */}
            {isGroup && !isSent && (
              <span className="text-xs font-semibold text-gray-300 px-1">
                {msg.sender?.name}
              </span>
            )}
            
            {/* Message bubble */}
            <div className={`px-4 py-3 rounded-2xl ${
              isSent
                ? `bg-blue-600 text-white rounded-br-md ${isOptimistic ? 'opacity-70' : ''}`
                : "bg-gray-700 text-white rounded-bl-md"
            }`}>
              <p className="leading-relaxed text-sm whitespace-pre-wrap break-words">
                {msg.content}
                {isOptimistic && <span className="ml-2 text-xs opacity-70">🕒</span>}
              </p>
              <p className={`text-xs mt-2 ${isSent ? 'text-blue-200' : 'text-gray-400'}`}>
                {new Date(msg.createdAt).toLocaleTimeString([], { 
                  hour: '2-digit', minute: '2-digit' 
                })}
                {isSent && !isOptimistic && <span className="ml-1">✓</span>}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-900">
        <div className="text-center space-y-6">
          <div className="text-4xl">💬</div>
          <h3 className="text-2xl font-bold text-white">Start a Conversation</h3>
          <p className="text-gray-400">Select a chat to begin messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      
      {/* Header */}
      <div className="h-20 flex-shrink-0 flex items-center justify-between px-6 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14">
            <AvatarImage src={selectedChat.profilePicture} />
            <AvatarFallback className="bg-purple-600 text-white">
              {selectedChat.name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-white">{selectedChat.name}</h3>
            <p className="text-gray-300 text-sm">
              {isGroup ? 'Group chat' : 'Online'}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
          isConnected 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-900 min-h-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="text-gray-400">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <div className="text-gray-400 text-center">
              <div className="text-2xl mb-2">💬</div>
              <p>No messages yet</p>
              <p className="text-sm">Start a conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {messages.map(renderMessage)}
            </AnimatePresence>
          </div>
        )}
        
        {/* Typing Indicator */}
        {renderTypingIndicator()}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="h-20 flex-shrink-0 flex items-center gap-3 px-6 bg-gray-800 border-t border-gray-700">
        <div className="flex-1 relative">
          <Input
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            disabled={isSending || !isConnected || isLoading}
            placeholder={!isConnected ? "Connecting..." : isSending ? "Sending..." : isLoading ? "Loading..." : "Type your message..."}
            className="w-full pl-4 pr-12 py-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-2xl focus:border-purple-400"
          />
        </div>
        
        <Button
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || !isConnected || isSending || isLoading}
          className="bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
          size="icon"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default ChatWindow;