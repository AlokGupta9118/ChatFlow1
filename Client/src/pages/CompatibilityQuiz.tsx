import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  Heart, Users, Crown, Sparkles, Timer, Trophy, 
  Gamepad2, Volume2, VolumeX, CheckCircle, PartyPopper,
  MessageCircle, Loader2, Share2, Download, Brain,
  ArrowLeft, Clock, Star, Zap, Smile, Target
} from "lucide-react";

// Enhanced compatibility questions with multiple dimensions
const compatibilityDimensions = {
  personality: {
    title: "Personality Match",
    weight: 1.4,
    questions: [
      {
        id: 1,
        question: "How do you recharge your energy?",
        options: [
          { text: "Socializing with friends", value: "extrovert", insight: "Gains energy from social interactions" },
          { text: "Quiet time alone", value: "introvert", insight: "Recharges through solitude" },
          { text: "Trying new activities", value: "adventurer", insight: "Energized by novelty and excitement" },
          { text: "Routine and familiar spaces", value: "homebody", insight: "Finds comfort in consistency" }
        ]
      },
      {
        id: 2,
        question: "Your approach to decision-making is:",
        options: [
          { text: "Logical and analytical", value: "analytical", insight: "Makes decisions based on logic and data" },
          { text: "Intuitive and emotional", value: "intuitive", insight: "Follows gut feelings and emotions" },
          { text: "Practical and realistic", value: "practical", insight: "Focuses on what works in reality" },
          { text: "Creative and visionary", value: "visionary", insight: "Looks at possibilities and big picture" }
        ]
      }
    ]
  },
  values: {
    title: "Core Values",
    weight: 1.6,
    questions: [
      {
        id: 3,
        question: "What's most important in a relationship?",
        options: [
          { text: "Honesty and trust", value: "honesty", insight: "Values transparency and reliability" },
          { text: "Adventure and growth", value: "growth", insight: "Seeks continuous development and excitement" },
          { text: "Comfort and stability", value: "stability", insight: "Prioritizes security and predictability" },
          { text: "Passion and intensity", value: "passion", insight: "Craves deep emotional connection" }
        ]
      },
      {
        id: 4,
        question: "Your view on personal space:",
        options: [
          { text: "We should share everything", value: "shared", insight: "Believes in complete openness" },
          { text: "Everyone needs their own space", value: "independent", insight: "Values personal freedom and boundaries" },
          { text: "Balance between together and apart", value: "balanced", insight: "Seeks harmony between connection and independence" },
          { text: "Depends on the situation", value: "flexible", insight: "Adapts to circumstances" }
        ]
      }
    ]
  },
  lifestyle: {
    title: "Lifestyle Harmony",
    weight: 1.2,
    questions: [
      {
        id: 5,
        question: "Your ideal weekend involves:",
        options: [
          { text: "Parties and social events", value: "social", insight: "Loves being around people and activities" },
          { text: "Outdoor adventures", value: "adventure", insight: "Enjoys nature and physical activities" },
          { text: "Relaxing at home", value: "relaxed", insight: "Prefers quiet, comfortable environments" },
          { text: "Cultural experiences", value: "cultural", insight: "Appreciates arts, learning, and exploration" }
        ]
      },
      {
        id: 6,
        question: "How do you handle finances?",
        options: [
          { text: "Careful planner and saver", value: "planner", insight: "Organized and future-oriented with money" },
          { text: "Spontaneous and enjoy life", value: "spontaneous", insight: "Lives in the moment with finances" },
          { text: "Balanced approach", value: "balanced", insight: "Mixes saving with enjoyment" },
          { text: "It varies based on goals", value: "adaptive", insight: "Flexible financial approach" }
        ]
      }
    ]
  },
  communication: {
    title: "Communication Style",
    weight: 1.5,
    questions: [
      {
        id: 7,
        question: "When you're upset, you tend to:",
        options: [
          { text: "Talk it out immediately", value: "direct", insight: "Addresses issues head-on" },
          { text: "Take time to process alone", value: "reflective", insight: "Needs space to think before discussing" },
          { text: "Express through actions", value: "expressive", insight: "Shows feelings through behavior" },
          { text: "Seek compromise quickly", value: "harmonious", insight: "Focuses on finding middle ground" }
        ]
      },
      {
        id: 8,
        question: "Your love language is primarily:",
        options: [
          { text: "Words of affirmation", value: "verbal", insight: "Values verbal expressions of love" },
          { text: "Quality time", value: "time", insight: "Cherishes undivided attention" },
          { text: "Acts of service", value: "service", insight: "Appreciates helpful actions" },
          { text: "Physical touch", value: "touch", insight: "Feels loved through physical connection" }
        ]
      }
    ]
  }
};

