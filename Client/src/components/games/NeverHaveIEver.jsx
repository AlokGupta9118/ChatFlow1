// components/games/NeverHaveIEver.jsx
import React, { useState } from 'react';
import { useGameSocket } from '../../hooks/useGameSocket';

const NeverHaveIEver = ({ roomCode, playerName }) => {
  const {
    gameState,
    players,
    chatMessages,
    isConnected,
    sendChatMessage,
    submitNeverHaveConfession
  } = useGameSocket();

  const [confession, setConfession] = useState('');
  const [showConfessionModal, setShowConfessionModal] = useState(false);

  const questions = gameState?.gameData?.questions || [];
  const currentQuestionIndex = gameState?.gameData?.currentQuestion || 0;
  const currentQuestion = questions[currentQuestionIndex];
  const isHost = players.find(p => p.socketId === gameState?.socketId)?.isHost;
  const hasAnswered = gameState?.gameData?.confessions?.some(c => c.player === playerName && c.questionIndex === currentQuestionIndex);

  const handleConfess = () => {
    setShowConfessionModal(true);
  };

  const handleDeny = () => {
    submitNeverHaveConfession(roomCode, 'deny', null, currentQuestionIndex);
  };

  const handleSubmitConfession = () => {
    if (confession.trim()) {
      submitNeverHaveConfession(roomCode, 'confess', confession, currentQuestionIndex);
      setConfession('');
      setShowConfessionModal(false);
    }
  };

  const handleNextStatement = () => {
    // Socket event for next statement
  };

  const getPlayerScore = (playerName) => {
    return gameState?.gameData?.confessions?.filter(c => c.player === playerName).length || 0;
  };

  const currentConfessions = gameState?.gameData?.confessions?.filter(c => c.questionIndex === currentQuestionIndex) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-teal-600 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Players Sidebar with Scores */}
          <div className="lg:col-span-1 bg-white/10 rounded-2xl p-6 backdrop-blur-lg border border-white/20">
            <h3 className="text-xl font-bold mb-4">Players & Scores</h3>
            <div className="space-y-3">
              {players.map(player => (
                <div key={player.socketId} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      player.connected ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="font-medium">{player.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-yellow-400">{getPlayerScore(player.name)}</div>
                    <div className="text-xs text-white/60">points</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Game Progress */}
            <div className="mt-6 p-4 bg-white/5 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{currentQuestionIndex + 1}/{questions.length}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Main Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-lg border border-white/20 text-center">
              <h1 className="text-4xl font-bold mb-2">Never Have I Ever</h1>
              <p className="text-white/80 text-lg">Confess your experiences and learn about your friends!</p>
              <div className="flex justify-center space-x-6 mt-4 text-sm">
                <span>Room: <strong>{roomCode}</strong></span>
                <span>Statement: <strong>{currentQuestionIndex + 1}/{questions.length}</strong></span>
              </div>
            </div>

            {/* Statement Card */}
            <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-lg border border-white/20 text-center">
              <div className="mb-2">
                <span className="text-white/60 text-sm">Statement {currentQuestionIndex + 1}</span>
                <h2 className="text-4xl font-bold mt-4 mb-8">
                  "Never have I ever {currentQuestion}"
                </h2>
              </div>

              {/* Action Buttons */}
              {!hasAnswered ? (
                <div className="grid grid-cols-2 gap-6 max-w-md mx-auto mb-8">
                  <button
                    onClick={handleConfess}
                    className="bg-red-500 hover:bg-red-600 p-6 rounded-xl text-xl font-bold transition-all hover:scale-105"
                  >
                    🙋 I HAVE!
                  </button>
                  <button
                    onClick={handleDeny}
                    className="bg-green-500 hover:bg-green-600 p-6 rounded-xl text-xl font-bold transition-all hover:scale-105"
                  >
                    🙅 NEVER!
                  </button>
                </div>
              ) : (
                <div className="py-8">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-2xl font-bold text-green-400 mb-2">Answer Submitted!</h3>
                  <p className="text-white/80">Waiting for other players...</p>
                </div>
              )}

              {/* Confessions Display */}
              {currentConfessions.length > 0 && (
                <div className="mt-8 p-6 bg-white/5 rounded-xl">
                  <h3 className="text-xl font-bold mb-4">Confessions 🗣️</h3>
                  <div className="space-y-3">
                    {currentConfessions.map((confession, index) => (
                      <div key={index} className="p-3 bg-white/5 rounded-lg text-left">
                        <div className="font-bold text-yellow-400">{confession.player}</div>
                        <p className="text-white/80">{confession.confession}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Host Controls */}
              {isHost && players.every(p => 
                gameState?.gameData?.confessions?.some(c => c.player === p.name && c.questionIndex === currentQuestionIndex) || !p.connected
              ) && (
                <button
                  onClick={handleNextStatement}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 rounded-xl text-xl font-bold hover:scale-105 transition-transform mt-6"
                >
                  Next Statement →
                </button>
              )}
            </div>

            {/* Chat Section */}
            <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-lg border border-white/20">
              <ChatSection 
                chatMessages={chatMessages}
                sendChatMessage={sendChatMessage}
                roomCode={roomCode}
              />
            </div>
          </div>

          {/* Instructions Sidebar */}
          <div className="lg:col-span-1 bg-white/10 rounded-2xl p-6 backdrop-blur-lg border border-white/20">
            <h3 className="text-xl font-bold mb-4">How To Play</h3>
            <div className="space-y-4 text-sm text-white/80">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                <p>Read the "Never have I ever..." statement</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <p>Confess if you've done it or deny it</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <p>Share your story if you're comfortable!</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
              <h4 className="font-bold text-yellow-300 mb-2">🌟 Remember</h4>
              <p className="text-yellow-200/80 text-sm">Share only what you're comfortable with. This is about fun and connection!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Confession Modal */}
      {showConfessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-green-600 to-teal-700 rounded-2xl p-8 max-w-md w-full border border-white/20">
            <h3 className="text-2xl font-bold mb-4">Share Your Story! 🗣️</h3>
            <p className="text-white/80 mb-4">
              You've done it! Tell us about your experience with:
            </p>
            <p className="text-xl font-bold mb-6 text-center">"{currentQuestion}"</p>
            
            <textarea
              value={confession}
              onChange={(e) => setConfession(e.target.value)}
              placeholder="Share your story (optional)..."
              className="w-full p-4 rounded-xl bg-black/20 border border-white/20 text-white placeholder-white/50 mb-6"
              rows="4"
            />
            
            <div className="flex space-x-4">
              <button
                onClick={() => setShowConfessionModal(false)}
                className="flex-1 bg-white/20 py-3 rounded-xl font-medium hover:bg-white/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitConfession}
                className="flex-1 bg-yellow-500 py-3 rounded-xl font-bold hover:bg-yellow-600 transition-colors"
              >
                Share Story
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NeverHaveIEver;