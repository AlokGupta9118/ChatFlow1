import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import { 
  Heart, Users, LinkIcon, Crown, Sparkles, Timer, Trophy, 
  Gamepad2, Camera, Volume2, VolumeX, Settings, Zap, Award,
  Star, Target, TrendingUp, Clock, CheckCircle, PartyPopper,
  MessageCircle, ThumbsUp, Flame, Medal, Users2, Brain,
  Smile, Frown, Meh, Laugh, HeartCrack, Loader2, Share2,
  Download, Image, Copy, Check, MapPin, Calendar, Music,
  Coffee, Film, BookOpen, Utensils, Mountain, Palette,
  ArrowLeft
} from "lucide-react";
import html2canvas from "html2canvas";

const socket = io(import.meta.env.VITE_API_URL, {
  transports: ['websocket', 'polling'],
  timeout: 10000
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

// New compatibility parameters
const additionalCompatibilityFactors = {
  communicationStyles: ["Direct", "Diplomatic", "Emotional", "Analytical"],
  loveLanguages: ["Words of Affirmation", "Quality Time", "Gifts", "Acts of Service", "Physical Touch"],
  conflictResolution: ["Confront immediately", "Take time to cool off", "Seek compromise", "Avoid conflict"],
  futureGoals: ["Career-focused", "Family-oriented", "Travel and adventure", "Stability and security"]
};

export default function EnhancedCompatibilityGame() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState<any[]>([]);
  const [bothAnswers, setBothAnswers] = useState<any>({});
  const [showResults, setShowResults] = useState(false);
  const [playerProgress, setPlayerProgress] = useState<{[key: string]: number}>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [playerReactions, setPlayerReactions] = useState<{[key: string]: string}>({});
  const [connectionStatus, setConnectionStatus] = useState("connected");

  // Enhanced states
  const [additionalAnswers, setAdditionalAnswers] = useState({
    communicationStyle: "",
    loveLanguage: "",
    conflictStyle: "",
    futureGoal: "",
    personalityTraits: [] as string[]
  });

  // Mobile keyboard states
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // Screenshot sharing states
  const [isCapturing, setIsCapturing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // FIXED: Input refs to prevent re-renders
  const playerNameInputRef = useRef<HTMLInputElement>(null);
  const roomIdInputRef = useRef<HTMLInputElement>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const confettiRef = useRef<any>(null);
  const submitTimeoutRef = useRef<NodeJS.Timeout>();
  const screenshotRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // FIXED: Mobile keyboard detection
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      const viewportHeight = window.innerHeight;
      const screenHeight = window.screen.height;
      
      // If viewport is significantly smaller than screen, keyboard is likely open
      if (isMobile && viewportHeight < screenHeight * 0.7) {
        setKeyboardVisible(true);
      } else {
        setKeyboardVisible(false);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        setInputFocused(true);
        // Scroll input into view on mobile
        setTimeout(() => {
          e.target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    const handleFocusOut = () => {
      setInputFocused(false);
      // Small delay to ensure keyboard is fully hidden
      setTimeout(() => setKeyboardVisible(false), 100);
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // FIXED: Adjust layout when keyboard is visible
  useEffect(() => {
    if (mainContainerRef.current && keyboardVisible) {
      mainContainerRef.current.style.paddingBottom = '200px';
    } else if (mainContainerRef.current) {
      mainContainerRef.current.style.paddingBottom = '0';
    }
  }, [keyboardVisible]);

  // FIXED: Enhanced sound effects with error handling
  const playSound = (soundName: string) => {
    if (!soundEnabled) return;
    
    const sounds: {[key: string]: string} = {
      select: "/sounds/select.mp3",
      success: "/sounds/success.mp3",
      notification: "/sounds/notification.mp3",
      levelUp: "/sounds/level-up.mp3",
      achievement: "/sounds/achievement.mp3",
      victory: "/sounds/victory.mp3"
    };
    
    if (audioRef.current && sounds[soundName]) {
      try {
        audioRef.current.src = sounds[soundName];
        audioRef.current.play().catch(() => {
          // Silent fail for audio errors
        });
      } catch (error) {
        console.log("Audio play failed:", error);
      }
    }
  };

  // FIXED: Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  // FIXED: Timer management with proper cleanup
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

  // FIXED: Start timer when question changes
  useEffect(() => {
    if (gameStarted && !showResults && currentQuestion < questions.length) {
      setTimeLeft(30);
    }
  }, [currentQuestion, gameStarted, showResults]);

  const handleAutoSubmit = () => {
    if (currentAnswer) {
      submitAnswer();
    } else {
      // Auto-select random answer if no selection
      const randomOption = questions[currentQuestion].options[
        Math.floor(Math.random() * questions[currentQuestion].options.length)
      ];
      setCurrentAnswer(randomOption);
      
      submitTimeoutRef.current = setTimeout(() => {
        submitAnswer();
      }, 1000);
    }
  };

  // FIXED: Enhanced screenshot capture function
  const captureScreenshot = async () => {
    if (!screenshotRef.current) return;
    
    setIsCapturing(true);
    setShareSuccess(false);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(screenshotRef.current, {
        backgroundColor: '#7c3aed',
        scale: 1.5,
        useCORS: true,
        logging: false,
        width: screenshotRef.current.scrollWidth,
        height: screenshotRef.current.scrollHeight,
        onclone: (clonedDoc) => {
          const element = clonedDoc.querySelector('[data-screenshot]');
          if (element) {
            (element as HTMLElement).style.transform = 'none';
          }
        }
      });
      
      const imageDataUrl = canvas.toDataURL('image/png', 0.9);
      setCapturedImage(imageDataUrl);
      
      try {
        if (navigator.clipboard && navigator.clipboard.write) {
          const blob = await (await fetch(imageDataUrl)).blob();
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 3000);
        } else {
          downloadImage(imageDataUrl);
        }
      } catch (clipboardError) {
        console.log('Clipboard not available, downloading instead');
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
    link.download = `compatibility-result-${roomId}-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareToSocialMedia = async () => {
    if (!capturedImage) return;
    
    try {
      const blob = await (await fetch(capturedImage)).blob();
      const file = new File([blob], 'compatibility-result.png', { type: 'image/png' });
      
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Our Compatibility Results!',
          text: `We are ${calculateCompatibility().score}% compatible! 💞`
        });
      } else {
        downloadImage(capturedImage);
      }
    } catch (error) {
      console.log('Social media share not available, downloading instead');
      downloadImage(capturedImage);
    }
  };

  // FIXED: Enhanced Socket Event Handlers with error boundaries
  useEffect(() => {
    const handleRoomCreated = (room: any) => {
      console.log("Room created:", room);
      setRoomId(room.roomId);
      setIsHost(true);
      setJoined(true);
      setPlayers(room.players || []);
      playSound("success");
    };

    const handleRoomJoined = (room: any) => {
      console.log("Room joined:", room);
      setRoomId(room.roomId);
      setPlayers(room.players || []);
      setJoined(true);
      playSound("success");
    };

    const handleUpdatePlayers = (players: any[]) => {
      console.log("Players updated:", players);
      const currentPlayerNames = players.map(p => p.name);
      const previousPlayerNames = players.map(p => p.name);
      
      const newPlayers = players.filter(p => !previousPlayerNames.includes(p.name));
      if (newPlayers.length > 0) {
        playSound("notification");
      }
      setPlayers(players);
    };

    const handlePlayerProgress = (data: {player: string, progress: number}) => {
      console.log("Player progress:", data);
      setPlayerProgress(prev => ({
        ...prev,
        [data.player]: data.progress
      }));
    };

    const handleGameStarted = () => {
      console.log("Game started");
      setGameStarted(true);
      setCurrentQuestion(0);
      setAnswers([]);
      setCurrentAnswer("");
      setAdditionalAnswers({
        communicationStyle: "",
        loveLanguage: "",
        conflictStyle: "",
        futureGoal: "",
        personalityTraits: []
      });
      playSound("success");
    };

    const handleShowResults = (data: any) => {
      console.log("Show results:", data);
      setBothAnswers(data);
      setShowResults(true);
      setIsSubmitting(false);
      playSound("victory");
      triggerConfetti();
    };

    const handlePlayerReaction = (data: {player: string, reaction: string}) => {
      console.log("Player reaction:", data);
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

    const handleConnectionError = () => {
      console.error("Socket connection error");
      setConnectionStatus("disconnected");
    };

    const handleReconnect = () => {
      console.log("Socket reconnected");
      setConnectionStatus("connected");
    };

    // Register event listeners
    socket.on("room-created", handleRoomCreated);
    socket.on("room-joined", handleRoomJoined);
    socket.on("update-players", handleUpdatePlayers);
    socket.on("player-progress", handlePlayerProgress);
    socket.on("game-started", handleGameStarted);
    socket.on("show-results", handleShowResults);
    socket.on("player-reaction", handlePlayerReaction);
    socket.on("connect_error", handleConnectionError);
    socket.on("reconnect", handleReconnect);

    return () => {
      // Cleanup event listeners
      socket.off("room-created", handleRoomCreated);
      socket.off("room-joined", handleRoomJoined);
      socket.off("update-players", handleUpdatePlayers);
      socket.off("player-progress", handlePlayerProgress);
      socket.off("game-started", handleGameStarted);
      socket.off("show-results", handleShowResults);
      socket.off("player-reaction", handlePlayerReaction);
      socket.off("connect_error", handleConnectionError);
      socket.off("reconnect", handleReconnect);
    };
  }, []);

  // FIXED: Room creation with validation
  const createRoom = () => {
    const trimmedName = playerName.trim();
    if (!trimmedName) {
      alert("Please enter your name");
      return;
    }
    if (trimmedName.length < 2) {
      alert("Name should be at least 2 characters long");
      return;
    }
    console.log("Creating room for:", trimmedName);
    
    const currentPlayerName = trimmedName;
    socket.emit("create-room", { 
      player: { name: currentPlayerName },
      gameType: "compatibility"
    });
  };

  // FIXED: Room joining with validation
  const joinRoom = () => {
    const trimmedName = playerName.trim();
    const trimmedRoomId = roomId.trim();
    
    if (!trimmedName || !trimmedRoomId) {
      alert("Please enter your name and room code");
      return;
    }
    if (trimmedName.length < 2) {
      alert("Name should be at least 2 characters long");
      return;
    }
    console.log("Joining room:", trimmedRoomId, "as:", trimmedName);
    
    const currentPlayerName = trimmedName;
    socket.emit("join-room", { 
      roomId: trimmedRoomId, 
      player: { name: currentPlayerName } 
    });
  };

  // FIXED: Start game with validation
  const startGame = () => {
    if (players.length < 2) {
      alert("Need at least 2 players to start");
      return;
    }
    console.log("Starting game in room:", roomId);
    socket.emit("start-game", { roomId });
  };

  // FIXED: Submit answer with proper state management
  const submitAnswer = async () => {
    if (!currentAnswer || isSubmitting) {
      console.log("Cannot submit: no answer or already submitting");
      return;
    }

    console.log("Submitting answer:", currentAnswer, "for question:", currentQuestion);
    
    setIsSubmitting(true);
    playSound("select");

    const newAnswers = [...answers, { 
      question: questions[currentQuestion].question,
      answer: currentAnswer,
      category: questions[currentQuestion].category,
      weight: questions[currentQuestion].weight,
      questionId: questions[currentQuestion].id,
      personalityInsight: questions[currentQuestion].insights[currentAnswer]
    }];
    
    setAnswers(newAnswers);

    const progress = Math.round(((currentQuestion + 1) / questions.length) * 100);
    socket.emit("player-progress", { roomId, progress });

    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }
    
    submitTimeoutRef.current = setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        console.log("Moving to next question:", currentQuestion + 1);
        setCurrentQuestion(prev => prev + 1);
        setCurrentAnswer("");
        setIsSubmitting(false);
      } else {
        console.log("Submitting all answers");
        socket.emit("submit-answers", { 
          roomId, 
          player: { name: playerName }, 
          answers: newAnswers,
          additionalAnswers
        });
      }
    }, 300);
  };

  const sendReaction = (reaction: string) => {
    socket.emit("player-reaction", { roomId, reaction });
  };

  const triggerConfetti = () => {
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.background = `hsl(${Math.random() * 360}, 100%, 50%)`;
        confetti.style.borderRadius = '50%';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.top = '-10px';
        confetti.style.zIndex = '9999';
        confetti.style.pointerEvents = 'none';
        confetti.style.animation = `confetti-fall ${2 + Math.random() * 2}s linear forwards`;
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
          if (document.body.contains(confetti)) {
            document.body.removeChild(confetti);
          }
        }, 3000);
      }, i * 100);
    }
  };

  // Enhanced compatibility calculation
  const calculateCompatibility = () => {
    const allPlayers = Object.keys(bothAnswers);
    if (allPlayers.length < 2) return { score: 0, breakdown: {}, insights: [], personalityAnalysis: {} };

    const [p1, p2] = allPlayers;
    const ans1 = bothAnswers[p1];
    const ans2 = bothAnswers[p2];
    
    let totalScore = 0;
    let maxPossibleScore = 0;
    const categoryScores: {[key: string]: number} = {};
    const insights: string[] = [];
    const personalityAnalysis: any = {};

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const weight = question.weight;
      maxPossibleScore += weight;
      
      if (ans1[i]?.answer === ans2[i]?.answer) {
        totalScore += weight;
        categoryScores[question.category] = (categoryScores[question.category] || 0) + weight;
      }
    }

    let additionalScore = 0;
    let maxAdditionalScore = 0;

    if (ans1.additionalAnswers?.communicationStyle && ans2.additionalAnswers?.communicationStyle) {
      maxAdditionalScore += 1;
      if (ans1.additionalAnswers.communicationStyle === ans2.additionalAnswers.communicationStyle) {
        additionalScore += 1;
      }
    }

    if (ans1.additionalAnswers?.loveLanguage && ans2.additionalAnswers?.loveLanguage) {
      maxAdditionalScore += 1;
      if (ans1.additionalAnswers.loveLanguage === ans2.additionalAnswers.loveLanguage) {
        additionalScore += 1;
      }
    }

    const questionScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 70 : 0;
    const additionalFactorScore = maxAdditionalScore > 0 ? (additionalScore / maxAdditionalScore) * 30 : 0;
    const finalScore = Math.round(questionScore + additionalFactorScore);

    if (finalScore >= 90) {
      insights.push("🔥 Soulmate Alert! You complete each other perfectly");
      insights.push("💫 Your communication styles and values are in perfect harmony");
    } else if (finalScore >= 80) {
      insights.push("🌟 Perfect Match! Your connection is strong and natural");
      insights.push("⭐ You understand each other's needs and communication styles");
    } else if (finalScore >= 70) {
      insights.push("💫 Great Chemistry! You complement each other beautifully");
      insights.push("✨ Your differences create a balanced and dynamic relationship");
    } else if (finalScore >= 60) {
      insights.push("🌈 Strong Potential! With effort, this could be amazing");
      insights.push("💡 You have a solid foundation to build upon");
    } else if (finalScore >= 50) {
      insights.push("🎭 Interesting Dynamic! You challenge and grow with each other");
      insights.push("🌱 Your relationship has unique strengths to develop");
    } else {
      insights.push("🌀 Unique Connection! You bring different perspectives");
      insights.push("⚡ Your differences create exciting chemistry");
    }

    const commonTraits = new Set();
    const differentTraits = new Set();

    ans1.forEach((answer: any, index: number) => {
      if (ans2[index] && answer.answer === ans2[index].answer) {
        commonTraits.add(answer.personalityInsight);
      } else if (ans2[index]) {
        differentTraits.add(answer.personalityInsight);
        differentTraits.add(ans2[index].personalityInsight);
      }
    });

    personalityAnalysis.commonTraits = Array.from(commonTraits);
    personalityAnalysis.differentTraits = Array.from(differentTraits);
    personalityAnalysis.communicationMatch = ans1.additionalAnswers?.communicationStyle === ans2.additionalAnswers?.communicationStyle;
    personalityAnalysis.loveLanguageMatch = ans1.additionalAnswers?.loveLanguage === ans2.additionalAnswers?.loveLanguage;

    return {
      score: finalScore,
      breakdown: categoryScores,
      insights,
      personalityAnalysis,
      additionalFactors: {
        communication: ans1.additionalAnswers?.communicationStyle === ans2.additionalAnswers?.communicationStyle ? "Perfect match" : "Different styles",
        loveLanguages: ans1.additionalAnswers?.loveLanguage === ans2.additionalAnswers?.loveLanguage ? "Same love language" : "Different love languages"
      }
    };
  };

  const getCompatibilityMessage = (score: number) => {
    if (score >= 90) return "Soulmate Connection! 💖";
    if (score >= 80) return "Perfect Match! 🌟";
    if (score >= 70) return "Excellent Compatibility! ⭐";
    if (score >= 60) return "Great Potential! 💫";
    if (score >= 50) return "Good Connection! ✨";
    if (score >= 40) return "Interesting Match! 🌈";
    return "Unique Chemistry! 🎭";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-600";
    if (score >= 60) return "from-blue-500 to-cyan-600";
    if (score >= 40) return "from-yellow-500 to-orange-500";
    return "from-purple-500 to-pink-500";
  };

  // FIXED: Additional Questions Component with proper input handling
  const AdditionalQuestions = () => (
    <Card className="p-4 md:p-6 bg-white/10 backdrop-blur-sm border-white/20 mb-6">
      <h3 className="text-xl md:text-2xl font-bold text-white mb-4 text-center">
        Additional Compatibility Factors
      </h3>
      
      <div className="space-y-4 md:space-y-6">
        <div>
          <Label className="text-white font-medium mb-2 block">
            Your Communication Style
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {additionalCompatibilityFactors.communicationStyles.map((style) => (
              <div 
                key={style} 
                className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors cursor-pointer ${
                  additionalAnswers.communicationStyle === style
                    ? 'bg-pink-500/20 border-pink-400/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                onClick={() => {
                  setAdditionalAnswers(prev => ({...prev, communicationStyle: style}));
                  playSound("select");
                }}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  additionalAnswers.communicationStyle === style 
                    ? 'border-pink-400 bg-pink-400' 
                    : 'border-white/50'
                }`}>
                  {additionalAnswers.communicationStyle === style && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
                <Label className="flex-1 cursor-pointer text-white text-sm md:text-base">
                  {style}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-white font-medium mb-2 block">
            Your Primary Love Language
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {additionalCompatibilityFactors.loveLanguages.map((language) => (
              <div 
                key={language} 
                className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors cursor-pointer ${
                  additionalAnswers.loveLanguage === language
                    ? 'bg-pink-500/20 border-pink-400/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                onClick={() => {
                  setAdditionalAnswers(prev => ({...prev, loveLanguage: language}));
                  playSound("select");
                }}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  additionalAnswers.loveLanguage === language 
                    ? 'border-pink-400 bg-pink-400' 
                    : 'border-white/50'
                }`}>
                  {additionalAnswers.loveLanguage === language && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
                <Label className="flex-1 cursor-pointer text-white text-sm">
                  {language}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );

  // Enhanced Player Card Component
  const PlayerCard = ({ player, index }: { player: any, index: number }) => (
    <div className="flex items-center justify-between p-3 md:p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
      <div className="flex items-center space-x-2 md:space-x-3">
        <Avatar className="w-8 h-8 md:w-10 md:h-10 border-2 border-white/30">
          <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-600 text-white text-xs md:text-sm">
            {player.name?.charAt(0).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center space-x-1 md:space-x-2">
          <span className="font-semibold text-white text-sm md:text-base">{player.name || "Unknown"}</span>
          {index === 0 && <Crown className="w-3 h-3 md:w-4 md:h-4 text-yellow-400" />}
        </div>
      </div>
      
      <div className="flex items-center space-x-1 md:space-x-2">
        {playerProgress[player.name] !== undefined && (
          <div className="text-right">
            <div className="text-xs md:text-sm font-bold text-white">{playerProgress[player.name]}%</div>
            <Progress value={playerProgress[player.name]} className="w-16 md:w-20 h-2 bg-white/20" />
          </div>
        )}
        
        {playerReactions[player.name] && (
          <div className="bg-white/20 px-2 py-1 md:px-3 md:py-1 rounded-full text-base md:text-lg animate-bounce">
            {playerReactions[player.name]}
          </div>
        )}
      </div>
    </div>
  );

  // Connection Status Indicator
  const ConnectionStatus = () => (
    <div className={`fixed top-2 right-2 md:top-4 md:right-4 px-2 py-1 md:px-3 md:py-1 rounded-full text-xs font-semibold z-50 ${
      connectionStatus === "connected" 
        ? "bg-green-500 text-white" 
        : "bg-red-500 text-white animate-pulse"
    }`}>
      {connectionStatus === "connected" ? "🟢 Connected" : "🔴 Disconnected"}
    </div>
  );

  // Share Button Component
  const ShareButton = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={captureScreenshot}
            disabled={isCapturing}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-8 w-8 md:h-10 md:w-10"
          >
            {isCapturing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : shareSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isCapturing ? 'Capturing...' : shareSuccess ? 'Copied!' : 'Share Screenshot'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Share Modal Component
  const ShareModal = () => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md md:max-w-2xl w-full bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border-0">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-3 md:mb-4">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
              <Share2 className="w-5 h-5 md:w-6 md:h-6 mr-2 text-blue-600" />
              Share Your Results
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowShareModal(false);
                setCapturedImage(null);
              }}
              className="h-7 w-7 md:h-8 md:w-8"
            >
              <span className="text-lg">✕</span>
            </Button>
          </div>
          
          <div className="space-y-3 md:space-y-4">
            {capturedImage && (
              <div className="text-center">
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden max-h-64 md:max-h-96 overflow-y-auto">
                  <img
                    src={capturedImage}
                    alt="Compatibility Results"
                    className="w-full h-auto"
                  />
                </div>
                <p className="text-xs md:text-sm text-gray-600 mt-2">
                  Screenshot captured! Choose how you'd like to share it.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
              <Button
                onClick={() => capturedImage && downloadImage(capturedImage)}
                className="py-3 md:py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm md:text-base"
              >
                <Download className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Download
              </Button>
              
              <Button
                onClick={shareToSocialMedia}
                className="py-3 md:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm md:text-base"
              >
                <Share2 className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Share
              </Button>
              
              <Button
                onClick={captureScreenshot}
                disabled={isCapturing}
                className="py-3 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm md:text-base col-span-1 md:col-span-2"
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    Capture Again
                  </>
                )}
              </Button>
            </div>
            
            {shareSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 md:p-3 text-center">
                <div className="flex items-center justify-center text-green-600 text-sm md:text-base">
                  <Check className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  <span className="font-medium">Screenshot copied to clipboard!</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );

  // Enhanced Results Screen
  const ResultsScreen = () => {
    const compatibility = calculateCompatibility();
    const { score, breakdown, insights, personalityAnalysis, additionalFactors } = compatibility;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-rose-900 flex flex-col items-center justify-center p-4 md:p-6 text-white">
        <ConnectionStatus />
        
        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
        </div>
        
        {/* Screenshot capture area */}
        <div ref={screenshotRef} data-screenshot="true" className="w-full max-w-4xl">
          <Card className="p-6 md:p-8 bg-white/10 backdrop-blur-sm border-white/20 text-center relative">
            {/* Share button positioned absolutely */}
            <div className="absolute top-4 right-4">
              <ShareButton />
            </div>
            
            <div className="flex justify-center mb-4 md:mb-6">
              <PartyPopper className="w-12 h-12 md:w-16 md:h-16 text-yellow-400 animate-bounce" />
            </div>
            
            <h2 className="text-3xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
              {getCompatibilityMessage(score)}
            </h2>
            
            <div className={`text-4xl md:text-6xl font-black mb-4 bg-gradient-to-r ${getScoreColor(score)} bg-clip-text text-transparent`}>
              {score}%
            </div>
            
            <p className="text-lg md:text-xl text-white/80 mb-6 md:mb-8">
              {Object.keys(bothAnswers).join(" 💞 ")}
            </p>

            {/* Additional Factors Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
              <div className="bg-white/10 rounded-lg p-3 md:p-4 backdrop-blur-sm">
                <div className="flex items-center justify-center mb-2">
                  <MessageCircle className="w-4 h-4 md:w-5 md:h-5 mr-2 text-blue-400" />
                  <span className="font-semibold text-sm md:text-base">Communication</span>
                </div>
                <div className="text-base md:text-lg text-white">{additionalFactors.communication}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 md:p-4 backdrop-blur-sm">
                <div className="flex items-center justify-center mb-2">
                  <Heart className="w-4 h-4 md:w-5 md:h-5 mr-2 text-red-400" />
                  <span className="font-semibold text-sm md:text-base">Love Languages</span>
                </div>
                <div className="text-base md:text-lg text-white">{additionalFactors.loveLanguages}</div>
              </div>
            </div>

            {/* Compatibility Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
              {Object.entries(breakdown).map(([category, catScore]) => (
                <div key={category} className="bg-white/10 rounded-lg p-3 md:p-4 backdrop-blur-sm">
                  <div className="text-xs md:text-sm text-white/70 mb-1">{category}</div>
                  <div className="text-xl md:text-2xl font-bold text-white">
                    {Math.round((catScore as number / questions.filter(q => q.category === category).length) * 100)}%
                  </div>
                  <Progress 
                    value={(catScore as number / questions.filter(q => q.category === category).length) * 100} 
                    className="h-2 bg-white/20 mt-2"
                  />
                </div>
              ))}
            </div>

            {/* Personality Analysis */}
            {personalityAnalysis.commonTraits.length > 0 && (
              <div className="bg-white/10 rounded-xl p-4 md:p-6 mb-4 md:mb-6 backdrop-blur-sm">
                <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 flex items-center justify-center">
                  <Brain className="w-4 h-4 md:w-5 md:h-5 mr-2 text-purple-400" />
                  Shared Personality Traits
                </h3>
                <div className="flex flex-wrap gap-1 md:gap-2 justify-center">
                  {personalityAnalysis.commonTraits.map((trait: string, index: number) => (
                    <Badge key={index} className="bg-green-500/20 text-green-300 border-green-400/30 px-2 py-1 text-xs">
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Insights */}
            <div className="bg-white/10 rounded-xl p-4 md:p-6 mb-6 md:mb-8 backdrop-blur-sm">
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 flex items-center justify-center">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2 text-yellow-400" />
                Relationship Insights
              </h3>
              <div className="space-y-2 md:space-y-3">
                {insights.map((insight, index) => (
                  <div key={index} className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-white/5 rounded-lg">
                    <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-yellow-400 flex-shrink-0" />
                    <span className="text-white/90 text-sm md:text-base">{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Reactions */}
            <div className="flex justify-center space-x-1 md:space-x-2 mb-4 md:mb-6">
              {['❤️', '😂', '😮', '👏', '🎉'].map(reaction => (
                <Button
                  key={reaction}
                  variant="outline"
                  size="sm"
                  onClick={() => sendReaction(reaction)}
                  className="text-base md:text-lg h-10 w-10 md:h-12 md:w-12 bg-white/10 border-white/20 hover:bg-white/20"
                >
                  {reaction}
                </Button>
              ))}
            </div>

            <div className="flex gap-3 md:gap-4 flex-col sm:flex-row">
              <Button 
                onClick={() => window.location.reload()} 
                className="flex-1 py-4 md:py-6 text-base md:text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
              >
                <Gamepad2 className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Play Again
              </Button>
              <Button 
                onClick={captureScreenshot}
                disabled={isCapturing}
                className="flex-1 py-4 md:py-6 text-base md:text-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
              >
                {isCapturing ? (
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                )}
                {isCapturing ? 'Capturing...' : 'Share Results'}
              </Button>
            </div>
          </Card>
        </div>

        {showShareModal && <ShareModal />}
      </div>
    );
  };

  // Waiting Screen Component
  const WaitingScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-pink-800 to-rose-900 text-white p-4 md:p-6">
      <ConnectionStatus />
      
      {/* Back Button */}
      <div className="absolute top-4 left-4">
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Leave Room
        </Button>
      </div>
      
      {/* Screenshot capture area */}
      <div ref={screenshotRef} data-screenshot="true" className="w-full max-w-2xl">
        <Card className="p-6 md:p-8 bg-white/10 backdrop-blur-sm border-white/20 text-center relative">
          {/* Share button */}
          <div className="absolute top-4 right-4">
            <ShareButton />
          </div>
          
          <div className="flex justify-center mb-4 md:mb-6">
            <div className="relative">
              <Heart className="w-16 h-16 md:w-20 md:h-20 text-pink-400 animate-pulse" />
              <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 absolute -top-1 -right-1 md:-top-2 md:-right-2 animate-spin" />
            </div>
          </div>
          
          <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
            Compatibility Test
          </h2>
          
          <div className="mb-4 md:mb-6">
            <h3 className="text-xl md:text-2xl font-bold mb-2">Room Code: {roomId}</h3>
            <p className="text-white/80 mb-3 md:mb-4 text-sm md:text-base">Share this code with your partner to begin the journey!</p>
            <Button 
              onClick={() => navigator.clipboard?.writeText(roomId)}
              className="bg-white/20 hover:bg-white/30 border-white/30 text-sm md:text-base"
            >
              <LinkIcon className="w-3 h-3 md:w-4 md:h-4 mr-2" />
              Copy Code
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:gap-4 mb-4 md:mb-6">
            {players.map((player, index) => (
              <PlayerCard key={player.name || index} player={player} index={index} />
            ))}
          </div>

          {players.length === 1 && (
            <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
              <div className="flex items-center justify-center space-x-2">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                <span className="text-yellow-300 text-sm md:text-base">Waiting for partner to join...</span>
              </div>
            </div>
          )}

          {isHost ? (
            <Button 
              onClick={startGame} 
              disabled={players.length < 2}
              className="w-full py-4 md:py-6 text-base md:text-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Start Compatibility Test {players.length < 2 && `(Need ${2 - players.length} more)`}
            </Button>
          ) : (
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3 md:p-4">
              <div className="flex items-center justify-center space-x-2">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-blue-400 animate-pulse" />
                <span className="text-blue-300 text-sm md:text-base">Waiting for host to start the test...</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {showShareModal && <ShareModal />}
    </div>
  );

  // FIXED: Game Screen Component with proper input handling
  const GameScreen = () => {
    const currentQ = questions[currentQuestion];
    
    // FIXED: Handle option selection directly
    const handleOptionSelect = (option: string) => {
      console.log("Option selected:", option);
      setCurrentAnswer(option);
      playSound("select");
    };

    // FIXED: Handle submit with proper validation
    const handleSubmit = () => {
      if (!currentAnswer) {
        alert("Please select an answer before submitting");
        return;
      }
      submitAnswer();
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-pink-800 to-rose-900 text-white p-4 md:p-6">
        <ConnectionStatus />
        
        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm"
          >
            <ArrowLeft className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            Leave Game
          </Button>
        </div>
        
        {/* Screenshot capture area */}
        <div ref={screenshotRef} data-screenshot="true" className="w-full max-w-4xl">
          {/* Header */}
          <div className="mb-4 md:mb-6 relative">
            <div className="flex justify-between items-center p-3 md:p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <div>
                <h2 className="text-lg md:text-xl font-bold">Room: {roomId}</h2>
                <div className="text-white/70 flex items-center space-x-2 text-sm">
                  <Users className="w-3 h-3 md:w-4 md:h-4" />
                  <span>{players.map(p => p.name).join(" & ")}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 md:space-x-4">
                {/* Progress */}
                <div className="text-right">
                  <div className="text-xs md:text-sm text-white/70">Progress</div>
                  <div className="text-base md:text-lg font-bold text-white">
                    {currentQuestion + 1} / {questions.length}
                  </div>
                </div>
                
                {/* Timer */}
                {timeLeft !== null && (
                  <div className="text-right">
                    <div className="text-xs md:text-sm text-white/70">Time Left</div>
                    <div className={`text-base md:text-lg font-bold ${
                      timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
                    }`}>
                      <Timer className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
                      {timeLeft}s
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Share button in header */}
            <div className="absolute top-3 md:top-4 right-3 md:right-4">
              <ShareButton />
            </div>
          </div>

          {/* Player Progress Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
            {players.map((player) => (
              <div key={player.name} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-6 h-6 md:w-8 md:h-8">
                      <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-600 text-white text-xs">
                        {player.name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-white text-sm md:text-base">{player.name}</span>
                  </div>
                  <div className="text-xs md:text-sm font-bold text-white">
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
          <Card className="p-4 md:p-8 bg-white/10 backdrop-blur-sm border-white/20 mb-4 md:mb-6">
            <div className="text-center mb-4 md:mb-6">
              <Badge className="mb-2 bg-pink-500/20 text-pink-300 border-pink-400/30 text-xs">
                {currentQ.category} • Weight: {currentQ.weight}x
              </Badge>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                {currentQ.question}
              </h3>
              <p className="text-white/70 text-sm md:text-base">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>

            {/* FIXED: RadioGroup with proper value handling */}
            <div className="space-y-3 md:space-y-4">
              {currentQ.options.map((option, index) => (
                <div 
                  key={index} 
                  className={`flex items-center space-x-3 p-3 md:p-4 rounded-lg border transition-all cursor-pointer ${
                    currentAnswer === option 
                      ? 'bg-pink-500/20 border-pink-400/50 scale-105 shadow-lg' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:scale-102'
                  }`}
                  onClick={() => handleOptionSelect(option)}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    currentAnswer === option 
                      ? 'border-pink-400 bg-pink-400' 
                      : 'border-white/50'
                  }`}>
                    {currentAnswer === option && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <Label 
                    className="flex-1 cursor-pointer text-white font-medium text-base md:text-lg"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>

            {/* Show personality insight for selected answer */}
            {currentAnswer && currentQ.insights && (
              <div className="mt-3 md:mt-4 p-2 md:p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-300">
                  <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="text-xs md:text-sm font-medium">
                    This suggests: {currentQ.insights[currentAnswer]}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mt-6 md:mt-8">
              <Button
                variant="outline"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="border-white/20 text-white hover:bg-white/10 h-8 w-8 md:h-10 md:w-10"
              >
                {soundEnabled ? <Volume2 className="w-3 h-3 md:w-4 md:h-4" /> : <VolumeX className="w-3 h-3 md:w-4 md:h-4" />}
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={!currentAnswer || isSubmitting}
                className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white px-6 py-2 md:px-8 md:py-3 text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : currentQuestion === questions.length - 1 ? (
                  <>
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    Finish Test
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    Next Question
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Show Additional Questions after main questions */}
          {currentQuestion === questions.length - 1 && (
            <AdditionalQuestions />
          )}

          {/* Quick Reactions */}
          <div className="flex justify-center space-x-1 md:space-x-2">
            {['❤️', '😂', '😮', '👏', '🎉'].map(reaction => (
              <Button
                key={reaction}
                variant="outline"
                size="sm"
                onClick={() => sendReaction(reaction)}
                className="text-base md:text-lg h-10 w-10 md:h-12 md:w-12 bg-white/10 border-white/20 hover:bg-white/20"
              >
                {reaction}
              </Button>
            ))}
          </div>
        </div>

        {showShareModal && <ShareModal />}
      </div>
    );
  };

  // FIXED: Join/Create Screen Component with better input handling and mobile keyboard support
  const JoinCreateScreen = () => {
    return (
      <div 
        ref={mainContainerRef}
        className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-pink-800 to-rose-900 text-white p-4 md:p-6 transition-all duration-300 ${
          keyboardVisible ? 'pb-40' : ''
        }`}
      >
        <ConnectionStatus />
        
        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="outline"
            onClick={() => navigate('/Games')}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
        </div>
        
        <Card className="p-6 md:p-8 max-w-md w-full bg-white/10 backdrop-blur-sm border-white/20 text-center relative">
          <div className="flex justify-center mb-4 md:mb-6">
            <div className="relative">
              <Heart className="w-12 h-12 md:w-16 md:h-16 text-pink-400" />
              <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 absolute -top-1 -right-1 md:-top-2 md:-right-2 animate-spin" />
            </div>
          </div>
          
          <h1 className="text-2xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
            Compatibility Test
          </h1>
          <p className="text-white/70 mb-6 md:mb-8 text-sm md:text-base">Discover your connection with someone special</p>

          <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
            <div className="text-left">
              <Label htmlFor="playerName" className="text-white font-medium mb-2 block">
                Your Name
              </Label>
              <Input
                id="playerName"
                ref={playerNameInputRef}
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => {
                  console.log("Setting player name:", e.target.value);
                  setPlayerName(e.target.value);
                }}
                autoComplete="off"
                className="bg-white/10 border-white/20 text-white placeholder-white/50 text-sm md:text-base"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && playerName.trim() && roomId.trim()) {
                    joinRoom();
                  } else if (e.key === 'Enter' && playerName.trim()) {
                    createRoom();
                  }
                }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
              />
            </div>
            
            <div>
              <Label htmlFor="roomId" className="text-white font-medium mb-2 block">
                Room Code (optional)
              </Label>
              <Input
                id="roomId"
                ref={roomIdInputRef}
                placeholder="Enter room code to join"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="bg-white/10 border-white/20 text-white placeholder-white/50 text-sm md:text-base"
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && playerName.trim() && roomId.trim()) {
                    joinRoom();
                  }
                }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
              />
            </div>
          </div>

          <div className="space-y-2 md:space-y-3">
            <Button
              onClick={createRoom}
              disabled={!playerName.trim()}
              className="w-full py-4 md:py-6 text-base md:text-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Crown className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Create New Room
            </Button>

            <Button
              onClick={joinRoom}
              disabled={!playerName.trim() || !roomId.trim()}
              className="w-full py-4 md:py-6 text-base md:text-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Users className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Join Existing Room
            </Button>
          </div>

          <div className="mt-4 md:mt-6 p-3 md:p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="font-semibold text-white mb-2 flex items-center justify-center text-sm md:text-base">
              <Sparkles className="w-3 h-3 md:w-4 h-4 mr-2 text-yellow-400" />
              How it works
            </h4>
            <ul className="text-xs md:text-sm text-white/70 space-y-1 text-left">
              <li>• Create a room and share the code</li>
              <li>• Answer fun compatibility questions</li>
              <li>• See your match percentage and insights</li>
              <li>• Share your results with friends</li>
            </ul>
          </div>
        </Card>
      </div>
    );
  };

  // Add CSS for confetti animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes confetti-fall {
        0% {
          transform: translateY(-10px) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(360deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Add audio element for sound effects
  useEffect(() => {
    const audio = document.createElement('audio');
    audioRef.current = audio;
    document.body.appendChild(audio);

    return () => {
      if (audioRef.current) {
        document.body.removeChild(audioRef.current);
      }
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