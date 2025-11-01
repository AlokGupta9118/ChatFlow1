// socket/gameSocket.js
import UserModel from "../models/User.js";

export default function gameSocket(io) {
  const rooms = {};
  const chatMessages = new Map();

  // ✅ SIMPLIFIED: Remove server-side calculation functions
  // All calculation will now happen on frontend

  // ✅ SIMPLIFIED: Single checkAllSubmissions function - just notifies frontend
  function checkAllSubmissions(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    console.log(`🔍 Checking submissions for room ${roomId}:`, {
      players: room.players.map(p => p.name),
      submissionStatus: room.submissionStatus
    });

    // Count how many players have submitted
    const submittedCount = room.players.filter(player => 
      room.submissionStatus[player.name] === true
    ).length;

    const waitingFor = room.players
      .filter(player => room.submissionStatus[player.name] !== true)
      .map(player => player.name);

    console.log(`📊 Room ${roomId}: ${submittedCount}/${room.players.length} players submitted`);

    if (submittedCount === room.players.length) {
      // ALL players have submitted - notify frontend to calculate results
      console.log(`🎉 ALL players submitted in ${roomId}, notifying frontend`);
      
      // Just notify that all players have submitted - frontend will handle calculation
      io.to(roomId).emit("compatibility-all-submitted");
      
      // Reset submission status for potential replay
      room.players.forEach(player => {
        room.submissionStatus[player.name] = false;
      });
    } 
  }

  // ✅ Helper function to sync game state to all players
  function syncGameState(room) {
    const gameState = {
      currentPlayer: room.currentPlayer,
      currentChoice: room.currentChoice,
      currentPrompt: room.currentPrompt,
      proofUploaded: room.proofUploaded,
      scores: room.scores,
      playerStats: room.playerStats,
      playerLevels: room.playerLevels,
      playerStreaks: room.playerStreaks,
      roundNumber: room.roundNumber,
      proofs: room.proofs,
      gameType: room.gameType,
      status: room.status,
      gameStarted: room.gameStarted
    };

    io.to(room.roomId).emit("game-state-sync", gameState);
  }

  // ✅ Helper function to get random scenario
  function getRandomScenario(room) {
    let availableScenarios = room.scenarios
      .map((_, i) => i)
      .filter((i) => !room.usedScenarios.includes(i));

    if (availableScenarios.length === 0) {
      room.usedScenarios = [];
      availableScenarios = room.scenarios.map((_, i) => i);
    }

    const randomIndex = availableScenarios[Math.floor(Math.random() * availableScenarios.length)];
    room.usedScenarios.push(randomIndex);
    return room.scenarios[randomIndex];
  }

  // ✅ Helper function to calculate round results
  function calculateRoundResults(room) {
    const voteCounts = {};
    
    Object.values(room.votes).forEach(votedFor => {
      voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
    });

    let maxVotes = 0;
    let winners = [];
    
    Object.entries(voteCounts).forEach(([player, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        winners = [player];
      } else if (votes === maxVotes) {
        winners.push(player);
      }
    });

    winners.forEach(winner => {
      room.scores[winner] = (room.scores[winner] || 0) + 10;
      room.playerStats[winner].roundsWon++;
    });

    Object.keys(room.votes).forEach(voter => {
      room.scores[voter] = (room.scores[voter] || 0) + 1;
    });

    const roundResults = {
      votes: room.votes,
      voteCounts: voteCounts,
      winners: winners,
      scores: room.scores,
      playerStats: room.playerStats,
      scenario: room.currentScenario
    };

    io.to(room.roomId).emit("mostlikely-round-results", roundResults);
    console.log(`🏆 Round ${room.currentRound} results: ${winners.join(', ')} won with ${maxVotes} votes`);
  }

  // ✅ Helper function to calculate final results
  function calculateFinalResults(room) {
    const playersWithScores = room.players.map(player => ({
      name: player.name,
      score: room.scores[player.name] || 0,
      stats: room.playerStats[player.name]
    }));

    playersWithScores.sort((a, b) => b.score - a.score);

    return {
      rankings: playersWithScores,
      topPlayer: playersWithScores[0],
      totalRounds: room.totalRounds
    };
  }

  // ✅ SIMPLIFIED: Remove timer functions for compatibility game
  // Frontend will handle timers

  io.on("connection", (socket) => {
    console.log("🎮 Game socket connected:", socket.id);

    const updateRoomPlayers = (roomId) => {
      const room = rooms[roomId];
      if (room) {
        if (room.gameType === "most-likely") {
          io.to(roomId).emit("mostlikely-update-players", room.players);
        } else if (room.gameType === "compatibility") {
          io.to(roomId).emit("compatibility-update-players", room.players);
        } else {
          io.to(roomId).emit("update-players", room.players);
        }
      }
    };

    // 🔥 Send chat history to joining player
    const sendChatHistory = (roomId, socket) => {
      const messages = chatMessages.get(roomId) || [];
      socket.emit("chat-history", messages);
    };

    // ✅ CHAT: Join chat room for real-time messaging
    socket.on("join-chat-room", ({ roomId, userId }) => {
      console.log(`💬 User ${userId} joining chat room: ${roomId}`);
      socket.join(roomId);
    });

    // ✅ CHAT: Leave chat room
    socket.on("leave-chat-room", ({ roomId, userId }) => {
      console.log(`💬 User ${userId} leaving chat room: ${roomId}`);
      socket.leave(roomId);
    });

    // ✅ CHAT: Typing indicators for chat
    socket.on("typing", ({ roomId, userId, userName }) => {
      console.log(`⌨️ ${userName} is typing in room ${roomId}`);
      socket.to(roomId).emit("user-typing", { 
        userName, 
        isTyping: true 
      });
    });

    socket.on("chat-typing-stop", ({ roomId, userId }) => {
      console.log(`⌨️ ${userId} stopped typing in room ${roomId}`);
      socket.to(roomId).emit("user-typing", { 
        userName: userId,
        isTyping: false 
      });
    });

    // ✅ CHAT: Send game chat message
    socket.on("send-gamechat-message", ({ roomId, message, chatType = "private" }) => {
      try {
        console.log(`💬 Chat message in ${roomId}:`, message);
        
        // Create the message object
        const chatMessage = {
          _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          sender: message.sender,
          senderId: message.senderId,
          content: message.content,
          timestamp: new Date().toISOString(),
          type: message.type || "text",
          chatType: chatType,
          roomId: roomId
        };

        // Store in chat history if it's a game room
        if (chatType === "game") {
          if (!chatMessages.has(roomId)) {
            chatMessages.set(roomId, []);
          }
          const roomChat = chatMessages.get(roomId);
          roomChat.push(chatMessage);
          
          // Keep only last 100 messages
          if (roomChat.length > 100) {
            roomChat.shift();
          }
        }

        // Broadcast to ALL users in the room
        io.to(roomId).emit("receive-chat-message", chatMessage);
        console.log(`📨 Message broadcast to room ${roomId}`);
        
      } catch (error) {
        console.error('❌ Error sending chat message:', error);
        socket.emit("chat-error", "Failed to send message");
      }
    });

    // ✅ User online status
    socket.on("user-online", async (userId) => {
      if (!userId) return;
      try {
        await UserModel.findByIdAndUpdate(userId, { status: "online", lastSeen: new Date() });
        console.log(`✅ ${userId} is now online`);
      } catch (err) {
        console.error("Error updating user to online:", err.message);
      }
    });

    // ✅ User logout handler
    socket.on("user-logout", async (userId) => {
      if (!userId) return;
      try {
        await UserModel.findByIdAndUpdate(userId, { status: "offline", lastSeen: new Date() });
        console.log(`👋 ${userId} logged out`);
      } catch (err) {
        console.error("Error setting user offline on logout:", err.message);
      }
    });

    // ✅ Start spinner for all players
    socket.on("start-spinner", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      console.log(`🎡 Starting spinner broadcast in room ${roomId}`);
      io.to(roomId).emit("spinner-started");
    });

    // ✅ Next round synchronization
    socket.on("next-round-starting", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      console.log(`🔄 Next round starting broadcast in room ${roomId}`);
      io.to(roomId).emit("next-round-starting");
    });

    socket.on("next-round-started", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      console.log(`🔄 Next round started broadcast in room ${roomId}`);
      io.to(roomId).emit("next-round-started");
    });

    // ✅ Request current room state
    socket.on("request-room-state", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room) {
        socket.emit("room-not-found");
        return;
      }

      const roomState = {
        roomId: room.roomId,
        players: room.players,
        status: room.status,
        gameType: room.gameType,
        gameStarted: room.gameStarted,
        currentPlayer: room.currentPlayer,
        currentPrompt: room.currentPrompt,
        scores: room.scores,
        playerStats: room.playerStats
      };

      socket.emit("room-state", roomState);
    });

    // ✅ Game state synchronization for rejoining players
    socket.on("request-game-state", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room) {
        socket.emit("game-state-error", "Room not found");
        return;
      }

      const gameState = {
        currentPlayer: room.currentPlayer,
        currentChoice: room.currentChoice,
        currentPrompt: room.currentPrompt,
        proofUploaded: room.proofUploaded,
        scores: room.scores,
        playerStats: room.playerStats,
        playerLevels: room.playerLevels,
        playerStreaks: room.playerStreaks,
        roundNumber: room.roundNumber,
        proofs: room.proofs,
        gameType: room.gameType,
        status: room.status,
        gameStarted: room.gameStarted
      };

      // Add game-specific state
      if (room.gameType === "compatibility") {
        gameState.playerProgress = room.playerProgress;
        gameState.currentQuestion = room.currentQuestion;
        gameState.answers = room.answers;
        gameState.submissionStatus = room.submissionStatus;
        gameState.resultSubmissions = room.resultSubmissions;
      } else if (room.gameType === "most-likely") {
        gameState.currentScenario = room.currentScenario;
        gameState.currentRound = room.currentRound;
        gameState.totalRounds = room.totalRounds;
        gameState.votes = room.votes;
      }

      socket.emit("game-state-sync", gameState);
      console.log(`🔄 Sent game state sync to ${socket.id} for room ${roomId}`);
    });

    // ✅ Choose option/prompt handler
    socket.on("choose-option", ({ roomId, choice, type }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player || player.name !== room.currentPlayer?.name) return;

      console.log(`✅ ${player.name} chose option: ${choice} (${type}) in ${roomId}`);
      
      room.currentChoice = type;
      
      // Update player stats based on prompt type completion
      if (room.playerStats[player.name]) {
        if (type === "truth") {
          room.playerStats[player.name].truthsCompleted++;
        } else if (type === "dare") {
          room.playerStats[player.name].daresCompleted++;
        }
      }

      // Award points for completing the prompt
      if (!room.scores[player.name]) room.scores[player.name] = 0;
      room.scores[player.name] += 25;

      // Emit updates
      io.to(roomId).emit("scores-update", room.scores);
      io.to(roomId).emit("player-stats-update", room.playerStats);
      io.to(roomId).emit("prompt-completed", { 
        player: player.name, 
        prompt: { type, text: choice },
        points: 25
      });

      console.log(`🎯 ${player.name} completed ${type} for 25 points`);
    });

    // ✅ Reset proof status
    socket.on("reset-proof-status", ({ roomId, player }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      room.proofUploaded = false;
      delete room.proofs[player];
      
      io.to(roomId).emit("proof-status-update", { 
        proofUploaded: false,
        player 
      });
      
      console.log(`🔄 ${player} reset proof status in ${roomId}`);
    });

    // ✅ Enhanced proof ready notification with type support
    socket.on("notify-proof-ready", ({ roomId, player, type = "dare" }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      console.log(`📸 ${player} completed ${type} in ${roomId}`);
      
      // Mark as proof uploaded
      room.proofUploaded = true;
      
      // Notify host specifically with type information
      const host = room.players.find(p => p.isHost);
      if (host) {
        io.to(host.socketId).emit("proof-ready-for-review", { 
          player, 
          type 
        });
      }

      // Also notify all players about completion status
      io.to(roomId).emit("proof-status-update", { 
        proofUploaded: true,
        player,
        type
      });
    });

    // ✅ Create a new room
    socket.on("create-room", ({ player, gameType = "truth-or-dare" }) => {
      if (!player || !player.name) {
        socket.emit("create-error", "Player name missing");
        return;
      }

      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      rooms[roomId] = {
        roomId,
        players: [{ ...player, socketId: socket.id, isHost: true }],
        status: "waiting",
        currentPlayer: null,
        currentPrompt: null,
        currentChoice: null,
        answers: {},
        proofs: {},
        scores: {},
        playerStats: {},
        playerLevels: {},
        playerStreaks: {},
        roundNumber: 1,
        proofUploaded: false,
        gameType: gameType,
        playerProgress: {},
        currentQuestion: 0,
        gameStarted: false,
        submissionStatus: {},
        resultSubmissions: {}
      };

      // Initialize player data based on game type
      const playerName = player.name;
      if (gameType === "truth-or-dare") {
        rooms[roomId].scores[playerName] = 0;
        rooms[roomId].playerStats[playerName] = {
          timesSelected: 0,
          truthsCompleted: 0,
          daresCompleted: 0,
          totalScore: 0,
          streak: 0,
          level: 1
        };
        rooms[roomId].playerLevels[playerName] = 1;
        rooms[roomId].playerStreaks[playerName] = 0;
      } else if (gameType === "compatibility") {
        rooms[roomId].playerProgress[playerName] = 0;
        rooms[roomId].answers[playerName] = { regularAnswers: [], advancedAnswers: {} };
        rooms[roomId].submissionStatus[playerName] = false;
        rooms[roomId].resultSubmissions[playerName] = false;
      }

      // Initialize chat for this room
      chatMessages.set(roomId, []);

      socket.join(roomId);
      socket.emit("room-created", rooms[roomId]);
      console.log(`🆕 ${gameType} room created: ${roomId} by ${player.name}`);
    });

    // ✅ SIMPLIFIED: Create compatibility room - remove complex questions
    socket.on("create-compatibility-room", ({ player }) => {
      if (!player || !player.name) {
        socket.emit("create-error", "Player name missing");
        return;
      }

      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      rooms[roomId] = {
        roomId,
        players: [{ ...player, socketId: socket.id, isHost: true }],
        status: "waiting",
        gameType: "compatibility",
        gameStarted: false,
        currentQuestion: 0,
        answers: {},
        playerProgress: {},
        submissionStatus: {},
        resultSubmissions: {},
        timer: null
        // Remove questions array - frontend will handle questions
      };

      // Initialize host data
      const playerName = player.name;
      rooms[roomId].playerProgress[playerName] = 0;
      rooms[roomId].answers[playerName] = { regularAnswers: [], advancedAnswers: {} };
      rooms[roomId].submissionStatus[playerName] = false;
      rooms[roomId].resultSubmissions[playerName] = false;

      // Initialize chat for this room
      chatMessages.set(roomId, []);

      socket.join(roomId);
      socket.emit("compatibility-room-created", rooms[roomId]);
      console.log(`🆕 Compatibility room created: ${roomId} by ${player.name}`);
    });

    // ✅ Join room
    socket.on("join-room", ({ roomId, player }) => {
      const room = rooms[roomId];
      if (!room) return socket.emit("join-error", "Room not found");
      if (!player?.name) return socket.emit("join-error", "Player name missing");

      const existing = room.players.find((p) => p.name === player.name);
      if (!existing) {
        room.players.push({ ...player, socketId: socket.id, isHost: false });
        // Initialize player data based on game type
        if (room.gameType === "truth-or-dare") {
          room.scores[player.name] = 0;
          room.playerStats[player.name] = {
            timesSelected: 0,
            truthsCompleted: 0,
            daresCompleted: 0,
            totalScore: 0,
            streak: 0,
            level: 1
          };
          room.playerLevels[player.name] = 1;
          room.playerStreaks[player.name] = 0;
        } else if (room.gameType === "compatibility") {
          room.playerProgress[player.name] = 0;
          room.answers[player.name] = { regularAnswers: [], advancedAnswers: {} };
          room.submissionStatus[player.name] = false;
          room.resultSubmissions[player.name] = false;
        }
      } else {
        existing.socketId = socket.id;
      }

      socket.join(roomId);
      socket.emit("room-joined", room);
      io.to(roomId).emit("update-players", room.players);
      
      // Send chat history to joining player
      sendChatHistory(roomId, socket);
      
      // Send initial game state to the joining player
      const gameState = {
        scores: room.scores,
        playerLevels: room.playerLevels,
        playerStreaks: room.playerStreaks,
        roundNumber: room.roundNumber,
        gameType: room.gameType,
        status: room.status,
        gameStarted: room.gameStarted
      };
      
      // Add compatibility-specific state
      if (room.gameType === "compatibility") {
        gameState.playerProgress = room.playerProgress;
        gameState.currentQuestion = room.currentQuestion;
        gameState.submissionStatus = room.submissionStatus;
        gameState.resultSubmissions = room.resultSubmissions;
      }
      
      socket.emit("game-state-update", gameState);
      console.log(`👥 ${player.name} joined ${roomId} (${room.gameType})`);
    });

    // ✅ SIMPLIFIED: Join compatibility room
    socket.on("join-compatibility-room", ({ roomId, player }) => {
      const room = rooms[roomId];
      if (!room) return socket.emit("join-error", "Room not found");
      if (!player?.name) return socket.emit("join-error", "Player name missing");
      if (room.gameType !== "compatibility") return socket.emit("join-error", "Invalid room type");
      if (room.players.length >= 2) return socket.emit("join-error", "Room is full");

      const existing = room.players.find((p) => p.name === player.name);
      if (!existing) {
        room.players.push({ ...player, socketId: socket.id, isHost: false });
        // Initialize player data
        room.playerProgress[player.name] = 0;
        room.answers[player.name] = { regularAnswers: [], advancedAnswers: {} };
        room.submissionStatus[player.name] = false;
        room.resultSubmissions[player.name] = false;
      } else {
        existing.socketId = socket.id;
      }

      socket.join(roomId);
      socket.emit("compatibility-room-joined", room);
      io.to(roomId).emit("compatibility-update-players", room.players);
      
      // Send chat history to joining player
      sendChatHistory(roomId, socket);
      
      console.log(`👥 ${player.name} joined Compatibility room ${roomId}`);
    });

    // ✅ Rejoin after refresh
    socket.on("rejoin-room", ({ roomId, name }) => {
      const room = rooms[roomId];
      if (!room) return socket.emit("join-error", "Room not found");

      const player = room.players.find((p) => p.name === name);
      if (player) {
        player.socketId = socket.id;
        socket.join(roomId);
        socket.emit("room-joined", room);
        io.to(roomId).emit("update-players", room.players);
        
        // Send chat history to rejoining player
        sendChatHistory(roomId, socket);
        
        // Send game state to rejoining player
        const gameState = {
          scores: room.scores,
          playerLevels: room.playerLevels,
          playerStreaks: room.playerStreaks,
          roundNumber: room.roundNumber,
          proofs: room.proofs,
          gameType: room.gameType,
          status: room.status,
          gameStarted: room.gameStarted,
          currentPlayer: room.currentPlayer,
          currentPrompt: room.currentPrompt
        };
        
        // Add compatibility-specific state
        if (room.gameType === "compatibility") {
          gameState.playerProgress = room.playerProgress;
          gameState.currentQuestion = room.currentQuestion;
          gameState.answers = room.answers;
          gameState.submissionStatus = room.submissionStatus;
          gameState.resultSubmissions = room.resultSubmissions;
        } else if (room.gameType === "most-likely") {
          gameState.currentScenario = room.currentScenario;
          gameState.currentRound = room.currentRound;
          gameState.votes = room.votes;
        }
        
        socket.emit("game-state-update", gameState);
        console.log(`🔁 ${name} rejoined ${roomId}`);
      } else {
        socket.emit("join-error", "Player not found in this room");
      }
    });

    // ✅ START GAME
    socket.on("start-game", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room) return;
      if (room.players.length < 2)
        return socket.emit("start-error", "Need at least 2 players");

      room.status = "started";
      room.gameStarted = true;
      
      if (room.gameType === "compatibility") {
        // Reset game state for compatibility game
        room.currentQuestion = 0;
        room.answers = {};
        room.playerProgress = {};
        room.submissionStatus = {};
        room.resultSubmissions = {};
        room.players.forEach(player => {
          room.answers[player.name] = { regularAnswers: [], advancedAnswers: {} };
          room.playerProgress[player.name] = 0;
          room.submissionStatus[player.name] = false;
          room.resultSubmissions[player.name] = false;
        });
      }
      
      io.to(roomId).emit("game-started", { 
        roomId,
        gameType: room.gameType 
      });
      console.log(`🚀 ${room.gameType} game started in ${roomId}`);
    });

    // ✅ SIMPLIFIED: Start compatibility game - remove timer logic
    socket.on("start-compatibility-game", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "compatibility") return;
      if (room.players.length !== 2)
        return socket.emit("start-error", "Compatibility game requires exactly 2 players");

      room.gameStarted = true;
      room.status = "playing";
      room.currentQuestion = 0;
      room.answers = {};
      room.playerProgress = {};
      room.submissionStatus = {};
      room.resultSubmissions = {};

      // Initialize player data
      room.players.forEach(player => {
        room.answers[player.name] = { regularAnswers: [], advancedAnswers: {} };
        room.playerProgress[player.name] = 0;
        room.submissionStatus[player.name] = false;
        room.resultSubmissions[player.name] = false;
      });

      // Frontend will handle timing
      io.to(roomId).emit("compatibility-game-started", {
        roomId,
        currentQuestion: room.currentQuestion
      });
      console.log(`🚀 Compatibility game started in ${roomId}`);
    });

    // ✅ Player progress update
    socket.on("player-progress", ({ roomId, progress }) => {
      const room = rooms[roomId];
      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (player && room.gameType === "compatibility") {
        room.playerProgress[player.name] = progress;
        io.to(roomId).emit("player-progress", {
          player: player.name,
          progress
        });
        console.log(`📊 ${player.name} progress: ${progress}%`);
      }
    });

    // ✅ SIMPLIFIED: Answer submitted - just track submission status
    socket.on("compatibility-answer-submitted", ({ roomId, questionIndex, answer }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "compatibility") return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      console.log(`📝 ${player.name} submitted answer for question ${questionIndex}: ${answer}`);
      
      // Store the answer locally (frontend will handle this)
      if (!room.answers[player.name].regularAnswers) {
        room.answers[player.name].regularAnswers = [];
      }
      
      while (room.answers[player.name].regularAnswers.length <= questionIndex) {
        room.answers[player.name].regularAnswers.push(undefined);
      }
      
      room.answers[player.name].regularAnswers[questionIndex] = answer;

      // Update progress
      room.playerProgress[player.name] = Math.round(((questionIndex + 1) / 5) * 100); // Assuming 5 questions

      // Notify all players about progress
      io.to(roomId).emit("compatibility-player-progress", {
        player: player.name,
        progress: room.playerProgress[player.name],
        currentQuestion: room.currentQuestion
      });

      console.log(`📊 ${player.name} progress: ${room.playerProgress[player.name]}%`);
    });

    // ✅ SIMPLIFIED: Advanced answers submission - just track
    socket.on("compatibility-advanced-answers", ({ roomId, category, answers }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "compatibility") return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      console.log(`🎯 ${player.name} submitted advanced answers for ${category}`);
      
      // Store advanced answers
      if (!room.answers[player.name].advancedAnswers) {
        room.answers[player.name].advancedAnswers = {};
      }
      room.answers[player.name].advancedAnswers[category] = answers;

      // Update progress for advanced section
      const completedSections = Object.keys(room.answers[player.name].advancedAnswers).length;
      const progress = 50 + Math.round((completedSections / 5) * 50); // Advanced section is 50% of total
      room.playerProgress[player.name] = progress;

      io.to(roomId).emit("compatibility-player-progress", {
        player: player.name,
        progress: room.playerProgress[player.name],
        currentQuestion: "advanced"
      });

      console.log(`📊 ${player.name} advanced progress: ${room.playerProgress[player.name]}%`);
    });

    // ✅ SIMPLIFIED: Submit final answers - just track submission
    socket.on("compatibility-submit-final", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "compatibility") return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      console.log(`✅ ${player.name} submitted final answers in ${roomId}`);
      
      // Mark this player as submitted
      room.submissionStatus[player.name] = true;

      // Notify all players about this submission
      io.to(roomId).emit("compatibility-submission-update", {
        player: player.name,
        submitted: true
      });

      console.log(`📋 ${player.name} marked as completed`);

      // Check if all players have submitted final answers
      checkAllSubmissions(roomId);
    });

    // ✅ SIMPLIFIED: Share answers with other player - frontend will handle calculation
    socket.on("compatibility-share-answers", ({ roomId, answers }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "compatibility") return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      console.log(`📨 ${player.name} sharing answers with other player`);
      
      // Store answers in room
      room.answers[player.name] = answers;
      
      // Send answers to the other player
      room.players.forEach(p => {
        if (p.socketId !== socket.id) {
          io.to(p.socketId).emit("compatibility-other-player-answers", { 
            answers: answers 
          });
          console.log(`📤 Sent answers from ${player.name} to ${p.name}`);
        }
      });
    });

    // ✅ SIMPLIFIED: Handle result submission - just notify frontend
    socket.on("compatibility-submit-result", ({ roomId, playerName }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "compatibility") return;

      console.log(`🎯 ${playerName} submitted result request in ${roomId}`);
      
      

      // Notify all players about this result submission
      io.to(roomId).emit("compatibility-result-submitted", {
        playerName: playerName,
        submitted: true
      });

      console.log(`📊 ${playerName} ready for results`);

      // Check if both players are ready for results
      const bothReady = room.players.every(player => room.resultSubmissions[player.name]);
      
      if (bothReady) {
        console.log(`🎉 Both players ready for results in ${roomId}`);
        
        // Notify frontend to show results - frontend will calculate
        io.to(roomId).emit("compatibility-both-ready-for-results");
        
        // Reset for potential replay
        room.players.forEach(player => {
          room.submissionStatus[player.name] = false;
          room.resultSubmissions[player.name] = false;
        });
      }
    });

    // ✅ Submit answers for compatibility game
    socket.on("submit-answers", ({ roomId, player, answers }) => {
      const room = rooms[roomId];
      if (!room || !player?.name) return;

      console.log(`📝 ${player.name} submitted answers in ${roomId}`);
      
      // Store answers
      room.answers[player.name] = answers;
      
      // Update progress to 100%
      if (room.gameType === "compatibility") {
        room.playerProgress[player.name] = 100;
        io.to(roomId).emit("player-progress", {
          player: player.name,
          progress: 100
        });
      }

      // Check if all players have submitted
      const answeredPlayers = Object.keys(room.answers);
      const totalPlayers = room.players.length;
      
      console.log(`📊 Answers status: ${answeredPlayers.length}/${totalPlayers} players submitted`);
      
      if (answeredPlayers.length === totalPlayers) {
        // All players have submitted - frontend will handle results
        console.log(`🎉 All players submitted in ${roomId}, notifying frontend`);
        io.to(roomId).emit("all-answers-submitted");
        
        // Reset answers for next round if needed
        room.answers = {};
      } else {
        // Not all players have submitted yet
        io.to(roomId).emit("answers-update", {
          answered: answeredPlayers.length,
          total: totalPlayers,
          waitingFor: room.players.filter(p => !answeredPlayers.includes(p.name)).map(p => p.name)
        });
      }
    });

    // ✅ Player reactions
    socket.on("player-reaction", ({ roomId, reaction }) => {
      const room = rooms[roomId];
      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        io.to(roomId).emit("player-reaction", {
          player: player.name,
          reaction,
          playerId: socket.id
        });
        console.log(`😊 ${player.name} reacted with ${reaction}`);
      }
    });

    // ✅ Time sync for games
    socket.on("time-sync", ({ roomId, time }) => {
      const room = rooms[roomId];
      if (!room) return;

      io.to(roomId).emit("time-sync", time);
    });

    // ✅ Random spin to select player (Truth or Dare only)
    socket.on("spin-player", async ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.players.length === 0 || room.gameType !== "truth-or-dare") return;

      const previousPlayer = room.currentPlayer;
      let candidatePlayers = room.players;

      if (room.players.length > 1 && previousPlayer) {
        candidatePlayers = room.players.filter(p => p.name !== previousPlayer.name);
      }

      // Reset game state for new round
      room.currentPrompt = null;
      room.currentChoice = null;
      room.proofUploaded = false;

      // Wait for 3 seconds to simulate spinning animation on clients
      await new Promise(res => setTimeout(res, 3000));

      const selectedPlayer = candidatePlayers[Math.floor(Math.random() * candidatePlayers.length)];
      room.currentPlayer = selectedPlayer;
      
      // Update player stats
      if (room.playerStats[selectedPlayer.name]) {
        room.playerStats[selectedPlayer.name].timesSelected++;
      }

      // Emit player selection to ALL players
      io.to(roomId).emit("player-selected", selectedPlayer);
      io.to(roomId).emit("player-stats-update", room.playerStats);

      // Send Truth/Dare options only to selected player
      io.to(selectedPlayer.socketId).emit("choose-truth-dare", ["Truth", "Dare"]);

      console.log(`🎯 Selected player: ${selectedPlayer.name} in room ${roomId}`);
    });

    // ✅ Submit truth/dare choice
    socket.on("submit-truth-dare", ({ roomId, choice }) => {
      const room = rooms[roomId];
      if (!room || !room.currentPlayer || room.gameType !== "truth-or-dare") return;
      if (!["Truth", "Dare"].includes(choice)) return;

      room.currentChoice = choice;
      
      // Notify all players about the choice
      io.to(roomId).emit("truth-dare-chosen", {
        player: room.currentPlayer.name,
        choice,
      });
      
      // Award initial points for making a choice
      if (!room.scores[room.currentPlayer.name]) {
        room.scores[room.currentPlayer.name] = 0;
      }
      room.scores[room.currentPlayer.name] += 10;
      
      // Update streak
      if (!room.playerStreaks[room.currentPlayer.name]) {
        room.playerStreaks[room.currentPlayer.name] = 0;
      }
      room.playerStreaks[room.currentPlayer.name] += 1;
      
      // Emit updates
      io.to(roomId).emit("scores-update", room.scores);
      io.to(roomId).emit("player-streaks-update", room.playerStreaks);
      
      console.log(`🟣 ${room.currentPlayer.name} chose ${choice} in ${roomId}`);
    });

    // ✅ Host sends a question/prompt (Truth or Dare only)
    socket.on("send-prompt", ({ roomId, prompt, askedBy, type }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;
      room.currentPrompt = { text: prompt, type };
      io.to(roomId).emit("receive-prompt", { prompt, askedBy, type });
      console.log(`💬 New ${type} prompt in ${roomId}: ${prompt}`);
    });

    // ✅ Proof uploaded handler
    socket.on("proof-uploaded", ({ roomId, player, proofKey }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      if (!room.proofs) room.proofs = {};
      room.proofs[player] = proofKey;
      room.proofUploaded = true;
      
      // Determine type based on current choice
      const type = room.currentChoice === "Truth" ? "truth" : "dare";
      
      // Notify all players that proof has been uploaded
      io.to(roomId).emit("proof-uploaded-notification", { 
        player, 
        proofKey 
      });
      
      // Notify host specifically with type information
      const host = room.players.find(p => p.isHost);
      if (host) {
        io.to(host.socketId).emit("proof-ready-for-review", { 
          player,
          type
        });
      }
      
      // Update proof status for all players
      io.to(roomId).emit("proof-status-update", { 
        proofUploaded: true,
        player,
        type
      });
      
      console.log(`📸 ${player} uploaded ${type} proof in ${roomId}`);
    });

    // ✅ Request proof data from proof owner (Truth or Dare only)
    socket.on("request-proof-data", ({ roomId, playerName, proofKey }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      console.log(`🔍 ${socket.id} requesting proof from ${playerName} with key ${proofKey}`);
      
      const proofOwner = room.players.find(p => p.name === playerName);
      if (proofOwner && proofOwner.socketId) {
        io.to(proofOwner.socketId).emit("share-proof-data", { 
          proofKey, 
          requestor: socket.id 
        });
        console.log(`📤 Forwarded proof request to ${playerName}`);
      } else {
        console.log(`❌ Proof owner ${playerName} not found or disconnected`);
        socket.emit("proof-data-received", { proofData: null });
      }
    });

    // ✅ Handle proof data sharing response (Truth or Dare only)
    socket.on("share-proof-data-response", ({ proofData, requestor }) => {
      console.log(`📨 Sending proof data to ${requestor}`);
      io.to(requestor).emit("proof-data-received", { proofData });
    });

    // ✅ Truth completion handler
    socket.on("truth-completed", ({ roomId, player, completionText }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      console.log(`✅ ${player} completed truth in ${roomId}: ${completionText}`);
      
      // Mark as proof uploaded for truth completion
      room.proofUploaded = true;
      
      // Update player stats
      if (room.playerStats[player]) {
        room.playerStats[player].truthsCompleted++;
      }

      // Award points for truth completion
      if (!room.scores[player]) room.scores[player] = 0;
      room.scores[player] += 25;

      // Notify ALL players about the truth completion
      io.to(roomId).emit("truth-completed", {
        player,
        completionText
      });

      // Also emit prompt completed for scoring
      io.to(roomId).emit("prompt-completed", { 
        player, 
        prompt: { type: "truth", text: "Truth completed" },
        points: 25
      });

      // Update scores and stats
      io.to(roomId).emit("scores-update", room.scores);
      io.to(roomId).emit("player-stats-update", room.playerStats);

      // Notify host that proof is ready for review
      const host = room.players.find(p => p.isHost);
      if (host) {
        io.to(host.socketId).emit("proof-ready-for-review", { 
          player,
          type: "truth"
        });
      }

      console.log(`📝 ${player} truth completion recorded with 25 points`);
    });

    // ✅ Prompt completed (Truth or Dare only)
    socket.on("prompt-completed", ({ roomId, player, prompt }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      // Calculate points with streak bonus
      const basePoints = 25;
      const streakBonus = Math.min((room.playerStreaks[player] || 0) * 5, 25);
      const totalPoints = basePoints + streakBonus;
      
      // Update scores
      if (!room.scores[player]) room.scores[player] = 0;
      room.scores[player] += totalPoints;
      
      // Update player stats
      if (room.playerStats[player]) {
        if (prompt.type === "truth") {
          room.playerStats[player].truthsCompleted++;
        } else {
          room.playerStats[player].daresCompleted++;
        }
        room.playerStats[player].totalScore = room.scores[player];
      }
      
      // Check for level up
      const currentLevel = room.playerLevels[player] || 1;
      const newLevel = Math.floor(room.scores[player] / 100) + 1;
      if (newLevel > currentLevel) {
        room.playerLevels[player] = newLevel;
        io.to(roomId).emit("player-levels-update", room.playerLevels);
      }
      
      // Emit updates
      io.to(roomId).emit("scores-update", room.scores);
      io.to(roomId).emit("player-stats-update", room.playerStats);
      io.to(roomId).emit("prompt-completed", { 
        player, 
        prompt,
        points: totalPoints,
        streakBonus
      });
      
      console.log(`✅ ${player} completed ${prompt.type} for ${totalPoints} points`);
    });

    // ✅ Reset round (Admin only - Truth or Dare only)
    socket.on("reset-round", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      const host = room.players.find(p => p.isHost);
      if (!host || host.socketId !== socket.id) {
        socket.emit("error", "Only host can reset the round");
        return;
      }

      room.currentPlayer = null;
      room.currentPrompt = null;
      room.currentChoice = null;
      room.proofUploaded = false;
      room.roundNumber++;
      
      io.to(roomId).emit("round-reset");
      io.to(roomId).emit("proof-status-update", { proofUploaded: false });
      io.to(roomId).emit("round-number-update", room.roundNumber);
      
      console.log(`🔄 Round reset in ${roomId} by host. Now round ${room.roundNumber}`);
    });

    // ✅ Use power-up (Truth or Dare only)
    socket.on("use-power-up", ({ roomId, powerUp }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        io.to(roomId).emit("power-up-used", {
          player: player.name,
          powerUp
        });
        console.log(`⚡ ${player.name} used ${powerUp} power-up`);
      }
    });

    // ✅ Kick player (Admin only)
    socket.on("kick-player", ({ roomId, playerName, kickedBy }) => {
      const room = rooms[roomId];
      if (!room) return;

      const host = room.players.find(p => p.isHost);
      if (!host || host.socketId !== socket.id) {
        socket.emit("error", "Only host can kick players");
        return;
      }

      const playerToKick = room.players.find(p => p.name === playerName);
      if (playerToKick) {
        io.to(playerToKick.socketId).emit("player-kicked", { 
          playerName, 
          kickedBy 
        });
        
        room.players = room.players.filter(p => p.name !== playerName);
        
        // Clean up player data based on game type
        if (room.gameType === "truth-or-dare") {
          delete room.proofs[playerName];
          delete room.scores[playerName];
          delete room.playerStats[playerName];
          delete room.playerLevels[playerName];
          delete room.playerStreaks[playerName];
        } else if (room.gameType === "compatibility") {
          delete room.playerProgress[playerName];
          delete room.answers[playerName];
          delete room.submissionStatus[playerName];
          delete room.resultSubmissions[playerName];
        } else if (room.gameType === "most-likely") {
          delete room.scores[playerName];
          delete room.playerStats[playerName];
          delete room.votes[playerName];
        }
        
        io.to(roomId).emit("player-kicked", { playerName, kickedBy });
        updateRoomPlayers(roomId);
        
        if (room.gameType === "truth-or-dare") {
          io.to(roomId).emit("scores-update", room.scores);
        } else if (room.gameType === "most-likely") {
          io.to(roomId).emit("mostlikely-scores-update", room.scores);
        }
        
        console.log(`👢 ${playerName} kicked from ${roomId} by ${kickedBy}`);
      }
    });

    // ✅ Leave room manually
    socket.on("leave-room", (roomId) => {
      const room = rooms[roomId];
      if (!room) return;
      
      const leavingPlayer = room.players.find(p => p.socketId === socket.id);
      room.players = room.players.filter((p) => p.socketId !== socket.id);
      
      if (leavingPlayer) {
        // Clean up player data based on game type
        if (room.gameType === "truth-or-dare") {
          delete room.proofs[leavingPlayer.name];
          delete room.scores[leavingPlayer.name];
          delete room.playerStats[leavingPlayer.name];
          delete room.playerLevels[leavingPlayer.name];
          delete room.playerStreaks[leavingPlayer.name];
        } else if (room.gameType === "compatibility") {
          delete room.playerProgress[leavingPlayer.name];
          delete room.answers[leavingPlayer.name];
          delete room.submissionStatus[leavingPlayer.name];
          delete room.resultSubmissions[leavingPlayer.name];
        } else if (room.gameType === "most-likely") {
          delete room.scores[leavingPlayer.name];
          delete room.playerStats[leavingPlayer.name];
          delete room.votes[leavingPlayer.name];
        }
        
        if (leavingPlayer.isHost && room.players.length > 0) {
          room.players[0].isHost = true;
          io.to(room.players[0].socketId).emit("promoted-to-host");
        }
      }
      
      socket.leave(roomId);
      if (room.players.length === 0) {
        delete rooms[roomId];
        // Clean up chat messages when room is empty
        chatMessages.delete(roomId);
      } else {
        updateRoomPlayers(roomId);
        if (room.gameType === "truth-or-dare") {
          io.to(roomId).emit("scores-update", room.scores);
        } else if (room.gameType === "most-likely") {
          io.to(roomId).emit("mostlikely-scores-update", room.scores);
        }
      }
    });

    // Create room for Who's Most Likely
    socket.on("create-mostlikely-room", ({ player }) => {
      if (!player || !player.name) {
        socket.emit("create-error", "Player name missing");
        return;
      }

      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      rooms[roomId] = {
        roomId,
        players: [{ ...player, socketId: socket.id, isHost: true }],
        status: "waiting",
        gameType: "most-likely",
        gameStarted: false,
        currentScenario: null,
        usedScenarios: [],
        votes: {},
        roundNumber: 1,
        currentRound: 1,
        totalRounds: 10,
        scores: {},
        playerStats: {},
        scenarios: [
          "Who's most likely to become famous?",
          "Who's most likely to sleep through an alarm?",
          "Who's most likely to marry a celebrity?",
          "Who's most likely to win the lottery and lose the ticket?",
          "Who's most likely to survive a zombie apocalypse?",
          "Who's most likely to accidentally set something on fire?",
          "Who's most likely to become a millionaire?",
          "Who's most likely to forget their own birthday?",
          "Who's most likely to get lost in their own neighborhood?",
          "Who's most likely to talk their way out of a ticket?",
          "Who's most likely to go viral on social media?",
          "Who's most likely to start a cult following?",
          "Who's most likely to fall asleep during a party?",
          "Who's most likely to date two people at once by accident?",
          "Who's most likely to become a reality TV star?",
          "Who's most likely to cry during a kids movie?",
          "Who's most likely to become president?",
          "Who's most likely to go bungee jumping?",
          "Who's most likely to get a terrible tattoo?",
          "Who's most likely to join a circus?",
        ]
      };

      // Initialize host data
      const playerName = player.name;
      rooms[roomId].scores[playerName] = 0;
      rooms[roomId].playerStats[playerName] = {
        timesVotedFor: 0,
        roundsWon: 0,
        totalVotes: 0
      };

      // Initialize chat for this room
      chatMessages.set(roomId, []);

      socket.join(roomId);
      socket.emit("mostlikely-room-created", rooms[roomId]);
      console.log(`🆕 Most Likely room created: ${roomId} by ${player.name}`);
    });

    // Join Most Likely room
    socket.on("join-mostlikely-room", ({ roomId, player }) => {
      const room = rooms[roomId];
      if (!room) return socket.emit("join-error", "Room not found");
      if (!player?.name) return socket.emit("join-error", "Player name missing");
      if (room.gameType !== "most-likely") return socket.emit("join-error", "Invalid room type");

      const existing = room.players.find((p) => p.name === player.name);
      if (!existing) {
        room.players.push({ ...player, socketId: socket.id, isHost: false });
        // Initialize player data
        room.scores[player.name] = 0;
        room.playerStats[player.name] = {
          timesVotedFor: 0,
          roundsWon: 0,
          totalVotes: 0
        };
      } else {
        existing.socketId = socket.id;
      }

      socket.join(roomId);
      socket.emit("mostlikely-room-joined", room);
      io.to(roomId).emit("mostlikely-update-players", room.players);
      
      // Send chat history to joining player
      sendChatHistory(roomId, socket);
      
      console.log(`👥 ${player.name} joined Most Likely room ${roomId}`);
    });

    // Start Most Likely game
    socket.on("start-mostlikely-game", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "most-likely") return;
      if (room.players.length < 2)
        return socket.emit("start-error", "Need at least 2 players");

      room.gameStarted = true;
      room.status = "playing";
      room.currentRound = 1;
      room.votes = {};
      
      // Reset scores for new game
      room.players.forEach(player => {
        room.scores[player.name] = 0;
        room.playerStats[player.name] = {
          timesVotedFor: 0,
          roundsWon: 0,
          totalVotes: 0
        };
      });

      // Get first scenario
      const scenario = getRandomScenario(room);
      room.currentScenario = scenario;

      io.to(roomId).emit("mostlikely-game-started", {
        roomId,
        scenario: room.currentScenario,
        currentRound: room.currentRound,
        totalRounds: room.totalRounds
      });
      console.log(`🚀 Most Likely game started in ${roomId}`);
    });

    // Submit vote
    socket.on("submit-mostlikely-vote", ({ roomId, votedFor }) => {
      const room = rooms[roomId];
      if (!room || !room.gameStarted || room.gameType !== "most-likely") return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      // Player cannot vote for themselves
      if (votedFor === player.name) {
        socket.emit("vote-error", "You cannot vote for yourself!");
        return;
      }

      // Check if voted player exists
      const votedPlayer = room.players.find(p => p.name === votedFor);
      if (!votedPlayer) {
        socket.emit("vote-error", "Player not found!");
        return;
      }

      // Record vote
      room.votes[player.name] = votedFor;
      
      // Update player stats
      room.playerStats[votedFor].timesVotedFor++;
      room.playerStats[player.name].totalVotes++;

      console.log(`🗳️ ${player.name} voted for ${votedFor} in ${roomId}`);

      // Notify all players about the vote
      io.to(roomId).emit("vote-received", {
        voter: player.name,
        votedFor: votedFor,
        votesSoFar: Object.keys(room.votes).length,
        totalPlayers: room.players.length
      });

      // Check if all players have voted
      if (Object.keys(room.votes).length === room.players.length) {
        calculateRoundResults(room);
      }
    });

    // Next round
    socket.on("next-mostlikely-round", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "most-likely") return;

      room.currentRound++;
      room.votes = {};

      if (room.currentRound > room.totalRounds) {
        // Game finished
        room.status = "finished";
        io.to(roomId).emit("mostlikely-game-finished", {
          scores: room.scores,
          playerStats: room.playerStats,
          finalResults: calculateFinalResults(room)
        });
        console.log(`🎊 Most Likely game finished in ${roomId}`);
      } else {
        // Next round
        const scenario = getRandomScenario(room);
        room.currentScenario = scenario;

        io.to(roomId).emit("mostlikely-next-round", {
          scenario: room.currentScenario,
          currentRound: room.currentRound,
          totalRounds: room.totalRounds
        });
        console.log(`🔄 Round ${room.currentRound} started in ${roomId}`);
      }
    });

    // End game early
    socket.on("end-game", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room) return;

      const host = room.players.find(p => p.isHost);
      if (!host || host.socketId !== socket.id) {
        socket.emit("error", "Only host can end the game");
        return;
      }

      room.status = "finished";
      room.gameStarted = false;

      io.to(roomId).emit("game-ended", {
        finalScores: room.scores,
        playerStats: room.playerStats
      });

      console.log(`🛑 Game ended in ${roomId} by host`);
    });

    // Ping/pong for connection health
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });

    // Disconnect cleanup
    socket.on("disconnect", async () => {
      console.log("❌ Game socket disconnected:", socket.id);
      
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const disconnectedPlayer = room.players.find(p => p.socketId === socket.id);
        
        if (disconnectedPlayer) {
          room.players = room.players.filter((p) => p.socketId !== socket.id);
          
          // Clean up player data based on game type
          if (room.gameType === "truth-or-dare") {
            delete room.proofs[disconnectedPlayer.name];
            delete room.scores[disconnectedPlayer.name];
            delete room.playerStats[disconnectedPlayer.name];
            delete room.playerLevels[disconnectedPlayer.name];
            delete room.playerStreaks[disconnectedPlayer.name];
          } else if (room.gameType === "compatibility") {
            delete room.playerProgress[disconnectedPlayer.name];
            delete room.answers[disconnectedPlayer.name];
            delete room.submissionStatus[disconnectedPlayer.name];
            delete room.resultSubmissions[disconnectedPlayer.name];
          } else if (room.gameType === "most-likely") {
            delete room.scores[disconnectedPlayer.name];
            delete room.playerStats[disconnectedPlayer.name];
            delete room.votes[disconnectedPlayer.name];
          }
          
          if (disconnectedPlayer.isHost && room.players.length > 0) {
            room.players[0].isHost = true;
            io.to(room.players[0].socketId).emit("promoted-to-host");
          }
          
          if (room.players.length === 0) {
            delete rooms[roomId];
            // Clean up chat messages when room is empty
            chatMessages.delete(roomId);
          } else {
            updateRoomPlayers(roomId);
            if (room.gameType === "truth-or-dare") {
              io.to(roomId).emit("scores-update", room.scores);
            } else if (room.gameType === "most-likely") {
              io.to(roomId).emit("mostlikely-scores-update", room.scores);
            }
          }
        }
      }

      // Update user status to offline
      if (socket.userId) {
        try {
          await UserModel.findByIdAndUpdate(socket.userId, { 
            status: "offline", 
            lastSeen: new Date() 
          });
          console.log(`👋 User ${socket.userId} set to offline`);
        } catch (err) {
          console.error("Error setting user offline:", err.message);
        }
      }
    });
  });
}