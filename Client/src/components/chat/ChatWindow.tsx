// ChatWindow.jsx - ENHANCED DEBUG VERSION
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
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [userStatus, setUserStatus] = useState({});
  const [currentChatRoomId, setCurrentChatRoomId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  const user = currentUser || JSON.parse(localStorage.getItem("user")) || {};
  const userId = user?._id;

  // Socket connection management
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

    const handleConnectError = (error) => {
      console.error('❌ Socket.IO connection error:', error);
      setIsConnected(false);
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);

    return () => {
      console.log('🧹 Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, [userId]);

  // Enhanced message fetching
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

      if (!isGroup && res.data.chatRoomId) {
        setCurrentChatRoomId(res.data.chatRoomId);
        console.log('💾 Stored chatRoomId for private chat:', res.data.chatRoomId);
      } else if (isGroup) {
        setCurrentChatRoomId(selectedChat._id);
      } else {
        setCurrentChatRoomId(null);
      }

    } catch (err) {
      console.error("❌ Error fetching messages:", err);
      toast.error("Failed to load messages");
    }
  }, [selectedChat?._id, isGroup]);

  // Initial messages load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Enhanced chat room joining
  useEffect(() => {
    if (!socket || !isConnected || !selectedChat?._id) return;

    const roomData = {
      roomId: selectedChat._id,
      isGroup: isGroup,
      chatRoomId: currentChatRoomId
    };
    
    console.log('🚪 Joining chat room with data:', roomData);
    socket.emit('join_chat', roomData);

    return () => {
      console.log('🚪 Leaving chat room');
      setTypingUsers(new Set());
    };
  }, [socket, isConnected, selectedChat?._id, isGroup, currentChatRoomId]);

  // ✅ ENHANCED: Typing listeners with MAXIMUM debugging
  useEffect(() => {
    if (!socket || !isConnected || !selectedChat?._id) {
      console.log('❌ Typing listeners: Missing requirements');
      return;
    }

    console.log('🎯 Setting up typing listeners for chat:', selectedChat._id);

    const handleUserTyping = (data) => {
      console.log('🎯 TYPING EVENT RECEIVED:', {
        data: data,
        currentUser: userId,
        isCurrentUser: data.userId === userId,
        roomMatch: 'will check below'
      });
      
      // Calculate expected room
      const expectedRoomId = isGroup ? 
        `group_${selectedChat._id}` : 
        `private_${currentChatRoomId || selectedChat._id}`;
      
      console.log('🎯 ROOM COMPARISON:', {
        expectedRoom: expectedRoomId,
        receivedRoom: data.roomId,
        matches: data.roomId === expectedRoomId,
        isGroup: isGroup,
        currentChatRoomId: currentChatRoomId
      });
      
      if (data.roomId === expectedRoomId && data.userId !== userId) {
        console.log('🎯 PROCESSING TYPING EVENT - Will update UI');
        
        if (data.isTyping) {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.add(data.userId);
            console.log('🎯 ADDED typing user:', data.userId, 'Total:', newSet.size);
            return newSet;
          });
        } else {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.userId);
            console.log('🎯 REMOVED typing user:', data.userId, 'Remaining:', newSet.size);
            return newSet;
          });
        }
      } else {
        console.log('🎯 IGNORING typing event - wrong room or own typing');
      }
    };

    socket.on('user_typing', handleUserTyping);

    return () => {
      console.log('🧹 Cleaning up typing listeners');
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket, isConnected, selectedChat?._id, userId, isGroup, currentChatRoomId]);

  // Real-time message listener
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleReceiveMessage = (msg) => {
      console.log('📨 Received real-time message:', msg);
      
      let isForCurrentChat = false;
      
      if (isGroup) {
        isForCurrentChat = msg.roomId === `group_${selectedChat?._id}`;
      } else {
        isForCurrentChat = msg.roomId === `private_${currentChatRoomId}`;
      }
      
      if (isForCurrentChat) {
        setMessages(prev => {
          const messageExists = prev.some(m => m._id === msg._id);
          if (messageExists) return prev;
          return [...prev, { ...msg, displayTimestamp: new Date().toISOString() }];
        });
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, isConnected, selectedChat?._id, isGroup, currentChatRoomId]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers.size]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ✅ ENHANCED: Typing handler with TEST functionality
  const handleTyping = useCallback(() => {
    if (!socket || !isConnected || !selectedChat?._id) {
      console.log('❌ Typing: Missing requirements');
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const typingData = {
      chatId: selectedChat._id,
      userId: userId,
      userName: user.name || 'User',
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
    }, 2000);
  }, [socket, isConnected, selectedChat?._id, userId, isGroup, user.name, currentChatRoomId]);

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

  // Send message
  const handleSendMessage = async () => {
    const messageContent = newMessage.trim();
    if (!messageContent || !socket || !isConnected || isSending) return;

    const token = getToken();
    if (!token) return;

    setIsSending(true);

    try {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        socket.emit("typing_stop", {
          chatId: selectedChat._id,
          userId: userId,
          isGroup: isGroup,
          chatRoomId: currentChatRoomId
        });
      }

      // Optimistic update and API call...
      const tempMessageId = `temp_${Date.now()}`;
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

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage("");

      const msgData = isGroup
        ? { content: messageContent, messageType: "text" }
        : { receiverId: selectedChat._id, content: messageContent, messageType: "text" };

      const endpoint = isGroup
        ? `${import.meta.env.VITE_API_URL}/chatroom/${selectedChat._id}/sendGroupmessages`
        : `${import.meta.env.VITE_API_URL}/chatroom/messages/send`;

      const res = await axios.post(endpoint, msgData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const sentMessage = res.data.message;
      setMessages(prev => 
        prev.map(msg => 
          msg._id === tempMessageId ? { ...sentMessage, status: 'sent' } : msg
        )
      );

      const roomId = isGroup ? 
        `group_${selectedChat._id}` : 
        `private_${res.data.chatRoomId || currentChatRoomId}`;

      if (roomId && roomId !== 'private_null') {
        socket.emit("send_message", {
          roomId: roomId,
          message: { ...sentMessage, senderId: userId, isRealTime: true },
          chatType: isGroup ? "group" : "private"
        });
      }

    } catch (err) {
      console.error("❌ Error sending message:", err);
      setMessages(prev => 
        prev.map(msg => 
          msg.isOptimistic ? { ...msg, status: 'error' } : msg
        )
      );
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // Get status text
  const getStatusText = () => {
    if (typingUsers.size > 0) {
      const typingArray = Array.from(typingUsers);
      console.log('🎯 TYPING USERS IN UI:', typingArray);
      
      if (typingArray.length === 1) {
        const typingUserId = typingArray[0];
        let userName = 'Someone';
        
        if (isGroup) {
          const typingUser = selectedChat.participants?.find(p => {
            const participantId = p.user?._id || p.user;
            return participantId === typingUserId;
          });
          userName = typingUser?.user?.name || typingUser?.name || 'Someone';
        } else {
          userName = selectedChat.name || 'Someone';
        }
        
        return `${userName} is typing...`;
      } else {
        return `${typingArray.length} people are typing...`;
      }
    }
    
    if (isGroup) {
      const onlineCount = selectedChat.participants?.filter(p => 
        onlineUsers.has(p.user?._id || p.user)
      ).length || 0;
      return `${onlineCount} online • ${selectedChat.participants?.length || 0} members`;
    }
    
    const friendId = selectedChat._id;
    const status = userStatus[friendId]?.status || 'offline';
    
    if (status === 'online') return 'Online';
    if (status === 'away') return 'Away';
    return 'Offline';
  };

  // Message rendering (keep your existing renderMessage function)
  const renderMessage = (msg, idx) => {
    const senderId = msg.sender?._id || msg.senderId;
    const isSent = senderId?.toString() === userId?.toString();
    const isSystem = msg.type === 'system';
    const isOptimistic = msg.isOptimistic;
    const hasError = msg.error;

    if (isSystem) {
      return (
        <motion.div key={msg._id || idx} className="flex justify-center my-4">
          <div className="px-4 py-2 bg-yellow-500 text-white text-sm rounded-full">
            <span className="font-medium">💬 {msg.content}</span>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={msg._id || idx}
        className={`flex ${isSent ? "justify-end" : "justify-start"} ${hasError ? 'opacity-70' : ''}`}
      >
        <div className={`flex items-end gap-3 max-w-[80%] ${isSent ? "flex-row-reverse" : ""}`}>
          {!isSent && isGroup && (
            <Avatar className="w-8 h-8">
              <AvatarImage src={msg.sender?.profilePicture} />
              <AvatarFallback className="bg-blue-500 text-white text-xs">
                {msg.sender?.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div className="flex flex-col space-y-1">
            {isGroup && !isSent && (
              <div className="flex items-center space-x-2 mb-1 px-1">
                <span className="text-xs font-semibold text-gray-300">
                  {msg.sender?.name}
                </span>
              </div>
            )}
            
            <div className={`relative px-4 py-3 rounded-2xl shadow-lg ${
              isSent
                ? "bg-blue-600 text-white rounded-br-md"
                : "bg-gray-700 text-white rounded-bl-md"
            } ${hasError ? 'border-red-400 border' : ''}`}>
              
              {isSent && (
                <div className="absolute -top-1 -right-1">
                  {isOptimistic ? (
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                  ) : hasError ? (
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  ) : (
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  )}
                </div>
              )}
              
              <p className="leading-relaxed text-sm whitespace-pre-wrap break-words">
                {msg.content}
              </p>
              
              <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mt-2`}>
                <p className={`text-xs ${isSent ? 'text-blue-200' : 'text-gray-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Connection status
  const ConnectionStatus = () => (
    <div className={`absolute top-2 right-2 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
      isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
    }`}>
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
      {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  );

  if (!selectedChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-900">
        <div className="text-center space-y-6">
          <div className="w-32 h-32 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
            <div className="text-4xl">💬</div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Start a Conversation
            </h3>
            <p className="text-gray-400">
              Select a chat from the sidebar to begin messaging
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 relative">
      <ConnectionStatus />

      {/* DEBUG PANEL - ALWAYS VISIBLE FOR TESTING */}
      <div className="absolute top-12 left-2 bg-black/80 text-white text-xs p-3 rounded z-10 border border-yellow-500">
        <div className="font-bold mb-1">🎯 DEBUG PANEL</div>
        <div>Typing Users: {Array.from(typingUsers).join(', ') || 'None'}</div>
        <div>ChatRoomId: {currentChatRoomId || 'None'}</div>
        <div>Expected Room: {isGroup ? `group_${selectedChat._id}` : `private_${currentChatRoomId}`}</div>
        <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
        <div>Socket: {socket ? 'Ready' : 'No'}</div>
        <button 
          onClick={() => {
            console.log('🎯 MANUAL TYPING TEST');
            handleTyping();
          }}
          className="mt-2 px-2 py-1 bg-blue-500 rounded text-xs"
        >
          Test Typing
        </button>
      </div>

      {/* Header */}
      <div className="h-20 flex-shrink-0 flex items-center justify-between px-6 bg-blue-600 border-b border-blue-500/30">
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14">
            <AvatarImage src={selectedChat.profilePicture || selectedChat.avatar} />
            <AvatarFallback className="bg-blue-500 text-white">
              {selectedChat.name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-white">
              {selectedChat.name}
            </h3>
            <p className="text-blue-100 text-sm">
              {getStatusText()}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAdminPanel(true)}
          className="p-3 bg-white/20 rounded-xl"
        >
          <Info className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Messages Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-800">
        <AnimatePresence>
          {messages.map(renderMessage)}
        </AnimatePresence>
        
        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="flex justify-start">
            <div className="flex items-center gap-3 max-w-[80%]">
              {isGroup && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gray-600 text-white text-xs">
                    ⌨️
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="px-4 py-3 rounded-2xl bg-gray-700 text-white rounded-bl-md">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
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
            className="w-full pl-4 pr-12 py-3 bg-gray-700 border-2 border-blue-500/30 text-white rounded-2xl"
          />
        </div>
        
        <button
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || !isConnected || isSending}
          className="p-3 bg-blue-600 text-white rounded-xl disabled:opacity-50"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {showAdminPanel && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 w-full max-w-4xl max-h-[85vh] rounded-2xl border border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-blue-600">
                <h3 className="text-xl font-bold text-white">
                  {isGroup ? 'Group Settings' : 'User Info'} - {selectedChat.name}
                </h3>
                <button onClick={() => setShowAdminPanel(false)}>
                  <X className="w-5 h-5 text-white" />
                </button>
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
                        <AvatarFallback className="bg-blue-500 text-white text-2xl">
                          {selectedChat.name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-2xl font-bold text-white">{selectedChat.name}</h3>
                        <p className="text-gray-300">
                          {onlineUsers.has(selectedChat._id) ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatWindow;