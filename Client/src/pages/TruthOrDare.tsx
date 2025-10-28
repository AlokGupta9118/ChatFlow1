import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const TruthOrDareGame = ({ roomCode, player, onLeaveGame }) => {
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState('waiting');
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedOption, setSelectedOption] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [proofRequired, setProofRequired] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [spinnerPlayers, setSpinnerPlayers] = useState([]);
  const [votingData, setVotingData] = useState(null);
  const [gameResults, setGameResults] = useState(null);
  const [confessions, setConfessions] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [truthAnswer, setTruthAnswer] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [votes, setVotes] = useState({});
  
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    setSocket(newSocket);

    // Game event listeners
    newSocket.on('gameStarted', handleGameStarted);
    newSocket.on('spinnerStart', handleSpinnerStart);
    newSocket.on('playerSelected', handlePlayerSelected);
    newSocket.on('chooseOption', handleChooseOption);
    newSocket.on('optionChosen', handleOptionChosen);
    newSocket.on('truthRevealed', handleTruthRevealed);
    newSocket.on('dareProofReceived', handleDareProofReceived);
    newSocket.on('votingStarted', handleVotingStarted);
    newSocket.on('voteReceived', handleVoteReceived);
    newSocket.on('votingResults', handleVotingResults);
    newSocket.on('roundTimeWarning', handleRoundTimeWarning);
    newSocket.on('timeout', handleTimeout);
    newSocket.on('gameEnded', handleGameEnded);
    newSocket.on('gamePaused', handleGamePaused);
    newSocket.on('gameResumed', handleGameResumed);
    newSocket.on('playerJoined', handlePlayerJoined);
    newSocket.on('playerLeft', handlePlayerLeft);
    newSocket.on('chatMessage', handleChatMessage);
    newSocket.on('playersUpdate', handlePlayersUpdate);

    // Join room
    newSocket.emit('joinRoom', {
      roomCode,
      player: {
        id: newSocket.id,
        name: player.name,
        avatar: player.avatar,
        isHost: player.isHost
      }
    });

    return () => {
      newSocket.disconnect();
      clearTimer();
    };
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = (duration) => {
    clearTimer();
    setTimeLeft(duration);
    setTimerActive(true);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Event Handlers
  const handleGameStarted = (data) => {
    setGameState('playing');
    setCurrentPlayer(data.currentPlayer);
    setCurrentRound(data.round);
  };

  const handleSpinnerStart = (data) => {
    setShowSpinner(true);
    setSpinnerPlayers(data.players);
  };

  const handlePlayerSelected = (data) => {
    setShowSpinner(false);
    setCurrentPlayer(data.player);
    setCurrentRound(data.round);
  };

  const handleChooseOption = (data) => {
    setSelectedOption(null);
    startTimer(data.timeout / 1000);
  };

  const handleOptionChosen = (data) => {
    setSelectedOption(data.choice);
    setCurrentQuestion(data.question);
    setProofRequired(data.proofRequired);
    
    if (data.choice === 'truth') {
      startTimer(30);
    } else {
      startTimer(60);
    }
  };

  const handleTruthRevealed = (data) => {
    setConfessions(prev => [...prev, {
      player: data.player,
      confession: data.confession,
      type: 'truth',
      timestamp: new Date(),
      score: data.score
    }]);
    setSelectedOption(null);
    setProofRequired(false);
    setTruthAnswer('');
  };

  const handleDareProofReceived = (data) => {
    setConfessions(prev => [...prev, {
      player: data.player,
      proof: data.proof,
      type: 'dare',
      timestamp: new Date(),
      score: data.score
    }]);
    setProofFile(null);
    setProofPreview('');
  };

  const handleVotingStarted = (data) => {
    setVotingData({
      playerId: data.playerId,
      question: data.question,
      duration: data.duration
    });
    setVotes({});
    startTimer(data.duration / 1000);
  };

  const handleVoteReceived = (data) => {
    setVotes(prev => ({
      ...prev,
      total: data.totalPlayers,
      current: data.votesCount
    }));
  };

  const handleVotingResults = (data) => {
    setVotingData(null);
    // Show results temporarily
    setTimeout(() => {
      // Auto proceed after showing results
    }, 5000);
  };

  const handleGameEnded = (data) => {
    setGameState('completed');
    setGameResults(data.results);
    setConfessions(data.confessions || []);
  };

  const handlePlayersUpdate = (data) => {
    setPlayers(data.players);
  };

  const handleChatMessage = (data) => {
    setChatMessages(prev => [...prev, data]);
  };

  // Action Handlers
  const handleStartGame = () => {
    socket.emit('startGame', { roomCode });
  };

  const handleOptionSelect = (choice) => {
    socket.emit('chooseOption', { roomCode, choice });
    setSelectedOption(choice);
  };

  const handleSubmitTruth = () => {
    if (truthAnswer.trim()) {
      socket.emit('submitTruth', { roomCode, confession: truthAnswer });
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setProofPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProof = () => {
    if (proofFile) {
      // Convert file to base64 for demo (in real app, upload to cloud storage)
      const reader = new FileReader();
      reader.onload = (e) => {
        socket.emit('submitDareProof', { 
          roomCode, 
          proof: e.target.result 
        });
      };
      reader.readAsDataURL(proofFile);
    }
  };

  const handleVote = (vote) => {
    socket.emit('castVote', { 
      roomCode, 
      targetPlayerId: votingData.playerId, 
      vote 
    });
  };

  const handleNextRound = () => {
    socket.emit('nextRound', { roomCode });
  };

  const handleSendMessage = (message) => {
    if (message.trim()) {
      socket.emit('sendChatMessage', { 
        roomCode, 
        message,
        playerName: player.name
      });
    }
  };

  const isCurrentPlayer = currentPlayer && currentPlayer.id === socket?.id;
  const isHost = player.isHost;

  // Component Styles
  const styles = {
    container: {
      display: 'flex',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    },
    sidebar: {
      width: '300px',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      padding: '20px',
      borderRight: '1px solid rgba(255, 255, 255, 0.2)'
    },
    mainContent: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px'
    },
    playerCard: {
      background: 'rgba(255, 255, 255, 0.9)',
      borderRadius: '15px',
      padding: '15px',
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
    },
    gameArea: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '20px',
      margin: '10px',
      padding: '30px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
    },
    button: {
      background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
      border: 'none',
      borderRadius: '25px',
      padding: '12px 30px',
      color: 'white',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      margin: '5px',
      transition: 'all 0.3s ease'
    },
    optionButton: {
      background: 'linear-gradient(45deg, #667eea, #764ba2)',
      border: 'none',
      borderRadius: '20px',
      padding: '15px 40px',
      color: 'white',
      fontSize: '18px',
      fontWeight: 'bold',
      cursor: 'pointer',
      margin: '10px',
      transition: 'all 0.3s ease'
    },
    timer: {
      fontSize: '48px',
      fontWeight: 'bold',
      color: '#FF6B6B',
      margin: '20px 0'
    },
    question: {
      fontSize: '24px',
      textAlign: 'center',
      margin: '20px 0',
      color: '#333'
    },
    spinner: {
      width: '200px',
      height: '200px',
      border: '10px solid #f3f3f3',
      borderTop: '10px solid #667eea',
      borderRadius: '50%',
      animation: 'spin 2s linear infinite'
    }
  };

  // Spinner Animation
  const spinnerStyle = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  // Render different game states
  const renderWaitingRoom = () => (
    <div style={styles.gameArea}>
      <h1>Waiting Room - {roomCode}</h1>
      <h2>Players ({players.length})</h2>
      <div style={{width: '100%', maxWidth: '400px'}}>
        {players.map(p => (
          <div key={p.socketId} style={styles.playerCard}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              marginRight: '15px'
            }}>
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{fontWeight: 'bold'}}>{p.name}</div>
              <div style={{fontSize: '12px', color: '#666'}}>
                {p.isHost ? 'Host' : 'Player'} {p.isReady ? '✓ Ready' : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
      {isHost && (
        <button 
          style={styles.button}
          onClick={handleStartGame}
          disabled={players.length < 2}
        >
          Start Game ({players.length}/8)
        </button>
      )}
    </div>
  );

  const renderSpinner = () => (
    <div style={styles.gameArea}>
      <style>{spinnerStyle}</style>
      <div style={styles.spinner}></div>
      <h2>Selecting Player...</h2>
      <p>Get ready for the next round!</p>
    </div>
  );

  const renderOptionChoice = () => (
    <div style={styles.gameArea}>
      <h1>Your Turn!</h1>
      <div style={styles.timer}>{timeLeft}s</div>
      <h2>Choose Your Fate</h2>
      <div>
        <button 
          style={styles.optionButton}
          onClick={() => handleOptionSelect('truth')}
        >
          📖 TRUTH
        </button>
        <button 
          style={styles.optionButton}
          onClick={() => handleOptionSelect('dare')}
        >
          ⚡ DARE
        </button>
      </div>
    </div>
  );

  const renderTruthInput = () => (
    <div style={styles.gameArea}>
      <h1>TRUTH</h1>
      <div style={styles.timer}>{timeLeft}s</div>
      <div style={styles.question}>{currentQuestion}</div>
      <textarea
        value={truthAnswer}
        onChange={(e) => setTruthAnswer(e.target.value)}
        placeholder="Type your confession here..."
        style={{
          width: '80%',
          height: '150px',
          padding: '15px',
          borderRadius: '15px',
          border: '2px solid #ddd',
          fontSize: '16px',
          margin: '20px 0'
        }}
      />
      <button 
        style={styles.button}
        onClick={handleSubmitTruth}
        disabled={!truthAnswer.trim()}
      >
        Submit Confession
      </button>
    </div>
  );

  const renderDareProof = () => (
    <div style={styles.gameArea}>
      <h1>DARE</h1>
      <div style={styles.timer}>{timeLeft}s</div>
      <div style={styles.question}>{currentQuestion}</div>
      
      {!proofPreview ? (
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,video/*"
            style={{ display: 'none' }}
          />
          <button 
            style={styles.button}
            onClick={() => fileInputRef.current?.click()}
          >
            📸 Upload Proof (Photo/Video)
          </button>
          <p style={{color: '#666', marginTop: '10px'}}>
            Take a photo or video as proof of completing the dare!
          </p>
        </div>
      ) : (
        <div>
          <div style={{
            maxWidth: '400px',
            maxHeight: '300px',
            borderRadius: '15px',
            overflow: 'hidden',
            margin: '20px 0'
          }}>
            <img 
              src={proofPreview} 
              alt="Proof" 
              style={{width: '100%', height: 'auto'}}
            />
          </div>
          <button 
            style={styles.button}
            onClick={handleSubmitProof}
          >
            Submit Proof
          </button>
          <button 
            style={{...styles.button, background: '#666'}}
            onClick={() => {
              setProofFile(null);
              setProofPreview('');
            }}
          >
            Retake
          </button>
        </div>
      )}
    </div>
  );

  const renderVoting = () => (
    <div style={styles.gameArea}>
      <h1>Vote Now!</h1>
      <div style={styles.timer}>{timeLeft}s</div>
      <h2>{votingData.question}</h2>
      <p>Player: {players.find(p => p.socketId === votingData.playerId)?.name}</p>
      
      <div style={{margin: '20px 0'}}>
        <button 
          style={{...styles.optionButton, background: 'linear-gradient(45deg, #4CAF50, #45a049)'}}
          onClick={() => handleVote('yes')}
        >
          👍 YES
        </button>
        <button 
          style={{...styles.optionButton, background: 'linear-gradient(45deg, #ff4444, #cc0000)'}}
          onClick={() => handleVote('no')}
        >
          👎 NO
        </button>
      </div>
      
      <div style={{color: '#666'}}>
        Votes: {votes.current || 0}/{votes.total || players.length - 1}
      </div>
    </div>
  );

  const renderGameResults = () => (
    <div style={styles.gameArea}>
      <h1>Game Over!</h1>
      <h2>Final Results</h2>
      <div style={{width: '100%', maxWidth: '500px'}}>
        {gameResults?.map((result, index) => (
          <div key={result.playerId} style={{
            ...styles.playerCard,
            background: index === 0 ? 'linear-gradient(45deg, #FFD700, #FFEC8B)' : 
                        index === 1 ? 'linear-gradient(45deg, #C0C0C0, #E8E8E8)' :
                        index === 2 ? 'linear-gradient(45deg, #CD7F32, #E8B88A)' : 
                        'rgba(255, 255, 255, 0.9)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              marginRight: '15px',
              fontSize: '18px'
            }}>
              {index + 1}
            </div>
            <div style={{flex: 1}}>
              <div style={{fontWeight: 'bold', fontSize: '18px'}}>{result.name}</div>
              <div style={{color: '#666'}}>Score: {result.score} points</div>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{marginTop: '30px'}}>
        <h3>Confessions Archive</h3>
        <div style={{maxHeight: '200px', overflowY: 'auto', width: '100%'}}>
          {confessions.map((conf, idx) => (
            <div key={idx} style={{
              background: 'rgba(0, 0, 0, 0.05)',
              padding: '10px',
              margin: '5px 0',
              borderRadius: '10px'
            }}>
              <strong>{conf.player.name}:</strong> {conf.confession || 'Completed dare!'}
              {conf.proof && <span> 📸</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderChat = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.9)',
      borderRadius: '15px',
      padding: '15px',
      marginTop: '20px',
      height: '200px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h4>Chat</h4>
      <div style={{flex: 1, overflowY: 'auto', marginBottom: '10px'}}>
        {chatMessages.map((msg, idx) => (
          <div key={idx} style={{margin: '5px 0'}}>
            <strong>{msg.playerName}:</strong> {msg.message}
          </div>
        ))}
      </div>
      <div style={{display: 'flex'}}>
        <input
          type="text"
          placeholder="Type a message..."
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage(e.target.value);
              e.target.value = '';
            }
          }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '20px',
            border: '1px solid #ddd',
            marginRight: '10px'
          }}
        />
        <button style={styles.button}>Send</button>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h2>Players ({players.length})</h2>
        {players.map(p => (
          <div key={p.socketId} style={{
            ...styles.playerCard,
            background: currentPlayer?.id === p.socketId ? 
              'linear-gradient(45deg, #667eea, #764ba2)' : 
              'rgba(255, 255, 255, 0.9)',
            color: currentPlayer?.id === p.socketId ? 'white' : 'inherit'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: currentPlayer?.id === p.socketId ? 
                'rgba(255, 255, 255, 0.3)' : 
                'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: currentPlayer?.id === p.socketId ? 'white' : 'white',
              fontWeight: 'bold',
              marginRight: '15px'
            }}>
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{fontWeight: 'bold'}}>{p.name}</div>
              <div style={{fontSize: '12px', opacity: 0.8}}>
                Score: {p.score || 0}
                {p.isHost && ' • Host'}
                {currentPlayer?.id === p.socketId && ' • Current'}
              </div>
            </div>
          </div>
        ))}
        
        {renderChat()}
      </div>

      <div style={styles.mainContent}>
        {/* Game Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px',
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '15px',
          marginBottom: '10px'
        }}>
          <h1>Truth or Dare - Round {currentRound}</h1>
          <div>
            <span style={{marginRight: '20px'}}>Room: {roomCode}</span>
            {isHost && gameState === 'playing' && (
              <button style={styles.button} onClick={handleNextRound}>
                Next Round
              </button>
            )}
          </div>
        </div>

        {/* Main Game Area */}
        {gameState === 'waiting' && renderWaitingRoom()}
        {gameState === 'playing' && showSpinner && renderSpinner()}
        {gameState === 'playing' && isCurrentPlayer && !selectedOption && renderOptionChoice()}
        {gameState === 'playing' && isCurrentPlayer && selectedOption === 'truth' && renderTruthInput()}
        {gameState === 'playing' && isCurrentPlayer && selectedOption === 'dare' && renderDareProof()}
        {gameState === 'playing' && votingData && renderVoting()}
        {gameState === 'completed' && renderGameResults()}

        {/* Current Player Info */}
        {currentPlayer && gameState === 'playing' && !isCurrentPlayer && !votingData && (
          <div style={styles.gameArea}>
            <h2>Waiting for {currentPlayer.name}</h2>
            <p>They are currently taking their turn...</p>
            {timerActive && <div style={styles.timer}>{timeLeft}s</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default TruthOrDareGame;