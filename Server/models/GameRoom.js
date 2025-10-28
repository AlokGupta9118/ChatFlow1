// models/GameRoom.js
import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  socketId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  isHost: { type: Boolean, default: false },
  isReady: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  answers: { type: Map, of: mongoose.Schema.Types.Mixed },
  connected: { type: Boolean, default: true },
  avatar: String,
  joinedAt: { type: Date, default: Date.now }
});

const gameDataSchema = new mongoose.Schema({
  currentQuestion: { type: Number, default: 0 },
  questions: [mongoose.Schema.Types.Mixed],
  usedQuestions: [String],
  currentPlayer: String,
  votes: { type: Map, of: String },
  confessions: [{
    player: String,
    confession: String,
    timestamp: { type: Date, default: Date.now },
    proof: String
  }],
  choices: { type: Map, of: String },
  results: mongoose.Schema.Types.Mixed,
  startTime: { type: Date, default: Date.now }
});

const gameRoomSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  gameType: { 
    type: String, 
    required: true,
    enum: ['truth-or-dare', 'compatibility-quiz', 'whos-most-likely', 'never-have-i-ever', 'would-you-rather']
  },
  roomName: { type: String, required: true },
  host: { type: String, required: true },
  players: [playerSchema],
  gameState: { 
    type: String, 
    enum: ['waiting', 'playing', 'completed', 'paused'],
    default: 'waiting'
  },
  settings: {
    maxPlayers: { type: Number, default: 8 },
    rounds: { type: Number, default: 10 },
    timeLimit: { type: Number, default: 30 }
  },
  gameData: gameDataSchema,
  chatMessages: [{
    player: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['text', 'system'], default: 'text' }
  }],
  lastActivity: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Update last activity on save
gameRoomSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

export default mongoose.model('GameRoom', gameRoomSchema);