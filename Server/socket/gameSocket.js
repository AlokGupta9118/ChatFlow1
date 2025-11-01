// socket/gameSocket.js
import UserModel from "../models/User.js";

export default function gameSocket(io) {
  const rooms = {};
  const chatMessages = new Map();

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

  io.on("connection", (socket) => {
    console.log("🎮 Game socket connected:", socket.id);

    const updateRoomPlayers = (roomId) => {
      const room = rooms[roomId];
      if (room) {
        if (room.gameType === "most-likely") {
          io.to(roomId).emit("mostlikely-update-players", room.players);
        } else {
          io.to(roomId).emit("update-players", room.players);
        }
      }
    };

    // 🔥 NEW: Send chat history to joining player
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
    // Add to your existing socket connection handler:


   // ✅ CHAT: Typing indicators for chat
// ✅ CHAT: Typing indicators for chat - CONSISTENT across all games
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

    // ✅ FIXED: User online status
    socket.on("user-online", async (userId) => {
      if (!userId) return;
      try {
        await UserModel.findByIdAndUpdate(userId, { status: "online", lastSeen: new Date() });
        console.log(`✅ ${userId} is now online`);
      } catch (err) {
        console.error("Error updating user to online:", err.message);
      }
    });

    // ✅ FIXED: User logout handler
    socket.on("user-logout", async (userId) => {
      if (!userId) return;
      try {
        await UserModel.findByIdAndUpdate(userId, { status: "offline", lastSeen: new Date() });
        console.log(`👋 ${userId} logged out`);
      } catch (err) {
        console.error("Error setting user offline on logout:", err.message);
      }
    });

    // ✅ FIXED: Start spinner for all players
    socket.on("start-spinner", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      console.log(`🎡 Starting spinner broadcast in room ${roomId}`);
      io.to(roomId).emit("spinner-started");
    });

    // ✅ FIXED: Next round synchronization
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

    // ✅ NEW: Request current room state
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

    // ✅ NEW: Game state synchronization for rejoining players - ENHANCED
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
      } else if (room.gameType === "most-likely") {
        gameState.currentScenario = room.currentScenario;
        gameState.currentRound = room.currentRound;
        gameState.totalRounds = room.totalRounds;
        gameState.votes = room.votes;
      }

      socket.emit("game-state-sync", gameState);
      console.log(`🔄 Sent game state sync to ${socket.id} for room ${roomId}`);
    });

    // ✅ NEW: Choose option/prompt handler - ENHANCED
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

    // ✅ NEW: Reset proof status (for when user removes proof)
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

    // ✅ NEW: Enhanced proof ready notification with type support
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

    // ✅ Create a new room - ENHANCED with chat
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
            submissionStatus: {} //
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
        rooms[roomId].answers[playerName] = [];
          rooms[roomId].submissionStatus[playerName] = false; /
      }

      // 🔥 NEW: Initialize chat for this room
      chatMessages.set(roomId, []);

      socket.join(roomId);
      socket.emit("room-created", rooms[roomId]);
      console.log(`🆕 ${gameType} room created: ${roomId} by ${player.name}`);
    });

    // ✅ Join room - ENHANCED with chat
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
          room.answers[player.name] = [];
           room.submissionStatus[player.name] = false;
        }
      } else {
        existing.socketId = socket.id;
      }

      socket.join(roomId);
      socket.emit("room-joined", room);
      io.to(roomId).emit("update-players", room.players);
      
      // 🔥 NEW: Send chat history to joining player
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
         room.submissionStatus[player.name] = false;
      }
      
      socket.emit("game-state-update", gameState);
      console.log(`👥 ${player.name} joined ${roomId} (${room.gameType})`);
    });

    // ✅ Rejoin after refresh - ENHANCED with chat
    socket.on("rejoin-room", ({ roomId, name }) => {
      const room = rooms[roomId];
      if (!room) return socket.emit("join-error", "Room not found");

      const player = room.players.find((p) => p.name === name);
      if (player) {
        player.socketId = socket.id;
        socket.join(roomId);
        socket.emit("room-joined", room);
        io.to(roomId).emit("update-players", room.players);
        
        // 🔥 NEW: Send chat history to rejoining player
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

    // ✅ START GAME - ENHANCED
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
        room.players.forEach(player => {
          room.answers[player.name] = [];
          room.playerProgress[player.name] = 0;
        });
      }
      
      io.to(roomId).emit("game-started", { 
        roomId,
        gameType: room.gameType 
      });
      console.log(`🚀 ${room.gameType} game started in ${roomId}`);
    });

    // ✅ Player progress update - NEW for compatibility game
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

    // ✅ Submit answers for compatibility game - ENHANCED
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
        // All players have submitted - show results
        console.log(`🎉 All players submitted in ${roomId}, showing results`);
        io.to(roomId).emit("show-results", room.answers);
        
        // Reset answers for next round if needed
        room.answers = {};
      } else {
        // Not all players have submitted yet
        io.to(roomId).emit("answers-update", {
          answered: answeredPlayers.length,
          total: totalPlayers,
          waitingFor: room.players.filter(p => !answeredPlayers.includes(p.name)).map(p => p.name)
        });
        
        console.log(`⏳ Waiting for: ${room.players.filter(p => !answeredPlayers.includes(p.name)).map(p => p.name).join(', ')}`);
      }
    });

    // ✅ Player reactions - ENHANCED
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

    // ✅ Time sync for games - NEW
    socket.on("time-sync", ({ roomId, time }) => {
      const room = rooms[roomId];
      if (!room) return;

      io.to(roomId).emit("time-sync", time);
    });

    // ✅ FIXED: Random spin to select player (Truth or Dare only) - Now properly synchronized
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

    // ✅ ENHANCED: Submit truth/dare choice - better state management
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

    // ✅ ENHANCED: Proof uploaded handler - ensure it works for both truth and dare
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

    // ✅ ENHANCED: Request proof data from proof owner (Truth or Dare only)
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

    // ✅ ENHANCED: Truth completion handler - make sure it properly notifies everyone
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

    // ✅ Leave room manually - ENHANCED with chat cleanup
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
        // 🔥 NEW: Clean up chat messages when room is empty
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

    // ✅ Create room for Who's Most Likely - NEW with chat
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

      // 🔥 NEW: Initialize chat for this room
      chatMessages.set(roomId, []);

      socket.join(roomId);
      socket.emit("mostlikely-room-created", rooms[roomId]);
      console.log(`🆕 Most Likely room created: ${roomId} by ${player.name}`);
    });

    // ✅ Join Most Likely room - NEW with chat
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
      
      // 🔥 NEW: Send chat history to joining player
      sendChatHistory(roomId, socket);
      
      console.log(`👥 ${player.name} joined Most Likely room ${roomId}`);
    });


    // ✅ Start Most Likely game - NEW
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

    // ✅ Submit vote - NEW
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

    // ✅ Next round - NEW
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

    // ✅ NEW: End game early
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
    // Add these to your existing socket connection handler:

