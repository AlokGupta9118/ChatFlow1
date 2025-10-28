import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Volume2, VolumeX, Settings, Users, Crown, Sparkles, Timer, Trophy, 
  Gamepad2, Camera, X, Ban, MessageCircle, Send, Smile, Paperclip, ArrowLeft,
  Loader2
} from "lucide-react";

const DEFAULT_SOCKET_URL = `${import.meta.env.VITE_API_URL}`;

// Color system for user avatars and names
const userColors = [
  'from-purple-500 to-pink-500',
  'from-blue-500 to-cyan-500',
  'from-green-500 to-emerald-500',
  'from-orange-500 to-red-500',
  'from-indigo-500 to-purple-500',
  'from-teal-500 to-blue-500',
  'from-yellow-500 to-orange-500',
  'from-pink-500 to-rose-500'
];

const getUserColor = (userId) => {
  if (!userId) return userColors[0];
  const index = userId.toString().charCodeAt(0) % userColors.length;
  return userColors[index];
};

// Updated ChatInput component with game-level styling
const ChatInput = ({ onSendMessage, disabled, onTyping, chatInput, setChatInput }) => {
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleSubmit = () => {
    if (chatInput.trim() && !disabled) {
      onSendMessage(chatInput);
      setChatInput("");
      
      // Clear typing indicator when sending
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      onTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setChatInput(value);
    
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
  };

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
        value={chatInput}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        placeholder={disabled ? "Connecting..." : "Type your message..."}
        className="flex-1 bg-gray-700 border-2 border-purple-500/50 text-white placeholder-gray-400 min-h-[48px] text-sm rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
        disabled={disabled}
      />
      <Button
        onClick={handleSubmit}
        disabled={!chatInput.trim() || disabled}
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white flex-shrink-0 min-w-[60px] min-h-[48px] shadow-lg rounded-xl border-2 border-purple-400/30 transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
        size="sm"
      >
        <Send className="w-5 h-5" />
      </Button>
    </div>
  );
};

// Updated ChatPanel component with game-level styling
const ChatPanel = React.memo(({ 
  chatMessages, 
  playerName, 
  typingUsers, 
  onSendMessage,
  isConnected,
  onTyping,
  chatInput,
  setChatInput,
  onClose
}) => {
  const chatContainerRef = useRef(null);

  const formatChatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Improved scroll to bottom function
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  return (
    <Card className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 backdrop-blur-sm shadow-2xl rounded-xl border-2 border-purple-500/30">
      {/* Chat Header */}
      <div className="p-4 border-b border-purple-500/30 bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <MessageCircle className="w-6 h-6 text-white" />
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Game Chat</h3>
              <p className="text-blue-100 text-xs">
                {isConnected ? "Live with players" : "Connecting..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${
              isConnected 
                ? "bg-green-500 hover:bg-green-600 text-white" 
                : "bg-red-500 hover:bg-red-600 text-white"
            } shadow-lg`}>
              {isConnected ? "🟢 Online" : "🔴 Offline"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="md:hidden h-6 w-6 p-0 text-white hover:bg-white/20"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Typing indicators */}
        {typingUsers.size > 0 && (
          <div className="flex items-center mt-3 p-2 bg-white/10 rounded-lg border border-white/20">
            <div className="flex space-x-1 mr-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-green-300 text-sm font-medium">
              {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scroll-smooth bg-gradient-to-b from-gray-800/50 to-gray-900/50 custom-scrollbar"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overflowY: 'auto'
        }}
      >
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-300 py-12">
            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-purple-300" />
            </div>
            <p className="text-lg font-semibold text-white mb-2">No messages yet</p>
            <p className="text-purple-200 text-sm">Start the conversation!</p>
          </div>
        ) : (
          chatMessages.map((message, index) => {
            const isOwnMessage = message.sender === playerName;
            const userColor = getUserColor(message.sender);
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl p-4 shadow-lg ${
                  isOwnMessage
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md'
                    : 'bg-gradient-to-r from-gray-700 to-gray-800 border border-gray-600 text-white rounded-bl-md'
                }`}>
                  {/* Sender name for others' messages */}
                  {!isOwnMessage && (
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${userColor} flex items-center justify-center text-xs font-bold text-white`}>
                        {message.sender.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-sm text-gray-200">
                        {message.sender}
                      </span>
                    </div>
                  )}
                  
                  {/* Message content */}
                  <div className="text-sm break-words leading-relaxed">
                    {message.content}
                  </div>
                  
                  {/* Message time */}
                  <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mt-2`}>
                    <div className={`text-xs ${
                      isOwnMessage ? 'text-blue-200' : 'text-gray-400'
                    }`}>
                      {formatChatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Input */}
      <div className="border-t border-purple-500/30 bg-gradient-to-r from-gray-800 to-gray-900 rounded-b-xl">
        <ChatInput 
          onSendMessage={onSendMessage}
          disabled={!isConnected}
          onTyping={onTyping}
          chatInput={chatInput}
          setChatInput={setChatInput}
        />
      </div>
    </Card>
  );
});

