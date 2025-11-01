// components/Compatibility.tsx
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Users, 
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
  ChevronLeft,
  Crown,
  MessageCircle,
  Copy,
  AlertCircle
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

const Compatibility: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameStatus, setGameStatus] = useState<'lobby' | 'waiting' | 'playing' | 'advanced' | 'results' | 'waiting-for-players'>('lobby');
  
  // Game state
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [advancedQuestions, setAdvancedQuestions] = useState<AdvancedQuestions | null>(null);
  const [answers, setAnswers] = useState<any>({});
  const [advancedAnswers, setAdvancedAnswers] = useState<any>({});
  const [playerProgress, setPlayerProgress] = useState<{[key: string]: number}>({});
  const [submissionStatus, setSubmissionStatus] = useState<{[key: string]: boolean}>({});
  
  // UI state
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [results, setResults] = useState<CompatibilityResults | null>(null);
  const [waitingForPlayers, setWaitingForPlayers] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Advanced section state
  const [currentAdvancedSection, setCurrentAdvancedSection] = useState<string>('');
  const [advancedProgress, setAdvancedProgress] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(DEFAULT_SOCKET_URL, {
      transports: ['websocket']
    });
    
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Room events
    const handleRoomCreated = (room: any) => {
      console.log('Room created:', room);
      setRoomId(room.roomId);
      setPlayers(room.players);
      setIsHost(true);
      setQuestions(room.questions || []);
      setAdvancedQuestions(room.advancedQuestions || null);
      setError('');
      setLoading(false);
      setGameStatus('waiting'); // Move to waiting room after creation
    };

    const handleRoomJoined = (room: any) => {
      console.log('Room joined:', room);
      setRoomId(room.roomId);
      setPlayers(room.players);
      setIsHost(room.players.find((p: Player) => p.socketId === socket.id)?.isHost || false);
      setQuestions(room.questions || []);
      setAdvancedQuestions(room.advancedQuestions || null);
      setError('');
      setLoading(false);
      setGameStatus('waiting'); // Move to waiting room after joining
    };

    const handleUpdatePlayers = (updatedPlayers: Player[]) => {
      console.log('Players updated:', updatedPlayers);
      setPlayers(updatedPlayers);
    };

    // Game events
    const handleGameStarted = (data: any) => {
      console.log('Compatibility game started:', data);
      setGameStarted(true);
      setGameStatus('playing');
      setCurrentQuestion(data.currentQuestion || 0);
      setTimeLeft(data.timeLeft || 30);
    };

    const handleNextQuestion = (data: any) => {
      console.log('Next question:', data);
      setCurrentQuestion(data.questionIndex);
      setTimeLeft(data.timeLeft);
    };

    const handleAllAnswered = (data: any) => {
      console.log('All answered:', data);
      setCurrentQuestion(data.nextQuestionIndex);
      setTimeLeft(data.timeLeft);
    };

    const handleRegularCompleted = (data: any) => {
      console.log('Regular completed:', data);
      setAdvancedQuestions(data.advancedQuestions);
      setGameStatus('advanced');
    };

    const handlePlayerProgress = (data: any) => {
      console.log('Player progress:', data);
      setPlayerProgress(prev => ({
        ...prev,
        [data.player]: data.progress
      }));
    };

    const handleWaitingForPlayers = (data: any) => {
      console.log('Waiting for players:', data);
      setWaitingForPlayers(data.waitingFor);
      setGameStatus('waiting-for-players');
    };

    const handleShowResults = (resultsData: CompatibilityResults) => {
      console.log('Show results:', resultsData);
      setResults(resultsData);
      setGameStatus('results');
    };

    const handleSubmissionUpdate = (data: any) => {
      console.log('Submission update:', data);
      setSubmissionStatus(prev => ({
        ...prev,
        [data.player]: data.submitted
      }));
    };

    // Error handling
    const handleJoinError = (errorMsg: string) => {
      console.error('Join error:', errorMsg);
      setError(errorMsg);
      setLoading(false);
      // Stay in lobby on error
      setGameStatus('lobby');
    };

    const handleStartError = (errorMsg: string) => {
      console.error('Start error:', errorMsg);
      setError(errorMsg);
    };

    // Register event listeners
    socket.on('compatibility-room-created', handleRoomCreated);
    socket.on('compatibility-room-joined', handleRoomJoined);
    socket.on('compatibility-update-players', handleUpdatePlayers);
    socket.on('compatibility-game-started', handleGameStarted);
    socket.on('compatibility-next-question', handleNextQuestion);
    socket.on('compatibility-all-answered', handleAllAnswered);
    socket.on('compatibility-regular-completed', handleRegularCompleted);
    socket.on('compatibility-player-progress', handlePlayerProgress);
    socket.on('compatibility-waiting-for-players', handleWaitingForPlayers);
    socket.on('compatibility-show-results', handleShowResults);
    socket.on('compatibility-submission-update', handleSubmissionUpdate);
    socket.on('join-error', handleJoinError);
    socket.on('start-error', handleStartError);

    // Cleanup
    return () => {
      socket.off('compatibility-room-created', handleRoomCreated);
      socket.off('compatibility-room-joined', handleRoomJoined);
      socket.off('compatibility-update-players', handleUpdatePlayers);
      socket.off('compatibility-game-started', handleGameStarted);
      socket.off('compatibility-next-question', handleNextQuestion);
      socket.off('compatibility-all-answered', handleAllAnswered);
      socket.off('compatibility-regular-completed', handleRegularCompleted);
      socket.off('compatibility-player-progress', handlePlayerProgress);
      socket.off('compatibility-waiting-for-players', handleWaitingForPlayers);
      socket.off('compatibility-show-results', handleShowResults);
      socket.off('compatibility-submission-update', handleSubmissionUpdate);
      socket.off('join-error', handleJoinError);
      socket.off('start-error', handleStartError);
    };
  }, [socket]);

  // Timer effect
  useEffect(() => {
    if (gameStatus !== 'playing' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStatus, timeLeft]);

  // Auto-scroll to top on screen changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [gameStatus, currentQuestion, currentAdvancedSection]);

  // Room management
  const createRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setLoading(true);
    setError('');
    socket?.emit('create-compatibility-room', {
      player: { name: playerName, socketId: socket?.id }
    });
  };

  const joinRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomId.trim()) {
      setError('Please enter room ID');
      return;
    }

    setLoading(true);
    setError('');
    socket?.emit('join-compatibility-room', {
      roomId: roomId.toUpperCase(),
      player: { name: playerName, socketId: socket?.id }
    });
  };

  const startGame = () => {
    if (players.length !== 2) {
      setError('Compatibility game requires exactly 2 players');
      return;
    }
    socket?.emit('start-compatibility-game', { roomId });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    if (roomId) {
      socket?.emit('leave-room', roomId);
    }
    setRoomId('');
    setPlayers([]);
    setGameStarted(false);
    setGameStatus('lobby');
    setError('');
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
    const newAdvancedAnswers = {
      ...advancedAnswers,
      [category]: answers
    };
    setAdvancedAnswers(newAdvancedAnswers);

    // Calculate progress
    const completedSections = Object.keys(newAdvancedAnswers).length;
    const totalSections = 5; // personality, lifestyle, communication, interests, values
    const progress = Math.round((completedSections / totalSections) * 100);
    setAdvancedProgress(progress);

    socket?.emit('compatibility-advanced-answers', {
      roomId,
      category,
      answers
    });
  };

  const submitFinal = () => {
    socket?.emit('compatibility-submit-final', { roomId });
  };

  const captureScreenshot = () => {
    // Simple screenshot simulation - in real app, use html2canvas
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 20px; color: white; text-align: center;">
        <h1>Compatibility Results</h1>
        <h2>Score: ${results?.score}% - ${results?.matchLevel}</h2>
        <p>Room: ${roomId}</p>
        <p>Players: ${players.map(p => p.name).join(' & ')}</p>
      </div>
    `;
    alert('Screenshot captured! In a real app, this would save or share the results.');
  };

  // UI Components
  const renderLobby = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6 border border-white/20">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
            <Heart className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Compatibility Test</h1>
          <p className="text-white/80">Discover your connection with a friend</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-white text-center text-sm flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-white text-sm font-semibold mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-2">
              Room ID (to join existing room)
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent font-mono uppercase"
              placeholder="Enter room code"
            />
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={createRoom}
            disabled={loading}
            className="w-full bg-white text-purple-600 py-3 rounded-xl font-bold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
          >
            {loading ? 'Creating Room...' : 'Create New Room'}
          </button>
          
          <button
            onClick={joinRoom}
            disabled={loading || !roomId.trim()}
            className="w-full bg-transparent border-2 border-white text-white py-3 rounded-xl font-bold hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? 'Joining Room...' : 'Join Room'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderWaitingRoom = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6 mb-6 border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={leaveRoom}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 border border-white/20"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Compatibility Test</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-white/80">Room:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{roomId}</span>
                    <button
                      onClick={copyRoomCode}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Copy room code"
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl border border-white/20">
              <Users className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">{players.length}/2 Players</span>
            </div>
          </div>

          {/* Players List */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-4 text-center">Waiting for Players</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {players.map((player) => (
                <div
                  key={player.socketId}
                  className={`p-4 rounded-xl border-2 backdrop-blur-sm ${
                    player.isHost 
                      ? 'border-yellow-400 bg-yellow-500/20' 
                      : 'border-white/30 bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-lg font-bold text-white">{player.name}</p>
                        {player.isHost && (
                          <Crown className="w-4 h-4 text-yellow-400 fill-current" />
                        )}
                      </div>
                      <p className="text-white/80 text-sm">
                        {player.isHost ? 'Room Host' : 'Player'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Empty player slots */}
              {Array.from({ length: 2 - players.length }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="p-4 rounded-xl border-2 border-dashed border-white/20 bg-white/5 text-center"
                >
                  <Users className="w-8 h-8 text-white/40 mx-auto mb-2" />
                  <p className="text-white/60 text-sm">Waiting for player...</p>
                </div>
              ))}
            </div>
          </div>

          {/* Start Game Button */}
          {isHost && (
            <div className="text-center">
              <button
                onClick={startGame}
                disabled={players.length !== 2}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
                  players.length === 2
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-xl hover:from-green-600 hover:to-emerald-600'
                    : 'bg-gray-500/50 text-white/60 cursor-not-allowed'
                }`}
              >
                {players.length === 2 ? (
                  <div className="flex items-center gap-2 justify-center">
                    <Sparkles className="w-5 h-5" />
                    Start Compatibility Test
                  </div>
                ) : (
                  `Need ${2 - players.length} more player${2 - players.length > 1 ? 's' : ''}`
                )}
              </button>
            </div>
          )}

          {!isHost && players.length < 2 && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-3 bg-white/10 rounded-xl border border-white/20">
                <Clock className="w-5 h-5 text-white animate-pulse" />
                <p className="text-white font-semibold text-sm">Waiting for host to start the game...</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-white text-center mb-6">
            {error}
          </div>
        )}
      </div>
    </div>
  );

  const renderQuestion = (question: Question) => (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6 mb-6 border border-white/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Question {currentQuestion + 1} of {questions.length}
              </h1>
              <div className="w-40 bg-white/20 rounded-full h-2">
                <div 
                  className="bg-green-400 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-center lg:text-right">
              <div className="flex items-center gap-2 text-white mb-2 justify-center lg:justify-end">
                <Clock className="w-5 h-5" />
                <span className="text-xl font-bold">{timeLeft}s</span>
              </div>
              <div className="w-40 bg-white/20 rounded-full h-2 mx-auto lg:mx-0">
                <div 
                  className="bg-orange-400 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${(timeLeft / 30) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white/5 border border-white/20 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white text-center leading-relaxed">
              {question.text}
            </h2>
          </div>
          
          {/* Options */}
          {question.type === 'scale' && question.options && (
            <div className="space-y-3 max-w-2xl mx-auto">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => submitAnswer(index)}
                  className="w-full p-4 text-left bg-white/5 border-2 border-white/20 rounded-xl hover:border-purple-300 hover:bg-white/10 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white font-bold text-sm group-hover:bg-purple-500 transition-colors">
                      {index + 1}
                    </div>
                    <span className="text-lg font-semibold text-white flex-1">{option}</span>
                    <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Players Progress */}
          <div className="mt-8 pt-4 border-t border-white/20">
            <h3 className="text-base font-semibold text-white mb-3 text-center">Players Progress</h3>
            <div className="grid grid-cols-1 gap-3 max-w-2xl mx-auto">
              {players.map(player => (
                <div key={player.name} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{player.name}</span>
                  </div>
                  <div className="w-20 bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-green-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${playerProgress[player.name] || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Back Button */}
        <button 
          onClick={leaveRoom}
          className="fixed bottom-6 left-6 p-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderAdvancedSection = () => (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6 mb-6 border border-white/20">
          <div className="text-center mb-6">
            <Sparkles className="w-12 h-12 text-white mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white mb-2">Advanced Compatibility</h1>
            <p className="text-white/80">Dive deeper into your personality and preferences</p>
          </div>

          {/* Progress */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="flex justify-between text-white font-semibold mb-2 text-sm">
              <span>Advanced Section Progress</span>
              <span>{advancedProgress}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-teal-400 to-cyan-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${advancedProgress}%` }}
              />
            </div>
          </div>

          {/* Sections Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {advancedQuestions && Object.entries(advancedQuestions).map(([section, data]) => (
              <button
                key={section}
                onClick={() => setCurrentAdvancedSection(section)}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  currentAdvancedSection === section
                    ? 'border-white bg-white/20'
                    : 'border-white/20 bg-white/10 hover:border-white/40'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    currentAdvancedSection === section 
                      ? 'bg-white text-cyan-600' 
                      : 'bg-white/10 text-white'
                  }`}>
                    {getSectionIcon(section)}
                  </div>
                  <h3 className="text-base font-bold text-white capitalize flex-1">
                    {section.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                </div>
                <p className={`text-xs ${
                  currentAdvancedSection === section ? 'text-white/90' : 'text-white/70'
                }`}>
                  {advancedAnswers[section] ? '✓ Completed' : 'Click to answer'}
                </p>
              </button>
            ))}
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              onClick={submitFinal}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-8 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 flex items-center gap-2 mx-auto"
            >
              <CheckCircle className="w-5 h-5" />
              Complete Compatibility Test
            </button>
          </div>
        </div>

        {/* Back Button */}
        <button 
          onClick={leaveRoom}
          className="fixed bottom-6 left-6 p-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Advanced Questions Modal */}
        {currentAdvancedSection && advancedQuestions && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
              <div className="p-4 border-b border-white/20">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentAdvancedSection('')}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/20"
                  >
                    <ArrowLeft className="w-4 h-4 text-white" />
                  </button>
                  <h2 className="text-lg font-bold text-white capitalize">
                    {currentAdvancedSection.replace(/([A-Z])/g, ' $1').trim()}
                  </h2>
                  <button
                    onClick={() => setCurrentAdvancedSection('')}
                    className="ml-auto p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/20"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                {renderAdvancedQuestions(currentAdvancedSection, advancedQuestions[currentAdvancedSection])}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderAdvancedQuestions = (section: string, questions: any) => {
    if (section === 'personalityTraits') {
      return (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-white mb-4 text-center">{questions.question}</h3>
          <div className="grid grid-cols-2 gap-3">
            {questions.options.map((trait: string) => (
              <button
                key={trait}
                onClick={() => {
                  const currentTraits = advancedAnswers[section]?.traits || [];
                  const newTraits = currentTraits.includes(trait)
                    ? currentTraits.filter((t: string) => t !== trait)
                    : [...currentTraits, trait];
                  
                  submitAdvancedAnswer(section, { traits: newTraits });
                }}
                className={`p-3 rounded-lg border-2 text-center transition-all duration-200 text-sm ${
                  (advancedAnswers[section]?.traits || []).includes(trait)
                    ? 'border-green-400 bg-green-500/20 text-white'
                    : 'border-white/20 bg-white/5 text-white/80 hover:border-white/40'
                }`}
              >
                {trait}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {Object.entries(questions).map(([key, subQuestion]: [string, any]) => (
          <div key={key} className="space-y-3">
            <h4 className="text-base font-semibold text-white">{subQuestion.question}</h4>
            <div className="space-y-2">
              {subQuestion.options.map((option: string) => (
                <button
                  key={option}
                  onClick={() => {
                    submitAdvancedAnswer(section, {
                      ...advancedAnswers[section],
                      [key]: option
                    });
                  }}
                  className={`w-full p-3 text-left rounded-lg border-2 transition-all duration-200 ${
                    advancedAnswers[section]?.[key] === option
                      ? 'border-purple-400 bg-purple-500/20 text-white'
                      : 'border-white/20 bg-white/5 text-white/80 hover:border-white/40'
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

  const renderWaitingForPlayers = () => (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 text-center border border-white/20">
        <Clock className="w-16 h-16 text-white mx-auto mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold text-white mb-3">Waiting for Players</h1>
        <p className="text-white/80 mb-6">
          Waiting for {waitingForPlayers.join(', ')} to complete the test...
        </p>
        
        <div className="space-y-3">
          {players.map(player => (
            <div key={player.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center text-white font-semibold">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-white font-semibold">{player.name}</span>
              </div>
              {submissionStatus[player.name] ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <Clock className="w-6 h-6 text-amber-400 animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* Back Button */}
        <button 
          onClick={leaveRoom}
          className="mt-6 p-3 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors flex items-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Leave Game
        </button>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 text-center mb-6 border border-white/20">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Compatibility Results</h1>
            <p className="text-xl text-white/80 mb-6">{results.matchLevel}</p>
            
            {/* Score Circle */}
            <div className="relative inline-block mb-8">
              <div className="w-48 h-48 rounded-full border-8 border-white/20 flex items-center justify-center shadow-lg">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white">{results.score}%</div>
                  <div className="text-white/80 mt-1">Compatibility Score</div>
                </div>
              </div>
              <div 
                className="absolute top-0 left-0 w-48 h-48 rounded-full border-8 border-transparent border-t-purple-300 border-r-pink-300 transform -rotate-45"
                style={{
                  clipPath: `conic-gradient(transparent 0%, transparent ${100 - results.score}%, purple ${100 - results.score}%, pink 100%)`
                }}
              />
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 max-w-2xl mx-auto">
              {Object.entries(results.breakdown).map(([category, score]) => (
                <div key={category} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-2 relative">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#ffffff40"
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
                      <span className="text-sm font-bold text-white">{score}%</span>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-white capitalize">
                    {category}
                  </p>
                </div>
              ))}
            </div>

            {/* Insights */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-4">Key Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {results.insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                    <Sparkles className="w-5 h-5 text-purple-300 mt-0.5 flex-shrink-0" />
                    <p className="text-white text-left text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-white mb-4">Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                    <Target className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                    <p className="text-white text-left text-sm">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={leaveRoom}
              className="p-4 bg-white/10 border-2 border-white/20 rounded-xl hover:border-white/40 transition-all duration-200 text-center group"
            >
              <ArrowLeft className="w-6 h-6 text-white mx-auto mb-2 group-hover:-translate-x-1 transition-transform" />
              <span className="text-white font-semibold">New Test</span>
            </button>
            
            <button
              onClick={copyRoomCode}
              className="p-4 bg-white/10 border-2 border-white/20 rounded-xl hover:border-white/40 transition-all duration-200 text-center"
            >
              <Share2 className="w-6 h-6 text-white mx-auto mb-2" />
              <span className="text-white font-semibold">
                {copied ? 'Copied!' : 'Share Results'}
              </span>
            </button>
            
            <button
              onClick={captureScreenshot}
              className="p-4 bg-white/10 border-2 border-white/20 rounded-xl hover:border-white/40 transition-all duration-200 text-center"
            >
              <Download className="w-6 h-6 text-white mx-auto mb-2" />
              <span className="text-white font-semibold">Save Results</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

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
  return (
    <div ref={containerRef} className="h-screen overflow-y-auto bg-gray-900">
      {gameStatus === 'lobby' ? renderLobby() :
       gameStatus === 'waiting' ? renderWaitingRoom() :
       gameStatus === 'results' ? renderResults() :
       gameStatus === 'waiting-for-players' ? renderWaitingForPlayers() :
       gameStatus === 'advanced' ? renderAdvancedSection() :
       gameStatus === 'playing' && questions[currentQuestion] ? renderQuestion(questions[currentQuestion]) :
       <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
         <div className="text-center">
           <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
           <p className="text-white text-lg">Loading game...</p>
         </div>
       </div>
      }
    </div>
  );
};

export default Compatibility;