// components/games/WouldYouRather.jsx
import React, { useState } from 'react';
import { useGameSocket } from '../../hooks/useGameSocket';

const WouldYouRather = ({ roomCode, playerName }) => {
  const {
    gameState,
    players,
    chatMessages,
    isConnected,
    sendChatMessage,
    submitWouldYouRatherChoice
  } = useGameSocket();

  const [selectedChoice, setSelectedChoice] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const questions = gameState?.gameData?.questions || [];
  const currentQuestionIndex = gameState?.gameData?.currentQuestion || 0;
  const currentQuestion = questions[currentQuestionIndex];
  const isHost = players.find(p => p.socketId === gameState?.socketId)?.isHost;
  const hasVoted = gameState?.gameData?.choices?.has(gameState?.socketId);

  const handleChoiceSelect = (choice) => {
    setSelectedChoice(choice);
    submitWouldYouRatherChoice(roomCode, currentQuestionIndex, choice);
  };

  const handleNextQuestion = () => {
    setSelectedChoice(null);
    setShowResults(false);
    // Socket event for next question
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
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Players Sidebar */}
          <div className="lg:col-span-1 bg-white/10 rounded-2xl p-6 backdrop-blur-lg border border-white/20">
            <h3 className="text-xl font-bold mb-4">Players ({players.length})</h3>
            <div className="space-y-3">
              {players.map(player => (
                <div key={player.socketId} className={`p-3 rounded-lg flex items-center justify-between ${
                  selectedChoice && gameState?.gameData?.choices?.get(player.socketId) === selectedChoice 
                    ? 'bg-blue-500/20 border border-blue-500' 
                    : 'bg-white/5'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      player.connected ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="font-medium">{player.name}</span>
                  </div>
                  {gameState?.gameData?.choices?.has(player.socketId) && (
                    <div className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                      Voted
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Voting Progress */}
            <div className="mt-6 p-4 bg-white/5 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span>Voting Progress</span>
                <span>{Object.keys(gameState?.gameData?.choices || {}).length}/{players.length}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(Object.keys(gameState?.gameData?.choices || {}).length / players.length) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Main Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-lg border border-white/20 text-center">
              <h1 className="text-4xl font-bold mb-2">Would You Rather...</h1>
              <p className="text-white/80 text-lg">Make the tough choices and see what others pick!</p>
              <div className="flex justify-center space-x-6 mt-4 text-sm">
                <span>Room: <strong>{roomCode}</strong></span>
                <span>Question: <strong>{currentQuestionIndex + 1}/{questions.length}</strong></span>
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-lg border border-white/20">
              <div className="text-center mb-2">
                <span className="text-white/60 text-sm">Question {currentQuestionIndex + 1}</span>
              </div>

              {/* Choices Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {['optionA', 'optionB'].map((option, index) => (
                  <button
                    key={option}
                    onClick={() => handleChoiceSelect(option)}
                    disabled={hasVoted}
                    className={`p-8 rounded-2xl text-center transition-all border-4 ${
                      selectedChoice === option
                        ? option === 'optionA' 
                          ? 'bg-red-500/20 border-red-500 scale-105' 
                          : 'bg-blue-500/20 border-blue-500 scale-105'
                        : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                    } ${hasVoted && selectedChoice !== option ? 'opacity-50' : ''}`}
                  >
                    <div className="text-6xl mb-4">
                      {option === 'optionA' ? '🔴' : '🔵'}
                    </div>
                    <h3 className="text-2xl font-bold mb-4">
                      {currentQuestion?.[option]}
                    </h3>
                    {selectedChoice === option && (
                      <div className="text-green-400 font-bold text-lg">✓ Selected</div>
                    )}
                  </button>
                ))}
              </div>

              {/* Results Button */}
              {isHost && Object.keys(gameState?.gameData?.choices || {}).length === players.length && (
                <div className="text-center">
                  <button
                    onClick={handleShowResults}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-4 rounded-xl text-xl font-bold hover:scale-105 transition-transform"
                  >
                    Show Results 🎯
                  </button>
                </div>
              )}

              {/* Waiting Message */}
              {hasVoted && Object.keys(gameState?.gameData?.choices || {}).length < players.length && (
                <div className="text-center py-4">
                  <div className="text-2xl mb-2">⏳</div>
                  <p className="text-white/80">Waiting for other players to choose...</p>
                </div>
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
                <p>Read both options carefully</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <p>Choose the option you'd rather do</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <p>See what everyone else chose and discuss!</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
              <h4 className="font-bold text-yellow-300 mb-2">💭 Think About It</h4>
              <p className="text-yellow-200/80 text-sm">There are no right or wrong answers - just interesting choices and great conversations!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Results Component
const ResultsView = ({ results, currentQuestion, players, onNextQuestion, isHost }) => {
  const optionACount = Object.values(results || {}).filter(choice => choice === 'optionA').length;
  const optionBCount = Object.values(results || {}).filter(choice => choice === 'optionB').length;
  const totalVotes = optionACount + optionBCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Results! 📊</h1>
            <p className="text-xl text-white/80">Here's what everyone chose:</p>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Option A */}
            <div className={`p-8 rounded-2xl border-4 ${
              optionACount > optionBCount 
                ? 'bg-red-500/20 border-red-500' 
                : 'bg-white/10 border-white/20'
            }`}>
              <div className="text-6xl mb-4 text-center">🔴</div>
              <h3 className="text-2xl font-bold mb-4 text-center">{currentQuestion?.optionA}</h3>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">{optionACount}</div>
                <div className="text-white/80">votes</div>
                <div className="text-2xl font-bold mt-2">
                  {totalVotes > 0 ? ((optionACount / totalVotes) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>

            {/* Option B */}
            <div className={`p-8 rounded-2xl border-4 ${
              optionBCount > optionACount 
                ? 'bg-blue-500/20 border-blue-500' 
                : 'bg-white/10 border-white/20'
            }`}>
              <div className="text-6xl mb-4 text-center">🔵</div>
              <h3 className="text-2xl font-bold mb-4 text-center">{currentQuestion?.optionB}</h3>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">{optionBCount}</div>
                <div className="text-white/80">votes</div>
                <div className="text-2xl font-bold mt-2">
                  {totalVotes > 0 ? ((optionBCount / totalVotes) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Player Choices */}
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-lg border border-white/20 mb-8">
            <h3 className="text-xl font-bold mb-4">Who Chose What</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-red-400 mb-3">Option A 🔴</h4>
                <div className="space-y-2">
                  {players.filter(player => results?.[player.socketId] === 'optionA').map(player => (
                    <div key={player.socketId} className="p-2 bg-red-500/10 rounded-lg">
                      {player.name}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-blue-400 mb-3">Option B 🔵</h4>
                <div className="space-y-2">
                  {players.filter(player => results?.[player.socketId] === 'optionB').map(player => (
                    <div key={player.socketId} className="p-2 bg-blue-500/10 rounded-lg">
                      {player.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

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

export default WouldYouRather;