// Flatten all questions for the game flow
const allQuestions = Object.values(compatibilityDimensions).flatMap(dimension => dimension.questions);

export default function AdvancedCompatibilityGame() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState<any>(null);
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameState, setGameState] = useState("lobby"); // lobby, waiting, playing, results
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Game progress
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [playerAnswers, setPlayerAnswers] = useState<any[]>([]);
  const [allPlayerAnswers, setAllPlayerAnswers] = useState<any>({});
  const [playerProgress, setPlayerProgress] = useState<{[key: string]: number}>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  // Initialize socket
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });

    newSocket.on("connect", () => {
      console.log("✅ Connected to compatibility game server");
    });

    newSocket.on("room-created", (data) => {
      console.log("Room created:", data);
      setRoomId(data.roomId);
      setIsHost(true);
      setJoined(true);
      setPlayers(data.players || []);
      setGameState("waiting");
      playSound("success");
    });

    newSocket.on("room-joined", (data) => {
      console.log("Room joined:", data);
      setRoomId(data.roomId);
      setPlayers(data.players || []);
      setJoined(true);
      setGameState("waiting");
      playSound("success");
    });

    newSocket.on("player-joined", (data) => {
      console.log("Player joined:", data);
      setPlayers(data.players);
      playSound("notification");
    });

    newSocket.on("game-started", () => {
      console.log("Game started");
      setGameStarted(true);
      setGameState("playing");
      setCurrentQuestionIndex(0);
      setPlayerAnswers([]);
      setSelectedAnswer("");
      playSound("success");
    });

    newSocket.on("player-answer", (data) => {
      console.log("Player answered:", data);
      setPlayerProgress(prev => ({
        ...prev,
        [data.playerName]: Math.round(((data.questionIndex + 1) / allQuestions.length) * 100)
      }));
    });

    newSocket.on("show-results", (data) => {
      console.log("Showing results:", data);
      setAllPlayerAnswers(data.answers);
      setGameState("results");
      playSound("victory");
      triggerConfetti();
    });

    newSocket.on("disconnect", () => {
      console.log("🔴 Disconnected from server");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Timer management
  useEffect(() => {
    if (timeLeft === null || gameState !== "playing") return;
    
    if (timeLeft <= 0) {
      handleAutoAnswer();
      return;
    }
    
    timerRef.current = setTimeout(() => {
      setTimeLeft(prev => prev !== null ? prev - 1 : null);
    }, 1000);
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, gameState]);

  // Start timer for each question
  useEffect(() => {
    if (gameState === "playing") {
      setTimeLeft(25); // 25 seconds per question
    }
  }, [currentQuestionIndex, gameState]);

  // Sound effects
  const playSound = (soundName: string) => {
    if (!soundEnabled) return;
    
    const sounds: {[key: string]: string} = {
      select: "/sounds/select.mp3",
      success: "/sounds/success.mp3",
      notification: "/sounds/notification.mp3",
      victory: "/sounds/victory.mp3"
    };
    
    if (audioRef.current && sounds[soundName]) {
      try {
        audioRef.current.src = sounds[soundName];
        audioRef.current.play().catch(() => {});
      } catch (error) {
        console.log("Audio play failed");
      }
    }
  };

  // Room management
  const createRoom = () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }
    
    socket.emit("create-room", {
      player: { name: playerName.trim() },
      gameType: "advanced-compatibility"
    });
  };

  const joinRoom = () => {
    if (!playerName.trim() || !roomId.trim()) {
      alert("Please enter your name and room code");
      return;
    }
    
    socket.emit("join-room", {
      roomId: roomId.trim().toUpperCase(),
      player: { name: playerName.trim() }
    });
  };

  const startGame = () => {
    if (players.length < 2) {
      alert("Need at least 2 players to start");
      return;
    }
    socket.emit("start-game", { roomId });
  };

  // Game actions
  const submitAnswer = () => {
    if (!selectedAnswer) return;

    const currentQuestion = allQuestions[currentQuestionIndex];
    const answerData = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      answer: selectedAnswer,
      dimension: Object.keys(compatibilityDimensions).find(key => 
        compatibilityDimensions[key as keyof typeof compatibilityDimensions].questions.some(q => q.id === currentQuestion.id)
      ),
      insight: currentQuestion.options.find(opt => opt.text === selectedAnswer)?.insight
    };

    const newAnswers = [...playerAnswers, answerData];
    setPlayerAnswers(newAnswers);

    // Notify other players
    socket.emit("player-answer", {
      roomId,
      playerName,
      questionIndex: currentQuestionIndex,
      progress: Math.round(((currentQuestionIndex + 1) / allQuestions.length) * 100)
    });

    playSound("select");

    // Move to next question or finish
    if (currentQuestionIndex < allQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer("");
    } else {
      // Submit all answers
      socket.emit("submit-all-answers", {
        roomId,
        playerName,
        answers: newAnswers
      });
    }
  };

  const handleAutoAnswer = () => {
    if (!selectedAnswer) {
      const currentQuestion = allQuestions[currentQuestionIndex];
      const randomOption = currentQuestion.options[Math.floor(Math.random() * currentQuestion.options.length)];
      setSelectedAnswer(randomOption.text);
      
      setTimeout(submitAnswer, 1000);
    } else {
      submitAnswer();
    }
  };

  const triggerConfetti = () => {
    // Simple confetti effect
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
          position: fixed;
          width: 10px;
          height: 10px;
          background: hsl(${Math.random() * 360}, 100%, 50%);
          border-radius: 50%;
          left: ${Math.random() * 100}%;
          top: -10px;
          z-index: 9999;
          pointer-events: none;
          animation: confetti-fall ${2 + Math.random() * 2}s linear forwards;
        `;
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
    const playerNames = Object.keys(allPlayerAnswers);
    if (playerNames.length < 2) return { score: 0, breakdown: {}, insights: [] };

    const [player1, player2] = playerNames;
    const answers1 = allPlayerAnswers[player1];
    const answers2 = allPlayerAnswers[player2];

    let totalScore = 0;
    let maxPossibleScore = 0;
    const dimensionScores: {[key: string]: number} = {};
    const insights: string[] = [];

    // Calculate scores for each dimension
    Object.entries(compatibilityDimensions).forEach(([dimensionKey, dimension]) => {
      const dimensionQuestions = dimension.questions;
      let dimensionScore = 0;
      let dimensionMaxScore = 0;

      dimensionQuestions.forEach(question => {
        const answer1 = answers1.find((a: any) => a.questionId === question.id);
        const answer2 = answers2.find((a: any) => a.questionId === question.id);

        if (answer1 && answer2) {
          dimensionMaxScore += dimension.weight;
          if (answer1.answer === answer2.answer) {
            dimensionScore += dimension.weight;
          }
        }
      });

      dimensionScores[dimension.title] = dimensionMaxScore > 0 ? 
        Math.round((dimensionScore / dimensionMaxScore) * 100) : 0;
      
      totalScore += dimensionScore;
      maxPossibleScore += dimensionMaxScore;
    });

    const finalScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

    // Generate insights based on scores
    if (finalScore >= 90) {
      insights.push("💖 Soulmate Connection: You're perfectly aligned in values and personality");
      insights.push("🌟 Exceptional Harmony: Your communication styles complement each other beautifully");
    } else if (finalScore >= 80) {
      insights.push("✨ Strong Compatibility: You share core values and understand each other deeply");
      insights.push("💫 Great Potential: Your differences create a balanced and dynamic relationship");
    } else if (finalScore >= 70) {
      insights.push("🌈 Good Match: You have solid foundation with room for growth together");
      insights.push("⚡ Exciting Chemistry: Your unique traits create interesting dynamics");
    } else if (finalScore >= 60) {
      insights.push("🎭 Interesting Blend: You challenge and learn from each other");
      insights.push("🌱 Growth Opportunity: Your differences can strengthen your bond");
    } else {
      insights.push("🌀 Unique Connection: You bring diverse perspectives to the relationship");
      insights.push("💡 Learning Experience: Every connection teaches us something valuable");
    }

    // Add dimension-specific insights
    Object.entries(dimensionScores).forEach(([dimension, score]) => {
      if (score >= 80) {
        insights.push(`✅ Excellent ${dimension} alignment`);
      } else if (score >= 60) {
        insights.push(`⚖️ Balanced ${dimension} dynamics`);
      } else {
        insights.push(`💭 Different ${dimension} approaches`);
      }
    });

    return {
      score: finalScore,
      breakdown: dimensionScores,
      insights,
      players: [player1, player2]
    };
  };

  // Component for the waiting room
  const WaitingRoom = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-rose-900 flex items-center justify-center p-4">
      <Card className="p-6 md:p-8 max-w-md w-full bg-white/5 border-white/20 text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Heart className="w-16 h-16 text-pink-400" />
            <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-spin" />
          </div>
        </div>
        
        <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white">Compatibility Test</h2>
        <p className="text-white/70 mb-4">Room: <strong>{roomId}</strong></p>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-white">Players Joined:</h3>
          <div className="space-y-2">
            {players.map((player, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-pink-500 text-white">
                      {player.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-white font-medium">{player.name}</span>
                </div>
                {index === 0 && <Crown className="w-4 h-4 text-yellow-400" />}
              </div>
            ))}
          </div>
        </div>

        {isHost ? (
          <Button
            onClick={startGame}
            disabled={players.length < 2}
            className="w-full py-6 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Start Test {players.length < 2 && `(${2 - players.length} more needed)`}
          </Button>
        ) : (
          <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 text-blue-300">
              <Clock className="w-5 h-5 animate-pulse" />
              <span>Waiting for host to start...</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  // Component for the game screen
  const GameScreen = () => {
    const currentQuestion = allQuestions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / allQuestions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-rose-900 flex items-center justify-center p-4">
        <Card className="p-6 md:p-8 max-w-2xl w-full bg-white/5 border-white/20">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Advanced Compatibility Test</h2>
              <p className="text-white/70">Room: {roomId}</p>
            </div>
            <div className="text-right">
              <div className="text-white/70 text-sm">Question</div>
              <div className="text-white font-bold">{currentQuestionIndex + 1}/{allQuestions.length}</div>
            </div>
          </div>

          {/* Progress */}
          <Progress value={progress} className="h-2 bg-white/20 mb-6" />

          {/* Question */}
          <div className="mb-6">
            <h3 className="text-lg md:text-xl font-bold text-white mb-4 text-center">
              {currentQuestion.question}
            </h3>
            
            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedAnswer === option.text
                      ? 'bg-pink-500/20 border-pink-400 scale-105'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => {
                    setSelectedAnswer(option.text);
                    playSound("select");
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedAnswer === option.text ? 'border-pink-400 bg-pink-400' : 'border-white/50'
                    }`}>
                      {selectedAnswer === option.text && <div className="w-2 h-2 rounded-full bg-white"></div>}
                    </div>
                    <span className="text-white font-medium">{option.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timer and Submit */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 text-white">
              <Timer className="w-4 h-4" />
              <span className={timeLeft && timeLeft <= 10 ? 'text-red-400 animate-pulse' : ''}>
                {timeLeft}s
              </span>
            </div>
            
            <Button
              onClick={submitAnswer}
              disabled={!selectedAnswer}
              className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white px-8"
            >
              {currentQuestionIndex === allQuestions.length - 1 ? 'Finish Test' : 'Next Question'}
            </Button>
          </div>

          {/* Player Progress */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            {players.map((player) => (
              <div key={player.name} className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm">{player.name}</span>
                  <span className="text-white font-bold">{playerProgress[player.name] || 0}%</span>
                </div>
                <Progress value={playerProgress[player.name] || 0} className="h-2 bg-white/20" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  // Component for results screen
  const ResultsScreen = () => {
    const compatibility = calculateCompatibility();
    const { score, breakdown, insights, players } = compatibility;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-rose-900 flex items-center justify-center p-4">
        <Card className="p-6 md:p-8 max-w-2xl w-full bg-white/5 border-white/20 text-center">
          <div className="flex justify-center mb-6">
            <PartyPopper className="w-16 h-16 text-yellow-400 animate-bounce" />
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-2 text-white">
            Compatibility Results
          </h2>
          
          <p className="text-white/70 mb-6 text-lg">
            {players.join(" 💞 ")}
          </p>

          {/* Main Score */}
          <div className="mb-8">
            <div className={`text-5xl md:text-6xl font-black mb-2 ${
              score >= 80 ? 'text-green-400' : 
              score >= 60 ? 'text-yellow-400' : 
              'text-pink-400'
            }`}>
              {score}%
            </div>
            <div className="text-white/70 text-lg">
              {score >= 80 ? 'Excellent Match!' : 
               score >= 60 ? 'Great Potential!' : 
               'Interesting Connection!'}
            </div>
          </div>

          {/* Dimension Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Object.entries(breakdown).map(([dimension, score]) => (
              <div key={dimension} className="bg-white/5 rounded-lg p-3">
                <div className="text-white/70 text-sm mb-1">{dimension}</div>
                <div className="text-white font-bold text-xl">{score}%</div>
                <Progress value={score} className="h-1 bg-white/20 mt-2" />
              </div>
            ))}
          </div>

          {/* Insights */}
          <div className="bg-white/5 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-center">
              <Brain className="w-5 h-5 mr-2 text-purple-400" />
              Relationship Insights
            </h3>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                  <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span className="text-white/90 text-left">{insight}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => window.location.reload()}
              className="flex-1 py-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              <Gamepad2 className="w-5 h-5 mr-2" />
              Play Again
            </Button>
            <Button
              onClick={() => navigate('/games')}
              className="flex-1 py-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Games
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  // Main lobby screen
  const LobbyScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-rose-900 flex items-center justify-center p-4">
      <Card className="p-6 md:p-8 max-w-md w-full bg-white/5 border-white/20 text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Heart className="w-16 h-16 text-pink-400" />
            <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-spin" />
          </div>
        </div>
        
        <h1 className="text-2xl md:text-4xl font-bold mb-2 text-white">
          Advanced Compatibility
        </h1>
        <p className="text-white/70 mb-6">Discover your connection through 8 dimensions of compatibility</p>

        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="playerName" className="text-white font-medium mb-2 block text-left">
              Your Name
            </Label>
            <Input
              id="playerName"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder-white/50"
            />
          </div>
          
          <div>
            <Label htmlFor="roomId" className="text-white font-medium mb-2 block text-left">
              Room Code (optional)
            </Label>
            <Input
              id="roomId"
              placeholder="Enter room code to join"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="bg-white/10 border-white/20 text-white placeholder-white/50"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={createRoom}
            disabled={!playerName.trim()}
            className="w-full py-6 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-lg disabled:opacity-50"
          >
            <Crown className="w-5 h-5 mr-2" />
            Create New Room
          </Button>

          <Button
            onClick={joinRoom}
            disabled={!playerName.trim() || !roomId.trim()}
            className="w-full py-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-lg disabled:opacity-50"
          >
            <Users className="w-5 h-5 mr-2" />
            Join Existing Room
          </Button>
        </div>

        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="font-semibold text-white mb-2 flex items-center justify-center">
            <Target className="w-4 h-4 mr-2 text-yellow-400" />
            What We Measure
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
            <div>• Personality Match</div>
            <div>• Core Values</div>
            <div>• Lifestyle Harmony</div>
            <div>• Communication</div>
          </div>
        </div>
      </Card>
    </div>
  );

  // Add confetti animation
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

  // Add audio element
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

  // Render appropriate screen based on game state
  switch (gameState) {
    case "results":
      return <ResultsScreen />;
    case "playing":
      return <GameScreen />;
    case "waiting":
      return <WaitingRoom />;
    default:
      return <LobbyScreen />;
  }
}