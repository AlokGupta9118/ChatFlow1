import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { 
  Heart, Users, LinkIcon, Crown, Sparkles, Timer, 
  Gamepad2, Volume2, VolumeX, Settings, 
  Star, Target, Clock, CheckCircle, PartyPopper,
  Loader2, Share2, Download, Copy, X, Home,
  User, Key, ArrowLeft, LogOut, MessageCircle,
  Trophy, Zap, Award, Brain, Smile, Laugh,
  Check, Wifi, WifiOff, RotateCcw
} from "lucide-react";
import html2canvas from "html2canvas";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:3001", {
  transports: ['websocket', 'polling'],
  timeout: 10000,
  autoConnect: true
});

// Enhanced questions with categories, weights, and personality insights
const questions = [
  {
    id: 1,
    question: "What's your ideal weekend?",
    options: ["Adventure outdoors", "Cozy at home", "Party with friends", "Exploring new places"],
    category: "Lifestyle",
    weight: 1.2,
    insights: {
      "Adventure outdoors": "Active, nature-loving, spontaneous",
      "Cozy at home": "Homebody, introverted, comfort-seeking",
      "Party with friends": "Social, extroverted, fun-loving",
      "Exploring new places": "Curious, adventurous, open-minded"
    }
  },
  {
    id: 2,
    question: "Pick your favorite food type:",
    options: ["Italian", "Asian", "Fast food", "Healthy & organic"],
    category: "Taste",
    weight: 1.0,
    insights: {
      "Italian": "Comfort-seeking, traditional, romantic",
      "Asian": "Adventurous, diverse tastes, experimental",
      "Fast food": "Practical, busy lifestyle, casual",
      "Healthy & organic": "Health-conscious, disciplined, mindful"
    }
  },
  {
    id: 3,
    question: "Your dream vacation is:",
    options: ["Beach paradise", "Mountain retreat", "City exploration", "Cultural experience"],
    category: "Adventure",
    weight: 1.3,
    insights: {
      "Beach paradise": "Relaxed, sun-loving, peaceful",
      "Mountain retreat": "Reflective, nature-loving, adventurous",
      "City exploration": "Energetic, cultural, social",
      "Cultural experience": "Learning-oriented, curious, historical"
    }
  },
  {
    id: 4,
    question: "How do you handle stress?",
    options: ["Exercise", "Talk to friends", "Watch movies", "Sleep it off"],
    category: "Emotional",
    weight: 1.4,
    insights: {
      "Exercise": "Active coping, disciplined, physical",
      "Talk to friends": "Social support, communicative, emotional",
      "Watch movies": "Escapist, creative, solitary",
      "Sleep it off": "Restorative, patient, introspective"
    }
  },
  {
    id: 5,
    question: "Your favorite type of music:",
    options: ["Pop", "Rock", "Hip-Hop", "Electronic"],
    category: "Entertainment",
    weight: 0.8,
    insights: {
      "Pop": "Mainstream, upbeat, social",
      "Rock": "Energetic, rebellious, emotional",
      "Hip-Hop": "Urban, confident, rhythmic",
      "Electronic": "Modern, dance-oriented, experimental"
    }
  }
];

// NEW: Modern Input Component with advanced styling
const ModernInput = ({ 
  label, 
  icon: Icon, 
  placeholder, 
  value, 
  onChange, 
  onKeyPress,
  type = "text",
  autoFocus = false,
  className = "",
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="space-y-3">
      <Label htmlFor={label.toLowerCase()} className="font-bold text-lg text-white flex items-center">
        <Icon className="w-5 h-5 mr-3 text-purple-300" />
        {label}
      </Label>
      <div className="relative">
        <input
          id={label.toLowerCase()}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyPress={onKeyPress}
          autoFocus={autoFocus}
          className={`
            w-full h-16 px-6 bg-white/15 border-3 border-white/30 
            rounded-2xl text-white placeholder-white/70
            focus:bg-white/20 focus:border-purple-400 focus:ring-4 focus:ring-purple-400/30
            transition-all duration-300 text-lg font-medium
            backdrop-blur-lg shadow-2xl
            ${isFocused ? 'scale-105 shadow-purple-500/25' : 'scale-100'}
            ${className}
          `}
          autoComplete="off"
          style={{
            WebkitAppearance: 'none',
            WebkitBorderRadius: '16px',
          }}
          {...props}
        />
        {isFocused && (
          <div className="absolute inset-0 rounded-2xl border-2 border-purple-400 pointer-events-none animate-pulse" />
        )}
      </div>
    </div>
  );
};

