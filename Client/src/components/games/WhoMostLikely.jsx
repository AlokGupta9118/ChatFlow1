// components/games/WhosMostLikely.jsx
import React, { useState } from 'react';
import { useGameSocket } from '../../hooks/useGameSocket';

const WhosMostLikely = ({ roomCode, playerName }) => {
  const {
    gameState,
    players,
    chatMessages,
    isConnected,
    sendChatMessage,
    voteMostLikely
  } = useGameSocket();

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const questions = gameState?.gameData?.questions || [];
  const currentQuestionIndex = gameState?.gameData?.currentQuestion || 0;
  const currentQuestion = questions[currentQuestionIndex];
  const isHost = players.find(p => p.socketId === gameState?.socketId)?.isHost;
  const hasVoted = gameState?.gameData?.votes?.has(gameState?.socketId);

  const activePlayers = players.filter(p => p.connected && !p.isHost);

  const handleVote = (playerId) => {
    setSelectedPlayer(playerId);
    voteMostLikely(roomCode, currentQuestionIndex, playerId);
  };

  const handleNextQuestion = () => {
    // This would be emitted to socket
    setSelectedPlayer(null);
    setShowResults(false);
  };

  const handleShowResults = () => {
    setShowResults(true);
  };

  if (showResults || gameState?.gameData?.results) {
    return (
      <ResultsView 
        results={gameState?.gameData?.results}
        currentQuestion={currentQuestion}
        players={players}
        roomCode={roomCode}
        sendChatMessage={sendChatMessage}
        chatMessages={chatMessages}
        onNextQuestion={handleNextQuestion}
        isHost={isHost}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Players Sidebar */}
          <div className="lg:col-span-1 bg-white/10 rounded-2xl p-6 backdrop-blur-lg border border-white/20">
            <h3 className="text-xl font-bold mb-4">Players ({players.length})</h3>
            <div className="space-y-3">
              {players.map(player => (
                <div key={player.socketId} className={`p-3 rounded-lg flex items-center justify-between ${
                  selectedPlayer === player.socketId ? 'bg-green-500/20 border border-green-500' : 'bg-white/5'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      player.connected ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="font-medium">{player.name}</span>
                  </div>
                  {player.isHost && <span className="text-xs bg-blue-500 px-2 py-1 rounded">Host</span>}
                </div>
              ))}
            </div>

            {/* Voting Progress */}
            <div className="mt-6 p-4 bg-white/5 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span>Voting Progress</span>
                <span>{Object.keys(gameState?.gameData?.votes || {}).length}/{activePlayers.length}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(Object.keys(gameState?.gameData?.votes || {}).length / activePlayers.length) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Main Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-lg border border-white/20 text-center">
              <h1 className="text-4xl font-bold mb-2">Who's Most Likely To...</h1>
              <p className="text-white/80 text-lg">Point at the person who fits the description best!</p>
              <div className="flex justify-center space-x-6 mt-4 text-sm">
                <span>Room: <strong>{roomCode}</strong></span>
                <span>Question: <strong>{currentQuestionIndex + 1}/{questions.length}</strong></span>
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-lg border border-white/20 text-center">
              <div className="mb-2">
                <span className="text-white/60 text-sm">Question {currentQuestionIndex + 1}</span>
                <h2 className="text-3xl font-bold mt-2 mb-8">
                  "{currentQuestion}"
                </h2>
              </div>

              {/* Players Grid for Voting */}
              {!hasVoted ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {activePlayers.map(player => (
                    <button
                      key={player.socketId}
                      onClick={() => handleVote(player.socketId)}
                      className="p-6 bg-white/5 rounded-xl border-2 border-white/10 hover:border-white/30 hover:bg-white/10 transition-all group"
                    >
                      <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3 group-hover:scale-110 transition-transform">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-lg">{player.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-2xl font-bold text-green-400 mb-2">Vote Submitted!</h3>
                  <p className="text-white/80">Waiting for other players to vote...</p>
                </div>
              )}

              {/* Host Controls */}
              {isHost && Object.keys(gameState?.gameData?.votes || {}).length === activePlayers.length && (
                <button
                  onClick={handleShowResults}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-4 rounded-xl text-xl font-bold hover:scale-105 transition-transform"
                >
                  Show Results 🎯
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
                <p>Read the "Who's most likely to..." question</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <p>Vote for the player who best fits the description</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <p>See the results and laugh together!</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
              <h4 className="font-bold text-yellow-300 mb-2">💡 Remember</h4>
              <p className="text-yellow-200/80 text-sm">This is all in good fun! Vote based on personality, not to embarrass anyone.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Results Component
const ResultsView = ({ results, currentQuestion, players, onNextQuestion, isHost }) => {
  const voteCounts = results || {};
  const sortedPlayers = [...players].sort((a, b) => (voteCounts[b.socketId] || 0) - (voteCounts[a.socketId] || 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Results! 🎉</h1>
            <p className="text-xl text-white/80 mb-2">For the question:</p>
            <h2 className="text-2xl font-bold italic">"{currentQuestion}"</h2>
          </div>

          {/* Results */}
          <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-lg border border-white/20 mb-8">
            <div className="space-y-4">
              {sortedPlayers.map((player, index) => {
                const votes = voteCounts[player.socketId] || 0;
                const percentage = (votes / Object.values(voteCounts).reduce((a, b) => a + b, 0)) * 100;
                
                return (
                  <div key={player.socketId} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{player.name}</h3>
                        <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{votes} votes</div>
                      <div className="text-sm text-white/60">{percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Winner Announcement */}
          {sortedPlayers[0] && (
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-8 text-center mb-8">
              <div className="text-6xl mb-4">👑</div>
              <h2 className="text-3xl font-bold mb-2">And the winner is...</h2>
              <h3 className="text-4xl font-bold">{sortedPlayers[0].name}!</h3>
              <p className="text-xl mt-2">
                with {voteCounts[sortedPlayers[0].socketId] || 0} votes
              </p>
            </div>
          )}

          {/* Next Question Button */}
          {isHost && (
            <div className="text-center">
              <button
                onClick={onNextQuestion}
                className="bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-4 rounded-xl text-xl font-bold hover:scale-105 transition-transform"
              >
                Next Question →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhosMostLikely;