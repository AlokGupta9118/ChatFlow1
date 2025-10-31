import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ArrowLeft, Users, Crown, Target, Timer, Sparkles, 
  Volume2, VolumeX, Gamepad2, RefreshCw, MessageCircle, Send,
  ChevronDown, ChevronUp, Home, User, Key, Eye, EyeOff
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const socket = io(import.meta.env.VITE_API_URL, {
  transports: ['websocket', 'polling'],
  timeout: 10000
});

// NEW: Enhanced Input Field Component
const EnhancedInputField = ({ 
  icon, 
  placeholder, 
  value, 
  onChange, 
  type = "text",
  onEnter,
  className = "",
  autoFocus = false
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && onEnter) {
      onEnter();
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <div className={`
        flex items-center space-x-3 p-4 rounded-2xl border-2 transition-all duration-300 bg-white/95 backdrop-blur-sm
        ${isFocused 
          ? 'border-purple-500 shadow-lg shadow-purple-500/25 scale-[1.02]' 
          : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
        }
      `}>
        <div className={`
          transition-all duration-300
          ${isFocused ? 'text-purple-600 scale-110' : 'text-gray-400'}
        `}>
          {icon}
        </div>
        
        <input
          type={type === 'password' && showPassword ? 'text' : type}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-500 text-lg font-medium min-h-[24px] w-full"
          style={{ fontSize: '16px' }} // Prevent zoom on iOS
        />
        
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-gray-400 hover:text-purple-600 transition-colors p-1"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      
      {/* Animated background effect */}
      <div className={`
        absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300 -z-10
        ${isFocused ? 'opacity-10' : ''}
      `} />
    </div>
  );
};

// Updated ChatInput component with FIXED typing indicators
const ChatInput = ({ onSendMessage, disabled, onTyping }) => {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleSubmit = useCallback(() => {
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue);
      setInputValue("");
      
      // Clear typing indicator when sending
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      onTyping(false);
    }
  }, [inputValue, onSendMessage, disabled, onTyping]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleChange = useCallback((e) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Handle typing indicators
    if (value.trim() && !disabled) {
      // User is typing
      onTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator after 1 second of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
        typingTimeoutRef.current = null;
      }, 1000);
    } else {
      // Input is empty, stop typing indicator
      onTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [onTyping, disabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex gap-3 p-4 bg-transparent safe-area-inset-bottom">
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        placeholder={disabled ? "Connecting..." : "Type your message..."}
        className="flex-1 bg-gray-700 border-2 border-purple-500/50 text-white placeholder-gray-400 min-h-[48px] text-sm rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
        disabled={disabled}
      />
      <Button
        onClick={handleSubmit}
        disabled={!inputValue.trim() || disabled}
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white flex-shrink-0 min-w-[60px] min-h-[48px] shadow-lg rounded-xl border-2 border-purple-400/30 transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
        size="sm"
      >
        <Send className="w-5 h-5" />
      </Button>
    </div>
  );
};

<ChatPanel 
  chatMessages={chatMessages}
  playerName={playerName}
  typingUsers={typingUsers}
  onSendMessage={handleSendChatMessage}
  isConnected={connectionStatus === "connected"}
  onTyping={handleTyping}