// ✅ COMPATIBILITY: Answer submitted for a specific question
socket.on("answer-submitted", ({ roomId, playerName, questionIndex, answer }) => {
  const room = rooms[roomId];
  if (!room || room.gameType !== "compatibility") return;

  console.log(`📝 ${playerName} submitted answer for question ${questionIndex}: ${answer}`);
  
  // Store the answer
  if (!room.answers[playerName]) {
    room.answers[playerName] = [];
  }
  
  // Ensure the answers array is long enough
  while (room.answers[playerName].length <= questionIndex) {
    room.answers[playerName].push(null);
  }
  
  room.answers[playerName][questionIndex] = {
    questionIndex,
    answer,
    timestamp: new Date()
  };

  // Update progress
  const progress = Math.round(((questionIndex + 1) / 5) * 100); // Assuming 5 questions
  room.playerProgress[playerName] = progress;

  // Notify all players about progress
  io.to(roomId).emit("player-progress", {
    player: playerName,
    progress
  });

  console.log(`📊 ${playerName} progress: ${progress}%`);
});

// ✅ COMPATIBILITY: Question changed
socket.on("question-changed", ({ roomId, questionIndex }) => {
  const room = rooms[roomId];
  if (!room || room.gameType !== "compatibility") return;

  room.currentQuestion = questionIndex;
  
  io.to(roomId).emit("question-changed", {
    questionIndex,
    timeLeft: 25, // Reset timer
    gameState: {
      currentQuestion: room.currentQuestion,
      playerProgress: room.playerProgress
    }
  });

  console.log(`🔄 Question changed to ${questionIndex} in ${roomId}`);
});

// ✅ COMPATIBILITY: Submission status update
socket.on("submission-status", ({ roomId, player, submitted }) => {
  const room = rooms[roomId];
  if (!room || room.gameType !== "compatibility") return;

  if (!room.submissionStatus) {
    room.submissionStatus = {};
  }
  
  room.submissionStatus[player] = submitted;
  
  io.to(roomId).emit("submission-status", {
    player,
    submitted
  });

  console.log(`📋 ${player} submission status: ${submitted}`);
});

