// components/games/CompatibilityGame.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { io, Socket } from 'socket.io-client';

interface Player {
  name: string;
  socketId: string;
  isHost: boolean;
  avatar?: string;
}

interface Question {
  id: number;
  text: string;
  type: string;
  options: string[];
}

interface AdvancedQuestions {
  personalityTraits: any;
  lifestyle: any;
  communication: any;
  interests: any;
  values: any;
}

interface Room {
  roomId: string;
  players: Player[];
  status: string;
  gameType: string;
  gameStarted: boolean;
  currentQuestion: number;
  questions: Question[];
  advancedQuestions: AdvancedQuestions;
  playerProgress: { [key: string]: number };
  answers: { [key: string]: any };
  submissionStatus: { [key: string]: boolean };
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

const CompatibilityGame: React.FC = () => {
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentView, setCurrentView] = useState<'lobby' | 'game' | 'results' | 'waiting'>('lobby');
  const [room, setRoom] = useState<Room | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Game state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<any>({ regular: [], advancedAnswers: {} });
  const [playerProgress, setPlayerProgress] = useState(0);
  const [otherPlayerProgress, setOtherPlayerProgress] = useState(0);
  const [waitingForPlayers, setWaitingForPlayers] = useState<string[]>([]);
  const [results, setResults] = useState<CompatibilityResults | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
    setSocket(newSocket);

