// socket/gameSocket.js
export default function gameSocket(io) {
  const rooms = {}; // { roomId: { roomId, players: [], status, currentPlayer, currentPrompt, currentChoice, answers: {}, proofs: {}, scores: {}, playerStats: {}, roundNumber: 1 } }
  
  // 🔥 NEW: Store chat messages for each room
  const chatMessages = new Map(); // roomId -> messages array

  io.on("connection", (socket) => {
    console.log("🎮 Game socket connected:", socket.id);

    const updateRoomPlayers = (roomId) => {
      const room = rooms[roomId];
      if (room) io.to(roomId).emit("update-players", room.players);
    };

    // 🔥 NEW: Send chat history to joining player
    const sendChatHistory = (roomId, socket) => {
      const messages = chatMessages.get(roomId) || [];
      socket.emit("chat-history", messages);
    };

    // 🔥 NEW: Chat message handler
    socket.on("send-chat-message", ({ roomId, message }) => {
      try {
        if (!chatMessages.has(roomId)) {
          chatMessages.set(roomId, []);
        }

        const roomChat = chatMessages.get(roomId);
        const chatMessage = {
          id: Date.now(),
          sender: message.sender,
          content: message.content,
          timestamp: new Date().toISOString(),
          type: "text"
        };
        
        roomChat.push(chatMessage);

        // Keep only last 100 messages
        if (roomChat.length > 100) {
          roomChat.shift();
        }

        // Broadcast to room
        io.to(roomId).emit("receive-chat-message", chatMessage);
        console.log(`💬 ${message.sender} sent message in ${roomId}: ${message.content}`);
      } catch (error) {
        console.error('Error sending chat message:', error);
      }
    });

    // 🔥 NEW: Typing indicators
    socket.on("typing", ({ roomId, isTyping }) => {
      const room = rooms[roomId];
      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        socket.to(roomId).emit("user-typing", { 
          userName: player.name, 
          isTyping 
        });
      }
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
        gameStarted: false
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
        gameType: room.gameType
      };
      
      // Add compatibility-specific state
      if (room.gameType === "compatibility") {
        gameState.playerProgress = room.playerProgress;
        gameState.currentQuestion = room.currentQuestion;
        gameState.gameStarted = room.gameStarted;
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
          gameType: room.gameType
        };
        
        // Add compatibility-specific state
        if (room.gameType === "compatibility") {
          gameState.playerProgress = room.playerProgress;
          gameState.currentQuestion = room.currentQuestion;
          gameState.gameStarted = room.gameStarted;
          gameState.answers = room.answers;
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
          reaction
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

    // ✅ Random spin to select player (Truth or Dare only)
    socket.on("spin-player", async ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.players.length === 0 || room.gameType !== "truth-or-dare") return;

      const previousPlayer = room.currentPlayer;
      let candidatePlayers = room.players;

      if (room.players.length > 1 && previousPlayer) {
        candidatePlayers = room.players.filter(p => p.name !== previousPlayer.name);
      }

      const spinCount = 15 + Math.floor(Math.random() * 10);
      let spinIndex = 0;

      for (let i = 0; i < spinCount; i++) {
        const current = candidatePlayers[spinIndex % candidatePlayers.length];
        io.to(roomId).emit("player-spinning", current);
        spinIndex++;
        await new Promise(res => setTimeout(res, 100 + i * 20));
      }

      const selectedPlayer = candidatePlayers[Math.floor(Math.random() * candidatePlayers.length)];
      room.currentPlayer = selectedPlayer;
      room.currentChoice = null;
      room.proofUploaded = false;
      room.proofs[selectedPlayer.name] = false;
      
      // Update player stats
      if (room.playerStats[selectedPlayer.name]) {
        room.playerStats[selectedPlayer.name].timesSelected++;
      }

      io.to(roomId).emit("player-selected", selectedPlayer);
      io.to(roomId).emit("player-stats-update", room.playerStats);

      // Send Truth/Dare options only to selected player
      io.to(selectedPlayer.socketId).emit("choose-truth-dare", ["Truth", "Dare"]);

      console.log(`🎯 Selected player: ${selectedPlayer.name}`);
    });

    // ✅ Selected player submits their choice (Truth or Dare only)
    socket.on("submit-truth-dare", ({ roomId, choice }) => {
      const room = rooms[roomId];
      if (!room || !room.currentPlayer || room.gameType !== "truth-or-dare") return;
      if (!["Truth", "Dare"].includes(choice)) return;

      room.currentChoice = choice;
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

    // ✅ Player uploads proof (Truth or Dare only)
    socket.on("proof-uploaded", ({ roomId, player, proofKey }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      if (!room.proofs) room.proofs = {};
      room.proofs[player] = proofKey;
      room.proofUploaded = true;
      
      // Notify all players that proof has been uploaded
      io.to(roomId).emit("proof-uploaded-notification", { 
        player, 
        proofKey 
      });
      
      // Notify host specifically
      io.to(roomId).emit("proof-status-update", { 
        proofUploaded: true,
        player 
      });
      
      console.log(`📸 ${player} uploaded proof in ${roomId}`);
    });

    // ✅ Notify host that proof is ready (Truth or Dare only)
    socket.on("notify-proof-ready", ({ roomId, player }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      const host = room.players.find(p => p.isHost);
      if (host) {
        io.to(host.socketId).emit("proof-ready-for-review", { player });
      }
    });

    // ✅ Request proof data from proof owner (Truth or Dare only)
    socket.on("request-proof-data", ({ roomId, playerName, proofKey }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      console.log(`🔍 ${socket.id} requesting proof from ${playerName}`);
      
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
        }
        
        io.to(roomId).emit("player-kicked", { playerName, kickedBy });
        io.to(roomId).emit("update-players", room.players);
        
        if (room.gameType === "truth-or-dare") {
          io.to(roomId).emit("scores-update", room.scores);
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
        }
      }
    });

    // Add these new socket events to your existing gameSocket.js file

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

    // ✅ Helper function to get random scenario - NEW
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

    function calculateRoundResults(room) {
      const voteCounts = {};
      
      // Count votes for each player
      Object.values(room.votes).forEach(votedFor => {
        voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
      });

      // Find player with most votes
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

      // Award points to winners
      winners.forEach(winner => {
        room.scores[winner] = (room.scores[winner] || 0) + 10;
        room.playerStats[winner].roundsWon++;
      });

      // Award participation points
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

    // ✅ Helper function to calculate final results - NEW
    function calculateFinalResults(room) {
      const playersWithScores = room.players.map(player => ({
        name: player.name,
        score: room.scores[player.name] || 0,
        stats: room.playerStats[player.name]
      }));

      // Sort by score descending
      playersWithScores.sort((a, b) => b.score - a.score);

      return {
        rankings: playersWithScores,
        topPlayer: playersWithScores[0],
        totalRounds: room.totalRounds
      };
    }

    // ✅ Disconnect cleanup - ENHANCED with chat cleanup
    socket.on("disconnect", () => {
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
          }
          
          if (disconnectedPlayer.isHost && room.players.length > 0) {
            room.players[0].isHost = true;
            io.to(room.players[0].socketId).emit("promoted-to-host");
          }
          
          if (room.players.length === 0) {
            delete rooms[roomId];
            // 🔥 NEW: Clean up chat messages when room is empty
            chatMessages.delete(roomId);
          } else {
            updateRoomPlayers(roomId);
            if (room.gameType === "truth-or-dare") {
              io.to(roomId).emit("scores-update", room.scores);
            }
          }
        }
      }
      console.log("❌ Disconnected:", socket.id);
    });
  });
}