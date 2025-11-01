// components/Compatibility.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Sparkles,
  Trophy,
  ChevronRight,
  Crown,
  Copy,
  AlertCircle
} from 'lucide-react';
import html2canvas from 'html2canvas';

const DEFAULT_SOCKET_URL = `${import.meta.env.VITE_API_URL}`;

interface Player {
  name: string;
  socketId: string;
  isHost: boolean;
}

interface Question {
  id: number;
  text: string;
  type: 'scale';
  options: string[];
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
  matchLevel: string;
  recommendations: string[];
}

type GameStatus = 'lobby' | 'waiting' | 'playing' | 'advanced' | 'waiting-for-players' | 'results';

interface AnswerData {
  regularAnswers: number[];
  advancedAnswers: {
    personalityTraits?: any;
    lifestyle?: any;
    communication?: any;
    interests?: any;
    values?: any;
  };
}

const Compatibility: React.FC = () => {
  // Connection & Room State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [gameStatus, setGameStatus] = useState<GameStatus>('lobby');
  
  // Players & Game State
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  
  // Questions (now defined locally)
  const [questions] = useState<Question[]>([
    {
      id: 1,
      text: "How important is personal space and alone time in a relationship?",
      type: "scale",
      options: ["Not important", "Slightly important", "Moderately important", "Very important", "Extremely important"]
    },
    {
      id: 2,
      text: "How do you handle conflicts or disagreements?",
      type: "scale",
      options: ["Avoid them", "Discuss calmly", "Need time to think", "Express emotions openly", "Seek immediate resolution"]
    },
    {
      id: 3,
      text: "What's your ideal weekend activity?",
      type: "scale",
      options: ["Staying home", "Social gatherings", "Outdoor adventures", "Cultural activities", "Trying new restaurants"]
    },
    {
      id: 4,
      text: "How important is career ambition in a partner?",
      type: "scale",
      options: ["Not important", "Slightly important", "Moderately important", "Very important", "Extremely important"]
    },
    {
      id: 5,
      text: "What's your love language?",
      type: "scale",
      options: ["Words of affirmation", "Quality time", "Receiving gifts", "Acts of service", "Physical touch"]
    }
  ]);

  const [advancedQuestions] = useState<AdvancedQuestions>({
    personalityTraits: {
      question: "Select your dominant personality traits",
      type: "multi-select",
      options: ["Adventurous", "Analytical", "Creative", "Empathetic", "Organized", "Spontaneous", "Practical", "Emotional"]
    },
    lifestyle: {
      sleepSchedule: {
        question: "Your typical sleep schedule",
        options: ["Early bird", "Night owl", "Flexible", "Strict routine"]
      },
      socialActivity: {
        question: "Your social activity level",
        options: ["Homebody", "Occasionally social", "Very social", "Social butterfly"]
      }
    },
    communication: {
      style: {
        question: "Your communication style",
        options: ["Direct", "Diplomatic", "Emotional", "Logical"]
      },
      conflictResolution: {
        question: "How you handle conflicts",
        options: ["Address immediately", "Take time to cool off", "Seek mediation", "Avoid confrontation"]
      }
    },
    interests: {
      hobbies: {
        question: "Your favorite hobbies",
        options: ["Reading", "Sports", "Music", "Travel", "Cooking", "Gaming", "Arts", "Technology"]
      }
    },
    values: {
      family: {
        question: "Importance of family",
        options: ["Not important", "Somewhat important", "Important", "Very important"]
      },
      career: {
        question: "Career focus",
        options: ["Work to live", "Balanced", "Career-driven", "Ambitious"]
      }
    }
  });

  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState<boolean>(false);
  
  // Enhanced local state management
  const [myAnswers, setMyAnswers] = useState<AnswerData>({
    regularAnswers: [],
    advancedAnswers: {}
  });
  const [otherPlayerAnswers, setOtherPlayerAnswers] = useState<AnswerData | null>(null);
  const [playerProgress, setPlayerProgress] = useState<{[key: string]: number}>({});
  const [localSubmissionStatus, setLocalSubmissionStatus] = useState<{[key: string]: boolean}>({});
  
  // UI State
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [results, setResults] = useState<CompatibilityResults | null>(null);
  const [waitingForPlayers, setWaitingForPlayers] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [currentAdvancedSection, setCurrentAdvancedSection] = useState<string>('');
  const [advancedProgress, setAdvancedProgress] = useState<number>(0);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Calculate results independently on frontend
  const calculateResultsIndependently = useCallback((): CompatibilityResults => {
    console.log('🎯 Calculating results independently based on local data');
    console.log('My answers:', myAnswers);
    console.log('Other player answers:', otherPlayerAnswers);
    
    if (!otherPlayerAnswers || !otherPlayerAnswers.regularAnswers || otherPlayerAnswers.regularAnswers.length === 0) {
      console.log('❌ No other player answers found, using mock data');
      return generateMockResults();
    }

    // Calculate base compatibility from regular answers
    let totalScore = 0;
    let maxScore = 0;
    
    myAnswers.regularAnswers.forEach((myAnswer, index) => {
      const otherAnswer = otherPlayerAnswers.regularAnswers[index];
      if (myAnswer !== undefined && otherAnswer !== undefined) {
        const diff = Math.abs(myAnswer - otherAnswer);
        // More generous scoring: 0-100 based on difference, but with minimum of 40
        const questionScore = Math.max(40, 100 - (diff * 15));
        totalScore += questionScore;
        maxScore += 100;
      }
    });

    // Calculate advanced compatibility
    const advancedScore = calculateAdvancedCompatibility(
      myAnswers.advancedAnswers,
      otherPlayerAnswers.advancedAnswers
    );

    // Combine scores (60% regular, 40% advanced) with bonus to avoid low scores
    const baseScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 70;
    const finalScore = Math.min(95, Math.max(65, Math.round((baseScore * 0.6) + (advancedScore * 0.4))));

    console.log(`📊 Independent calculation: ${finalScore}%`);

    return {
      score: finalScore,
      breakdown: generateBreakdown(finalScore, baseScore, advancedScore),
      insights: generateInsights(finalScore),
      matchLevel: getMatchLevel(finalScore),
      recommendations: generateRecommendations(finalScore)
    };
  }, [myAnswers, otherPlayerAnswers]);

  // Calculate advanced compatibility
  const calculateAdvancedCompatibility = (myAdvanced: any, otherAdvanced: any): number => {
    if (!myAdvanced || !otherAdvanced) return 75;

    let totalScore = 0;
    let factorCount = 0;

    // Personality traits compatibility
    if (myAdvanced.personalityTraits && otherAdvanced.personalityTraits) {
      const myTraits = myAdvanced.personalityTraits.traits || [];
      const otherTraits = otherAdvanced.personalityTraits.traits || [];
      const commonTraits = myTraits.filter((trait: string) => otherTraits.includes(trait));
      const traitScore = (commonTraits.length / Math.max(myTraits.length, otherTraits.length, 1)) * 100;
      totalScore += Math.max(60, traitScore);
      factorCount++;
    }

    // Lifestyle compatibility
    if (myAdvanced.lifestyle && otherAdvanced.lifestyle) {
      let lifestyleScore = 0;
      if (myAdvanced.lifestyle.sleepSchedule === otherAdvanced.lifestyle.sleepSchedule) lifestyleScore += 25;
      if (myAdvanced.lifestyle.socialActivity === otherAdvanced.lifestyle.socialActivity) lifestyleScore += 25;
      totalScore += Math.max(50, lifestyleScore);
      factorCount++;
    }

    // Communication compatibility
    if (myAdvanced.communication && otherAdvanced.communication) {
      let communicationScore = 0;
      if (myAdvanced.communication.style === otherAdvanced.communication.style) communicationScore += 50;
      if (myAdvanced.communication.conflictResolution === otherAdvanced.communication.conflictResolution) communicationScore += 50;
      totalScore += Math.max(60, communicationScore);
      factorCount++;
    }

    // Interests compatibility
    if (myAdvanced.interests && otherAdvanced.interests) {
      const myHobbies = myAdvanced.interests.hobbies || [];
      const otherHobbies = otherAdvanced.interests.hobbies || [];
      const commonHobbies = myHobbies.filter((hobby: string) => otherHobbies.includes(hobby));
      const interestScore = (commonHobbies.length / Math.max(myHobbies.length, otherHobbies.length, 1)) * 100;
      totalScore += Math.max(55, interestScore);
      factorCount++;
    }

    // Values compatibility
    if (myAdvanced.values && otherAdvanced.values) {
      let valuesScore = 0;
      if (myAdvanced.values.family === otherAdvanced.values.family) valuesScore += 50;
      if (myAdvanced.values.career === otherAdvanced.values.career) valuesScore += 50;
      totalScore += Math.max(65, valuesScore);
      factorCount++;
    }

    return factorCount > 0 ? Math.round(totalScore / factorCount) : 75;
  };

  // Generate score breakdown
  const generateBreakdown = (finalScore: number, baseScore: number, advancedScore: number) => {
    // Ensure scores are reasonably high and balanced
    return {
      values: Math.min(95, baseScore + Math.floor(Math.random() * 15)),
      personality: Math.min(95, advancedScore + Math.floor(Math.random() * 20)),
      lifestyle: Math.min(95, Math.round((baseScore + advancedScore) / 2) + Math.floor(Math.random() * 10)),
      communication: Math.min(95, advancedScore + Math.floor(Math.random() * 15)),
      interests: Math.min(95, Math.round((baseScore * 0.7 + advancedScore * 0.3)) + Math.floor(Math.random() * 12))
    };
  };

  // Generate insights based on score
  const generateInsights = (score: number): string[] => {
    const insights: string[] = [];
    
    if (score >= 85) {
      insights.push("🌟 Exceptional connection! You two vibe incredibly well");
      insights.push("💫 Strong alignment in core values and communication styles");
      insights.push("🎯 Great potential for a meaningful relationship");
    } else if (score >= 75) {
      insights.push("✅ Solid compatibility with excellent foundation");
      insights.push("🤝 Good balance of shared interests and individual uniqueness");
      insights.push("💡 Great communication dynamics between you");
    } else if (score >= 65) {
      insights.push("📚 Good starting point with room to grow together");
      insights.push("✨ Interesting differences that can complement each other");
      insights.push("🌱 Potential for beautiful growth as you learn more about each other");
    } else {
      insights.push("🔄 An opportunity to explore new perspectives together");
      insights.push("💫 Unique combination that can create beautiful dynamics");
      insights.push("🌅 Every connection has its own special magic");
    }

    // Add some positive insights regardless of score
    insights.push("❤️ Remember that compatibility scores are just one perspective");
    insights.push("🌈 Your unique connection goes beyond any test score");

    return insights.slice(0, 4); // Return top 4 insights
  };

  // Get match level with positive framing
  const getMatchLevel = (score: number): string => {
    if (score >= 90) return "Soulmate Connection ✨";
    if (score >= 85) return "Exceptional Match 🌟";
    if (score >= 80) return "Amazing Compatibility 💫";
    if (score >= 75) return "Great Connection 💕";
    if (score >= 70) return "Strong Potential 🌈";
    if (score >= 65) return "Good Match 🌻";
    return "Interesting Connection 🔮";
  };

  // Generate recommendations
  const generateRecommendations = (score: number): string[] => {
    const recommendations = [];
    
    if (score >= 80) {
      recommendations.push("Continue nurturing your strong connection with quality time together");
      recommendations.push("Keep communicating openly and celebrating your similarities");
      recommendations.push("Explore new adventures together to strengthen your bond even more");
    } else if (score >= 70) {
      recommendations.push("Schedule regular date nights to deepen your connection");
      recommendations.push("Practice active listening to understand each other better");
      recommendations.push("Celebrate your differences as opportunities for growth");
    } else {
      recommendations.push("Focus on finding common ground in activities you both enjoy");
      recommendations.push("Be patient and give your connection time to develop naturally");
      recommendations.push("Remember that every relationship grows at its own pace");
    }

    recommendations.push("Always communicate with kindness and respect");
    recommendations.push("Celebrate the unique qualities you each bring to the connection");

    return recommendations.slice(0, 4); // Return top 4 recommendations
  };

  // Generate mock results when other player data isn't available
  const generateMockResults = (): CompatibilityResults => {
    const mockScore = Math.floor(Math.random() * 20) + 70; // 70-90 range
    
    return {
      score: mockScore,
      breakdown: {
        values: mockScore + Math.floor(Math.random() * 10) - 5,
        personality: mockScore + Math.floor(Math.random() * 15) - 5,
        lifestyle: mockScore + Math.floor(Math.random() * 12) - 6,
        communication: mockScore + Math.floor(Math.random() * 8) - 4,
        interests: mockScore + Math.floor(Math.random() * 10) - 5
      },
      insights: generateInsights(mockScore),
      matchLevel: getMatchLevel(mockScore),
      recommendations: generateRecommendations(mockScore)
    };
  };

  // Show results based on local calculation
  const showResults = useCallback(() => {
    console.log('🚀 Showing results based on local data');
    const calculatedResults = calculateResultsIndependently();
    setResults(calculatedResults);
    setGameStatus('results');
  }, [calculateResultsIndependently]);

  // FIXED: Automatically show results when both players have submitted and we have both answers
  useEffect(() => {
    if (gameStatus === 'waiting-for-players' && otherPlayerAnswers) {
      const bothSubmitted = players.every(player => localSubmissionStatus[player.name]);
      
      if (bothSubmitted) {
        console.log('🎉 Both players submitted and we have all data - AUTO SHOWING RESULTS');
        // Small delay to ensure UI updates properly
        setTimeout(() => {
          showResults();
        }, 1500);
      }
    }
  }, [gameStatus, otherPlayerAnswers, localSubmissionStatus, players, showResults]);

  // Enhanced final submission with proper event flow
  const submitFinal = () => {
    console.log('🚀 Submitting final answers with local data:', myAnswers);
    setIsSubmittingFinal(true);
    
    // Update local submission status immediately
    setLocalSubmissionStatus(prev => ({
      ...prev,
      [playerName]: true
    }));

    // Share my answers with other player FIRST
    socket?.emit('compatibility-share-answers', {
      roomId,
      answers: myAnswers
    });

    // Then submit final answers - this will trigger the waiting screen
    socket?.emit('compatibility-submit-final', { roomId });

    console.log('✅ Final submission events emitted');
  };

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

  // Enhanced socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Room events
    const handleRoomCreated = (room: any) => {
      setRoomId(room.roomId);
      setPlayers(room.players);
      setIsHost(true);
      
      // Initialize local submission status
      const initialSubmissionStatus: {[key: string]: boolean} = {};
      room.players.forEach((player: Player) => {
        initialSubmissionStatus[player.name] = false;
      });
      setLocalSubmissionStatus(initialSubmissionStatus);
      
      // Initialize my answers with empty array for all questions
      setMyAnswers({
        regularAnswers: Array(questions.length).fill(undefined),
        advancedAnswers: {}
      });
      
      setError('');
      setLoading(false);
      setGameStatus('waiting');
    };

    const handleRoomJoined = (room: any) => {
      setRoomId(room.roomId);
      setPlayers(room.players);
      setIsHost(room.players.find((p: Player) => p.socketId === socket.id)?.isHost || false);
      
      // Initialize local submission status
      const initialSubmissionStatus: {[key: string]: boolean} = {};
      room.players.forEach((player: Player) => {
        initialSubmissionStatus[player.name] = false;
      });
      setLocalSubmissionStatus(initialSubmissionStatus);
      
      // Initialize my answers with empty array for all questions
      setMyAnswers({
        regularAnswers: Array(questions.length).fill(undefined),
        advancedAnswers: {}
      });
      
      setError('');
      setLoading(false);
      setGameStatus('waiting');
    };

    const handleUpdatePlayers = (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
      
      // Update local submission status for new players
      setLocalSubmissionStatus(prev => {
        const updated = {...prev};
        updatedPlayers.forEach(player => {
          if (!(player.name in updated)) {
            updated[player.name] = false;
          }
        });
        return updated;
      });
    };

    // Game events
    const handleGameStarted = (data: any) => {
      setGameStatus('playing');
      setCurrentQuestion(0);
      setTimeLeft(30);
      setHasAnsweredCurrent(false);
      
      // Reset submission tracking when game starts
      setLocalSubmissionStatus(prev => {
        const reset: {[key: string]: boolean} = {};
        Object.keys(prev).forEach(key => {
          reset[key] = false;
        });
        return reset;
      });
      
      // Reset answers
      setMyAnswers({
        regularAnswers: Array(questions.length).fill(undefined),
        advancedAnswers: {}
      });
      setOtherPlayerAnswers(null);
    };

    const handlePlayerProgress = (data: any) => {
      setPlayerProgress(prev => ({
        ...prev,
        [data.player]: data.progress
      }));
    };

    const handleWaitingForPlayers = (data: any) => {
      console.log('🔄 Waiting for players:', data.waitingFor);
      setWaitingForPlayers(data.waitingFor || []);
      setGameStatus('waiting-for-players');
      setIsSubmittingFinal(false);
    };

    // Handle other player's answers
    const handleOtherPlayerAnswers = (data: any) => {
      console.log('📨 Received other player answers:', data);
      setOtherPlayerAnswers(data.answers);
    };

    // Handle submission updates
    const handleSubmissionUpdate = (data: any) => {
      console.log(`📝 Submission update: ${data.player} - ${data.submitted}`);
      
      setLocalSubmissionStatus(prev => ({
        ...prev,
        [data.player]: data.submitted
      }));
    };

    // FIXED: Handle when all players have submitted - auto calculate results
    const handleAllSubmitted = () => {
      console.log('🎉 All players have submitted on server side');
      // We'll rely on the local effect to show results when we have both data
       setGameStatus('results');
    };

    // Error handling
    const handleJoinError = (errorMsg: string) => {
      setError(errorMsg);
      setLoading(false);
    };

    const handleStartError = (errorMsg: string) => {
      setError(errorMsg);
    };

    // Register event listeners
    socket.on('compatibility-room-created', handleRoomCreated);
    socket.on('compatibility-room-joined', handleRoomJoined);
    socket.on('compatibility-update-players', handleUpdatePlayers);
    socket.on('compatibility-game-started', handleGameStarted);
    socket.on('compatibility-player-progress', handlePlayerProgress);
    socket.on('compatibility-waiting-for-players', handleWaitingForPlayers);
    socket.on('compatibility-other-player-answers', handleOtherPlayerAnswers);
    socket.on('compatibility-submission-update', handleSubmissionUpdate);
    socket.on('compatibility-all-submitted', handleAllSubmitted);
    socket.on('join-error', handleJoinError);
    socket.on('start-error', handleStartError);

    // Cleanup
    return () => {
      socket.off('compatibility-room-created', handleRoomCreated);
      socket.off('compatibility-room-joined', handleRoomJoined);
      socket.off('compatibility-update-players', handleUpdatePlayers);
      socket.off('compatibility-game-started', handleGameStarted);
      socket.off('compatibility-player-progress', handlePlayerProgress);
      socket.off('compatibility-waiting-for-players', handleWaitingForPlayers);
      socket.off('compatibility-other-player-answers', handleOtherPlayerAnswers);
      socket.off('compatibility-submission-update', handleSubmissionUpdate);
      socket.off('compatibility-all-submitted', handleAllSubmitted);
      socket.off('join-error', handleJoinError);
      socket.off('start-error', handleStartError);
    };
  }, [socket, questions.length, showResults]);

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
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [gameStatus, currentQuestion, currentAdvancedSection]);

  // Enhanced reset function
  const resetGame = () => {
    setRoomId('');
    setPlayerName('');
    setPlayers([]);
    setIsHost(false);
    setGameStatus('lobby');
    setCurrentQuestion(0);
    setPlayerProgress({});
    setResults(null);
    setWaitingForPlayers([]);
    setError('');
    setCurrentAdvancedSection('');
    setAdvancedProgress(0);
    setHasAnsweredCurrent(false);
    setIsSubmittingFinal(false);
    // Reset local data
    setMyAnswers({ regularAnswers: [], advancedAnswers: {} });
    setOtherPlayerAnswers(null);
    setLocalSubmissionStatus({});
  };

  // Room management
  const createRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setLoading(true);
    setError('');
    socket?.emit('create-compatibility-room', {
      player: { name: playerName.trim(), socketId: socket?.id }
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
      roomId: roomId.trim().toUpperCase(),
      player: { name: playerName.trim(), socketId: socket?.id }
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
    if (roomId && socket) {
      socket.emit('leave-room', roomId);
    }
    resetGame();
  };

  // Game actions
  const submitAnswer = (answerIndex: number) => {
    if (hasAnsweredCurrent) return;
    
    setHasAnsweredCurrent(true);
    
    // Update local answers
    setMyAnswers(prev => {
      const newRegularAnswers = [...prev.regularAnswers];
      newRegularAnswers[currentQuestion] = answerIndex;
      return {
        ...prev,
        regularAnswers: newRegularAnswers
      };
    });

    socket?.emit('compatibility-answer-submitted', {
      roomId,
      questionIndex: currentQuestion,
      answer: answerIndex
    });

    // Auto-advance to next question after 1 second
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setTimeLeft(30);
        setHasAnsweredCurrent(false);
      } else {
        // All regular questions completed
        setGameStatus('advanced');
      }
    }, 1000);
  };

  const submitAdvancedAnswer = (category: string, answers: any) => {
    // Update local advanced answers
    setMyAnswers(prev => ({
      ...prev,
      advancedAnswers: {
        ...prev.advancedAnswers,
        [category]: answers
      }
    }));

    const completedSections = Object.keys({...myAnswers.advancedAnswers, [category]: answers}).length;
    const progress = Math.round((completedSections / 5) * 100);
    setAdvancedProgress(progress);

    socket?.emit('compatibility-advanced-answers', {
      roomId,
      category,
      answers
    });
  };

  // Enhanced screenshot capture with better error handling
  const captureScreenshot = async () => {
    if (!resultsRef.current) {
      alert('Results not available for capture');
      return;
    }
    
    setIsSharing(true);
    try {
      // Add a small delay to ensure the component is fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(resultsRef.current, {
        backgroundColor: '#7c3aed',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false
      });

      // Convert canvas to blob and create download
      canvas.toBlob((blob) => {
        if (blob) {
          // Create download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `compatibility-${roomId}-${results?.score}percent.png`;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          // Show success message
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        }
      }, 'image/png');

    } catch (error) {
      console.error('Error capturing screenshot:', error);
      alert('Failed to capture screenshot. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  // Enhanced share to clipboard with fallback
  const shareToClipboard = async () => {
    if (!resultsRef.current) {
      alert('Results not available for sharing');
      return;
    }
    
    setIsSharing(true);
    try {
      // Add a small delay to ensure the component is fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(resultsRef.current, {
        backgroundColor: '#7c3aed',
        scale: 1, // Lower scale for clipboard to improve performance
        useCORS: true,
        allowTaint: false,
        logging: false
      });

      // Convert canvas to blob for clipboard
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            // Check if clipboard API is available and has write permission
            if (navigator.clipboard && navigator.clipboard.write) {
              try {
                await navigator.clipboard.write([
                  new ClipboardItem({
                    'image/png': blob
                  })
                ]);
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
                return;
              } catch (clipboardError) {
                console.warn('Clipboard API failed, falling back to download:', clipboardError);
              }
            }
            
            // Fallback: Download the image
            console.log('Clipboard API not available, falling back to download');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `compatibility-${roomId}-${results?.score}percent.png`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
            
          } catch (error) {
            console.error('Error in clipboard fallback:', error);
            alert('Failed to share results. Please try the download option instead.');
          }
        }
      }, 'image/png');

    } catch (error) {
      console.error('Error sharing to clipboard:', error);
      alert('Failed to share results. Please try again or use the download option.');
    } finally {
      setIsSharing(false);
    }
  };

  // Get waiting status for display
  const getWaitingStatus = () => {
    if (players.length < 2) return ['Waiting for second player...'];
    
    const waiting = players.filter(player => !localSubmissionStatus[player.name]);
    return waiting.map(player => player.name);
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
            className="w-full bg-white/20 text-white py-3 rounded-xl font-bold hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-white/30"
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

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-4 text-center">Waiting for Players</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {players.map((player) => (
                <div
                  key={player.socketId}
                  className={`p-4 rounded-xl border-2 ${
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
                        {player.isHost && <Crown className="w-4 h-4 text-yellow-400 fill-current" />}
                      </div>
                      <p className="text-white/80 text-sm">{player.isHost ? 'Room Host' : 'Player'}</p>
                    </div>
                  </div>
                </div>
              ))}
              
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

          <div className="bg-white/5 border border-white/20 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white text-center leading-relaxed">
              {question.text}
            </h2>
          </div>
          
          <div className="space-y-3 max-w-2xl mx-auto">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => submitAnswer(index)}
                disabled={hasAnsweredCurrent}
                className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200 group ${
                  hasAnsweredCurrent
                    ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-70'
                    : 'bg-white/5 border-white/20 hover:border-purple-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm transition-colors ${
                    hasAnsweredCurrent ? 'bg-white/10' : 'bg-white/10 group-hover:bg-purple-500'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-lg font-semibold text-white flex-1">{option}</span>
                  <ChevronRight className={`w-5 h-5 transition-transform ${
                    hasAnsweredCurrent ? 'text-white/30' : 'text-white/60 group-hover:text-white group-hover:translate-x-1'
                  }`} />
                </div>
              </button>
            ))}
          </div>

          {hasAnsweredCurrent && (
            <div className="mt-6 p-4 bg-white/5 border border-white/20 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2 text-white mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="font-semibold">Answer Submitted!</span>
              </div>
              <p className="text-white/70 text-sm">
                {currentQuestion < questions.length - 1 
                  ? 'Moving to next question...' 
                  : 'Moving to advanced section...'
                }
              </p>
            </div>
          )}

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
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6 mb-6 border border-white/20">
          <div className="text-center mb-6">
            <Sparkles className="w-12 h-12 text-white mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white mb-2">Advanced Compatibility</h1>
            <p className="text-white/80">Dive deeper into your personality and preferences</p>
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {Object.entries(advancedQuestions).map(([section, data]) => (
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
                  {myAnswers.advancedAnswers[section] ? '✓ Completed' : 'Click to answer'}
                </p>
              </button>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={submitFinal}
              disabled={isSubmittingFinal || localSubmissionStatus[playerName]}
              className={`py-3 px-8 rounded-xl font-bold text-lg transition-all duration-200 flex items-center gap-2 mx-auto ${
                isSubmittingFinal || localSubmissionStatus[playerName]
                  ? 'bg-gray-500/50 text-white/60 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
              }`}
            >
              {isSubmittingFinal ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : localSubmissionStatus[playerName] ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Submitted - Waiting for Partner
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Complete Compatibility Test
                </>
              )}
            </button>
          </div>

          {/* Enhanced submission status display */}
          <div className="mt-6 p-4 bg-white/5 border border-white/20 rounded-xl">
            <h3 className="text-base font-semibold text-white mb-3 text-center">Submission Status</h3>
            <div className="space-y-2">
              {players.map(player => (
                <div key={player.name} className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{player.name}</span>
                  </div>
                  <div className={`flex items-center gap-2 ${
                    localSubmissionStatus[player.name] ? 'text-green-400' : 'text-amber-400'
                  }`}>
                    {localSubmissionStatus[player.name] ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm font-semibold">Submitted</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-5 h-5 animate-pulse" />
                        <span className="text-sm font-semibold">Waiting...</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={leaveRoom}
          className="fixed bottom-6 left-6 p-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {currentAdvancedSection && (
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
                {renderAdvancedQuestions(currentAdvancedSection, advancedQuestions[currentAdvancedSection as keyof AdvancedQuestions])}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderAdvancedQuestions = (section: string, questions: any) => {
    if (section === 'personalityTraits') {
      const currentTraits = myAnswers.advancedAnswers[section]?.traits || [];
      
      return (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-white mb-4 text-center">{questions.question}</h3>
          <div className="grid grid-cols-2 gap-3">
            {questions.options.map((trait: string) => (
              <button
                key={trait}
                onClick={() => {
                  const newTraits = currentTraits.includes(trait)
                    ? currentTraits.filter((t: string) => t !== trait)
                    : [...currentTraits, trait];
                  
                  submitAdvancedAnswer(section, { traits: newTraits });
                }}
                className={`p-3 rounded-lg border-2 text-center transition-all duration-200 text-sm ${
                  currentTraits.includes(trait)
                    ? 'border-green-400 bg-green-500/20 text-white'
                    : 'border-white/20 bg-white/5 text-white/80 hover:border-white/40'
                }`}
              >
                {trait}
              </button>
            ))}
          </div>
          {currentTraits.length > 0 && (
            <div className="text-center text-green-400 text-sm mt-2">
              Selected {currentTraits.length} traits
            </div>
          )}
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
                      ...myAnswers.advancedAnswers[section],
                      [key]: option
                    });
                  }}
                  className={`w-full p-3 text-left rounded-lg border-2 transition-all duration-200 ${
                    myAnswers.advancedAnswers[section]?.[key] === option
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

  const renderWaitingForPlayers = () => {
    const waitingPlayers = getWaitingStatus();
    const hasOtherPlayerData = !!otherPlayerAnswers;
    const bothSubmitted = players.every(player => localSubmissionStatus[player.name]);

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 text-center border border-white/20">
          <Clock className="w-16 h-16 text-white mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold text-white mb-3">Calculating Results</h1>
          
          <div className="space-y-3 mb-6">
            {players.map(player => (
              <div key={player.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center text-white font-semibold">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white font-semibold">{player.name}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {localSubmissionStatus[player.name] ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Show appropriate message based on state */}
          {waitingPlayers.length > 0 && (
            <div>
              <p className="text-white/80 mb-4">
                Waiting for {waitingPlayers.join(', ')} to submit...
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-amber-400 text-sm">Please wait for your partner</span>
              </div>
            </div>
          )}

          {bothSubmitted && !hasOtherPlayerData && (
            <div>
              <p className="text-white/80 mb-4">
                Processing your answers and exchanging data...
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                <span className="text-blue-400 text-sm">Preparing your results</span>
              </div>
            </div>
          )}

          {bothSubmitted && hasOtherPlayerData && (
            <div>
              <p className="text-white/80 mb-4">
                Calculating compatibility results...
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-lg border border-green-500/30">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm">Results ready! Showing now...</span>
              </div>
            </div>
          )}

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
  };

  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 p-4">
        <div ref={resultsRef} className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 text-center mb-6 border border-white/20">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Compatibility Results</h1>
            <p className="text-xl text-white/80 mb-6">{results.matchLevel}</p>
            
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={resetGame}
              className="p-4 bg-white/10 border-2 border-white/20 rounded-xl hover:border-white/40 transition-all duration-200 text-center group"
            >
              <ArrowLeft className="w-6 h-6 text-white mx-auto mb-2 group-hover:-translate-x-1 transition-transform" />
              <span className="text-white font-semibold">New Test</span>
            </button>
            
            <button
              onClick={shareToClipboard}
              disabled={isSharing}
              className="p-4 bg-white/10 border-2 border-white/20 rounded-xl hover:border-white/40 transition-all duration-200 text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSharing ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              ) : (
                <Share2 className="w-6 h-6 text-white mx-auto mb-2" />
              )}
              <span className="text-white font-semibold">
                {copied ? 'Copied!' : (isSharing ? 'Sharing...' : 'Share Results')}
              </span>
            </button>
            
            <button
              onClick={captureScreenshot}
              disabled={isSharing}
              className="p-4 bg-white/10 border-2 border-white/20 rounded-xl hover:border-white/40 transition-all duration-200 text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSharing ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              ) : (
                <Download className="w-6 h-6 text-white mx-auto mb-2" />
              )}
              <span className="text-white font-semibold">
                {isSharing ? 'Saving...' : 'Save Results'}
              </span>
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
      communication: <Target className="w-5 h-5" />,
      interests: <Sparkles className="w-5 h-5" />,
      values: <Trophy className="w-5 h-5" />
    };
    return icons[section] || <Star className="w-5 h-5" />;
  };

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto bg-gray-900">
      {gameStatus === 'lobby' && renderLobby()}
      {gameStatus === 'waiting' && renderWaitingRoom()}
      {gameStatus === 'playing' && questions[currentQuestion] && renderQuestion(questions[currentQuestion])}
      {gameStatus === 'advanced' && renderAdvancedSection()}
      {gameStatus === 'waiting-for-players' && renderWaitingForPlayers()}
      {gameStatus === 'results' && renderResults()}
    </div>
  );
};

export default Compatibility;