    // Load player name from localStorage
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
      setPlayerName(savedName);
    }

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Room events
    socket.on('compatibility-room-created', (roomData: Room) => {
      setRoom(roomData);
      setCurrentView('lobby');
      setSuccess('Room created successfully!');
      setIsCreating(false);
    });

    socket.on('compatibility-room-joined', (roomData: Room) => {
      setRoom(roomData);
      setCurrentView('lobby');
      setSuccess('Joined room successfully!');
      setIsJoining(false);
    });

    socket.on('join-error', (errorMsg: string) => {
      setError(errorMsg);
      setIsCreating(false);
      setIsJoining(false);
    });

    socket.on('compatibility-update-players', (players: Player[]) => {
      if (room) {
        setRoom({ ...room, players });
      }
    });

    // Game events
    socket.on('compatibility-game-started', (data: any) => {
      setCurrentView('game');
      setCurrentQuestionIndex(0);
      setTimeLeft(30);
    });

    socket.on('compatibility-next-question', (data: any) => {
      setCurrentQuestionIndex(data.questionIndex);
      setTimeLeft(data.timeLeft);
    });

    socket.on('compatibility-all-answered', (data: any) => {
      setCurrentQuestionIndex(data.nextQuestionIndex);
      setTimeLeft(data.timeLeft);
    });

    socket.on('compatibility-regular-completed', (data: any) => {
      setCurrentView('advanced');
    });

    socket.on('compatibility-player-progress', (data: any) => {
      if (data.player !== playerName) {
        setOtherPlayerProgress(data.progress);
      }
    });

    socket.on('compatibility-waiting-for-players', (data: any) => {
      setWaitingForPlayers(data.waitingFor);
      setCurrentView('waiting');
    });

    socket.on('compatibility-submission-update', (data: any) => {
      // Update submission status
    });

    socket.on('compatibility-show-results', (resultsData: CompatibilityResults) => {
      setResults(resultsData);
      setCurrentView('results');
    });

    socket.on('compatibility-time-up', () => {
      // Handle time up
      if (currentQuestionIndex < (room?.questions.length || 0) - 1) {
        handleNextQuestion();
      }
    });

    // Chat events
    socket.on('receive-chat-message', (message: any) => {
      setChatMessages(prev => [...prev, message]);
    });

    socket.on('chat-history', (messages: any[]) => {
      setChatMessages(messages);
    });

    socket.on('user-typing', (data: any) => {
      if (data.userName !== playerName) {
        setTypingUser(data.userName);
        setIsTyping(data.isTyping);
      }
    });

    // Cleanup on unmount
    return () => {
      socket.off('compatibility-room-created');
      socket.off('compatibility-room-joined');
      socket.off('join-error');
      socket.off('compatibility-update-players');
      socket.off('compatibility-game-started');
      socket.off('compatibility-next-question');
      socket.off('compatibility-all-answered');
      socket.off('compatibility-regular-completed');
      socket.off('compatibility-player-progress');
      socket.off('compatibility-waiting-for-players');
      socket.off('compatibility-submission-update');
      socket.off('compatibility-show-results');
      socket.off('compatibility-time-up');
      socket.off('receive-chat-message');
      socket.off('chat-history');
      socket.off('user-typing');
    };
  }, [socket, room, playerName, currentQuestionIndex]);

  useEffect(() => {
    // Auto-scroll chat to bottom
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    // Timer countdown
    if (currentView === 'game' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && currentView === 'game') {
      // Auto-answer or move to next question
      if (currentQuestionIndex < (room?.questions.length || 0) - 1) {
        handleNextQuestion();
      }
    }
  }, [timeLeft, currentView]);

  const createRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setIsCreating(true);
    setError('');
    localStorage.setItem('playerName', playerName);
    
    socket?.emit('create-compatibility-room', {
      player: { name: playerName, avatar: '' }
    });
  };

  const joinRoom = () => {
    if (!playerName.trim() || !roomId.trim()) {
      setError('Please enter your name and room ID');
      return;
    }
    
    setIsJoining(true);
    setError('');
    localStorage.setItem('playerName', playerName);
    
    socket?.emit('join-compatibility-room', {
      roomId: roomId.toUpperCase(),
      player: { name: playerName, avatar: '' }
    });
  };

  const startGame = () => {
    if (room) {
      socket?.emit('start-compatibility-game', { roomId: room.roomId });
    }
  };

  const handleAnswer = (answer: number) => {
    if (!room) return;

    const currentQuestion = room.questions[currentQuestionIndex];
    
    // Store answer locally
    const newAnswers = { ...answers };
    if (!newAnswers.regular) newAnswers.regular = [];
    newAnswers.regular[currentQuestionIndex] = {
      questionIndex: currentQuestionIndex,
      answer,
      option: currentQuestion.options[answer]
    };
    setAnswers(newAnswers);

    // Send to server
    socket?.emit('compatibility-answer-submitted', {
      roomId: room.roomId,
      questionIndex: currentQuestionIndex,
      answer
    });

    // Update progress
    const progress = Math.round(((currentQuestionIndex + 1) / room.questions.length) * 100);
    setPlayerProgress(progress);
  };

  const handleNextQuestion = () => {
    if (room && currentQuestionIndex < room.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setTimeLeft(30);
    }
  };

  const handleAdvancedAnswer = (category: string, field: string, value: any) => {
    const newAnswers = { ...answers };
    if (!newAnswers.advancedAnswers) newAnswers.advancedAnswers = {};
    if (!newAnswers.advancedAnswers[category]) newAnswers.advancedAnswers[category] = {};
    
    newAnswers.advancedAnswers[category][field] = value;
    setAnswers(newAnswers);

    // Send to server
    socket?.emit('compatibility-advanced-answers', {
      roomId: room?.roomId,
      category,
      answers: newAnswers.advancedAnswers[category]
    });
  };

  const submitFinalAnswers = () => {
    if (room) {
      socket?.emit('compatibility-submit-final', { roomId: room.roomId });
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !room) return;

    const message = {
      sender: playerName,
      senderId: socket?.id,
      content: newMessage,
      type: 'text'
    };

    socket?.emit('send-gamechat-message', {
      roomId: room.roomId,
      message,
      chatType: 'game'
    });

    setNewMessage('');
  };

  const handleTyping = (isTyping: boolean) => {
    if (room) {
      if (isTyping) {
        socket?.emit('typing', {
          roomId: room.roomId,
          userId: socket.id,
          userName: playerName
        });
      } else {
        socket?.emit('chat-typing-stop', {
          roomId: room.roomId,
          userId: socket.id
        });
      }
    }
  };

  const leaveRoom = () => {
    if (room) {
      socket?.emit('leave-room', room.roomId);
    }
    setRoom(null);
    setCurrentView('lobby');
    setResults(null);
  };

  const copyRoomId = () => {
    if (room) {
      navigator.clipboard.writeText(room.roomId);
      setSuccess('Room ID copied to clipboard!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const captureScreenshot = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleScreenshotUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && room) {
      // Here you would typically upload the file to your server
      // and then emit a proof-uploaded event
      console.log('Screenshot captured:', file.name);
      // For now, we'll just show a success message
      setSuccess('Screenshot captured successfully!');
    }
  };

  // Render different views based on current state
  const renderView = () => {
    switch (currentView) {
      case 'lobby':
        return renderLobby();
      case 'game':
        return renderGame();
      case 'advanced':
        return renderAdvancedQuestions();
      case 'waiting':
        return renderWaitingScreen();
      case 'results':
        return renderResults();
      default:
        return renderMainMenu();
    }
  };

  const renderMainMenu = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">💕 Compatibility Test</h1>
          <p className="text-gray-600">Discover your connection with friends!</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter your name"
            />
          </div>

          <button
            onClick={createRoom}
            disabled={isCreating}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition duration-200 disabled:opacity-50"
          >
            {isCreating ? 'Creating Room...' : 'Create New Room'}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or join existing room</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room ID
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
              placeholder="Enter room code"
            />
          </div>

          <button
            onClick={joinRoom}
            disabled={isJoining}
            className="w-full bg-pink-500 text-white py-3 px-4 rounded-lg hover:bg-pink-600 transition duration-200 disabled:opacity-50"
          >
            {isJoining ? 'Joining...' : 'Join Room'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderLobby = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 to-pink-500 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Compatibility Test</h1>
              <p className="text-gray-600">Room: {room?.roomId}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyRoomId}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-200"
              >
                📋 Copy Code
              </button>
              <button
                onClick={leaveRoom}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200"
              >
                ❌ Leave
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Players List */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Players ({room?.players.length}/2)</h2>
            <div className="space-y-3">
              {room?.players.map((player, index) => (
                <div
                  key={player.socketId}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{player.name}</p>
                      <p className="text-sm text-gray-500">
                        {player.isHost ? 'Host' : 'Player'}
                      </p>
                    </div>
                  </div>
                  {player.isHost && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      👑 Host
                    </span>
                  )}
                </div>
              ))}
            </div>

            {room?.players.find(p => p.isHost)?.socketId === socket?.id && (
              <button
                onClick={startGame}
                disabled={room?.players.length !== 2}
                className="w-full mt-6 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {room?.players.length === 2 ? 'Start Game 🚀' : 'Waiting for 2nd Player...'}
              </button>
            )}
          </div>

          {/* Chat */}
          <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Chat</h2>
            
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto mb-4 space-y-3 max-h-64"
            >
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    message.sender === playerName
                      ? 'bg-purple-100 ml-8'
                      : 'bg-gray-100 mr-8'
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-700">
                    {message.sender === playerName ? 'You' : message.sender}
                  </p>
                  <p className="text-gray-800">{message.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
              
              {isTyping && (
                <div className="bg-gray-100 p-3 rounded-lg mr-8">
                  <p className="text-sm text-gray-500 italic">
                    {typingUser} is typing...
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') sendMessage();
                }}
                onFocus={() => handleTyping(true)}
                onBlur={() => handleTyping(false)}
                placeholder="Type a message..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={sendMessage}
                className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition duration-200"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGame = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Compatibility Questions</h1>
              <p className="text-gray-600">Question {currentQuestionIndex + 1} of {room?.questions.length}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Your Progress</p>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${playerProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">{playerProgress}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Partner's Progress</p>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${otherPlayerProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">{otherPlayerProgress}%</p>
              </div>
              <button
                onClick={leaveRoom}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200"
              >
                ❌ Leave
              </button>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="text-sm text-gray-500">
              Time left: <span className="font-bold text-red-500">{timeLeft}s</span>
            </div>
            <div className="text-sm text-gray-500">
              Room: {room?.roomId}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
            {room?.questions[currentQuestionIndex]?.text}
          </h2>

          <div className="space-y-3 max-w-2xl mx-auto">
            {room?.questions[currentQuestionIndex]?.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200 ${
                  answers.regular?.[currentQuestionIndex]?.answer === index
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option}</span>
                  {answers.regular?.[currentQuestionIndex]?.answer === index && (
                    <span className="text-green-500">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => currentQuestionIndex > 0 && setCurrentQuestionIndex(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition duration-200 disabled:opacity-50"
            >
              ← Previous
            </button>
            
            <button
              onClick={handleNextQuestion}
              disabled={!answers.regular?.[currentQuestionIndex]}
              className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition duration-200 disabled:opacity-50"
            >
              {currentQuestionIndex === (room?.questions.length || 0) - 1 ? 'Finish Questions' : 'Next Question →'}
            </button>
          </div>
        </div>

        {/* Quick Chat */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Chat</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Send a quick message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdvancedQuestions = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Advanced Compatibility</h1>
              <p className="text-gray-600">Deeper insights for better matching</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Completion</p>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${playerProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">{playerProgress}%</p>
              </div>
              <button
                onClick={captureScreenshot}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200"
              >
                📸 Screenshot
              </button>
              <button
                onClick={leaveRoom}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200"
              >
                ❌ Leave
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Questions */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personality Traits */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Personality Traits</h3>
              {room?.advancedQuestions.personalityTraits.options.map((trait: string) => (
                <label key={trait} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      const current = answers.advancedAnswers?.personalityTraits || [];
                      const newValue = e.target.checked
                        ? [...current, trait]
                        : current.filter((t: string) => t !== trait);
                      handleAdvancedAnswer('personalityTraits', 'traits', newValue);
                    }}
                    className="rounded text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-gray-700">{trait}</span>
                </label>
              ))}
            </div>

            {/* Lifestyle */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Lifestyle</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sleep Schedule
                </label>
                <select
                  onChange={(e) => handleAdvancedAnswer('lifestyle', 'sleepSchedule', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select your sleep schedule</option>
                  {room?.advancedQuestions.lifestyle.sleepSchedule.options.map((option: string) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Social Activity Level
                </label>
                <select
                  onChange={(e) => handleAdvancedAnswer('lifestyle', 'socialActivity', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select social activity level</option>
                  {room?.advancedQuestions.lifestyle.socialActivity.options.map((option: string) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Communication */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Communication</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Communication Style
                </label>
                <select
                  onChange={(e) => handleAdvancedAnswer('communication', 'style', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select communication style</option>
                  {room?.advancedQuestions.communication.style.options.map((option: string) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conflict Resolution
                </label>
                <select
                  onChange={(e) => handleAdvancedAnswer('communication', 'conflictResolution', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select conflict resolution style</option>
                  {room?.advancedQuestions.communication.conflictResolution.options.map((option: string) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interests & Values */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Interests & Values</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hobbies
                </label>
                <div className="space-y-2">
                  {room?.advancedQuestions.interests.hobbies.options.map((hobby: string) => (
                    <label key={hobby} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          const current = answers.advancedAnswers?.interests?.hobbies || [];
                          const newValue = e.target.checked
                            ? [...current, hobby]
                            : current.filter((h: string) => h !== hobby);
                          handleAdvancedAnswer('interests', 'hobbies', newValue);
                        }}
                        className="rounded text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-gray-700">{hobby}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Family Importance
                </label>
                <select
                  onChange={(e) => handleAdvancedAnswer('values', 'family', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select importance level</option>
                  {room?.advancedQuestions.values.family.options.map((option: string) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center mt-8">
            <button
              onClick={submitFinalAnswers}
              className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-200 text-lg font-semibold"
            >
              Submit Final Answers 🎯
            </button>
          </div>
        </div>

        {/* Hidden file input for screenshots */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleScreenshotUpload}
          accept="image/*"
          capture="environment"
          className="hidden"
        />
      </div>
    </div>
  );

  const renderWaitingScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <div className="animate-pulse mb-6">
          <div className="text-6xl mb-4">⏳</div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Waiting for Players</h1>
        
        <div className="space-y-4 mb-6">
          <p className="text-gray-600">
            Waiting for {waitingForPlayers.join(', ')} to complete their answers...
          </p>
          
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-orange-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${((room?.players.length || 0) - waitingForPlayers.length) / (room?.players.length || 1) * 100}%` }}
            ></div>
          </div>
          
          <p className="text-sm text-gray-500">
            {((room?.players.length || 0) - waitingForPlayers.length)} / {room?.players.length} players ready
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={captureScreenshot}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200"
          >
            📸 Capture Screenshot
          </button>
          
          <button
            onClick={leaveRoom}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200"
          >
            ❌ Leave Room
          </button>
        </div>

        {/* Quick status update */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            Your progress: <span className="font-semibold text-green-600">{playerProgress}%</span>
          </p>
          <p className="text-sm text-gray-600">
            Partner's progress: <span className="font-semibold text-blue-600">{otherPlayerProgress}%</span>
          </p>
        </div>
      </div>

      {/* Hidden file input for screenshots */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleScreenshotUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
    </div>
  );

  const renderResults = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Compatibility Results</h1>
              <p className="text-gray-600">Discover your connection strength</p>
            </div>
            <button
              onClick={leaveRoom}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200"
            >
              ❌ Leave Room
            </button>
          </div>
        </div>

        {results && (
          <div className="space-y-6">
            {/* Main Score */}
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="mb-6">
                <div className="text-6xl mb-4">💕</div>
                <h2 className="text-4xl font-bold text-gray-800 mb-2">
                  {results.score}% Match
                </h2>
                <p className="text-xl text-purple-600 font-semibold">
                  {results.matchLevel}
                </p>
              </div>

              {/* Score Circle */}
              <div className="relative inline-block mb-6">
                <div className="w-48 h-48 rounded-full border-8 border-gray-200 flex items-center justify-center">
                  <div 
                    className="absolute w-48 h-48 rounded-full border-8 border-transparent"
                    style={{
                      background: `conic-gradient(
                        #8B5CF6 0% ${results.score}%, 
                        #E5E7EB ${results.score}% 100%
                      )`
                    }}
                  ></div>
                  <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800">{results.score}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Compatibility Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(results.breakdown).map(([category, score]) => (
                  <div key={category} className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-2">
                      <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#E5E7EB"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#8B5CF6"
                          strokeWidth="3"
                          strokeDasharray={`${score}, 100`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-800">{score}%</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-700 capitalize">
                      {category}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Key Insights</h3>
              <div className="space-y-3">
                {results.insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <span className="text-purple-500 mt-1">💡</span>
                    <p className="text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Recommendations</h3>
              <div className="space-y-3">
                {results.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <span className="text-green-500 mt-1">🌟</span>
                    <p className="text-gray-700">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={captureScreenshot}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200"
                >
                  📸 Save Results
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition duration-200"
                >
                  🔄 Play Again
                </button>
                <button
                  onClick={leaveRoom}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition duration-200"
                >
                  🏠 Main Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden file input for screenshots */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleScreenshotUpload}
          accept="image/*"
          capture="environment"
          className="hidden"
        />
      </div>
    </div>
  );

  return (
    <div className="compatibility-game">
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-lg max-w-sm mx-auto">
            <div className="flex items-center">
              <span className="text-red-500 mr-2">⚠️</span>
              <span>{error}</span>
              <button 
                onClick={() => setError('')}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg shadow-lg max-w-sm mx-auto">
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              <span>{success}</span>
              <button 
                onClick={() => setSuccess('')}
                className="ml-auto text-green-500 hover:text-green-700"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {renderView()}
    </div>
  );
};

export default CompatibilityGame;