/>
const WhosMostLikely = () => {
  const navigate = useNavigate();
  
  // Game states
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  
  // Round states
  const [currentScenario, setCurrentScenario] = useState("");
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(10);
  const [hasVoted, setHasVoted] = useState(false);
  const [votes, setVotes] = useState({});
  const [roundResults, setRoundResults] = useState(null);
  const [finalResults, setFinalResults] = useState(null);
  
  // UI states
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("connected");
  const [voteCount, setVoteCount] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState("");

  // Chat states
  const [chatMessages, setChatMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());

  const audioRef = useRef(null);
  const mainContainerRef = useRef(null);

  // NEW: Enhanced mobile CSS with complete viewport handling
  useEffect(() => {
    const styles = `
      /* Reset and base styles */
      * {
        box-sizing: border-box;
        -webkit-tap-highlight-color: transparent;
      }
      
      /* Enhanced mobile viewport handling */
      .mobile-viewport-fix {
        height: 100vh;
        height: calc(var(--vh, 1vh) * 100);
        overflow: hidden;
        position: fixed;
        width: 100%;
        top: 0;
        left: 0;
      }
      
      .mobile-scroll-container {
        height: 100%;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        scroll-behavior: smooth;
      }
      
      .game-content-container {
        min-height: 100%;
        padding-bottom: env(safe-area-inset-bottom, 20px);
        position: relative;
      }
      
      .safe-area-padding {
        padding-left: max(1rem, env(safe-area-inset-left, 1rem));
        padding-right: max(1rem, env(safe-area-inset-right, 1rem));
        padding-bottom: max(1rem, env(safe-area-inset-bottom, 1rem));
      }
      
      .safe-area-inset-bottom {
        margin-bottom: env(safe-area-inset-bottom, 0px);
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }

      /* Custom scrollbar */
      .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: rgba(168, 85, 247, 0.5) transparent;
      }

      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
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
      
      /* Enhanced mobile responsiveness */
      @media (max-width: 768px) {
        .mobile-viewport-fix {
          height: 100vh;
          height: -webkit-fill-available;
          position: fixed;
        }
        
        .mobile-scroll-container {
          height: 100%;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          scroll-padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        
        .safe-area-padding {
          padding-left: max(0.75rem, env(safe-area-inset-left, 0.75rem));
          padding-right: max(0.75rem, env(safe-area-inset-right, 0.75rem));
          padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0.75rem));
        }
        
        .game-content-container {
          min-height: calc(100vh - env(safe-area-inset-bottom, 0px));
          padding-bottom: env(safe-area-inset-bottom, 1rem);
        }
        
        /* Enhanced input handling for mobile */
        input, textarea, select {
          font-size: 16px !important;
          min-height: 44px;
          border-radius: 12px !important;
        }
        
        /* Better touch targets */
        button, [role="button"] {
          min-height: 44px;
          min-width: 44px;
          border-radius: 12px;
        }

        /* Mobile chat overlay */
        .mobile-chat-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 50;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
        }

        .mobile-chat-container {
          position: fixed;
          top: 5%;
          left: 5%;
          right: 5%;
          bottom: 5%;
          z-index: 60;
          border-radius: 20px;
          overflow: hidden;
        }

        /* Enhanced button sizes for mobile */
        .mobile-btn-lg {
          min-height: 56px;
          font-size: 18px;
          border-radius: 16px;
        }

        .mobile-btn-md {
          min-height: 48px;
          font-size: 16px;
          border-radius: 14px;
        }

        /* Better spacing for mobile */
        .mobile-space-y-4 > * + * {
          margin-top: 1rem;
        }

        .mobile-p-4 {
          padding: 1rem;
        }

        /* Fix for content being cut off */
        .content-safe-area {
          padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
        }
      }

      /* Desktop enhancements */
      @media (min-width: 769px) {
        .desktop-chat-container {
          height: 600px;
          max-height: 70vh;
        }
      }

      /* Prevent content shift when keyboard appears */
      .keyboard-open {
        transform: translateY(-100px);
        transition: transform 0.3s ease-out;
      }

      /* Smooth animations */
      * {
        transition: all 0.2s ease-in-out;
      }

      /* Enhanced focus states */
      input:focus, button:focus {
        outline: none;
        ring: 2px solid rgba(168, 85, 247, 0.5);
      }

      /* Loading animations */
      @keyframes pulse-glow {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      .pulse-glow {
        animation: pulse-glow 2s ease-in-out infinite;
      }

      /* Gradient text */
      .gradient-text {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      /* Floating animation */
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
      
      .animate-float {
        animation: float 3s ease-in-out infinite;
      }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
    
    // Enhanced viewport height calculation
    const updateViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', updateViewportHeight);
    
    // Handle keyboard events
    const handleResize = () => {
      const isKeyboardOpen = window.innerHeight < window.outerHeight * 0.8;
      document.body.classList.toggle('keyboard-open', isKeyboardOpen);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      document.head.removeChild(styleSheet);
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // NEW: Enhanced scroll management
  useEffect(() => {
    const handleScrollToBottom = () => {
      if (mainContainerRef.current) {
        setTimeout(() => {
          mainContainerRef.current?.scrollTo({ 
            top: mainContainerRef.current.scrollHeight, 
            behavior: 'smooth' 
          });
        }, 300);
      }
    };

    if (gameStarted || gameFinished || roundResults) {
      handleScrollToBottom();
    }
  }, [gameStarted, gameFinished, roundResults, currentRound]);

  // NEW: Auto-focus name input on mobile
  useEffect(() => {
    if (!joined && window.innerWidth < 768) {
      const timer = setTimeout(() => {
        const nameInput = document.querySelector('input[placeholder*="name"]');
        nameInput?.focus();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [joined]);

  // Sound effects
  const playSound = (soundName) => {
    if (!soundEnabled) return;
    
    const sounds = {
      select : "../components/sounds/select.mp3",
      success: "../components/sounds/success.mp3",
      notification: "../components/sounds/notification.mp3",
      victory: "../components/sounds/victory.mp3",
      message: "../components/sounds/message.mp3"
    };
    
    if (audioRef.current && sounds[soundName]) {
      try {
        audioRef.current.src = sounds[soundName];
        audioRef.current.play().catch(() => {});
      } catch (error) {
        console.log("Audio play failed:", error);
      }
    }
  };

  // Chat message handler
  const handleSendChatMessage = useCallback((messageContent) => {
    if (!messageContent.trim() || !socket) return;

    const message = {
      id: Date.now(),
      sender: playerName,
      content: messageContent.trim(),
      timestamp: new Date().toISOString(),
      type: "text"
    };

    socket.emit("send-gamechat-message", { roomId, message });
  }, [roomId, playerName]);

  // Typing handler
 // FIXED: Handle typing with proper parameters
const handleTyping = useCallback((isTyping) => {
  if (!socket) return;
  
  if (isTyping) {
    console.log("⌨️ Starting typing indicator");
    socket.emit("typing", { 
      roomId, 
      userId: playerName, 
      userName: playerName 
    });
  } else {
    console.log("⌨️ Stopping typing indicator");
    socket.emit("chat-typing-stop", { 
      roomId, 
      userId: playerName 
    });
  }
}, [roomId, playerName, socket]);

  // Socket event handlers
  useEffect(() => {
    const handleRoomCreated = (room) => {
      setRoomId(room.roomId);
      setIsHost(true);
      setJoined(true);
      setPlayers(room.players);
      playSound("success");
    };

    const handleRoomJoined = (room) => {
      setRoomId(room.roomId);
      setPlayers(room.players);
      setJoined(true);
      playSound("success");
    };

    const handleUpdatePlayers = (playersList) => {
      setPlayers(playersList);
      playSound("notification");
    };

    const handleGameStarted = (data) => {
      setGameStarted(true);
      setCurrentScenario(data.scenario);
      setCurrentRound(data.currentRound);
      setTotalRounds(data.totalRounds);
      setHasVoted(false);
      setSelectedPlayer("");
      playSound("success");
    };

    const handleVoteReceived = (data) => {
      setVotes(prev => ({
        ...prev,
        [data.voter]: data.votedFor
      }));
      setVoteCount(data.votesSoFar);
    };

    const handleRoundResults = (results) => {
      setRoundResults(results);
      setVotes(results.votes);
      playSound("victory");
    };

    const handleNextRound = (data) => {
      setCurrentScenario(data.scenario);
      setCurrentRound(data.currentRound);
      setRoundResults(null);
      setHasVoted(false);
      setSelectedPlayer("");
      setVotes({});
      setVoteCount(0);
      playSound("success");
    };

    const handleGameFinished = (data) => {
      setGameFinished(true);
      setFinalResults(data);
      playSound("victory");
    };

    const handleConnectionError = () => {
      setConnectionStatus("disconnected");
    };

    const handleReconnect = () => {
      setConnectionStatus("connected");
    };

    // Chat event handlers
    const handleChatMessage = (message) => {
      setChatMessages(prev => [...prev, message]);
      if (message.sender !== playerName) {
        playSound("message");
      }
    };

    const handleChatHistory = (messages) => {
      setChatMessages(messages);
    };

    const handleUserTyping = (data) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (data.isTyping) {
          newSet.add(data.userName);
        } else {
          newSet.delete(data.userName);
        }
        return newSet;
      });
    };

    // Register event listeners
    socket.on("mostlikely-room-created", handleRoomCreated);
    socket.on("mostlikely-room-joined", handleRoomJoined);
    socket.on("mostlikely-update-players", handleUpdatePlayers);
    socket.on("mostlikely-game-started", handleGameStarted);
    socket.on("vote-received", handleVoteReceived);
    socket.on("mostlikely-round-results", handleRoundResults);
    socket.on("mostlikely-next-round", handleNextRound);
    socket.on("mostlikely-game-finished", handleGameFinished);
    socket.on("connect_error", handleConnectionError);
    socket.on("reconnect", handleReconnect);

    // Chat listeners
    socket.on("receive-chat-message", handleChatMessage);
    socket.on("chat-history", handleChatHistory);
    socket.on("user-typing", handleUserTyping);

    return () => {
      // Cleanup event listeners
      socket.off("mostlikely-room-created", handleRoomCreated);
      socket.off("mostlikely-room-joined", handleRoomJoined);
      socket.off("mostlikely-update-players", handleUpdatePlayers);
      socket.off("mostlikely-game-started", handleGameStarted);
      socket.off("vote-received", handleVoteReceived);
      socket.off("mostlikely-round-results", handleRoundResults);
      socket.off("mostlikely-next-round", handleNextRound);
      socket.off("mostlikely-game-finished", handleGameFinished);
      socket.off("connect_error", handleConnectionError);
      socket.off("reconnect", handleReconnect);

      // Chat listeners
      socket.off("receive-chat-message", handleChatMessage);
      socket.off("chat-history", handleChatHistory);
      socket.off("user-typing", handleUserTyping);
    };
  }, [playerName]);

  // NEW: Enhanced room management with better input validation
  const createRoom = () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }
    
    if (playerName.trim().length < 2) {
      alert("Name must be at least 2 characters");
      return;
    }
    
    socket.emit("create-mostlikely-room", { 
      player: { name: playerName.trim() } 
    });
  };

  const joinRoom = () => {
    if (!playerName.trim() || !roomId.trim()) {
      alert("Please enter your name and room code");
      return;
    }
    
    if (playerName.trim().length < 2) {
      alert("Name must be at least 2 characters");
      return;
    }
    
    if (roomId.trim().length < 4) {
      alert("Room ID must be at least 4 characters");
      return;
    }
    
    socket.emit("join-mostlikely-room", { 
      roomId: roomId.trim().toUpperCase(), 
      player: { name: playerName.trim() } 
    });
  };

  const startGame = () => {
    if (players.length < 2) {
      alert("Need at least 2 players to start");
      return;
    }
    socket.emit("start-mostlikely-game", { roomId });
  };

  const submitVote = () => {
    if (!selectedPlayer) {
      alert("Please select a player to vote for");
      return;
    }
   
    
    socket.emit("submit-mostlikely-vote", { 
      roomId, 
      votedFor: selectedPlayer 
    });
    setHasVoted(true);
    playSound("select");
  };

  const nextRound = () => {
    socket.emit("next-mostlikely-round", { roomId });
  };

  const restartGame = () => {
    window.location.reload();
  };

  // Back to main menu function
  const backToMainMenu = () => {
    navigate("/Games");
  };

  // Player Card Component
  const PlayerCard = ({ player, index, showVotes = false, voteCounts = {} }) => (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
      selectedPlayer === player.name 
        ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400 scale-105' 
        : 'bg-white/10 border-white/20 hover:bg-white/20'
    }`}>
      <div className="flex items-center space-x-3">
        <Avatar className="w-8 h-8 border-2 border-white/30">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
            {player.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-white text-sm">{player.name}</span>
          {player.isHost && <Crown className="w-3 h-3 text-yellow-400" />}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {showVotes && voteCounts[player.name] > 0 && (
          <Badge className="bg-green-500 text-white text-xs">
            {voteCounts[player.name]} votes
          </Badge>
        )}
      </div>
    </div>
  );

  // Connection Status
  const ConnectionStatus = () => (
    <div className={`fixed top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold z-50 ${
      connectionStatus === "connected" 
        ? "bg-green-500 text-white" 
        : "bg-red-500 text-white animate-pulse"
    }`}>
      {connectionStatus === "connected" ? "🟢 Connected" : "🔴 Disconnected"}
    </div>
  );

  // Fixed Mobile Chat Toggle Button
  const MobileChatToggle = () => (
    <Button
      onClick={() => setShowChat(!showChat)}
      className="fixed bottom-6 left-4 z-50 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-2xl rounded-full w-14 h-14 border-2 border-white/20 safe-area-inset-bottom mobile-btn-md"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      {showChat ? <ChevronDown className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
    </Button>
  );

  // NEW: Completely redesigned Join/Create Screen with enhanced input fields
  if (!joined) {
    return (
      <div className="mobile-viewport-fix bg-gradient-to-br from-blue-900 via-purple-800 to-pink-900">
        <div className="mobile-scroll-container">
          <div className="game-content-container content-safe-area">
            <ConnectionStatus />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
            
            <div ref={mainContainerRef} className="max-w-md mx-auto relative z-10 min-h-full flex flex-col safe-area-padding overflow-y-auto">
              {/* Back Button */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6 pt-4">
                <Button
                  variant="ghost"
                  onClick={backToMainMenu}
                  className="text-white hover:bg-white/20 backdrop-blur-sm self-start h-10 mobile-btn-md"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Back to Main Menu
                </Button>
                
                <Link to="/Games" className="self-start sm:self-auto">
                  <Button variant="ghost" className="text-white hover:bg-white/20 backdrop-blur-sm h-10 mobile-btn-md">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Games
                  </Button>
                </Link>
              </div>

              <div className="flex-1 flex items-center justify-center py-8">
                <Card className="p-6 bg-white/10 backdrop-blur-lg border-0 shadow-2xl w-full mx-2">
                  <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center gradient-text">
                    Who's Most Likely?
                  </h1>

                  {/* NEW: Enhanced Input Fields */}
                  <div className="space-y-4 mb-6">
                    <EnhancedInputField
                      icon={<User className="w-6 h-6" />}
                      placeholder="Enter your nickname"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      onEnter={roomId ? joinRoom : createRoom}
                      autoFocus={true}
                    />
                    
                    <EnhancedInputField
                      icon={<Key className="w-6 h-6" />}
                      placeholder="Room code (leave empty to create new)"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                      onEnter={roomId ? joinRoom : createRoom}
                    />
                  </div>

                  {/* Enhanced Action Buttons */}
                  <div className="space-y-3">
                    {roomId ? (
                      <Button 
                        onClick={joinRoom} 
                        disabled={!socket || !roomId.trim() || !playerName.trim()}
                        className="w-full mobile-btn-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <Users className="w-5 h-5 mr-3" />
                        Join Room
                      </Button>
                    ) : (
                      <Button 
                        onClick={createRoom} 
                        disabled={!socket || !playerName.trim()}
                        className="w-full mobile-btn-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <Sparkles className="w-5 h-5 mr-3" />
                        Create New Room
                      </Button>
                    )}
                    
                    {roomId && (
                      <Button 
                        onClick={createRoom} 
                        disabled={!socket || !playerName.trim()}
                        className="w-full mobile-btn-md bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-xl transition-all duration-300"
                        variant="outline"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Different Room
                      </Button>
                    )}
                  </div>

                  {/* Enhanced Features Showcase */}
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center text-white bg-white/10 rounded-xl p-3">
                        <Target className="w-4 h-4 mr-2 text-yellow-400" />
                        <span className="font-medium">Voting</span>
                      </div>
                      <div className="flex items-center text-white bg-white/10 rounded-xl p-3">
                        <Timer className="w-4 h-4 mr-2 text-blue-400" />
                        <span className="font-medium">Rounds</span>
                      </div>
                      <div className="flex items-center text-white bg-white/10 rounded-xl p-3">
                        <Crown className="w-4 h-4 mr-2 text-purple-400" />
                        <span className="font-medium">Leaderboard</span>
                      </div>
                      <div className="flex items-center text-white bg-white/10 rounded-xl p-3">
                        <Volume2 className="w-4 h-4 mr-2 text-green-400" />
                        <span className="font-medium">Sounds</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Tips */}
                  <div className="mt-4 text-center">
                    <p className="text-xs text-white/60">
                      💡 Pro tip: Use a fun nickname and share the room code with friends!
                    </p>
                  </div>
                </Card>
              </div>
            </div>

            <audio ref={audioRef} preload="auto" />
          </div>
        </div>
      </div>
    );
  }

  // Waiting Room
  if (!gameStarted) {
    return (
      <div className="mobile-viewport-fix bg-gradient-to-br from-blue-900 via-purple-800 to-pink-900">
        <div className="mobile-scroll-container">
          <div className="game-content-container content-safe-area">
            <ConnectionStatus />
            <MobileChatToggle />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
            
            <div ref={mainContainerRef} className="max-w-6xl mx-auto relative z-10 min-h-full flex flex-col safe-area-padding">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 px-2 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => window.location.reload()}
                  className="text-white hover:bg-white/20 backdrop-blur-sm self-start h-10 mobile-btn-md"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Leave Room
                </Button>
                <div className="text-white font-medium bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm text-center text-sm">
                  Room: {roomId}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 px-2 pb-6">
                {/* Main Content */}
                <div className="lg:col-span-2 flex flex-col min-h-0">
                  <Card className="p-4 sm:p-6 bg-white/10 backdrop-blur-lg border-0 shadow-2xl flex-1 flex flex-col min-h-0">
                    <div className="text-center mb-6">
                      <div className="flex justify-center mb-4">
                        <div className="relative">
                          <Target className="w-16 h-16 text-purple-400" />
                          <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-1 -right-1 animate-spin" />
                        </div>
                      </div>
                      
                      <h2 className="text-2xl font-bold mb-2 gradient-text">
                        Who's Most Likely?
                      </h2>
                      <p className="text-white/70 mb-6">Waiting for players to join...</p>

                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-white mb-2">Room Code: {roomId}</h3>
                        <Button 
                          onClick={() => navigator.clipboard?.writeText(roomId)}
                          className="bg-white/20 hover:bg-white/30 border-white/30 text-sm h-9 mobile-btn-md"
                          size="sm"
                        >
                          Copy Code
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 mb-6 space-y-2 custom-scrollbar">
                      {players.map((player, index) => (
                        <PlayerCard key={player.name} player={player} index={index} />
                      ))}
                    </div>

                    {players.length === 1 && (
                      <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-3 mb-6">
                        <div className="flex items-center justify-center space-x-2">
                          <Users className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-300 text-sm">Waiting for more players to join...</span>
                        </div>
                      </div>
                    )}

                    {isHost ? (
                      <Button 
                        onClick={startGame} 
                        disabled={players.length < 2}
                        className="w-full mobile-btn-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-2xl"
                      >
                        <Gamepad2 className="w-4 h-4 mr-2" />
                        Start Game ({players.length} players ready)
                      </Button>
                    ) : (
                      <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3">
                        <div className="flex items-center justify-center space-x-2">
                          <Timer className="w-4 h-4 text-blue-400 animate-pulse" />
                          <span className="text-blue-300 text-sm">Waiting for host to start the game...</span>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Chat Panel */}
                <div className={`lg:col-span-1 flex flex-col min-h-0 ${showChat ? 'flex' : 'hidden lg:flex'}`}>
                  <ChatPanel 
                    chatMessages={chatMessages}
                    playerName={playerName}
                    typingUsers={typingUsers}
                    onSendMessage={handleSendChatMessage}
                    isConnected={connectionStatus === "connected"}
                    onTyping={handleTyping}
                  />
                </div>
              </div>
            </div>

            <audio ref={audioRef} preload="auto" />
          </div>
        </div>
      </div>
    );
  }

  // Game Finished Screen
  if (gameFinished) {
    return (
      <div className="mobile-viewport-fix bg-gradient-to-br from-blue-900 via-purple-800 to-pink-900">
        <div className="mobile-scroll-container">
          <div className="game-content-container content-safe-area">
            <ConnectionStatus />
            <MobileChatToggle />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
            
            <div ref={mainContainerRef} className="max-w-6xl mx-auto relative z-10 min-h-full flex flex-col safe-area-padding">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 px-2 pb-6">
                {/* Main Content */}
                <div className="lg:col-span-2 flex flex-col min-h-0">
                  <Card className="p-4 sm:p-6 bg-white/10 backdrop-blur-lg border-0 shadow-2xl flex-1 flex flex-col min-h-0">
                    <div className="text-center mb-6">
                      <Target className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                      <h2 className="text-3xl font-bold mb-2 gradient-text">
                        Game Complete!
                      </h2>
                      <p className="text-white/70 text-lg">
                        After {totalRounds} rounds, here are the results:
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 mb-6 space-y-3 custom-scrollbar">
                      {finalResults?.rankings?.map((player, index) => (
                        <Card key={player.name} className={`p-4 text-center backdrop-blur-sm border-0 ${
                          index === 0 
                            ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 scale-105' 
                            : 'bg-white/5'
                        }`}>
                          <Avatar className="w-12 h-12 mx-auto mb-2 border-2 border-white/30">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg">
                              {player.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <h3 className="text-lg font-bold text-white mb-1">{player.name}</h3>
                          <div className="text-sm text-white/70">
                            Most likely in {player.stats.roundsWon} rounds
                          </div>
                        </Card>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        onClick={restartGame}
                        className="flex-1 mobile-btn-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Play Again
                      </Button>
                      <Button 
                        onClick={() => window.location.reload()}
                        className="flex-1 mobile-btn-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Main Menu
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* Chat Panel */}
                <div className={`lg:col-span-1 flex flex-col min-h-0 ${showChat ? 'flex' : 'hidden lg:flex'}`}>
                  <ChatPanel 
                    chatMessages={chatMessages}
                    playerName={playerName}
                    typingUsers={typingUsers}
                    onSendMessage={handleSendChatMessage}
                    isConnected={connectionStatus === "connected"}
                    onTyping={handleTyping}
                  />
                </div>
              </div>
            </div>

            <audio ref={audioRef} preload="auto" />
          </div>
        </div>
      </div>
    );
  }

  // Round Results Screen
  if (roundResults) {
    return (
      <div className="mobile-viewport-fix bg-gradient-to-br from-blue-900 via-purple-800 to-pink-900">
        <div className="mobile-scroll-container">
          <div className="game-content-container content-safe-area">
            <ConnectionStatus />
            <MobileChatToggle />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
            
            <div ref={mainContainerRef} className="max-w-6xl mx-auto relative z-10 min-h-full flex flex-col safe-area-padding">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 px-2 pb-6">
                {/* Main Content */}
                <div className="lg:col-span-2 flex flex-col min-h-0">
                  <Card className="p-4 sm:p-6 bg-white/10 backdrop-blur-lg border-0 shadow-2xl flex-1 flex flex-col min-h-0">
                    <div className="text-center mb-6">
                      <div className="flex justify-center mb-4">
                        <Sparkles className="w-12 h-12 text-yellow-400 animate-bounce" />
                      </div>
                      
                      <h2 className="text-2xl font-bold mb-2 text-white">
                        {roundResults.winners.length === 1 
                          ? `${roundResults.winners[0]} is most likely!` 
                          : "Multiple players are most likely!"}
                      </h2>
                      
                      <Card className="p-4 mb-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-400/30">
                        <p className="text-lg font-semibold text-white">{roundResults.scenario}</p>
                      </Card>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 mb-6 custom-scrollbar">
                      <h3 className="text-lg font-bold text-white mb-4 text-center">
                        Voting Results
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(roundResults.voteCounts)
                          .sort(([,a], [,b]) => b - a)
                          .map(([player, count]) => (
                          <div key={player} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-8 h-8 border-2 border-white/30">
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                                  {player.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-white font-medium text-sm">{player}</span>
                            </div>
                            <Badge className={
                              roundResults.winners.includes(player) 
                                ? "bg-green-500 text-white" 
                                : "bg-white/20 text-white"
                            }>
                              {count} votes
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {isHost && (
                      <Button
                        onClick={nextRound}
                        className="w-full mobile-btn-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {currentRound < totalRounds ? "Next Round" : "See Final Results"}
                      </Button>
                    )}

                    {!isHost && (
                      <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Timer className="w-4 h-4 text-blue-400 animate-pulse" />
                          <span className="text-blue-300 text-sm">Waiting for host to start next round...</span>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Chat Panel */}
                <div className={`lg:col-span-1 flex flex-col min-h-0 ${showChat ? 'flex' : 'hidden lg:flex'}`}>
                  <ChatPanel 
                    chatMessages={chatMessages}
                    playerName={playerName}
                    typingUsers={typingUsers}
                    onSendMessage={handleSendChatMessage}
                    isConnected={connectionStatus === "connected"}
                    onTyping={handleTyping}
                  />
                </div>
              </div>
            </div>

            <audio ref={audioRef} preload="auto" />
          </div>
        </div>
      </div>
    );
  }

  // Main Game Screen
  return (
    <div className="mobile-viewport-fix bg-gradient-to-br from-blue-900 via-purple-800 to-pink-900">
      <div className="mobile-scroll-container">
        <div className="game-content-container content-safe-area">
          <ConnectionStatus />
          <MobileChatToggle />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
          
          <div ref={mainContainerRef} className="max-w-6xl mx-auto relative z-10 min-h-full flex flex-col safe-area-padding">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 px-2 pb-6">
              {/* Main Game Content */}
              <div className="lg:col-span-2 flex flex-col min-h-0">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                  <div>
                    <h2 className="text-lg font-bold text-white">Room: {roomId}</h2>
                    <div className="text-white/70 flex items-center space-x-2 text-sm">
                      <Users className="w-3 h-3" />
                      <span>{players.length} players</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-xs text-white/70">Round</div>
                      <div className="text-base font-bold text-white">
                        {currentRound} / {totalRounds}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs text-white/70">Votes</div>
                      <div className="text-base font-bold text-white">
                        {voteCount} / {players.length}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="border-white/20 text-white hover:bg-white/10 p-2 h-9 mobile-btn-md"
                      size="sm"
                    >
                      {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>

                {/* Main Game Content */}
                <Card className="p-4 sm:p-6 bg-white/10 backdrop-blur-lg border-0 shadow-2xl flex-1 flex flex-col min-h-0">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-6 gradient-text">
                      Who's Most Likely?
                    </h2>

                    <Card className="p-4 sm:p-6 mb-6 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 border-2 border-purple-400/30 min-h-[120px] flex items-center justify-center backdrop-blur-sm">
                      <p className="text-xl sm:text-2xl font-bold text-center text-white leading-tight">
                        {currentScenario}
                      </p>
                    </Card>

                    <div className="mb-4">
                      <p className="text-white/80 mb-3 text-base">
                        {hasVoted 
                          ? "✅ You've voted! Waiting for other players..." 
                          : "Choose who you think is most likely (can't choose yourself!)"}
                      </p>
                      
                      {!hasVoted && selectedPlayer && (
                        <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-2 mb-3">
                          <p className="text-green-300 font-medium text-sm">
                            You selected: <span className="font-bold">{selectedPlayer}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Player Selection Grid */}
                  {!hasVoted && (
                    <div className="flex-1 overflow-y-auto min-h-0 mb-6 custom-scrollbar">
                      <div className="grid grid-cols-1 gap-3">
                        {players
                          .filter(player => player.name !== playerName) // Can't vote for yourself
                          .map((player) => (
                            <div
                              key={player.name}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                selectedPlayer === player.name
                                  ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-green-400 scale-105 shadow-lg'
                                  : 'bg-white/10 border-white/20 hover:bg-white/20 hover:scale-102'
                              }`}
                              onClick={() => setSelectedPlayer(player.name)}
                            >
                              <div className="flex items-center space-x-3">
                                <Avatar className="w-10 h-10 border-2 border-white/30">
                                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                    {player.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="text-base font-bold text-white">{player.name}</h3>
                                  <p className="text-white/70 text-xs">Click to select</p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {!hasVoted ? (
                    <Button
                      onClick={submitVote}
                      disabled={!selectedPlayer}
                      className="w-full mobile-btn-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Submit Your Vote
                    </Button>
                  ) : (
                    <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Timer className="w-4 h-4 text-blue-400 animate-pulse" />
                        <span className="text-blue-300 text-base font-medium">Waiting for other players...</span>
                      </div>
                      <Progress value={(voteCount / players.length) * 100} className="h-1.5 bg-white/20" />
                      <p className="text-white/70 mt-2 text-sm">
                        {voteCount} of {players.length} players have voted
                      </p>
                    </div>
                  )}
                </Card>
              </div>

              {/* Chat Panel */}
              <div className={`lg:col-span-1 flex flex-col min-h-0 ${showChat ? 'flex' : 'hidden lg:flex'}`}>
                <ChatPanel 
                  chatMessages={chatMessages}
                  playerName={playerName}
                  typingUsers={typingUsers}
                  onSendMessage={handleSendChatMessage}
                  isConnected={connectionStatus === "connected"}
                  onTyping={handleTyping}
                />
              </div>
            </div>
          </div>

          <audio ref={audioRef} preload="auto" />
        </div>
      </div>
    </div>
  );
};
export default WhosMostLikely;