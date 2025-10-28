// components/games/CompatibilityQuiz.jsx
import React, { useState } from 'react';
import { useGameSocket } from '../../hooks/useGameSocket';

const CompatibilityQuiz = ({ roomCode, playerName }) => {
  const {
    gameState,
    players,
    chatMessages,
    isConnected,
    sendChatMessage,
    submitCompatibilityAnswers
  } = useGameSocket();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedOption, setSelectedOption] = useState(null);

  const questions = gameState?.gameData?.questions || [];
  const currentQ = questions[currentQuestion];
  const isHost = players.find(p => p.socketId === gameState?.socketId)?.isHost;
  const hasSubmitted = players.find(p => p.socketId === gameState?.socketId)?.isReady;

  const handleAnswerSelect = (questionIndex, option) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: option
    }));
    setSelectedOption(option);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedOption(answers[currentQuestion + 1] || null);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setSelectedOption(answers[currentQuestion - 1] || null);
    }
  };

  const handleSubmitQuiz = () => {
    if (Object.keys(answers).length === questions.length) {
      submitCompatibilityAnswers(roomCode, answers);
    }
  };

  const calculateProgress = () => {
    return ((Object.keys(answers).length / questions.length) * 100);
  };

  if (gameState?.gameData?.results) {
    return (
      <ResultsView 
        results={gameState.gameData.results}
        players={players}
        roomCode={roomCode}
        sendChatMessage={sendChatMessage}
        chatMessages={chatMessages}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 to-red-500 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Players Sidebar */}
          <div className="lg:col-span-1 bg-white/10 rounded-2xl p-6 backdrop-blur-lg border border-white/20">
            <h3 className="text-xl font-bold mb-4">Players ({players.length})</h3>
            <div className="space-y-3">
              {players.map(player => (
                <div key={player.socketId} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="font-medium">{player.name}</span>
                  </div>
                  {player.isReady && (
                    <div className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                      Completed
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Progress */}
            <div className="mt-6 p-4 bg-white/5 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{Object.keys(answers).length}/{questions.length}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-white h-2 rounded-full transition-all duration-500"
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Main Quiz Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-lg border border-white/20 text-center">
              <h1 className="text-4xl font-bold mb-2">Compatibility Quiz</h1>
              <p className="text-white/80 text-lg">Discover how well you match with friends!</p>
              <div className="flex justify-center space-x-6 mt-4 text-sm">
                <span>Room: <strong>{roomCode}</strong></span>
                <span>Question: <strong>{currentQuestion + 1}/{questions.length}</strong></span>
              </div>
            </div>

            {/* Question Card */}
            {currentQ && (
              <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-lg border border-white/20">
                <div className="text-center mb-2">
                  <span className="text-white/60 text-sm">Question {currentQuestion + 1}</span>
                  <h2 className="text-2xl font-bold mt-1 mb-6">{currentQ.question}</h2>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {currentQ.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(currentQuestion, option)}
                      className={`p-4 rounded-xl text-left transition-all border-2 ${
                        answers[currentQuestion] === option
                          ? 'bg-white/20 border-white scale-105'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          answers[currentQuestion] === option 
                            ? 'border-white bg-white' 
                            : 'border-white/40'
                        }`}>
                          {answers[currentQuestion] === option && (
                            <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                          )}
                        </div>
                        <span className="font-medium text-lg">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestion === 0}
                    className={`px-6 py-3 rounded-lg font-medium ${
                      currentQuestion === 0
                        ? 'bg-white/10 text-white/40 cursor-not-allowed'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    ← Previous
                  </button>

                  <div className="flex space-x-2">
                    {questions.map((_, index) => (
                      <div
                        key={index}
                        className={`w-3 h-3 rounded-full cursor-pointer ${
                          answers[index] 
                            ? 'bg-white' 
                            : index === currentQuestion 
                            ? 'bg-white/60' 
                            : 'bg-white/30'
                        }`}
                        onClick={() => {
                          setCurrentQuestion(index);
                          setSelectedOption(answers[index] || null);
                        }}
                      />
                    ))}
                  </div>

                  {currentQuestion < questions.length - 1 ? (
                    <button
                      onClick={handleNextQuestion}
                      disabled={!answers[currentQuestion]}
                      className={`px-6 py-3 rounded-lg font-medium ${
                        !answers[currentQuestion]
                          ? 'bg-white/10 text-white/40 cursor-not-allowed'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={Object.keys(answers).length !== questions.length}
                      className={`px-8 py-3 rounded-lg font-bold text-lg ${
                        Object.keys(answers).length !== questions.length
                          ? 'bg-white/10 text-white/40 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:scale-105 transition-transform'
                      }`}
                    >
                      Submit Quiz 🎯
                    </button>
                  )}
                </div>
              </div>
            )}

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
            <h3 className="text-xl font-bold mb-4">How It Works</h3>
            <div className="space-y-4 text-sm text-white/80">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                <p>Answer all questions honestly about your preferences</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <p>See compatibility percentages with other players</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <p>Discover your most compatible friends!</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
              <h4 className="font-bold text-yellow-300 mb-2">💡 Tip</h4>
              <p className="text-yellow-200/80 text-sm">Be honest! The more truthful your answers, the more accurate your compatibility results will be.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Results Component
const ResultsView = ({ results, players, roomCode, sendChatMessage, chatMessages }) => {
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4">Compatibility Results</h1>
          <p className="text-xl text-white/80">Discover your perfect matches!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Player Matches */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-lg border border-white/20">
              <h2 className="text-2xl font-bold mb-6">Your Top Matches</h2>
              <div className="space-y-4">
                {Object.entries(results || {})
                  .sort(([,a], [,b]) => b.percentage - a.percentage)
                  .slice(0, 5)
                  .map(([playerId, match], index) => {
                    const player = players.find(p => p.socketId === playerId);
                    if (!player) return null;
                    
                    return (
                      <div 
                        key={playerId}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => setSelectedPlayer(playerId)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{player.name}</h3>
                            <p className="text-white/60 text-sm">{match.commonAnswers} common answers</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-400">
                            {match.percentage}%
                          </div>
                          <div className="text-xs text-white/60">compatibility</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Detailed Analysis */}
            {selectedPlayer && (
              <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-lg border border-white/20">
                <h3 className="text-xl font-bold mb-4">
                  Compatibility with {players.find(p => p.socketId === selectedPlayer)?.name}
                </h3>
                <div className="space-y-3">
                  {(results[selectedPlayer]?.details || []).map((detail, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="flex-1">{detail.question}</span>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-green-400">✓ Match</span>
                        <span className="text-white/60">{detail.similarity}% similar</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat & Players */}
          <div className="space-y-6">
            <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-lg border border-white/20">
              <h3 className="text-xl font-bold mb-4">All Players</h3>
              <div className="space-y-3">
                {players.map(player => (
                  <div key={player.socketId} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="font-medium">{player.name}</span>
                    <div className="text-sm text-white/60">Completed</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-lg border border-white/20">
              <ChatSection 
                chatMessages={chatMessages}
                sendChatMessage={sendChatMessage}
                roomCode={roomCode}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Chat Component
const ChatSection = ({ chatMessages, sendChatMessage, roomCode }) => {
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    if (message.trim()) {
      sendChatMessage(roomCode, message);
      setMessage('');
    }
  };

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Game Chat</h3>
      <div className="h-64 overflow-y-auto mb-4 space-y-2">
        {chatMessages.map((msg, index) => (
          <div key={index} className={`p-3 rounded-lg ${
            msg.type === 'system' 
              ? 'bg-yellow-500/20 border border-yellow-500/30' 
              : 'bg-white/5'
          }`}>
            <div className="flex justify-between items-start mb-1">
              <span className="font-bold text-white/90">{msg.player}</span>
              <span className="text-xs text-white/60">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-white/80 text-sm">{msg.message}</p>
          </div>
        ))}
      </div>
      <div className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type your message..."
          className="flex-1 p-3 rounded-lg bg-black/20 border border-white/20 text-white placeholder-white/50"
        />
        <button
          onClick={handleSendMessage}
          className="bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-3 rounded-lg hover:scale-105 transition-transform"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default CompatibilityQuiz;