export default function TruthOrDare({ currentUser }) {
  const params = useParams();
  const navigate = useNavigate();

  const [socket, setSocket] = useState(null);
  const [stage, setStage] = useState("lobby"); // lobby | waiting | playing | results
  const [roomId, setRoomId] = useState(params.roomId || localStorage.getItem("roomId") || "");
  const [localName, setLocalName] = useState(currentUser?.name || localStorage.getItem("localName") || "");
  const [players, setPlayers] = useState(JSON.parse(localStorage.getItem("players") || "[]"));
  const [prevPlayers, setPrevPlayers] = useState(players);
  const [isHost, setIsHost] = useState(localStorage.getItem("isHost") === "true");

  // Game state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [promptType, setPromptType] = useState("truth"); // truth | dare
  const [promptText, setPromptText] = useState("");
  const [prompts, setPrompts] = useState([]);
  const [chosenPrompt, setChosenPrompt] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [truthDareChoice, setTruthDareChoice] = useState(null);
  const [isChoicePending, setIsChoicePending] = useState(false);
  
  // Game features
  const [scores, setScores] = useState({});
  const [gameSettings, setGameSettings] = useState({
    timerDuration: 30,
    enableScoring: true,
    soundEnabled: true,
    maxPlayers: 8
  });
  const [timeLeft, setTimeLeft] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [playerStats, setPlayerStats] = useState({});
  const [achievements, setAchievements] = useState([]);
  
  // Proof system
  const [proofImage, setProofImage] = useState(null);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [showKickMenu, setShowKickMenu] = useState(false);
  const [proofs, setProofs] = useState({});
  const [showProofModal, setShowProofModal] = useState(false);
  const [currentProof, setCurrentProof] = useState(null);
  const [truthCompletionText, setTruthCompletionText] = useState("");

  // 🔥 CHAT STATE - UPDATED: Using new ChatPanel component
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());

  // FIXED: New state for next round loading
  const [nextRoundLoading, setNextRoundLoading] = useState(false);

  // NEW: Reconnection state
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const promptsRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mainContainerRef = useRef(null);

  promptsRef.current = prompts;

  // Add CSS for custom scrollbar
  useEffect(() => {
    const styles = `
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

      .safe-area-padding {
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
        padding-bottom: env(safe-area-inset-bottom);
      }
      
      .safe-area-inset-bottom {
        margin-bottom: env(safe-area-inset-bottom);
      }
      
      @media (max-width: 1024px) {
        .safe-area-padding {
          padding-left: max(1rem, env(safe-area-inset-left));
          padding-right: max(1rem, env(safe-area-inset-right));
        }
      }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
    
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  // FIXED: Better mobile scrolling
  useEffect(() => {
    if (mainContainerRef.current) {
      mainContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [stage, selectedPlayer, chosenPrompt, showChat]);

  // NEW: Automatically set prompt type based on selected player's choice
  useEffect(() => {
    if (truthDareChoice && selectedPlayer !== localName) {
      setPromptType(truthDareChoice.choice.toLowerCase());
    }
  }, [truthDareChoice, selectedPlayer, localName]);

  // Sound effects
  const playSound = (soundName) => {
    if (!gameSettings.soundEnabled) return;
    
    const sounds = {
      spin: "/sounds/spin-start.mp3",
      select: "/sounds/select.mp3",
      success: "/sounds/success.mp3",
      notification: "/sounds/notification.mp3",
      message: "/sounds/message.mp3"
    };
    
    if (audioRef.current) {
      audioRef.current.src = sounds[soundName];
      audioRef.current.play().catch(() => {});
    }
  };

  // Timer management
  useEffect(() => {
    if (timeLeft === null) return;
    
    if (timeLeft === 0) {
      if (isChoicePending && selectedPlayer === localName) {
        const autoChoice = Math.random() > 0.5 ? "Truth" : "Dare";
        submitTruthDare(autoChoice);
        addToast(`Time's up! Auto-selected: ${autoChoice}`, 2000);
      }
      return;
    }
    
    timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, isChoicePending]);

  // Check proof status when selected player changes
  useEffect(() => {
    if (selectedPlayer === localName && chosenPrompt) {
      const proofKey = `proof_${roomId}_${localName}_${Date.now()}`;
      const existingProof = localStorage.getItem(proofKey);
      if (existingProof) {
        setProofImage(existingProof);
        setProofUploaded(true);
      } else {
        setProofImage(null);
        setProofUploaded(false);
      }
    }
  }, [selectedPlayer, chosenPrompt, roomId, localName]);

  // 🔌 Socket initialization with IMPROVED RECONNECTION & CHAT HANDLERS
  useEffect(() => {
    const sock = io(DEFAULT_SOCKET_URL, { 
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    sock.on("connect", () => {
      console.log("✅ Socket connected:", sock.id);
      setIsReconnecting(false);
      setReconnectAttempts(0);
      addToast("Connected to game server", 2000);
      
      // NEW: Improved rejoin logic
      const savedRoomId = localStorage.getItem("roomId");
      const savedName = localStorage.getItem("localName");
      
      if (savedRoomId && savedName && stage !== "lobby") {
        console.log("🔄 Attempting to rejoin room:", savedRoomId);
        sock.emit("rejoin-room", { 
          roomId: savedRoomId, 
          name: savedName,
          isHost: localStorage.getItem("isHost") === "true"
        });
      }
    });

    sock.on("reconnecting", (attempt) => {
      console.log("🔄 Reconnecting attempt:", attempt);
      setIsReconnecting(true);
      setReconnectAttempts(attempt);
      addToast(`Reconnecting... (${attempt}/5)`, 3000, "warning");
    });

    sock.on("reconnect_failed", () => {
      console.log("❌ Reconnection failed");
      setIsReconnecting(false);
      addToast("Failed to reconnect. Please refresh the page.", 5000, "error");
    });

    sock.on("reconnect_error", (error) => {
      console.log("⚠️ Reconnection error:", error);
    });

    // NEW: Improved room rejoin handling
    sock.on("room-rejoined", (room) => {
      console.log("🎉 Successfully rejoined room:", room);
      setRoomId(room.roomId);
      setPlayers(room.players);
      setPrevPlayers(room.players);
      setIsHost(room.players[0]?.name === localName);
      setStage(room.gameState?.stage || "waiting");
      
      // Restore game state if available
      if (room.gameState) {
        setSelectedPlayer(room.gameState.selectedPlayer || null);
        setTruthDareChoice(room.gameState.truthDareChoice || null);
        setChosenPrompt(room.gameState.chosenPrompt || null);
        setSpinning(room.gameState.spinning || false);
      }
      
      addToast("Successfully rejoined the game!", 3000, "success");
    });

    sock.on("room-created", (room) => {
      setRoomId(room.roomId);
      setPlayers(room.players);
      setPrevPlayers(room.players);
      setIsHost(true);
      setStage("waiting");

      localStorage.setItem("roomId", room.roomId);
      localStorage.setItem("isHost", "true");
      localStorage.setItem("players", JSON.stringify(room.players));
      playSound("success");
    });

    sock.on("room-joined", (room) => {
      setRoomId(room.roomId);
      setPlayers(room.players);
      setPrevPlayers(room.players);
      setIsHost(false);
      setStage("waiting");

      localStorage.setItem("roomId", room.roomId);
      localStorage.setItem("isHost", "false");
      localStorage.setItem("players", JSON.stringify(room.players));
      playSound("success");
    });

    sock.on("join-error", (msg) => addToast(`Join failed: ${msg}`, 3000, "error"));
    sock.on("create-error", (msg) => addToast(`Create failed: ${msg}`, 3000, "error"));

    sock.on("update-players", (playersList) => {
      const newPlayers = playersList.filter(p => !prevPlayers.some(prev => prev.name === p.name));
      newPlayers.forEach(p => {
        addToast(`${p.name} joined the game!`, 2000, "success");
        playSound("notification");
      });

      setPlayers(playersList);
      setPrevPlayers(playersList);
      localStorage.setItem("players", JSON.stringify(playersList));
    });

    sock.on("game-started", () => {
      setStage("playing");
      playSound("success");
      addToast("Game started! Get ready to play!", 2000, "success");
    });

    // FIXED: New socket event for spinner start - shows spinner on ALL screens
    sock.on("spinner-started", () => {
      console.log("🎡 Spinner started on all screens");
      setSpinning(true);
      setSelectedPlayer(null);
      setPrompts([]);
      setChosenPrompt(null);
      setTruthDareChoice(null);
      setIsChoicePending(false);
      setTimeLeft(null);
      setProofImage(null);
      setProofUploaded(false);
      setTruthCompletionText("");
      playSound("spin");
    });

    // FIXED: Player selection after spinner completes
    sock.on("player-selected", (player) => {
      console.log("🎯 Player selected:", player);
      setSelectedPlayer(player.name || player);
      setSpinning(false);
      setPrompts([]);
      setChosenPrompt(null);
      setTruthDareChoice(null);
      setIsChoicePending(player.name === localName);
      setTimeLeft(gameSettings.timerDuration);
      setProofImage(null);
      setProofUploaded(false);
      setTruthCompletionText("");
      playSound("select");
      
      setPlayerStats(prev => ({
        ...prev,
        [player.name]: {
          ...prev[player.name],
          timesSelected: (prev[player.name]?.timesSelected || 0) + 1
        }
      }));
    });

    // 🔥 NEW: Truth completion handler - shows to everyone
    sock.on("truth-completed", ({ player, completionText }) => {
      console.log("✅ Truth completed by:", player, completionText);
      addToast(`${player} completed their truth!`, 3000, "success");
      
      // Show the truth completion to everyone
      if (player === selectedPlayer) {
        setTruthCompletionText(completionText);
        setProofUploaded(true);
      }
    });

    // 🔥 CHAT SOCKET HANDLERS
    sock.on("receive-chat-message", (message) => {
      setChatMessages(prev => [...prev, message]);
      if (message.sender !== localName) {
        playSound("message");
      }
    });

    sock.on("user-typing", ({ userName, isTyping }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(userName);
        } else {
          newSet.delete(userName);
        }
        return newSet;
      });
    });

    sock.on("chat-history", (messages) => {
      setChatMessages(messages);
    });

    // FIXED: New socket event for next round loading
    sock.on("next-round-starting", () => {
      setNextRoundLoading(true);
      addToast("Next round starting...", 2000);
    });

    sock.on("next-round-started", () => {
      setNextRoundLoading(false);
      setSelectedPlayer(null);
      setPrompts([]);
      setChosenPrompt(null);
      setTruthDareChoice(null);
      setIsChoicePending(false);
      setTimeLeft(null);
      setProofImage(null);
      setProofUploaded(false);
      setTruthCompletionText("");
      setSpinning(false); // Ensure spinner is stopped
    });

    // Existing game handlers...
    sock.on("choose-truth-dare", () => {
      setIsChoicePending(true);
      setTimeLeft(gameSettings.timerDuration);
    });

    sock.on("truth-dare-chosen", ({ player, choice }) => {
      setTruthDareChoice({ player, choice });
      setIsChoicePending(false);
      setTimeLeft(null);
      
      if (gameSettings.enableScoring) {
        setScores(prev => ({
          ...prev,
          [player]: (prev[player] || 0) + 10
        }));
      }
    });

    // FIXED: Correct prompt type handling
    sock.on("receive-prompt", ({ prompt, askedBy, type }) => {
      setPrompts(prev => [...prev, { 
        id: Date.now(), 
        text: prompt, 
        from: askedBy, 
        type: type // Use the type from server
      }]);
      playSound("notification");
    });

    sock.on("prompt-completed", ({ player, prompt }) => {
      if (gameSettings.enableScoring) {
        setScores(prev => ({
          ...prev,
          [player]: (prev[player] || 0) + 25
        }));
      }
      
      addToast(`${player} completed their ${prompt.type}! +15 points`, 3000, "success");
      checkAchievements(player);
    });

    sock.on("player-kicked", ({ playerName, kickedBy }) => {
      if (playerName === localName) {
        addToast(`You were kicked from the room by ${kickedBy}`, 4000, "error");
        leaveRoom();
      } else {
        addToast(`${playerName} was kicked from the room`, 3000, "warning");
      }
    });

    sock.on("proof-uploaded-notification", ({ player, proofKey }) => {
      setProofs(prev => ({
        ...prev,
        [player]: proofKey
      }));
      addToast(`${player} uploaded proof for their dare!`, 3000, "success");
    });

    sock.on("proof-ready-for-review", ({ player }) => {
      if (isHost && player === selectedPlayer) {
        setProofUploaded(true);
        addToast(`${player} has uploaded proof. You can now start the next round!`, 3000, "success");
      }
    });

    sock.on("proof-view-request", ({ proofKey }) => {
      const proofImage = localStorage.getItem(proofKey);
      if (proofImage) {
        setCurrentProof(proofImage);
        setShowProofModal(true);
      }
    });

    sock.on("share-proof-data", async ({ proofKey, requestor }) => {
      console.log("📤 Sharing proof data for key:", proofKey);
      const proofData = localStorage.getItem(proofKey);
      if (proofData && sock) {
        sock.emit("share-proof-data-response", { 
          proofData, 
          requestor 
        });
        console.log("✅ Proof data shared successfully");
      }
    });

    sock.on("proof-data-received", ({ proofData }) => {
      console.log("📥 Received proof data");
      if (proofData) {
        setCurrentProof(proofData);
        setShowProofModal(true);
        addToast("Proof loaded successfully!", 2000, "success");
      }
    });

    sock.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", reason);
      if (reason === "io server disconnect") {
        // Server forced disconnect, need to manually reconnect
        addToast("Disconnected from server. Reconnecting...", 3000, "warning");
        sock.connect();
      } else {
        addToast("Disconnected from server", 3000, "error");
      }
    });

    setSocket(sock);
    
    // Cleanup on unmount
    return () => {
      if (sock) {
        sock.off();
        sock.disconnect();
      }
    };
  }, []);

  // Persist localName and game state
  useEffect(() => {
    if (localName) {
      localStorage.setItem("localName", localName);
    }
  }, [localName]);

  // NEW: Save game state to localStorage for reconnection
  useEffect(() => {
    if (stage !== "lobby") {
      const gameState = {
        stage,
        selectedPlayer,
        truthDareChoice,
        chosenPrompt,
        spinning,
        roomId,
        localName,
        isHost
      };
      localStorage.setItem("truthOrDareGameState", JSON.stringify(gameState));
    }
  }, [stage, selectedPlayer, truthDareChoice, chosenPrompt, spinning, roomId, localName, isHost]);

  // 🔥 CHAT FUNCTIONS - UPDATED: Using new ChatPanel component
  const sendChatMessage = (messageContent) => {
    if (!messageContent.trim() || !socket) return;

    const message = {
      id: Date.now(),
      sender: localName,
      content: messageContent.trim(),
      timestamp: new Date().toISOString(),
      type: "text"
    };

    socket.emit("send-chat-message", { roomId, message });
    setChatInput("");
    
    // Clear typing indicator
    socket.emit("typing", { roomId, isTyping: false });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleTyping = (isTyping) => {
    if (!socket) return;
    socket.emit("typing", { roomId, isTyping });
  };

  // NEW: Manual reconnection function
  const manualReconnect = () => {
    if (socket) {
      socket.connect();
      setIsReconnecting(true);
      addToast("Attempting to reconnect...", 3000);
    }
  };

  // NEW: Submit truth completion - FIXED to broadcast to everyone
  const submitTruthCompletion = () => {
    if (!truthCompletionText.trim()) {
      addToast("Please write your truth completion message", 3000, "error");
      return;
    }

    if (socket) {
      socket.emit("truth-completed", { 
        roomId, 
        player: localName,
        completionText: truthCompletionText 
      });
    }
    
    // Don't set proofUploaded locally - wait for server broadcast
    addToast("Truth completion submitted!", 2000, "success");
  };

  // Achievement system
  const checkAchievements = (player) => {
    const stats = playerStats[player] || {};
    const newAchievements = [];
    
    if (stats.timesSelected >= 5 && !achievements.includes(`${player}-veteran`)) {
      newAchievements.push(`${player}-veteran`);
      addToast(`🏆 ${player} unlocked: Game Veteran!`, 4000, "success");
    }
    
    if (stats.truthsCompleted >= 3 && !achievements.includes(`${player}-truth-seeker`)) {
      newAchievements.push(`${player}-truth-seeker`);
      addToast(`🏆 ${player} unlocked: Truth Seeker!`, 4000, "success");
    }
    
    if (newAchievements.length > 0) {
      setAchievements(prev => [...prev, ...newAchievements]);
    }
  };

  // 🎮 Room actions with IMPROVED RECONNECTION
  const createRoom = () => {
    if (!socket || !localName.trim()) return addToast("Please enter your name", 3000, "error");
    socket.emit("create-room", { player: { name: localName } });
  };

  const joinRoom = () => {
    if (!socket || !roomId.trim() || !localName.trim()) return addToast("Please enter name and room ID", 3000, "error");
    socket.emit("join-room", { roomId, player: { name: localName } });
  };

  const leaveRoom = () => {
    // Clear all game-related localStorage
    localStorage.removeItem("roomId");
    localStorage.removeItem("players");
    localStorage.removeItem("isHost");
    localStorage.removeItem("truthOrDareGameState");

    setRoomId("");
    setPlayers([]);
    setPrevPlayers([]);
    setStage("lobby");
    setIsHost(false);
    setSelectedPlayer(null);
    setPrompts([]);
    setChosenPrompt(null);
    setTruthDareChoice(null);
    setIsChoicePending(false);
    setTimeLeft(null);
    setProofImage(null);
    setProofUploaded(false);
    setProofs({});
    setChatMessages([]);
    setNextRoundLoading(false);
    setSpinning(false);
    setShowChat(false);

    if (socket && roomId) socket.emit("leave-room", roomId);
    addToast("Left the room", 2000);
  };

  // 🎲 Spin player - FIXED: Now broadcasts spinner to all players
  const startSpin = () => {
    if (!socket || spinning || players.length === 0) return;
    
    console.log("🎡 Starting spin from host");
    
    // Show spinner immediately on host screen
    setSpinning(true);
    setSelectedPlayer(null);
    setPrompts([]);
    setChosenPrompt(null);
    setTruthDareChoice(null);
    setIsChoicePending(false);
    setTimeLeft(null);
    setProofImage(null);
    setProofUploaded(false);
    setTruthCompletionText("");
    
    playSound("spin");
    
    // Broadcast spinner start to all players
    socket.emit("start-spinner", { roomId });
    
    // Then trigger the actual player selection after a delay
    setTimeout(() => {
      socket.emit("spin-player", { roomId });
    }, 1000);
  };

  // 🎭 Send prompt - FIXED: Send correct prompt type
  const sendPrompt = () => {
    if (!socket || !promptText.trim()) return;
    
    // Check if we're sending the correct type based on player's choice
    if (truthDareChoice && promptType !== truthDareChoice.choice.toLowerCase()) {
      addToast(`You can only send ${truthDareChoice.choice.toLowerCase()} prompts for ${selectedPlayer}`, 3000, "error");
      return;
    }
    
    socket.emit("send-prompt", { 
      roomId, 
      prompt: promptText, 
      askedBy: localName, 
      type: promptType // Send the actual selected type
    });
    setPromptText("");
    addToast("Prompt sent!", 2000);
  };

  // ✅ Choose prompt
  const choosePrompt = (pr) => {
    if (!socket) return;
    socket.emit("choose-option", { roomId, choice: pr.text, type: pr.type });
    setChosenPrompt(pr);
    playSound("select");
    
    setPlayerStats(prev => ({
      ...prev,
      [localName]: {
        ...prev[localName],
        [`${pr.type}sCompleted`]: (prev[localName]?.[`${pr.type}sCompleted`] || 0) + 1
      }
    }));
  };

  // ✅ Submit Truth/Dare
  const submitTruthDare = (choice) => {
    if (!socket || !selectedPlayer) return;
    socket.emit("submit-truth-dare", { roomId, choice });
    setTruthDareChoice({ player: localName, choice });
    setIsChoicePending(false);
    setTimeLeft(null);
    playSound("select");
  };

  // 📸 Handle proof image upload - ONLY FOR DARES
  const handleProofUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast("Please upload an image file", 3000, "error");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      addToast("Image size should be less than 25MB", 3000, "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageDataUrl = e.target.result;
      setProofImage(imageDataUrl);
      
      const proofKey = `proof_${roomId}_${localName}_${Date.now()}`;
      localStorage.setItem(proofKey, imageDataUrl);
      
      setProofUploaded(true);
      addToast("Proof uploaded successfully!", 2000, "success");
      
      if (socket) {
        socket.emit("proof-uploaded", { 
          roomId, 
          player: localName, 
          proofKey 
        });
        
        socket.emit("notify-proof-ready", {
          roomId,
          player: localName
        });
        
        setProofs(prev => ({
          ...prev,
          [localName]: proofKey
        }));
      }
    };
    reader.onerror = () => {
      addToast("Error reading image file", 3000, "error");
    };
    reader.readAsDataURL(file);
  };

  // 👀 View player proof
  const viewPlayerProof = (playerName) => {
    const proofKey = proofs[playerName];
    console.log("🔍 Viewing proof for:", playerName, "Key:", proofKey);
    
    if (proofKey) {
      if (playerName === localName) {
        const proofImage = localStorage.getItem(proofKey);
        if (proofImage) {
          setCurrentProof(proofImage);
          setShowProofModal(true);
          return;
        }
      }
      
      if (socket) {
        console.log("📨 Requesting proof data from server...");
        socket.emit("request-proof-data", { 
          roomId, 
          playerName, 
          proofKey 
        });
        addToast("Loading proof...", 2000);
      }
    } else {
      addToast("No proof available for this player", 3000, "warning");
    }
  };

  // 🗑️ Remove proof image
  const removeProofImage = () => {
    setProofImage(null);
    setProofUploaded(false);
    addToast("Proof removed", 2000);
  };

  // 👢 Kick player
  const kickPlayer = (playerName) => {
    if (!socket || !isHost) return;
    socket.emit("kick-player", { roomId, playerName, kickedBy: localName });
    setShowKickMenu(false);
    addToast(`Kicked ${playerName} from the room`, 3000, "warning");
  };

  // 🔄 Reset round - FIXED: Now shows spinner for all players
  const resetRound = () => {
    if (!isHost || !socket) return;
    
    // Show loading for all players
    setNextRoundLoading(true);
    socket.emit("next-round-starting", { roomId });
    
    // Reset game state after a short delay
    setTimeout(() => {
      setSelectedPlayer(null);
      setPrompts([]);
      setChosenPrompt(null);
      setSpinning(false);
      setTruthDareChoice(null);
      setIsChoicePending(false);
      setTimeLeft(null);
      setProofImage(null);
      setProofUploaded(false);
      setTruthCompletionText("");
      setNextRoundLoading(false);
      
      socket.emit("next-round-started", { roomId });
      addToast("Next round started!", 2000);
    }, 2000);
  };

  // 🧩 Toast management
  const addToast = (message, duration = 3000, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  };

  // Toggle sound
  const toggleSound = () => {
    setGameSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
    addToast(`Sound ${!gameSettings.soundEnabled ? 'enabled' : 'disabled'}`, 2000);
  };

  // Check if proof should be required (only for dares)
  const shouldRequireProof = chosenPrompt && chosenPrompt.type === "dare";

  // 🧩 Lobby UI
  if (stage === "lobby") {
    return (
      <div className="h-screen w-full flex overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto" ref={mainContainerRef}>
          <div className="min-h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-6 flex items-center justify-center relative">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full opacity-30 animate-pulse"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${3 + Math.random() * 2}s`
                  }}
                />
              ))}
            </div>

            <div className="w-full max-w-2xl relative z-10">
              <Card className="p-6 md:p-8 bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border-0">
                <div className="text-center mb-6 md:mb-8">
                  <div className="flex justify-center items-center mb-4">
                    <Gamepad2 className="w-10 h-10 md:w-12 md:h-12 text-purple-600 mr-3" />
                    <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      Truth or Dare
                    </h1>
                  </div>
                  <p className="text-gray-600 text-base md:text-lg">Create or join a room to start playing with friends!</p>
                </div>

                <div className="space-y-4 md:space-y-6">
                  <div className="space-y-3 md:space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                      <Input 
                        value={localName} 
                        onChange={(e) => setLocalName(e.target.value)} 
                        placeholder="Enter your nickname" 
                        className="text-base md:text-lg py-4 md:py-6 border-2 focus:border-purple-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Room Code</label>
                      <Input 
                        value={roomId} 
                        onChange={(e) => setRoomId(e.target.value.toUpperCase())} 
                        placeholder="Enter room code (leave empty to create new)" 
                        className="text-base md:text-lg py-4 md:py-6 border-2 focus:border-purple-500 transition-all font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                    <Button 
                      onClick={joinRoom} 
                      disabled={!socket || !roomId.trim()} 
                      className="flex-1 py-4 md:py-6 text-base md:text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg transition-all duration-300"
                    >
                      <Users className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      Join Room
                    </Button>
                    <Button 
                      onClick={createRoom} 
                      disabled={!socket} 
                      className="flex-1 py-4 md:py-6 text-base md:text-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg transition-all duration-300"
                    >
                      <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      Create Room
                    </Button>
                  </div>
                </div>

                {/* Features showcase */}
                <div className="mt-6 md:mt-8 grid grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                  <div className="flex items-center text-gray-600">
                    <Trophy className="w-3 h-3 md:w-4 md:h-4 mr-2 text-yellow-500" />
                    Scoring System
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Timer className="w-3 h-3 md:w-4 md:h-4 mr-2 text-blue-500" />
                    Timer Rounds
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Crown className="w-3 h-3 md:w-4 md:h-4 mr-2 text-purple-500" />
                    Achievements
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Volume2 className="w-3 h-3 md:w-4 md:h-4 mr-2 text-green-500" />
                    Sound Effects
                  </div>
                </div>
              </Card>
            </div>
            
            <audio ref={audioRef} preload="auto" />
            <ToastContainer toasts={toasts} />
          </div>
        </div>
      </div>
    );
  }

  // 🧩 Game UI
  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto" ref={mainContainerRef}>
        <div className="min-h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-3 md:p-6 relative safe-area-padding">
          {/* Reconnection Banner */}
          {isReconnecting && (
            <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Reconnecting to game... Attempt {reconnectAttempts}/5</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={manualReconnect}
                  className="ml-2 bg-white text-yellow-600 hover:bg-gray-100 h-6 text-xs"
                >
                  Retry Now
                </Button>
              </div>
            </div>
          )}

          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full opacity-20 animate-pulse"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${3 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>

          <div className="max-w-7xl mx-auto relative z-10">
            {/* FIXED: Next Round Loading Overlay */}
            {nextRoundLoading && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <Card className="p-6 md:p-8 bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border-0 text-center">
                  <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-purple-600 animate-spin mx-auto mb-4" />
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Starting Next Round</h3>
                  <p className="text-gray-600">Get ready for the next turn!</p>
                </Card>
              </div>
            )}

            {/* Header - Mobile Responsive */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-0 mb-4 md:mb-6 p-3 md:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
              <div className="flex items-center space-x-3 md:space-x-4">
                {/* BACK BUTTON */}
                <Button
                  onClick={() => navigate('/games')}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 h-8 w-8 md:h-10 md:w-10 p-0"
                >
                  <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
                
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white">Room Code</h2>
                  <div className="font-mono text-xl md:text-2xl font-bold text-yellow-300 bg-black/30 px-2 md:px-3 py-1 rounded-lg">
                    {roomId}
                  </div>
                </div>
                <Badge variant={isHost ? "default" : "secondary"} className="text-xs">
                  {isHost ? <Crown className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
                  {isHost ? "Host" : "Player"}
                </Badge>
              </div>

              <div className="flex items-center justify-between md:justify-end space-x-2 md:space-x-3">
                {/* CHAT TOGGLE BUTTON */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setShowChat(!showChat)}
                        className="text-white hover:bg-white/20 h-8 w-8 md:h-10 md:w-10"
                      >
                        <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                        {chatMessages.length > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center">
                            {chatMessages.filter(m => m.sender !== localName && !m.read).length}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{showChat ? "Hide" : "Show"} Chat</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={toggleSound}
                        className="text-white hover:bg-white/20 h-8 w-8 md:h-10 md:w-10"
                      >
                        {gameSettings.soundEnabled ? <Volume2 className="w-4 h-4 md:w-5 md:h-5" /> : <VolumeX className="w-4 h-4 md:w-5 md:h-5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{gameSettings.soundEnabled ? "Disable" : "Enable"} sound</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {isHost && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowKickMenu(!showKickMenu)}
                          className="text-white hover:bg-white/20 border-white text-xs h-8 md:h-9"
                        >
                          <Ban className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                          {showKickMenu ? "Cancel" : "Kick"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{showKickMenu ? "Hide Kick Menu" : "Kick Players"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {isHost && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setShowSettings(!showSettings)}
                          className="text-white hover:bg-white/20 h-8 w-8 md:h-10 md:w-10"
                        >
                          <Settings className="w-4 h-4 md:w-5 md:h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Game Settings</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <Button 
                  onClick={() => navigator.clipboard?.writeText(roomId)} 
                  className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold text-xs h-8 md:h-9"
                >
                  Copy Code
                </Button>
                <Button 
                  variant="outline" 
                  onClick={leaveRoom} 
                  className="border-white text-white hover:bg-white/10 text-xs h-8 md:h-9"
                >
                  Leave
                </Button>
              </div>
            </div>

            <div className={`grid gap-4 md:gap-6 ${showChat ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1 lg:grid-cols-3'}`}>
              {/* Left Column - Players & Controls */}
              <div className="space-y-4 md:space-y-6">
                <Card className="p-4 md:p-6 bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl border-0">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 flex items-center">
                      <Users className="w-4 h-4 md:w-5 md:h-5 mr-2 text-blue-600" />
                      Players ({players.length})
                    </h3>
                    {gameSettings.enableScoring && (
                      <Badge variant="outline" className="text-xs">
                        <Trophy className="w-3 h-3 mr-1" />
                        Scoring
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 md:space-y-3 max-h-60 md:max-h-80 overflow-y-auto">
                    {players.map((player, index) => (
                      <div
                        key={player.name}
                        className={`flex items-center justify-between p-2 md:p-3 rounded-xl transition-all duration-300 ${
                          player.name === selectedPlayer
                            ? "bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300 shadow-md"
                            : "bg-gray-50 hover:bg-gray-100"
                        } ${player.name === localName ? "ring-2 ring-blue-300" : ""}`}
                      >
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <Avatar className="w-6 h-6 md:w-8 md:h-8">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                              {player.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex items-center space-x-1 md:space-x-2">
                            <span className="font-medium text-gray-900 text-sm md:text-base">{player.name}</span>
                            {index === 0 && <Crown className="w-3 h-3 md:w-4 md:h-4 text-yellow-500" />}
                            {player.name === localName && (
                              <Badge variant="secondary" className="text-xs">You</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1 md:space-x-2">
                          {proofs[player.name] && player.name !== localName && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => viewPlayerProof(player.name)}
                                    className="h-6 w-6 md:h-8 md:w-8 p-0 bg-green-100 hover:bg-green-200 border-green-300"
                                  >
                                    <Camera className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View proof</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          
                          {showKickMenu && isHost && player.name !== localName && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => kickPlayer(player.name)}
                              className="h-5 w-5 md:h-6 md:w-6 p-0"
                            >
                              <Ban className="w-2 h-2 md:w-3 md:h-3" />
                            </Button>
                          )}
                          {gameSettings.enableScoring && (
                            <div className="text-right">
                              <div className="text-xs md:text-sm font-bold text-gray-900">{scores[player.name] || 0}</div>
                              <div className="text-xs text-gray-500">pts</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Game Controls */}
                  <div className="mt-4 md:mt-6 space-y-3 md:space-y-4">
                    {stage === "waiting" && isHost && (
                      <Button 
                        onClick={() => socket.emit("start-game", { roomId })} 
                        className="w-full py-4 md:py-6 text-base md:text-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg"
                        disabled={players.length < 2}
                      >
                        <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                        Start Game {players.length < 2 && `(${2 - players.length} more)`}
                      </Button>
                    )}
                    
                    {stage === "playing" && !selectedPlayer && !spinning && !nextRoundLoading && (
                      <Button 
                        onClick={startSpin} 
                        disabled={spinning || players.length === 0} 
                        className="w-full py-4 md:py-6 text-base md:text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg transition-all duration-300"
                      >
                        <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                        Spin the Wheel
                      </Button>
                    )}

                    {/* Show spinning state for all players */}
                    {stage === "playing" && spinning && (
                      <div className="w-full py-4 md:py-6 text-center bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-lg">
                        <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <div className="text-base md:text-lg font-semibold">Spinning the wheel...</div>
                      </div>
                    )}

                    {/* FIXED: Next Round button shows when appropriate */}
                    {isHost && selectedPlayer && (truthDareChoice?.choice === "Truth" || "Dare") && (
                      <Button 
                        onClick={resetRound} 
                        disabled={nextRoundLoading}
                        className="w-full py-4 md:py-6 text-base md:text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg transition-all duration-300"
                      >
                        {nextRoundLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                            Next Round
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </Card>

                {/* Settings Panel */}
                {showSettings && isHost && (
                  <Card className="p-4 md:p-6 bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl border-0">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
                      <Settings className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      Game Settings
                    </h3>
                    <div className="space-y-3 md:space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Timer: {gameSettings.timerDuration}s
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="60"
                          step="5"
                          value={gameSettings.timerDuration}
                          onChange={(e) => setGameSettings(prev => ({ ...prev, timerDuration: parseInt(e.target.value) }))}
                          className="w-full"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Enable Scoring</label>
                        <input
                          type="checkbox"
                          checked={gameSettings.enableScoring}
                          onChange={(e) => setGameSettings(prev => ({ ...prev, enableScoring: e.target.checked }))}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Sound Effects</label>
                        <input
                          type="checkbox"
                          checked={gameSettings.soundEnabled}
                          onChange={(e) => setGameSettings(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                          className="w-4 h-4"
                        />
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Middle Column - Game Area */}
              <div className={`space-y-4 md:space-y-6 ${showChat ? 'lg:col-span-2' : 'lg:col-span-2'}`}>
                {/* Spinner Wheel - FIXED: Now shows for all players during spin */}
                {stage === "playing" && !nextRoundLoading && (
                  <Card className="p-4 md:p-6 bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl border-0 text-center">
                    <SpinnerWheel 
                      players={players} 
                      selectedPlayer={selectedPlayer} 
                      spinning={spinning} 
                      soundEnabled={gameSettings.soundEnabled}
                    />
                    
                    {/* Show spinning status for all players */}
                    {spinning && (
                      <div className="mt-4 md:mt-6">
                        <div className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                          🎡 Spinning the wheel...
                        </div>
                        <div className="text-sm md:text-base text-gray-600">
                          Wait to see who gets selected!
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* Selected Player & Game Flow */}
                {selectedPlayer && !nextRoundLoading && (
                  <Card className="p-4 md:p-6 bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl border-0">
                    <div className="space-y-4 md:space-y-6">
                      {/* Selected Player Header */}
                      <div className="text-center">
                        <div className="inline-flex items-center space-x-2 md:space-x-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-full shadow-lg">
                          <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                          <h3 className="text-lg md:text-xl font-bold">Selected Player</h3>
                          <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div className="mt-3 md:mt-4">
                          <Avatar className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-2 md:mb-3 border-4 border-yellow-400 shadow-lg">
                            <AvatarFallback className="text-xl md:text-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white">
                              {selectedPlayer.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{selectedPlayer}</h2>
                          {timeLeft !== null && (
                            <div className="mt-2">
                              <Progress value={(timeLeft / gameSettings.timerDuration) * 100} className="h-2" />
                              <div className="text-xs md:text-sm text-gray-600 mt-1 flex items-center justify-center">
                                <Timer className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                                {timeLeft}s remaining
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Truth/Dare Choice */}
                      {selectedPlayer === localName && isChoicePending && (
                        <div className="text-center space-y-3 md:space-y-4">
                          <h4 className="text-base md:text-lg font-semibold text-gray-900">Choose your fate:</h4>
                          <div className="flex flex-col md:flex-row justify-center gap-3 md:gap-6">
                            <Button 
                              onClick={() => submitTruthDare("Truth")} 
                              className="px-6 py-4 md:px-8 md:py-6 text-base md:text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg transition-transform hover:scale-105"
                            >
                              💬 Truth
                            </Button>
                            <Button 
                              onClick={() => submitTruthDare("Dare")} 
                              className="px-6 py-4 md:px-8 md:py-6 text-base md:text-lg bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white shadow-lg transition-transform hover:scale-105"
                            >
                              ⚡ Dare
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Show Choice */}
                      {truthDareChoice && truthDareChoice.player === selectedPlayer && (
                        <Card className="p-4 md:p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 text-center">
                          <div className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                            {selectedPlayer} chose:
                          </div>
                          <div className={`text-2xl md:text-3xl font-extrabold ${
                            truthDareChoice.choice === "Truth" 
                              ? "text-purple-600" 
                              : "text-red-600"
                          }`}>
                            {truthDareChoice.choice}!
                          </div>
                        </Card>
                      )}

                      {/* Proof Upload Section - ONLY FOR DARES */}
                      {selectedPlayer === localName && chosenPrompt && shouldRequireProof && (
                        <Card className="p-4 md:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
                          <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4 text-center">
                            📸 Upload Proof for Dare
                          </h4>
                          <div className="text-center space-y-3 md:space-y-4">
                            {!proofUploaded ? (
                              <>
                                <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">
                                  Complete your dare and upload proof!
                                </p>
                                <div className="flex flex-col items-center space-y-2 md:space-y-3">
                                  <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleProofUpload}
                                    accept="image/*"
                                    className="hidden"
                                  />
                                  <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-2 md:py-3 px-4 md:px-6 text-sm md:text-base"
                                  >
                                    <Camera className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                                    Upload Proof Image
                                  </Button>
                                  <p className="text-xs md:text-sm text-gray-500">
                                    Take a photo or upload an image as proof
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-green-600 font-semibold mb-3 md:mb-4 text-sm md:text-base">
                                  ✅ Proof uploaded successfully!
                                </div>
                                {proofImage && (
                                  <div className="relative inline-block">
                                    <img
                                      src={proofImage}
                                      alt="Proof"
                                      className="max-w-full h-32 md:h-48 object-cover rounded-lg shadow-md border-2 border-green-300"
                                    />
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={removeProofImage}
                                      className="absolute -top-2 -right-2 h-5 w-5 md:h-6 md:w-6 p-0 rounded-full"
                                    >
                                      <X className="w-2 h-2 md:w-3 md:h-3" />
                                    </Button>
                                  </div>
                                )}
                                <p className="text-xs md:text-sm text-gray-600 mt-2">
                                  Waiting for host to start next round...
                                </p>
                              </>
                            )}
                          </div>
                        </Card>
                      )}

                      {/* FIXED: Truth Completion Section - Shows to everyone */}
                      {chosenPrompt && !shouldRequireProof && (
                        <Card className="p-4 md:p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200">
                          <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4 text-center">
                            💬 Truth Completion
                          </h4>
                          <div className="text-center space-y-3 md:space-y-4">
                            {proofUploaded ? (
                              <>
                                <div className="text-green-600 font-semibold mb-3 md:mb-4 text-sm md:text-base">
                                  ✅ {selectedPlayer} completed their truth!
                                </div>
                                <Card className="p-3 md:p-4 bg-white border border-gray-200 text-left">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Avatar className="w-6 h-6">
                                      <AvatarFallback className="bg-purple-500 text-white text-xs">
                                        {selectedPlayer.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-semibold text-gray-900">{selectedPlayer}:</span>
                                  </div>
                                  <p className="text-gray-900 text-sm md:text-base pl-8">{truthCompletionText}</p>
                                </Card>
                                <p className="text-xs md:text-sm text-gray-600 mt-2">
                                  {isHost ? "You can start the next round!" : "Waiting for host to start next round..."}
                                </p>
                              </>
                            ) : selectedPlayer === localName ? (
                              <>
                                <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">
                                  Share your truth completion message:
                                </p>
                                <div className="space-y-3 md:space-y-4">
                                  <Input
                                    value={truthCompletionText}
                                    onChange={(e) => setTruthCompletionText(e.target.value)}
                                    placeholder="Write your truth completion message..."
                                    className="text-sm md:text-base py-2 md:py-3"
                                  />
                                  <Button
                                    onClick={submitTruthCompletion}
                                    disabled={!truthCompletionText.trim()}
                                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-2 md:py-3 px-4 md:px-6 text-sm md:text-base"
                                  >
                                    Submit Truth Completion
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <div className="text-yellow-600 font-semibold text-sm md:text-base">
                                ⏳ Waiting for {selectedPlayer} to complete their truth...
                              </div>
                            )}
                          </div>
                        </Card>
                      )}

                      {/* FIXED: Prompt Input - Only shows correct type based on player's choice */}
                      {selectedPlayer !== localName && !chosenPrompt && truthDareChoice && (
                        <Card className="p-4 md:p-6 bg-gray-50 border-2 border-gray-200">
                          <Tabs value={promptType} onValueChange={setPromptType} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-3 md:mb-4">
                              <TabsTrigger 
                                value="truth" 
                                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs md:text-sm"
                                disabled={truthDareChoice.choice !== "Truth"}
                              >
                                💬 Truth
                              </TabsTrigger>
                              <TabsTrigger 
                                value="dare" 
                                className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-xs md:text-sm"
                                disabled={truthDareChoice.choice !== "Dare"}
                              >
                                ⚡ Dare
                              </TabsTrigger>
                            </TabsList>
                            
                            {/* Show message if trying to send wrong type */}
                            {promptType !== truthDareChoice.choice.toLowerCase() && (
                              <div className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                                <p className="text-yellow-800 text-sm">
                                  {selectedPlayer} chose <strong>{truthDareChoice.choice}</strong>. 
                                  Please send a {truthDareChoice.choice.toLowerCase()} prompt.
                                </p>
                              </div>
                            )}
                            
                            <TabsContent value={promptType} className="space-y-3 md:space-y-4">
                              <div className="flex gap-2 md:gap-3">
                                <Input 
                                  value={promptText} 
                                  onChange={(e) => setPromptText(e.target.value)}
                                  placeholder={`Write a ${truthDareChoice.choice.toLowerCase()} for ${selectedPlayer}...`}
                                  className="flex-1 text-sm md:text-lg py-2 md:py-3"
                                  onKeyPress={(e) => e.key === 'Enter' && sendPrompt()}
                                />
                                <Button 
                                  onClick={sendPrompt} 
                                  disabled={!promptText.trim() || promptType !== truthDareChoice.choice.toLowerCase()}
                                  className={`py-2 md:py-3 px-3 md:px-6 text-sm md:text-base ${
                                    promptType === "truth" 
                                      ? "bg-purple-600 hover:bg-purple-700" 
                                      : "bg-red-600 hover:bg-red-700"
                                  } text-white`}
                                >
                                  Send
                                </Button>
                              </div>
                              {promptType !== truthDareChoice.choice.toLowerCase() && (
                                <p className="text-red-500 text-sm text-center">
                                  ❌ You can only send {truthDareChoice.choice.toLowerCase()} prompts for {selectedPlayer}
                                </p>
                              )}
                            </TabsContent>
                          </Tabs>
                        </Card>
                      )}

                      {/* Prompts List */}
                      {prompts.length > 0 && (
                        <Card className="p-4 md:p-6 bg-gray-50 border-2 border-gray-200">
                          <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">
                            Suggested Prompts ({prompts.length})
                          </h4>
                          <div className="space-y-2 md:space-y-3 max-h-40 md:max-h-60 overflow-y-auto">
                            {prompts.map(pr => (
                              <div 
                                key={pr.id} 
                                className={`p-3 md:p-4 rounded-xl border-2 transition-all duration-300 ${
                                  chosenPrompt?.id === pr.id
                                    ? "border-green-500 bg-green-50 shadow-md"
                                    : "border-gray-200 bg-white hover:border-gray-300"
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1 md:mb-2">
                                      <Badge 
                                        variant={pr.type === "truth" ? "default" : "destructive"} 
                                        className="text-xs"
                                      >
                                        {pr.type}
                                      </Badge>
                                      <span className="text-xs md:text-sm text-gray-600">from {pr.from}</span>
                                    </div>
                                    <div className="font-medium text-gray-900 text-sm md:text-lg">{pr.text}</div>
                                  </div>
                                  {localName === selectedPlayer && !chosenPrompt && (
                                    <Button 
                                      size="sm" 
                                      onClick={() => choosePrompt(pr)}
                                      className="ml-2 md:ml-4 bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm"
                                    >
                                      Choose
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}

                      {/* Chosen Prompt */}
                      {chosenPrompt && (
                        <Card className="p-4 md:p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 shadow-lg">
                          <div className="text-center">
                            <div className="text-xs md:text-sm text-gray-600 mb-2">Chosen Prompt</div>
                            <div className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">{chosenPrompt.text}</div>
                            <div className="flex items-center justify-center space-x-2 md:space-x-4 text-xs md:text-sm text-gray-600">
                              <Badge variant={chosenPrompt.type === "truth" ? "default" : "destructive"}>
                                {chosenPrompt.type}
                              </Badge>
                              <span>from {chosenPrompt.from}</span>
                            </div>
                          </div>
                        </Card>
                      )}

                      {/* Admin Notice */}
                      {isHost && selectedPlayer && (
                        <Card className={`p-3 md:p-4 text-center ${
                          (truthDareChoice?.choice === "Truth" || proofUploaded) 
                            ? "bg-green-50 border-2 border-green-200" 
                            : "bg-yellow-50 border-2 border-yellow-200"
                        }`}>
                          <div className={`font-medium text-sm md:text-base ${
                            (truthDareChoice?.choice === "Truth" || proofUploaded) 
                              ? "text-green-800" 
                              : "text-yellow-800"
                          }`}>
                            {(truthDareChoice?.choice === "Truth" || proofUploaded) 
                              ? "✅ Ready for next round!" 
                              : `⏳ Waiting for ${selectedPlayer} to complete their task...`}
                          </div>
                        </Card>
                      )}
                    </div>
                  </Card>
                )}
              </div>

              {/* RIGHT COLUMN - UPDATED CHAT PANEL */}
              {showChat && (
                <div className="space-y-4 md:space-y-6">
                  <ChatPanel 
                    chatMessages={chatMessages}
                    playerName={localName}
                    typingUsers={typingUsers}
                    onSendMessage={sendChatMessage}
                    isConnected={socket?.connected}
                    onTyping={handleTyping}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    onClose={() => setShowChat(false)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Proof Viewing Modal */}
          {showProofModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 md:p-4">
              <Card className="max-w-md md:max-w-2xl w-full bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border-0 max-h-[90vh] overflow-hidden">
                <div className="p-4 md:p-6">
                  <div className="flex justify-between items-center mb-3 md:mb-4">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900">Proof Submission</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setShowProofModal(false);
                        setCurrentProof(null);
                      }}
                      className="h-7 w-7 md:h-8 md:w-8"
                    >
                      <X className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                  </div>
                  
                  <div className="text-center max-h-[60vh] overflow-y-auto">
                    {currentProof ? (
                      <div className="space-y-3 md:space-y-4">
                        <img
                          src={currentProof}
                          alt="Proof submission"
                          className="max-w-full max-h-[50vh] object-contain rounded-lg border-2 border-gray-200 mx-auto"
                        />
                        <p className="text-xs md:text-sm text-gray-600">
                          This is the proof submitted by the player for their dare
                        </p>
                      </div>
                    ) : (
                      <div className="py-8 md:py-12 text-gray-500">
                        <Camera className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 opacity-50" />
                        <p>Proof not available</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end mt-4 md:mt-6">
                    <Button
                      onClick={() => {
                        setShowProofModal(false);
                        setCurrentProof(null);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <audio ref={audioRef} preload="auto" />
          <ToastContainer toasts={toasts} />
        </div>
      </div>
    </div>
  );
}

// Enhanced Spinner component - Mobile Responsive
function SpinnerWheel({ players, selectedPlayer, spinning, soundEnabled }) {
  const wheelRef = useRef(null);
  const [highlight, setHighlight] = useState(null);

  useEffect(() => {
    if (!spinning || !wheelRef.current || players.length === 0) return;

    const segments = players.length;
    const finalIndex = players.findIndex(p => p.name === selectedPlayer);
    const spins = 6;
    const degreesPerSegment = 360 / segments;
    const randomOffset = Math.random() * degreesPerSegment;
    const finalRotation = spins * 360 + finalIndex * degreesPerSegment + randomOffset;

    wheelRef.current.style.transition = "transform 3s cubic-bezier(0.33, 1, 0.68, 1)";
    wheelRef.current.style.transform = `rotate(${finalRotation}deg)`;

    const timeout = setTimeout(() => {
      wheelRef.current.style.transition = "";
      wheelRef.current.style.transform = `rotate(${finalIndex * degreesPerSegment}deg)`;
      setHighlight(selectedPlayer);
      
      if (soundEnabled) {
        const audio = new Audio("/sounds/spin-end.mp3");
        audio.play().catch(() => {});
      }
    }, 3000);

    return () => {
      clearTimeout(timeout);
      setHighlight(null);
    };
  }, [spinning, selectedPlayer, players, soundEnabled]);

  if (players.length === 0) return null;

  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto">
      <div
        ref={wheelRef}
        className="w-full h-full rounded-full border-4 md:border-8 border-white relative flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 shadow-2xl"
        style={{
          boxShadow: '0 0 30px rgba(255, 255, 255, 0.3)'
        }}
      >
        {/* Center circle */}
        <div className="absolute w-16 h-16 md:w-20 md:h-20 bg-white rounded-full shadow-inner flex items-center justify-center">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </div>
        </div>

        {/* Player segments */}
        {players.map((p, idx) => {
          const angle = (360 / players.length) * idx;
          const isWinner = highlight === p.name;
          const segmentAngle = 360 / players.length;
          const isLargeSegment = players.length <= 6;
          
          return (
            <div
              key={p.name}
              className={`absolute text-center font-bold transition-all duration-500 ${
                isWinner 
                  ? "scale-125 text-yellow-300 drop-shadow-xl z-10 animate-bounce" 
                  : "text-white drop-shadow-md"
              } ${isLargeSegment ? 'text-sm md:text-lg w-32 md:w-40' : 'text-xs md:text-sm w-28 md:w-36'}`}
              style={{ 
                transform: `rotate(${angle}deg) translate(0, -110px) rotate(-${angle}deg)`,
                transformOrigin: 'center center'
              }}
            >
              <div className={`
                px-2 py-1 md:px-3 md:py-1 rounded-full backdrop-blur-sm
                ${isWinner 
                  ? 'bg-yellow-500/20 border-2 border-yellow-300' 
                  : 'bg-black/20'
                }
              `}>
                {p.name}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
        <div className="w-4 h-6 md:w-6 md:h-8 bg-yellow-400 rounded-t-lg shadow-lg" />
        <div className="w-3 h-3 md:w-4 md:h-4 bg-yellow-400 transform rotate-45 mx-auto -mt-1 md:-mt-2 shadow-lg" />
      </div>
    </div>
  );
}

// Enhanced Toast component - Mobile Responsive
function ToastContainer({ toasts }) {
  return (
    <div className="fixed top-2 right-2 md:top-4 md:right-4 flex flex-col gap-2 md:gap-3 z-50 max-w-xs md:max-w-sm">
      {toasts.map((t) => (
        <div 
          key={t.id} 
          className={`
            p-3 md:p-4 rounded-xl shadow-2xl backdrop-blur-sm border transform transition-all duration-500 animate-in slide-in-from-right-80
            ${t.type === 'error' 
              ? 'bg-red-500/90 text-white border-red-600' 
              : t.type === 'success'
              ? 'bg-green-500/90 text-white border-green-600'
              : 'bg-white/95 text-gray-900 border-gray-200'
            }
          `}
        >
          <div className="flex items-center space-x-2 md:space-x-3">
            {t.type === 'success' && <Sparkles className="w-4 h-4 md:w-5 md:h-5" />}
            {t.type === 'error' && <div className="w-4 h-4 md:w-5 md:h-5">⚠️</div>}
            <span className="font-medium text-sm md:text-base">{t.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}