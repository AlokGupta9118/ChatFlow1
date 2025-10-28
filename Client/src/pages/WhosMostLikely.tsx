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
  ChevronDown, ChevronUp, Smartphone, Monitor, Copy
} from "lucide-react";
import { Link } from "react-router-dom";

const socket = io(import.meta.env.VITE_API_URL, {
  transports: ['websocket', 'polling'],
  timeout: 10000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Local storage keys for persistence
const STORAGE_KEYS = {
  PLAYER_DATA: 'mostlikely_player_data',
  ROOM_DATA: 'mostlikely_room_data',
  GAME_STATE: 'mostlikely_game_state'
};

// Device detection hook
const useDeviceDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
};

// Persistence hooks
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.log(`Error setting localStorage key "${key}":`, error);
    }
  };

  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.log(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue];
};

// ChatInput component
const ChatInput = ({ onSendMessage, disabled, onTyping }) => {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleSubmit = useCallback(() => {
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue);
      setInputValue("");
      
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
    
    if (value.trim() && !disabled) {
      onTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
        typingTimeoutRef.current = null;
      }, 1000);
    } else {
      onTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [onTyping, disabled]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex gap-2 p-3 bg-white/95 border-t border-gray-200 safe-area-inset-bottom">
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        placeholder="Type a message..."
        className="flex-1 bg-white border-gray-300 min-h-[44px] text-sm"
        disabled={disabled}
      />
      <Button
        onClick={handleSubmit}
        disabled={!inputValue.trim() || disabled}
        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white flex-shrink-0 min-w-[60px] min-h-[44px] shadow-lg"
        size="sm"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
};

// ChatPanel component
const ChatPanel = React.memo(({ 
  chatMessages, 
  playerName, 
  typingUsers, 
  onSendMessage,
  isConnected,
  onTyping
}) => {
  const chatContainerRef = useRef(null);

  const formatChatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  return (
    <Card className="h-full flex flex-col bg-white/95 backdrop-blur-sm shadow-xl rounded-xl border border-gray-200">
      <div className="p-3 border-b border-gray-200 bg-white/80 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 flex items-center">
            <MessageCircle className="w-4 h-4 mr-2 text-blue-600" />
            Game Chat
          </h3>
          <Badge variant="outline" className="text-xs">
            {isConnected ? "Online" : "Offline"}
          </Badge>
        </div>
        
        {typingUsers.size > 0 && (
          <div className="text-xs text-gray-500 mt-1 truncate">
            {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
          </div>
        )}
      </div>

      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 scroll-smooth"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overflowY: 'auto'
        }}
      >
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        ) : (
          chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === playerName ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl p-2 ${
                  message.sender === playerName
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                }`}
              >
                {message.sender !== playerName && (
                  <div className="text-xs font-semibold mb-1 opacity-75">
                    {message.sender}
                  </div>
                )}
                <div className="text-sm break-words">{message.content}</div>
                <div className={`text-xs mt-1 ${
                  message.sender === playerName ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatChatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-gray-200 flex-shrink-0">
        <ChatInput 
          onSendMessage={onSendMessage} 
          disabled={!isConnected}
          onTyping={onTyping}
        />
      </div>
    </Card>
  );
});

