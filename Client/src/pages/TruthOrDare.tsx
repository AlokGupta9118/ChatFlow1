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
  Loader2, RotateCcw
} from "lucide-react";

const DEFAULT_SOCKET_URL = `${import.meta.env.VITE_API_URL}`;

// 🔥 FIXED: Enhanced localStorage management
const useGamePersistence = () => {
  const saveGameState = (key, data) => {
    try {
      const gameData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(`truthDare_${key}`, JSON.stringify(gameData));
    } catch (error) {
      console.warn("Failed to save game state:", error);
    }
  };

  const loadGameState = (key, defaultValue = null) => {
    try {
      const saved = localStorage.getItem(`truthDare_${key}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clear data if it's older than 1 hour
        if (Date.now() - parsed.timestamp > 3600000) {
          localStorage.removeItem(`truthDare_${key}`);
          return defaultValue;
        }
        return parsed.data;
      }
      return defaultValue;
    } catch (error) {
      console.warn("Failed to load game state:", error);
      return defaultValue;
    }
  };

  const clearGameState = () => {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('truthDare_'));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn("Failed to clear game state:", error);
    }
  };

  return { saveGameState, loadGameState, clearGameState };
};

export default function TruthOrDare({ currentUser }) {
  const params = useParams();
  const navigate = useNavigate();
  const { saveGameState, loadGameState, clearGameState } = useGamePersistence();

  const [socket, setSocket] = useState(null);
  const [stage, setStage] = useState(loadGameState("stage", "lobby"));
  const [roomId, setRoomId] = useState(params.roomId || loadGameState("roomId", ""));
  const [localName, setLocalName] = useState(currentUser?.name || loadGameState("localName", ""));
  const [players, setPlayers] = useState(loadGameState("players", []));
  const [isHost, setIsHost] = useState(loadGameState("isHost", false));

  // Game state
  const [selectedPlayer, setSelectedPlayer] = useState(loadGameState("selectedPlayer", null));
  const [promptType, setPromptType] = useState("truth");
  const [promptText, setPromptText] = useState("");
  const [prompts, setPrompts] = useState(loadGameState("prompts", []));
  const [chosenPrompt, setChosenPrompt] = useState(loadGameState("chosenPrompt", null));
  const [spinning, setSpinning] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [truthDareChoice, setTruthDareChoice] = useState(loadGameState("truthDareChoice", null));
  const [isChoicePending, setIsChoicePending] = useState(false);
  
  // Game features
  const [gameSettings, setGameSettings] = useState(loadGameState("gameSettings", {
    timerDuration: 30,
    soundEnabled: true,
    maxPlayers: 8
  }));
  const [timeLeft, setTimeLeft] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Proof system
  const [proofImage, setProofImage] = useState(null);
  const [proofUploaded, setProofUploaded] = useState(loadGameState("proofUploaded", false));
  const [showKickMenu, setShowKickMenu] = useState(false);
  const [proofs, setProofs] = useState(loadGameState("proofs", {}));
  const [showProofModal, setShowProofModal] = useState(false);
  const [currentProof, setCurrentProof] = useState(null);

  // 🔥 CHAT STATE
  const [chatMessages, setChatMessages] = useState(loadGameState("chatMessages", []));
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());

  // FIXED: Enhanced state for game flow
  const [nextRoundLoading, setNextRoundLoading] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mainContainerRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // 🔥 FIXED: Enhanced persistence with proper cleanup
  useEffect(() => {
    const statesToSave = {
      stage, roomId, localName, players, isHost, selectedPlayer,
      prompts, chosenPrompt, truthDareChoice, gameSettings,
      proofs, chatMessages, proofUploaded
    };

    Object.entries(statesToSave).forEach(([key, value]) => {
      saveGameState(key, value);
    });
  }, [stage, roomId, localName, players, isHost, selectedPlayer, 
      prompts, chosenPrompt, truthDareChoice, gameSettings, 
      proofs, chatMessages, proofUploaded]);

  // FIXED 1: Improved mobile scrolling and auto-scroll
  useEffect(() => {
    const scrollToTop = () => {
      if (mainContainerRef.current) {
        setTimeout(() => {
          mainContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      }
    };

    scrollToTop();
  }, [stage, selectedPlayer, chosenPrompt, showChat, truthDareChoice]);

  // FIXED: Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current && showChat) {
      const scrollToBottom = () => {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      };
      
      scrollToBottom();
      // Additional scroll after a short delay to ensure content is rendered
      setTimeout(scrollToBottom, 150);
    }
  }, [chatMessages, showChat]);

  // FIXED: Handle page refresh and reconnection
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearGameState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socket && roomId && localName) {
        // Try to rejoin if we come back to the tab
        socket.emit('rejoin-game', { roomId, playerName: localName });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket, roomId, localName]);

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

  // 🔌 FIXED: Enhanced Socket initialization with proper reconnection
  useEffect(() => {
    const sock = io(DEFAULT_SOCKET_URL, { 
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    sock.on("connect", () => {
      console.log("✅ Socket connected:", sock.id);
      setReconnecting(false);
      addToast("Connected to game server", 2000);
      
      // Try to rejoin room if we have existing state
      if (roomId && localName && stage !== "lobby") {
        console.log("🔄 Attempting to rejoin room:", roomId);
        sock.emit("rejoin-game", { roomId, playerName: localName });
      }
    });

    sock.on("reconnecting", (attempt) => {
      console.log("🔄 Reconnecting attempt:", attempt);
      setReconnecting(true);
      addToast(`Reconnecting... (${attempt}/10)`, 2000);
    });

    sock.on("rejoin-success", (gameState) => {
      console.log("🔄 Rejoined game successfully:", gameState);
      if (gameState) {
        setStage(gameState.stage || "waiting");
        setPlayers(gameState.players || []);
        setSelectedPlayer(gameState.currentRound?.selectedPlayer || null);
        setChosenPrompt(gameState.currentRound?.chosenPrompt || null);
        setTruthDareChoice(gameState.currentRound?.truthDareChoice || null);
        setPrompts(gameState.currentRound?.prompts || []);
        setProofUploaded(gameState.currentRound?.proofUploaded || false);
        setProofs(gameState.proofs || {});
        setChatMessages(gameState.chatMessages || []);
        
        // Update host status
        setIsHost(gameState.host === localName);
        
        addToast("Successfully rejoined the game!", 3000, "success");
      }
    });

    sock.on("room-created", (room) => {
      console.log("🆕 Room created:", room);
      setRoomId(room.roomId);
      setPlayers(room.players || []);
      setIsHost(true);
      setStage("waiting");
      setReconnecting(false);
      playSound("success");
    });

    sock.on("room-joined", (room) => {
      console.log("👥 Room joined:", room);
      setRoomId(room.roomId);
      setPlayers(room.players || []);
      setIsHost(false);
      setStage("waiting");
      setReconnecting(false);
      playSound("success");
    });

    // FIXED: Enhanced player selection with proper state reset
    sock.on("player-selected", (data) => {
      console.log("🎯 Player selected:", data);
      const playerName = data.player;
      setSelectedPlayer(playerName);
      setSpinning(false);
      setPrompts(data.prompts || []);
      setChosenPrompt(data.chosenPrompt || null);
      setTruthDareChoice(data.truthDareChoice || null);
      setIsChoicePending(playerName === localName);
      setTimeLeft(playerName === localName ? gameSettings.timerDuration : null);
      setProofImage(null);
      setProofUploaded(false);
      playSound("select");
    });

    // FIXED: Enhanced prompt handling - broadcast to all players
    sock.on("receive-prompt", (data) => {
      console.log("💬 Received prompt:", data);
      setPrompts(prev => [...prev, { 
        id: Date.now(), 
        text: data.prompt, 
        from: data.askedBy, 
        type: data.type
      }]);
      playSound("notification");
      
      // Show toast to all players
      addToast(`${data.askedBy} suggested a ${data.type} for ${data.targetPlayer}`, 3000);
    });

    // FIXED: Enhanced prompt choice - broadcast to all players
    sock.on("prompt-chosen", (data) => {
      console.log("✅ Prompt chosen by server:", data);
      setChosenPrompt(data.prompt);
      setPrompts(data.allPrompts || []);
      
      // For truth, automatically mark as completed
      if (data.prompt.type === "truth" && data.player === localName) {
        setProofUploaded(true);
      }
      
      playSound("select");
      addToast(`${data.player} chose a ${data.prompt.type} prompt!`, 3000);
    });

    // FIXED: Enhanced truth/dare choice handling
    sock.on("truth-dare-chosen", (data) => {
      console.log("🟣 Truth/Dare chosen:", data);
      setTruthDareChoice({ player: data.player, choice: data.choice });
      setIsChoicePending(false);
      setTimeLeft(null);
      
      // Reset prompts when choice is made
      setPrompts([]);
      setChosenPrompt(null);
      
      addToast(`${data.player} chose ${data.choice}!`, 3000);
    });

    // FIXED: Enhanced proof system
    sock.on("proof-uploaded", (data) => {
      console.log("📸 Proof uploaded:", data);
      setProofs(prev => ({
        ...prev,
        [data.player]: data.proofKey
      }));
      
      if (data.player === localName) {
        setProofUploaded(true);
      }
      
      addToast(`${data.player} uploaded proof for their dare!`, 3000, "success");
    });

    sock.on("proof-ready-for-review", (data) => {
      console.log("📢 Proof ready for review:", data);
      if (isHost && data.player === selectedPlayer) {
        setProofUploaded(true);
        addToast(`${data.player} has completed their task! You can now start the next round!`, 3000, "success");
      }
    });

    // FIXED: Enhanced round reset
    sock.on("round-reset", () => {
      console.log("🔄 Round reset by server");
      setSelectedPlayer(null);
      setPrompts([]);
      setChosenPrompt(null);
      setTruthDareChoice(null);
      setIsChoicePending(false);
      setTimeLeft(null);
      setProofImage(null);
      setProofUploaded(false);
      setSpinning(false);
      setNextRoundLoading(false);
      
      addToast("Next round started!", 2000);
    });

    // FIXED: Enhanced chat with proper synchronization
    sock.on("receive-chat-message", (message) => {
      console.log("💬 Chat message received:", message);
      setChatMessages(prev => [...prev, message]);
      if (message.sender !== localName) {
        playSound("message");
      }
    });

    sock.on("chat-history", (messages) => {
      console.log("📜 Chat history loaded:", messages.length, "messages");
      setChatMessages(messages);
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

    sock.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", reason);
      setReconnecting(true);
      if (reason === "io server disconnect") {
        addToast("Disconnected from server", 3000, "error");
      } else {
        addToast("Connection lost - reconnecting...", 3000, "warning");
      }
    });

    sock.on("connect_error", (error) => {
      console.error("❌ Connection error:", error);
      setReconnecting(true);
      addToast("Connection failed - retrying...", 3000, "error");
    });

    setSocket(sock);

    return () => {
      console.log("🧹 Cleaning up socket");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      sock.disconnect();
    };
  }, [roomId, localName]);

  // 🔥 FIXED: Enhanced chat functions
  const sendChatMessage = () => {
    if (!chatInput.trim() || !socket || !roomId) {
      console.log("❌ Cannot send message:", { hasSocket: !!socket, hasRoom: !!roomId, hasInput: !!chatInput.trim() });
      return;
    }

    const message = {
      id: Date.now(),
      sender: localName,
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
      type: "text"
    };

    console.log("📤 Sending chat message:", message);
    socket.emit("send-chat-message", { roomId, message });
    setChatInput("");
    
    // Clear typing indicator
    socket.emit("typing", { roomId, isTyping: false });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleChatInputChange = (e) => {
    setChatInput(e.target.value);
    
    // Typing indicators
    if (!typingTimeoutRef.current && socket && roomId) {
      socket.emit("typing", { roomId, isTyping: true });
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      if (socket && roomId) {
        socket.emit("typing", { roomId, isTyping: false });
      }
      typingTimeoutRef.current = null;
    }, 1000);
  };

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  // 🎮 FIXED: Enhanced room actions
  const createRoom = () => {
    if (!socket) {
      addToast("Not connected to server", 3000, "error");
      return;
    }
    if (!localName.trim()) {
      addToast("Please enter your name", 3000, "error");
      return;
    }
    console.log("🆕 Creating room as:", localName);
    clearGameState(); // Clear old state
    socket.emit("create-room", { 
      player: { name: localName },
      gameType: "truth-or-dare"
    });
  };

  const joinRoom = () => {
    if (!socket) {
      addToast("Not connected to server", 3000, "error");
      return;
    }
    if (!roomId.trim() || !localName.trim()) {
      addToast("Please enter name and room ID", 3000, "error");
      return;
    }
    console.log("👥 Joining room:", roomId, "as:", localName);
    clearGameState(); // Clear old state
    socket.emit("join-room", { 
      roomId: roomId.toUpperCase(), 
      player: { name: localName } 
    });
  };

  const leaveRoom = () => {
    console.log("🚪 Leaving room");
    clearGameState();
    
    if (socket && roomId) {
      socket.emit("leave-room", roomId);
    }
    
    setRoomId("");
    setPlayers([]);
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

    addToast("Left the room", 2000);
  };

  // 🎲 FIXED: Enhanced spin player
  const startSpin = () => {
    if (!socket || !roomId || spinning || players.length === 0) {
      console.log("❌ Cannot spin:", { hasSocket: !!socket, hasRoom: !!roomId, spinning, players: players.length });
      return;
    }
    
    console.log("🎡 Starting spin");
    setSpinning(true);
    setSelectedPlayer(null);
    setPrompts([]);
    setChosenPrompt(null);
    setTruthDareChoice(null);
    setIsChoicePending(false);
    setTimeLeft(null);
    setProofImage(null);
    setProofUploaded(false);
    
    playSound("spin");
    socket.emit("spin-player", { roomId });
  };

  // 🎭 FIXED: Enhanced send prompt
  const sendPrompt = () => {
    if (!socket || !roomId || !promptText.trim() || !selectedPlayer) {
      console.log("❌ Cannot send prompt:", { hasSocket: !!socket, hasRoom: !!roomId, hasPrompt: !!promptText.trim(), selectedPlayer });
      return;
    }
    
    // Validate prompt type matches player's choice
    if (truthDareChoice && promptType !== truthDareChoice.choice.toLowerCase()) {
      addToast(`You can only send ${truthDareChoice.choice.toLowerCase()} prompts for ${selectedPlayer}`, 3000, "error");
      return;
    }
    
    console.log("📤 Sending prompt:", promptText, "type:", promptType, "for:", selectedPlayer);
    socket.emit("send-prompt", { 
      roomId, 
      prompt: promptText, 
      askedBy: localName, 
      type: promptType,
      targetPlayer: selectedPlayer
    });
    setPromptText("");
    addToast("Prompt sent!", 2000);
  };

  // ✅ FIXED: Enhanced choose prompt
  const choosePrompt = (pr) => {
    if (!socket || !roomId || !selectedPlayer) return;
    
    console.log("✅ Choosing prompt:", pr);
    
    socket.emit("choose-prompt", {
      roomId,
      prompt: pr,
      player: localName
    });
    
    playSound("select");
  };

  // ✅ FIXED: Enhanced submit Truth/Dare
  const submitTruthDare = (choice) => {
    if (!socket || !roomId || !selectedPlayer) {
      console.log("❌ Cannot submit choice:", { hasSocket: !!socket, hasRoom: !!roomId, selectedPlayer });
      return;
    }
    
    console.log("🟣 Submitting choice:", choice);
    socket.emit("submit-truth-dare", { 
      roomId, 
      choice,
      player: localName 
    });
    
    setIsChoicePending(false);
    setTimeLeft(null);
    playSound("select");
  };

  // 📸 FIXED: Enhanced proof image upload
  const handleProofUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast("Please upload an image file", 3000, "error");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      addToast("Image size should be less than 2MB", 3000, "error");
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
      
      if (socket && roomId) {
        socket.emit("proof-uploaded", { 
          roomId, 
          player: localName, 
          proofKey 
        });
        
        socket.emit("notify-proof-ready", {
          roomId,
          player: localName,
          type: "dare"
        });
      }
    };
    reader.onerror = () => {
      addToast("Error reading image file", 3000, "error");
    };
    reader.readAsDataURL(file);
  };

  // 🔄 FIXED: Enhanced reset round
  const resetRound = () => {
    if (!isHost || !socket || !roomId) return;
    
    console.log("🔄 Resetting round");
    setNextRoundLoading(true);
    
    socket.emit("reset-round", { roomId });
    
    // The actual state reset will happen when we receive the round-reset event from server
    addToast("Starting next round...", 2000);
  };

  // 🧩 Toast management
  const addToast = (message, duration = 3000, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  };

  // FIXED: Enhanced condition for next round button
  const shouldShowNextRoundButton = isHost && selectedPlayer && proofUploaded;

  // Check if proof should be required (only for dares)
  const shouldRequireProof = chosenPrompt && chosenPrompt.type === "dare";

  // Format chat time
  const formatChatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // 🧩 Lobby UI - Mobile Optimized
  if (stage === "lobby") {
    return (
      <div className="h-screen w-full flex overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto" ref={mainContainerRef}>
          <div className="min-h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-6 flex items-center justify-center relative">
            {/* Reconnection overlay */}
            {reconnecting && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
                <Card className="p-6 bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border-0 text-center">
                  <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Reconnecting</h3>
                  <p className="text-gray-600">Please wait while we reconnect to the game...</p>
                </Card>
              </div>
            )}

            <div className="w-full max-w-2xl relative z-10">
              <Card className="p-6 md:p-8 bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border-0 mx-2">
                <div className="text-center mb-6 md:mb-8">
                  <div className="flex justify-center items-center mb-4">
                    <Gamepad2 className="w-8 h-8 md:w-12 md:h-12 text-purple-600 mr-3" />
                    <h1 className="text-2xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      Truth or Dare
                    </h1>
                  </div>
                  <p className="text-gray-600 text-sm md:text-lg px-2">Create or join a room to start playing with friends!</p>
                </div>

                <div className="space-y-4 md:space-y-6">
                  <div className="space-y-3 md:space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                      <Input 
                        value={localName} 
                        onChange={(e) => setLocalName(e.target.value)} 
                        placeholder="Enter your nickname" 
                        className="text-base md:text-lg py-3 md:py-6 border-2 focus:border-purple-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Room Code</label>
                      <Input 
                        value={roomId} 
                        onChange={(e) => setRoomId(e.target.value.toUpperCase())} 
                        placeholder="Enter room code (leave empty to create new)" 
                        className="text-base md:text-lg py-3 md:py-6 border-2 focus:border-purple-500 transition-all font-mono uppercase"
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

                {/* Connection status */}
                <div className="mt-4 text-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${
                    socket?.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${socket?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    {socket?.connected ? 'Connected' : 'Disconnected'}
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

  // 🧩 Game UI - Mobile Optimized
  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto" ref={mainContainerRef}>
        <div className="min-h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-2 md:p-6 relative">
          {/* Reconnection overlay */}
          {reconnecting && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <Card className="p-6 bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border-0 text-center max-w-sm w-full">
                <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Reconnecting</h3>
                <p className="text-gray-600">Please wait while we reconnect to the game...</p>
              </Card>
            </div>
          )}

          {/* Rest of your game UI remains the same but with improved mobile styling */}
          {/* ... (Your existing game UI code) ... */}
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
    <div className="relative w-48 h-48 md:w-80 md:h-80 mx-auto">
      <div
        ref={wheelRef}
        className="w-full h-full rounded-full border-4 md:border-8 border-white relative flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 shadow-2xl"
        style={{
          boxShadow: '0 0 30px rgba(255, 255, 255, 0.3)'
        }}
      >
        {/* Center circle */}
        <div className="absolute w-12 h-12 md:w-20 md:h-20 bg-white rounded-full shadow-inner flex items-center justify-center">
          <div className="w-10 h-10 md:w-16 md:h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 md:w-8 md:h-8 text-white" />
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
              } ${isLargeSegment ? 'text-xs md:text-lg w-24 md:w-40' : 'text-xs md:text-sm w-20 md:w-36'}`}
              style={{ 
                transform: `rotate(${angle}deg) translate(0, -80px) rotate(-${angle}deg)`,
                transformOrigin: 'center center'
              }}
            >
              <div className={`
                px-1 py-0.5 md:px-3 md:py-1 rounded-full backdrop-blur-sm
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
        <div className="w-3 h-4 md:w-6 md:h-8 bg-yellow-400 rounded-t-lg shadow-lg" />
        <div className="w-2 h-2 md:w-4 md:h-4 bg-yellow-400 transform rotate-45 mx-auto -mt-1 md:-mt-2 shadow-lg" />
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
            p-2 md:p-4 rounded-xl shadow-2xl backdrop-blur-sm border transform transition-all duration-500 animate-in slide-in-from-right-80
            ${t.type === 'error' 
              ? 'bg-red-500/90 text-white border-red-600' 
              : t.type === 'success'
              ? 'bg-green-500/90 text-white border-green-600'
              : 'bg-white/95 text-gray-900 border-gray-200'
            }
          `}
        >
          <div className="flex items-center space-x-2 md:space-x-3">
            {t.type === 'success' && <Sparkles className="w-3 h-3 md:w-5 md:h-5" />}
            {t.type === 'error' && <div className="w-3 h-3 md:w-5 md:h-5">⚠️</div>}
            <span className="font-medium text-xs md:text-base">{t.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}