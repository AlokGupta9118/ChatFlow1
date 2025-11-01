// components/Compatibility.tsx
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Users, 
  MessageCircle, 
  Send, 
  Clock, 
  CheckCircle, 
  X, 
  ArrowLeft,
  Share2,
  Download,
  Heart,
  Star,
  Target,
  BarChart3,
  Sparkles,
  Trophy,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

const DEFAULT_SOCKET_URL = `${import.meta.env.VITE_API_URL}`;

interface Player {
  name: string;
  socketId: string;
  isHost: boolean;
  avatar?: string;
}

interface Question {
  id: number;
  text: string;
  type: 'scale' | 'multiple' | 'text';
  options?: string[];
}

interface AdvancedQuestions {
  personalityTraits: {
    question: string;
    type: string;
    options: string[];
  };
  lifestyle: {
    sleepSchedule: {
      question: string;
      options: string[];
    };
    socialActivity: {
      question: string;
      options: string[];
    };
  };
  communication: {
    style: {
      question: string;
      options: string[];
    };
    conflictResolution: {
      question: string;
      options: string[];
    };
  };
  interests: {
    hobbies: {
      question: string;
      options: string[];
    };
  };
  values: {
    family: {
      question: string;
      options: string[];
    };
    career: {
      question: string;
      options: string[];
    };
  };
}

interface CompatibilityResults {
  score: number;
  breakdown: {
    values: number;
    personality: number;
    lifestyle: number;
    communication: number;
    interests: number;
  };
  insights: string[];
  advancedFactors: any;
  playerAnswers: any;
  matchLevel: string;
  recommendations: string[];
}

interface ChatMessage {
  _id: string;
  sender: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: string;
  chatType: string;
  roomId: string;
}

