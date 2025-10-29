import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Info, X, Smile, Mic, Image } from "lucide-react";
import { getToken } from "@/utils/getToken";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import GroupChatAdminPanel from "@/components/chat/GroupChatAdminPanel";
import { toast } from "sonner";

// Socket configuration
const createSocket = () => {
  return io(import.meta.env.VITE_API_URL, {
    transports: ['websocket', 'polling'],
    upgrade: true,
    forceNew: false,
    timeout: 10000,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
};

const ChatWindow = ({ selectedChat, isGroup = false, currentUser, onToggleGroupInfo }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentChatRoomId, setCurrentChatRoomId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const processedMessagesRef = useRef(new Set());

  const user = currentUser || JSON.parse(localStorage.getItem("user")) || {};
  const userId = user?._id;

  // Debug states
  useEffect(() => {
    console.log('🔄 MESSAGES STATE UPDATED:', messages.length, 'messages');
  }, [messages]);

  useEffect(() => {
    console.log('🎯 TYPING USERS STATE UPDATED:', Array.from(typingUsers.entries()));
  }, [typingUsers]);

  // ✅ Single socket connection management
  useEffect(() => {
    console.log('🔌 Initializing socket connection...');
    const newSocket = createSocket();
    socketRef.current = newSocket;
    setSocket(newSocket);

    const handleConnect = () => {
      console.log('✅ Socket.IO connected:', newSocket.id);
      setIsConnected(true);
      
      if (userId) {
        console.log('👤 Joining user room after connect:', userId);
        newSocket.emit('join_user', userId);
      }
    };

    const handleDisconnect = () => {
      console.log('❌ Socket.IO disconnected');
      setIsConnected(false);
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);

    return () => {
      console.log('🧹 Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, [userId]);

  // ✅ Enhanced message fetching
  const fetchMessages = useCallback(async () => {
    if (!selectedChat?._id) return;

    const token = getToken();
    if (!token) {
      toast.error("Authentication required");
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
      console.log('✅ ChatRoom ID:', res.data.chatRoomId);
      
      const sortedMessages = (res.data.messages || []).sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      setMessages(sortedMessages);
      processedMessagesRef.current.clear();

      // Store chatRoomId for private chats
      if (!isGroup && res.data.chatRoomId) {
        setCurrentChatRoomId(res.data.chatRoomId);
        console.log('💾 Stored chatRoomId for private chat:', res.data.chatRoomId);
      } else if (isGroup) {
        setCurrentChatRoomId(selectedChat._id);
      }

    } catch (err) {
      console.error("❌ Error fetching messages:", err);
      toast.error("Failed to load messages");
    }
  }, [selectedChat?._id, isGroup]);

  // ✅ Initial messages load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // ✅ FIXED: Enhanced chat room joining - ONLY when socket is ready
  useEffect(() => {
    if (!socket || !isConnected || !selectedChat?._id) {
      console.log('❌ Cannot join room - missing requirements:', {
        socket: !!socket,
        connected: isConnected,
        selectedChat: !!selectedChat?._id
      });
      return;
    }

    // Small delay to ensure socket is fully connected
    const joinRoom = setTimeout(() => {
      const roomData = {
        roomId: selectedChat._id,
        isGroup: isGroup,
        chatRoomId: currentChatRoomId
      };
      
      console.log('🚪 Joining chat room with data:', roomData);
      socket.emit('join_chat', roomData);
    }, 100);

    return () => {
      clearTimeout(joinRoom);
      console.log('🚪 Cleaning up room joining');
    };
  }, [socket, isConnected, selectedChat?._id, isGroup, currentChatRoomId]);

  // ✅ FIXED: Enhanced typing listeners - PROPER room validation
  useEffect(() => {
    if (!socket || !isConnected || !selectedChat?._id) return;

    console.log('🎯 Setting up typing listeners for chat:', selectedChat._id);

    const handleUserTyping = (data) => {
      console.log('🎯 TYPING EVENT RECEIVED:', data);
      
      // ✅ CRITICAL: Calculate expected room ID exactly like backend
      const expectedRoomId = isGroup ? 
        `group_${selectedChat._id}` : 
        `private_${currentChatRoomId || selectedChat._id}`;
      
      console.log('🎯 ROOM VALIDATION:', {
        expectedRoom: expectedRoomId,
        receivedRoom: data.roomId,
        matches: data.roomId === expectedRoomId,
        isCurrentUser: data.userId === userId,
        typingStatus: data.isTyping ? 'START' : 'STOP'
      });
      
      // ✅ CRITICAL: Only process if it's for current chat AND not from current user
      if (data.roomId === expectedRoomId && data.userId !== userId) {
        console.log('🎯 PROCESSING TYPING EVENT for user:', data.userName);
        
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          
          if (data.isTyping) {
            newMap.set(data.userId, data.userName || 'Someone');
            console.log('🎯 ADDED typing user:', data.userName, 'Total:', newMap.size);
          } else {
            newMap.delete(data.userId);
            console.log('🎯 REMOVED typing user, Remaining:', newMap.size);
          }
          
          return newMap;
        });
      } else {
        console.log('❌ IGNORING typing event - wrong room or own user');
      }
    };

    socket.on('user_typing', handleUserTyping);

    return () => {
      console.log('🧹 Cleaning up typing listeners');
      socket.off('user_typing', handleUserTyping);
      setTypingUsers(new Map());
    };
  }, [socket, isConnected, selectedChat?._id, userId, isGroup, currentChatRoomId]);

  // ✅ FIXED: Message listener
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('👂 Setting up real-time message listeners');

    const handleReceiveMessage = (msg) => {
      console.log('📨 Received real-time message:', msg._id, msg.content);
      
      const messageKey = `${msg._id}_${msg.createdAt}`;
      
      if (processedMessagesRef.current.has(messageKey)) {
        console.log('🔄 Skipping duplicate message:', msg._id);
        return;
      }

      processedMessagesRef.current.add(messageKey);
      
      setMessages(prev => {
        const messageExists = prev.some(m => m._id === msg._id);
        
        if (messageExists) {
          console.log('🔄 Message already exists in state:', msg._id);
          return prev;
        }
        
        console.log('➕ Adding new message to state:', msg._id);
        return [...prev, msg];
      });
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, isConnected]);

  // ✅ Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: "smooth",
      block: "nearest"
    });
  }, [messages, typingUsers.size]);

  // ✅ FIXED: Enhanced typing handler
  
  // Enhanced input change handler
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

  // Send message with optimistic update
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
      // Stop typing
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      socket.emit("typing_stop", {
        chatId: selectedChat._id,
        userId: userId,
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
        isOptimistic: true,
        status: 'sending'
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage("");

      // Prepare API data
      const msgData = isGroup
        ? { content: messageContent, messageType: "text" }
        : { receiverId: selectedChat._id, content: messageContent, messageType: "text" };

      const endpoint = isGroup
        ? `${import.meta.env.VITE_API_URL}/chatroom/${selectedChat._id}/sendGroupmessages`
        : `${import.meta.env.VITE_API_URL}/chatroom/messages/send`;

      const res = await axios.post(endpoint, msgData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });

      const sentMessage = res.data.message;
      console.log('✅ Message saved to DB:', sentMessage._id);

      // Replace optimistic message
      setMessages(prev => {
        const filtered = prev.filter(msg => msg._id !== tempMessageId);
        const exists = filtered.some(msg => msg._id === sentMessage._id);
        return exists ? filtered : [...filtered, { ...sentMessage, status: 'delivered' }];
      });

      processedMessagesRef.current.add(`${sentMessage._id}_${sentMessage.createdAt}`);

    } catch (err) {
      console.error("❌ Error sending message:", err);
      toast.error("Failed to send message");
      setMessages(prev => prev.filter(msg => !msg.isOptimistic || msg.status !== 'sending'));
    } finally {
      setIsSending(false);
    }
  };

    // ✅ Add this debugging function to check socket room status