// ✅ COMPATIBILITY: Enhanced submit answers with advanced data
socket.on("submit-answers", ({ roomId, player, answers, advancedAnswers = {} }) => {
  const room = rooms[roomId];
  if (!room || !player?.name || room.gameType !== "compatibility") return;

  console.log(`📝 ${player.name} submitted final answers in ${roomId}`);
  
  // Store both regular and advanced answers
  room.answers[player.name] = {
    regular: answers,
    advancedAnswers: advancedAnswers,
    submittedAt: new Date()
  };
  
  // Update progress to 100%
  room.playerProgress[player.name] = 100;
  
  // Update submission status
  if (!room.submissionStatus) {
    room.submissionStatus = {};
  }
  room.submissionStatus[player.name] = true;

  // Notify all players about progress and submission
  io.to(roomId).emit("player-progress", {
    player: player.name,
    progress: 100
  });

  io.to(roomId).emit("submission-status", {
    player: player.name,
    submitted: true
  });

  console.log(`✅ ${player.name} completed compatibility test in ${roomId}`);

  // Check if all players have submitted
  const submittedPlayers = Object.keys(room.submissionStatus || {});
  const totalPlayers = room.players.length;
  
  console.log(`📊 Submission status: ${submittedPlayers.length}/${totalPlayers} players submitted`);
  
  if (submittedPlayers.length === totalPlayers) {
    // All players have submitted - calculate and show results
    console.log(`🎉 All players submitted in ${roomId}, calculating results`);
    
    const results = calculateCompatibilityResults(room);
    io.to(roomId).emit("show-results", results);
    
    // Reset for potential replay
    room.submissionStatus = {};
    
    console.log(`📈 Results shown for ${roomId}`);
  } else {
    // Not all players have submitted yet
    const waitingFor = room.players
      .filter(p => !submittedPlayers.includes(p.name))
      .map(p => p.name);
    
    io.to(roomId).emit("answers-update", {
      answered: submittedPlayers.length,
      total: totalPlayers,
      waitingFor: waitingFor
    });
    
    console.log(`⏳ Waiting for: ${waitingFor.join(', ')}`);
  }
});

