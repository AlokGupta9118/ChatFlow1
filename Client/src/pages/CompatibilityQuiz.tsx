// components/CompatibilityGame.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Clock, 
  Trophy, 
  Heart, 
  MessageCircle, 
  Send,
  Zap,
  CheckCircle,
  Star,
  TrendingUp
} from 'lucide-react';

const CompatibilityGame = ({ socket, roomId, player, onLeaveGame }) => {
  const [gameState, setGameState] = useState({
    players: [],
    playerProgress: {},
    currentQuestion: 0,
    gameStarted: false,
    answers: {},
    showResults: false,
    waitingFor: [],
    answeredCount: 0,
    totalPlayers: 0
  });

  const [currentAnswers, setCurrentAnswers] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timer, setTimer] = useState(30);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [compatibilityResults, setCompatibilityResults] = useState(null);
  const [gamePhase, setGamePhase] = useState('waiting'); // waiting, playing, results

  const timerRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Enhanced compatibility questions with categories
  const compatibilityQuestions = [
    {
      id: 1,
      question: "What's your ideal weekend?",
      category: "Lifestyle",
      options: [
        "Adventure and outdoor activities",
        "Relaxing at home with movies",
        "Socializing with friends",
        "Trying new restaurants and cafes"
      ]
    },
    {
      id: 2,
      question: "How do you handle conflict?",
      category: "Communication",
      options: [
        "Address it immediately and directly",
        "Take time to cool off first",
        "Avoid confrontation if possible",
        "Seek mediation from others"
      ]
    },
    {
      id: 3,
      question: "What's most important in a relationship?",
      category: "Values",
      options: [
        "Trust and honesty",
        "Communication and understanding",
        "Shared interests and hobbies",
        "Emotional support and care"
      ]
    },
    {
      id: 4,
      question: "How do you prefer to communicate?",
      category: "Communication",
      options: [
        "Face-to-face conversations",
        "Text messages throughout the day",
        "Phone or video calls",
        "Mixed - depends on the situation"
      ]
    },
    {
      id: 5,
      question: "What's your love language?",
      category: "Relationships",
      options: [
        "Words of affirmation",
        "Quality time together",
        "Receiving gifts",
        "Acts of service"
      ]
    },
    {
      id: 6,
      question: "How do you make important decisions?",
      category: "Personality",
      options: [
        "Follow my intuition and feelings",
        "Analyze all the facts logically",
        "Seek advice from trusted people",
        "Consider pros and cons carefully"
      ]
    },
    {
      id: 7,
      question: "What's your social energy level?",
      category: "Lifestyle",
      options: [
        "Very social - love being around people",
        "Moderate - need balance of social and alone time",
        "Introverted - prefer small gatherings",
        "It varies depending on my mood"
      ]
    },
    {
      id: 8,
      question: "How do you handle stress?",
      category: "Personality",
      options: [
        "Exercise and physical activity",
        "Talk to friends or family",
        "Meditation or alone time",
        "Distract myself with hobbies"
      ]
    },
    {
      id: 9,
      question: "What's your approach to finances?",
      category: "Values",
      options: [
        "Save for the future",
        "Enjoy life and spend on experiences",
        "Balance between saving and spending",
        "Budget carefully for everything"
      ]
    },
    {
      id: 10,
      question: "What makes you feel loved?",
      category: "Relationships",
      options: [
        "Hearing 'I love you' regularly",
        "Unexpected thoughtful gestures",
        "Quality undivided attention",
        "Help with daily tasks and responsibilities"
      ]
    }
  ];

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    // Game state updates
    socket.on('game-state-update', (state) => {
      setGameState(prev => ({ ...prev, ...state }));
    });

    socket.on('update-players', (players) => {
      setGameState(prev => ({ ...prev, players }));
    });

    socket.on('game-started', () => {
      setGameState(prev => ({ ...prev, gameStarted: true }));
      setGamePhase('playing');
      startTimer();
    });

    socket.on('player-progress', ({ player: playerName, progress }) => {
      setGameState(prev => ({
        ...prev,
        playerProgress: {
          ...prev.playerProgress,
          [playerName]: progress
        }
      }));
    });

    socket.on('answers-update', ({ answered, total, waitingFor }) => {
      setGameState(prev => ({
        ...prev,
        answeredCount: answered,
        totalPlayers: total,
        waitingFor
      }));
    });

    socket.on('show-results', (answers) => {
      setGameState(prev => ({ 
        ...prev, 
        answers, 
        showResults: true 
      }));
      setGamePhase('results');
      calculateCompatibility(answers);
      clearTimer();
    });

    // Chat handlers
    socket.on('chat-history', (messages) => {
      setChatMessages(messages);
    });

    socket.on('receive-chat-message', (message) => {
      setChatMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    socket.on('user-typing', ({ userName, isTyping }) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(user => user !== userName);
        return isTyping ? [...filtered, userName] : filtered;
      });
    });

    // Reaction handlers
    socket.on('player-reaction', ({ player: playerName, reaction }) => {
      const newReaction = {
        id: Date.now(),
        player: playerName,
        reaction,
        position: {
          x: Math.random() * 80 + 10,
          y: Math.random() * 80 + 10
        }
      };
      setReactions(prev => [...prev, newReaction]);
      
      // Remove reaction after 3 seconds
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== newReaction.id));
      }, 3000);
    });

    // Time sync
    socket.on('time-sync', (time) => {
      setTimer(time);
    });

    return () => {
      socket.off('game-state-update');
      socket.off('update-players');
      socket.off('game-started');
      socket.off('player-progress');
      socket.off('answers-update');
      socket.off('show-results');
      socket.off('chat-history');
      socket.off('receive-chat-message');
      socket.off('user-typing');
      socket.off('player-reaction');
      socket.off('time-sync');
      clearTimer();
    };
  }, [socket]);

  // Timer management
  const startTimer = () => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearTimer();
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTimeUp = () => {
    if (selectedAnswer) {
      submitAnswers();
    }
  };

  // Game actions
  const startGame = () => {
    socket.emit('start-game', { roomId });
  };

  const submitAnswers = () => {
    if (!selectedAnswer) return;

    const answers = compatibilityQuestions.map((q, index) => ({
      questionId: q.id,
      question: q.question,
      category: q.category,
      answer: index === gameState.currentQuestion ? selectedAnswer : null
    }));

    socket.emit('submit-answers', {
      roomId,
      player,
      answers
    });

    // Update progress
    const progress = Math.round(((gameState.currentQuestion + 1) / compatibilityQuestions.length) * 100);
    socket.emit('player-progress', { roomId, progress });

    setSelectedAnswer(null);
  };

  const nextQuestion = () => {
    if (gameState.currentQuestion < compatibilityQuestions.length - 1) {
      setGameState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1,
        showResults: false
      }));
      setSelectedAnswer(null);
      setTimer(30);
      startTimer();
    }
  };

  const sendReaction = (reaction) => {
    socket.emit('player-reaction', { roomId, reaction });
  };

  // Chat functions
  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      sender: player.name,
      content: newMessage.trim()
    };

    socket.emit('send-chat-message', { roomId, message });
    setNewMessage('');
    stopTyping();
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { roomId, isTyping: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    setIsTyping(false);
    socket.emit('typing', { roomId, isTyping: false });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Compatibility calculation
  const calculateCompatibility = (allAnswers) => {
    const players = Object.keys(allAnswers);
    const results = [];

    // Calculate compatibility between all player pairs
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const playerA = players[i];
        const playerB = players[j];
        const answersA = allAnswers[playerA];
        const answersB = allAnswers[playerB];

        let matchScore = 0;
        let totalQuestions = 0;
        const categoryScores = {};

        answersA.forEach((answerA, index) => {
          const answerB = answersB[index];
          if (answerA.answer && answerB.answer) {
            totalQuestions++;
            if (answerA.answer === answerB.answer) {
              matchScore++;
              // Track category matches
              const category = answerA.category;
              categoryScores[category] = (categoryScores[category] || 0) + 1;
            }
          }
        });

        const compatibility = totalQuestions > 0 ? Math.round((matchScore / totalQuestions) * 100) : 0;
        
        results.push({
          pair: [playerA, playerB],
          compatibility,
          matchScore,
          totalQuestions,
          categoryScores,
          level: getCompatibilityLevel(compatibility)
        });
      }
    }

    setCompatibilityResults(results);
  };

  const getCompatibilityLevel = (score) => {
    if (score >= 90) return { level: "Soulmates", color: "text-purple-500", emoji: "💫" };
    if (score >= 80) return { level: "Perfect Match", color: "text-pink-500", emoji: "💖" };
    if (score >= 70) return { level: "Great Match", color: "text-red-500", emoji: "❤️" };
    if (score >= 60) return { level: "Good Match", color: "text-orange-500", emoji: "💕" };
    if (score >= 50) return { level: "Okay Match", color: "text-yellow-500", emoji: "💛" };
    return { level: "Not Compatible", color: "text-gray-500", emoji: "💔" };
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  if (!gameState.gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Heart className="w-12 h-12 text-pink-500" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Compatibility Test
              </h1>
            </div>
            <p className="text-gray-600 text-lg">
              Discover how well you know each other through fun questions!
            </p>
          </motion.div>

          {/* Players List */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
          >
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Players in Room ({gameState.players.length})
              </h2>
              <div className="space-y-3">
                {gameState.players.map((p, index) => (
                  <motion.div
                    key={p.socketId}
                    variants={itemVariants}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      p.isHost ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-gray-500">
                        {p.isHost ? 'Host' : 'Player'}
                      </p>
                    </div>
                    {p.isHost && (
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Game Info */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Game Information
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-gray-700">Questions</span>
                  <span className="font-semibold">{compatibilityQuestions.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-700">Time per Question</span>
                  <span className="font-semibold">30 seconds</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="text-gray-700">Minimum Players</span>
                  <span className="font-semibold">2</span>
                </div>
              </div>

              {player.isHost && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startGame}
                  disabled={gameState.players.length < 2}
                  className={`w-full mt-6 py-4 rounded-xl font-semibold text-white transition-all ${
                    gameState.players.length < 2
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg'
                  }`}
                >
                  Start Game ({gameState.players.length}/∞ players)
                </motion.button>
              )}

              {!player.isHost && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center mt-6 p-4 bg-purple-50 rounded-lg"
                >
                  <p className="text-purple-700">
                    Waiting for host to start the game...
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Quick Chat */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Quick Chat
            </h2>
            <ChatSection
              messages={chatMessages}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              onSendMessage={sendMessage}
              onTyping={handleTyping}
              typingUsers={typingUsers}
              chatContainerRef={chatContainerRef}
            />
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === 'playing') {
    const currentQuestion = compatibilityQuestions[gameState.currentQuestion];

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Game Header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl p-6 shadow-lg mb-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                  {gameState.currentQuestion + 1}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Question {gameState.currentQuestion + 1} of {compatibilityQuestions.length}
                  </h2>
                  <p className="text-gray-600">{currentQuestion.category}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Timer */}
                <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-full">
                  <Clock className="w-5 h-5 text-red-500" />
                  <span className="font-mono font-bold text-red-600">
                    {timer}s
                  </span>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${((gameState.currentQuestion + 1) / compatibilityQuestions.length) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {gameState.currentQuestion + 1}/{compatibilityQuestions.length}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Question Section */}
            <div className="lg:col-span-2">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl p-8 shadow-lg"
              >
                <div className="mb-2">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {currentQuestion.category}
                  </span>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-800 mb-8">
                  {currentQuestion.question}
                </h1>

                <div className="space-y-4">
                  {currentQuestion.options.map((option, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedAnswer(option)}
                      className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                        selectedAnswer === option
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedAnswer === option
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedAnswer === option && (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <span className="font-medium text-gray-700">{option}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="flex gap-4 mt-8">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={submitAnswers}
                    disabled={!selectedAnswer}
                    className={`flex-1 py-4 rounded-xl font-semibold text-white transition-all ${
                      !selectedAnswer
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg'
                    }`}
                  >
                    Submit Answer
                  </motion.button>
                </div>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Players Progress */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Players Progress
                </h3>
                <div className="space-y-3">
                  {gameState.players.map((p) => (
                    <div key={p.socketId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center justify-center text-white text-sm font-medium">
                          {p.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${gameState.playerProgress[p.name] || 0}%`
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8">
                          {gameState.playerProgress[p.name] || 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Reactions */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="font-semibold text-gray-800 mb-4">Quick Reactions</h3>
                <div className="grid grid-cols-4 gap-2">
                  {['❤️', '😂', '😮', '😢', '🔥', '👏', '🎉', '💯'].map((reaction) => (
                    <motion.button
                      key={reaction}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => sendReaction(reaction)}
                      className="p-2 text-xl hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {reaction}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Chat Section */}
              <div className="bg-white rounded-2xl shadow-lg">
                <ChatSection
                  messages={chatMessages}
                  newMessage={newMessage}
                  setNewMessage={setNewMessage}
                  onSendMessage={sendMessage}
                  onTyping={handleTyping}
                  typingUsers={typingUsers}
                  chatContainerRef={chatContainerRef}
                  compact={true}
                />
              </div>
            </div>
          </div>

          {/* Floating Reactions */}
          <AnimatePresence>
            {reactions.map((reaction) => (
              <motion.div
                key={reaction.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  y: -100 
                }}
                exit={{ scale: 0, opacity: 0 }}
                className="fixed text-2xl pointer-events-none"
                style={{
                  left: `${reaction.position.x}%`,
                  top: `${reaction.position.y}%`
                }}
              >
                {reaction.reaction}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (gamePhase === 'results' && compatibilityResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Results Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <TrendingUp className="w-12 h-12 text-emerald-500" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Compatibility Results
              </h1>
            </div>
            <p className="text-gray-600 text-lg">
              Discover how well you match with other players!
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Compatibility Results */}
            {compatibilityResults.map((result, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-lg"
              >
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      {result.pair[0].charAt(0)}
                    </div>
                    <Heart className="w-6 h-6 text-pink-500" />
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                      {result.pair[1].charAt(0)}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {result.pair[0]} & {result.pair[1]}
                  </h3>
                </div>

                {/* Compatibility Score */}
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full text-white font-bold text-xl">
                    <span>{result.compatibility}%</span>
                    <span>{result.level.emoji}</span>
                  </div>
                  <p className={`text-sm font-medium mt-2 ${result.level.color}`}>
                    {result.level.level}
                  </p>
                </div>

                {/* Match Details */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Questions Matched:</span>
                    <span className="font-semibold">
                      {result.matchScore}/{result.totalQuestions}
                    </span>
                  </div>
                  {Object.entries(result.categoryScores).map(([category, score]) => (
                    <div key={category} className="flex justify-between">
                      <span>{category}:</span>
                      <span className="font-semibold">{score} matches</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            {gameState.currentQuestion < compatibilityQuestions.length - 1 ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={nextQuestion}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Next Question
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onLeaveGame}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Finish Game
              </motion.button>
            )}
          </div>

          {/* Chat Section */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg">
            <ChatSection
              messages={chatMessages}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              onSendMessage={sendMessage}
              onTyping={handleTyping}
              typingUsers={typingUsers}
              chatContainerRef={chatContainerRef}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Chat Component
const ChatSection = ({
  messages,
  newMessage,
  setNewMessage,
  onSendMessage,
  onTyping,
  typingUsers,
  chatContainerRef,
  compact = false
}) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className={`${compact ? 'h-64' : 'h-96'} flex flex-col`}>
      <div className="flex items-center gap-2 p-4 border-b">
        <MessageCircle className="w-5 h-5" />
        <h3 className="font-semibold">Chat</h3>
        {typingUsers.length > 0 && (
          <div className="text-sm text-gray-500 ml-2">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className="flex flex-col space-y-1"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-700">
                {message.sender}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="bg-gray-100 rounded-lg px-3 py-2 max-w-xs">
              <p className="text-gray-800 text-sm">{message.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              onTyping();
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={onSendMessage}
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompatibilityGame;