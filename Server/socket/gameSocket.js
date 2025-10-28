// In your socket setup
import TruthOrDareGame from '../services/TruthOrDareGame.js';

const gameSocket = (io) => {
  io.on('connection', (socket) => {
    const truthOrDareGame = new TruthOrDareGame(io, socket);

    // Game event handlers
    socket.on('startGame', async (data) => {
      await truthOrDareGame.startGame(data.roomCode);
    });

    socket.on('chooseOption', async (data) => {
      await truthOrDareGame.handleOptionChoice(
        data.roomCode, 
        socket.id, 
        data.choice
      );
    });

    socket.on('submitTruth', async (data) => {
      await truthOrDareGame.handleTruthAnswer(
        data.roomCode,
        socket.id,
        data.confession
      );
    });

    socket.on('submitDareProof', async (data) => {
      await truthOrDareGame.handleDareProof(
        data.roomCode,
        socket.id,
        data.proof
      );
    });

    socket.on('castVote', async (data) => {
      await truthOrDareGame.handleVote(
        data.roomCode,
        socket.id,
        data.targetPlayerId,
        data.vote
      );
    });

    socket.on('nextRound', async (data) => {
      await truthOrDareGame.nextRound(data.roomCode);
    });

    // Host controls
    socket.on('forceNextRound', async (data) => {
      const gameRoom = await GameRoom.findOne({ roomCode: data.roomCode });
      if (gameRoom.host === socket.id) {
        await truthOrDareGame.nextRound(data.roomCode);
      }
    });

    socket.on('pauseGame', async (data) => {
      const gameRoom = await GameRoom.findOne({ roomCode: data.roomCode });
      if (gameRoom.host === socket.id) {
        gameRoom.gameState = 'paused';
        await gameRoom.save();
        io.to(data.roomCode).emit('gamePaused');
      }
    });

    socket.on('resumeGame', async (data) => {
      const gameRoom = await GameRoom.findOne({ roomCode: data.roomCode });
      if (gameRoom.host === socket.id) {
        gameRoom.gameState = 'playing';
        await gameRoom.save();
        io.to(data.roomCode).emit('gameResumed');
      }
    });
  });
};

export default gameSocket;