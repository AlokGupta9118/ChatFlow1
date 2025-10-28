// server/middleware/roomPersistence.js
const GameRoom = require('../models/GameRoom');

const roomPersistence = {
  // Save room state to database
  async saveRoomState(room) {
    try {
      await GameRoom.findOneAndUpdate(
        { roomCode: room.id },
        {
          roomCode: room.id,
          gameType: room.gameType,
          gameState: room.gameState,
          players: Array.from(room.players.entries()),
          gameData: room.gameData,
          lastActivity: new Date()
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('Error saving room state:', error);
    }
  },

  // Load room state from database
  async loadRoomState(roomCode) {
    try {
      const savedRoom = await GameRoom.findOne({ roomCode });
      if (savedRoom) {
        // Convert back to Map objects
        const players = new Map(savedRoom.players);
        return {
          ...savedRoom.toObject(),
          players
        };
      }
    } catch (error) {
      console.error('Error loading room state:', error);
    }
    return null;
  },

  // Clean up inactive rooms
  async cleanupInactiveRooms() {
    try {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
      await GameRoom.deleteMany({ lastActivity: { $lt: cutoffTime } });
    } catch (error) {
      console.error('Error cleaning up rooms:', error);
    }
  }
};

module.exports = roomPersistence;