const checkRoomStatus = useCallback(() => {
  if (!socket || !selectedChat?._id) return;
  
  console.log('🔍 CHECKING ROOM STATUS:');
  console.log('🔍 Current User ID:', userId);
  console.log('🔍 Selected Chat ID:', selectedChat._id);
  console.log('🔍 Current Chat Room ID:', currentChatRoomId);
  console.log('🔍 Is Group:', isGroup);
  console.log('🔍 Expected Room ID:', isGroup ? `group_${selectedChat._id}` : `private_${currentChatRoomId || selectedChat._id}`);
  console.log('🔍 Socket Connected:', isConnected);
  console.log('🔍 Socket ID:', socket?.id);
}, [socket, selectedChat?._id, userId, currentChatRoomId, isGroup, isConnected]);

// Call this when component mounts or when chat changes
useEffect(() => {
  checkRoomStatus();
}, [checkRoomStatus]);

// ✅ Enhanced typing handler with debugging
const handleTyping = useCallback(() => {
  if (!socket || !isConnected || !selectedChat?._id) {
    console.log('❌ Typing: Missing requirements');
    checkRoomStatus();
    return;
  }

  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
  }

  const typingData = {
    chatId: selectedChat._id,
    userId: userId,
    userName: user.name || user.username || 'User',
    isGroup: isGroup,
    chatRoomId: currentChatRoomId
  };

  console.log('🎯 EMITTING TYPING START:', typingData);
  socket.emit("typing_start", typingData);

  typingTimeoutRef.current = setTimeout(() => {
    const stopData = {
      chatId: selectedChat._id,
      userId: userId,
      isGroup: isGroup,
      chatRoomId: currentChatRoomId
    };
    
    console.log('🎯 EMITTING TYPING STOP:', stopData);
    socket.emit("typing_stop", stopData);
    typingTimeoutRef.current = null;
  }, 2000);
}, [socket, isConnected, selectedChat?._id, userId, isGroup, user.name, user.username, currentChatRoomId, checkRoomStatus]);

  

  // ✅ FIXED: Enhanced typing indicator display
  const getStatusText = () => {
    if (typingUsers.size > 0) {
      const typingArray = Array.from(typingUsers.values());
      console.log('🎯 Currently typing users with names:', typingArray);
      
      if (typingArray.length === 1) {
        return `${typingArray[0]} is typing...`;
      } else if (typingArray.length === 2) {
        return `${typingArray[0]} and ${typingArray[1]} are typing...`;
      } else {
        return `${typingArray[0]} and ${typingArray.length - 1} others are typing...`;
      }
    }
    
    return isGroup ? 'Group chat' : 'Online';
  };

  // Message rendering
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
          {!isSent && isGroup && (
            <Avatar className="w-8 h-8">
              <AvatarImage src={msg.sender?.profilePicture} />
              <AvatarFallback className="bg-blue-600 text-white text-xs">
                {msg.sender?.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div className="flex flex-col space-y-1">
            {isGroup && !isSent && (
              <span className="text-xs font-semibold text-gray-300 px-1">
                {msg.sender?.name}
              </span>
            )}
            
            <div className={`px-4 py-3 rounded-2xl ${
              isSent
                ? `bg-blue-600 text-white rounded-br-md ${isOptimistic ? 'opacity-80' : ''}`
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

  // Connection status component
  const ConnectionStatus = () => (
    <div className={`absolute top-2 right-2 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${
      isConnected 
        ? 'bg-green-500/20 text-green-400 border-green-500/30' 
        : 'bg-red-500/20 text-red-400 border-red-500/30'
    }`}>
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
      {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  );

  if (!selectedChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-900">
        <div className="text-center space-y-6">
          <div className="text-4xl">💬</div>
          <h3 className="text-2xl font-bold text-white">Start a Conversation</h3>
          <p className="text-gray-400">Select a chat from the sidebar to begin messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 relative">
      <ConnectionStatus />

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
            <p className="text-gray-300 text-sm">{getStatusText()}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowAdminPanel(true)}
          className="text-white hover:bg-white/20"
        >
          <Info className="w-5 h-5" />
        </Button>
        {/* Add this temporary debug button */}
<Button
  onClick={() => {
    console.log('🧪 MANUAL TYPING TEST TRIGGERED');
    handleTyping();
  }}
  className="bg-yellow-600 text-white"
>
  Test Typing
</Button>

      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-900 min-h-0">
        <div className="space-y-2">
          <AnimatePresence>
            {messages.map(renderMessage)}
          </AnimatePresence>
        </div>
        
        {/* ✅ FIXED: Typing Indicator */}
        {typingUsers.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start mb-4 px-4"
          >
            <div className="flex items-center gap-3 max-w-[80%]">
              {isGroup && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gray-600 text-white text-xs">⌨️</AvatarFallback>
                </Avatar>
              )}
              <div className="px-4 py-3 rounded-2xl bg-gray-800 text-white rounded-bl-md border border-gray-600">
                <div className="flex items-center gap-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm font-medium">
                    {getStatusText().replace('...', '')}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="h-20 flex-shrink-0 flex items-center gap-3 px-6 bg-gray-800 border-t border-gray-700">
        <div className="flex-1 relative">
          <Input
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            disabled={isSending || !isConnected}
            placeholder={!isConnected ? "Connecting..." : isSending ? "Sending..." : "Type your message..."}
            className="w-full pl-4 pr-12 py-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-2xl focus:border-purple-400"
          />
        </div>
        
        <Button
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || !isConnected || isSending}
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

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {showAdminPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            onClick={() => setShowAdminPanel(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-gray-900 w-full max-w-4xl max-h-[85vh] rounded-2xl border border-gray-700 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-800">
                <h3 className="text-xl font-bold text-white">
                  {isGroup ? 'Group Settings' : 'User Info'} - {selectedChat.name}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAdminPanel(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="overflow-y-auto max-h-[60vh]">
                {isGroup ? (
                  <GroupChatAdminPanel
                    group={selectedChat}
                    currentUser={currentUser}
                    refreshGroup={fetchMessages}
                  />
                ) : (
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={selectedChat.profilePicture} />
                        <AvatarFallback className="bg-purple-600 text-white text-2xl">
                          {selectedChat.name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-2xl font-bold text-white">{selectedChat.name}</h3>
                        <p className="text-gray-300">Private chat</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatWindow;