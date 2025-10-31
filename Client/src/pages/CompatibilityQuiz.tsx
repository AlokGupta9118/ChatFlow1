import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Heart, Users, LinkIcon, Crown, Sparkles, Timer, Trophy, 
  Gamepad2, Camera, Volume2, VolumeX, Settings, Zap, Award,
  Star, Target, TrendingUp, Clock, CheckCircle, PartyPopper,
  MessageCircle, ThumbsUp, Flame, Medal, Users2, Brain,
  Smile, Frown, Meh, Laugh, HeartCrack, Loader2, Share2,
  Download, Image, Copy, Check, MapPin, Calendar, Music,
  Coffee, Film, BookOpen, Utensils, Mountain, Palette,
  Zap as Lightning, Moon, Sun, Wifi, WifiOff,
  BarChart3, GitBranch, Eye, EyeOff, RotateCcw,
  Smartphone, Monitor, ArrowDown, X, Home,
  User, Key
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

// Advanced compatibility parameters
const advancedCompatibilityFactors = {
  communicationStyles: ["Direct", "Diplomatic", "Emotional", "Analytical"],
  loveLanguages: ["Words of Affirmation", "Quality Time", "Gifts", "Acts of Service", "Physical Touch"],
  conflictResolution: ["Confront immediately", "Take time to cool off", "Seek compromise", "Avoid conflict"],
  futureGoals: ["Career-focused", "Family-oriented", "Travel and adventure", "Stability and security"],
  energyLevels: ["Morning Person", "Night Owl", "All Day Energy", "Balanced"],
  socialPreferences: ["Large Groups", "Small Circles", "One-on-One", "Mixed"]
};

// Additional compatibility parameters for enhanced matching
const additionalCompatibilityFactors = {
  personalityTraits: ["Adventurous", "Cautious", "Spontaneous", "Planner", "Creative", "Logical", "Empathetic", "Independent"],
  values: ["Honesty", "Loyalty", "Freedom", "Security", "Growth", "Tradition", "Innovation", "Community"],
  hobbies: ["Sports", "Arts", "Reading", "Gaming", "Travel", "Cooking", "Music", "Technology"],
  petPreferences: ["Dog Person", "Cat Person", "Both", "Neither", "Other Pets"],
  relationshipGoals: ["Long-term", "Casual", "Marriage", "Exploratory", "Friendship"]
};

// Enhanced Input Component with better mobile support
const EnhancedInput = ({ 
  label, 
  icon: Icon, 
  placeholder, 
  value, 
  onChange, 
  onFocus,
  onKeyPress,
  type = "text",
  autoFocus = false,
  className = "",
  ...props 
}) => (
  <div className="space-y-2">
    <Label htmlFor={label.toLowerCase()} className="font-semibold text-sm text-white/90 flex items-center">
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </Label>
    <div className="relative">
      <Input
        id={label.toLowerCase()}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onKeyPress={onKeyPress}
        autoFocus={autoFocus}
        className={`
          w-full h-12 px-4 py-3 bg-white/10 border-2 border-white/20 
          rounded-xl text-white placeholder-white/60
          focus:bg-white/15 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30
          transition-all duration-200 text-base
          backdrop-blur-sm
          ${className}
        `}
        autoComplete="off"
        {...props}
      />
    </div>
  </div>
);

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

  // Advanced states
  const [advancedAnswers, setAdvancedAnswers] = useState({
    communicationStyle: "",
    loveLanguage: "",
    conflictStyle: "",
    futureGoal: "",
    energyLevel: "",
    socialPreference: "",
    personalityTraits: [] as string[],
    values: [] as string[],
    hobbies: [] as string[],
    petPreference: "",
    relationshipGoal: ""
  });

  // UI/UX states
  const [darkMode, setDarkMode] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [gameState, setGameState] = useState<any>(null);

  // Screenshot sharing states
  const [isCapturing, setIsCapturing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Waiting state for final question
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<{[key: string]: boolean}>({});

  // Input focus states
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);
  const submitTimeoutRef = useRef<NodeJS.Timeout>();
  const screenshotRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const optionsContainerRef = useRef<HTMLDivElement>(null);
  const questionContainerRef = useRef<HTMLDivElement>(null);

  // Enhanced mobile detection and viewport setup
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  // Enhanced state persistence
  useEffect(() => {
    const savedState = localStorage.getItem('compatibilityGameState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setPlayerName(state.playerName || '');
        setRoomId(state.roomId || '');
        setDarkMode(state.darkMode !== undefined ? state.darkMode : true);
      } catch (error) {
        console.error('Error loading saved state:', error);
        localStorage.removeItem('compatibilityGameState');
      }
    }
  }, []);

  // Enhanced auto-save
  useEffect(() => {
    try {
      const state = {
        playerName,
        roomId,
        darkMode,
        joined,
        gameStarted,
        currentQuestion,
        answers,
        advancedAnswers,
        gameState
      };
      localStorage.setItem('compatibilityGameState', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }, [playerName, roomId, darkMode, joined, gameStarted, currentQuestion, answers, advancedAnswers, gameState]);

  // Enhanced socket connection management
  useEffect(() => {
    const handleConnect = () => {
      setConnectionStatus("connected");
      console.log("Connected to server");
    };

    const handleDisconnect = () => {
      setConnectionStatus("disconnected");
    };

    const handleReconnect = () => {
      setConnectionStatus("connected");
      if (joined && roomId && playerName) {
        socket.emit("rejoin-room", { 
          roomId, 
          playerName 
        });
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("reconnect", handleReconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("reconnect", handleReconnect);
    };
  }, [joined, roomId, playerName]);

  // Enhanced socket event handlers
  useEffect(() => {
    const handleRoomCreated = (room: any) => {
      if (!room) return;
      setRoomId(room.roomId || '');
      setIsHost(true);
      setJoined(true);
      setPlayers(room.players || []);
      setGameState(room.gameState || null);
      playSound("success");
    };

    const handleRoomJoined = (room: any) => {
      if (!room) return;
      setRoomId(room.roomId || '');
      setPlayers(room.players || []);
      setJoined(true);
      setGameState(room.gameState || null);
      
      if (room.gameState?.gameStarted) {
        setGameStarted(true);
        setCurrentQuestion(room.gameState.currentQuestion || 0);
        setPlayerProgress(room.gameState.playerProgress || {});
      }
      
      playSound("success");
    };

    const handleRejoinSuccess = (data: any) => {
      if (!data) return;
      setRoomId(data.roomId || '');
      setPlayers(data.players || []);
      setJoined(true);
      setGameState(data.gameState || null);
      
      if (data.gameState?.gameStarted) {
        setGameStarted(true);
        setCurrentQuestion(data.gameState.currentQuestion || 0);
        setPlayerProgress(data.gameState.playerProgress || {});
        setAnswers(data.playerAnswers || []);
      }
      
      if (data.gameState?.showResults) {
        setShowResults(true);
        setBothAnswers(data.gameState.results || {});
      }
      
      playSound("success");
    };

    const handleUpdatePlayers = (playersList: any[]) => {
      if (!Array.isArray(playersList)) return;
      setPlayers(playersList);
    };

    const handlePlayerProgress = (data: {player: string, progress: number}) => {
      if (!data || !data.player) return;
      setPlayerProgress(prev => ({
        ...prev,
        [data.player]: data.progress
      }));
    };

    const handleGameStarted = (gameState: any) => {
      setGameStarted(true);
      setCurrentQuestion(0);
      setAnswers([]);
      setCurrentAnswer("");
      setBothAnswers({});
      setAdvancedAnswers({
        communicationStyle: "",
        loveLanguage: "",
        conflictStyle: "",
        futureGoal: "",
        energyLevel: "",
        socialPreference: "",
        personalityTraits: [],
        values: [],
        hobbies: [],
        petPreference: "",
        relationshipGoal: ""
      });
      setGameState(gameState || null);
      playSound("success");
    };

    const handleQuestionChanged = (data: any) => {
      if (!data) return;
      setCurrentQuestion(data.questionIndex || 0);
      setTimeLeft(data.timeLeft || 25);
      setGameState(data.gameState || null);
    };

    const handleShowResults = (data: any) => {
      console.log("Show results data received:", data);
      
      const safeData = data || {};
      const results = safeData.results || safeData || {};
      
      if (typeof results !== 'object' || results === null) {
        console.error("Results is not an object, setting empty object:", results);
        setBothAnswers({});
      } else {
        console.log("Setting bothAnswers to:", results);
        setBothAnswers(results);
      }
      
      setShowResults(true);
      setIsSubmitting(false);
      setWaitingForPartner(false);
      setGameState(safeData.gameState || null);
      playSound("victory");
      triggerConfetti();
    };

    const handleSubmissionStatus = (data: {player: string, submitted: boolean}) => {
      if (!data || !data.player) return;
      setSubmissionStatus(prev => ({
        ...prev,
        [data.player]: data.submitted
      }));
    };

    const handlePlayerReaction = (data: {player: string, reaction: string}) => {
      if (!data || !data.player) return;
      setPlayerReactions(prev => ({
        ...prev,
        [data.player]: data.reaction
      }));
      
      setTimeout(() => {
        setPlayerReactions(prev => {
          const newReactions = {...prev};
          delete newReactions[data.player];
          return newReactions;
        });
      }, 3000);
    };

    const handleGameStateUpdate = (newGameState: any) => {
      setGameState(newGameState || null);
    };

    const handleConnectionError = (error: any) => {
      setConnectionStatus("disconnected");
      console.error("Connection error:", error);
    };

    socket.on("room-created", handleRoomCreated);
    socket.on("room-joined", handleRoomJoined);
    socket.on("rejoin-success", handleRejoinSuccess);
    socket.on("update-players", handleUpdatePlayers);
    socket.on("player-progress", handlePlayerProgress);
    socket.on("game-started", handleGameStarted);
    socket.on("question-changed", handleQuestionChanged);
    socket.on("show-results", handleShowResults);
    socket.on("submission-status", handleSubmissionStatus);
    socket.on("player-reaction", handlePlayerReaction);
    socket.on("game-state-update", handleGameStateUpdate);
    socket.on("connect_error", handleConnectionError);

    return () => {
      socket.off("room-created", handleRoomCreated);
      socket.off("room-joined", handleRoomJoined);
      socket.off("rejoin-success", handleRejoinSuccess);
      socket.off("update-players", handleUpdatePlayers);
      socket.off("player-progress", handlePlayerProgress);
      socket.off("game-started", handleGameStarted);
      socket.off("question-changed", handleQuestionChanged);
      socket.off("show-results", handleShowResults);
      socket.off("submission-status", handleSubmissionStatus);
      socket.off("player-reaction", handlePlayerReaction);
      socket.off("game-state-update", handleGameStateUpdate);
      socket.off("connect_error", handleConnectionError);
    };
  }, []);

  // Enhanced timer with proper cleanup
  useEffect(() => {
    if (timeLeft === null || !gameStarted || showResults) return;
    
    if (timeLeft <= 0) {
      handleAutoSubmit();
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

  const handleAutoSubmit = () => {
    if (currentAnswer) {
      submitAnswer();
    } else {
      const randomOption = questions[currentQuestion].options[
        Math.floor(Math.random() * questions[currentQuestion].options.length)
      ];
      setCurrentAnswer(randomOption);
      
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
      
      submitTimeoutRef.current = setTimeout(() => {
        submitAnswer();
      }, 800);
    }
  };

  // Enhanced mobile screenshot capture
  const captureScreenshot = async () => {
    if (!screenshotRef.current) return;
    
    setIsCapturing(true);
    setShareSuccess(false);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(screenshotRef.current, {
        backgroundColor: darkMode ? '#0f172a' : '#ffffff',
        scale: isMobile ? 1 : 1.2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight
      });
      
      const imageDataUrl = canvas.toDataURL('image/png', 0.9);
      setCapturedImage(imageDataUrl);
      
      try {
        if (navigator.clipboard && navigator.clipboard.write) {
          const blob = await (await fetch(imageDataUrl)).blob();
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 2000);
        } else {
          downloadImage(imageDataUrl);
        }
      } catch (clipboardError) {
        downloadImage(imageDataUrl);
      }
      
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

  // Enhanced room creation with validation
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

  // Enhanced room joining with validation
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

  // Enhanced answer submission with waiting state
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
        answers: newAnswers,
        advancedAnswers
      });
      
      setWaitingForPartner(true);
      socket.emit("submission-status", { roomId, player: playerName, submitted: true });
    }
  };

  const sendReaction = (reaction: string) => {
    socket.emit("player-reaction", { roomId, reaction });
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

  // Enhanced mobile option selection
  const handleOptionSelect = (option: string) => {
    setCurrentAnswer(option);
    playSound("select");
  };

  // Enhanced compatibility calculation with additional factors
  const calculateCompatibility = () => {
    console.log("Calculating compatibility with bothAnswers:", bothAnswers);
    
    if (!bothAnswers || typeof bothAnswers !== 'object' || bothAnswers === null) {
      console.error("bothAnswers is invalid, returning default:", bothAnswers);
      return { 
        score: 0, 
        breakdown: {}, 
        insights: ["No results available yet"], 
        advancedAnalysis: {}, 
        advancedFactors: {},
        additionalFactors: {}
      };
    }

    const allPlayers = Object.keys(bothAnswers);
    console.log("Players found:", allPlayers);
    
    if (allPlayers.length < 2) {
      return { 
        score: 0, 
        breakdown: {}, 
        insights: ["Waiting for both players to complete the test"], 
        advancedAnalysis: {}, 
        advancedFactors: {},
        additionalFactors: {}
      };
    }

    const [p1, p2] = allPlayers;
    const ans1 = bothAnswers[p1] || [];
    const ans2 = bothAnswers[p2] || [];
    
    let totalScore = 0;
    let maxPossibleScore = 0;
    const categoryScores: {[key: string]: number} = {};
    const insights: string[] = [];
    const advancedAnalysis: any = {};

    questions.forEach((question, i) => {
      const weight = question.weight || 1;
      maxPossibleScore += weight;
      
      const answer1 = Array.isArray(ans1) ? ans1[i]?.answer : null;
      const answer2 = Array.isArray(ans2) ? ans2[i]?.answer : null;
      
      if (answer1 && answer2 && answer1 === answer2) {
        totalScore += weight;
        const category = question.category || 'General';
        categoryScores[category] = (categoryScores[category] || 0) + weight;
      }
    });

    let advancedScore = 0;
    let maxAdvancedScore = 0;
    const advancedMatches: string[] = [];

    const adv1 = (typeof ans1 === 'object' && !Array.isArray(ans1) ? ans1.advancedAnswers : {}) || {};
    const adv2 = (typeof ans2 === 'object' && !Array.isArray(ans2) ? ans2.advancedAnswers : {}) || {};

    Object.keys(advancedCompatibilityFactors).forEach(factor => {
      if (adv1[factor] && adv2[factor]) {
        maxAdvancedScore += 1;
        if (adv1[factor] === adv2[factor]) {
          advancedScore += 1;
          advancedMatches.push(factor);
        }
      }
    });

    let additionalScore = 0;
    let maxAdditionalScore = 0;
    const additionalMatches: string[] = [];

    const traits1 = adv1.personalityTraits || [];
    const traits2 = adv2.personalityTraits || [];
    const commonTraits = traits1.filter((trait: string) => traits2.includes(trait));
    additionalScore += (commonTraits.length / Math.max(traits1.length, traits2.length)) * 2;
    maxAdditionalScore += 2;

    const values1 = adv1.values || [];
    const values2 = adv2.values || [];
    const commonValues = values1.filter((value: string) => values2.includes(value));
    additionalScore += (commonValues.length / Math.max(values1.length, values2.length)) * 3;
    maxAdditionalScore += 3;

    const hobbies1 = adv1.hobbies || [];
    const hobbies2 = adv2.hobbies || [];
    const commonHobbies = hobbies1.filter((hobby: string) => hobbies2.includes(hobby));
    additionalScore += (commonHobbies.length / Math.max(hobbies1.length, hobbies2.length)) * 2;
    maxAdditionalScore += 2;

    if (adv1.petPreference && adv2.petPreference) {
      maxAdditionalScore += 1;
      if (adv1.petPreference === adv2.petPreference) {
        additionalScore += 1;
        additionalMatches.push("Pet Preference");
      }
    }

    if (adv1.relationshipGoal && adv2.relationshipGoal) {
      maxAdditionalScore += 2;
      if (adv1.relationshipGoal === adv2.relationshipGoal) {
        additionalScore += 2;
        additionalMatches.push("Relationship Goals");
      }
    }

    const questionScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 50 : 0;
    const advancedFactorScore = maxAdvancedScore > 0 ? (advancedScore / maxAdvancedScore) * 30 : 0;
    const additionalFactorScore = maxAdditionalScore > 0 ? (additionalScore / maxAdditionalScore) * 20 : 0;
    const finalScore = Math.round(questionScore + advancedFactorScore + additionalFactorScore);

    if (finalScore >= 95) {
      insights.push("💖 Cosmic Soulmates! Perfect alignment in all areas");
      insights.push("✨ Exceptional harmony in values, personality, and lifestyle");
    } else if (finalScore >= 85) {
      insights.push("🌟 Extraordinary Match! Deep connection and strong compatibility");
      insights.push("⭐ Excellent alignment in core values and life vision");
    } else if (finalScore >= 75) {
      insights.push("💫 Great Chemistry! Strong foundation with beautiful potential");
      insights.push("🎯 Good balance of shared interests and complementary differences");
    } else if (finalScore >= 65) {
      insights.push("🌈 Strong Potential! Unique connection with room for growth");
      insights.push("💡 Your differences create opportunities for mutual learning");
    } else if (finalScore >= 50) {
      insights.push("🎭 Interesting Dynamic! You challenge and inspire each other");
      insights.push("🌱 Unique combination with potential for beautiful development");
    } else {
      insights.push("🌀 Unconventional Match! Fresh perspectives and exciting chemistry");
      insights.push("⚡ Your differences create unpredictable but interesting dynamics");
    }

    if (commonTraits.length > 2) {
      insights.push(`🧠 Strong personality alignment with ${commonTraits.length} shared traits`);
    }
    if (commonValues.length > 1) {
      insights.push(`💝 Shared core values: ${commonValues.slice(0, 3).join(', ')}`);
    }
    if (commonHobbies.length > 0) {
      insights.push(`🎯 ${commonHobbies.length} shared interests for quality time`);
    }

    advancedAnalysis.matches = advancedMatches;
    advancedAnalysis.commonTraits = commonTraits;
    advancedAnalysis.commonValues = commonValues;
    advancedAnalysis.commonHobbies = commonHobbies;
    advancedAnalysis.communicationMatch = adv1.communicationStyle === adv2.communicationStyle;
    advancedAnalysis.loveLanguageMatch = adv1.loveLanguage === adv2.loveLanguage;
    advancedAnalysis.energyCompatibility = adv1.energyLevel === adv2.energyLevel;
    advancedAnalysis.socialCompatibility = adv1.socialPreference === adv2.socialPreference;

    const additionalFactors = {
      personalityAlignment: `${commonTraits.length} shared traits`,
      valueAlignment: `${commonValues.length} shared values`,
      hobbyAlignment: `${commonHobbies.length} shared hobbies`,
      petCompatibility: adv1.petPreference === adv2.petPreference ? "Perfect match" : "Different preferences",
      goalAlignment: adv1.relationshipGoal === adv2.relationshipGoal ? "Aligned goals" : "Different goals"
    };

    const result = {
      score: finalScore,
      breakdown: categoryScores,
      insights,
      advancedAnalysis,
      advancedFactors: {
        communication: adv1.communicationStyle === adv2.communicationStyle ? "Perfect match" : "Different styles",
        loveLanguages: adv1.loveLanguage === adv2.loveLanguage ? "Same love language" : "Different love languages",
        energy: adv1.energyLevel === adv2.energyLevel ? "Synced energy" : "Different rhythms",
        social: adv1.socialPreference === adv2.socialPreference ? "Social harmony" : "Different preferences"
      },
      additionalFactors
    };

    console.log("Final compatibility result:", result);
    return result;
  };

  const getCompatibilityMessage = (score: number) => {
    if (score >= 95) return "Cosmic Soulmates! 💫";
    if (score >= 85) return "Perfect Match! 🌟";
    if (score >= 75) return "Excellent Chemistry! ⭐";
    if (score >= 65) return "Great Potential! 💫";
    if (score >= 50) return "Interesting Connection! ✨";
    return "Unique Chemistry! 🎭";
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "from-green-400 to-emerald-500";
    if (score >= 70) return "from-blue-400 to-cyan-500";
    if (score >= 55) return "from-yellow-400 to-orange-500";
    return "from-purple-400 to-pink-500";
  };

  // Exit game function
  const exitGame = () => {
    if (window.confirm("Are you sure you want to exit the game?")) {
      localStorage.removeItem('compatibilityGameState');
      window.location.reload();
    }
  };

  // Back to home function
  const backToHome = () => {
    if (window.confirm("Return to home screen? Your current progress will be saved.")) {
      setJoined(false);
      setGameStarted(false);
      setShowResults(false);
      setWaitingForPartner(false);
    }
  };

  // Enhanced Player Card Component
  const PlayerCard = ({ player, index }: { player: any, index: number }) => (
    <div className={`flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all ${
      darkMode ? 'bg-slate-800/50 hover:bg-slate-700/50 border-slate-600' : 'bg-white/80 hover:bg-white border-gray-200'
    }`}>
      <div className="flex items-center space-x-2 md:space-x-3">
        <Avatar className={`w-8 h-8 md:w-12 md:h-12 border-2 ${index === 0 ? 'border-yellow-400' : 'border-blue-400'}`}>
          <AvatarFallback className={`text-xs md:text-base ${index === 0 ? 'bg-gradient-to-br from-yellow-500 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'} text-white font-bold`}>
            {player.name?.charAt(0)?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center space-x-1 md:space-x-2">
          <span className="font-bold text-sm md:text-lg">{player.name || "Unknown"}</span>
          {index === 0 && <Crown className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 animate-pulse" />}
        </div>
      </div>
      
      <div className="flex items-center space-x-2 md:space-x-3">
        {playerProgress[player.name] !== undefined && (
          <div className="text-right">
            <div className="text-xs md:text-sm font-bold">{playerProgress[player.name]}%</div>
            <Progress value={playerProgress[player.name]} className={`w-16 md:w-24 h-1.5 md:h-2 ${darkMode ? 'bg-slate-600' : 'bg-gray-200'}`} />
          </div>
        )}
        
        {playerReactions[player.name] && (
          <div className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-base md:text-lg animate-bounce ${
            darkMode ? 'bg-slate-600' : 'bg-gray-100'
          }`}>
            {playerReactions[player.name]}
          </div>
        )}

        {waitingForPartner && submissionStatus[player.name] && (
          <Badge className="bg-green-500 text-white">
            <Check className="w-3 h-3 mr-1" />
            Submitted
          </Badge>
        )}
      </div>
    </div>
  );

  // Connection Status Indicator
  const ConnectionStatus = () => (
    <div className={`fixed top-2 md:top-4 right-2 md:right-4 px-2 py-1 md:px-3 md:py-2 rounded-full text-xs md:text-sm font-semibold z-50 backdrop-blur-sm border ${
      connectionStatus === "connected" 
        ? `${darkMode ? 'bg-green-500/20 border-green-400/50' : 'bg-green-100 border-green-200'} text-green-700` 
        : `${darkMode ? 'bg-red-500/20 border-red-400/50' : 'bg-red-100 border-red-200'} text-red-700 animate-pulse`
    }`}>
      {connectionStatus === "connected" ? 
        <><Wifi className="w-3 h-3 md:w-4 md:h-4 inline mr-1 md:mr-2" />Connected</> : 
        <><WifiOff className="w-3 h-3 md:w-4 md:h-4 inline mr-1 md:mr-2" />Disconnected</>
      }
    </div>
  );

  // Settings Panel Component
  const SettingsPanel = () => (
    <Card className={`p-4 md:p-6 absolute top-12 md:top-16 right-2 md:right-4 w-72 md:w-80 backdrop-blur-sm border ${
      darkMode ? 'bg-slate-800/90 border-slate-600' : 'bg-white/90 border-gray-200'
    } shadow-2xl z-40 transition-all duration-300`}>
      <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center">
        <Settings className="w-4 h-4 md:w-5 md:h-5 mr-2" />
        Game Settings
      </h3>
      
      <div className="space-y-3 md:space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="dark-mode" className="flex items-center text-sm md:text-base">
            <Moon className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            Dark Mode
          </Label>
          <Switch
            id="dark-mode"
            checked={darkMode}
            onCheckedChange={setDarkMode}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="animations" className="flex items-center text-sm md:text-base">
            <Sparkles className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            Animations
          </Label>
          <Switch
            id="animations"
            checked={animationsEnabled}
            onCheckedChange={setAnimationsEnabled}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="sound" className="flex items-center text-sm md:text-base">
            <Volume2 className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            Sound Effects
          </Label>
          <Switch
            id="sound"
            checked={soundEnabled}
            onCheckedChange={setSoundEnabled}
          />
        </div>
        
        <div className="pt-3 md:pt-4 border-t">
          <Button
            onClick={() => setShowAdvancedSettings(false)}
            className="w-full text-sm md:text-base"
            variant="outline"
          >
            Close Settings
          </Button>
        </div>
      </div>
    </Card>
  );

  // Advanced Questions Component for additional compatibility factors
  const AdvancedQuestions = () => {
    const [selectedTraits, setSelectedTraits] = useState<string[]>(advancedAnswers.personalityTraits);
    const [selectedValues, setSelectedValues] = useState<string[]>(advancedAnswers.values);
    const [selectedHobbies, setSelectedHobbies] = useState<string[]>(advancedAnswers.hobbies);

    const toggleTrait = (trait: string) => {
      setSelectedTraits(prev => 
        prev.includes(trait) 
          ? prev.filter(t => t !== trait)
          : [...prev, trait]
      );
    };

    const toggleValue = (value: string) => {
      setSelectedValues(prev => 
        prev.includes(value) 
          ? prev.filter(v => v !== value)
          : [...prev, value]
      );
    };

    const toggleHobby = (hobby: string) => {
      setSelectedHobbies(prev => 
        prev.includes(hobby) 
          ? prev.filter(h => h !== hobby)
          : [...prev, hobby]
      );
    };

    useEffect(() => {
      setAdvancedAnswers(prev => ({
        ...prev,
        personalityTraits: selectedTraits,
        values: selectedValues,
        hobbies: selectedHobbies
      }));
    }, [selectedTraits, selectedValues, selectedHobbies]);

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-semibold mb-3 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-500" />
            Which traits describe you best? (Select 3-5)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {additionalCompatibilityFactors.personalityTraits.map(trait => (
              <div
                key={trait}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedTraits.includes(trait)
                    ? 'bg-purple-500/20 border-purple-400'
                    : darkMode 
                      ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => toggleTrait(trait)}
              >
                <div className="text-center text-sm font-medium">{trait}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-3 flex items-center">
            <Heart className="w-5 h-5 mr-2 text-red-500" />
            What are your core values? (Select 2-4)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {additionalCompatibilityFactors.values.map(value => (
              <div
                key={value}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedValues.includes(value)
                    ? 'bg-red-500/20 border-red-400'
                    : darkMode 
                      ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => toggleValue(value)}
              >
                <div className="text-center text-sm font-medium">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-3 flex items-center">
            <Gamepad2 className="w-5 h-5 mr-2 text-blue-500" />
            What are your favorite hobbies? (Select 3-5)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {additionalCompatibilityFactors.hobbies.map(hobby => (
              <div
                key={hobby}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedHobbies.includes(hobby)
                    ? 'bg-blue-500/20 border-blue-400'
                    : darkMode 
                      ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => toggleHobby(hobby)}
              >
                <div className="text-center text-sm font-medium">{hobby}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-3 flex items-center">
            <Heart className="w-5 h-5 mr-2 text-green-500" />
            What's your pet preference?
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {additionalCompatibilityFactors.petPreferences.map(pref => (
              <div
                key={pref}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  advancedAnswers.petPreference === pref
                    ? 'bg-green-500/20 border-green-400'
                    : darkMode 
                      ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setAdvancedAnswers(prev => ({ ...prev, petPreference: pref }))}
              >
                <div className="text-center text-sm font-medium">{pref}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-3 flex items-center">
            <Target className="w-5 h-5 mr-2 text-orange-500" />
            What are your relationship goals?
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {additionalCompatibilityFactors.relationshipGoals.map(goal => (
              <div
                key={goal}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  advancedAnswers.relationshipGoal === goal
                    ? 'bg-orange-500/20 border-orange-400'
                    : darkMode 
                      ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setAdvancedAnswers(prev => ({ ...prev, relationshipGoal: goal }))}
              >
                <div className="text-center text-sm font-medium">{goal}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Enhanced ResultsScreen with comprehensive error handling
  const ResultsScreen = () => {
    const compatibility = calculateCompatibility();
    const { score, breakdown, insights, advancedAnalysis, advancedFactors, additionalFactors } = compatibility;

    const hasValidResults = bothAnswers && 
                           typeof bothAnswers === 'object' && 
                           bothAnswers !== null && 
                           Object.keys(bothAnswers).length >= 2;

    if (!hasValidResults) {
      return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${
          darkMode ? 'bg-slate-900' : 'bg-gray-100'
        }`}>
          <Card className={`p-8 max-w-2xl w-full text-center ${
            darkMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            <div className="flex justify-center mb-6">
              <Loader2 className="w-16 h-16 animate-spin text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Processing Results...</h2>
            <p className={`mb-6 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
              Please wait while we calculate your compatibility results.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              Return to Home
            </Button>
          </Card>
        </div>
      );
    }

    return (
      <div 
        ref={mainContainerRef}
        className={`min-h-screen flex flex-col items-center justify-center p-3 md:p-6 transition-colors duration-300 overflow-x-hidden ${
          darkMode 
            ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800' 
            : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
        }`}
      >
        <ConnectionStatus />
        
        <div className="absolute top-2 md:top-4 left-2 md:left-4 flex space-x-2">
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "default"}
            onClick={backToHome}
            className={`rounded-full ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-100'}`}
          >
            <Home className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "default"}
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className={`rounded-full ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-100'}`}
          >
            <Settings className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>

        <div ref={screenshotRef} data-screenshot="true" className="w-full max-w-6xl">
          <Card className={`p-4 md:p-8 backdrop-blur-sm border transition-all duration-300 ${
            darkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-white/80 border-gray-200'
          }`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
              <div>
                <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Compatibility Results
                </h2>
                <p className={`mt-1 md:mt-2 text-sm md:text-base ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                  {Object.keys(bothAnswers).join(" 💞 ")}
                </p>
              </div>
              
              <Button
                onClick={captureScreenshot}
                disabled={isCapturing}
                size={isMobile ? "sm" : "default"}
                className={`${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                {isCapturing ? (
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                )}
              </Button>
            </div>

            <div className="text-center mb-6 md:mb-8">
              <div className={`text-5xl md:text-7xl font-black mb-3 md:mb-4 bg-gradient-to-r ${getScoreColor(score)} bg-clip-text text-transparent`}>
                {score}%
              </div>
              <h3 className="text-xl md:text-3xl font-bold mb-1 md:mb-2">{getCompatibilityMessage(score)}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
              {Object.entries(advancedFactors).map(([key, value]) => (
                <div key={key} className={`p-3 md:p-4 rounded-xl border text-center ${
                  darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white/50 border-gray-200'
                }`}>
                  <div className="text-xs md:text-sm font-medium capitalize mb-1">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className={`text-base md:text-lg font-semibold ${
                    typeof value === 'string' && value.includes('match') 
                      ? 'text-green-500' 
                      : typeof value === 'string' && value.includes('Different')
                      ? 'text-orange-500'
                      : darkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
              {Object.entries(additionalFactors).map(([key, value]) => (
                <div key={key} className={`p-3 md:p-4 rounded-xl border text-center ${
                  darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white/50 border-gray-200'
                }`}>
                  <div className="text-xs md:text-sm font-medium capitalize mb-1">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className={`text-base md:text-lg font-semibold ${
                    typeof value === 'string' && (value.includes('shared') || value.includes('Aligned') || value.includes('match'))
                      ? 'text-green-500' 
                      : typeof value === 'string' && value.includes('Different')
                      ? 'text-orange-500'
                      : darkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
              {Object.entries(breakdown).map(([category, catScore]) => (
                <div key={category} className={`p-3 md:p-4 rounded-xl border ${
                  darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white/50 border-gray-200'
                }`}>
                  <div className="text-xs md:text-sm mb-1 md:mb-2">{category}</div>
                  <div className="text-xl md:text-2xl font-bold mb-1 md:mb-2">
                    {Math.round((catScore as number / questions.filter(q => q.category === category).length) * 100)}%
                  </div>
                  <Progress 
                    value={(catScore as number / questions.filter(q => q.category === category).length) * 100} 
                    className={`h-1.5 md:h-2 ${darkMode ? 'bg-slate-600' : 'bg-gray-200'}`}
                  />
                </div>
              ))}
            </div>

            <div className={`p-4 md:p-6 rounded-xl border mb-6 md:mb-8 ${
              darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white/50 border-gray-200'
            }`}>
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 flex items-center justify-center">
                <Brain className="w-4 h-4 md:w-5 md:h-5 mr-2 text-purple-500" />
                Relationship Insights
              </h3>
              <div className="space-y-2 md:space-y-3">
                {insights.map((insight, index) => (
                  <div key={index} className={`flex items-start space-x-2 md:space-x-3 p-2 md:p-3 rounded-lg ${
                    darkMode ? 'bg-slate-600/50' : 'bg-white'
                  }`}>
                    <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm md:text-base">{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 md:gap-4 flex-col sm:flex-row">
              <Button 
                onClick={() => window.location.reload()} 
                size={isMobile ? "sm" : "lg"}
                className="flex-1 py-4 md:py-6 text-base md:text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              >
                <RotateCcw className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Play Again
              </Button>
              <Button 
                onClick={captureScreenshot}
                disabled={isCapturing}
                size={isMobile ? "sm" : "lg"}
                className="flex-1 py-4 md:py-6 text-base md:text-lg bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white"
              >
                {isCapturing ? (
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                )}
                {isCapturing ? 'Capturing...' : 'Share Results'}
              </Button>
              <Button 
                onClick={exitGame}
                size={isMobile ? "sm" : "lg"}
                variant="outline"
                className="flex-1 py-4 md:py-6 text-base md:text-lg"
              >
                <X className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Exit Game
              </Button>
            </div>
          </Card>
        </div>

        {showAdvancedSettings && <SettingsPanel />}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 md:p-4">
            <Card className="max-w-2xl w-full bg-white/95 backdrop-blur-sm shadow-2xl rounded-xl md:rounded-2xl border-0 max-h-[90vh] overflow-y-auto">
              <div className="p-4 md:p-6">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
                    <Share2 className="w-5 h-5 md:w-6 md:h-6 mr-2 text-blue-600" />
                    Share Your Results
                  </h3>
                  <Button
                    variant="ghost"
                    size={isMobile ? "sm" : "default"}
                    onClick={() => setShowShareModal(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="space-y-3 md:space-y-4">
                  {capturedImage && (
                    <div className="text-center">
                      <img
                        src={capturedImage}
                        alt="Compatibility Results"
                        className="w-full h-auto max-h-48 md:max-h-96 object-contain border rounded-lg"
                      />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                    <Button
                      onClick={() => capturedImage && downloadImage(capturedImage)}
                      size={isMobile ? "sm" : "default"}
                      className="py-3 md:py-4"
                    >
                      <Download className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      Download
                    </Button>
                    
                    <Button
                      onClick={() => capturedImage && navigator.clipboard?.writeText(`Check out our compatibility score: ${score}%! 🎉`)}
                      size={isMobile ? "sm" : "default"}
                      className="py-3 md:py-4"
                    >
                      <Copy className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      Copy Text
                    </Button>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      onClick={() => setShowShareModal(false)}
                      className="w-full"
                      variant="outline"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };

  // Waiting for Partner Screen for final question
  const WaitingForPartnerScreen = () => (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${
      darkMode ? 'bg-slate-900' : 'bg-gray-100'
    }`}>
      <Card className={`p-8 max-w-2xl w-full text-center ${
        darkMode ? 'bg-slate-800' : 'bg-white'
      }`}>
        <div className="flex justify-center mb-6">
          <Loader2 className="w-16 h-16 animate-spin text-purple-500" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Waiting for Partner...</h2>
        <p className={`mb-6 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
          You've completed all questions! Waiting for your partner to finish.
        </p>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Submission Status:</h3>
          <div className="space-y-2">
            {players.map((player, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50">
                <span className="font-medium">{player.name}</span>
                {submissionStatus[player.name] ? (
                  <Badge className="bg-green-500">
                    <Check className="w-3 h-3 mr-1" />
                    Submitted
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Waiting...
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        <Button 
          onClick={backToHome}
          variant="outline"
          className="mr-2"
        >
          <Home className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </Card>
    </div>
  );

  // Waiting Screen Component
  const WaitingScreen = () => (
    <div 
      ref={mainContainerRef}
      className={`min-h-screen flex flex-col items-center justify-center p-3 md:p-6 transition-colors duration-300 overflow-x-hidden ${
        darkMode 
          ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800' 
          : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
      }`}
    >
      <ConnectionStatus />
      
      <div className="absolute top-2 md:top-4 left-2 md:left-4 flex space-x-2">
        <Button
          variant="ghost"
          size={isMobile ? "sm" : "default"}
          onClick={backToHome}
          className={`rounded-full ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-100'}`}
        >
          <Home className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
        <Button
          variant="ghost"
          size={isMobile ? "sm" : "default"}
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          className={`rounded-full ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-100'}`}
        >
          <Settings className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
      </div>

      <div ref={screenshotRef} data-screenshot="true" className="w-full max-w-2xl">
        <Card className={`p-4 md:p-8 backdrop-blur-sm border transition-all duration-300 ${
          darkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-white/80 border-gray-200'
        }`}>
          <div className="text-center mb-6 md:mb-8">
            <div className="flex justify-center mb-4 md:mb-6">
              <div className="relative">
                <Heart className="w-16 h-16 md:w-20 md:h-20 text-pink-500 animate-pulse" />
                <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-yellow-500 absolute -top-1 -right-1 md:-top-2 md:-right-2 animate-spin" />
              </div>
            </div>
            
            <h2 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              Advanced Compatibility
            </h2>
            <p className={`text-base md:text-lg ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
              Room Code: <span className="font-mono font-bold text-xl md:text-2xl">{roomId}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:gap-4 mb-6 md:mb-8">
            {players.map((player, index) => (
              <PlayerCard key={player.name || index} player={player} index={index} />
            ))}
          </div>

          {players.length === 1 && (
            <div className={`p-3 md:p-4 rounded-xl border mb-4 md:mb-6 text-center ${
              darkMode ? 'bg-yellow-500/20 border-yellow-400/30' : 'bg-yellow-100 border-yellow-200'
            }`}>
              <div className="flex items-center justify-center space-x-1 md:space-x-2">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" />
                <span className={`text-sm md:text-base ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                  Waiting for partner to join...
                </span>
              </div>
            </div>
          )}

          {isHost ? (
            <Button 
              onClick={startGame} 
              disabled={players.length < 2}
              size={isMobile ? "sm" : "lg"}
              className="w-full py-4 md:py-6 text-base md:text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-2xl disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Start Compatibility Test {players.length < 2 && `(Need ${2 - players.length} more)`}
            </Button>
          ) : (
            <div className={`p-3 md:p-4 rounded-xl border text-center ${
              darkMode ? 'bg-blue-500/20 border-blue-400/30' : 'bg-blue-100 border-blue-200'
            }`}>
              <div className="flex items-center justify-center space-x-1 md:space-x-2">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-blue-500 animate-pulse" />
                <span className={`text-sm md:text-base ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  Waiting for host to start the test...
                </span>
              </div>
            </div>
          )}

          <div className="mt-4 md:mt-6 text-center">
            <Button
              onClick={() => navigator.clipboard?.writeText(roomId)}
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className={darkMode ? 'border-slate-600 hover:bg-slate-700' : ''}
            >
              <LinkIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Copy Room Code
            </Button>
          </div>
        </Card>
      </div>

      {showAdvancedSettings && <SettingsPanel />}
    </div>
  );

  // Enhanced Game Screen with mobile scroll handling and advanced questions
  const GameScreen = () => {
    const currentQ = questions[currentQuestion];
    
    const handleSubmit = () => {
      if (!currentAnswer) {
        alert("Please select an answer before submitting");
        return;
      }
      submitAnswer();
    };

    const isFinalQuestion = currentQuestion === questions.length - 1;

    return (
      <div 
        ref={mainContainerRef}
        className={`min-h-screen flex flex-col items-center justify-center p-3 md:p-6 transition-colors duration-300 overflow-x-hidden ${
          darkMode 
            ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800' 
            : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
        }`}
      >
        <ConnectionStatus />
        
        <div className="absolute top-2 md:top-4 left-2 md:left-4 flex space-x-2">
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "default"}
            onClick={backToHome}
            className={`rounded-full ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-100'}`}
          >
            <Home className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "default"}
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className={`rounded-full ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-100'}`}
          >
            <Settings className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>

        <div ref={screenshotRef} data-screenshot="true" className="w-full max-w-4xl">
          <div className="mb-4 md:mb-6">
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center p-4 md:p-6 rounded-xl border backdrop-blur-sm gap-3 md:gap-0 ${
              darkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-white/80 border-gray-200'
            }`}>
              <div>
                <h2 className="text-lg md:text-xl font-bold">Room: {roomId}</h2>
                <div className={`flex items-center space-x-1 md:space-x-2 text-sm md:text-base ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                  <Users className="w-3 h-3 md:w-4 md:h-4" />
                  <span>{players.map(p => p.name).join(" & ")}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 md:space-x-6 w-full md:w-auto justify-between md:justify-normal">
                <div className="text-right md:text-left">
                  <div className={`text-xs md:text-base ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>Progress</div>
                  <div className="text-base md:text-lg font-bold">
                    {currentQuestion + 1} / {questions.length}
                  </div>
                </div>
                
                {timeLeft !== null && (
                  <div className="text-right md:text-left">
                    <div className={`text-xs md:text-base ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>Time Left</div>
                    <div className={`text-base md:text-lg font-bold flex items-center ${
                      timeLeft <= 10 ? 'text-red-500 animate-pulse' : ''
                    }`}>
                      <Timer className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      {timeLeft}s
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:gap-4 mb-4 md:mb-6">
            {players.map((player) => (
              <div key={player.name} className={`p-3 md:p-4 rounded-xl border backdrop-blur-sm ${
                darkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-white/80 border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-1 md:mb-2">
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <Avatar className="w-8 h-8 md:w-10 md:h-10">
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white text-xs md:text-base">
                        {player.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-sm md:text-base">{player.name}</span>
                  </div>
                  <div className="text-base md:text-lg font-bold">
                    {playerProgress[player.name] || 0}%
                  </div>
                </div>
                <Progress 
                  value={playerProgress[player.name] || 0} 
                  className={`h-1.5 md:h-2 ${darkMode ? 'bg-slate-600' : 'bg-gray-200'}`}
                />
              </div>
            ))}
          </div>

          <Card 
            ref={questionContainerRef}
            className={`p-4 md:p-8 backdrop-blur-sm border transition-all duration-300 mb-4 md:mb-6 ${
              darkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-white/80 border-gray-200'
            }`}
          >
            <div className="text-center mb-6 md:mb-8">
              <Badge className={`mb-2 md:mb-3 text-xs md:text-sm ${darkMode ? 'bg-purple-500/20 text-purple-300 border-purple-400/30' : 'bg-purple-100 text-purple-700 border-purple-200'}`}>
                {currentQ.category} • Weight: {currentQ.weight}x
              </Badge>
              <h3 className="text-xl md:text-3xl font-bold mb-3 md:mb-4">
                {currentQ.question}
              </h3>
              <p className={`text-sm md:text-base ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>

            <div 
              ref={optionsContainerRef}
              className="space-y-3 md:space-y-4 mb-6 md:mb-8"
            >
              {currentQ.options.map((option, index) => (
                <div 
                  key={index} 
                  className={`flex items-center space-x-3 md:space-x-4 p-3 md:p-4 rounded-xl border transition-all cursor-pointer ${
                    currentAnswer === option 
                      ? 'bg-purple-500/20 border-purple-400/50 scale-105 shadow-lg' 
                      : `${darkMode ? 'bg-slate-700/50 hover:bg-slate-600/50 border-slate-600' : 'bg-white hover:bg-gray-50 border-gray-200'} hover:scale-102`
                  }`}
                  onClick={() => handleOptionSelect(option)}
                >
                  <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center ${
                    currentAnswer === option 
                      ? 'border-purple-400 bg-purple-400' 
                      : 'border-gray-400'
                  }`}>
                    {currentAnswer === option && (
                      <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-white"></div>
                    )}
                  </div>
                  <Label className="flex-1 cursor-pointer font-semibold text-base md:text-lg">
                    {option}
                  </Label>
                </div>
              ))}
            </div>

            {isFinalQuestion && (
              <div className={`p-4 md:p-6 rounded-xl border mb-6 md:mb-8 ${
                darkMode ? 'bg-blue-500/10 border-blue-400/30' : 'bg-blue-50 border-blue-200'
              }`}>
                <h3 className="text-lg md:text-xl font-bold mb-4 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-blue-500" />
                  Additional Compatibility Factors
                </h3>
                <p className={`mb-4 text-sm md:text-base ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                  These additional questions will help us calculate a more accurate compatibility score.
                </p>
                <AdvancedQuestions />
              </div>
            )}

            {currentAnswer && currentQ.insights && (
              <div className={`p-3 md:p-4 rounded-xl border mb-4 md:mb-6 ${
                darkMode ? 'bg-blue-500/20 border-blue-400/30' : 'bg-blue-100 border-blue-200'
              }`}>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                  <span className="font-medium text-sm md:text-base">
                    This suggests: {currentQ.insights[currentAnswer]}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size={isMobile ? "sm" : "default"}
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={darkMode ? 'border-slate-600 hover:bg-slate-700' : ''}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={!currentAnswer || isSubmitting}
                size={isMobile ? "sm" : "default"}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 md:px-8 py-2 md:py-3 text-base md:text-lg disabled:opacity-50 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : isFinalQuestion ? (
                  <>
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                    Finish Test
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                    Next Question
                  </>
                )}
              </Button>
            </div>
          </Card>

          <div className="flex justify-center space-x-1 md:space-x-2">
            {['❤️', '😂', '😮', '👏', '🎉'].map(reaction => (
              <Button
                key={reaction}
                variant="outline"
                size={isMobile ? "sm" : "default"}
                onClick={() => sendReaction(reaction)}
                className={`text-base md:text-lg h-10 w-10 md:h-12 md:w-12 ${
                  darkMode ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                {reaction}
              </Button>
            ))}
          </div>
        </div>

        {showAdvancedSettings && <SettingsPanel />}
      </div>
    );
  };

  // Completely redesigned Join/Create Screen with enhanced inputs
  const JoinCreateScreen = () => {
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPlayerName(e.target.value);
    };

    const handleRoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setRoomId(e.target.value.toUpperCase());
    };

    const handleNameFocus = () => {
      setFocusedInput('name');
    };

    const handleRoomFocus = () => {
      setFocusedInput('room');
    };

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
        className={`min-h-screen flex flex-col items-center justify-center p-4 md:p-6 transition-colors duration-300 overflow-x-hidden ${
          darkMode 
            ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900' 
            : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
        }`}
        style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}
      >
        <ConnectionStatus />
        
        <div className="absolute top-4 left-4">
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "default"}
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className={`rounded-full ${darkMode ? 'bg-slate-800/50 hover:bg-slate-700/50 text-white' : 'bg-white/80 hover:bg-white text-gray-700'} backdrop-blur-sm border-0`}
          >
            <Settings className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>

        <div className="w-full max-w-md mx-auto px-4">
          <Card className={`p-6 md:p-8 backdrop-blur-sm border-0 shadow-2xl transition-all duration-300 ${
            darkMode ? 'bg-slate-800/40' : 'bg-white/80'
          }`}>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Heart className="w-10 h-10 md:w-12 md:h-12 text-white animate-pulse" />
                  </div>
                  <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 absolute -top-2 -right-2 animate-spin" />
                </div>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Compatibility Test
              </h1>
              <p className={`text-sm md:text-base ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                Discover your deep connection with someone special
              </p>
            </div>

            <div className="space-y-6 mb-8">
              <EnhancedInput
                label="Your Name"
                icon={User}
                placeholder="Enter your beautiful name"
                value={playerName}
                onChange={handleNameChange}
                onFocus={handleNameFocus}
                onKeyPress={handleKeyPress}
                autoFocus={!isMobile}
                ref={nameInputRef}
              />
              
              <EnhancedInput
                label="Room Code"
                icon={Key}
                placeholder="Enter room code (optional)"
                value={roomId}
                onChange={handleRoomChange}
                onFocus={handleRoomFocus}
                onKeyPress={handleKeyPress}
                ref={roomInputRef}
              />
            </div>

            <div className="space-y-4">
              <Button
                onClick={createRoom}
                disabled={!playerName.trim()}
                size="lg"
                className="w-full py-6 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                <Crown className="w-5 h-5 mr-3" />
                Create New Room
              </Button>

              <Button
                onClick={joinRoom}
                disabled={!playerName.trim() || !roomId.trim()}
                size="lg"
                className="w-full py-6 text-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                <Users className="w-5 h-5 mr-3" />
                Join Existing Room
              </Button>
            </div>

            <div className={`mt-8 p-4 rounded-xl border ${
              darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-white/50 border-gray-200'
            }`}>
              <h4 className="font-semibold mb-3 flex items-center justify-center text-sm">
                <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
                Advanced Features
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Personality Matching</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>Values Alignment</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <span>Real-time Progress</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                  <span>Interactive Results</span>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
                darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'
              }`}>
                {isMobile ? (
                  <>
                    <Smartphone className="w-3 h-3" />
                    <span>Mobile Optimized</span>
                  </>
                ) : (
                  <>
                    <Monitor className="w-3 h-3" />
                    <span>Desktop Experience</span>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>

        {showAdvancedSettings && <SettingsPanel />}
      </div>
    );
  };

  // Add enhanced CSS for mobile optimizations
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
      
      /* Enhanced Mobile Optimizations */
      @media (max-width: 768px) {
        .mobile-optimized-container {
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        button, [role="button"] {
          min-height: 44px;
          min-width: 44px;
        }
        
        input, textarea {
          font-size: 16px !important;
          min-height: 44px;
        }
        
        @media screen and (max-width: 768px) {
          input, select, textarea {
            font-size: 16px !important;
          }
        }
        
        * {
          -webkit-overflow-scrolling: touch;
        }
        
        ::-webkit-scrollbar {
          width: 4px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.5);
          border-radius: 10px;
        }
      }
      
      * {
        transition: all 0.2s ease-in-out;
      }
      
      button:focus-visible,
      input:focus-visible {
        outline: 2px solid #8b5cf6;
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Enhanced cleanup on unmount
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
      
      const confettiElements = document.querySelectorAll('div[style*="confetti-fall"]');
      confettiElements.forEach(el => {
        if (document.body.contains(el)) {
          document.body.removeChild(el);
        }
      });
    };
  }, []);

  // Main render logic
  if (showResults) {
    return <ResultsScreen />;
  }

  if (waitingForPartner) {
    return <WaitingForPartnerScreen />;
  }

  if (gameStarted) {
    return <GameScreen />;
  }

  if (joined) {
    return <WaitingScreen />;
  }

  return <JoinCreateScreen />;
}