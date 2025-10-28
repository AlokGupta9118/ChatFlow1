// hooks/useGameSocket.js
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useGameSocket = () => {
  const socketRef = useRef(null);
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);

  useEffect(() => {
    socketRef.current = io(process.env.REACT_APP_SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to game server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Room events
    socket.on('room-created', (data) => {
      setGameState(data.room);
      setPlayers(data.room.players);
      setCurrentRoom(data.roomCode);
    });

    socket.on('room-joined', (data) => {
      setGameState(data.room);
      setPlayers(data.room.players);
      setCurrentRoom(data.room.roomCode);
    });

    socket.on('player-joined', (data) => {
      setPlayers(data.players);
      setGameState(data.room);
    });

    socket.on('player-disconnected', (data) => {
      setPlayers(data.players);
    });

    socket.on('new-host', (data) => {
      setPlayers(prev => prev.map(p => 
        p.socketId === data.hostId ? { ...p, isHost: true } : p
      ));
    });

    // Truth or Dare events
    socket.on('wheel-spinning', (data) => {
      setGameState(prev => ({ ...prev, wheelSpinning: true }));
    });

    socket.on('wheel-result', (data) => {
      setGameState(prev => ({ 
        ...prev, 
        wheelSpinning: false,
        selectedPlayer: data.selectedPlayer,
        selectedPlayerId: data.playerId
      }));
    });

    socket.on('show-truth-dare-choice', () => {
      setGameState(prev => ({ ...prev, showChoice: true }));
    });

    socket.on('truth-dare-selected', (data) => {
      setGameState(prev => ({
        ...prev,
        currentChoice: data.choice,
        currentQuestion: data.question,
        awaitingResponse: data.awaitingResponse
      }));
    });

    socket.on('truth-submitted', (data) => {
      setChatMessages(prev => [...prev, data.chatMessage]);
      setGameState(prev => ({ ...prev, awaitingResponse: false }));
    });

    socket.on('dare-completed', (data) => {
      setChatMessages(prev => [...prev, data.chatMessage]);
      setGameState(prev => ({ ...prev, awaitingResponse: false }));
    });

    socket.on('enable-next-round', () => {
      setGameState(prev => ({ ...prev, canStartNextRound: true }));
    });

    socket.on('next-round-started', (data) => {
      setGameState(prev => ({
        ...prev,
        currentRound: data.round,
        canStartNextRound: false,
        selectedPlayer: null,
        currentQuestion: null,
        currentChoice: null
      }));
    });

    // Chat events
    socket.on('chat-history', (data) => {
      setChatMessages(data.messages);
    });

    socket.on('new-chat-message', (message) => {
      setChatMessages(prev => [...prev, message]);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      // Handle error display to user
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Room Management
  const createRoom = (gameType, roomName, playerName, settings = {}) => {
    socketRef.current.emit('create-game-room', {
      gameType,
      roomName,
      playerName,
      settings
    });
  };

  const joinRoom = (roomCode, playerName) => {
    socketRef.current.emit('join-game-room', { roomCode, playerName });
  };

  const leaveRoom = (roomCode) => {
    socketRef.current.emit('leave-game-room', { roomCode });
  };

  const startGame = (roomCode) => {
    socketRef.current.emit('start-game', { roomCode });
  };

  const setPlayerReady = (roomCode, isReady) => {
    socketRef.current.emit('player-ready', { roomCode, isReady });
  };

  // Truth or Dare Actions
  const spinWheel = (roomCode) => {
    socketRef.current.emit('spin-wheel', { roomCode });
  };

  const chooseTruthDare = (roomCode, choice) => {
    socketRef.current.emit('choose-truth-dare', { roomCode, choice });
  };

  const submitTruth = (roomCode, answer) => {
    socketRef.current.emit('submit-truth', { roomCode, answer });
  };

  const submitDareProof = (roomCode, proofType, proofData) => {
    socketRef.current.emit('submit-dare-proof', { roomCode, proofType, proofData });
  };

  const nextRound = (roomCode) => {
    socketRef.current.emit('next-round', { roomCode });
  };

  // Chat
  const sendChatMessage = (roomCode, message) => {
    socketRef.current.emit('send-game-chat', { roomCode, message });
  };

  return {
    socket: socketRef.current,
    gameState,
    players,
    isConnected,
    chatMessages,
    currentRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    setPlayerReady,
    spinWheel,
    chooseTruthDare,
    submitTruth,
    submitDareProof,
    nextRound,
    sendChatMessage
  };
};