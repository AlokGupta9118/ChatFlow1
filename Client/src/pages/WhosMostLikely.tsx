import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ArrowLeft, Users, Crown, Target, Timer, Sparkles, 
  Volume2, VolumeX, Gamepad2, RefreshCw, MessageCircle, Send
} from "lucide-react";
import { Link } from "react-router-dom";

const socket = io("http://localhost:3000", {
  transports: ['websocket', 'polling'],
  timeout: 10000
});

// ChatInput component
const ChatInput = ({ onSendMessage, disabled, onTyping }) => {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleSubmit = useCallback(() => {
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue);
      setInputValue("");
      
      // Clear typing indicator when sending
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      onTyping(false);
    }
  }, [inputValue, onSendMessage, disabled, onTyping]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleChange = useCallback((e) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Handle typing indicators
    if (value.trim() && !disabled) {
      // User is typing
      onTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator after 1 second of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
        typingTimeoutRef.current = null;
      }, 1000);
    } else {
      // Input is empty, stop typing indicator
      onTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [onTyping, disabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex gap-2">
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        placeholder="Type a message..."
        className="flex-1"
        disabled={disabled}
      />
      <Button
        onClick={handleSubmit}
        disabled={!inputValue.trim() || disabled}
        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
};

// ChatPanel component
const ChatPanel = React.memo(({ 
  chatMessages, 
  playerName, 
  typingUsers, 
  onSendMessage,
  isConnected,
  onTyping
}) => {
  const chatContainerRef = useRef(null);

  const formatChatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  return (
    <Card className="h-[500px] flex flex-col bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl border-0">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
            Game Chat
          </h3>
          <Badge variant="outline" className="text-xs">
            {isConnected ? "Online" : "Offline"}
          </Badge>
        </div>
        
        {/* Typing indicators */}
        {typingUsers.size > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
          </div>
        )}
      </div>

      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === playerName ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-3 ${
                  message.sender === playerName
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                }`}
              >
                {message.sender !== playerName && (
                  <div className="text-xs font-semibold mb-1 opacity-75">
                    {message.sender}
                  </div>
                )}
                <div className="text-sm">{message.content}</div>
                <div className={`text-xs mt-1 ${
                  message.sender === playerName ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatChatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-200">
        <ChatInput 
          onSendMessage={onSendMessage} 
          disabled={!isConnected}
          onTyping={onTyping}
        />
      </div>
    </Card>
  );
});

const WhosMostLikely = () => {
  // Game states
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  
  // Round states
  const [currentScenario, setCurrentScenario] = useState("");
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(10);
  const [hasVoted, setHasVoted] = useState(false);
  const [votes, setVotes] = useState({});
  const [roundResults, setRoundResults] = useState(null);
  const [finalResults, setFinalResults] = useState(null);
  
  // UI states
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("connected");
  const [voteCount, setVoteCount] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState("");

  // Chat states
  const [chatMessages, setChatMessages] = useState([]);
  const [showChat, setShowChat] = useState(true);
  const [typingUsers, setTypingUsers] = useState(new Set());

  const audioRef = useRef(null);

  // Sound effects
  const playSound = (soundName) => {
    if (!soundEnabled) return;
    
    const sounds = {
      select: "/sounds/select.mp3",
      success: "/sounds/success.mp3",
      notification: "/sounds/notification.mp3",
      victory: "/sounds/victory.mp3",
      message: "/sounds/message.mp3"
    };
    
    if (audioRef.current && sounds[soundName]) {
      try {
        audioRef.current.src = sounds[soundName];
        audioRef.current.play().catch(() => {});
      } catch (error) {
        console.log("Audio play failed:", error);
      }
    }
  };

  // Chat message handler
  const handleSendChatMessage = useCallback((messageContent) => {
    if (!messageContent.trim() || !socket) return;

    const message = {
      id: Date.now(),
      sender: playerName,
      content: messageContent.trim(),
      timestamp: new Date().toISOString(),
      type: "text"
    };

    socket.emit("send-chat-message", { roomId, message });
  }, [roomId, playerName]);

  // Typing handler
  const handleTyping = useCallback((isTyping) => {
    if (!socket) return;
    socket.emit("typing", { roomId, isTyping });
  }, [roomId]);

  // Socket event handlers
  useEffect(() => {
    const handleRoomCreated = (room) => {
      setRoomId(room.roomId);
      setIsHost(true);
      setJoined(true);
      setPlayers(room.players);
      playSound("success");
    };

    const handleRoomJoined = (room) => {
      setRoomId(room.roomId);
      setPlayers(room.players);
      setJoined(true);
      playSound("success");
    };

    const handleUpdatePlayers = (playersList) => {
      setPlayers(playersList);
      playSound("notification");
    };

    const handleGameStarted = (data) => {
      setGameStarted(true);
      setCurrentScenario(data.scenario);
      setCurrentRound(data.currentRound);
      setTotalRounds(data.totalRounds);
      setHasVoted(false);
      setSelectedPlayer("");
      playSound("success");
    };

    const handleVoteReceived = (data) => {
      setVotes(prev => ({
        ...prev,
        [data.voter]: data.votedFor
      }));
      setVoteCount(data.votesSoFar);
    };

    const handleRoundResults = (results) => {
      setRoundResults(results);
      setVotes(results.votes);
      playSound("victory");
    };

    const handleNextRound = (data) => {
      setCurrentScenario(data.scenario);
      setCurrentRound(data.currentRound);
      setRoundResults(null);
      setHasVoted(false);
      setSelectedPlayer("");
      setVotes({});
      setVoteCount(0);
      playSound("success");
    };

    const handleGameFinished = (data) => {
      setGameFinished(true);
      setFinalResults(data);
      playSound("victory");
    };

    const handleConnectionError = () => {
      setConnectionStatus("disconnected");
    };

    const handleReconnect = () => {
      setConnectionStatus("connected");
    };

    // Chat event handlers
    const handleChatMessage = (message) => {
      setChatMessages(prev => [...prev, message]);
      if (message.sender !== playerName) {
        playSound("message");
      }
    };

    const handleChatHistory = (messages) => {
      setChatMessages(messages);
    };

    const handleUserTyping = (data) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (data.isTyping) {
          newSet.add(data.userName);
        } else {
          newSet.delete(data.userName);
        }
        return newSet;
      });
    };

    // Register event listeners
    socket.on("mostlikely-room-created", handleRoomCreated);
    socket.on("mostlikely-room-joined", handleRoomJoined);
    socket.on("mostlikely-update-players", handleUpdatePlayers);
    socket.on("mostlikely-game-started", handleGameStarted);
    socket.on("vote-received", handleVoteReceived);
    socket.on("mostlikely-round-results", handleRoundResults);
    socket.on("mostlikely-next-round", handleNextRound);
    socket.on("mostlikely-game-finished", handleGameFinished);
    socket.on("connect_error", handleConnectionError);
    socket.on("reconnect", handleReconnect);

    // Chat listeners
    socket.on("receive-chat-message", handleChatMessage);
    socket.on("chat-history", handleChatHistory);
    socket.on("user-typing", handleUserTyping);

    return () => {
      // Cleanup event listeners
      socket.off("mostlikely-room-created", handleRoomCreated);
      socket.off("mostlikely-room-joined", handleRoomJoined);
      socket.off("mostlikely-update-players", handleUpdatePlayers);
      socket.off("mostlikely-game-started", handleGameStarted);
      socket.off("vote-received", handleVoteReceived);
      socket.off("mostlikely-round-results", handleRoundResults);
      socket.off("mostlikely-next-round", handleNextRound);
      socket.off("mostlikely-game-finished", handleGameFinished);
      socket.off("connect_error", handleConnectionError);
      socket.off("reconnect", handleReconnect);

      // Chat listeners
      socket.off("receive-chat-message", handleChatMessage);
      socket.off("chat-history", handleChatHistory);
      socket.off("user-typing", handleUserTyping);
    };
  }, [playerName]);

  // Room management functions
  const createRoom = () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }
    socket.emit("create-mostlikely-room", { 
      player: { name: playerName.trim() } 
    });
  };

  const joinRoom = () => {
    if (!playerName.trim() || !roomId.trim()) {
      alert("Please enter your name and room code");
      return;
    }
    socket.emit("join-mostlikely-room", { 
      roomId: roomId.trim().toUpperCase(), 
      player: { name: playerName.trim() } 
    });
  };

  const startGame = () => {
    if (players.length < 2) {
      alert("Need at least 2 players to start");
      return;
    }
    socket.emit("start-mostlikely-game", { roomId });
  };

  const submitVote = () => {
    if (!selectedPlayer) {
      alert("Please select a player to vote for");
      return;
    }
    if (selectedPlayer === playerName) {
      alert("You cannot vote for yourself!");
      return;
    }
    
    socket.emit("submit-mostlikely-vote", { 
      roomId, 
      votedFor: selectedPlayer 
    });
    setHasVoted(true);
    playSound("select");
  };

  const nextRound = () => {
    socket.emit("next-mostlikely-round", { roomId });
  };

  const restartGame = () => {
    window.location.reload();
  };

  // Player Card Component
  const PlayerCard = ({ player, index, showVotes = false, voteCounts = {} }) => (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
      selectedPlayer === player.name 
        ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400 scale-105' 
        : 'bg-white/10 border-white/20 hover:bg-white/20'
    }`}>
      <div className="flex items-center space-x-3">
        <Avatar className="w-10 h-10 border-2 border-white/30">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {player.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-white">{player.name}</span>
          {player.isHost && <Crown className="w-4 h-4 text-yellow-400" />}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {showVotes && voteCounts[player.name] > 0 && (
          <Badge className="bg-green-500 text-white">
            {voteCounts[player.name]} votes
          </Badge>
        )}
      </div>
    </div>
  );

  // Connection Status
  const ConnectionStatus = () => (
    <div className={`fixed top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold z-50 ${
      connectionStatus === "connected" 
        ? "bg-green-500 text-white" 
        : "bg-red-500 text-white animate-pulse"
    }`}>
      {connectionStatus === "connected" ? "🟢 Connected" : "🔴 Disconnected"}
    </div>
  );

  // Join/Create Screen
  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-900 p-6 relative overflow-hidden">
        <ConnectionStatus />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        
        <div className="max-w-2xl mx-auto relative z-10">
          <Link to="/Games">
            <Button variant="ghost" className="mb-6 text-white hover:bg-white/20 backdrop-blur-sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Games
            </Button>
          </Link>

          <Card className="p-8 bg-white/10 backdrop-blur-lg border-0 shadow-2xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Who's Most Likely?
            </h1>

            <div className="space-y-4 mb-6">
              <div>
                <Label htmlFor="playerName" className="text-white font-medium mb-2 block">
                  Your Name
                </Label>
                <Input
                  id="playerName"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>

              <div>
                <Label htmlFor="roomId" className="text-white font-medium mb-2 block">
                  Room Code (optional)
                </Label>
                <Input
                  id="roomId"
                  placeholder="Enter room code to join"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={createRoom}
                disabled={!playerName.trim()}
                className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Crown className="w-5 h-5 mr-2" />
                Create New Room
              </Button>

              <Button
                onClick={joinRoom}
                disabled={!playerName.trim() || !roomId.trim()}
                className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                <Users className="w-5 h-5 mr-2" />
                Join Existing Room
              </Button>
            </div>

            <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <h4 className="font-semibold text-white mb-2 flex items-center justify-center">
                <Sparkles className="w-4 h-4 mr-2 text-yellow-400" />
                How it works
              </h4>
              <ul className="text-sm text-white/70 space-y-1 text-left">
                <li>• Create a room and share the code with friends</li>
                <li>• Vote for who's most likely to do something</li>
                <li>• Can't vote for yourself!</li>
                <li>• Most votes wins the round</li>
                <li>• Play multiple rounds to find the most likely person</li>
                <li className="text-blue-300">• 💬 Real-time chat with other players!</li>
              </ul>
            </div>
          </Card>
        </div>

        <audio ref={audioRef} preload="auto" />
      </div>
    );
  }

  // Waiting Room
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-900 p-6 relative overflow-hidden">
        <ConnectionStatus />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex justify-between items-center mb-6">
            <Button
              variant="ghost"
              onClick={() => window.location.reload()}
              className="text-white hover:bg-white/20 backdrop-blur-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Leave Room
            </Button>
            <div className="text-white font-medium bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
              Room: {roomId}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Card className="p-8 bg-white/10 backdrop-blur-lg border-0 shadow-2xl">
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <Target className="w-20 h-20 text-purple-400" />
                      <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-spin" />
                    </div>
                  </div>
                  
                  <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Who's Most Likely?
                  </h2>
                  <p className="text-white/70 mb-6">Waiting for players to join...</p>

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">Room Code: {roomId}</h3>
                    <Button 
                      onClick={() => navigator.clipboard?.writeText(roomId)}
                      className="bg-white/20 hover:bg-white/30 border-white/30"
                    >
                      Copy Code
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mb-6 max-h-60 overflow-y-auto">
                  {players.map((player, index) => (
                    <PlayerCard key={player.name} player={player} index={index} />
                  ))}
                </div>

                {players.length === 1 && (
                  <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-center space-x-2">
                      <Users className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-300">Waiting for more players to join...</span>
                    </div>
                  </div>
                )}

                {isHost ? (
                  <Button 
                    onClick={startGame} 
                    disabled={players.length < 2}
                    className="w-full py-6 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-2xl"
                  >
                    <Gamepad2 className="w-5 h-5 mr-2" />
                    Start Game ({players.length} players ready)
                  </Button>
                ) : (
                  <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
                    <div className="flex items-center justify-center space-x-2">
                      <Timer className="w-5 h-5 text-blue-400 animate-pulse" />
                      <span className="text-blue-300">Waiting for host to start the game...</span>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Chat Panel */}
            <div className="lg:col-span-1">
              <ChatPanel 
                chatMessages={chatMessages}
                playerName={playerName}
                typingUsers={typingUsers}
                onSendMessage={handleSendChatMessage}
                isConnected={connectionStatus === "connected"}
                onTyping={handleTyping}
              />
            </div>
          </div>
        </div>

        <audio ref={audioRef} preload="auto" />
      </div>
    );
  }

  // Game Finished Screen
  if (gameFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-900 p-6 relative overflow-hidden">
        <ConnectionStatus />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Card className="p-8 bg-white/10 backdrop-blur-lg border-0 shadow-2xl">
                <div className="text-center mb-8">
                  <Target className="w-20 h-20 text-purple-400 mx-auto mb-4" />
                  <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Game Complete!
                  </h2>
                  <p className="text-white/70 text-xl">
                    After {totalRounds} rounds, here are the results:
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  {finalResults?.rankings?.map((player, index) => (
                    <Card key={player.name} className={`p-6 text-center backdrop-blur-sm border-0 ${
                      index === 0 
                        ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 scale-105' 
                        : 'bg-white/5'
                    }`}>
                      <Avatar className="w-16 h-16 mx-auto mb-3 border-2 border-white/30">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                          {player.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="text-xl font-bold text-white mb-2">{player.name}</h3>
                      <div className="text-lg text-white/70">
                        Most likely in {player.stats.roundsWon} rounds
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={restartGame}
                    className="flex-1 py-6 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Play Again
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()}
                    className="flex-1 py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Main Menu
                  </Button>
                </div>
              </Card>
            </div>

            {/* Chat Panel */}
            <div className="lg:col-span-1">
              <ChatPanel 
                chatMessages={chatMessages}
                playerName={playerName}
                typingUsers={typingUsers}
                onSendMessage={handleSendChatMessage}
                isConnected={connectionStatus === "connected"}
                onTyping={handleTyping}
              />
            </div>
          </div>
        </div>

        <audio ref={audioRef} preload="auto" />
      </div>
    );
  }

  // Round Results Screen
  if (roundResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-900 p-6 relative overflow-hidden">
        <ConnectionStatus />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Card className="p-8 bg-white/10 backdrop-blur-lg border-0 shadow-2xl">
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <Sparkles className="w-16 h-16 text-yellow-400 animate-bounce" />
                  </div>
                  
                  <h2 className="text-3xl font-bold mb-2 text-white">
                    {roundResults.winners.length === 1 
                      ? `${roundResults.winners[0]} is most likely!` 
                      : "Multiple players are most likely!"}
                  </h2>
                  
                  <Card className="p-6 mb-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-400/30">
                    <p className="text-xl font-semibold text-white">{roundResults.scenario}</p>
                  </Card>
                </div>

                <div className="space-y-4 mb-8">
                  <h3 className="text-xl font-bold text-white mb-4 text-center">
                    Voting Results
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(roundResults.voteCounts)
                      .sort(([,a], [,b]) => b - a)
                      .map(([player, count]) => (
                      <div key={player} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8 border-2 border-white/30">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                              {player.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-white font-medium">{player}</span>
                        </div>
                        <Badge className={
                          roundResults.winners.includes(player) 
                            ? "bg-green-500 text-white" 
                            : "bg-white/20 text-white"
                        }>
                          {count} votes
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {isHost && (
                  <Button
                    onClick={nextRound}
                    className="w-full py-6 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    {currentRound < totalRounds ? "Next Round" : "See Final Results"}
                  </Button>
                )}

                {!isHost && (
                  <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Timer className="w-5 h-5 text-blue-400 animate-pulse" />
                      <span className="text-blue-300">Waiting for host to start next round...</span>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Chat Panel */}
            <div className="lg:col-span-1">
              <ChatPanel 
                chatMessages={chatMessages}
                playerName={playerName}
                typingUsers={typingUsers}
                onSendMessage={handleSendChatMessage}
                isConnected={connectionStatus === "connected"}
                onTyping={handleTyping}
              />
            </div>
          </div>
        </div>

        <audio ref={audioRef} preload="auto" />
      </div>
    );
  }

  // Main Game Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-900 p-6 relative overflow-hidden">
      <ConnectionStatus />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Game Content */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <div>
                <h2 className="text-xl font-bold text-white">Room: {roomId}</h2>
                <div className="text-white/70 flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>{players.length} players</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-white/70">Round</div>
                  <div className="text-lg font-bold text-white">
                    {currentRound} / {totalRounds}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-white/70">Votes</div>
                  <div className="text-lg font-bold text-white">
                    {voteCount} / {players.length}
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>

                {/* Chat Toggle Button */}
                <Button
                  variant="outline"
                  onClick={() => setShowChat(!showChat)}
                  className="border-white/20 text-white hover:bg-white/10 lg:hidden"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Main Game Content */}
            <Card className="p-8 bg-white/10 backdrop-blur-lg border-0 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Who's Most Likely?
                </h2>

                <Card className="p-8 md:p-12 mb-8 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 border-2 border-purple-400/30 min-h-[200px] flex items-center justify-center backdrop-blur-sm">
                  <p className="text-2xl md:text-4xl font-bold text-center text-white">
                    {currentScenario}
                  </p>
                </Card>

                <div className="mb-6">
                  <p className="text-white/80 mb-4 text-lg">
                    {hasVoted 
                      ? "✅ You've voted! Waiting for other players..." 
                      : "Choose who you think is most likely (can't choose yourself!)"}
                  </p>
                  
                  {!hasVoted && selectedPlayer && (
                    <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-3 mb-4">
                      <p className="text-green-300 font-medium">
                        You selected: <span className="font-bold">{selectedPlayer}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Player Selection Grid */}
              {!hasVoted && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {players
                    .filter(player => player.name !== playerName) // Can't vote for yourself
                    .map((player) => (
                      <div
                        key={player.name}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedPlayer === player.name
                            ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-green-400 scale-105 shadow-lg'
                            : 'bg-white/10 border-white/20 hover:bg-white/20 hover:scale-102'
                        }`}
                        onClick={() => setSelectedPlayer(player.name)}
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-12 h-12 border-2 border-white/30">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                              {player.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-lg font-bold text-white">{player.name}</h3>
                            <p className="text-white/70 text-sm">Click to select</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Action Button */}
              {!hasVoted ? (
                <Button
                  onClick={submitVote}
                  disabled={!selectedPlayer}
                  className="w-full py-6 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  <Target className="w-5 h-5 mr-2" />
                  Submit Your Vote
                </Button>
              ) : (
                <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-6 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Timer className="w-6 h-6 text-blue-400 animate-pulse" />
                    <span className="text-blue-300 text-lg font-medium">Waiting for other players...</span>
                  </div>
                  <Progress value={(voteCount / players.length) * 100} className="h-2 bg-white/20" />
                  <p className="text-white/70 mt-2">
                    {voteCount} of {players.length} players have voted
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Chat Panel - Hidden on mobile when not shown */}
          <div className={`lg:col-span-1 ${showChat ? 'block' : 'hidden lg:block'}`}>
            <ChatPanel 
              chatMessages={chatMessages}
              playerName={playerName}
              typingUsers={typingUsers}
              onSendMessage={handleSendChatMessage}
              isConnected={connectionStatus === "connected"}
              onTyping={handleTyping}
            />
          </div>
        </div>
      </div>

      <audio ref={audioRef} preload="auto" />
    </div>
  );
};

export default WhosMostLikely;