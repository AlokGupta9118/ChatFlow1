// components/AdvancedCompatibilityGame.jsx
import React, { useState, useEffect, useRef } from 'react';
import { AdvancedCompatibilityGame } from '../games/compatibilityGame';
import './AdvancedCompatibilityGame.css' 

const AdvancedCompatibilityGameComponent = ({ socket, room, player, onExit }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [progress, setProgress] = useState(0);
  const [gameState, setGameState] = useState('waiting'); // waiting, playing, results
  const [compatibilityResult, setCompatibilityResult] = useState(null);
  const [otherPlayers, setOtherPlayers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  const chatContainerRef = useRef(null);
  const allQuestions = AdvancedCompatibilityGame.getAllQuestions();

  useEffect(() => {
    if (!socket) return;

    // Socket event listeners
    socket.on('game-state-update', handleGameStateUpdate);
    socket.on('player-progress', handlePlayerProgress);
    socket.on('show-results', handleShowResults);
    socket.on('answers-update', handleAnswersUpdate);
    socket.on('receive-chat-message', handleChatMessage);
    socket.on('chat-history', handleChatHistory);
    socket.on('user-typing', handleUserTyping);

    return () => {
      socket.off('game-state-update', handleGameStateUpdate);
      socket.off('player-progress', handlePlayerProgress);
      socket.off('show-results', handleShowResults);
      socket.off('answers-update', handleAnswersUpdate);
      socket.off('receive-chat-message', handleChatMessage);
      socket.off('chat-history', handleChatHistory);
      socket.off('user-typing', handleUserTyping);
    };
  }, [socket]);

  useEffect(() => {
    // Initialize answers structure
    const initialAnswers = {};
    Object.keys(AdvancedCompatibilityGame.categories).forEach(category => {
      initialAnswers[category] = Array(AdvancedCompatibilityGame.categories[category].questions.length).fill(null);
    });
    setAnswers(initialAnswers);
  }, []);

  useEffect(() => {
    updateProgress();
  }, [answers]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleGameStateUpdate = (state) => {
    setGameState(state.gameStarted ? 'playing' : 'waiting');
    if (state.currentQuestion) setCurrentQuestion(state.currentQuestion);
  };

  const handlePlayerProgress = (data) => {
    setOtherPlayers(prev => 
      prev.map(p => p.name === data.player ? { ...p, progress: data.progress } : p)
    );
  };

  const handleShowResults = (allAnswers) => {
    setGameState('results');
    calculateCompatibility(allAnswers);
  };

  const handleAnswersUpdate = (data) => {
    console.log(`Answers update: ${data.answered}/${data.total} players submitted`);
  };

  const handleChatMessage = (message) => {
    setChatMessages(prev => [...prev, message]);
  };

  const handleChatHistory = (messages) => {
    setChatMessages(messages);
  };

  const handleUserTyping = (data) => {
    if (data.isTyping) {
      setTypingUsers(prev => [...prev.filter(u => u !== data.userName), data.userName]);
    } else {
      setTypingUsers(prev => prev.filter(u => u !== data.userName));
    }
  };

  const updateProgress = () => {
    const totalQuestions = allQuestions.length;
    const answeredQuestions = Object.values(answers).flat().filter(answer => answer !== null).length;
    const newProgress = Math.round((answeredQuestions / totalQuestions) * 100);
    setProgress(newProgress);

    // Send progress update to other players
    if (socket && room) {
      socket.emit('player-progress', { roomId: room.roomId, progress: newProgress });
    }
  };

  const handleAnswerSelect = (category, questionIndex, answer) => {
    const newAnswers = { ...answers };
    newAnswers[category][questionIndex] = answer;
    setAnswers(newAnswers);

    // Auto-advance to next question after short delay
    setTimeout(() => {
      if (currentQuestion < allQuestions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
      }
    }, 500);
  };

  const submitAnswers = () => {
    if (socket && room && player) {
      socket.emit('submit-answers', {
        roomId: room.roomId,
        player: player,
        answers: answers
      });
    }
  };

  const calculateCompatibility = (allAnswers) => {
    const otherPlayerName = Object.keys(allAnswers).find(name => name !== player.name);
    if (otherPlayerName) {
      const result = AdvancedCompatibilityGame.generateCompatibilityReport(
        answers,
        allAnswers[otherPlayerName],
        player.name,
        otherPlayerName
      );
      setCompatibilityResult(result);
    }
  };

  const sendChatMessage = (content) => {
    if (socket && room && player) {
      socket.emit('send-chat-message', {
        roomId: room.roomId,
        message: {
          sender: player.name,
          content: content,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  const handleTyping = (isTyping) => {
    if (socket && room) {
      socket.emit('typing', { roomId: room.roomId, isTyping });
    }
  };

  const startGame = () => {
    if (socket && room) {
      socket.emit('start-game', { roomId: room.roomId });
    }
  };

  const currentQuestionData = allQuestions[currentQuestion];
  const currentCategory = Object.keys(AdvancedCompatibilityGame.categories).find(
    cat => AdvancedCompatibilityGame.categories[cat].questions.some(q => q.id === currentQuestionData.id)
  );

  if (gameState === 'waiting') {
    return (
      <div className="compatibility-game waiting-room">
        <div className="waiting-header">
          <h1>Advanced Compatibility Test</h1>
          <p>Room: {room?.roomId}</p>
        </div>
        
        <div className="players-list">
          <h3>Players in Room:</h3>
          {room?.players.map(p => (
            <div key={p.name} className="player-waiting">
              <span className="player-name">{p.name}</span>
              {p.isHost && <span className="host-badge">Host</span>}
            </div>
          ))}
        </div>

        {player?.isHost && room?.players.length >= 2 && (
          <button className="start-game-btn" onClick={startGame}>
            Start Compatibility Test
          </button>
        )}

        {player?.isHost && room?.players.length < 2 && (
          <p className="waiting-message">Waiting for another player to join...</p>
        )}

        <ChatSection
          messages={chatMessages}
          onSendMessage={sendChatMessage}
          onTyping={handleTyping}
          typingUsers={typingUsers}
          currentUser={player?.name}
        />
      </div>
    );
  }

  if (gameState === 'results' && compatibilityResult) {
    return (
      <div className="compatibility-game results-screen">
        <div className="results-header">
          <h1>Compatibility Results</h1>
          <div className="overall-score">
            <div className="score-circle">
              <span className="score-number">{compatibilityResult.overallScore}%</span>
            </div>
            <p className="relationship-type">{compatibilityResult.relationshipType}</p>
          </div>
        </div>

        <div className="category-scores">
          <h3>Category Breakdown</h3>
          <div className="scores-grid">
            {Object.entries(compatibilityResult.categoryScores).map(([category, score]) => (
              <div key={category} className="category-score">
                <span className="category-name">
                  {AdvancedCompatibilityGame.categories[category].name}
                </span>
                <div className="score-bar">
                  <div 
                    className="score-fill" 
                    style={{ width: `${score}%` }}
                  ></div>
                </div>
                <span className="score-value">{score}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="strengths-growth">
          <div className="strengths">
            <h4>🌟 Strengths</h4>
            {compatibilityResult.strengths.map((strength, index) => (
              <p key={index}>{strength}</p>
            ))}
          </div>
          
          <div className="growth-areas">
            <h4>🌱 Growth Areas</h4>
            {compatibilityResult.growthAreas.map((area, index) => (
              <p key={index}>{area}</p>
            ))}
          </div>
        </div>

        <div className="fun-facts">
          <h4>💫 Fun Facts</h4>
          {compatibilityResult.funFacts.map((fact, index) => (
            <p key={index}>{fact}</p>
          ))}
        </div>

        <div className="advice">
          <h4>💡 Advice</h4>
          <p>{compatibilityResult.advice}</p>
        </div>

        <ChatSection
          messages={chatMessages}
          onSendMessage={sendChatMessage}
          onTyping={handleTyping}
          typingUsers={typingUsers}
          currentUser={player?.name}
        />

        <button className="exit-btn" onClick={onExit}>
          Exit Game
        </button>
      </div>
    );
  }

  return (
    <div className="compatibility-game playing-screen">
      <div className="game-header">
        <div className="progress-section">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="progress-text">{progress}% Complete</span>
        </div>
        
        <div className="question-counter">
          Question {currentQuestion + 1} of {allQuestions.length}
        </div>
      </div>

      <div className="question-section">
        <div className="category-indicator">
          <span className="category-icon">{currentQuestionData.image}</span>
          <span className="category-name">
            {AdvancedCompatibilityGame.categories[currentCategory].name}
          </span>
        </div>

        <h2 className="question-text">{currentQuestionData.question}</h2>

        <div className="options-grid">
          {currentQuestionData.options.map((option, index) => (
            <button
              key={index}
              className={`option-btn ${
                answers[currentCategory]?.[currentQuestionData.id - 1] === option.value ? 'selected' : ''
              }`}
              onClick={() => handleAnswerSelect(
                currentCategory, 
                currentQuestionData.id - 1, 
                option.value
              )}
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>

      <div className="navigation-section">
        <button
          className="nav-btn prev-btn"
          onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
        >
          Previous
        </button>

        {progress === 100 && (
          <button className="submit-btn" onClick={submitAnswers}>
            Submit Answers
          </button>
        )}

        <button
          className="nav-btn next-btn"
          onClick={() => setCurrentQuestion(prev => Math.min(allQuestions.length - 1, prev + 1))}
          disabled={currentQuestion === allQuestions.length - 1}
        >
          Next
        </button>
      </div>

      <ChatSection
        messages={chatMessages}
        onSendMessage={sendChatMessage}
        onTyping={handleTyping}
        typingUsers={typingUsers}
        currentUser={player?.name}
      />
    </div>
  );
};

const ChatSection = ({ messages, onSendMessage, onTyping, typingUsers, currentUser }) => {
  const [message, setMessage] = useState('');
  const chatContainerRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      onTyping(false);
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    onTyping(true);
    // Debounce typing end
    clearTimeout(window.typingTimer);
    window.typingTimer = setTimeout(() => onTyping(false), 1000);
  };

  return (
    <div className="chat-section">
      <h4>Game Chat</h4>
      <div className="chat-messages" ref={chatContainerRef}>
        {messages.map(msg => (
          <div key={msg.id} className={`chat-message ${msg.sender === currentUser ? 'own-message' : ''}`}>
            <span className="sender">{msg.sender}:</span>
            <span className="content">{msg.content}</span>
            <span className="timestamp">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={message}
          onChange={handleInputChange}
          placeholder="Type your message..."
          className="chat-input"
        />
        <button type="submit" className="send-btn">Send</button>
      </form>
    </div>
  );
};

export default AdvancedCompatibilityGameComponent;