// NEW: Modern Button Component
const ModernButton = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = "primary",
  size = "lg",
  className = "",
  ...props 
}) => {
  const baseStyles = "w-full font-bold rounded-2xl transition-all duration-300 transform shadow-2xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center";
  
  const variants = {
    primary: "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-2 border-purple-400/50",
    secondary: "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-2 border-blue-400/50",
    outline: "bg-white/10 hover:bg-white/20 text-white border-2 border-white/30",
    success: "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-2 border-green-400/50"
  };

  const sizes = {
    sm: "py-3 px-6 text-base",
    lg: "py-5 px-8 text-lg",
    xl: "py-6 px-8 text-xl"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default function AdvancedCompatibilityGame() {
  // Core states
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Game states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState<any[]>([]);
  const [bothAnswers, setBothAnswers] = useState<any>({});
  const [showResults, setShowResults] = useState(false);
  const [playerProgress, setPlayerProgress] = useState<{[key: string]: number}>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [playerReactions, setPlayerReactions] = useState<{[key: string]: string}>({});
  const [connectionStatus, setConnectionStatus] = useState("connected");

  // UI/UX states
  const [darkMode, setDarkMode] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Screenshot sharing states
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Refs
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);
  const screenshotRef = useRef<HTMLDivElement>(null);

  // FIXED: Enhanced mobile detection with proper viewport handling
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Set proper viewport height
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    checkMobile();
    
    const handleResize = () => {
      checkMobile();
      // Force reflow to fix mobile issues
      if (mainContainerRef.current) {
        mainContainerRef.current.style.height = 'calc(var(--vh, 1vh) * 100)';
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // FIXED: Enhanced scroll to bottom function
  const scrollToBottom = () => {
    if (mainContainerRef.current) {
      setTimeout(() => {
        if (mainContainerRef.current) {
          mainContainerRef.current.scrollTo({
            top: mainContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  // FIXED: Enhanced auto-scroll on content changes
  useEffect(() => {
    scrollToBottom();
  }, [players, currentQuestion, showResults]);

  // FIXED: Enhanced socket connection management
  useEffect(() => {
    const handleRoomCreated = (room: any) => {
      setRoomId(room.roomId || '');
      setIsHost(true);
      setJoined(true);
      setPlayers(room.players || []);
      playSound("success");
    };

    const handleRoomJoined = (room: any) => {
      setRoomId(room.roomId || '');
      setPlayers(room.players || []);
      setJoined(true);
      playSound("success");
    };

    const handleUpdatePlayers = (playersList: any[]) => {
      setPlayers(playersList);
    };

    const handleGameStarted = () => {
      setGameStarted(true);
      setCurrentQuestion(0);
      setAnswers([]);
      setCurrentAnswer("");
      playSound("success");
    };

    const handleShowResults = (data: any) => {
      setBothAnswers(data.results || {});
      setShowResults(true);
      playSound("victory");
      triggerConfetti();
    };

    const handlePlayerProgress = (data: {player: string, progress: number}) => {
      setPlayerProgress(prev => ({
        ...prev,
        [data.player]: data.progress
      }));
    };

    socket.on("room-created", handleRoomCreated);
    socket.on("room-joined", handleRoomJoined);
    socket.on("update-players", handleUpdatePlayers);
    socket.on("game-started", handleGameStarted);
    socket.on("show-results", handleShowResults);
    socket.on("player-progress", handlePlayerProgress);

    return () => {
      socket.off("room-created", handleRoomCreated);
      socket.off("room-joined", handleRoomJoined);
      socket.off("update-players", handleUpdatePlayers);
      socket.off("game-started", handleGameStarted);
      socket.off("show-results", handleShowResults);
      socket.off("player-progress", handlePlayerProgress);
    };
  }, []);

  // Enhanced sound effects
  const playSound = (soundName: string) => {
    if (!soundEnabled) return;
    
    try {
      const sounds: {[key: string]: number} = {
        select: 800,
        success: 1200,
        notification: 600,
        victory: 1500
      };
      
      const frequency = sounds[soundName];
      if (frequency && window.AudioContext) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      }
    } catch (error) {
      console.log("Audio not supported");
    }
  };

  // Room management functions
  const createRoom = () => {
    const trimmedName = playerName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      alert("Please enter a valid name (at least 2 characters)");
      nameInputRef.current?.focus();
      return;
    }
    
    socket.emit("create-room", { 
      player: { name: trimmedName },
      gameType: "advanced-compatibility"
    });
  };

  const joinRoom = () => {
    const trimmedName = playerName.trim();
    const trimmedRoomId = roomId.trim();
    
    if (!trimmedName || trimmedName.length < 2) {
      alert("Please enter a valid name (at least 2 characters)");
      nameInputRef.current?.focus();
      return;
    }
    if (!trimmedRoomId) {
      alert("Please enter a room code");
      roomInputRef.current?.focus();
      return;
    }
    
    socket.emit("join-room", { 
      roomId: trimmedRoomId, 
      player: { name: trimmedName } 
    });
  };

  const startGame = () => {
    if (players.length < 2) {
      alert("Need at least 2 players to start");
      return;
    }
    socket.emit("start-game", { roomId });
  };

  const submitAnswer = () => {
    if (!currentAnswer || isSubmitting) return;
    setIsSubmitting(true);
    playSound("select");

    const newAnswers = [...answers, { 
      question: questions[currentQuestion].question,
      answer: currentAnswer,
      category: questions[currentQuestion].category,
      weight: questions[currentQuestion].weight,
      questionId: questions[currentQuestion].id,
      personalityInsight: questions[currentQuestion].insights?.[currentAnswer] || "No insight available"
    }];
    
    setAnswers(newAnswers);

    const progress = Math.round(((currentQuestion + 1) / questions.length) * 100);
    socket.emit("player-progress", { roomId, progress });

    if (currentQuestion < questions.length - 1) {
      socket.emit("answer-submitted", {
        roomId,
        playerName,
        questionIndex: currentQuestion,
        answer: currentAnswer
      });
      
      setTimeout(() => {
        setCurrentQuestion(prev => prev + 1);
        setCurrentAnswer("");
        setIsSubmitting(false);
      }, 400);
    } else {
      socket.emit("submit-answers", { 
        roomId, 
        player: { name: playerName }, 
        answers: newAnswers
      });
    }
  };

  const triggerConfetti = () => {
    if (!animationsEnabled) return;
    
    for (let i = 0; i < 75; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '12px';
        confetti.style.height = '12px';
        confetti.style.background = `hsl(${Math.random() * 360}, 100%, 60%)`;
        confetti.style.borderRadius = '50%';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.top = '-20px';
        confetti.style.zIndex = '9999';
        confetti.style.pointerEvents = 'none';
        confetti.style.animation = `confetti-fall ${1.5 + Math.random() * 2}s ease-out forwards`;
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
          if (document.body.contains(confetti)) {
            document.body.removeChild(confetti);
          }
        }, 4000);
      }, i * 75);
    }
  };

  // NEW: Leave room function
  const leaveRoom = () => {
    if (window.confirm("Are you sure you want to leave the room?")) {
      setJoined(false);
      setGameStarted(false);
      setShowResults(false);
      setPlayers([]);
      setRoomId("");
    }
  };

  // NEW: Enhanced Player Card Component
  const PlayerCard = ({ player, index }: { player: any, index: number }) => (
    <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
      darkMode ? 'bg-white/10 hover:bg-white/15 border-white/20' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
    }`}>
      <div className="flex items-center space-x-3">
        <Avatar className={`w-12 h-12 border-2 ${index === 0 ? 'border-yellow-400' : 'border-blue-400'}`}>
          <AvatarFallback className={`text-base ${index === 0 ? 'bg-gradient-to-br from-yellow-500 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'} text-white font-bold`}>
            {player.name?.charAt(0)?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center space-x-2">
          <span className="font-bold text-white text-lg">{player.name || "Unknown"}</span>
          {index === 0 && <Crown className="w-5 h-5 text-yellow-400 animate-pulse" />}
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {playerProgress[player.name] !== undefined && (
          <div className="text-right">
            <div className="text-sm font-bold text-white">{playerProgress[player.name]}%</div>
            <Progress value={playerProgress[player.name]} className="w-24 h-2 bg-white/20" />
          </div>
        )}
        
        {playerReactions[player.name] && (
          <div className={`px-3 py-1 rounded-full text-lg animate-bounce bg-white/20`}>
            {playerReactions[player.name]}
          </div>
        )}
      </div>
    </div>
  );

  // NEW: Connection Status Component
  const ConnectionStatus = () => (
    <div className={`fixed top-4 right-4 px-4 py-2 rounded-full text-sm font-semibold z-50 backdrop-blur-sm border-2 ${
      connectionStatus === "connected" 
        ? 'bg-green-500/20 border-green-400/50 text-green-300' 
        : 'bg-red-500/20 border-red-400/50 text-red-300 animate-pulse'
    }`}>
      {connectionStatus === "connected" ? 
        <><Wifi className="w-4 h-4 inline mr-2" />Online</> : 
        <><WifiOff className="w-4 h-4 inline mr-2" />Offline</>
      }
    </div>
  );

  // NEW: Settings Panel Component
  const SettingsPanel = () => (
    <Card className={`p-6 absolute top-16 right-4 w-80 backdrop-blur-lg border-2 ${
      darkMode ? 'bg-slate-800/90 border-slate-600' : 'bg-white/90 border-gray-200'
    } shadow-2xl z-50`}>
      <h3 className="text-lg font-bold mb-4 flex items-center text-white">
        <Settings className="w-5 h-5 mr-2" />
        Game Settings
      </h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="flex items-center text-base text-white">
            <Sparkles className="w-4 h-4 mr-2" />
            Dark Mode
          </Label>
          <Switch checked={darkMode} onCheckedChange={setDarkMode} />
        </div>
        
        <div className="flex items-center justify-between">
          <Label className="flex items-center text-base text-white">
            <Volume2 className="w-4 h-4 mr-2" />
            Sound Effects
          </Label>
          <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
        </div>
        
        <ModernButton variant="outline" onClick={() => setShowAdvancedSettings(false)}>
          Close Settings
        </ModernButton>
      </div>
    </Card>
  );

  // NEW: Completely redesigned Join/Create Screen
  const JoinCreateScreen = () => {
    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (playerName.trim() && !roomId.trim()) {
          createRoom();
        } else if (playerName.trim() && roomId.trim()) {
          joinRoom();
        }
      }
    };

    return (
      <div 
        ref={mainContainerRef}
        className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 overflow-y-auto mobile-safe-area"
        style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}
      >
        <ConnectionStatus />
        
        {/* Settings Button */}
        <div className="absolute top-4 left-4">
          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-white/30 text-white backdrop-blur-sm transition-all"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full max-w-md mx-auto">
          <Card className="p-8 bg-white/10 backdrop-blur-lg border-2 border-white/20 shadow-2xl rounded-3xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl">
                    <Heart className="w-12 h-12 text-white animate-pulse" />
                  </div>
                  <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-spin" />
                </div>
              </div>
              
              <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                Compatibility
              </h1>
              <p className="text-white/80 text-lg">
                Discover your connection with someone special
              </p>
            </div>

            {/* Enhanced Input Fields */}
            <div className="space-y-6 mb-8">
              <ModernInput
                label="Your Name"
                icon={User}
                placeholder="Enter your beautiful name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus={!isMobile}
                ref={nameInputRef}
              />
              
              <ModernInput
                label="Room Code"
                icon={Key}
                placeholder="Enter room code to join"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                ref={roomInputRef}
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <ModernButton
                onClick={createRoom}
                disabled={!playerName.trim()}
                variant="primary"
                size="xl"
              >
                <Crown className="w-6 h-6 mr-3" />
                Create New Room
              </ModernButton>

              <ModernButton
                onClick={joinRoom}
                disabled={!playerName.trim() || !roomId.trim()}
                variant="secondary"
                size="xl"
              >
                <Users className="w-6 h-6 mr-3" />
                Join Existing Room
              </ModernButton>
            </div>

            {/* Features */}
            <div className="mt-8 p-4 rounded-2xl bg-white/10 border-2 border-white/20">
              <h4 className="font-semibold mb-3 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4 mr-2 text-yellow-400" />
                Amazing Features
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm text-white/80">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Real-time Sync</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Progress Tracking</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>Personality Insights</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                  <span>Share Results</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {showAdvancedSettings && <SettingsPanel />}
      </div>
    );
  };

  // NEW: Enhanced Waiting Screen with Leave Button
  const WaitingScreen = () => (
    <div 
      ref={mainContainerRef}
      className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 overflow-y-auto mobile-safe-area"
      style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}
    >
      <ConnectionStatus />
      
      {/* Header with Leave Button */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
        <ModernButton
          onClick={leaveRoom}
          variant="outline"
          size="sm"
          className="w-auto px-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Leave Room
        </ModernButton>
        
        <button
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-white/30 text-white backdrop-blur-sm transition-all"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full max-w-2xl">
        <Card className="p-8 bg-white/10 backdrop-blur-lg border-2 border-white/20 shadow-2xl rounded-3xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Heart className="w-20 h-20 text-pink-400 animate-pulse" />
                <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-spin" />
              </div>
            </div>
            
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
              Waiting Room
            </h2>
            <p className="text-white/80 text-lg">
              Room Code: <span className="font-mono font-bold text-2xl text-white">{roomId}</span>
            </p>
          </div>

          {/* Players */}
          <div className="space-y-4 mb-8 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {players.map((player, index) => (
              <PlayerCard key={player.name || index} player={player} index={index} />
            ))}
          </div>

          {/* Status */}
          {players.length === 1 && (
            <div className="p-4 rounded-2xl bg-yellow-500/20 border-2 border-yellow-400/30 text-center mb-6">
              <div className="flex items-center justify-center space-x-2 text-yellow-300">
                <Users className="w-5 h-5" />
                <span className="font-semibold">Waiting for more players...</span>
              </div>
            </div>
          )}

          {/* Action Button */}
          {isHost ? (
            <ModernButton
              onClick={startGame}
              disabled={players.length < 2}
              variant="primary"
              size="xl"
            >
              <Sparkles className="w-6 h-6 mr-3" />
              Start Game {players.length < 2 && `(${2 - players.length} more needed)`}
            </ModernButton>
          ) : (
            <div className="p-4 rounded-2xl bg-blue-500/20 border-2 border-blue-400/30 text-center">
              <div className="flex items-center justify-center space-x-2 text-blue-300">
                <Clock className="w-5 h-5 animate-pulse" />
                <span className="font-semibold">Waiting for host to start...</span>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => navigator.clipboard?.writeText(roomId)}
              className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-white/30 text-white transition-all flex items-center"
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              Copy Code
            </button>
          </div>
        </Card>
      </div>

      {showAdvancedSettings && <SettingsPanel />}
    </div>
  );

  // NEW: Enhanced Game Screen
  const GameScreen = () => {
    const currentQ = questions[currentQuestion];
    
    const handleSubmit = () => {
      if (!currentAnswer) {
        alert("Please select an answer before submitting");
        return;
      }
      submitAnswer();
    };

    // Timer effect
    useEffect(() => {
      if (timeLeft === null || !gameStarted || showResults) return;
      
      if (timeLeft <= 0) {
        handleSubmit();
        return;
      }
      
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev !== null ? prev - 1 : null);
      }, 1000);
      
      return () => clearTimeout(timer);
    }, [timeLeft, gameStarted, showResults]);

    // Start timer when question changes
    useEffect(() => {
      if (gameStarted && !showResults && currentQuestion < questions.length) {
        setTimeLeft(25);
      }
    }, [currentQuestion, gameStarted, showResults]);

    return (
      <div 
        ref={mainContainerRef}
        className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 overflow-y-auto mobile-safe-area"
        style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}
      >
        <ConnectionStatus />
        
        {/* Header with Leave Button */}
        <div className="absolute top-4 left-4">
          <ModernButton
            onClick={leaveRoom}
            variant="outline"
            size="sm"
            className="w-auto px-4"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Leave Game
          </ModernButton>
        </div>

        <div className="w-full max-w-4xl">
          {/* Game Header */}
          <div className="mb-6 p-6 rounded-3xl bg-white/10 backdrop-blur-lg border-2 border-white/20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Room: {roomId}</h2>
                <p className="text-white/80 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  {players.map(p => p.name).join(" & ")}
                </p>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-white/80 text-sm">Progress</div>
                  <div className="text-white text-xl font-bold">
                    {currentQuestion + 1} / {questions.length}
                  </div>
                </div>
                
                {timeLeft !== null && (
                  <div className="text-center">
                    <div className="text-white/80 text-sm">Time</div>
                    <div className={`text-xl font-bold flex items-center ${
                      timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
                    }`}>
                      <Timer className="w-4 h-4 mr-1" />
                      {timeLeft}s
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Player Progress */}
          <div className="grid grid-cols-1 gap-4 mb-6">
            {players.map((player) => (
              <div key={player.name} className={`p-4 rounded-2xl border-2 backdrop-blur-sm ${
                darkMode ? 'bg-white/10 border-white/20' : 'bg-white/80 border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white text-sm">
                        {player.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-white text-base">{player.name}</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {playerProgress[player.name] || 0}%
                  </div>
                </div>
                <Progress 
                  value={playerProgress[player.name] || 0} 
                  className="h-2 bg-white/20"
                />
              </div>
            ))}
          </div>

          {/* Question Card */}
          <Card className="p-8 bg-white/10 backdrop-blur-lg border-2 border-white/20 shadow-2xl rounded-3xl mb-6">
            <div className="text-center mb-8">
              <Badge className="mb-4 px-4 py-2 text-sm bg-purple-500/20 text-purple-300 border-2 border-purple-400/30">
                {currentQ.category} • Weight: {currentQ.weight}x
              </Badge>
              <h3 className="text-3xl font-bold text-white mb-4 leading-tight">
                {currentQ.question}
              </h3>
              <p className="text-white/70 text-lg">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-4 mb-8">
              {currentQ.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentAnswer(option);
                    playSound("select");
                  }}
                  className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${
                    currentAnswer === option 
                      ? 'bg-purple-500/30 border-purple-400 scale-105 shadow-lg' 
                      : 'bg-white/10 border-white/20 hover:bg-white/20 hover:scale-102'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      currentAnswer === option 
                        ? 'border-purple-400 bg-purple-400' 
                        : 'border-white/50'
                    }`}>
                      {currentAnswer === option && (
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span className="text-white text-lg font-semibold">{option}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Personality Insight */}
            {currentAnswer && currentQ.insights && (
              <div className={`p-4 rounded-2xl border-2 mb-6 ${
                darkMode ? 'bg-blue-500/20 border-blue-400/30' : 'bg-blue-100 border-blue-200'
              }`}>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <span className="font-medium text-white text-base">
                    This suggests: {currentQ.insights[currentAnswer]}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-white/30 text-white transition-all"
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              <ModernButton
                onClick={handleSubmit}
                disabled={!currentAnswer || isSubmitting}
                size="lg"
                className="w-auto px-8"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    {currentQuestion === questions.length - 1 ? 'Finish Test' : 'Next Question'}
                  </>
                )}
              </ModernButton>
            </div>
          </Card>

          {/* Quick Reactions */}
          <div className="flex justify-center space-x-2">
            {['❤️', '😂', '😮', '👏', '🎉'].map(reaction => (
              <button
                key={reaction}
                onClick={() => socket.emit("player-reaction", { roomId, reaction })}
                className={`p-3 rounded-2xl border-2 text-lg transition-all ${
                  darkMode ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                {reaction}
              </button>
            ))}
          </div>
        </div>

        {showAdvancedSettings && <SettingsPanel />}
      </div>
    );
  };

  // NEW: Enhanced Results Screen
  const ResultsScreen = () => {
    const compatibility = calculateCompatibility();
    const { score, insights } = compatibility;

    const captureScreenshot = async () => {
      if (!screenshotRef.current) return;
      
      setIsCapturing(true);
      
      try {
        const canvas = await html2canvas(screenshotRef.current, {
          backgroundColor: '#0f172a',
          scale: isMobile ? 1 : 1.2,
          useCORS: true,
          logging: false
        });
        
        const imageDataUrl = canvas.toDataURL('image/png', 0.9);
        setCapturedImage(imageDataUrl);
        setShowShareModal(true);
      } catch (error) {
        console.error('Screenshot capture failed:', error);
      } finally {
        setIsCapturing(false);
      }
    };

    const downloadImage = (dataUrl: string) => {
      const link = document.createElement('a');
      link.download = `compatibility-${roomId}-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div 
        ref={mainContainerRef}
        className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 overflow-y-auto mobile-safe-area"
        style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}
      >
        <ConnectionStatus />
        
        {/* Header with Actions */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          <ModernButton
            onClick={leaveRoom}
            variant="outline"
            size="sm"
            className="w-auto px-4"
          >
            <Home className="w-4 h-4 mr-2" />
            Main Menu
          </ModernButton>
          
          <div className="flex space-x-2">
            <button
              onClick={captureScreenshot}
              disabled={isCapturing}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-white/30 text-white transition-all"
            >
              {isCapturing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
            </button>
            
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-white/30 text-white transition-all"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Screenshot capture area */}
        <div ref={screenshotRef} className="w-full max-w-4xl">
          <Card className="p-8 bg-white/10 backdrop-blur-lg border-2 border-white/20 shadow-2xl rounded-3xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <Trophy className="w-20 h-20 text-yellow-400 animate-bounce" />
              </div>
              
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                Compatibility Results
              </h2>
              <p className="text-white/80 text-lg">
                {Object.keys(bothAnswers).join(" 💞 ")}
              </p>
            </div>

            {/* Main Score */}
            <div className="text-center mb-8">
              <div className={`text-6xl md:text-8xl font-black mb-4 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent`}>
                {score}%
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{getCompatibilityMessage(score)}</h3>
            </div>

            {/* Insights */}
            <div className={`p-6 rounded-2xl border-2 mb-8 ${
              darkMode ? 'bg-white/10 border-white/20' : 'bg-white/50 border-gray-200'
            }`}>
              <h3 className="text-xl font-bold mb-4 flex items-center justify-center text-white">
                <Brain className="w-5 h-5 mr-2 text-purple-500" />
                Relationship Insights
              </h3>
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div key={index} className={`flex items-start space-x-3 p-3 rounded-xl ${
                    darkMode ? 'bg-white/5' : 'bg-white'
                  }`}>
                    <Sparkles className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span className="text-white text-base">{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 flex-col sm:flex-row">
              <ModernButton 
                onClick={() => window.location.reload()} 
                variant="success"
                size="lg"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Play Again
              </ModernButton>
              
              <ModernButton 
                onClick={captureScreenshot}
                disabled={isCapturing}
                variant="secondary"
                size="lg"
              >
                {isCapturing ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Share2 className="w-5 h-5 mr-2" />
                )}
                Share Results
              </ModernButton>
            </div>
          </Card>
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full bg-white/95 backdrop-blur-sm shadow-2xl rounded-3xl border-0 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Share2 className="w-6 h-6 mr-2 text-blue-600" />
                    Share Your Results
                  </h3>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="p-2 rounded-2xl hover:bg-gray-100 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {capturedImage && (
                    <div className="text-center">
                      <img
                        src={capturedImage}
                        alt="Compatibility Results"
                        className="w-full h-auto max-h-64 object-contain border-2 border-gray-200 rounded-2xl"
                      />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ModernButton
                      onClick={() => capturedImage && downloadImage(capturedImage)}
                      variant="primary"
                      size="lg"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download
                    </ModernButton>
                    
                    <ModernButton
                      onClick={() => capturedImage && navigator.clipboard?.writeText(`Check out our compatibility score: ${score}%! 🎉`)}
                      variant="secondary"
                      size="lg"
                    >
                      <Copy className="w-5 h-5 mr-2" />
                      Copy Text
                    </ModernButton>
                  </div>

                  <ModernButton
                    onClick={() => setShowShareModal(false)}
                    variant="outline"
                    className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Close
                  </ModernButton>
                </div>
              </div>
            </Card>
          </div>
        )}

        {showAdvancedSettings && <SettingsPanel />}
      </div>
    );
  };

  // Helper functions for results
  const calculateCompatibility = () => {
    const allPlayers = Object.keys(bothAnswers);
    
    if (allPlayers.length < 2) {
      return { 
        score: 0, 
        insights: ["Waiting for both players to complete the test"]
      };
    }

    const [p1, p2] = allPlayers;
    const ans1 = bothAnswers[p1] || [];
    const ans2 = bothAnswers[p2] || [];
    
    let totalScore = 0;
    let maxPossibleScore = 0;

    questions.forEach((question, i) => {
      const weight = question.weight || 1;
      maxPossibleScore += weight;
      
      const answer1 = Array.isArray(ans1) ? ans1[i]?.answer : null;
      const answer2 = Array.isArray(ans2) ? ans2[i]?.answer : null;
      
      if (answer1 && answer2 && answer1 === answer2) {
        totalScore += weight;
      }
    });

    const finalScore = Math.round((totalScore / maxPossibleScore) * 100);
    const insights = generateInsights(finalScore);

    return {
      score: finalScore,
      insights
    };
  };

  const generateInsights = (score: number) => {
    if (score >= 95) {
      return [
        "💖 Cosmic Soulmates! Perfect alignment in all areas",
        "✨ Exceptional harmony in values and lifestyle",
        "🌟 Your connection is truly special and rare"
      ];
    } else if (score >= 85) {
      return [
        "⭐ Excellent Match! Deep connection and strong compatibility",
        "💫 Great balance of shared interests and differences",
        "🎯 You complement each other beautifully"
      ];
    } else if (score >= 75) {
      return [
        "🌈 Strong Potential! Unique connection with room for growth",
        "💡 Your differences create opportunities for learning",
        "🚀 Great foundation for a beautiful relationship"
      ];
    } else if (score >= 65) {
      return [
        "🎭 Interesting Dynamic! You challenge and inspire each other",
        "🌱 Unique combination with potential for development",
        "⚡ Exciting chemistry with room to grow"
      ];
    } else {
      return [
        "🌀 Unconventional Match! Fresh perspectives and exciting chemistry",
        "🎨 Your differences create a unique and interesting dynamic",
        "💝 Every connection has its own special magic"
      ];
    }
  };

  const getCompatibilityMessage = (score: number) => {
    if (score >= 95) return "Cosmic Soulmates! 💫";
    if (score >= 85) return "Perfect Match! 🌟";
    if (score >= 75) return "Excellent Chemistry! ⭐";
    if (score >= 65) return "Great Potential! 💫";
    if (score >= 50) return "Interesting Connection! ✨";
    return "Unique Chemistry! 🎭";
  };

  // Add mobile-optimized CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --vh: 1vh;
      }
      
      @keyframes confetti-fall {
        0% {
          transform: translateY(-20px) rotate(0deg) scale(1);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(720deg) scale(0.5);
          opacity: 0;
        }
      }
      
      /* Mobile optimizations */
      .mobile-safe-area {
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
        padding-bottom: env(safe-area-inset-bottom);
      }
      
      @media (max-width: 768px) {
        input, button {
          font-size: 16px !important;
          min-height: 44px;
        }
        
        /* Prevent zoom on iOS */
        input {
          transform: scale(1);
          font-size: 16px !important;
        }
        
        /* Smooth scrolling */
        * {
          -webkit-overflow-scrolling: touch;
        }
      }
      
      /* Custom scrollbar */
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(168, 85, 247, 0.5);
        border-radius: 10px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(168, 85, 247, 0.7);
      }
      
      /* Smooth transitions */
      * {
        transition: all 0.2s ease-in-out;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Main render logic
  if (showResults) {
    return <ResultsScreen />;
  }

  if (gameStarted) {
    return <GameScreen />;
  }

  if (joined) {
    return <WaitingScreen />;
  }

  return <JoinCreateScreen />;
}