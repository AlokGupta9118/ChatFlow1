// socket/gameSocket.js
export default function gameSocket(io) {
  const rooms = {}; 
  const chatMessages = new Map();

  // ✅ NEW: Enhanced game state sync for Compatibility Game
  function syncCompatibilityGameState(roomId) {
    const room = rooms[roomId];
    if (!room || room.gameType !== "compatibility") return;

    const gameState = {
      gameStarted: room.gameStarted,
      currentQuestion: room.currentQuestion || 0,
      playerProgress: room.playerProgress || {},
      answers: room.answers || {},
      showResults: room.showResults || false,
      bothAnswers: room.bothAnswers || {},
      players: room.players,
      roomId: room.roomId
    };

    io.to(roomId).emit("game-state-update", gameState);
  }

  // ✅ Enhanced game state sync for Truth or Dare
  function syncTruthDareGameState(roomId) {
    const room = rooms[roomId];
    if (!room || room.gameType !== "truth-or-dare") return;

    const gameState = {
      stage: room.status === "waiting" ? "waiting" : "playing",
      players: room.players,
      selectedPlayer: room.currentPlayer,
      chosenPrompt: room.currentPrompt,
      truthDareChoice: room.currentChoice ? { 
        player: room.currentPlayer?.name, 
        choice: room.currentChoice 
      } : null,
      prompts: room.prompts || [],
      proofUploaded: room.proofUploaded,
      scores: room.scores,
      playerStats: room.playerStats,
      proofs: room.proofs,
      chatMessages: chatMessages.get(roomId) || [],
      roundNumber: room.roundNumber || 1
    };

    io.to(roomId).emit("game-state-sync", gameState);
  }

  // ✅ Helper function to get random scenario - ENHANCED
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

  // ✅ ENHANCED: Calculate round results - Store results for rejoining players
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
      votes: { ...room.votes },
      voteCounts: voteCounts,
      winners: winners,
      scores: { ...room.scores },
      playerStats: JSON.parse(JSON.stringify(room.playerStats)),
      scenario: room.currentScenario
    };

    // Store results for rejoining players
    room.roundResults = roundResults;

    io.to(room.roomId).emit("mostlikely-round-results", roundResults);
    console.log(`🏆 Round ${room.currentRound} results: ${winners.join(', ')} won with ${maxVotes} votes`);
  }

  // ✅ ENHANCED: Calculate final results - Store for rejoining players
  function calculateFinalResults(room) {
    const playersWithScores = room.players.map(player => ({
      name: player.name,
      score: room.scores[player.name] || 0,
      stats: room.playerStats[player.name]
    }));

    // Sort by score descending
    playersWithScores.sort((a, b) => b.score - a.score);

    const finalResults = {
      rankings: playersWithScores,
      topPlayer: playersWithScores[0],
      totalRounds: room.totalRounds
    };

    // Store final results for rejoining players
    room.finalResults = finalResults;
    room.status = "finished";

    return finalResults;
  }

  io.on("connection", (socket) => {
    console.log("🎮 Game socket connected:", socket.id);

    // 🔥 FIXED: Enhanced chat history function
    const sendChatHistory = (roomId, socket) => {
      const messages = chatMessages.get(roomId) || [];
      socket.emit("chat-history", messages);
    };

    // 🔥 FIXED: Enhanced update players function
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

    // ✅ ENHANCED: Rejoin game handler for ALL game types
    socket.on("rejoin-game", ({ roomId, playerName }) => {
      const room = rooms[roomId];
      if (!room) {
        socket.emit("rejoin-failed", "Room not found");
        return;
      }

      const player = room.players.find(p => p.name === playerName);
      if (player) {
        player.socketId = socket.id;
        socket.join(roomId);
        
        // Send complete game state based on game type
        let gameState;
        
        if (room.gameType === "truth-or-dare") {
          gameState = {
            stage: room.status === "waiting" ? "waiting" : "playing",
            players: room.players,
            selectedPlayer: room.currentPlayer,
            chosenPrompt: room.currentPrompt,
            truthDareChoice: room.currentChoice ? { 
              player: room.currentPlayer?.name, 
              choice: room.currentChoice 
            } : null,
            prompts: room.prompts || [],
            proofUploaded: room.proofUploaded,
            scores: room.scores,
            playerStats: room.playerStats,
            proofs: room.proofs,
            chatMessages: chatMessages.get(roomId) || [],
            roundNumber: room.roundNumber || 1
          };
        } else if (room.gameType === "most-likely") {
          gameState = {
            gameStarted: room.gameStarted,
            gameFinished: room.status === "finished",
            currentScenario: room.currentScenario,
            currentRound: room.currentRound,
            totalRounds: room.totalRounds,
            hasVoted: room.votes[playerName] !== undefined,
            votes: room.votes,
            roundResults: room.roundResults || null,
            finalResults: room.finalResults || null,
            voteCount: Object.keys(room.votes).length,
            selectedPlayer: room.votes[playerName] || ""
          };
        } else if (room.gameType === "compatibility") {
          gameState = {
            gameStarted: room.gameStarted,
            currentQuestion: room.currentQuestion || 0,
            playerProgress: room.playerProgress || {},
            answers: room.answers || {},
            showResults: room.showResults || false,
            bothAnswers: room.bothAnswers || {},
            players: room.players,
            roomId: room.roomId
          };
        }

        socket.emit("rejoin-success", {
          roomId,
          players: room.players,
          gameState,
          gameType: room.gameType
        });
        updateRoomPlayers(roomId);
        
        console.log(`🔁 ${playerName} rejoined ${room.gameType} room ${roomId}`);
      } else {
        socket.emit("rejoin-failed", "Player not found in this room");
      }
    });

    // ✅ NEW: Rejoin room handler (for compatibility game)
    socket.on("rejoin-room", ({ roomId, playerName }) => {
      const room = rooms[roomId];
      if (!room) {
        socket.emit("rejoin-failed", "Room not found");
        return;
      }

      const player = room.players.find(p => p.name === playerName);
      if (player) {
        player.socketId = socket.id;
        socket.join(roomId);
        
        let gameState = {};
        
        if (room.gameType === "compatibility") {
          gameState = {
            gameStarted: room.gameStarted,
            currentQuestion: room.currentQuestion || 0,
            playerProgress: room.playerProgress || {},
            answers: room.answers || {},
            showResults: room.showResults || false,
            bothAnswers: room.bothAnswers || {},
            players: room.players
          };
        }

        socket.emit("rejoin-success", {
          roomId,
          players: room.players,
          gameState,
          gameType: room.gameType
        });
        updateRoomPlayers(roomId);
        
        console.log(`🔁 ${playerName} rejoined ${room.gameType} room ${roomId}`);
      } else {
        socket.emit("rejoin-failed", "Player not found in this room");
      }
    });

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

    // ✅ FIXED: Create room - Initialize proper state for ALL game types
    socket.on("create-room", ({ player, gameType = "truth-or-dare" }) => {
      if (!player || !player.name) {
        socket.emit("create-error", "Player name missing");
        return;
      }

      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Base room structure
      const room = {
        roomId,
        players: [{ ...player, socketId: socket.id, isHost: true }],
        status: "waiting",
        gameType: gameType,
        gameStarted: false,
        createdAt: new Date().toISOString()
      };

      // Game-specific initialization
      if (gameType === "truth-or-dare") {
        room.currentPlayer = null;
        room.currentPrompt = null;
        room.currentChoice = null;
        room.prompts = [];
        room.proofs = {};
        room.scores = {};
        room.playerStats = {};
        room.playerLevels = {};
        room.playerStreaks = {};
        room.roundNumber = 1;
        room.proofUploaded = false;
      } else if (gameType === "compatibility") {
        room.currentQuestion = 0;
        room.playerProgress = {};
        room.answers = {};
        room.showResults = false;
        room.bothAnswers = {};
        room.timeLeft = null;
      } else if (gameType === "most-likely") {
        room.currentScenario = null;
        room.usedScenarios = [];
        room.votes = {};
        room.roundNumber = 1;
        room.currentRound = 1;
        room.totalRounds = 10;
        room.scores = {};
        room.playerStats = {};
        room.roundResults = null;
        room.finalResults = null;
        room.scenarios = [
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
        ]
      }

      // Initialize player data
      const playerName = player.name;
      if (gameType === "truth-or-dare") {
        room.scores[playerName] = 0;
        room.playerStats[playerName] = {
          timesSelected: 0,
          truthsCompleted: 0,
          daresCompleted: 0,
          roundsWon: 0,
          totalScore: 0
        };
        room.playerLevels[playerName] = 1;
        room.playerStreaks[playerName] = 0;
      } else if (gameType === "compatibility") {
        room.playerProgress[playerName] = 0;
      } else if (gameType === "most-likely") {
        room.scores[playerName] = 0;
        room.playerStats[playerName] = {
          timesVotedFor: 0,
          roundsWon: 0,
          totalVotes: 0
        };
      }

      rooms[roomId] = room;

      // Initialize chat
      chatMessages.set(roomId, []);

      socket.join(roomId);
      socket.emit("room-created", room);
      console.log(`🆕 ${gameType} room created: ${roomId} by ${player.name}`);
    });

    // ✅ FIXED: Join room - Proper state initialization for ALL game types
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
            roundsWon: 0,
            totalScore: 0
          };
          room.playerLevels[player.name] = 1;
          room.playerStreaks[player.name] = 0;
        } else if (room.gameType === "compatibility") {
          room.playerProgress[player.name] = 0;
        } else if (room.gameType === "most-likely") {
          room.scores[player.name] = 0;
          room.playerStats[player.name] = {
            timesVotedFor: 0,
            roundsWon: 0,
            totalVotes: 0
          };
        }
      } else {
        existing.socketId = socket.id;
      }

      socket.join(roomId);
      socket.emit("room-joined", room);
      updateRoomPlayers(roomId);
      
      // Send chat history
      sendChatHistory(roomId, socket);
      
      console.log(`👥 ${player.name} joined ${roomId} (${room.gameType})`);
    });

    // ✅ FIXED: Start game - Proper state transition for ALL game types
    socket.on("start-game", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room) return;
      if (room.players.length < 2)
        return socket.emit("start-error", "Need at least 2 players");

      room.status = "started";
      room.gameStarted = true;
      
      // Game-specific start logic
      if (room.gameType === "compatibility") {
        room.currentQuestion = 0;
        room.answers = {};
        room.showResults = false;
        room.bothAnswers = {};
        room.playerProgress = {};
        
        // Initialize progress for all players
        room.players.forEach(player => {
          room.playerProgress[player.name] = 0;
        });
      }
      
      io.to(roomId).emit("game-started", { 
        roomId,
        gameType: room.gameType 
      });
      
      // Sync game state to all players
      if (room.gameType === "truth-or-dare") {
        syncTruthDareGameState(roomId);
      } else if (room.gameType === "compatibility") {
        syncCompatibilityGameState(roomId);
      }
      
      console.log(`🚀 ${room.gameType} game started in ${roomId}`);
    });

    // ✅ NEW: Question changed handler for compatibility game
    socket.on("question-changed", ({ roomId, questionIndex }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "compatibility") return;

      room.currentQuestion = questionIndex;
      
      io.to(roomId).emit("question-changed", {
        questionIndex,
        timeLeft: 25 // Reset timer
      });
      
      console.log(`📝 Question changed to ${questionIndex} in ${roomId}`);
    });

    // ✅ NEW: Answer submitted handler for compatibility game
    socket.on("answer-submitted", ({ roomId, playerName, questionIndex, answer, advancedAnswers }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "compatibility") return;

      // Store answer
      if (!room.answers[playerName]) {
        room.answers[playerName] = [];
      }
      room.answers[playerName][questionIndex] = {
        answer,
        advancedAnswers: questionIndex === 4 ? advancedAnswers : null // Only store advanced answers on last question
      };

      console.log(`📝 ${playerName} submitted answer for question ${questionIndex} in ${roomId}`);
      
      // Sync game state
      syncCompatibilityGameState(roomId);
    });

    // ✅ ENHANCED: Player progress update - for compatibility game
    socket.on("player-progress", ({ roomId, progress }) => {
      const room = rooms[roomId];
      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        if (room.gameType === "compatibility") {
          room.playerProgress[player.name] = progress;
          io.to(roomId).emit("player-progress", {
            player: player.name,
            progress
          });
          console.log(`📊 ${player.name} progress: ${progress}%`);
        }
      }
    });

    // ✅ ENHANCED: Submit answers for compatibility game
    socket.on("submit-answers", ({ roomId, player, answers, advancedAnswers }) => {
      const room = rooms[roomId];
      if (!room || !player?.name || room.gameType !== "compatibility") return;

      console.log(`📝 ${player.name} submitted answers in ${roomId}`);
      
      // Store answers with advanced answers
      room.answers[player.name] = {
        basicAnswers: answers,
        advancedAnswers: advancedAnswers
      };
      
      // Update progress to 100%
      room.playerProgress[player.name] = 100;
      
      io.to(roomId).emit("player-progress", {
        player: player.name,
        progress: 100
      });

      // Check if all players have submitted
      const answeredPlayers = Object.keys(room.answers);
      const totalPlayers = room.players.length;
      
      console.log(`📊 Answers status: ${answeredPlayers.length}/${totalPlayers} players submitted`);
      
      if (answeredPlayers.length === totalPlayers) {
        // All players have submitted - show results
        console.log(`🎉 All players submitted in ${roomId}, showing results`);
        
        room.showResults = true;
        room.bothAnswers = room.answers;
        
        io.to(roomId).emit("show-results", { 
          results: room.answers,
          gameState: room
        });
        
        console.log(`🏆 Showing compatibility results in ${roomId}`);
      } else {
        // Not all players have submitted yet
        const waitingFor = room.players
          .filter(p => !answeredPlayers.includes(p.name))
          .map(p => p.name);
          
        io.to(roomId).emit("answers-update", {
          answered: answeredPlayers.length,
          total: totalPlayers,
          waitingFor: waitingFor
        });
        
        console.log(`⏳ Waiting for: ${waitingFor.join(', ')}`);
      }
      
      // Sync game state
      syncCompatibilityGameState(roomId);
    });

    // ✅ Player reactions
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

    // ✅ FIXED: Enhanced spin player with proper state management
    socket.on("spin-player", async ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.players.length === 0 || room.gameType !== "truth-or-dare") return;

      const previousPlayer = room.currentPlayer;
      let candidatePlayers = room.players;

      if (room.players.length > 1 && previousPlayer) {
        candidatePlayers = room.players.filter(p => p.name !== previousPlayer.name);
      }

      // Reset round state but keep prompts for new player
      room.currentPlayer = null;
      room.currentPrompt = null;
      room.currentChoice = null;
      room.proofUploaded = false;
      room.prompts = []; // Clear prompts for new round

      // Notify all players that spinning started
      io.to(roomId).emit("player-spinning", { player: "Spinning..." });

      // Wait for spinning animation
      await new Promise(res => setTimeout(res, 3000));

      const selectedPlayer = candidatePlayers[Math.floor(Math.random() * candidatePlayers.length)];
      room.currentPlayer = selectedPlayer;
      
      // Update player stats
      if (room.playerStats[selectedPlayer.name]) {
        room.playerStats[selectedPlayer.name].timesSelected++;
      }

      // Emit player selection to ALL players with full state
      io.to(roomId).emit("player-selected", {
        player: selectedPlayer.name,
        prompts: room.prompts,
        chosenPrompt: room.currentPrompt,
        truthDareChoice: room.currentChoice ? { 
          player: room.currentPlayer.name, 
          choice: room.currentChoice 
        } : null
      });
      
      io.to(roomId).emit("player-stats-update", room.playerStats);

      // Send Truth/Dare choice request only to selected player
      io.to(selectedPlayer.socketId).emit("choose-truth-dare");

      console.log(`🎯 Selected player: ${selectedPlayer.name} in room ${roomId}`);
    });

    // ✅ FIXED: Enhanced submit truth/dare choice
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
      
      console.log(`🟣 ${room.currentPlayer.name} chose ${choice} in ${roomId}`);
    });

    // ✅ FIXED: Enhanced send prompt - Store and broadcast properly
    socket.on("send-prompt", ({ roomId, prompt, askedBy, type, targetPlayer }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      // Create prompt object
      const promptObj = {
        id: Date.now(),
        text: prompt,
        from: askedBy,
        type: type
      };

      // Store prompt in room state
      if (!room.prompts) room.prompts = [];
      room.prompts.push(promptObj);

      // Broadcast to ALL players
      io.to(roomId).emit("receive-prompt", { 
        prompt, 
        askedBy, 
        type,
        targetPlayer: targetPlayer || room.currentPlayer?.name 
      });
      
      console.log(`💬 New ${type} prompt in ${roomId} for ${targetPlayer}: ${prompt}`);
    });

    // ✅ NEW: Choose prompt handler
    socket.on("choose-prompt", ({ roomId, prompt, player }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      // Verify it's the current player choosing
      if (room.currentPlayer?.name !== player) {
        socket.emit("error", "Not your turn to choose a prompt");
        return;
      }

      room.currentPrompt = prompt;
      
      // Broadcast chosen prompt to ALL players
      io.to(roomId).emit("prompt-chosen", {
        player: player,
        prompt: prompt,
        allPrompts: room.prompts
      });

      // For truth prompts, automatically mark as completed
      if (prompt.type === "truth") {
        room.proofUploaded = true;
        io.to(roomId).emit("proof-status-update", { 
          proofUploaded: true,
          player: player,
          type: "truth"
        });
        
        // Notify host
        const host = room.players.find(p => p.isHost);
        if (host) {
          io.to(host.socketId).emit("proof-ready-for-review", { 
            player: player,
            type: "truth"
          });
        }
      }

      console.log(`✅ ${player} chose prompt: ${prompt.text} (${prompt.type})`);
    });

    // ✅ FIXED: Enhanced proof uploaded handler
    socket.on("proof-uploaded", ({ roomId, player, proofKey }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      if (!room.proofs) room.proofs = {};
      room.proofs[player] = proofKey;
      room.proofUploaded = true;
      
      // Determine type based on current choice
      const type = room.currentChoice ? room.currentChoice.toLowerCase() : "dare";
      
      // Notify all players that proof has been uploaded
      io.to(roomId).emit("proof-uploaded-notification", { 
        player, 
        proofKey 
      });
      
      // Notify host specifically
      const host = room.players.find(p => p.isHost);
      if (host) {
        io.to(host.socketId).emit("proof-ready-for-review", { 
          player,
          type
        });
      }
      
      console.log(`📸 ${player} uploaded ${type} proof in ${roomId}`);
    });

    // ✅ FIXED: Enhanced proof ready notification
    socket.on("notify-proof-ready", ({ roomId, player, type = "dare" }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      console.log(`📸 ${player} completed ${type} in ${roomId}`);
      
      room.proofUploaded = true;
      
      // Notify host
      const host = room.players.find(p => p.isHost);
      if (host) {
        io.to(host.socketId).emit("proof-ready-for-review", { 
          player, 
          type 
        });
      }

      // Notify all players about completion status
      io.to(roomId).emit("proof-status-update", { 
        proofUploaded: true,
        player,
        type
      });
    });

    // ✅ FIXED: Enhanced reset round with proper state management
    socket.on("reset-round", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "truth-or-dare") return;

      const host = room.players.find(p => p.isHost);
      if (!host || host.socketId !== socket.id) {
        socket.emit("error", "Only host can reset the round");
        return;
      }

      // Increment round number
      room.roundNumber = (room.roundNumber || 1) + 1;
      
      // Reset round-specific state but keep overall game state
      room.currentPlayer = null;
      room.currentPrompt = null;
      room.currentChoice = null;
      room.proofUploaded = false;
      room.prompts = []; // Clear prompts for new round
      
      // Broadcast round reset to ALL players
      io.to(roomId).emit("round-reset");
      io.to(roomId).emit("proof-status-update", { proofUploaded: false });
      io.to(roomId).emit("round-number-update", room.roundNumber);
      
      // Sync complete game state
      syncTruthDareGameState(roomId);
      
      console.log(`🔄 Round reset in ${roomId} by host. Now round ${room.roundNumber}`);
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
        } else if (room.gameType === "most-likely") {
          // Only remove vote data, keep scores and stats for rejoining
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
        }
      }
    });

    // ✅ Create room for Who's Most Likely
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
        roundResults: null,
        finalResults: null,
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

    // ✅ Join Most Likely room
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

    // ✅ Start Most Likely game
    socket.on("start-mostlikely-game", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "most-likely") return;
      if (room.players.length < 2)
        return socket.emit("start-error", "Need at least 2 players");

      room.gameStarted = true;
      room.status = "playing";
      room.currentRound = 1;
      room.votes = {};
      room.roundResults = null;
      room.finalResults = null;
      
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

    // ✅ ENHANCED: Submit vote - Allow self-voting and fix validation
    socket.on("submit-mostlikely-vote", ({ roomId, votedFor }) => {
      const room = rooms[roomId];
      if (!room || !room.gameStarted || room.gameType !== "most-likely") return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      // Check if voted player exists in the room
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

    // ✅ ENHANCED: Next Round - Update room state properly
    socket.on("next-mostlikely-round", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.gameType !== "most-likely") return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player || !player.isHost) {
        socket.emit("error", "Only host can start next round");
        return;
      }

      room.currentRound++;
      room.votes = {};
      room.roundResults = null; // Clear previous round results

      if (room.currentRound > room.totalRounds) {
        // Game finished
        const finalResults = calculateFinalResults(room);
        
        io.to(roomId).emit("mostlikely-game-finished", finalResults);
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

    // ✅ FIXED: Enhanced disconnect handler
    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);
      
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const disconnectedPlayer = room.players.find(p => p.socketId === socket.id);
        
        if (disconnectedPlayer) {
          console.log(`👋 ${disconnectedPlayer.name} disconnected from ${roomId}`);
          
          room.players = room.players.filter((p) => p.socketId !== socket.id);
          
          // Handle host transfer
          if (disconnectedPlayer.isHost && room.players.length > 0) {
            room.players[0].isHost = true;
            io.to(room.players[0].socketId).emit("promoted-to-host");
            console.log(`👑 ${room.players[0].name} promoted to host in ${roomId}`);
          }
          
          // Clean up empty rooms
          if (room.players.length === 0) {
            delete rooms[roomId];
            chatMessages.delete(roomId);
            console.log(`🗑️ Room ${roomId} deleted (no players left)`);
          } else {
            // Update remaining players
            updateRoomPlayers(roomId);
            
            // Sync game state if game was in progress
            if (room.gameType === "truth-or-dare" && room.gameStarted) {
              syncTruthDareGameState(roomId);
            } else if (room.gameType === "compatibility" && room.gameStarted) {
              syncCompatibilityGameState(roomId);
            }
          }
        }
      }
    });
  });
}