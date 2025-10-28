// hooks/useGameSocket.js - FIXED VERSION
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useGameSocket = () => {
  const socketRef = useRef(null);
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    // Fix: Remove space from environment variable name and add fallback
    const API_URL = import.meta.env.VITE_API_URL || 'https://chatflow1.onrender.com';
    
    console.log('Connecting to:', API_URL); // Debug log

    socketRef.current = io(API_URL, {
      transports: ['websocket', 'polling'], // Add polling as fallback
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: true,
      withCredentials: true
    });

    const socket = socketRef.current;

    // Connection events with better error handling
    socket.on('connect', () => {
      console.log('✅ Connected to game server:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        socket.connect(); // Reconnect if server disconnected us
      }
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      setIsConnected(false);
      setConnectionError(error.message);
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnect attempt ${attempt}`);
    });

    socket.on('reconnect', (attempt) => {
      console.log('✅ Reconnected after', attempt, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('reconnect_failed', () => {
      console.error('💥 Reconnect failed');
      setConnectionError('Failed to reconnect to server');
    });

    // Room events
    socket.on('room-created', (data) => {
      console.log('Room created:', data);
      setGameState(data.room);
      setPlayers(data.room?.players || []);
      setCurrentRoom(data.roomCode);
    });

    socket.on('room-joined', (data) => {
      console.log('Room joined:', data);
      setGameState(data.room);
      setPlayers(data.room?.players || []);
      setCurrentRoom(data.room?.roomCode);
    });

    socket.on('player-joined', (data) => {
      console.log('Player joined:', data);
      setPlayers(data.players || []);
      if (data.room) {
        setGameState(prev => ({ ...prev, ...data.room }));
      }
    });

    socket.on('player-disconnected', (data) => {
      console.log('Player disconnected:', data);
      setPlayers(data.players || []);
    });

    socket.on('new-host', (data) => {
      console.log('New host:', data);
      setPlayers(prev => prev.map(p => 
        p.socketId === data.hostId ? { ...p, isHost: true } : p
      ));
    });

    // Truth or Dare events
    socket.on('wheel-spinning', (data) => {
      console.log('Wheel spinning:', data);
      setGameState(prev => ({ ...prev, wheelSpinning: true }));
    });

    socket.on('wheel-result', (data) => {
      console.log('Wheel result:', data);
      setGameState(prev => ({ 
        ...prev, 
        wheelSpinning: false,
        selectedPlayer: data.selectedPlayer,
        selectedPlayerId: data.playerId
      }));
    });

    socket.on('show-truth-dare-choice', () => {
      console.log('Show truth/dare choice');
      setGameState(prev => ({ ...prev, showChoice: true }));
    });

    socket.on('truth-dare-selected', (data) => {
      console.log('Truth/dare selected:', data);
      setGameState(prev => ({
        ...prev,
        currentChoice: data.choice,
        currentQuestion: data.question,
        awaitingResponse: data.awaitingResponse
      }));
    });

    socket.on('truth-submitted', (data) => {
      console.log('Truth submitted:', data);
      if (data.chatMessage) {
        setChatMessages(prev => [...prev, data.chatMessage]);
      }
      setGameState(prev => ({ ...prev, awaitingResponse: false }));
    });

    socket.on('dare-completed', (data) => {
      console.log('Dare completed:', data);
      if (data.chatMessage) {
        setChatMessages(prev => [...prev, data.chatMessage]);
      }
      setGameState(prev => ({ ...prev, awaitingResponse: false }));
    });

    socket.on('enable-next-round', () => {
      console.log('Enable next round');
      setGameState(prev => ({ ...prev, canStartNextRound: true }));
    });

    socket.on('next-round-started', (data) => {
      console.log('Next round started:', data);
      setGameState(prev => ({
        ...prev,
        currentRound: data.round,
        canStartNextRound: false,
        selectedPlayer: null,
        currentQuestion: null,
        currentChoice: null,
        showChoice: false
      }));
    });

    // Chat events
    socket.on('chat-history', (data) => {
      console.log('Chat history:', data);
      setChatMessages(data.messages || []);
    });

    socket.on('new-chat-message', (message) => {
      console.log('New chat message:', message);
      setChatMessages(prev => [...prev, message]);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      setConnectionError(error.message || 'An error occurred');
    });

    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Room Management with error handling
  const createRoom = (gameType, roomName, playerName, settings = {}) => {
    if (!socketRef.current?.connected) {
      setConnectionError('Not connected to server');
      return;
    }
    
    console.log('Creating room:', { gameType, roomName, playerName });
    socketRef.current.emit('create-game-room', {
      gameType,
      roomName,
      playerName,
      settings
    });
  };

  const joinRoom = (roomCode, playerName) => {
    if (!socketRef.current?.connected) {
      setConnectionError('Not connected to server');
      return;
    }
    
    console.log('Joining room:', { roomCode, playerName });
    socketRef.current.emit('join-game-room', { roomCode, playerName });
  };

  const leaveRoom = (roomCode) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-game-room', { roomCode });
    }
  };

  const startGame = (roomCode) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('start-game', { roomCode });
    }
  };

  const setPlayerReady = (roomCode, isReady) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('player-ready', { roomCode, isReady });
    }
  };

  // Truth or Dare Actions
  const spinWheel = (roomCode) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('spin-wheel', { roomCode });
    }
  };

  const chooseTruthDare = (roomCode, choice) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('choose-truth-dare', { roomCode, choice });
    }
  };

  const submitTruth = (roomCode, answer) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('submit-truth', { roomCode, answer });
    }
  };

  const submitDareProof = (roomCode, proofType, proofData) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('submit-dare-proof', { roomCode, proofType, proofData });
    }
  };

  const nextRound = (roomCode) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('next-round', { roomCode });
    }
  };

  // Chat
  const sendChatMessage = (roomCode, message) => {
    if (socketRef.current?.connected && message.trim()) {
      socketRef.current.emit('send-game-chat', { roomCode, message });
    }
  };

  // Connection management
  const connect = () => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  return {
    socket: socketRef.current,
    gameState,
    players,
    isConnected,
    chatMessages,
    currentRoom,
    connectionError,
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
    sendChatMessage,
    connect,
    disconnect
  };
};