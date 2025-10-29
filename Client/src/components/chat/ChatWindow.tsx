import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    withCredentials: true,
    timeout: 10000,
  });
};

const ChatWindow = ({ selectedChat, isGroup = false, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentChatRoomId, setCurrentChatRoomId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const processedMessages = useRef(new Set());

  // Get user data
  const user = currentUser || JSON.parse(localStorage.getItem("user")) || {};
  const userId = user?._id;

  // ✅ Socket connection management
  useEffect(() => {
    if (!userId) {
      console.log('⏳ Waiting for user ID...');
      return;
    }

    console.log('🔌 Initializing socket connection...');
    const newSocket = createSocket();
    socketRef.current = newSocket;
    setSocket(newSocket);

    const handleConnect = () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
      
      // Authenticate with server
      newSocket.emit('authenticate', userId);
    };

    const handleDisconnect = () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);

    return () => {
      console.log('🧹 Cleaning up socket');
      newSocket.disconnect();
    };
  }, [userId]);

  // ✅ Fetch messages when chat changes
  const fetchMessages = useCallback(async () => {
    if (!selectedChat?._id || !userId) return;

    const token = getToken();
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    try {
      console.log('📋 Fetching messages for:', selectedChat._id);
      
      // Use the unified endpoint with isGroup parameter
      const endpoint = `${import.meta.env.VITE_API_URL}/chatroom/messages/${selectedChat._id}?isGroup=${isGroup}`;

      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const messages = res.data.messages || [];
      console.log(`✅ Loaded ${messages.length} messages`);
      
      setMessages(messages);
      processedMessages.current.clear();

      // Store chat room ID for private chats
      if (!isGroup && res.data.chatRoomId) {
        setCurrentChatRoomId(res.data.chatRoomId);
        console.log('💾 Stored chatRoomId:', res.data.chatRoomId);
      } else if (isGroup) {
        setCurrentChatRoomId(selectedChat._id);
      }

    } catch (err) {
      console.error("❌ Error fetching messages:", err);
      toast.error("Failed to load messages");
    }
  }, [selectedChat?._id, isGroup, userId]);

  // ✅ Load messages when selected chat changes
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // ✅ Join chat room when socket is ready
  useEffect(() => {
    if (!socket || !isConnected || !selectedChat?._id || !userId) {
      console.log('⏳ Waiting to join room:', {
        socket: !!socket,
        connected: isConnected,
        selectedChat: selectedChat?._id,
        userId: !!userId
      });
      return;
    }

    const joinChatRoom = () => {
      const roomData = {
        chatId: selectedChat._id,
        isGroup: isGroup,
        chatRoomId: currentChatRoomId
      };
      
      console.log('🚪 Joining chat room:', roomData);
      socket.emit('join_chat_room', roomData);
    };

    // Small delay to ensure socket is ready
    const timeoutId = setTimeout(joinChatRoom, 100);
    
    return () => {
      clearTimeout(timeoutId);
      setTypingUsers(new Map());
    };
  }, [socket, isConnected, selectedChat?._id, isGroup, currentChatRoomId, userId]);

  // ✅ Real-time message listener
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      console.log('📨 Received real-time message:', message._id, message.content);
      
      // Prevent duplicates
      if (processedMessages.current.has(message._id)) {
        console.log('🔄 Skipping duplicate message');
        return;
      }

      processedMessages.current.add(message._id);
      
      setMessages(prev => {
        // Check if message already exists
        if (prev.some(m => m._id === message._id)) {
          return prev;
        }
        console.log('➕ Adding new message to state');
        return [...prev, message];
      });
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket]);

  // ✅ Typing indicators listener
  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = (data) => {
      console.log('⌨️ Typing event:', data);
      
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        
        if (data.isTyping) {
          newMap.set(data.userId, data.userName || 'Someone');
          console.log('➕ Added typing user:', data.userName);
        } else {
          newMap.delete(data.userId);
          console.log('➖ Removed typing user');
        }
        
        console.log('📊 Current typing users:', Array.from(newMap.entries()));
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers.size]);

  // ✅ Typing handler
  const handleTyping = useCallback(() => {
    if (!socket || !isConnected || !selectedChat?._id || !userId) {
      console.log('❌ Cannot emit typing: Missing requirements');
      return;
    }

    // Clear previous timeout
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

    console.log('🎯 Emitting typing start');
    socket.emit('typing_start', typingData);

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      console.log('🎯 Emitting typing stop');
      socket.emit('typing_stop', typingData);
    }, 2000);
  }, [socket, isConnected, selectedChat?._id, isGroup, currentChatRoomId, userId, user]);

  // ✅ Send message
  const handleSendMessage = async () => {
    const messageContent = newMessage.trim();
    if (!messageContent || !socket || !isConnected || isSending || !userId) {
      console.log('❌ Cannot send message: Missing requirements');
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

      // Prepare message data
      const messageData = {
        receiverId: selectedChat._id,
        content: messageContent,
        messageType: "text",
        isGroup: isGroup
      };

      const endpoint = `${import.meta.env.VITE_API_URL}/chatroom/messages/send`;

      console.log('📤 Sending message to backend');
      const res = await axios.post(endpoint, messageData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('✅ Message sent successfully:', res.data.message._id);
      setNewMessage("");
      
      // The message will be added via socket from backend

    } catch (err) {
      console.error("❌ Error sending message:", err);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // ✅ Input handlers
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

  // ✅ Render message
  const renderMessage = (message) => {
    const isSent = message.sender?._id === userId;
    const isSystem = message.type === 'system';

    if (isSystem) {
      return (
        <div key={message._id} className="flex justify-center my-2">
          <div className="px-3 py-1 bg-gray-600 rounded-full text-xs text-gray-300">
            {message.content}
          </div>
        </div>
      );
    }

    return (
      <motion.div
        key={message._id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isSent ? "justify-end" : "justify-start"} mb-3`}
      >
        <div className={`flex items-end gap-2 max-w-[70%] ${isSent ? "flex-row-reverse" : ""}`}>
          {!isSent && isGroup && (
            <Avatar className="w-8 h-8">
              <AvatarImage src={message.sender?.profilePicture} />
              <AvatarFallback className="text-xs">
                {message.sender?.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div className={`px-4 py-2 rounded-2xl ${
            isSent 
              ? "bg-blue-600 text-white rounded-br-md" 
              : "bg-gray-700 text-white rounded-bl-md"
          }`}>
            {isGroup && !isSent && (
              <div className="text-xs font-semibold text-blue-200 mb-1">
                {message.sender?.name}
              </div>
            )}
            <p className="text-sm">{message.content}</p>
            <div className={`text-xs mt-1 ${isSent ? 'text-blue-200' : 'text-gray-400'}`}>
              {new Date(message.createdAt).toLocaleTimeString([], { 
                hour: '2-digit', minute: '2-digit' 
              })}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // ✅ Typing indicator
  const getTypingText = () => {
    const typingArray = Array.from(typingUsers.entries());
    if (typingArray.length === 0) return null;
    
    if (typingArray.length === 1) {
      return `${typingArray[0][1]} is typing...`;
    } else if (typingArray.length === 2) {
      return `${typingArray[0][1]} and ${typingArray[1][1]} are typing...`;
    } else {
      return `${typingArray.length} people are typing...`;
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl text-white mb-2">Select a chat</h3>
          <p className="text-gray-400">Choose a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={selectedChat.profilePicture || selectedChat.avatar} />
            <AvatarFallback>
              {selectedChat.name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-white">{selectedChat.name}</h3>
            <p className="text-sm text-gray-400">
              {isGroup ? `${selectedChat.participants?.length || 0} members` : 'Online'}
              {typingUsers.size > 0 && ' • ' + getTypingText()}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
        {messages.map(renderMessage)}
        
        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm text-gray-400 mb-3"
          >
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            {getTypingText()}
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-gray-800 p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={!isConnected ? "Connecting..." : "Type a message..."}
            disabled={!isConnected || isSending}
            className="flex-1 bg-gray-700 border-gray-600 text-white"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !isConnected || isSending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          <span>
            {isGroup ? 'Group Chat' : 'Private Chat'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;