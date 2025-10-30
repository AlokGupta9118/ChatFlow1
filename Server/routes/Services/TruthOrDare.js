import GameRoom from '../models/GameRoom.js';
import { QuestionService } from './QuestionService.js';

class TruthOrDareGame {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;
    this.questionService = new QuestionService();
  }

  async startGame(roomCode) {
    try {
      const gameRoom = await GameRoom.findOne({ roomCode });
      if (!gameRoom) throw new Error('Room not found');

      // Initialize game data
      gameRoom.gameState = 'playing';
      gameRoom.gameData = {
        currentQuestion: 0,
        questions: [],
        usedQuestions: [],
        currentPlayer: '',
        votes: new Map(),
        confessions: [],
        choices: new Map(),
        results: {},
        startTime: new Date(),
        currentRound: 1,
        selectedOption: null,
        proofRequired: false,
        proofTimer: null
      };

      // Load questions for the game
      await this.loadQuestions(gameRoom);
      
      // Select first player using animated spinner
      await this.selectNextPlayer(gameRoom);

      await gameRoom.save();
      
      this.io.to(roomCode).emit('gameStarted', {
        message: 'Game started!',
        currentPlayer: gameRoom.gameData.currentPlayer,
        round: gameRoom.gameData.currentRound
      });

      this.startRoundTimer(roomCode);

    } catch (error) {
      console.error('Error starting game:', error);
      this.socket.emit('error', { message: error.message });
    }
  }

  async loadQuestions(gameRoom) {
    const questions = await this.questionService.getTruthOrDareQuestions(
      gameRoom.settings.rounds
    );
    gameRoom.gameData.questions = questions;
  }

  async selectNextPlayer(gameRoom) {
    const activePlayers = gameRoom.players.filter(p => p.connected && !p.isHost);
    
    if (activePlayers.length === 0) {
      throw new Error('No active players available');
    }

    // Emit spinner animation to all clients
    this.io.to(gameRoom.roomCode).emit('spinnerStart', {
      players: activePlayers.map(p => ({ id: p.socketId, name: p.name }))
    });

    // Simulate spinner delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Select random player
    const randomIndex = Math.floor(Math.random() * activePlayers.length);
    const selectedPlayer = activePlayers[randomIndex];
    
    gameRoom.gameData.currentPlayer = selectedPlayer.socketId;
    gameRoom.gameData.selectedOption = null;
    gameRoom.gameData.proofRequired = false;

    this.io.to(gameRoom.roomCode).emit('playerSelected', {
      player: {
        id: selectedPlayer.socketId,
        name: selectedPlayer.name,
        avatar: selectedPlayer.avatar
      },
      round: gameRoom.gameData.currentRound
    });

    // Send truth/dare option to selected player
    this.io.to(selectedPlayer.socketId).emit('chooseOption', {
      message: 'Choose Truth or Dare!',
      timeout: 15000 // 15 seconds to choose
    });

    this.startOptionTimer(gameRoom.roomCode, selectedPlayer.socketId);
  }

  async handleOptionChoice(roomCode, playerId, choice) {
    try {
      const gameRoom = await GameRoom.findOne({ roomCode });
      if (!gameRoom) throw new Error('Room not found');

      const currentPlayer = gameRoom.players.find(p => p.socketId === playerId);
      if (!currentPlayer) throw new Error('Player not found');

      gameRoom.gameData.selectedOption = choice;
      gameRoom.gameData.proofRequired = choice === 'dare';

      // Get appropriate question
      const question = this.getQuestionForChoice(gameRoom, choice);
      
      this.io.to(roomCode).emit('optionChosen', {
        player: {
          id: playerId,
          name: currentPlayer.name
        },
        choice: choice,
        question: question,
        proofRequired: choice === 'dare'
      });

      if (choice === 'truth') {
        this.startTruthTimer(roomCode, playerId);
      } else {
        this.startDareTimer(roomCode, playerId);
      }

      await gameRoom.save();

    } catch (error) {
      console.error('Error handling option choice:', error);
      this.socket.emit('error', { message: error.message });
    }
  }

  getQuestionForChoice(gameRoom, choice) {
    const availableQuestions = gameRoom.gameData.questions.filter(q => 
      q.type === choice && !gameRoom.gameData.usedQuestions.includes(q.id)
    );

    if (availableQuestions.length === 0) {
      // Fallback questions
      return choice === 'truth' 
        ? "What's your most embarrassing moment?"
        : "Do 10 pushups right now!";
    }

    const randomQuestion = availableQuestions[
      Math.floor(Math.random() * availableQuestions.length)
    ];
    
    gameRoom.gameData.usedQuestions.push(randomQuestion.id);
    return randomQuestion.text;
  }

  async handleTruthAnswer(roomCode, playerId, confession) {
    try {
      const gameRoom = await GameRoom.findOne({ roomCode });
      
      gameRoom.gameData.confessions.push({
        player: playerId,
        confession: confession,
        timestamp: new Date()
      });

      // Update player's score
      const player = gameRoom.players.find(p => p.socketId === playerId);
      if (player) {
        player.score += 10; // Points for completing truth
      }

      this.io.to(roomCode).emit('truthRevealed', {
        player: {
          id: playerId,
          name: player.name
        },
        confession: confession,
        score: player.score
      });

      await gameRoom.save();
      this.scheduleNextRound(roomCode);

    } catch (error) {
      console.error('Error handling truth answer:', error);
      this.socket.emit('error', { message: error.message });
    }
  }

  async handleDareProof(roomCode, playerId, proofData) {
    try {
      const gameRoom = await GameRoom.findOne({ roomCode });
      
      const confession = gameRoom.gameData.confessions.find(
        c => c.player === playerId
      );
      
      if (confession) {
        confession.proof = proofData;
      } else {
        gameRoom.gameData.confessions.push({
          player: playerId,
          confession: 'Dare completed!',
          proof: proofData,
          timestamp: new Date()
        });
      }

      // Update player's score
      const player = gameRoom.players.find(p => p.socketId === playerId);
      if (player) {
        player.score += 15; // More points for dare completion
      }

      this.io.to(roomCode).emit('dareProofReceived', {
        player: {
          id: playerId,
          name: player.name
        },
        proof: proofData,
        score: player.score
      });

      await gameRoom.save();
      
      // Start voting for dare completion
      this.startVoting(roomCode, playerId);

    } catch (error) {
      console.error('Error handling dare proof:', error);
      this.socket.emit('error', { message: error.message });
    }
  }

  async startVoting(roomCode, playerId) {
    try {
      const gameRoom = await GameRoom.findOne({ roomCode });
      
      this.io.to(roomCode).emit('votingStarted', {
        playerId: playerId,
        question: 'Did the player complete the dare successfully?',
        duration: 30000 // 30 seconds to vote
      });

      gameRoom.gameData.votes = new Map(); // Reset votes
      this.startVotingTimer(roomCode, playerId);

      await gameRoom.save();

    } catch (error) {
      console.error('Error starting voting:', error);
    }
  }

  async handleVote(roomCode, voterId, targetPlayerId, vote) {
    try {
      const gameRoom = await GameRoom.findOne({ roomCode });
      gameRoom.gameData.votes.set(voterId, vote);

      this.io.to(roomCode).emit('voteReceived', {
        voterId: voterId,
        votesCount: gameRoom.gameData.votes.size,
        totalPlayers: gameRoom.players.filter(p => p.connected && !p.isHost).length
      });

      await gameRoom.save();

    } catch (error) {
      console.error('Error handling vote:', error);
    }
  }

  async endVoting(roomCode, playerId) {
    try {
      const gameRoom = await GameRoom.findOne({ roomCode });
      const votes = Array.from(gameRoom.gameData.votes.values());
      const yesVotes = votes.filter(v => v === 'yes').length;
      const totalVotes = votes.length;

      const success = yesVotes > totalVotes / 2; // Majority wins

      const player = gameRoom.players.find(p => p.socketId === playerId);
      if (player) {
        if (success) {
          player.score += 10; // Bonus points for successful dare
        } else {
          player.score -= 5; // Penalty for failed dare
        }
      }

      this.io.to(roomCode).emit('votingResults', {
        playerId: playerId,
        playerName: player?.name,
        yesVotes: yesVotes,
        noVotes: totalVotes - yesVotes,
        success: success,
        finalScore: player?.score
      });

      await gameRoom.save();
      this.scheduleNextRound(roomCode);

    } catch (error) {
      console.error('Error ending voting:', error);
    }
  }

  async nextRound(roomCode) {
    try {
      const gameRoom = await GameRoom.findOne({ roomCode });
      
      gameRoom.gameData.currentRound++;
      
      if (gameRoom.gameData.currentRound > gameRoom.settings.rounds) {
        await this.endGame(roomCode);
        return;
      }

      await this.selectNextPlayer(gameRoom);
      await gameRoom.save();

    } catch (error) {
      console.error('Error moving to next round:', error);
      this.socket.emit('error', { message: error.message });
    }
  }

  async endGame(roomCode) {
    try {
      const gameRoom = await GameRoom.findOne({ roomCode });
      gameRoom.gameState = 'completed';

      // Calculate final results
      const results = gameRoom.players
        .filter(p => !p.isHost)
        .map(player => ({
          playerId: player.socketId,
          name: player.name,
          score: player.score,
          avatar: player.avatar
        }))
        .sort((a, b) => b.score - a.score);

      gameRoom.gameData.results = results;

      this.io.to(roomCode).emit('gameEnded', {
        results: results,
        confessions: gameRoom.gameData.confessions
      });

      await gameRoom.save();

    } catch (error) {
      console.error('Error ending game:', error);
    }
  }

  // Timer functions
  startRoundTimer(roomCode) {
    setTimeout(() => {
      this.io.to(roomCode).emit('roundTimeWarning', {
        message: 'Round ending soon!'
      });
    }, 45000); // 45 seconds warning
  }

  startOptionTimer(roomCode, playerId) {
    setTimeout(async () => {
      const gameRoom = await GameRoom.findOne({ roomCode });
      if (gameRoom.gameData.currentPlayer === playerId && !gameRoom.gameData.selectedOption) {
        // Auto-select truth if no choice made
        this.handleOptionChoice(roomCode, playerId, 'truth');
      }
    }, 15000);
  }

  startTruthTimer(roomCode, playerId) {
    setTimeout(async () => {
      const gameRoom = await GameRoom.findOne({ roomCode });
      if (gameRoom.gameData.currentPlayer === playerId) {
        this.io.to(playerId).emit('timeout', {
          message: 'Time is up! Please provide your answer.'
        });
      }
    }, 30000);
  }

  startDareTimer(roomCode, playerId) {
    setTimeout(async () => {
      const gameRoom = await GameRoom.findOne({ roomCode });
      if (gameRoom.gameData.currentPlayer === playerId) {
        this.io.to(playerId).emit('timeout', {
          message: 'Time is up! Please complete the dare and submit proof.'
        });
      }
    }, 60000); // 60 seconds for dare
  }

  startVotingTimer(roomCode, playerId) {
    setTimeout(() => {
      this.endVoting(roomCode, playerId);
    }, 30000);
  }

  scheduleNextRound(roomCode) {
    setTimeout(() => {
      this.nextRound(roomCode);
    }, 10000); // 10 seconds between rounds
  }
}

export default TruthOrDareGame;