const WhosMostLikely = () => {
  const isMobile = useDeviceDetection();
  
  // Persistent states
  const [savedPlayerData, setSavedPlayerData, removeSavedPlayerData] = useLocalStorage(STORAGE_KEYS.PLAYER_DATA, null);
  const [savedRoomData, setSavedRoomData, removeSavedRoomData] = useLocalStorage(STORAGE_KEYS.ROOM_DATA, null);
  const [savedGameState, setSavedGameState, removeSavedGameState] = useLocalStorage(STORAGE_KEYS.GAME_STATE, null);

  // Game states
  const [roomId, setRoomId] = useState(savedRoomData?.roomId || "");
  const [playerName, setPlayerName] = useState(savedPlayerData?.name || "");
  const [isHost, setIsHost] = useState(savedRoomData?.isHost || false);
  const [joined, setJoined] = useState(savedRoomData?.joined || false);
  const [players, setPlayers] = useState(savedGameState?.players || []);
  const [gameStarted, setGameStarted] = useState(savedGameState?.gameStarted || false);
  const [gameFinished, setGameFinished] = useState(savedGameState?.gameFinished || false);
  
  // Round states
  const [currentScenario, setCurrentScenario] = useState(savedGameState?.currentScenario || "");
  const [currentRound, setCurrentRound] = useState(savedGameState?.currentRound || 1);
  const [totalRounds, setTotalRounds] = useState(savedGameState?.totalRounds || 10);
  const [hasVoted, setHasVoted] = useState(savedGameState?.hasVoted || false);
  const [votes, setVotes] = useState(savedGameState?.votes || {});
  const [roundResults, setRoundResults] = useState(savedGameState?.roundResults || null);
  const [finalResults, setFinalResults] = useState(savedGameState?.finalResults || null);
  
  // UI states
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("connected");
  const [voteCount, setVoteCount] = useState(savedGameState?.voteCount || 0);
  const [selectedPlayer, setSelectedPlayer] = useState(savedGameState?.selectedPlayer || "");

  // Chat states
  const [chatMessages, setChatMessages] = useState(savedGameState?.chatMessages || []);
  const [showChat, setShowChat] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());

  const audioRef = useRef(null);
  const mainContainerRef = useRef(null);
  const reconnectAttempted = useRef(false);

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    const gameState = {
      players,
      gameStarted,
      gameFinished,
      currentScenario,
      currentRound,
      totalRounds,
      hasVoted,
      votes,
      roundResults,
      finalResults,
      voteCount,
      selectedPlayer,
      chatMessages
    };
    setSavedGameState(gameState);
  }, [
    players, gameStarted, gameFinished, currentScenario, currentRound,
    totalRounds, hasVoted, votes, roundResults, finalResults, voteCount,
    selectedPlayer, chatMessages, setSavedGameState
  ]);

  // Save room data
  useEffect(() => {
    const roomData = {
      roomId,
      isHost,
      joined
    };
    setSavedRoomData(roomData);
  }, [roomId, isHost, joined, setSavedRoomData]);

  // Save player data
  useEffect(() => {
    const playerData = {
      name: playerName
    };
    setSavedPlayerData(playerData);
  }, [playerName, setSavedPlayerData]);

  // Fixed scrolling implementation
  useEffect(() => {
    const updateViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', updateViewportHeight);

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
    };
  }, []);

  // Reset scroll position on game state changes
  useEffect(() => {
    if (mainContainerRef.current) {
      mainContainerRef.current.scrollTop = 0;
    }
  }, [gameStarted, gameFinished, roundResults, currentRound]);

  // Auto-rejoin functionality
  useEffect(() => {
    if (savedRoomData?.joined && savedPlayerData?.name && !reconnectAttempted.current) {
      reconnectAttempted.current = true;
      setTimeout(() => {
        attemptRejoin();
      }, 1000);
    }
  }, [savedRoomData, savedPlayerData]);

  const attemptRejoin = () => {
    if (savedRoomData?.roomId && savedPlayerData?.name) {
      console.log("Attempting to rejoin game...");
      socket.emit("rejoin-mostlikely-room", {
        roomId: savedRoomData.roomId,
        playerName: savedPlayerData.name
      });
    }
  };

  // Sound effects
  const playSound = (soundName) => {
    if (!soundEnabled) return;
    
    const sounds = {
      select: "/sounds/select.mp3",
      success: "/sounds/success.mp3",
      notification: "/sounds/notification.mp3",
      victory: "/sounds/victory.mp3",
      message: "/sounds/message.mp3"
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

    socket.emit("send-chat-message", { roomId, message });
  }, [roomId, playerName]);

  // Typing handler
  const handleTyping = useCallback((isTyping) => {
    if (!socket) return;
    socket.emit("typing", { roomId, isTyping });
  }, [roomId]);

  // Socket event handlers
  useEffect(() => {
    const handleRoomCreated = (room) => {
      console.log("Room created:", room);
      setRoomId(room.roomId);
      setIsHost(true);
      setJoined(true);
      setPlayers(room.players);
      setGameStarted(false);
      setGameFinished(false);
      setRoundResults(null);
      setFinalResults(null);
      setCurrentRound(1);
      setHasVoted(false);
      setSelectedPlayer("");
      setVotes({});
      setVoteCount(0);
      setChatMessages([]);
      playSound("success");
    };

    const handleRoomJoined = (room) => {
      console.log("Room joined:", room);
      setRoomId(room.roomId);
      setPlayers(room.players);
      setJoined(true);
      setIsHost(false);
      setGameStarted(false);
      setGameFinished(false);
      setRoundResults(null);
      setFinalResults(null);
      setCurrentRound(1);
      setHasVoted(false);
      setSelectedPlayer("");
      setVotes({});
      setVoteCount(0);
      setChatMessages([]);
      playSound("success");
    };

    const handleRejoinSuccess = (data) => {
      console.log("Rejoined successfully:", data);
      setRoomId(data.roomId);
      setPlayers(data.players);
      setJoined(true);
      setIsHost(data.isHost);
      
      if (data.gameState) {
        setGameStarted(data.gameState.gameStarted || false);
        setGameFinished(data.gameState.gameFinished || false);
        setCurrentScenario(data.gameState.currentScenario || "");
        setCurrentRound(data.gameState.currentRound || 1);
        setTotalRounds(data.gameState.totalRounds || 10);
        setHasVoted(data.gameState.hasVoted || false);
        setVotes(data.gameState.votes || {});
        setRoundResults(data.gameState.roundResults || null);
        setFinalResults(data.gameState.finalResults || null);
        setVoteCount(data.gameState.voteCount || 0);
        setSelectedPlayer(data.gameState.selectedPlayer || "");
      }
      
      if (data.chatHistory) {
        setChatMessages(data.chatHistory);
      }
      
      playSound("success");
    };

    const handleRejoinFailed = (error) => {
      console.log("Rejoin failed:", error);
      // Clear saved data if rejoin fails
      removeSavedPlayerData();
      removeSavedRoomData();
      removeSavedGameState();
      reconnectAttempted.current = false;
      setJoined(false);
    };

    const handleUpdatePlayers = (playersList) => {
      console.log("Players updated:", playersList);
      setPlayers(playersList);
      playSound("notification");
    };

    const handleGameStarted = (data) => {
      console.log("Game started:", data);
      setGameStarted(true);
      setCurrentScenario(data.scenario);
      setCurrentRound(data.currentRound);
      setTotalRounds(data.totalRounds);
      setHasVoted(false);
      setSelectedPlayer("");
      setGameFinished(false);
      setRoundResults(null);
      setFinalResults(null);
      setVotes({});
      setVoteCount(0);
      playSound("success");
    };

    const handleVoteReceived = (data) => {
      console.log("Vote received:", data);
      setVotes(prev => ({
        ...prev,
        [data.voter]: data.votedFor
      }));
      setVoteCount(data.votesSoFar);
    };

    const handleRoundResults = (results) => {
      console.log("Round results:", results);
      setRoundResults(results);
      setVotes(results.votes || {});
      setHasVoted(false);
      setSelectedPlayer("");
      setVoteCount(0);
      playSound("victory");
    };

    const handleNextRound = (data) => {
      console.log("Next round:", data);
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
      console.log("Game finished:", data);
      setGameFinished(true);
      setFinalResults(data);
      setGameStarted(false);
      setRoundResults(null);
      playSound("victory");
    };

    const handleConnectionError = () => {
      console.log("Connection error");
      setConnectionStatus("disconnected");
    };

    const handleReconnect = () => {
      console.log("Reconnected");
      setConnectionStatus("connected");
      // Attempt to rejoin on reconnect
      if (joined && playerName && roomId) {
        setTimeout(attemptRejoin, 500);
      }
    };

    const handleDisconnect = () => {
      console.log("Disconnected");
      setConnectionStatus("disconnected");
    };

    // Chat event handlers
    const handleChatMessage = (message) => {
      console.log("Chat message received:", message);
      setChatMessages(prev => [...prev, message]);
      if (message.sender !== playerName) {
        playSound("message");
      }
    };

    const handleChatHistory = (messages) => {
      console.log("Chat history received:", messages);
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
    socket.on("mostlikely-rejoin-success", handleRejoinSuccess);
    socket.on("mostlikely-rejoin-failed", handleRejoinFailed);
    socket.on("mostlikely-update-players", handleUpdatePlayers);
    socket.on("mostlikely-game-started", handleGameStarted);
    socket.on("vote-received", handleVoteReceived);
    socket.on("mostlikely-round-results", handleRoundResults);
    socket.on("mostlikely-next-round", handleNextRound);
    socket.on("mostlikely-game-finished", handleGameFinished);
    socket.on("connect_error", handleConnectionError);
    socket.on("reconnect", handleReconnect);
    socket.on("disconnect", handleDisconnect);

    // Chat listeners
    socket.on("receive-chat-message", handleChatMessage);
    socket.on("chat-history", handleChatHistory);
    socket.on("user-typing", handleUserTyping);

    return () => {
      // Cleanup event listeners
      socket.off("mostlikely-room-created", handleRoomCreated);
      socket.off("mostlikely-room-joined", handleRoomJoined);
      socket.off("mostlikely-rejoin-success", handleRejoinSuccess);
      socket.off("mostlikely-rejoin-failed", handleRejoinFailed);
      socket.off("mostlikely-update-players", handleUpdatePlayers);
      socket.off("mostlikely-game-started", handleGameStarted);
      socket.off("vote-received", handleVoteReceived);
      socket.off("mostlikely-round-results", handleRoundResults);
      socket.off("mostlikely-next-round", handleNextRound);
      socket.off("mostlikely-game-finished", handleGameFinished);
      socket.off("connect_error", handleConnectionError);
      socket.off("reconnect", handleReconnect);
      socket.off("disconnect", handleDisconnect);

      // Chat listeners
      socket.off("receive-chat-message", handleChatMessage);
      socket.off("chat-history", handleChatHistory);
      socket.off("user-typing", handleUserTyping);
    };
  }, [playerName, roomId, joined]);

  // Room management functions
  const createRoom = () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
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
    socket.emit("join-mostlikely-room", { 
      roomId: roomId.trim().toUpperCase(), 
      player: { name: playerName.trim() } 
    });
  };

  const leaveRoom = () => {
    socket.emit("leave-mostlikely-room", { roomId });
    removeSavedPlayerData();
    removeSavedRoomData();
    removeSavedGameState();
    window.location.reload();
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
    socket.emit("restart-mostlikely-game", { roomId });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      alert("Room code copied to clipboard!");
    });
  };

  // Player Card Component - Improved for mobile
  const PlayerCard = ({ player, index, showVotes = false, voteCounts = {}, onSelect = null, isSelected = false, canSelect = false }) => (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
        isSelected
          ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400 scale-105' 
          : canSelect
            ? 'bg-white/10 border-white/20 hover:bg-white/20 cursor-pointer'
            : 'bg-white/10 border-white/20'
      } ${canSelect ? 'cursor-pointer active:scale-95' : ''}`}
      onClick={canSelect ? () => onSelect(player.name) : undefined}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <Avatar className="w-8 h-8 border-2 border-white/30 flex-shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
            {player.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <span className="font-semibold text-white text-sm truncate">{player.name}</span>
          {player.isHost && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
        </div>
      </div>
      
      <div className="flex items-center space-x-2 flex-shrink-0">
        {showVotes && voteCounts[player.name] > 0 && (
          <Badge className="bg-green-500 text-white text-xs">
            {voteCounts[player.name]} votes
          </Badge>
        )}
        {isSelected && (
          <Badge className="bg-blue-500 text-white text-xs">
            Selected
          </Badge>
        )}
      </div>
    </div>
  );

  // Connection Status
  const ConnectionStatus = () => (
    <div className={`fixed top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold z-50 backdrop-blur-sm border ${
      connectionStatus === "connected" 
        ? "bg-green-500/90 text-white border-green-400" 
        : "bg-red-500/90 text-white border-red-400 animate-pulse"
    }`}>
      {connectionStatus === "connected" ? "🟢 Connected" : "🔴 Disconnected"}
    </div>
  );

  // Device Indicator
  const DeviceIndicator = () => (
    <div className="fixed top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold z-50 backdrop-blur-sm border bg-blue-500/90 text-white border-blue-400">
      {isMobile ? <Smartphone className="w-3 h-3 inline mr-1" /> : <Monitor className="w-3 h-3 inline mr-1" />}
      {isMobile ? "Mobile" : "Desktop"}
    </div>
  );

  // Fixed Mobile Chat Toggle Button
  const MobileChatToggle = () => (
    <Button
      onClick={() => setShowChat(!showChat)}
      className="fixed bottom-6 left-4 z-50 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-2xl rounded-full w-14 h-14 border-2 border-white/20 safe-area-inset-bottom"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      {showChat ? <ChevronDown className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
    </Button>
  );

  // Reconnection Banner
  const ReconnectionBanner = () => {
    if (connectionStatus === "connected" || !joined) return null;
    
    return (
      <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50 animate-pulse">
        <div className="flex items-center justify-center space-x-2">
          <Timer className="w-4 h-4" />
          <span className="text-sm font-medium">Attempting to reconnect...</span>
          <Button 
            onClick={attemptRejoin} 
            size="sm" 
            className="bg-white/20 hover:bg-white/30 text-xs h-6"
          >
            Retry Now
          </Button>
        </div>
      </div>
    );
  };

  // Join/Create Screen
  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-900 p-4 relative overflow-hidden" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
        <ConnectionStatus />
        <DeviceIndicator />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        
        <div ref={mainContainerRef} className="max-w-2xl mx-auto relative z-10 h-full flex flex-col justify-center overflow-y-auto">
          <Link to="/Games" className="mb-4">
            <Button variant="ghost" className="text-white hover:bg-white/20 backdrop-blur-sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Games
            </Button>
          </Link>

          <Card className="p-6 bg-white/10 backdrop-blur-lg border-0 shadow-2xl mx-2 mb-8">
            <h1 className="text-3xl md:text-5xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Who's Most Likely?
            </h1>

            <div className="space-y-4 mb-6">
              <div>
                <Label htmlFor="playerName" className="text-white font-medium mb-2 block">
                  Your Name
                </Label>
                <Input
                  id="playerName"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50 text-base h-12"
                />
              </div>

              <div>
                <Label htmlFor="roomId" className="text-white font-medium mb-2 block">
                  Room Code (optional)
                </Label>
                <Input
                  id="roomId"
                  placeholder="Enter room code to join"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50 text-base h-12"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={createRoom}
                disabled={!playerName.trim()}
                className="w-full py-4 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg h-14"
              >
                <Crown className="w-4 h-4 mr-2" />
                Create New Room
              </Button>

              <Button
                onClick={joinRoom}
                disabled={!playerName.trim() || !roomId.trim()}
                className="w-full py-4 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg h-14"
              >
                <Users className="w-4 h-4 mr-2" />
                Join Existing Room
              </Button>
            </div>

            {/* Auto-rejoin option */}
            {savedRoomData?.joined && savedPlayerData?.name && (
              <div className="mt-4 p-3 bg-blue-500/20 rounded-lg border border-blue-400/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm font-medium">Rejoin previous game?</p>
                    <p className="text-blue-200 text-xs">Room: {savedRoomData.roomId} as {savedPlayerData.name}</p>
                  </div>
                  <Button 
                    onClick={attemptRejoin}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-xs h-8"
                  >
                    Rejoin
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-6 p-3 bg-white/5 rounded-lg border border-white/10">
              <h4 className="font-semibold text-white mb-2 flex items-center justify-center text-sm">
                <Sparkles className="w-3 h-3 mr-2 text-yellow-400" />
                How it works
              </h4>
              <ul className="text-xs text-white/70 space-y-1 text-left">
                <li>• Create a room and share the code with friends</li>
                <li>• Vote for who's most likely to do something</li>
                <li>• You CAN vote for yourself on all devices</li>
                <li>• Most votes wins the round</li>
                <li>• Play multiple rounds to find the most likely person</li>
                <li className="text-blue-300">• 💬 Real-time chat with other players!</li>
                <li className="text-green-300">• 🔄 Auto-reconnect if you lose connection!</li>
              </ul>
            </div>
          </Card>
        </div>

        <audio ref={audioRef} preload="auto" />
      </div>
    );
  }

  // Waiting Room
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-900 p-4 relative overflow-hidden" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
        <ConnectionStatus />
        <DeviceIndicator />
        <ReconnectionBanner />
        <MobileChatToggle />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        
        <div ref={mainContainerRef} className="max-w-6xl mx-auto relative z-10 h-full flex flex-col">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 px-2 pt-4">
            <Button
              variant="ghost"
              onClick={leaveRoom}
              className="text-white hover:bg-white/20 backdrop-blur-sm self-start"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Leave Room
            </Button>
            <div className="flex items-center space-x-2">
              <div className="text-white font-medium bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm text-center">
                Room: {roomId}
              </div>
              <Button
                onClick={copyRoomCode}
                size="sm"
                className="bg-white/20 hover:bg-white/30 border-white/30 text-white"
              >
                <Copy className="w-3 h-3" />
              </Button>
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
                  
                  <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Who's Most Likely?
                  </h2>
                  <p className="text-white/70 mb-6">Waiting for players to join...</p>

                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-white mb-2">Room Code: {roomId}</h3>
                    <Button 
                      onClick={copyRoomCode}
                      className="bg-white/20 hover:bg-white/30 border-white/30 text-sm"
                      size="sm"
                    >
                      <Copy className="w-3 h-3 mr-1" />
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
                    className="w-full py-4 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-2xl h-14"
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
    );
  }

  // Game Finished Screen
  if (gameFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-900 p-4 relative overflow-hidden" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
        <ConnectionStatus />
        <DeviceIndicator />
        <ReconnectionBanner />
        <MobileChatToggle />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        
        <div ref={mainContainerRef} className="max-w-6xl mx-auto relative z-10 h-full flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 px-2 pb-6">
            {/* Main Content */}
            <div className="lg:col-span-2 flex flex-col min-h-0">
              <Card className="p-4 sm:p-6 bg-white/10 backdrop-blur-lg border-0 shadow-2xl flex-1 flex flex-col min-h-0">
                <div className="text-center mb-6">
                  <Target className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
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
                  {isHost ? (
                    <Button 
                      onClick={restartGame}
                      className="flex-1 py-4 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-14"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Play Again
                    </Button>
                  ) : (
                    <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Timer className="w-4 h-4 text-blue-400 animate-pulse" />
                        <span className="text-blue-300 text-sm">Waiting for host to start new game...</span>
                      </div>
                    </div>
                  )}
                  <Button 
                    onClick={leaveRoom}
                    className="flex-1 py-4 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-14"
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
    );
  }

  // Round Results Screen
  if (roundResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-900 p-4 relative overflow-hidden" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
        <ConnectionStatus />
        <DeviceIndicator />
        <ReconnectionBanner />
        <MobileChatToggle />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        
        <div ref={mainContainerRef} className="max-w-6xl mx-auto relative z-10 h-full flex flex-col">
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
                    {Object.entries(roundResults.voteCounts || {})
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
                    className="w-full py-4 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-14"
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
    );
  }

  // Main Game Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-900 p-4 relative overflow-hidden" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      <ConnectionStatus />
      <DeviceIndicator />
      <ReconnectionBanner />
      <MobileChatToggle />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      
      <div ref={mainContainerRef} className="max-w-6xl mx-auto relative z-10 h-full flex flex-col">
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
                  className="border-white/20 text-white hover:bg-white/10 p-2"
                  size="sm"
                >
                  {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            {/* Main Game Content */}
            <Card className="p-4 sm:p-6 bg-white/10 backdrop-blur-lg border-0 shadow-2xl flex-1 flex flex-col min-h-0">
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
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
                      : "Choose who you think is most likely (you can vote for anyone!)"}
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

              {/* Player Selection Grid - FIXED: Now includes all players including yourself */}
              {!hasVoted && (
                <div className="flex-1 overflow-y-auto min-h-0 mb-6 custom-scrollbar">
                  <div className="grid grid-cols-1 gap-3">
                    {players.map((player) => (
                      <PlayerCard
                        key={player.name}
                        player={player}
                        onSelect={setSelectedPlayer}
                        isSelected={selectedPlayer === player.name}
                        canSelect={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              {!hasVoted ? (
                <Button
                  onClick={submitVote}
                  disabled={!selectedPlayer}
                  className="w-full py-4 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg h-14"
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
  );
};

export default WhosMostLikely;