import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Heart, Users, Crown, Sparkles, Timer, CheckCircle, Loader2, 
  Share2, Check, CopyIcon, ArrowLeft, Wifi, WifiOff, 
  Smartphone, Monitor, Settings, RotateCcw, Target, Brain
} from "lucide-react";

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

// Create a separate component for the Join/Create screen
const JoinCreateScreen = React.memo(({ 
  playerName, 
  setPlayerName, 
  roomId, 
  setRoomId, 
  darkMode, 
  isMobile, 
  createRoom, 
  joinRoom, 
  showAdvancedSettings, 
  setShowAdvancedSettings 
}) => {
  const nameInputRef = useRef(null);
  const roomInputRef = useRef(null);

  const handleCreateRoom = useCallback(() => {
    createRoom();
  }, [createRoom]);

  const handleJoinRoom = useCallback(() => {
    joinRoom();
  }, [joinRoom]);

  const handleNameChange = useCallback((e) => {
    setPlayerName(e.target.value);
  }, [setPlayerName]);

  const handleRoomIdChange = useCallback((e) => {
    setRoomId(e.target.value.toUpperCase());
  }, [setRoomId]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      if (playerName.trim() && !roomId.trim()) {
        handleCreateRoom();
      } else if (playerName.trim() && roomId.trim()) {
        handleJoinRoom();
      }
    }
  }, [playerName, roomId, handleCreateRoom, handleJoinRoom]);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300 overflow-x-hidden ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      <div className="absolute top-4 left-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          className={`rounded-full ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-100'}`}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      <Card className={`p-6 max-w-md w-full backdrop-blur-sm border transition-all duration-300 ${
        darkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-white/80 border-gray-200'
      }`}>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Heart className="w-12 h-12 text-pink-500" />
              <Sparkles className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1 animate-spin" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            Compatibility Quiz
          </h1>
          <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
            Discover your connection with someone special
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="playerName" className="font-medium mb-2 block">
              Your Name
            </Label>
            <Input
              ref={nameInputRef}
              id="playerName"
              placeholder="Enter your name"
              value={playerName}
              onChange={handleNameChange}
              onKeyPress={handleKeyPress}
              className={`${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
              autoComplete="name"
            />
          </div>
          
          <div>
            <Label htmlFor="roomId" className="font-medium mb-2 block">
              Room Code (optional)
            </Label>
            <Input
              ref={roomInputRef}
              id="roomId"
              placeholder="Enter room code to join"
              value={roomId}
              onChange={handleRoomIdChange}
              onKeyPress={handleKeyPress}
              className={`${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleCreateRoom}
            disabled={!playerName.trim()}
            size="lg"
            className="w-full py-6 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-50 transition-all"
          >
            <Crown className="w-5 h-5 mr-2" />
            Create New Room
          </Button>

          <Button
            onClick={handleJoinRoom}
            disabled={!playerName.trim() || !roomId.trim()}
            size="lg"
            className="w-full py-6 text-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white disabled:opacity-50 transition-all"
          >
            <Users className="w-5 h-5 mr-2" />
            Join Existing Room
          </Button>
        </div>

        <div className={`mt-6 p-4 rounded-lg border ${
          darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white/50 border-gray-200'
        }`}>
          <h4 className="font-semibold mb-2 flex items-center justify-center">
            <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
            Features
          </h4>
          <ul className="text-sm space-y-1 text-left">
            <li>• Personality-based matching</li>
            <li>• Real-time progress tracking</li>
            <li>• Interactive results</li>
            <li>• Mobile optimized</li>
          </ul>
        </div>

        <div className="mt-3 text-center">
          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
            darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'
          }`}>
            {isMobile ? (
              <>
                <Smartphone className="w-3 h-3" />
                <span>Mobile Mode</span>
              </>
            ) : (
              <>
                <Monitor className="w-3 h-3" />
                <span>Desktop Mode</span>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
});

// Waiting Screen Component
const WaitingScreen = React.memo(({ 
  roomId, 
  players, 
  isHost, 
  playerName, 
  darkMode, 
  isMobile, 
  startGame, 
  connectionStatus,
  onLeaveRoom 
}) => {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = useCallback(() => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [roomId]);

  const shareRoom = useCallback(async () => {
    const shareData = {
      title: 'Join my Compatibility Game',
      text: `Join my compatibility game room! Room code: ${roomId}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        copyRoomCode();
      }
    } catch (error) {
      console.log('Sharing cancelled');
    }
  }, [roomId, copyRoomCode]);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      <Card className={`p-6 max-w-2xl w-full backdrop-blur-sm border transition-all duration-300 ${
        darkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-white/80 border-gray-200'
      }`}>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Heart className="w-12 h-12 text-pink-500" />
              <Sparkles className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            Waiting Room
          </h1>
          <p className={`text-base mb-6 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
            Share the room code with your partner
          </p>

          <div className="mb-8">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <div className={`px-6 py-3 rounded-lg border-2 ${
                darkMode ? 'bg-slate-700 border-purple-500' : 'bg-white border-purple-400'
              }`}>
                <span className={`text-2xl font-bold font-mono ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {roomId}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={copyRoomCode}
                  className={`${darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'} text-white`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button
                  onClick={shareRoom}
                  variant={darkMode ? "outline" : "secondary"}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className={`text-xl font-semibold mb-4 text-center ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Players ({players.length}/2)
          </h2>
          
          <div className="space-y-3">
            {players.map((player, index) => (
              <div
                key={player.name || index}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  darkMode 
                    ? 'bg-slate-700/50 border-slate-600' 
                    : 'bg-white/50 border-gray-200'
                } ${player.name === playerName ? 'ring-2 ring-purple-500' : ''}`}
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={`${
                      darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                    }`}>
                      {player.name ? player.name.charAt(0).toUpperCase() : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {player.name}
                    </span>
                    {player.name === playerName && (
                      <Badge variant="secondary" className="ml-2">
                        You
                      </Badge>
                    )}
                  </div>
                </div>
                
                {index === 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Crown className="w-5 h-5 text-yellow-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Room Host</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ))}
            
            {Array.from({ length: 2 - players.length }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className={`flex items-center p-4 rounded-lg border border-dashed ${
                  darkMode 
                    ? 'bg-slate-700/30 border-slate-500 text-slate-400' 
                    : 'bg-gray-50 border-gray-300 text-gray-500'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={darkMode ? 'bg-slate-600' : 'bg-gray-200'}>
                      ?
                    </AvatarFallback>
                  </Avatar>
                  <span>Waiting for player...</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`mb-6 p-3 rounded-lg text-center ${
          connectionStatus === "connected" 
            ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')
            : (darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
        }`}>
          <div className="flex items-center justify-center space-x-2">
            {connectionStatus === "connected" ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>Connected to server</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Connecting to server...</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {isHost && (
            <Button
              onClick={startGame}
              disabled={players.length < 2}
              size="lg"
              className="w-full py-6 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-50 transition-all"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Compatibility Test
              {players.length < 2 && ` (${2 - players.length} more needed)`}
            </Button>
          )}
          
          {!isHost && (
            <div className={`p-4 rounded-lg text-center ${
              darkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Waiting for host to start the game...</span>
              </div>
            </div>
          )}

          <Button
            onClick={onLeaveRoom}
            variant={darkMode ? "outline" : "secondary"}
            className="w-full"
          >
            Leave Room
          </Button>
        </div>
      </Card>
    </div>
  );
});

// Game Screen Component
const GameScreen = React.memo(({
  currentQuestion,
  currentAnswer,
  questions,
  timeLeft,
  playerProgress,
  players,
  playerName,
  darkMode,
  isMobile,
  isSubmitting,
  onSubmitAnswer,
  onOptionSelect,
  onLeaveRoom
}) => {
  const questionContainerRef = useRef(null);

  useEffect(() => {
    if (isMobile && questionContainerRef.current) {
      setTimeout(() => {
        questionContainerRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  }, [currentQuestion, isMobile]);

  const handleSubmit = () => {
    if (currentAnswer && !isSubmitting) {
      onSubmitAnswer();
    }
  };

  const currentQuestionData = questions[currentQuestion];

  return (
    <div className={`min-h-screen p-4 transition-colors duration-300 overflow-y-auto ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLeaveRoom}
              className={darkMode ? 'text-white hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Leave Game
            </Button>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
            }`}>
              Question {currentQuestion + 1} of {questions.length}
            </div>
          </div>

          {timeLeft !== null && (
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              darkMode ? 'bg-slate-700' : 'bg-white'
            }`}>
              <Timer className={`w-4 h-4 ${timeLeft < 10 ? 'text-red-500 animate-pulse' : darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              <span className={`font-mono font-bold ${timeLeft < 10 ? 'text-red-500' : darkMode ? 'text-white' : 'text-gray-900'}`}>
                {timeLeft}s
              </span>
            </div>
          )}
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
              Progress
            </span>
            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {Math.round(((currentQuestion + 1) / questions.length) * 100)}%
            </span>
          </div>
          <Progress 
            value={((currentQuestion + 1) / questions.length) * 100} 
            className={`h-2 ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className={`p-6 backdrop-blur-sm border ${
              darkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-white/80 border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                <Users className="w-5 h-5 mr-2 text-purple-500" />
                Players
              </h3>
              
              <div className="space-y-3">
                {players.map((player, index) => (
                  <div
                    key={player.name || index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      darkMode ? 'bg-slate-700/50' : 'bg-white'
                    } ${player.name === playerName ? 'ring-2 ring-purple-500' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className={`${
                          darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                        }`}>
                          {player.name ? player.name.charAt(0).toUpperCase() : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className={`font-medium text-sm ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {player.name}
                          {player.name === playerName && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className={`text-xs ${
                          darkMode ? 'text-slate-400' : 'text-gray-500'
                        }`}>
                          Progress: {playerProgress[player.name] || 0}%
                        </div>
                      </div>
                    </div>
                    
                    {index === 0 && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className={`p-6 backdrop-blur-sm border ${
              darkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-white/80 border-gray-200'
            }`} ref={questionContainerRef}>
              <div className="mb-8">
                <div className="flex items-center space-x-2 mb-3">
                  <Badge variant={darkMode ? "secondary" : "default"} className="mb-2">
                    {currentQuestionData.category}
                  </Badge>
                  <Badge variant="outline" className={darkMode ? 'text-slate-300' : 'text-gray-600'}>
                    Weight: {currentQuestionData.weight}x
                  </Badge>
                </div>
                
                <h2 className={`text-2xl font-bold mb-4 leading-relaxed ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {currentQuestionData.question}
                </h2>
                
                <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  Select the option that best describes you
                </div>
              </div>

              <div className="space-y-3 mb-8">
                {currentQuestionData.options.map((option, index) => (
                  <div
                    key={index}
                    onClick={() => onOptionSelect(option)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      currentAnswer === option
                        ? darkMode 
                          ? 'bg-purple-600 border-purple-500 text-white scale-105 shadow-lg' 
                          : 'bg-purple-500 border-purple-400 text-white scale-105 shadow-lg'
                        : darkMode
                          ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:border-slate-500'
                          : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option}</span>
                      {currentAnswer === option && (
                        <CheckCircle className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!currentAnswer || isSubmitting}
                size="lg"
                className="w-full py-6 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-50 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {currentQuestion < questions.length - 1 ? 'Next Question' : 'See Results'}
                  </>
                )}
              </Button>

              <div className="mt-4 text-center">
                <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs ${
                  darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'
                }`}>
                  <Target className="w-3 h-3" />
                  <span>
                    {currentQuestion + 1} of {questions.length} questions completed
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
});

// Results Screen Component
const ResultsScreen = React.memo(({
  bothAnswers,
  players,
  playerName,
  darkMode,
  isMobile,
  onPlayAgain,
  onLeaveRoom
}) => {
  const [copied, setCopied] = useState(false);

  const compatibility = React.useMemo(() => {
    if (!bothAnswers || typeof bothAnswers !== 'object') {
      return { 
        score: 0, 
        breakdown: {}, 
        insights: ["No results available yet"]
      };
    }

    const allPlayers = Object.keys(bothAnswers);
    if (allPlayers.length < 2) {
      return { 
        score: 0, 
        breakdown: {}, 
        insights: ["Waiting for both players to complete the test"]
      };
    }

    const [p1, p2] = allPlayers;
    const ans1 = bothAnswers[p1] || [];
    const ans2 = bothAnswers[p2] || [];
    
    let totalScore = 0;
    let maxPossibleScore = 0;
    const categoryScores = {};
    const insights = [];

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

    const finalScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

    if (finalScore >= 95) {
      insights.push("💖 Cosmic Connection! You're practically soulmates");
      insights.push("✨ Perfect harmony in values and lifestyle");
    } else if (finalScore >= 85) {
      insights.push("🌟 Exceptional Match! Your connection is deep and natural");
      insights.push("⭐ Strong alignment in core values");
    } else if (finalScore >= 75) {
      insights.push("💫 Great Chemistry! You complement each other beautifully");
    } else if (finalScore >= 65) {
      insights.push("🌈 Strong Potential! With understanding, this could flourish");
    } else if (finalScore >= 50) {
      insights.push("🎭 Interesting Dynamic! You challenge and inspire each other");
    } else {
      insights.push("🌀 Unconventional Match! You bring fresh perspectives");
    }

    return {
      score: finalScore,
      breakdown: categoryScores,
      insights,
      player1: p1,
      player2: p2
    };
  }, [bothAnswers]);

  const shareResults = async () => {
    const shareData = {
      title: 'Our Compatibility Results',
      text: `We scored ${compatibility.score}% on the compatibility test!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`Compatibility Score: ${compatibility.score}%`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.log('Sharing cancelled');
    }
  };

  return (
    <div className={`min-h-screen p-4 transition-colors duration-300 overflow-y-auto ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Heart className="w-20 h-20 text-pink-500" />
              <Sparkles className="w-10 h-10 text-yellow-500 absolute -top-2 -right-2 animate-pulse" />
            </div>
          </div>
          
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            Compatibility Results
          </h1>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
            {players.map((player, index) => (
              <div key={player.name} className="flex items-center space-x-3">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className={`text-lg ${
                    darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                  }`}>
                    {player.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className={`text-xl font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {player.name}
                </span>
              </div>
            ))}
            <div className={`text-3xl font-bold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              &
            </div>
          </div>
        </div>

        <Card className={`p-8 backdrop-blur-sm border mb-8 ${
          darkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-white/80 border-gray-200'
        }`}>
          <div className="text-center">
            <div className="relative inline-block mb-8">
              <div className="relative">
                <div className={`w-40 h-40 rounded-full border-8 flex items-center justify-center ${
                  compatibility.score >= 80 
                    ? 'border-green-500' 
                    : compatibility.score >= 60 
                    ? 'border-yellow-500' 
                    : 'border-red-500'
                }`}>
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {compatibility.score}%
                    </div>
                    <div className={`text-sm mt-1 ${
                      darkMode ? 'text-slate-400' : 'text-gray-600'
                    }`}>
                      Match Score
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {compatibility.insights.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-gray-200'
                  }`}
                >
                  <p className={`text-base text-center ${
                    darkMode ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    {insight}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Button
                onClick={onPlayAgain}
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Play Again
              </Button>
              
              <Button
                onClick={shareResults}
                variant={darkMode ? "outline" : "secondary"}
                size="lg"
              >
                <Share2 className="w-5 h-5 mr-2" />
                {copied ? "Copied!" : "Share Results"}
              </Button>
              
              <Button
                onClick={onLeaveRoom}
                variant={darkMode ? "outline" : "secondary"}
                size="lg"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Leave Game
              </Button>
            </div>
          </div>
        </Card>

        <Card className={`p-8 backdrop-blur-sm border ${
          darkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-white/80 border-gray-200'
        }`}>
          <h3 className={`text-2xl font-bold mb-6 text-center ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Detailed Breakdown
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(compatibility.breakdown).map(([category, score]) => (
              <div
                key={category}
                className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {category}
                  </span>
                  <span className={`font-bold ${
                    score >= 3 ? 'text-green-500' : score >= 2 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {score} pts
                  </span>
                </div>
                <Progress 
                  value={(score / 5) * 100} 
                  className={`h-2 ${
                    score >= 3 ? 'bg-green-500' : score >= 2 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
});

export default function AdvancedCompatibilityGame() {
  // Core states
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Game states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState([]);
  const [bothAnswers, setBothAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [playerProgress, setPlayerProgress] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connected");

  // UI/UX states
  const [darkMode, setDarkMode] = useState(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Refs
  const submitTimeoutRef = useRef();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // State persistence
  useEffect(() => {
    const savedState = localStorage.getItem('compatibilityGameState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setPlayerName(state.playerName || '');
        setRoomId(state.roomId || '');
        setDarkMode(state.darkMode !== undefined ? state.darkMode : true);
      } catch (error) {
        localStorage.removeItem('compatibilityGameState');
      }
    }
  }, []);

  // Auto-save
  useEffect(() => {
    const state = {
      playerName,
      roomId,
      darkMode,
      joined,
      gameStarted,
      currentQuestion,
      answers,
    };
    localStorage.setItem('compatibilityGameState', JSON.stringify(state));
  }, [playerName, roomId, darkMode, joined, gameStarted, currentQuestion, answers]);

  // Socket connection management
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
        socket.emit("rejoin-room", { roomId, playerName });
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

  // Socket event handlers
  useEffect(() => {
    const handleRoomCreated = (room) => {
      if (!room) return;
      setRoomId(room.roomId || '');
      setIsHost(true);
      setJoined(true);
      setPlayers(room.players || []);
    };

    const handleRoomJoined = (room) => {
      if (!room) return;
      setRoomId(room.roomId || '');
      setPlayers(room.players || []);
      setJoined(true);
      
      if (room.gameState?.gameStarted) {
        setGameStarted(true);
        setCurrentQuestion(room.gameState.currentQuestion || 0);
        setPlayerProgress(room.gameState.playerProgress || {});
      }
    };

    const handleUpdatePlayers = (playersList) => {
      if (!Array.isArray(playersList)) return;
      setPlayers(playersList);
    };

    const handlePlayerProgress = (data) => {
      if (!data || !data.player) return;
      setPlayerProgress(prev => ({
        ...prev,
        [data.player]: data.progress
      }));
    };

    const handleGameStarted = () => {
      setGameStarted(true);
      setCurrentQuestion(0);
      setAnswers([]);
      setCurrentAnswer("");
      setBothAnswers({});
      setShowResults(false);
      setTimeLeft(30);
    };

    const handleQuestionChanged = (data) => {
      if (!data) return;
      setCurrentQuestion(data.questionIndex || 0);
      setTimeLeft(data.timeLeft || 30);
    };

    const handleShowResults = (data) => {
      const safeData = data || {};
      const results = safeData.results || safeData || {};
      
      setBothAnswers(results);
      setShowResults(true);
      setIsSubmitting(false);
    };

    const handleAnswersUpdate = (data) => {
      console.log('Answers update:', data);
    };

    // Register event listeners
    socket.on("room-created", handleRoomCreated);
    socket.on("room-joined", handleRoomJoined);
    socket.on("update-players", handleUpdatePlayers);
    socket.on("player-progress", handlePlayerProgress);
    socket.on("game-started", handleGameStarted);
    socket.on("question-changed", handleQuestionChanged);
    socket.on("show-results", handleShowResults);
    socket.on("answers-update", handleAnswersUpdate);

    return () => {
      socket.off("room-created", handleRoomCreated);
      socket.off("room-joined", handleRoomJoined);
      socket.off("update-players", handleUpdatePlayers);
      socket.off("player-progress", handlePlayerProgress);
      socket.off("game-started", handleGameStarted);
      socket.off("question-changed", handleQuestionChanged);
      socket.off("show-results", handleShowResults);
      socket.off("answers-update", handleAnswersUpdate);
    };
  }, []);

  // Timer
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

  const handleAutoSubmit = () => {
    if (currentAnswer) {
      submitAnswer();
    } else if (questions[currentQuestion]?.options?.length > 0) {
      const randomOption = questions[currentQuestion].options[
        Math.floor(Math.random() * questions[currentQuestion].options.length)
      ];
      setCurrentAnswer(randomOption);
      
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
      
      submitTimeoutRef.current = setTimeout(() => {
        submitAnswer();
      }, 1000);
    }
  };

  // Room management
  const createRoom = useCallback(() => {
    const trimmedName = playerName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      alert("Please enter a valid name (at least 2 characters)");
      return;
    }
    
    socket.emit("create-room", { 
      player: { name: trimmedName },
      gameType: "compatibility"
    });
  }, [playerName]);

  const joinRoom = useCallback(() => {
    const trimmedName = playerName.trim();
    const trimmedRoomId = roomId.trim();
    
    if (!trimmedName || trimmedName.length < 2) {
      alert("Please enter a valid name (at least 2 characters)");
      return;
    }
    if (!trimmedRoomId) {
      alert("Please enter a room code");
      return;
    }
    
    socket.emit("join-room", { 
      roomId: trimmedRoomId, 
      player: { name: trimmedName } 
    });
  }, [playerName, roomId]);

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

    // Use setTimeout to ensure state updates are processed
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        // Move to next question
        socket.emit("answer-submitted", {
          roomId,
          playerName,
          questionIndex: currentQuestion,
          answer: currentAnswer
        });
        
        setCurrentQuestion(prev => prev + 1);
        setCurrentAnswer("");
        setIsSubmitting(false);
        setTimeLeft(30);
      } else {
        // Submit final answers
        socket.emit("submit-answers", { 
          roomId, 
          player: { name: playerName }, 
          answers: newAnswers
        });
        
        // Don't reset isSubmitting here - wait for results
      }
    }, 500);
  };

  const handleOptionSelect = (option) => {
    setCurrentAnswer(option);
  };

  const leaveRoom = useCallback(() => {
    socket.emit("leave-room", roomId);
    setJoined(false);
    setGameStarted(false);
    setShowResults(false);
    setPlayers([]);
    setIsHost(false);
    setRoomId("");
    setCurrentQuestion(0);
    setCurrentAnswer("");
    setAnswers([]);
    setBothAnswers({});
    localStorage.removeItem('compatibilityGameState');
  }, [roomId]);

  const playAgain = () => {
    setShowResults(false);
    setGameStarted(false);
    setCurrentQuestion(0);
    setCurrentAnswer("");
    setAnswers([]);
    setBothAnswers({});
    setPlayerProgress({});
    
    if (isHost) {
      socket.emit("start-game", { roomId });
    }
  };

  // Main render logic
  if (showResults) {
    return (
      <ResultsScreen
        bothAnswers={bothAnswers}
        players={players}
        playerName={playerName}
        darkMode={darkMode}
        isMobile={isMobile}
        onPlayAgain={playAgain}
        onLeaveRoom={leaveRoom}
      />
    );
  }

  if (gameStarted) {
    return (
      <GameScreen
        currentQuestion={currentQuestion}
        currentAnswer={currentAnswer}
        questions={questions}
        timeLeft={timeLeft}
        playerProgress={playerProgress}
        players={players}
        playerName={playerName}
        darkMode={darkMode}
        isMobile={isMobile}
        isSubmitting={isSubmitting}
        onSubmitAnswer={submitAnswer}
        onOptionSelect={handleOptionSelect}
        onLeaveRoom={leaveRoom}
      />
    );
  }

  if (joined) {
    return (
      <WaitingScreen
        roomId={roomId}
        players={players}
        isHost={isHost}
        playerName={playerName}
        darkMode={darkMode}
        isMobile={isMobile}
        startGame={startGame}
        connectionStatus={connectionStatus}
        onLeaveRoom={leaveRoom}
      />
    );
  }

  return (
    <JoinCreateScreen
      playerName={playerName}
      setPlayerName={setPlayerName}
      roomId={roomId}
      setRoomId={setRoomId}
      darkMode={darkMode}
      isMobile={isMobile}
      createRoom={createRoom}
      joinRoom={joinRoom}
      showAdvancedSettings={showAdvancedSettings}
      setShowAdvancedSettings={setShowAdvancedSettings}
    />
  );
}