// ✅ COMPATIBILITY: Calculate results function
function calculateCompatibilityResults(room) {

  // Add these to your existing socket connection handler:

// ✅ COMPATIBILITY: Answer submitted for a specific question
socket.on("answer-submitted", ({ roomId, playerName, questionIndex, answer }) => {
  const room = rooms[roomId];
  if (!room || room.gameType !== "compatibility") return;

  console.log(`📝 ${playerName} submitted answer for question ${questionIndex}: ${answer}`);
  
  // Store the answer
  if (!room.answers[playerName]) {
    room.answers[playerName] = [];
  }
  
  // Ensure the answers array is long enough
  while (room.answers[playerName].length <= questionIndex) {
    room.answers[playerName].push(null);
  }
  
  room.answers[playerName][questionIndex] = {
    questionIndex,
    answer,
    timestamp: new Date()
  };

  // Update progress
  const progress = Math.round(((questionIndex + 1) / 5) * 100); // Assuming 5 questions
  room.playerProgress[playerName] = progress;

  // Notify all players about progress
  io.to(roomId).emit("player-progress", {
    player: playerName,
    progress
  });

  console.log(`📊 ${playerName} progress: ${progress}%`);
});

// ✅ COMPATIBILITY: Question changed
socket.on("question-changed", ({ roomId, questionIndex }) => {
  const room = rooms[roomId];
  if (!room || room.gameType !== "compatibility") return;

  room.currentQuestion = questionIndex;
  
  io.to(roomId).emit("question-changed", {
    questionIndex,
    timeLeft: 25, // Reset timer
    gameState: {
      currentQuestion: room.currentQuestion,
      playerProgress: room.playerProgress
    }
  });

  console.log(`🔄 Question changed to ${questionIndex} in ${roomId}`);
});

// ✅ COMPATIBILITY: Submission status update
socket.on("submission-status", ({ roomId, player, submitted }) => {
  const room = rooms[roomId];
  if (!room || room.gameType !== "compatibility") return;

  if (!room.submissionStatus) {
    room.submissionStatus = {};
  }
  
  room.submissionStatus[player] = submitted;
  
  io.to(roomId).emit("submission-status", {
    player,
    submitted
  });

  console.log(`📋 ${player} submission status: ${submitted}`);
});

// ✅ COMPATIBILITY: Enhanced submit answers with advanced data
socket.on("submit-answers", ({ roomId, player, answers, advancedAnswers = {} }) => {
  const room = rooms[roomId];
  if (!room || !player?.name || room.gameType !== "compatibility") return;

  console.log(`📝 ${player.name} submitted final answers in ${roomId}`);
  
  // Store both regular and advanced answers
  room.answers[player.name] = {
    regular: answers,
    advancedAnswers: advancedAnswers,
    submittedAt: new Date()
  };
  
  // Update progress to 100%
  room.playerProgress[player.name] = 100;
  
  // Update submission status
  if (!room.submissionStatus) {
    room.submissionStatus = {};
  }
  room.submissionStatus[player.name] = true;

  // Notify all players about progress and submission
  io.to(roomId).emit("player-progress", {
    player: player.name,
    progress: 100
  });

  io.to(roomId).emit("submission-status", {
    player: player.name,
    submitted: true
  });

  console.log(`✅ ${player.name} completed compatibility test in ${roomId}`);

  // Check if all players have submitted
  const submittedPlayers = Object.keys(room.submissionStatus || {});
  const totalPlayers = room.players.length;
  
  console.log(`📊 Submission status: ${submittedPlayers.length}/${totalPlayers} players submitted`);
  
  if (submittedPlayers.length === totalPlayers) {
    // All players have submitted - calculate and show results
    console.log(`🎉 All players submitted in ${roomId}, calculating results`);
    
    const results = calculateCompatibilityResults(room);
    io.to(roomId).emit("show-results", results);
    
    // Reset for potential replay
    room.submissionStatus = {};
    
    console.log(`📈 Results shown for ${roomId}`);
  } else {
    // Not all players have submitted yet
    const waitingFor = room.players
      .filter(p => !submittedPlayers.includes(p.name))
      .map(p => p.name);
    
    io.to(roomId).emit("answers-update", {
      answered: submittedPlayers.length,
      total: totalPlayers,
      waitingFor: waitingFor
    });
    
    console.log(`⏳ Waiting for: ${waitingFor.join(', ')}`);
  }
});

// ✅ COMPATIBILITY: Calculate results function
function calculateCompatibilityResults(room) {
 
  // Add these to your existing socket connection handler:

// ✅ COMPATIBILITY: Answer submitted for a specific question
socket.on("answer-submitted", ({ roomId, playerName, questionIndex, answer }) => {
  const room = rooms[roomId];
  if (!room || room.gameType !== "compatibility") return;

  console.log(`📝 ${playerName} submitted answer for question ${questionIndex}: ${answer}`);
  
  // Store the answer
  if (!room.answers[playerName]) {
    room.answers[playerName] = [];
  }
  
  // Ensure the answers array is long enough
  while (room.answers[playerName].length <= questionIndex) {
    room.answers[playerName].push(null);
  }
  
  room.answers[playerName][questionIndex] = {
    questionIndex,
    answer,
    timestamp: new Date()
  };

  // Update progress
  const progress = Math.round(((questionIndex + 1) / 5) * 100); // Assuming 5 questions
  room.playerProgress[playerName] = progress;

  // Notify all players about progress
  io.to(roomId).emit("player-progress", {
    player: playerName,
    progress
  });

  console.log(`📊 ${playerName} progress: ${progress}%`);
});

// ✅ COMPATIBILITY: Question changed
socket.on("question-changed", ({ roomId, questionIndex }) => {
  const room = rooms[roomId];
  if (!room || room.gameType !== "compatibility") return;

  room.currentQuestion = questionIndex;
  
  io.to(roomId).emit("question-changed", {
    questionIndex,
    timeLeft: 25, // Reset timer
    gameState: {
      currentQuestion: room.currentQuestion,
      playerProgress: room.playerProgress
    }
  });

  console.log(`🔄 Question changed to ${questionIndex} in ${roomId}`);
});

// ✅ COMPATIBILITY: Submission status update
socket.on("submission-status", ({ roomId, player, submitted }) => {
  const room = rooms[roomId];
  if (!room || room.gameType !== "compatibility") return;

  if (!room.submissionStatus) {
    room.submissionStatus = {};
  }
  
  room.submissionStatus[player] = submitted;
  
  io.to(roomId).emit("submission-status", {
    player,
    submitted
  });

  console.log(`📋 ${player} submission status: ${submitted}`);
});

// ✅ COMPATIBILITY: Enhanced submit answers with advanced data
socket.on("submit-answers", ({ roomId, player, answers, advancedAnswers = {} }) => {
  const room = rooms[roomId];
  if (!room || !player?.name || room.gameType !== "compatibility") return;

  console.log(`📝 ${player.name} submitted final answers in ${roomId}`);
  
  // Store both regular and advanced answers
  room.answers[player.name] = {
    regular: answers,
    advancedAnswers: advancedAnswers,
    submittedAt: new Date()
  };
  
  // Update progress to 100%
  room.playerProgress[player.name] = 100;
  
  // Update submission status
  if (!room.submissionStatus) {
    room.submissionStatus = {};
  }
  room.submissionStatus[player.name] = true;

  // Notify all players about progress and submission
  io.to(roomId).emit("player-progress", {
    player: player.name,
    progress: 100
  });

  io.to(roomId).emit("submission-status", {
    player: player.name,
    submitted: true
  });

  console.log(`✅ ${player.name} completed compatibility test in ${roomId}`);

  // Check if all players have submitted
  const submittedPlayers = Object.keys(room.submissionStatus || {});
  const totalPlayers = room.players.length;
  
  console.log(`📊 Submission status: ${submittedPlayers.length}/${totalPlayers} players submitted`);
  
  if (submittedPlayers.length === totalPlayers) {
    // All players have submitted - calculate and show results
    console.log(`🎉 All players submitted in ${roomId}, calculating results`);
    
    const results = calculateCompatibilityResults(room);
    io.to(roomId).emit("show-results", results);
    
    // Reset for potential replay
    room.submissionStatus = {};
    
    console.log(`📈 Results shown for ${roomId}`);
  } else {
    // Not all players have submitted yet
    const waitingFor = room.players
      .filter(p => !submittedPlayers.includes(p.name))
      .map(p => p.name);
    
    io.to(roomId).emit("answers-update", {
      answered: submittedPlayers.length,
      total: totalPlayers,
      waitingFor: waitingFor
    });
    
    console.log(`⏳ Waiting for: ${waitingFor.join(', ')}`);
  }
});

// ✅ COMPATIBILITY: Calculate results function
function calculateCompatibilityResults(room) {
  console.log("🔍 Calculating compatibility results...");
  
  const results = {};
  const players = room.players.map(p => p.name);
  
  if (players.length < 2) {
    console.error("❌ Not enough players for compatibility calculation");
    return { error: "Not enough players" };
  }

  // For now, return mock results for testing
  // In a real implementation, you would calculate based on actual answers
  const mockResults = {
    score: Math.floor(Math.random() * 40) + 60, // 60-100%
    breakdown: {
      Lifestyle: Math.floor(Math.random() * 100),
      Taste: Math.floor(Math.random() * 100),
      Adventure: Math.floor(Math.random() * 100),
      Emotional: Math.floor(Math.random() * 100),
      Entertainment: Math.floor(Math.random() * 100)
    },
    insights: [
      "Great chemistry in lifestyle preferences!",
      "Shared values create a strong foundation",
      "Complementary personalities balance each other well"
    ],
    advancedFactors: {
      communication: "Similar styles",
      loveLanguages: "Compatible approaches",
      energy: "Well-matched rhythms",
      social: "Balanced preferences"
    },
    additionalFactors: {
      personalityAlignment: "Strong connection",
      valueAlignment: "Shared core values",
      hobbyAlignment: "Common interests",
      petCompatibility: "Similar preferences",
      goalAlignment: "Aligned vision"
    }
  };

  // Store results in room for potential reuse
  room.results = mockResults;
  
  console.log("📊 Compatibility results calculated:", mockResults.score + "%");
  
  return mockResults;
}

// ✅ COMPATIBILITY: Request to show results (for testing)
socket.on("request-results", ({ roomId }) => {
  const room = rooms[roomId];
  if (!room || room.gameType !== "compatibility") return;

  if (room.results) {
    socket.emit("show-results", room.results);
  } else {
    // Calculate results if not already calculated
    const results = calculateCompatibilityResults(room);
    socket.emit("show-results", results);
  }
});

  // For now, return mock results for testing
  // In a real implementation, you would calculate based on actual answers
 

  // Store results in room for potential reuse
  
  return mockResults;
}



    // ✅ NEW: Ping/pong for connection health
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });

    // ✅ FIXED: Disconnect cleanup
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