const Compatibility: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'results'>('waiting');
  
  // Game state
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [advancedQuestions, setAdvancedQuestions] = useState<AdvancedQuestions | null>(null);
  const [answers, setAnswers] = useState<any>({});
  const [advancedAnswers, setAdvancedAnswers] = useState<any>({});
  const [playerProgress, setPlayerProgress] = useState<{[key: string]: number}>({});
  const [submissionStatus, setSubmissionStatus] = useState<{[key: string]: boolean}>({});
  
  // UI state
  const [showChat, setShowChat] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [results, setResults] = useState<CompatibilityResults | null>(null);
  const [waitingForPlayers, setWaitingForPlayers] = useState<string[]>([]);
  
  // Advanced section state
  const [currentAdvancedSection, setCurrentAdvancedSection] = useState<string>('');
  const [advancedProgress, setAdvancedProgress] = useState<number>(0);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(DEFAULT_SOCKET_URL);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Room events
    socket.on('compatibility-room-created', (room) => {
      setRoomId(room.roomId);
      setPlayers(room.players);
      setIsHost(true);
      setQuestions(room.questions || []);
      setAdvancedQuestions(room.advancedQuestions || null);
    });

    socket.on('compatibility-room-joined', (room) => {
      setRoomId(room.roomId);
      setPlayers(room.players);
      setIsHost(room.players.find((p: Player) => p.socketId === socket.id)?.isHost || false);
      setQuestions(room.questions || []);
      setAdvancedQuestions(room.advancedQuestions || null);
    });

    socket.on('compatibility-update-players', (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    // Game events
    socket.on('compatibility-game-started', (data) => {
      setGameStarted(true);
      setGameStatus('playing');
      setCurrentQuestion(data.currentQuestion);
      setTimeLeft(30);
    });

    socket.on('compatibility-next-question', (data) => {
      setCurrentQuestion(data.questionIndex);
      setTimeLeft(data.timeLeft);
    });

    socket.on('compatibility-all-answered', (data) => {
      setCurrentQuestion(data.nextQuestionIndex);
      setTimeLeft(data.timeLeft);
    });

    socket.on('compatibility-regular-completed', (data) => {
      setAdvancedQuestions(data.advancedQuestions);
      setGameStatus('advanced');
    });

    socket.on('compatibility-player-progress', (data) => {
      setPlayerProgress(prev => ({
        ...prev,
        [data.player]: data.progress
      }));
    });

    socket.on('compatibility-waiting-for-players', (data) => {
      setWaitingForPlayers(data.waitingFor);
    });

    socket.on('compatibility-show-results', (resultsData) => {
      setResults(resultsData);
      setGameStatus('results');
    });

    socket.on('compatibility-submission-update', (data) => {
      setSubmissionStatus(prev => ({
        ...prev,
        [data.player]: data.submitted
      }));
    });

    // Chat events
    socket.on('chat-history', (messages) => {
      setChatMessages(messages);
    });

    socket.on('receive-chat-message', (message) => {
      setChatMessages(prev => [...prev, message]);
    });

    socket.on('user-typing', (data) => {
      if (data.isTyping) {
        setTypingUsers(prev => [...prev.filter(u => u !== data.userName), data.userName]);
      } else {
        setTypingUsers(prev => prev.filter(u => u !== data.userName));
      }
    });

    // Time sync
    socket.on('time-sync', (time) => {
      setTimeLeft(time);
    });

    // Error handling
    socket.on('join-error', (error) => {
      alert(`Join error: ${error}`);
    });

    socket.on('start-error', (error) => {
      alert(`Start error: ${error}`);
    });

  }, [socket]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Timer effect
  useEffect(() => {
    if (gameStatus !== 'playing' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStatus, timeLeft]);

  // Room management
  const createRoom = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    
    socket?.emit('create-compatibility-room', {
      player: { name: playerName, socketId: socket.id }
    });
  };

  const joinRoom = () => {
    if (!playerName.trim() || !roomId.trim()) {
      alert('Please enter your name and room ID');
      return;
    }

    socket?.emit('join-compatibility-room', {
      roomId,
      player: { name: playerName, socketId: socket.id }
    });
  };

  const startGame = () => {
    socket?.emit('start-compatibility-game', { roomId });
  };

  // Game actions
  const submitAnswer = (answer: any) => {
    socket?.emit('compatibility-answer-submitted', {
      roomId,
      questionIndex: currentQuestion,
      answer
    });
  };

  const submitAdvancedAnswer = (category: string, answers: any) => {
    socket?.emit('compatibility-advanced-answers', {
      roomId,
      category,
      answers
    });
  };

  const submitFinal = () => {
    socket?.emit('compatibility-submit-final', { roomId });
  };

  // Chat functions
  const sendMessage = () => {
    if (!newMessage.trim()) return;

    socket?.emit('send-gamechat-message', {
      roomId,
      message: {
        sender: playerName,
        senderId: socket?.id,
        content: newMessage,
        type: 'text'
      },
      chatType: 'game'
    });

    setNewMessage('');
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit('typing', { roomId, userId: socket.id, userName: playerName });
    }
  };

  const handleStopTyping = () => {
    setIsTyping(false);
    socket?.emit('chat-typing-stop', { roomId, userId: socket.id });
  };

  // UI Components
  const renderLobby = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Compatibility Test</h1>
          <p className="text-gray-600">Discover your connection with friends</p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room ID (if joining)
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
              placeholder="Enter room code"
            />
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={createRoom}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg"
          >
            Create New Room
          </button>
          
          <button
            onClick={joinRoom}
            className="w-full border-2 border-purple-500 text-purple-600 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-all duration-200"
          >
            Join Existing Room
          </button>
        </div>

        {roomId && (
          <div className="mt-6 p-4 bg-purple-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-700">Room Code:</span>
              <span className="font-mono text-lg font-bold text-purple-900">{roomId}</span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(roomId)}
              className="w-full mt-2 text-sm text-purple-600 hover:text-purple-700 flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Copy Room Code
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderWaitingRoom = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Compatibility Test</h1>
                <p className="text-gray-600">Room: <span className="font-mono font-semibold">{roomId}</span></p>
              </div>
            </div>
            <button
              onClick={() => setShowChat(!showChat)}
              className="p-3 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 transition-colors relative"
            >
              <MessageCircle className="w-6 h-6" />
              {chatMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {chatMessages.length}
                </span>
              )}
            </button>
          </div>

          {/* Players List */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-800">
                Players ({players.length}/2)
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {players.map((player, index) => (
                <div
                  key={player.socketId}
                  className={`p-4 rounded-xl border-2 ${
                    player.isHost 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{player.name}</p>
                      <p className="text-sm text-gray-600">
                        {player.isHost ? 'Host' : 'Player'}
                      </p>
                    </div>
                    {player.isHost && (
                      <Crown className="w-5 h-5 text-yellow-500 ml-auto" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Start Game Button */}
          {isHost && players.length === 2 && (
            <button
              onClick={startGame}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-semibold text-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg flex items-center justify-center gap-3"
            >
              <Sparkles className="w-6 h-6" />
              Start Compatibility Test
            </button>
          )}

          {isHost && players.length < 2 && (
            <div className="text-center py-6">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">
                Waiting for {2 - players.length} more player{2 - players.length > 1 ? 's' : ''} to join...
              </p>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Chat</h3>
              <button
                onClick={() => setShowChat(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div 
              ref={chatContainerRef}
              className="h-64 overflow-y-auto mb-4 space-y-3 p-2"
            >
              {chatMessages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${message.sender === playerName ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      message.sender === playerName
                        ? 'bg-purple-500 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm font-medium">{message.sender}</p>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {typingUsers.length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl rounded-bl-none">
                    <p className="text-sm italic">
                      {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </p>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onBlur={handleStopTyping}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage();
                    handleStopTyping();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderQuestion = (question: Question) => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Question {currentQuestion + 1}</h1>
              <p className="text-gray-600">of {questions.length}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-orange-500 mb-1">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">{timeLeft}s</span>
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${(timeLeft / 30) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
              {question.text}
            </h2>
            
            {question.type === 'scale' && question.options && (
              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => submitAnswer(index)}
                    className="w-full p-4 text-left bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-semibold">
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-800">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Players Progress */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Players Progress</h3>
            <div className="space-y-2">
              {players.map(player => (
                <div key={player.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-800">{player.name}</span>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${playerProgress[player.name] || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Toggle */}
        <button
          onClick={() => setShowChat(!showChat)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-purple-500 text-white rounded-full shadow-lg hover:bg-purple-600 transition-colors flex items-center justify-center"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>

      {/* Chat Panel */}
      {showChat && renderChatPanel()}
    </div>
  );

  const renderAdvancedSection = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="text-center mb-8">
            <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Advanced Compatibility</h1>
            <p className="text-gray-600">Dive deeper into your personality and preferences</p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Advanced Section Progress</span>
              <span>{advancedProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-teal-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${advancedProgress}%` }}
              />
            </div>
          </div>

          {/* Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {advancedQuestions && Object.entries(advancedQuestions).map(([section, data]) => (
              <button
                key={section}
                onClick={() => setCurrentAdvancedSection(section)}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  currentAdvancedSection === section
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentAdvancedSection === section 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {getSectionIcon(section)}
                  </div>
                  <h3 className="font-semibold text-gray-800 capitalize">
                    {section.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                </div>
                <p className="text-sm text-gray-600">
                  {Object.keys(advancedAnswers[section] || {}).length > 0 
                    ? 'Completed' 
                    : 'Click to answer'
                  }
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Questions */}
        {currentAdvancedSection && advancedQuestions && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setCurrentAdvancedSection('')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-bold text-gray-800 capitalize">
                {currentAdvancedSection.replace(/([A-Z])/g, ' $1').trim()}
              </h2>
            </div>

            {renderAdvancedQuestions(currentAdvancedSection, advancedQuestions[currentAdvancedSection])}
          </div>
        )}

        {/* Submit Button */}
        <div className="text-center">
          <button
            onClick={submitFinal}
            className="bg-gradient-to-r from-green-500 to-teal-500 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:from-green-600 hover:to-teal-600 transition-all duration-200 shadow-lg flex items-center gap-3 mx-auto"
          >
            <CheckCircle className="w-6 h-6" />
            Complete Compatibility Test
          </button>
        </div>
      </div>
    </div>
  );

  const renderAdvancedQuestions = (section: string, questions: any) => {
    if (section === 'personalityTraits') {
      return (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-800">{questions.question}</h3>
          <div className="grid grid-cols-2 gap-3">
            {questions.options.map((trait: string, index: number) => (
              <button
                key={trait}
                onClick={() => {
                  const currentTraits = advancedAnswers[section]?.traits || [];
                  const newTraits = currentTraits.includes(trait)
                    ? currentTraits.filter((t: string) => t !== trait)
                    : [...currentTraits, trait];
                  
                  submitAdvancedAnswer(section, { traits: newTraits });
                }}
                className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${
                  (advancedAnswers[section]?.traits || []).includes(trait)
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                }`}
              >
                {trait}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Render other sections similarly...
    return (
      <div className="space-y-6">
        {Object.entries(questions).map(([key, subQuestion]: [string, any]) => (
          <div key={key} className="space-y-3">
            <h4 className="font-medium text-gray-800">{subQuestion.question}</h4>
            <div className="space-y-2">
              {subQuestion.options.map((option: string, index: number) => (
                <button
                  key={option}
                  onClick={() => {
                    submitAdvancedAnswer(section, {
                      ...advancedAnswers[section],
                      [key]: option
                    });
                  }}
                  className={`w-full p-3 text-left rounded-xl border-2 transition-all duration-200 ${
                    advancedAnswers[section]?.[key] === option
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderWaitingScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8 text-center">
        <Clock className="w-16 h-16 text-orange-500 mx-auto mb-6 animate-pulse" />
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Waiting for Players</h1>
        <p className="text-gray-600 mb-6">
          Waiting for {waitingForPlayers.join(', ')} to complete the test...
        </p>
        
        <div className="space-y-4">
          {players.map(player => (
            <div key={player.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="font-medium text-gray-800">{player.name}</span>
              {submissionStatus[player.name] ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <Clock className="w-6 h-6 text-orange-500 animate-pulse" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Compatibility Results</h1>
            <p className="text-xl text-gray-600 mb-6">{results.matchLevel}</p>
            
            {/* Score Circle */}
            <div className="relative inline-block mb-8">
              <div className="w-48 h-48 rounded-full border-8 border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl font-bold text-purple-600">{results.score}%</div>
                  <div className="text-sm text-gray-600">Compatibility Score</div>
                </div>
              </div>
              <div 
                className="absolute top-0 left-0 w-48 h-48 rounded-full border-8 border-transparent border-t-purple-500 border-r-pink-500 transform -rotate-45"
                style={{
                  clipPath: `conic-gradient(transparent 0%, transparent ${100 - results.score}%, purple ${100 - results.score}%, pink 100%)`
                }}
              />
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {Object.entries(results.breakdown).map(([category, score]) => (
                <div key={category} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-2 relative">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#eee"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="3"
                        strokeDasharray={`${score}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-800">{score}%</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-gray-700 capitalize">
                    {category}
                  </p>
                </div>
              ))}
            </div>

            {/* Insights */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Key Insights</h3>
              <div className="space-y-3">
                {results.insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                    <Sparkles className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-800 text-left">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Recommendations</h3>
              <div className="space-y-3">
                {results.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                    <Target className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-800 text-left">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.reload()}
              className="p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 transition-colors text-center"
            >
              <ArrowLeft className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <span className="font-medium text-gray-800">New Test</span>
            </button>
            
            <button
              onClick={() => {/* Implement share functionality */}}
              className="p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 transition-colors text-center"
            >
              <Share2 className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <span className="font-medium text-gray-800">Share Results</span>
            </button>
            
            <button
              onClick={() => {/* Implement screenshot functionality */}}
              className="p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 transition-colors text-center"
            >
              <Download className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <span className="font-medium text-gray-800">Save Results</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderChatPanel = () => (
    <div className="fixed bottom-20 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Game Chat</h3>
          <button
            onClick={() => setShowChat(false)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="h-64 overflow-y-auto p-4 space-y-3">
        {chatMessages.map((message) => (
          <div
            key={message._id}
            className={`flex ${message.sender === playerName ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-2xl ${
                message.sender === playerName
                  ? 'bg-purple-500 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}
            >
              <p className="text-xs font-medium opacity-80">{message.sender}</p>
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}
        
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-2xl rounded-bl-none">
              <p className="text-sm italic">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onBlur={handleStopTyping}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                sendMessage();
                handleStopTyping();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={sendMessage}
            className="px-3 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const getSectionIcon = (section: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      personalityTraits: <Star className="w-5 h-5" />,
      lifestyle: <Heart className="w-5 h-5" />,
      communication: <MessageCircle className="w-5 h-5" />,
      interests: <Sparkles className="w-5 h-5" />,
      values: <Target className="w-5 h-5" />
    };
    return icons[section] || <Star className="w-5 h-5" />;
  };

  // Main render logic
  if (!roomId) {
    return renderLobby();
  }

  if (!gameStarted) {
    return renderWaitingRoom();
  }

  if (gameStatus === 'results') {
    return renderResults();
  }

  if (waitingForPlayers.length > 0) {
    return renderWaitingScreen();
  }

  if (gameStatus === 'advanced') {
    return renderAdvancedSection();
  }

  if (questions[currentQuestion]) {
    return renderQuestion(questions[currentQuestion]);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
};

// Helper component for crown icon
const Crown: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L8 7 3 4 5 14 12 12 19 14 21 4 16 7 12 2Z"/>
  </svg>
);

export default Compatibility;