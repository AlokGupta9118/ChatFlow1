// socket/gameSocket.js
import GameRoom from '../models/GameRoom.js';

const gameSocket = (io) => {
  const questions = {
    truths: [
      "What's your biggest fear?",
      "What's the most embarrassing thing you've ever done?",
      "Have you ever cheated on a test?",
      "What's your guilty pleasure?",
      "What's something you've never told anyone?",
      "What's the worst lie you've ever told?",
      "What's your most awkward date story?",
      "What's something you're secretly proud of?",
      "What's the most trouble you've been in?",
      "What's your weirdest habit?"
    ],
    dares: [
      "Do your best impression of a celebrity",
      "Sing a song at the top of your lungs",
      "Post an embarrassing photo on social media",
      "Call a friend and sing happy birthday",
      "Do 20 pushups right now",
      "Eat a spoonful of hot sauce",
      "Dance without music for 1 minute",
      "Speak in an accent for the next 3 rounds",
      "Let the group choose your profile picture for a day",
      "Tell a embarrassing story about yourself"
    ],
    mostLikely: [
      "Who's most likely to become a millionaire?",
      "Who's most likely to get lost in their own hometown?",
      "Who's most likely to become famous?",
      "Who's most likely to survive a zombie apocalypse?",
      "Who's most likely to be late to their own wedding?",
      "Who's most likely to start a business?",
      "Who's most likely to go on a reality show?",
      "Who's most likely to be a superhero?",
      "Who's most likely to travel the world?",
      "Who's most likely to write a book?"
    ],
    neverHaveIEver: [
      "Never have I ever lied to get out of trouble",
      "Never have I ever sung in the shower",
      "Never have I ever cheated in a game",
      "Never have I ever had a crush on a teacher",
      "Never have I ever stolen something",
      "Never have I ever pretended to be sick",
      "Never have I ever broken a bone",
      "Never have I ever been in a fight",
      "Never have I ever had a secret admirer",
      "Never have I ever traveled alone"
    ],
    wouldYouRather: [
      {
        id: 1,
        optionA: "Always have to sing instead of speak",
        optionB: "Always have to dance everywhere you go"
      },
      {
        id: 2,
        optionA: "Have unlimited money but no friends",
        optionB: "Have unlimited friends but no money"
      },
      {
        id: 3,
        optionA: "Be able to read minds",
        optionB: "Be able to see the future"
      },
      {
        id: 4,
        optionA: "Always be 10 minutes late",
        optionB: "Always be 2 hours early"
      },
      {
        id: 5,
        optionA: "Have a rewind button for your life",
        optionB: "Have a pause button for your life"
      }
    ],
    compatibility: [
      {
        question: "What's your ideal weekend?",
        options: ["Adventure & Travel", "Relaxing at Home", "Social Parties", "Learning New Things"]
      },
      {
        question: "How do you handle conflict?",
        options: ["Direct Confrontation", "Avoidance", "Compromise", "Seek Mediation"]
      },
      {
        question: "What's your love language?",
        options: ["Words of Affirmation", "Quality Time", "Gifts", "Physical Touch", "Acts of Service"]
      }
    ]
  };

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Room Management
    socket.on('create-game-room', async (data) => {
      await createGameRoom(socket, data);
    });

    socket.on('join-game-room', async (data) => {
      await joinGameRoom(socket, data);
    });

    socket.on('leave-game-room', async (data) => {
      await leaveGameRoom(socket, data);
    });

    socket.on('start-game', async (data) => {
      await startGame(socket, data);
    });

    socket.on('player-ready', async (data) => {
      await handlePlayerReady(socket, data);
    });

    // Truth or Dare Events
    socket.on('spin-wheel', async (data) => {
      await handleSpinWheel(socket, data);
    });

    socket.on('choose-truth-dare', async (data) => {
      await handleTruthDareChoice(socket, data);
    });

    socket.on('submit-truth', async (data) => {
      await handleSubmitTruth(socket, data);
    });

    socket.on('submit-dare-proof', async (data) => {
      await handleSubmitDareProof(socket, data);
    });

    socket.on('next-round', async (data) => {
      await handleNextRound(socket, data);
    });

    // Compatibility Quiz Events
    socket.on('submit-compatibility-answers', async (data) => {
      await handleCompatibilityAnswers(socket, data);
    });

    // Who's Most Likely Events
    socket.on('vote-most-likely', async (data) => {
      await handleVoteMostLikely(socket, data);
    });

    // Never Have I Ever Events
    socket.on('never-have-confess', async (data) => {
      await handleNeverHaveConfess(socket, data);
    });

    // Would You Rather Events
    socket.on('would-you-rather-choose', async (data) => {
      await handleWouldYouRatherChoose(socket, data);
    });

    // Chat Messages
    socket.on('send-game-chat', async (data) => {
      await handleGameChat(socket, data);
    });

    // Disconnection handling
    socket.on('disconnect', async () => {
      await handleDisconnect(socket);
    });
  });

  // Room Management Functions
  const createGameRoom = async (socket, { gameType, roomName, playerName, settings = {} }) => {
    try {
      const roomCode = generateRoomCode();
      
      const room = new GameRoom({
        roomCode,
        gameType,
        roomName,
        host: socket.id,
        players: [{
          socketId: socket.id,
          name: playerName,
          isHost: true,
          isReady: false,
          connected: true
        }],
        settings: {
          maxPlayers: settings.maxPlayers || 8,
          rounds: settings.rounds || 10,
          timeLimit: settings.timeLimit || 30,
          ...settings
        },
        gameData: initializeGameData(gameType),
        chatMessages: []
      });

      await room.save();
      socket.join(roomCode);

      socket.emit('room-created', { 
        roomCode, 
        room: room.toObject(),
        success: true 
      });

      console.log(`Game room created: ${roomCode} for ${gameType}`);
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', { message: 'Failed to create room', error: error.message });
    }
  };

  const joinGameRoom = async (socket, { roomCode, playerName }) => {
    try {
      const room = await GameRoom.findOne({ roomCode });
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.players.length >= room.settings.maxPlayers) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      if (room.gameState !== 'waiting') {
        socket.emit('error', { message: 'Game has already started' });
        return;
      }

      // Check if player is reconnecting
      const existingPlayer = room.players.find(p => p.name === playerName && !p.connected);
      
      if (existingPlayer) {
        // Reconnect existing player
        existingPlayer.socketId = socket.id;
        existingPlayer.connected = true;
      } else {
        // Add new player
        room.players.push({
          socketId: socket.id,
          name: playerName,
          isHost: false,
          isReady: false,
          connected: true
        });
      }

      await room.save();
      socket.join(roomCode);

      // Notify all players in the room
      io.to(roomCode).emit('player-joined', {
        player: existingPlayer || room.players.find(p => p.socketId === socket.id),
        players: room.players,
        room: room.toObject()
      });

      socket.emit('room-joined', { 
        room: room.toObject(),
        success: true 
      });

      // Send chat history
      socket.emit('chat-history', { messages: room.chatMessages });

    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room', error: error.message });
    }
  };

  // Truth or Dare Game Handlers
  const handleSpinWheel = async (socket, { roomCode }) => {
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room || room.gameType !== 'truth-or-dare') return;

      const activePlayers = room.players.filter(p => p.connected);
      const randomPlayer = activePlayers[Math.floor(Math.random() * activePlayers.length)];
      
      room.gameData.currentPlayer = randomPlayer.socketId;
      room.gameData.spinResult = {
        player: randomPlayer.name,
        timestamp: new Date()
      };

      await room.save();

      // Show spinning animation to all players
      io.to(roomCode).emit('wheel-spinning', { 
        duration: 3000 // 3 seconds spinning
      });

      // After spinning, reveal result
      setTimeout(async () => {
        io.to(roomCode).emit('wheel-result', {
          selectedPlayer: randomPlayer.name,
          playerId: randomPlayer.socketId
        });

        // Only the selected player can see choice buttons
        socket.to(randomPlayer.socketId).emit('show-truth-dare-choice');
      }, 3000);

    } catch (error) {
      console.error('Error spinning wheel:', error);
      socket.emit('error', { message: 'Failed to spin wheel' });
    }
  };

  const handleTruthDareChoice = async (socket, { roomCode, choice }) => {
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player || socket.id !== room.gameData.currentPlayer) return;

      let question;
      if (choice === 'truth') {
        question = getRandomQuestion(questions.truths, room.gameData.usedQuestions);
        room.gameData.currentChoice = 'truth';
      } else {
        question = getRandomQuestion(questions.dares, room.gameData.usedQuestions);
        room.gameData.currentChoice = 'dare';
      }

      room.gameData.currentQuestion = question;
      room.gameData.usedQuestions.push(question);
      room.gameData.awaitingResponse = true;

      await room.save();

      io.to(roomCode).emit('truth-dare-selected', {
        player: player.name,
        choice,
        question,
        awaitingResponse: true
      });

    } catch (error) {
      console.error('Error handling truth/dare choice:', error);
      socket.emit('error', { message: 'Failed to process choice' });
    }
  };

  const handleSubmitTruth = async (socket, { roomCode, answer }) => {
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      // Add to chat as a system message
      room.chatMessages.push({
        player: 'System',
        message: `${player.name} shared a truth: "${answer}"`,
        type: 'system',
        timestamp: new Date()
      });

      room.gameData.awaitingResponse = false;
      await room.save();

      io.to(roomCode).emit('truth-submitted', {
        player: player.name,
        answer,
        chatMessage: room.chatMessages[room.chatMessages.length - 1]
      });

      // Notify host to show next round button
      const host = room.players.find(p => p.isHost);
      if (host) {
        io.to(host.socketId).emit('enable-next-round');
      }

    } catch (error) {
      console.error('Error submitting truth:', error);
      socket.emit('error', { message: 'Failed to submit truth' });
    }
  };

  const handleSubmitDareProof = async (socket, { roomCode, proofType, proofData }) => {
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      // In a real app, you'd handle file uploads here
      room.chatMessages.push({
        player: 'System',
        message: `${player.name} completed a dare! Proof: ${proofType}`,
        type: 'system',
        timestamp: new Date()
      });

      room.gameData.awaitingResponse = false;
      await room.save();

      io.to(roomCode).emit('dare-completed', {
        player: player.name,
        proofType,
        proofData,
        chatMessage: room.chatMessages[room.chatMessages.length - 1]
      });

      // Notify host to show next round button
      const host = room.players.find(p => p.isHost);
      if (host) {
        io.to(host.socketId).emit('enable-next-round');
      }

    } catch (error) {
      console.error('Error submitting dare proof:', error);
      socket.emit('error', { message: 'Failed to submit dare proof' });
    }
  };

  const handleNextRound = async (socket, { roomCode }) => {
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room) return;

      const host = room.players.find(p => p.socketId === socket.id);
      if (!host || !host.isHost) return;

      room.gameData.currentRound = (room.gameData.currentRound || 0) + 1;
      room.gameData.currentPlayer = null;
      room.gameData.currentQuestion = null;
      room.gameData.awaitingResponse = false;

      await room.save();

      io.to(roomCode).emit('next-round-started', {
        round: room.gameData.currentRound,
        totalRounds: room.settings.rounds
      });

      // Auto-spin for next round after a delay
      setTimeout(() => {
        handleSpinWheel(socket, { roomCode });
      }, 2000);

    } catch (error) {
      console.error('Error starting next round:', error);
      socket.emit('error', { message: 'Failed to start next round' });
    }
  };

  // Chat Handler
  const handleGameChat = async (socket, { roomCode, message }) => {
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      const chatMessage = {
        player: player.name,
        message,
        timestamp: new Date(),
        type: 'text'
      };

      room.chatMessages.push(chatMessage);
      await room.save();

      io.to(roomCode).emit('new-chat-message', chatMessage);

    } catch (error) {
      console.error('Error handling chat message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  };

  // Utility Functions
  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const initializeGameData = (gameType) => {
    const baseData = {
      currentRound: 0,
      startTime: new Date(),
      usedQuestions: []
    };

    switch (gameType) {
      case 'truth-or-dare':
        return {
          ...baseData,
          currentPlayer: null,
          currentChoice: null,
          currentQuestion: null,
          awaitingResponse: false
        };
      case 'compatibility-quiz':
        return {
          ...baseData,
          questions: questions.compatibility,
          answers: new Map(),
          results: null
        };
      case 'whos-most-likely':
        return {
          ...baseData,
          questions: questions.mostLikely,
          currentQuestion: 0,
          votes: new Map(),
          results: null
        };
      case 'never-have-i-ever':
        return {
          ...baseData,
          questions: questions.neverHaveIEver,
          currentQuestion: 0,
          confessions: [],
          scores: new Map()
        };
      case 'would-you-rather':
        return {
          ...baseData,
          questions: questions.wouldYouRather,
          currentQuestion: 0,
          choices: new Map(),
          results: null
        };
      default:
        return baseData;
    }
  };
  // Add to your existing socket/gameSocket.js

// Compatibility Quiz Handler
const handleCompatibilityAnswers = async (socket, { roomCode, answers }) => {
  try {
    const room = await GameRoom.findOne({ roomCode });
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    player.answers.set('compatibility', answers);
    player.isReady = true;

    // Check if all players have answered
    const allAnswered = room.players.every(p => p.isReady || !p.connected);
    
    if (allAnswered) {
      const results = calculateCompatibilityResults(room);
      room.gameData.results = results;
      room.gameState = 'completed';
      
      await room.save();
      io.to(roomCode).emit('compatibility-results', { results });
    } else {
      await room.save();
      io.to(roomCode).emit('player-progress', {
        players: room.players
      });
    }

  } catch (error) {
    console.error('Error handling compatibility answers:', error);
    socket.emit('error', { message: 'Failed to submit answers' });
  }
};

// Who's Most Likely Handler
const handleVoteMostLikely = async (socket, { roomCode, questionId, votedPlayerId }) => {
  try {
    const room = await GameRoom.findOne({ roomCode });
    if (!room) return;

    const voter = room.players.find(p => p.socketId === socket.id);
    const votedPlayer = room.players.find(p => p.socketId === votedPlayerId);

    if (!voter || !votedPlayer) return;

    // Record vote
    if (!room.gameData.votes) room.gameData.votes = new Map();
    room.gameData.votes.set(socket.id, votedPlayerId);

    // Check if all voted
    const activePlayers = room.players.filter(p => p.connected && !p.isHost);
    const allVoted = activePlayers.every(p => room.gameData.votes.has(p.socketId));

    if (allVoted) {
      const results = calculateMostLikelyResults(room);
      room.gameData.results = results;
      
      await room.save();
      io.to(roomCode).emit('most-likely-results', { 
        question: room.gameData.questions[questionId],
        results 
      });
    } else {
      await room.save();
      io.to(roomCode).emit('voting-progress', {
        votes: Array.from(room.gameData.votes.entries())
      });
    }

  } catch (error) {
    console.error('Error handling most likely vote:', error);
    socket.emit('error', { message: 'Failed to submit vote' });
  }
};

// Never Have I Ever Handler
const handleNeverHaveConfess = async (socket, { roomCode, action, confession, questionIndex }) => {
  try {
    const room = await GameRoom.findOne({ roomCode });
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    if (action === 'confess') {
      room.gameData.confessions.push({
        player: player.name,
        confession,
        questionIndex,
        timestamp: new Date()
      });
      player.score += 1;
    }

    // Check if all players have answered
    const activePlayers = room.players.filter(p => p.connected);
    const allAnswered = activePlayers.every(p => 
      room.gameData.confessions.some(c => c.player === p.name && c.questionIndex === questionIndex) ||
      room.gameData.confessions.some(c => c.player === p.name && c.action === 'deny')
    );

    await room.save();

    io.to(roomCode).emit('never-have-update', {
      player: player.name,
      action,
      confession,
      confessions: room.gameData.confessions.filter(c => c.questionIndex === questionIndex),
      scores: room.players.map(p => ({ name: p.name, score: p.score })),
      allAnswered
    });

  } catch (error) {
    console.error('Error handling never have confession:', error);
    socket.emit('error', { message: 'Failed to submit confession' });
  }
};

// Would You Rather Handler
const handleWouldYouRatherChoose = async (socket, { roomCode, questionId, choice }) => {
  try {
    const room = await GameRoom.findOne({ roomCode });
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    if (!room.gameData.choices) room.gameData.choices = new Map();
    room.gameData.choices.set(socket.id, choice);

    // Check if all voted
    const allVoted = room.players.every(p => 
      room.gameData.choices.has(p.socketId) || !p.connected
    );

    if (allVoted) {
      const results = Array.from(room.gameData.choices.entries());
      room.gameData.results = Object.fromEntries(results);
      
      await room.save();
      io.to(roomCode).emit('would-you-rather-results', {
        question: room.gameData.questions[questionId],
        results: room.gameData.results
      });
    } else {
      await room.save();
      io.to(roomCode).emit('would-you-rather-progress', {
        choices: Array.from(room.gameData.choices.entries())
      });
    }

  } catch (error) {
    console.error('Error handling would you rather choice:', error);
    socket.emit('error', { message: 'Failed to submit choice' });
  }
};

  const getRandomQuestion = (questionArray, usedQuestions) => {
    const availableQuestions = questionArray.filter(q => !usedQuestions.includes(q));
    if (availableQuestions.length === 0) {
      // Reset used questions if all have been used
      usedQuestions.length = 0;
      return questionArray[Math.floor(Math.random() * questionArray.length)];
    }
    return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
  };

  const handleDisconnect = async (socket) => {
    try {
      // Find all rooms the socket is in
      const rooms = await GameRoom.find({
        'players.socketId': socket.id,
        'players.connected': true
      });

      for (const room of rooms) {
        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
          player.connected = false;
          
          // If host disconnected, assign new host
          if (player.isHost) {
            const newHost = room.players.find(p => p.connected && !p.isHost);
            if (newHost) {
              newHost.isHost = true;
              io.to(room.roomCode).emit('new-host', { hostId: newHost.socketId });
            }
          }

          await room.save();

          io.to(room.roomCode).emit('player-disconnected', {
            playerId: socket.id,
            players: room.players
          });
        }
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  };
};

export default gameSocket;