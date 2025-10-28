// components/games/CreateGameRoom.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameSocket } from '../../hooks/useGameSocket';

const CreateGameRoom = () => {
  const navigate = useNavigate();
  const { createRoom, isConnected } = useGameSocket();
  
  const [formData, setFormData] = useState({
    gameType: 'truth-or-dare',
    roomName: '',
    playerName: '',
    maxPlayers: 8,
    rounds: 10,
    timeLimit: 30
  });

  const games = [
    { id: 'truth-or-dare', name: 'Truth or Dare', icon: '🎯' },
    { id: 'compatibility-quiz', name: 'Compatibility Quiz', icon: '💕' },
    { id: 'whos-most-likely', name: "Who's Most Likely", icon: '🤔' },
    { id: 'never-have-i-ever', name: 'Never Have I Ever', icon: '🙊' },
    { id: 'would-you-rather', name: 'Would You Rather', icon: '⚖️' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.roomName.trim() && formData.playerName.trim()) {
      createRoom(
        formData.gameType,
        formData.roomName,
        formData.playerName,
        {
          maxPlayers: formData.maxPlayers,
          rounds: formData.rounds,
          timeLimit: formData.timeLimit
        }
      );
    }
  };

  const handleJoinRoom = () => {
    navigate('/join-room');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Game Room</h1>
          <p className="text-white/80">Start a new multiplayer game session</p>
          <div className={`inline-block px-3 py-1 rounded-full text-sm mt-4 ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Game Type Selection */}
          <div>
            <label className="block text-white text-sm font-medium mb-3">
              Select Game
            </label>
            <div className="grid grid-cols-2 gap-3">
              {games.map(game => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, gameType: game.id }))}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    formData.gameType === game.id 
                      ? 'border-white bg-white/20' 
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="text-2xl mb-1">{game.icon}</div>
                  <div className="text-white text-sm font-medium">{game.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Room Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Room Name
              </label>
              <input
                type="text"
                value={formData.roomName}
                onChange={(e) => setFormData(prev => ({ ...prev, roomName: e.target.value }))}
                className="w-full p-3 rounded-lg bg-black/20 border border-white/20 text-white placeholder-white/50"
                placeholder="Enter room name"
                required
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={formData.playerName}
                onChange={(e) => setFormData(prev => ({ ...prev, playerName: e.target.value }))}
                className="w-full p-3 rounded-lg bg-black/20 border border-white/20 text-white placeholder-white/50"
                placeholder="Enter your name"
                required
              />
            </div>
          </div>

          {/* Game Settings */}
          <div className="space-y-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Max Players: {formData.maxPlayers}
              </label>
              <input
                type="range"
                min="2"
                max="12"
                value={formData.maxPlayers}
                onChange={(e) => setFormData(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Rounds: {formData.rounds}
              </label>
              <input
                type="range"
                min="5"
                max="20"
                value={formData.rounds}
                onChange={(e) => setFormData(prev => ({ ...prev, rounds: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-bold hover:scale-105 transition-transform"
            >
              Create Room
            </button>
            
            <button
              type="button"
              onClick={handleJoinRoom}
              className="w-full bg-white/10 text-white py-3 rounded-lg font-bold hover:bg-white/20 transition-colors border border-white/20"
            >
              Join Existing Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGameRoom;