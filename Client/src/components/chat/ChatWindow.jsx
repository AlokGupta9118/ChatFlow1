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
  UserPlus,
  X,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmojiPicker from "emoji-picker-react";
import { toast } from "sonner";
import { getToken } from "@/utils/getToken";
import { useSocket } from "@/contexts/SocketContext";

const ChatWindow = ({ 
  selectedChat, 
  currentUser, 
  onBack,
  isGroup = false,
  onToggleGroupInfo,
  showGroupInfo = false
}) => {
  const { socket, isConnected } = useSocket();
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
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const optimisticIdRef = useRef(0);
  
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

  // Generate unique optimistic ID
  const generateOptimisticId = () => {
    return `optimistic-${Date.now()}-${++optimisticIdRef.current}`;
  };

  // Real-time updates for messages and group members
  useEffect(() => {
    if (!socket || !selectedChat || !isConnected) {
      console.log('🔌 Socket not ready for events');
      return;
    }

    console.log('🎯 Setting up socket events for chat:', selectedChat._id);

    // Join the chat room
    socket.emit("join_chat", selectedChat._id);

    // Message events
    const handleNewMessage = (message) => {
      console.log('📨 New message received:', message);
      if (message.chatRoom === selectedChat._id) {
        setMessages(prev => {
          // Remove any optimistic messages with the same content from current user
          const filtered = prev.filter(msg => 
            !msg.isOptimistic || 
            (msg.isOptimistic && (
              msg.content !== message.content || 
              msg.sender?._id !== userId
            ))
          );
          
          // Check if this exact message already exists
          const messageExists = filtered.some(msg => msg._id === message._id);
          
          return messageExists ? filtered : [...filtered, message];
        });
        
        // Mark as read if it's not our own message
        if (message.sender?._id !== userId) {
          markMessageAsRead(message._id);
        }
      }
    };

    const handleMessageUpdated = (updatedMessage) => {
      console.log('✏️ Message updated:', updatedMessage);
      if (updatedMessage.chatRoom === selectedChat._id) {
        setMessages(prev => prev.map(msg => 
          msg._id === updatedMessage._id ? updatedMessage : msg
        ));
      }
    };

    const handleMessageDeleted = (data) => {
      console.log('🗑️ Message deleted:', data);
      if (data.chatRoomId === selectedChat._id) {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId 
            ? { 
                ...msg, 
                deleted: true, 
                content: "This message was deleted",
                deletedAt: data.deletedAt,
                deletedBy: data.deletedBy
              }
            : msg
        ));
        toast.success("Message deleted");
      }
    };

    // Group member events
    const handleMemberAdded = (data) => {
      console.log('👥 Member added:', data);
      if (data.groupId === selectedChat._id) {
        setGroupMembers(prev => {
          const exists = prev.some(m => m.user._id === data.newMember.user._id);
          if (!exists) {
            return [...prev, data.newMember];
          }
          return prev;
        });
        toast.success(`🎉 ${data.newMember.user.name} joined the group!`);
      }
    };

    const handleMemberRemoved = (data) => {
      console.log('👋 Member removed:', data);
      if (data.groupId === selectedChat._id) {
        setGroupMembers(prev => prev.filter(m => m.user._id !== data.userId));
        toast.info(`👋 A member left the group`);
      }
    };

    const handleRoleUpdated = (data) => {
      console.log('🛡️ Role updated:', data);
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

    // Typing events - FIXED: Corrected the prev reference error
    const handleUserTyping = (data) => {
      console.log('⌨️ User typing:', data);
      if (data.chatRoomId === selectedChat._id && data.userId !== userId) {
        setTypingUsers(prev => {
          const filtered = prev.filter(user => user.userId !== data.userId);
          return [...filtered, { userId: data.userId, userName: data.userName }];
        });
        setIsTyping(true);
      }
    };

    const handleUserStopTyping = (data) => {
      console.log('💤 User stopped typing:', data);
      if (data.chatRoomId === selectedChat._id) {
        setTypingUsers(prev => {
          const filtered = prev.filter(user => user.userId !== data.userId);
          // Check if no more typing users
          if (filtered.length === 0) {
            setIsTyping(false);
          }
          return filtered;
        });
      }
    };

    const handleMessageRead = (data) => {
      console.log('📖 Message read:', data);
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, readBy: [...(msg.readBy || []), { user: data.readBy, readAt: data.readAt }] }
          : msg
      ));
    };

    const handleUserStatusChange = (data) => {
      console.log('🔵 User status changed:', data);
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
      console.log('🧹 Cleaning up socket events for chat:', selectedChat._id);
      if (socket) {
        socket.emit("leave_chat", selectedChat._id);
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
      }
    };
  }, [socket, selectedChat, isConnected, userId]);

  // Real-time status updates for private chats
  useEffect(() => {
    if (!socket || !isConnected || !selectedChat || isGroupChat) return;

    const handleUserStatusChange = (data) => {
      console.log('🔵 User status changed:', data);
      
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

    socket.on("user_status_changed", handleUserStatusChange);

    return () => {
      socket.off("user_status_changed", handleUserStatusChange);
    };
  }, [socket, isConnected, selectedChat, isGroupChat]);

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
      console.error("❌ Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [selectedChat, token, isGroupChat, userId]);

  // Initial load
  useEffect(() => {
    if (selectedChat) {
      console.log('📥 Loading messages for chat:', selectedChat._id);
      setMessages([]);
      setPage(1);
      setTypingUsers([]);
      setIsTyping(false);
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

  // Optimized message sending with instant UI update
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !mediaPreview) || !selectedChat || !userId) {
      console.error('❌ Cannot send message: missing data');
      toast.error("Cannot send message: missing data");
      return;
    }

    // If we have media preview, upload media first
    if (mediaPreview && mediaPreview.file) {
      await uploadMediaFile(mediaPreview.file);
      return;
    }

    // Create unique optimistic message for instant UI update
    const optimisticId = generateOptimisticId();
    const optimisticMessage = {
      _id: optimisticId,
      chatRoom: selectedChat._id,
      sender: {
        _id: userId,
        name: user?.name || 'You',
        profilePicture: user?.profilePicture,
        status: 'online'
      },
      content: newMessage.trim(),
      type: "text",
      replyTo: replyingTo,
      status: "sent",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readBy: [],
      isOptimistic: true,
      optimisticId: optimisticId // Additional identifier
    };

    // Immediately add to UI
    setMessages(prev => [...prev, optimisticMessage]);
    const messageContent = newMessage;
    setNewMessage("");
    setReplyingTo(null);
    
    // Stop typing indicator
    if (socket && isConnected) {
      socket.emit("typing_stop", selectedChat._id);
    }

    const messageData = {
      chatRoomId: selectedChat._id,
      content: messageContent,
      replyTo: replyingTo?._id,
      type: "text"
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
        console.log("✅ Message sent successfully via REST API");
        // The socket event will replace the optimistic message with the real one
      } else {
        throw new Error(result.message);
      }
      
    } catch (error) {
      console.error("❌ Error sending message:", error);
      
      // Remove specific optimistic message on error
      setMessages(prev => prev.filter(msg => msg.optimisticId !== optimisticId));
      
      // Show error but keep the message for retry
      setNewMessage(messageContent);
      if (replyingTo) setReplyingTo(replyingTo);
      
      toast.error(error.message || "Failed to send message");
    }
  };

  // Media upload handler
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      toast.error("File size too large. Maximum size is 10MB.");
      return;
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf', 'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error("File type not supported. Please use images, videos, audio, or documents.");
      return;
    }

    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview({
          url: e.target.result,
          type: 'image',
          name: file.name,
          file: file
        });
      };
      reader.readAsDataURL(file);
    } else {
      let previewType = 'file';
      if (file.type.startsWith('video/')) previewType = 'video';
      if (file.type.startsWith('audio/')) previewType = 'audio';
      
      setMediaPreview({
        url: URL.createObjectURL(file),
        type: previewType,
        name: file.name,
        file: file
      });
    }
  };

  // Upload media file - FIXED: Better error handling for 500 errors
  const uploadMediaFile = async (file) => {
    if (!selectedChat || !userId) {
      toast.error("Please select a chat first");
      return;
    }

    setUploadingMedia(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatRoomId', selectedChat._id);
      formData.append('type', file.type.startsWith('image/') ? 'image' : 
                      file.type.startsWith('video/') ? 'video' : 'file');

      console.log("📤 Uploading media:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        chatRoomId: selectedChat._id
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/chatroom/messages/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData
        }
      );

      if (!response.ok) {
        let errorMessage = `Upload failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use default message
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log("✅ Media uploaded successfully:", result);
        setMediaPreview(null);
        toast.success("File sent successfully");
      } else {
        throw new Error(result.message || "Upload failed");
      }
      
    } catch (error) {
      console.error("❌ Error uploading media:", error);
      toast.error(error.message || "Failed to upload file. Please try again.");
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Cancel media preview
  const cancelMediaPreview = () => {
    if (mediaPreview?.url && !mediaPreview.url.startsWith('data:')) {
      URL.revokeObjectURL(mediaPreview.url);
    }
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Delete message functionality - FIXED: Better error handling for 500 errors
  const handleDeleteMessage = async (messageId) => {
    if (!messageId || !token) {
      toast.error("Cannot delete message");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/chatroom/messages/${messageId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let errorMessage = `Delete failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use default message
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.success) {
        // Message will be updated via socket event
        console.log("✅ Message deletion initiated");
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("❌ Error deleting message:", error);
      toast.error(error.message || "Failed to delete message. Please try again.");
    }
  };

  // Message context menu
  const handleMessageRightClick = (e, message) => {
    e.preventDefault();
    
    // Don't show context menu for optimistic or deleted messages
    if (message.isOptimistic || message.deleted) return;
    
    // Only allow delete for user's own messages or admin in groups
    const canDelete = message.sender?._id === userId || (isGroupChat && isAdmin);
    
    if (canDelete) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        message: message
      });
    }
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // FIXED: Improved typing handler with debouncing
  const handleTyping = useCallback(() => {
    if (!selectedChat || !socket || !isConnected) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing start
    socket.emit("typing_start", selectedChat._id);

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (socket && isConnected) {
        socket.emit("typing_stop", selectedChat._id);
      }
    }, 3000);
  }, [selectedChat, socket, isConnected]);

  const markMessageAsRead = (messageId) => {
    if (!selectedChat || !userId || !socket || !isConnected) return;
    socket.emit("message_read", { messageId, chatRoomId: selectedChat._id });
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const getMessageStatus = (message) => {
    if (!message.sender || message.sender._id !== userId || message.deleted) return null;
    
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

  const renderMediaMessage = (message) => {
    if (!message.mediaUrl) return message.content;

    switch (message.type) {
      case 'image':
        return (
          <div className="space-y-2">
            <img 
              src={message.mediaUrl} 
              alt="Shared image" 
              className="max-w-full rounded-lg max-h-80 object-cover"
            />
            {message.content && message.content !== `Sent a ${message.type}` && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        );
      case 'video':
        return (
          <div className="space-y-2">
            <video 
              src={message.mediaUrl} 
              controls 
              className="max-w-full rounded-lg max-h-80"
            />
            {message.content && message.content !== `Sent a ${message.type}` && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        );
      case 'audio':
        return (
          <div className="space-y-2">
            <audio src={message.mediaUrl} controls className="w-full" />
            {message.content && message.content !== `Sent a ${message.type}` && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        );
      case 'file':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <FileText className="h-8 w-8 text-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{message.fileName || 'Download file'}</p>
                <p className="text-xs text-gray-500">Click to download</p>
              </div>
              <a 
                href={message.mediaUrl} 
                download={message.fileName}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Download
              </a>
            </div>
            {message.content && message.content !== `Sent a ${message.type}` && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        );
      default:
        return message.content;
    }
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
      {/* Connection Status Badge */}
      <div className={`px-4 py-2 text-center text-sm font-medium ${
        isConnected 
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      }`}>
        {isConnected ? '✅ Connected' : '🔌 Connecting...'}
      </div>

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
        onClick={closeContextMenu}
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
                  key={message._id || message.optimisticId}
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
                        } ${message.isOptimistic ? 'opacity-80' : ''} ${
                          message.deleted ? 'opacity-60 italic bg-gray-100 dark:bg-gray-800' : ''
                        }`}
                        onContextMenu={(e) => handleMessageRightClick(e, message)}
                      >
                        {message.replyTo && !message.replyTo.deleted && (
                          <div className={`text-xs border-l-2 pl-2 mb-2 ${
                            message.sender?._id === userId 
                              ? "border-indigo-300 text-indigo-100" 
                              : "border-gray-300 text-gray-500"
                          }`}>
                            Replying to: {message.replyTo.content}
                          </div>
                        )}
                        
                        <div className="text-sm lg:text-base leading-relaxed">
                          {message.deleted ? (
                            <p className="italic text-gray-500 dark:text-gray-400">This message was deleted</p>
                          ) : (
                            renderMediaMessage(message)
                          )}
                        </div>
                        
                        <div className={`flex items-center space-x-2 mt-2 ${
                          message.sender?._id === userId ? "justify-end" : "justify-start"
                        }`}>
                          <span className={`text-xs ${
                            message.sender?._id === userId 
                              ? "text-indigo-200" 
                              : "text-gray-500"
                          }`}>
                            {formatTime(message.createdAt)}
                            {message.isOptimistic && ' • Sending...'}
                            {message.deleted && ' • Deleted'}
                          </span>
                          {!message.deleted && getMessageStatus(message)}
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

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-32"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 150),
              top: Math.min(contextMenu.y, window.innerHeight - 100)
            }}
          >
            <button
              onClick={() => {
                setReplyingTo(contextMenu.message);
                closeContextMenu();
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Reply className="h-4 w-4" />
              Reply
            </button>
            <button
              onClick={() => {
                handleDeleteMessage(contextMenu.message._id);
                closeContextMenu();
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Preview */}
      {mediaPreview && (
        <div className="px-4 lg:px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-t border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              {mediaPreview.type === 'image' && (
                <img 
                  src={mediaPreview.url} 
                  alt="Preview" 
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              {mediaPreview.type === 'video' && (
                <div className="relative">
                  <video 
                    src={mediaPreview.url} 
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="h-6 w-6 text-white bg-black bg-opacity-50 rounded-full p-1" />
                  </div>
                </div>
              )}
              {mediaPreview.type === 'audio' && (
                <div className="w-12 h-12 rounded-lg bg-indigo-500 flex items-center justify-center">
                  <Mic className="h-6 w-6 text-white" />
                </div>
              )}
              {mediaPreview.type === 'file' && (
                <div className="w-12 h-12 rounded-lg bg-gray-500 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {mediaPreview.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {mediaPreview.type} • {uploadingMedia ? 'Uploading...' : 'Ready to send'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {!uploadingMedia && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cancelMediaPreview}
                  className="h-8 w-8 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

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
              disabled={uploadingMedia}
              className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {uploadingMedia ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500" />
              ) : (
                <Paperclip className="h-5 w-5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={uploadingMedia}
              className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
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
              placeholder={
                uploadingMedia ? "Uploading file..." : 
                isGroupChat ? "Message the group..." : "Type a message..."
              }
              className="h-12 lg:h-14 rounded-2xl text-base pr-16 bg-gray-50 dark:bg-gray-700 border-0 focus:ring-2 focus:ring-indigo-500/50"
              disabled={!userId || uploadingMedia}
            />
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && !mediaPreview) || !userId || uploadingMedia}
            size="icon"
            className="h-12 w-12 lg:h-14 lg:w-14 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 transition-all duration-300"
          >
            {uploadingMedia ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <Send className="h-5 w-5 lg:h-6 lg:w-6" />
            )}
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
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        multiple={false}
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