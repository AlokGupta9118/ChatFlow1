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
  const [notification, setNotification] = useState('');
  
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001');
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

  // Missing event handlers - ADD THESE
  const handleRoundTimeWarning = (data) => {
    showNotification(data.message || 'Round ending soon!');
  };

  const handleTimeout = (data) => {
    showNotification(data.message || 'Time is up!');
  };

  const handleGamePaused = () => {
    setGameState('paused');
    showNotification('Game paused by host');
  };

  const handleGameResumed = () => {
    setGameState('playing');
    showNotification('Game resumed');
  };

  const handlePlayerJoined = (data) => {
    showNotification(`${data.playerName} joined the game`);
  };

  const handlePlayerLeft = (data) => {
    showNotification(`${data.playerName} left the game`);
  };

  const showNotification = (message) => {
    setNotification(message);
    if (notificationRef.current) {
      clearTimeout(notificationRef.current);
    }
    notificationRef.current = setTimeout(() => {
      setNotification('');
    }, 3000);
  };

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

  // Existing event handlers
  const handleGameStarted = (data) => {
    setGameState('playing');
    setCurrentPlayer(data.currentPlayer);
    setCurrentRound(data.round);
    showNotification('Game started!');
  };

  const handleSpinnerStart = (data) => {
    setShowSpinner(true);
    setSpinnerPlayers(data.players);
  };

  const handlePlayerSelected = (data) => {
    setShowSpinner(false);
    setCurrentPlayer(data.player);
    setCurrentRound(data.round);
    showNotification(`${data.player.name}'s turn!`);
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
    
    showNotification(`${data.player.name} chose ${data.choice.toUpperCase()}!`);
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
    showNotification(`${data.player.name} revealed a truth! +${data.score - (players.find(p => p.socketId === data.player.id)?.score || 0)} points`);
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
    showNotification(`${data.player.name} submitted dare proof! +${data.score - (players.find(p => p.socketId === data.player.id)?.score || 0)} points`);
  };

  const handleVotingStarted = (data) => {
    setVotingData({
      playerId: data.playerId,
      question: data.question,
      duration: data.duration
    });
    setVotes({});
    startTimer(data.duration / 1000);
    showNotification('Voting started! Did they complete the dare?');
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
    const resultMsg = data.success ? 
      `Dare completed successfully! +10 points for ${data.playerName}` :
      `Dare failed! -5 points for ${data.playerName}`;
    showNotification(resultMsg);
  };

  const handleGameEnded = (data) => {
    setGameState('completed');
    setGameResults(data.results);
    setConfessions(data.confessions || []);
    showNotification('Game over! Check the results.');
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
      borderRight: '1px solid rgba(255, 255, 255, 0.2)',
      overflowY: 'auto'
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
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      textAlign: 'center'
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
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
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
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
    },
    timer: {
      fontSize: '48px',
      fontWeight: 'bold',
      color: '#FF6B6B',
      margin: '20px 0',
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)'
    },
    question: {
      fontSize: '24px',
      textAlign: 'center',
      margin: '20px 0',
      color: '#333',
      fontWeight: 'bold',
      lineHeight: '1.4'
    },
    spinner: {
      width: '200px',
      height: '200px',
      border: '10px solid #f3f3f3',
      borderTop: '10px solid #667eea',
      borderRadius: '50%',
      animation: 'spin 2s linear infinite'
    },
    notification: {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px 30px',
      borderRadius: '25px',
      zIndex: 1000,
      fontSize: '16px',
      fontWeight: 'bold'
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
      <h1 style={{color: '#333', marginBottom: '20px'}}>🎮 Waiting Room</h1>
      <h2 style={{color: '#666'}}>Room Code: <strong>{roomCode}</strong></h2>
      <div style={{width: '100%', maxWidth: '400px', margin: '20px 0'}}>
        <h3>Players ({players.length}/8)</h3>
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
            <div style={{flex: 1}}>
              <div style={{fontWeight: 'bold'}}>{p.name}</div>
              <div style={{fontSize: '12px', color: '#666'}}>
                {p.isHost ? '👑 Host' : '🎯 Player'} {p.isReady ? '✓ Ready' : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
      {isHost && (
        <button 
          style={{
            ...styles.button,
            opacity: players.length < 2 ? 0.6 : 1,
            cursor: players.length < 2 ? 'not-allowed' : 'pointer'
          }}
          onClick={handleStartGame}
          disabled={players.length < 2}
        >
          {players.length < 2 ? `Need ${2 - players.length} more players` : 'Start Game'}
        </button>
      )}
      {!isHost && (
        <p style={{color: '#666', fontStyle: 'italic'}}>
          Waiting for host to start the game...
        </p>
      )}
    </div>
  );

  const renderSpinner = () => (
    <div style={styles.gameArea}>
      <style>{spinnerStyle}</style>
      <div style={styles.spinner}></div>
      <h2 style={{color: '#333', marginTop: '20px'}}>Selecting Player...</h2>
      <p style={{color: '#666'}}>The wheel is spinning! Get ready for the next round!</p>
    </div>
  );

  const renderOptionChoice = () => (
    <div style={styles.gameArea}>
      <h1 style={{color: '#333'}}>🎯 Your Turn!</h1>
      <div style={styles.timer}>{timeLeft}s</div>
      <h2 style={{color: '#666', marginBottom: '30px'}}>Choose Your Fate</h2>
      <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center'}}>
        <button 
          style={{
            ...styles.optionButton,
            background: 'linear-gradient(45deg, #4CAF50, #45a049)',
            padding: '20px 50px',
            fontSize: '20px'
          }}
          onClick={() => handleOptionSelect('truth')}
        >
          📖 TRUTH
        </button>
        <button 
          style={{
            ...styles.optionButton,
            background: 'linear-gradient(45deg, #FF6B6B, #ff4444)',
            padding: '20px 50px',
            fontSize: '20px'
          }}
          onClick={() => handleOptionSelect('dare')}
        >
          ⚡ DARE
        </button>
      </div>
      <p style={{color: '#666', marginTop: '20px', fontStyle: 'italic'}}>
        Choose wisely! You have {timeLeft} seconds to decide.
      </p>
    </div>
  );

  const renderTruthInput = () => (
    <div style={styles.gameArea}>
      <h1 style={{color: '#4CAF50'}}>📖 TRUTH</h1>
      <div style={styles.timer}>{timeLeft}s</div>
      <div style={styles.question}>"{currentQuestion}"</div>
      <textarea
        value={truthAnswer}
        onChange={(e) => setTruthAnswer(e.target.value)}
        placeholder="Type your honest answer here... Don't hold back!"
        style={{
          width: '90%',
          height: '150px',
          padding: '15px',
          borderRadius: '15px',
          border: '2px solid #4CAF50',
          fontSize: '16px',
          margin: '20px 0',
          resize: 'vertical',
          fontFamily: 'inherit'
        }}
      />
      <button 
        style={{
          ...styles.button,
          background: 'linear-gradient(45deg, #4CAF50, #45a049)',
          opacity: !truthAnswer.trim() ? 0.6 : 1,
          cursor: !truthAnswer.trim() ? 'not-allowed' : 'pointer'
        }}
        onClick={handleSubmitTruth}
        disabled={!truthAnswer.trim()}
      >
        {!truthAnswer.trim() ? 'Write your confession first...' : 'Submit Confession 🎯'}
      </button>
    </div>
  );

  const renderDareProof = () => (
    <div style={styles.gameArea}>
      <h1 style={{color: '#FF6B6B'}}>⚡ DARE</h1>
      <div style={styles.timer}>{timeLeft}s</div>
      <div style={styles.question}>"{currentQuestion}"</div>
      
      {!proofPreview ? (
        <div style={{textAlign: 'center'}}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,video/*"
            style={{ display: 'none' }}
          />
          <button 
            style={{
              ...styles.button,
              background: 'linear-gradient(45deg, #FF6B6B, #ff4444)',
              padding: '15px 40px',
              fontSize: '18px'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            📸 Upload Proof (Photo/Video)
          </button>
          <p style={{color: '#666', marginTop: '15px', fontSize: '14px'}}>
            Take a photo or video as proof of completing the dare!<br/>
            Make it convincing - other players will vote on it!
          </p>
        </div>
      ) : (
        <div style={{textAlign: 'center'}}>
          <h3 style={{color: '#333', marginBottom: '15px'}}>Proof Preview:</h3>
          <div style={{
            maxWidth: '400px',
            maxHeight: '300px',
            borderRadius: '15px',
            overflow: 'hidden',
            margin: '20px auto',
            border: '3px solid #FF6B6B',
            boxShadow: '0 8px 25px rgba(255, 107, 107, 0.3)'
          }}>
            <img 
              src={proofPreview} 
              alt="Proof" 
              style={{width: '100%', height: 'auto', display: 'block'}}
            />
          </div>
          <div style={{display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap'}}>
            <button 
              style={{
                ...styles.button,
                background: 'linear-gradient(45deg, #4CAF50, #45a049)'
              }}
              onClick={handleSubmitProof}
            >
              Submit Proof ✅
            </button>
            <button 
              style={{
                ...styles.button,
                background: 'linear-gradient(45deg, #666, #999)'
              }}
              onClick={() => {
                setProofFile(null);
                setProofPreview('');
              }}
            >
              Retake 🔄
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderVoting = () => {
    const targetPlayer = players.find(p => p.socketId === votingData.playerId);
    return (
      <div style={styles.gameArea}>
        <h1>🗳️ Vote Now!</h1>
        <div style={styles.timer}>{timeLeft}s</div>
        <h2 style={{color: '#333', marginBottom: '10px'}}>{votingData.question}</h2>
        <p style={{color: '#666', fontSize: '18px', marginBottom: '30px'}}>
          Player: <strong>{targetPlayer?.name}</strong>
        </p>
        
        <div style={{display: 'flex', gap: '20px', margin: '20px 0', flexWrap: 'wrap', justifyContent: 'center'}}>
          <button 
            style={{
              ...styles.optionButton,
              background: 'linear-gradient(45deg, #4CAF50, #45a049)',
              padding: '20px 40px',
              fontSize: '20px'
            }}
            onClick={() => handleVote('yes')}
          >
            👍 YES
          </button>
          <button 
            style={{
              ...styles.optionButton,
              background: 'linear-gradient(45deg, #ff4444, #cc0000)',
              padding: '20px 40px',
              fontSize: '20px'
            }}
            onClick={() => handleVote('no')}
          >
            👎 NO
          </button>
        </div>
        
        <div style={{color: '#666', fontSize: '16px', marginTop: '20px'}}>
          Votes: <strong>{votes.current || 0}</strong> / <strong>{votes.total || players.length - 1}</strong>
        </div>
      </div>
    );
  };

  const renderGameResults = () => (
    <div style={styles.gameArea}>
      <h1 style={{color: '#333', marginBottom: '30px'}}>🏆 Game Over!</h1>
      <h2 style={{color: '#666', marginBottom: '20px'}}>Final Results</h2>
      <div style={{width: '100%', maxWidth: '500px', marginBottom: '30px'}}>
        {gameResults?.map((result, index) => (
          <div key={result.playerId} style={{
            ...styles.playerCard,
            background: index === 0 ? 'linear-gradient(45deg, #FFD700, #FFEC8B)' : 
                        index === 1 ? 'linear-gradient(45deg, #C0C0C0, #E8E8E8)' :
                        index === 2 ? 'linear-gradient(45deg, #CD7F32, #E8B88A)' : 
                        'rgba(255, 255, 255, 0.9)',
            border: index < 3 ? '3px solid gold' : '1px solid #ddd'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: index < 3 ? 'rgba(0, 0, 0, 0.2)' : 'linear-gradient(45deg, #667eea, #764ba2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              marginRight: '15px',
              fontSize: '20px',
              border: index < 3 ? '2px solid white' : 'none'
            }}>
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
            </div>
            <div style={{flex: 1}}>
              <div style={{fontWeight: 'bold', fontSize: '18px'}}>{result.name}</div>
              <div style={{color: '#666', fontSize: '16px'}}>Score: {result.score} points</div>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{marginTop: '30px', width: '100%', maxWidth: '600px'}}>
        <h3 style={{color: '#333', marginBottom: '15px'}}>📜 Confessions Archive</h3>
        <div style={{
          maxHeight: '200px', 
          overflowY: 'auto', 
          width: '100%',
          background: 'rgba(0, 0, 0, 0.05)',
          borderRadius: '15px',
          padding: '15px'
        }}>
          {confessions.length === 0 ? (
            <p style={{color: '#666', fontStyle: 'italic', textAlign: 'center'}}>
              No confessions yet...
            </p>
          ) : (
            confessions.map((conf, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.8)',
                padding: '12px',
                margin: '8px 0',
                borderRadius: '10px',
                borderLeft: `4px solid ${conf.type === 'truth' ? '#4CAF50' : '#FF6B6B'}`
              }}>
                <strong>{conf.player.name}:</strong> 
                {conf.type === 'truth' ? ` "${conf.confession}"` : ' Completed a dare!'}
                {conf.proof && <span style={{marginLeft: '5px'}}>📸</span>}
                <div style={{fontSize: '12px', color: '#999', marginTop: '5px'}}>
                  +{conf.score} points
                </div>
              </div>
            ))
          )}
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
      <h4 style={{margin: '0 0 10px 0', color: '#333'}}>💬 Game Chat</h4>
      <div style={{
        flex: 1, 
        overflowY: 'auto', 
        marginBottom: '10px',
        background: 'rgba(0, 0, 0, 0.03)',
        borderRadius: '10px',
        padding: '10px'
      }}>
        {chatMessages.length === 0 ? (
          <p style={{color: '#666', fontStyle: 'italic', textAlign: 'center', margin: '20px 0'}}>
            No messages yet. Start chatting!
          </p>
        ) : (
          chatMessages.map((msg, idx) => (
            <div key={idx} style={{margin: '8px 0', lineHeight: '1.4'}}>
              <strong style={{color: '#667eea'}}>{msg.playerName}:</strong> 
              <span style={{color: '#333', marginLeft: '5px'}}>{msg.message}</span>
            </div>
          ))
        )}
      </div>
      <div style={{display: 'flex'}}>
        <input
          type="text"
          placeholder="Type a message..."
          onKeyPress={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              handleSendMessage(e.target.value);
              e.target.value = '';
            }
          }}
          style={{
            flex: 1,
            padding: '12px 15px',
            borderRadius: '20px',
            border: '2px solid #ddd',
            marginRight: '10px',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        <button style={{
          ...styles.button,
          padding: '10px 20px',
          fontSize: '14px'
        }}>
          Send
        </button>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Notification System */}
      {notification && (
        <div style={styles.notification}>
          {notification}
        </div>
      )}

      <div style={styles.sidebar}>
        <h2 style={{color: 'white', marginBottom: '20px'}}>👥 Players ({players.length})</h2>
        {players.map(p => (
          <div key={p.socketId} style={{
            ...styles.playerCard,
            background: currentPlayer?.id === p.socketId ? 
              'linear-gradient(45deg, #667eea, #764ba2)' : 
              'rgba(255, 255, 255, 0.9)',
            color: currentPlayer?.id === p.socketId ? 'white' : 'inherit',
            border: p.socketId === socket?.id ? '2px solid #4ECDC4' : 'none'
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
              color: 'white',
              fontWeight: 'bold',
              marginRight: '15px'
            }}>
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div style={{flex: 1}}>
              <div style={{fontWeight: 'bold'}}>{p.name}</div>
              <div style={{fontSize: '12px', opacity: 0.8}}>
                🏆 {p.score || 0} points
                {p.isHost && ' • 👑 Host'}
                {currentPlayer?.id === p.socketId && ' • 🎯 Current'}
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
          padding: '15px 25px',
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '15px',
          marginBottom: '10px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
        }}>
          <h1 style={{margin: 0, color: '#333', fontSize: '24px'}}>
            🎮 Truth or Dare - Round {currentRound}
          </h1>
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <span style={{color: '#666', fontWeight: 'bold'}}>Room: {roomCode}</span>
            {isHost && gameState === 'playing' && !votingData && (
              <button style={styles.button} onClick={handleNextRound}>
                Next Round ➡️
              </button>
            )}
            <button 
              style={{...styles.button, background: '#666'}}
              onClick={onLeaveGame}
            >
              Leave Game
            </button>
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
        {currentPlayer && gameState === 'playing' && !isCurrentPlayer && !votingData && !showSpinner && (
          <div style={styles.gameArea}>
            <h2 style={{color: '#333'}}>⏳ Waiting for {currentPlayer.name}</h2>
            <p style={{color: '#666', fontSize: '18px'}}>
              They are currently taking their turn...
            </p>
            {timerActive && (
              <>
                <div style={styles.timer}>{timeLeft}s</div>
                <p style={{color: '#999', fontStyle: 'italic'}}>
                  Time remaining in this round
                </p>
              </>
            )}
          </div>
        )}

        {/* Paused State */}
        {gameState === 'paused' && (
          <div style={styles.gameArea}>
            <h1 style={{color: '#333'}}>⏸️ Game Paused</h1>
            <p style={{color: '#666', fontSize: '18px'}}>
              The host has paused the game. Please wait...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TruthOrDareGame;