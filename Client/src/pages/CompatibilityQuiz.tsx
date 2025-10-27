// AdvancedCompatibilityGame.tsx
import React, { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

// Types
interface Player {
  name: string;
  socketId: string;
  isHost: boolean;
  progress?: number;
}

interface Room {
  roomId: string;
  players: Player[];
  status: string;
  gameType: string;
  gameStarted: boolean;
  currentQuestion?: number;
  playerProgress?: { [key: string]: number };
  answers?: { [key: string]: any[] };
}

interface Question {
  id: number;
  question: string;
  type: string;
  image: string;
  options: { text: string; value: string }[];
}

interface CompatibilityResult {
  overallScore: number;
  categoryScores: { [key: string]: number };
  strengths: string[];
  growthAreas: string[];
  funFacts: string[];
  relationshipType: string;
  advice: string;
}

interface ChatMessage {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
  type: string;
}

// Game Configuration
const ADVANCED_COMPATIBILITY_GAME = {
  categories: {
    personality: {
      name: "Personality Traits",
      weight: 0.25,
      questions: [
        {
          id: 1,
          question: "When faced with a problem, you tend to:",
          type: "scenario",
          image: "🧩",
          options: [
            { text: "Analyze it logically and make a plan", value: "analytical" },
            { text: "Follow your intuition and gut feeling", value: "intuitive" },
            { text: "Ask others for advice and opinions", value: "collaborative" },
            { text: "Take immediate action and figure it out", value: "spontaneous" }
          ]
        },
        {
          id: 2,
          question: "Your ideal weekend involves:",
          type: "lifestyle",
          image: "🏖️",
          options: [
            { text: "Adventure and trying new activities", value: "adventurous" },
            { text: "Relaxing at home with hobbies", value: "homebody" },
            { text: "Socializing with friends and family", value: "social" },
            { text: "Getting organized and planning ahead", value: "productive" }
          ]
        }
      ]
    },
    values: {
      name: "Core Values",
      weight: 0.30,
      questions: [
        {
          id: 3,
          question: "What's most important in a relationship?",
          type: "values",
          image: "💝",
          options: [
            { text: "Honesty and trust above all", value: "honesty" },
            { text: "Shared goals and ambitions", value: "ambition" },
            { text: "Emotional connection and support", value: "emotional" },
            { text: "Freedom and independence", value: "freedom" }
          ]
        },
        {
          id: 4,
          question: "How do you view financial priorities?",
          type: "values",
          image: "💰",
          options: [
            { text: "Save for security and future goals", value: "saver" },
            { text: "Enjoy life and experiences now", value: "spender" },
            { text: "Balance saving and spending wisely", value: "balanced" },
            { text: "Invest in personal growth", value: "investor" }
          ]
        }
      ]
    },
    communication: {
      name: "Communication Style",
      weight: 0.20,
      questions: [
        {
          id: 5,
          question: "When you're upset, you usually:",
          type: "communication",
          image: "🎭",
          options: [
            { text: "Talk about it openly right away", value: "direct" },
            { text: "Need time alone to process feelings", value: "private" },
            { text: "Express through actions rather than words", value: "actions" },
            { text: "Use humor to lighten the mood", value: "humorous" }
          ]
        },
        {
          id: 6,
          question: "Your texting style is:",
          type: "communication",
          image: "📱",
          options: [
            { text: "Quick and to the point", value: "concise" },
            { text: "Detailed and expressive", value: "expressive" },
            { text: "Full of emojis and GIFs", value: "playful" },
            { text: "Respond when you have time", value: "deliberate" }
          ]
        }
      ]
    },
    interests: {
      name: "Interests & Hobbies",
      weight: 0.15,
      questions: [
        {
          id: 7,
          question: "Choose your perfect vacation:",
          type: "interests",
          image: "✈️",
          options: [
            { text: "Tropical beach relaxation", value: "beach" },
            { text: "Mountain hiking and nature", value: "adventure" },
            { text: "City exploration and culture", value: "city" },
            { text: "Road trip and spontaneity", value: "roadtrip" }
          ]
        },
        {
          id: 8,
          question: "Your entertainment preference:",
          type: "interests",
          image: "🎬",
          options: [
            { text: "Binge-watching series", value: "series" },
            { text: "Reading books", value: "reading" },
            { text: "Video games", value: "gaming" },
            { text: "Outdoor activities", value: "outdoor" }
          ]
        }
      ]
    },
    romance: {
      name: "Romance & Affection",
      weight: 0.10,
      questions: [
        {
          id: 9,
          question: "Your love language is:",
          type: "romance",
          image: "💘",
          options: [
            { text: "Words of affirmation", value: "words" },
            { text: "Quality time together", value: "time" },
            { text: "Physical touch and closeness", value: "touch" },
            { text: "Acts of service", value: "service" }
          ]
        },
        {
          id: 10,
          question: "Ideal date night involves:",
          type: "romance",
          image: "🌹",
          options: [
            { text: "Fancy dinner and dressing up", value: "elegant" },
            { text: "Cozy night in with movies", value: "cozy" },
            { text: "Trying something new together", value: "adventurous" },
            { text: "Simple walk and deep conversation", value: "simple" }
          ]
        }
      ]
    }
  },

  getAllQuestions(): Question[] {
    const allQuestions: Question[] = [];
    Object.values(this.categories).forEach(category => {
      allQuestions.push(...category.questions);
    });
    return allQuestions.sort((a, b) => a.id - b.id);
  },

  calculateBasicCompatibility(player1Answers: any, player2Answers: any): number {
    let matches = 0;
    let total = 0;

    Object.keys(player1Answers).forEach(category => {
      player1Answers[category].forEach((answer1: string, index: number) => {
        const answer2 = player2Answers[category][index];
        if (answer1 === answer2) matches++;
        total++;
      });
    });

    return Math.round((matches / total) * 100);
  },

  getCompatibilityScore(answer1: string, answer2: string, category: string): number {
    const compatibilityMatrices: any = {
      personality: {
        analytical: { analytical: 1.0, intuitive: 0.6, collaborative: 0.8, spontaneous: 0.4 },
        intuitive: { analytical: 0.6, intuitive: 1.0, collaborative: 0.7, spontaneous: 0.9 },
        collaborative: { analytical: 0.8, intuitive: 0.7, collaborative: 1.0, spontaneous: 0.5 },
        spontaneous: { analytical: 0.4, intuitive: 0.9, collaborative: 0.5, spontaneous: 1.0 }
      },
      values: {
        honesty: { honesty: 1.0, ambition: 0.7, emotional: 0.9, freedom: 0.6 },
        ambition: { honesty: 0.7, ambition: 1.0, emotional: 0.8, freedom: 0.5 },
        emotional: { honesty: 0.9, ambition: 0.8, emotional: 1.0, freedom: 0.4 },
        freedom: { honesty: 0.6, ambition: 0.5, emotional: 0.4, freedom: 1.0 }
      }
    };

    const matrix = compatibilityMatrices[category];
    if (matrix && matrix[answer1] && matrix[answer1][answer2]) {
      return matrix[answer1][answer2];
    }
    
    return answer1 === answer2 ? 1.0 : 0.3;
  },

  calculateAdvancedCompatibility(player1Answers: any, player2Answers: any): number {
    let totalScore = 0;
    let maxScore = 0;

    Object.keys(this.categories).forEach(category => {
      const weight = this.categories[category as keyof typeof this.categories].weight;
      const questions = this.categories[category as keyof typeof this.categories].questions;
      
      questions.forEach((question: Question, index: number) => {
        const answer1 = player1Answers[category][index];
        const answer2 = player2Answers[category][index];
        
        const compatibilityScore = this.getCompatibilityScore(answer1, answer2, category);
        
        totalScore += compatibilityScore * weight;
        maxScore += weight;
      });
    });

    return Math.round((totalScore / maxScore) * 100);
  },

  calculateSynergyBonus(player1Answers: any, player2Answers: any): number {
    let synergy = 0;
    let totalPairs = 0;

    Object.keys(player1Answers).forEach(category => {
      player1Answers[category].forEach((answer1: string, index: number) => {
        const answer2 = player2Answers[category][index];
        
        const synergisticPairs = [
          ['analytical', 'intuitive'],
          ['saver', 'balanced'],
          ['adventurous', 'cozy'],
          ['direct', 'expressive']
        ];

        if (synergisticPairs.some(pair => 
          (pair.includes(answer1) && pair.includes(answer2) && answer1 !== answer2)
        )) {
          synergy += 1;
        }
        totalPairs++;
      });
    });

    return (synergy / totalPairs) * 100;
  },

  generateCompatibilityReport(player1Answers: any, player2Answers: any, player1Name: string, player2Name: string): CompatibilityResult {
    const basicScore = this.calculateBasicCompatibility(player1Answers, player2Answers);
    const advancedScore = this.calculateAdvancedCompatibility(player1Answers, player2Answers);
    const synergyBonus = this.calculateSynergyBonus(player1Answers, player2Answers);
    
    const finalScore = Math.round(
      (advancedScore * 0.7) + 
      (basicScore * 0.2) + 
      (synergyBonus * 0.1)
    );

    const report: CompatibilityResult = {
      overallScore: Math.min(100, finalScore),
      categoryScores: {},
      strengths: [],
      growthAreas: [],
      funFacts: [],
      relationshipType: this.getRelationshipType(finalScore),
      advice: this.generateAdvice()
    };

    // Calculate category scores
    Object.keys(this.categories).forEach(category => {
      const categoryAnswers1 = player1Answers[category];
      const categoryAnswers2 = player2Answers[category];
      report.categoryScores[category] = this.calculateAdvancedCompatibility(
        { [category]: categoryAnswers1 },
        { [category]: categoryAnswers2 }
      );
    });

    this.generateStrengths(report, player1Answers, player2Answers);
    this.generateGrowthAreas(report, player1Answers, player2Answers);
    this.generateFunFacts(report, player1Answers, player2Answers, player1Name, player2Name);

    return report;
  },

  getRelationshipType(score: number): string {
    if (score >= 90) return "Soulmate Connection 🌟";
    if (score >= 80) return "Perfect Match 💖";
    if (score >= 70) return "Great Compatibility 💕";
    if (score >= 60) return "Good Match 💗";
    if (score >= 50) return "Potential to Grow 🌱";
    return "Interesting Combination 🤔";
  },

  generateStrengths(report: CompatibilityResult, player1Answers: any, player2Answers: any): void {
    const highScoringCategories = Object.entries(report.categoryScores)
      .filter(([_, score]) => score >= 80)
      .map(([category, _]) => category);

    highScoringCategories.forEach(category => {
      switch(category) {
        case 'personality':
          report.strengths.push("Your personalities complement each other perfectly! 🎭");
          break;
        case 'values':
          report.strengths.push("You share core values and life priorities! 💎");
          break;
        case 'communication':
          report.strengths.push("Great communication understanding! 🗣️");
          break;
        case 'interests':
          report.strengths.push("You enjoy similar activities and hobbies! 🎯");
          break;
        case 'romance':
          report.strengths.push("Romantic compatibility is off the charts! 💘");
          break;
      }
    });
  },

  generateGrowthAreas(report: CompatibilityResult, player1Answers: any, player2Answers: any): void {
    const lowScoringCategories = Object.entries(report.categoryScores)
      .filter(([_, score]) => score < 60)
      .map(([category, _]) => category);

    lowScoringCategories.forEach(category => {
      switch(category) {
        case 'personality':
          report.growthAreas.push("Different approaches to problem-solving - learn from each other! 🧩");
          break;
        case 'values':
          report.growthAreas.push("Discuss your long-term goals and priorities 💭");
          break;
        case 'communication':
          report.growthAreas.push("Work on understanding each other's communication styles 📞");
          break;
        case 'interests':
          report.growthAreas.push("Explore new activities you can enjoy together 🎨");
          break;
        case 'romance':
          report.growthAreas.push("Discover each other's love languages and preferences 💞");
          break;
      }
    });
  },

  generateFunFacts(report: CompatibilityResult, player1Answers: any, player2Answers: any, player1Name: string, player2Name: string): void {
    const perfectMatches: { category: string; answer: string }[] = [];
    Object.keys(player1Answers).forEach(category => {
      player1Answers[category].forEach((answer: string, index: number) => {
        if (answer === player2Answers[category][index]) {
          perfectMatches.push({ category, answer });
        }
      });
    });

    if (perfectMatches.length > 0) {
      const randomMatch = perfectMatches[Math.floor(Math.random() * perfectMatches.length)];
      report.funFacts.push(`You both chose "${randomMatch.answer}" for ${this.categories[randomMatch.category as keyof typeof this.categories].name.toLowerCase()}!`);
    }

    const funCombinations = [
      "Your energy together is electric! ⚡",
      "You balance each other like yin and yang ☯️",
      "When you're together, magic happens ✨",
      "Your connection has great potential for growth 🌱",
      "You bring out the best in each other 🌟"
    ];
    
    report.funFacts.push(funCombinations[Math.floor(Math.random() * funCombinations.length)]);
  },

  generateAdvice(): string {
    const adviceList = [
      "Keep communicating openly and honestly 💬",
      "Make time for regular date nights 📅",
      "Support each other's individual growth 🌱",
      "Celebrate your differences as strengths 🎉",
      "Always maintain trust and respect 🤝",
      "Keep the romance alive with small gestures 💝",
      "Learn each other's love languages 💞",
      "Create shared goals and dreams together 🎯"
    ];

    return adviceList[Math.floor(Math.random() * adviceList.length)];
  }
};

// Chat Component
const ChatSection: React.FC<{
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  typingUsers: string[];
  currentUser: string;
}> = ({ messages, onSendMessage, onTyping, typingUsers, currentUser }) => {
  const [message, setMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      onTyping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    onTyping(true);
    clearTimeout((window as any).typingTimer);
    (window as any).typingTimer = setTimeout(() => onTyping(false), 1000);
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="chat-section">
      <h4>Game Chat</h4>
      <div className="chat-messages" ref={chatContainerRef}>
        {messages.map(msg => (
          <div key={msg.id} className={`chat-message ${msg.sender === currentUser ? 'own-message' : ''}`}>
            <span className="sender">{msg.sender}:</span>
            <span className="content">{msg.content}</span>
            <span className="timestamp">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={message}
          onChange={handleInputChange}
          placeholder="Type your message..."
          className="chat-input"
        />
        <button type="submit" className="send-btn">Send</button>
      </form>
    </div>
  );
};

// Main Game Component
const AdvancedCompatibilityGame: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<'home' | 'waiting' | 'playing' | 'results'>('home');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: (string | null)[] }>({});
  const [progress, setProgress] = useState(0);
  const [compatibilityResult, setCompatibilityResult] = useState<CompatibilityResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');

  const allQuestions = ADVANCED_COMPATIBILITY_GAME.getAllQuestions();

  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('room-created', handleRoomCreated);
    newSocket.on('room-joined', handleRoomJoined);
    newSocket.on('join-error', handleJoinError);
    newSocket.on('update-players', handleUpdatePlayers);
    newSocket.on('game-started', handleGameStarted);
    newSocket.on('game-state-update', handleGameStateUpdate);
    newSocket.on('player-progress', handlePlayerProgress);
    newSocket.on('show-results', handleShowResults);
    newSocket.on('answers-update', handleAnswersUpdate);
    newSocket.on('receive-chat-message', handleChatMessage);
    newSocket.on('chat-history', handleChatHistory);
    newSocket.on('user-typing', handleUserTyping);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    // Initialize answers structure
    const initialAnswers: { [key: string]: (string | null)[] } = {};
    Object.keys(ADVANCED_COMPATIBILITY_GAME.categories).forEach(category => {
      initialAnswers[category] = Array(ADVANCED_COMPATIBILITY_GAME.categories[category as keyof typeof ADVANCED_COMPATIBILITY_GAME.categories].questions.length).fill(null);
    });
    setAnswers(initialAnswers);
  }, []);

  useEffect(() => {
    updateProgress();
  }, [answers]);

  // Socket Event Handlers
  const handleRoomCreated = (roomData: Room) => {
    setRoom(roomData);
    setGameState('waiting');
  };

  const handleRoomJoined = (roomData: Room) => {
    setRoom(roomData);
    setGameState('waiting');
  };

  const handleJoinError = (error: string) => {
    alert(`Join error: ${error}`);
  };

  const handleUpdatePlayers = (players: Player[]) => {
    if (room) {
      setRoom({ ...room, players });
    }
  };

  const handleGameStarted = (data: { roomId: string; gameType: string }) => {
    setGameState('playing');
  };

  const handleGameStateUpdate = (state: any) => {
    if (state.gameStarted) setGameState('playing');
    if (state.currentQuestion) setCurrentQuestion(state.currentQuestion);
  };

  const handlePlayerProgress = (data: { player: string; progress: number }) => {
    // Update other players' progress in the room
  };

  const handleShowResults = (allAnswers: { [key: string]: any }) => {
    setGameState('results');
    calculateCompatibility(allAnswers);
  };

  const handleAnswersUpdate = (data: { answered: number; total: number; waitingFor: string[] }) => {
    console.log(`Answers update: ${data.answered}/${data.total} players submitted`);
  };

  const handleChatMessage = (message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  };

  const handleChatHistory = (messages: ChatMessage[]) => {
    setChatMessages(messages);
  };

  const handleUserTyping = (data: { userName: string; isTyping: boolean }) => {
    if (data.isTyping) {
      setTypingUsers(prev => [...prev.filter(u => u !== data.userName), data.userName]);
    } else {
      setTypingUsers(prev => prev.filter(u => u !== data.userName));
    }
  };

  // Game Functions
  const updateProgress = () => {
    const totalQuestions = allQuestions.length;
    const answeredQuestions = Object.values(answers).flat().filter(answer => answer !== null).length;
    const newProgress = Math.round((answeredQuestions / totalQuestions) * 100);
    setProgress(newProgress);

    if (socket && room) {
      socket.emit('player-progress', { roomId: room.roomId, progress: newProgress });
    }
  };

  const handleAnswerSelect = (category: string, questionIndex: number, answer: string) => {
    const newAnswers = { ...answers };
    newAnswers[category][questionIndex] = answer;
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentQuestion < allQuestions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
      }
    }, 500);
  };

  const submitAnswers = () => {
    if (socket && room && player) {
      socket.emit('submit-answers', {
        roomId: room.roomId,
        player: player,
        answers: answers
      });
    }
  };

  const calculateCompatibility = (allAnswers: { [key: string]: any }) => {
    const otherPlayerName = Object.keys(allAnswers).find(name => name !== player?.name);
    if (otherPlayerName && player) {
      const result = ADVANCED_COMPATIBILITY_GAME.generateCompatibilityReport(
        answers,
        allAnswers[otherPlayerName],
        player.name,
        otherPlayerName
      );
      setCompatibilityResult(result);
    }
  };

  const sendChatMessage = (content: string) => {
    if (socket && room && player) {
      socket.emit('send-chat-message', {
        roomId: room.roomId,
        message: {
          sender: player.name,
          content: content,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (socket && room) {
      socket.emit('typing', { roomId: room.roomId, isTyping });
    }
  };

  const createRoom = () => {
    if (socket && playerName.trim()) {
      socket.emit('create-room', { 
        player: { name: playerName.trim() }, 
        gameType: 'compatibility' 
      });
      setPlayer({ name: playerName.trim(), socketId: '', isHost: true });
    }
  };

  const joinRoom = () => {
    if (socket && playerName.trim() && roomCode.trim()) {
      socket.emit('join-room', { 
        roomId: roomCode.trim().toUpperCase(),
        player: { name: playerName.trim() }
      });
      setPlayer({ name: playerName.trim(), socketId: '', isHost: false });
    }
  };

  const startGame = () => {
    if (socket && room) {
      socket.emit('start-game', { roomId: room.roomId });
    }
  };

  const exitGame = () => {
    if (socket && room) {
      socket.emit('leave-room', room.roomId);
    }
    setRoom(null);
    setPlayer(null);
    setGameState('home');
    setCompatibilityResult(null);
    setChatMessages([]);
  };

  // Render different screens based on game state
  if (gameState === 'home') {
    return (
      <div className="compatibility-game home-screen">
        <div className="home-header">
          <h1>Advanced Compatibility Game</h1>
          <p>Discover your connection through personality, values, and more!</p>
        </div>
        
        <div className="home-actions">
          <div className="input-section">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="name-input"
            />
          </div>

          <div className="action-buttons">
            <button onClick={createRoom} className="create-room-btn">
              Create New Room
            </button>
            
            <div className="join-section">
              <input
                type="text"
                placeholder="Room Code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="room-code-input"
              />
              <button onClick={joinRoom} className="join-room-btn">
                Join Room
              </button>
            </div>
          </div>
        </div>

        <div className="game-features">
          <h3>🌟 Awesome Features:</h3>
          <ul>
            <li>🎭 Personality & Values Assessment</li>
            <li>💬 Communication Style Analysis</li>
            <li>🎯 Interests & Hobbies Matching</li>
            <li>💘 Romance & Affection Compatibility</li>
            <li>📊 Detailed Compatibility Reports</li>
            <li>👥 Real-time Multiplayer Experience</li>
          </ul>
        </div>
      </div>
    );
  }

  if (gameState === 'waiting' && room) {
    return (
      <div className="compatibility-game waiting-room">
        <div className="waiting-header">
          <h1>Advanced Compatibility Test</h1>
          <p>Room: {room.roomId}</p>
        </div>
        
        <div className="players-list">
          <h3>Players in Room:</h3>
          {room.players.map(p => (
            <div key={p.name} className="player-waiting">
              <span className="player-name">{p.name}</span>
              {p.isHost && <span className="host-badge">Host</span>}
              {p.progress !== undefined && <span className="progress-badge">{p.progress}%</span>}
            </div>
          ))}
        </div>

        {player?.isHost && room.players.length >= 2 && (
          <button className="start-game-btn" onClick={startGame}>
            Start Compatibility Test
          </button>
        )}

        {player?.isHost && room.players.length < 2 && (
          <p className="waiting-message">Waiting for another player to join...</p>
        )}

        <ChatSection
          messages={chatMessages}
          onSendMessage={sendChatMessage}
          onTyping={handleTyping}
          typingUsers={typingUsers}
          currentUser={player?.name || ''}
        />

        <button className="exit-btn" onClick={exitGame}>
          Exit Room
        </button>
      </div>
    );
  }

  if (gameState === 'results' && compatibilityResult) {
    return (
      <div className="compatibility-game results-screen">
        <div className="results-header">
          <h1>Compatibility Results</h1>
          <div className="overall-score">
            <div 
              className="score-circle"
              style={{ '--score-percent': `${compatibilityResult.overallScore}%` } as React.CSSProperties}
            >
              <span className="score-number">{compatibilityResult.overallScore}%</span>
            </div>
            <p className="relationship-type">{compatibilityResult.relationshipType}</p>
          </div>
        </div>

        <div className="category-scores">
          <h3>Category Breakdown</h3>
          <div className="scores-grid">
            {Object.entries(compatibilityResult.categoryScores).map(([category, score]) => (
              <div key={category} className="category-score">
                <span className="category-name">
                  {ADVANCED_COMPATIBILITY_GAME.categories[category as keyof typeof ADVANCED_COMPATIBILITY_GAME.categories].name}
                </span>
                <div className="score-bar">
                  <div 
                    className="score-fill" 
                    style={{ width: `${score}%` }}
                  ></div>
                </div>
                <span className="score-value">{score}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="strengths-growth">
          <div className="strengths">
            <h4>🌟 Strengths</h4>
            {compatibilityResult.strengths.map((strength, index) => (
              <p key={index}>{strength}</p>
            ))}
          </div>
          
          <div className="growth-areas">
            <h4>🌱 Growth Areas</h4>
            {compatibilityResult.growthAreas.map((area, index) => (
              <p key={index}>{area}</p>
            ))}
          </div>
        </div>

        <div className="fun-facts">
          <h4>💫 Fun Facts</h4>
          {compatibilityResult.funFacts.map((fact, index) => (
            <p key={index}>{fact}</p>
          ))}
        </div>

        <div className="advice">
          <h4>💡 Advice</h4>
          <p>{compatibilityResult.advice}</p>
        </div>

        <ChatSection
          messages={chatMessages}
          onSendMessage={sendChatMessage}
          onTyping={handleTyping}
          typingUsers={typingUsers}
          currentUser={player?.name || ''}
        />

        <button className="exit-btn" onClick={exitGame}>
          Exit Game
        </button>
      </div>
    );
  }

  // Playing Screen
  const currentQuestionData = allQuestions[currentQuestion];
  const currentCategory = Object.keys(ADVANCED_COMPATIBILITY_GAME.categories).find(
    cat => ADVANCED_COMPATIBILITY_GAME.categories[cat as keyof typeof ADVANCED_COMPATIBILITY_GAME.categories].questions.some(q => q.id === currentQuestionData.id)
  );

  return (
    <div className="compatibility-game playing-screen">
      <div className="game-header">
        <div className="progress-section">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="progress-text">{progress}% Complete</span>
        </div>
        
        <div className="question-counter">
          Question {currentQuestion + 1} of {allQuestions.length}
        </div>
      </div>

      <div className="question-section">
        <div className="category-indicator">
          <span className="category-icon">{currentQuestionData.image}</span>
          <span className="category-name">
            {currentCategory ? ADVANCED_COMPATIBILITY_GAME.categories[currentCategory as keyof typeof ADVANCED_COMPATIBILITY_GAME.categories].name : ''}
          </span>
        </div>

        <h2 className="question-text">{currentQuestionData.question}</h2>

        <div className="options-grid">
          {currentQuestionData.options.map((option, index) => (
            <button
              key={index}
              className={`option-btn ${
                answers[currentCategory!]?.[currentQuestionData.id - 1] === option.value ? 'selected' : ''
              }`}
              onClick={() => handleAnswerSelect(
                currentCategory!, 
                currentQuestionData.id - 1, 
                option.value
              )}
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>

      <div className="navigation-section">
        <button
          className="nav-btn prev-btn"
          onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
        >
          Previous
        </button>

        {progress === 100 && (
          <button className="submit-btn" onClick={submitAnswers}>
            Submit Answers
          </button>
        )}

        <button
          className="nav-btn next-btn"
          onClick={() => setCurrentQuestion(prev => Math.min(allQuestions.length - 1, prev + 1))}
          disabled={currentQuestion === allQuestions.length - 1}
        >
          Next
        </button>
      </div>

      <ChatSection
        messages={chatMessages}
        onSendMessage={sendChatMessage}
        onTyping={handleTyping}
        typingUsers={typingUsers}
        currentUser={player?.name || ''}
      />

      <button className="exit-btn" onClick={exitGame}>
        Exit Game
      </button>
    </div>
  );
};

export default AdvancedCompatibilityGame;

// CSS Styles (Add this to your global CSS or component CSS)
/*
.compatibility-game {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: white;
}

.home-screen {
  text-align: center;
  padding: 50px 20px;
}

.home-header h1 {
  font-size: 3em;
  margin-bottom: 20px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.home-actions {
  background: rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 30px;
  margin: 30px 0;
  backdrop-filter: blur(10px);
}

.input-section {
  margin-bottom: 20px;
}

.name-input, .room-code-input {
  padding: 15px;
  border: none;
  border-radius: 25px;
  font-size: 1.1em;
  width: 300px;
  max-width: 100%;
  margin: 10px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
}

.create-room-btn, .join-room-btn, .start-game-btn, .submit-btn, .exit-btn {
  background: #4ecdc4;
  color: white;
  border: none;
  padding: 15px 30px;
  font-size: 1.1em;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.create-room-btn:hover, .join-room-btn:hover, .start-game-btn:hover, .submit-btn:hover, .exit-btn:hover {
  background: #45b7af;
  transform: translateY(-2px);
}

.exit-btn {
  background: #ff6b6b;
}

.exit-btn:hover {
  background: #ff5252;
}

.game-features {
  background: rgba(255,255,255,0.1);
  border-radius: 15px;
  padding: 20px;
  margin-top: 30px;
  backdrop-filter: blur(10px);
}

.game-features ul {
  list-style: none;
  text-align: left;
  max-width: 500px;
  margin: 0 auto;
}

.game-features li {
  padding: 10px;
  font-size: 1.1em;
}

.waiting-room, .playing-screen, .results-screen {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.waiting-header h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.players-list {
  background: rgba(255,255,255,0.1);
  border-radius: 15px;
  padding: 20px;
  margin: 20px 0;
  backdrop-filter: blur(10px);
}

.player-waiting {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  margin: 10px 0;
  background: rgba(255,255,255,0.2);
  border-radius: 10px;
}

.host-badge, .progress-badge {
  background: #ff6b6b;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
}

.progress-badge {
  background: #4ecdc4;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.1);
  padding: 20px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.progress-section {
  flex: 1;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: rgba(255,255,255,0.2);
  border-radius: 5px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4ecdc4;
  transition: width 0.3s ease;
}

.question-section {
  background: rgba(255,255,255,0.1);
  padding: 30px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  text-align: center;
}

.category-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.category-icon {
  font-size: 2em;
}

.category-name {
  font-size: 1.2em;
  opacity: 0.9;
}

.question-text {
  font-size: 1.8em;
  margin-bottom: 30px;
  line-height: 1.4;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  max-width: 800px;
  margin: 0 auto;
}

.option-btn {
  background: rgba(255,255,255,0.2);
  border: 2px solid transparent;
  padding: 20px;
  border-radius: 15px;
  color: white;
  font-size: 1.1em;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.option-btn:hover {
  background: rgba(255,255,255,0.3);
  transform: translateY(-2px);
}

.option-btn.selected {
  background: rgba(78, 205, 196, 0.3);
  border-color: #4ecdc4;
  transform: scale(1.02);
}

.navigation-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  padding: 12px 25px;
  border-radius: 25px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.3);
  transform: translateY(-2px);
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.results-screen {
  text-align: center;
}

.results-header {
  margin-bottom: 30px;
}

.overall-score {
  margin: 20px 0;
}

.score-circle {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: conic-gradient(#4ecdc4 0% var(--score-percent, 0%), #34495e var(--score-percent, 0%) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  position: relative;
}

.score-circle::before {
  content: '';
  position: absolute;
  width: 120px;
  height: 120px;
  background: #2c3e50;
  border-radius: 50%;
}

.score-number {
  position: relative;
  font-size: 2.5em;
  font-weight: bold;
  z-index: 1;
}

.relationship-type {
  font-size: 1.5em;
  color: #4ecdc4;
  font-weight: bold;
}

.category-scores {
  background: rgba(255,255,255,0.1);
  padding: 30px;
  border-radius: 20px;
  margin: 20px 0;
  backdrop-filter: blur(10px);
}

.scores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.category-score {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.score-bar {
  height: 20px;
  background: rgba(255,255,255,0.2);
  border-radius: 10px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background: #4ecdc4;
  transition: width 1s ease-in-out;
}

.strengths-growth {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 20px 0;
}

.strengths, .growth-areas, .fun-facts, .advice {
  background: rgba(255,255,255,0.1);
  padding: 20px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.chat-section {
  background: rgba(255,255,255,0.1);
  border-radius: 15px;
  padding: 20px;
  margin-top: 20px;
  backdrop-filter: blur(10px);
}

.chat-messages {
  height: 200px;
  overflow-y: auto;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
}

.chat-message {
  margin-bottom: 10px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
}

.chat-message.own-message {
  background: rgba(78, 205, 196, 0.3);
  text-align: right;
}

.sender {
  font-weight: bold;
  margin-right: 5px;
}

.timestamp {
  font-size: 0.8em;
  opacity: 0.7;
  margin-left: 10px;
}

.typing-indicator {
  font-style: italic;
  opacity: 0.7;
  padding: 5px;
}

.chat-input-form {
  display: flex;
  gap: 10px;
}

.chat-input {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 20px;
  background: rgba(255,255,255,0.9);
}

.send-btn {
  background: #4ecdc4;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  color: white;
  cursor: pointer;
}

@media (max-width: 768px) {
  .compatibility-game {
    padding: 10px;
  }
  
  .options-grid {
    grid-template-columns: 1fr;
  }
  
  .strengths-growth {
    grid-template-columns: 1fr;
  }
  
  .game-header {
    flex-direction: column;
    gap: 15px;
  }
  
  .question-text {
    font-size: 1.4em;
  }
  
  .home-header h1 {
    font-size: 2em;
  }
}
*/