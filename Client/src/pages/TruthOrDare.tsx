// components/games/TruthOrDareGame.jsx
import React, { useState } from 'react';
import {useGamSocket} from "../hooks/useGameSocket"

const TruthOrDareGame = ({ roomCode, playerName }) => {
  const {
    gameState,
    players,
    chatMessages,
    isConnected,
    spinWheel,
    chooseTruthDare,
    submitTruth,
    submitDareProof,
    nextRound,
    sendChatMessage
  } = useGameSocket();

  const [truthAnswer, setTruthAnswer] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [showProofOptions, setShowProofOptions] = useState(false);

  const isHost = players.find(p => p.socketId === gameState?.socketId)?.isHost;
  const isCurrentPlayer = gameState?.selectedPlayerId === gameState?.socketId;

  const handleSpinWheel = () => {
    spinWheel(roomCode);
  };

  const handleChoice = (choice) => {
    chooseTruthDare(roomCode, choice);
    setShowProofOptions(false);
  };

  const handleSubmitTruth = () => {
    if (truthAnswer.trim()) {
      submitTruth(roomCode, truthAnswer);
      setTruthAnswer('');
    }
  };

  const handleSubmitDareProof = (proofType) => {
    submitDareProof(roomCode, proofType, `Proof for ${proofType}`);
    setShowProofOptions(false);
  };

  const handleNextRound = () => {
    nextRound(roomCode);
  };

  const handleSendChat = () => {
    if (chatMessage.trim()) {
      sendChatMessage(roomCode, chatMessage);
      setChatMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-800 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Connection Status */}
        <div className={`fixed top-4 right-4 p-2 rounded-lg ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Players Sidebar */}
          <div className="lg:col-span-1 bg-white/10 rounded-lg p-4 backdrop-blur-lg">
            <h3 className="text-lg font-bold mb-4">Players ({players.length})</h3>
            <div className="space-y-2">
              {players.map(player => (
                <div 
                  key={player.socketId}
                  className={`p-3 rounded-lg flex items-center justify-between ${
                    player.socketId === gameState?.selectedPlayerId ? 'bg-yellow-500/20 border border-yellow-500' : 'bg-white/5'
                  } ${!player.connected ? 'opacity-50' : ''}`}
                >
                  <span>{player.name}</span>
                  {player.isHost && <span className="text-xs bg-blue-500 px-2 py-1 rounded">Host</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Main Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game Info */}
            <div className="bg-white/10 rounded-lg p-6 backdrop-blur-lg text-center">
              <h1 className="text-3xl font-bold mb-2">Truth or Dare</h1>
              <p className="text-white/80">Room: {roomCode}</p>
              <div className="flex justify-center space-x-4 mt-4 text-sm">
                <span>Round: {gameState?.gameData?.currentRound || 0}/{gameState?.settings?.rounds || 10}</span>
                <span>Players: {players.filter(p => p.connected).length}</span>
              </div>
            </div>

            {/* Wheel Section */}
            {gameState?.gameState === 'playing' && (
              <div className="bg-white/10 rounded-lg p-6 backdrop-blur-lg text-center">
                {!gameState?.selectedPlayer && !gameState?.wheelSpinning && isHost && (
                  <button
                    onClick={handleSpinWheel}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 rounded-full text-xl font-bold hover:scale-105 transition-transform"
                  >
                    🎡 Spin Wheel
                  </button>
                )}

                {gameState?.wheelSpinning && (
                  <div className="text-4xl animate-spin">🎡</div>
                )}

                {gameState?.selectedPlayer && !gameState?.currentQuestion && (
                  <div className="text-2xl font-bold">
                    🎯 {gameState.selectedPlayer} was selected!
                  </div>
                )}

                {/* Choice Buttons (only for selected player) */}
                {isCurrentPlayer && gameState?.showChoice && !gameState?.currentQuestion && (
                  <div className="mt-6 space-y-4">
                    <button
                      onClick={() => handleChoice('truth')}
                      className="bg-green-500 px-6 py-3 rounded-lg text-lg font-bold hover:bg-green-600 w-full"
                    >
                      📖 Truth
                    </button>
                    <button
                      onClick={() => handleChoice('dare')}
                      className="bg-red-500 px-6 py-3 rounded-lg text-lg font-bold hover:bg-red-600 w-full"
                    >
                      🎯 Dare
                    </button>
                  </div>
                )}

                {/* Question Display */}
                {gameState?.currentQuestion && (
                  <div className="mt-6 p-4 bg-black/20 rounded-lg">
                    <h3 className="text-xl font-bold mb-2">
                      {gameState.currentChoice === 'truth' ? '📖 Truth:' : '🎯 Dare:'}
                    </h3>
                    <p className="text-lg">{gameState.currentQuestion}</p>

                    {/* Answer Area */}
                    {isCurrentPlayer && gameState.awaitingResponse && (
                      <div className="mt-4">
                        {gameState.currentChoice === 'truth' ? (
                          <div className="space-y-4">
                            <textarea
                              value={truthAnswer}
                              onChange={(e) => setTruthAnswer(e.target.value)}
                              placeholder="Share your truth..."
                              className="w-full p-3 rounded-lg bg-black/20 border border-white/20 text-white"
                              rows="3"
                            />
                            <button
                              onClick={handleSubmitTruth}
                              className="bg-green-500 px-6 py-2 rounded-lg hover:bg-green-600"
                            >
                              Submit Truth
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm text-white/80">How will you prove you completed the dare?</p>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleSubmitDareProof('photo')}
                                className="bg-blue-500 p-3 rounded-lg hover:bg-blue-600"
                              >
                                📸 Photo
                              </button>
                              <button
                                onClick={() => handleSubmitDareProof('video')}
                                className="bg-blue-500 p-3 rounded-lg hover:bg-blue-600"
                              >
                                🎥 Video
                              </button>
                              <button
                                onClick={() => handleSubmitDareProof('audio')}
                                className="bg-blue-500 p-3 rounded-lg hover:bg-blue-600"
                              >
                                🎤 Audio
                              </button>
                              <button
                                onClick={() => handleSubmitDareProof('story')}
                                className="bg-blue-500 p-3 rounded-lg hover:bg-blue-600"
                              >
                                📝 Story
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Next Round Button */}
                {isHost && gameState?.canStartNextRound && (
                  <button
                    onClick={handleNextRound}
                    className="mt-6 bg-gradient-to-r from-green-500 to-blue-500 px-6 py-3 rounded-lg text-lg font-bold hover:scale-105 transition-transform"
                  >
                    Next Round →
                  </button>
                )}
              </div>
            )}

            {/* Chat Section */}
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-lg">
              <h3 className="text-lg font-bold mb-4">Game Chat</h3>
              <div className="h-48 overflow-y-auto mb-4 space-y-2">
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`p-2 rounded-lg ${
                    msg.type === 'system' ? 'bg-yellow-500/20' : 'bg-white/5'
                  }`}>
                    <span className="font-bold">{msg.player}:</span> {msg.message}
                  </div>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Type a message..."
                  className="flex-1 p-2 rounded-lg bg-black/20 border border-white/20 text-white"
                />
                <button
                  onClick={handleSendChat}
                  className="bg-blue-500 px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Game Info Sidebar */}
          <div className="lg:col-span-1 bg-white/10 rounded-lg p-4 backdrop-blur-lg">
            <h3 className="text-lg font-bold mb-4">Game Rules</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>• Host spins the wheel to select a player</li>
              <li>• Selected player chooses Truth or Dare</li>
              <li>• Answer truthfully or complete the dare</li>
              <li>• Provide proof for dares when possible</li>
              <li>• Host starts next round when ready</li>
              <li>• Use chat to interact with other players</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TruthOrDareGame;