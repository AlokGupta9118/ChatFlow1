// ChatWindow.jsx - DEBUG ONLY VERSION
import { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";

// Socket configuration
const createSocket = () => {
  return io(import.meta.env.VITE_API_URL, {
    transports: ['websocket', 'polling'],
  });
};

const ChatWindow = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [logs, setLogs] = useState([]);
  const [testUserId, setTestUserId] = useState("user123");
  const [testUserName, setTestUserName] = useState("Test User");
  const [testChatId, setTestChatId] = useState("chat123");
  const [isGroup, setIsGroup] = useState(false);
  const [testChatRoomId, setTestChatRoomId] = useState("room123");

  const logContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Add log function
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  // Socket connection management
  useEffect(() => {
    addLog('🔌 Initializing socket connection...');
    const newSocket = createSocket();
    setSocket(newSocket);

    const handleConnect = () => {
      addLog('✅ Socket.IO connected: ' + newSocket.id);
      setIsConnected(true);
      
      // Join user room
      newSocket.emit('join_user', testUserId);
      addLog(`👤 Joined user room: user_${testUserId}`);
    };

    const handleDisconnect = () => {
      addLog('❌ Socket.IO disconnected');
      setIsConnected(false);
    };

    const handleConnectError = (error) => {
      addLog('❌ Socket.IO connection error: ' + error.message, 'error');
      setIsConnected(false);
    };

    // Typing listener
    const handleUserTyping = (data) => {
      addLog(`🎯 TYPING EVENT RECEIVED: ${JSON.stringify(data)}`);
      
      if (data.isTyping) {
        setTypingUsers(prev => new Set(prev).add(data.userId));
        addLog(`➕ Added typing user: ${data.userName || data.userId}`);
      } else {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          addLog(`➖ Removed typing user: ${data.userName || data.userId}`);
          return newSet;
        });
      }
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);
    newSocket.on('user_typing', handleUserTyping);

    return () => {
      addLog('🧹 Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Typing handler
  const handleTyping = useCallback(() => {
    if (!socket || !isConnected) {
      addLog('❌ Cannot emit typing: Socket not connected', 'error');
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const typingData = {
      chatId: testChatId,
      userId: testUserId,
      userName: testUserName,
      isGroup: isGroup,
      chatRoomId: testChatRoomId
    };

    addLog(`🎯 EMITTING TYPING START: ${JSON.stringify(typingData)}`);
    socket.emit("typing_start", typingData);

    typingTimeoutRef.current = setTimeout(() => {
      const stopData = {
        chatId: testChatId,
        userId: testUserId,
        isGroup: isGroup,
        chatRoomId: testChatRoomId
      };
      
      addLog(`🎯 EMITTING TYPING STOP: ${JSON.stringify(stopData)}`);
      socket.emit("typing_stop", stopData);
    }, 2000);
  }, [socket, isConnected, testUserId, testUserName, testChatId, isGroup, testChatRoomId]);

  // Join chat room
  const handleJoinChat = () => {
    if (!socket || !isConnected) {
      addLog('❌ Cannot join chat: Socket not connected', 'error');
      return;
    }

    const roomData = {
      roomId: testChatId,
      isGroup: isGroup,
      chatRoomId: testChatRoomId
    };

    addLog(`🚪 JOINING CHAT ROOM: ${JSON.stringify(roomData)}`);
    socket.emit('join_chat', roomData);
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">🎯  CHAT WINDOW - DEBUG MODE</h1>
      
      {/* Control Panel */}
      <div className="bg-gray-800 p-4 rounded-lg mb-4">
        <h2 className="text-lg font-bold mb-2">🧪 Test Controls</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm mb-1">User ID:</label>
            <input
              type="text"
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">User Name:</label>
            <input
              type="text"
              value={testUserName}
              onChange={(e) => setTestUserName(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Chat ID:</label>
            <input
              type="text"
              value={testChatId}
              onChange={(e) => setTestChatId(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Chat Room ID:</label>
            <input
              type="text"
              value={testChatRoomId}
              onChange={(e) => setTestChatRoomId(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded text-white"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isGroup}
              onChange={(e) => setIsGroup(e.target.checked)}
              className="mr-2"
            />
            Is Group Chat
          </label>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleJoinChat}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            Join Chat Room
          </button>
          <button
            onClick={handleTyping}
            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 transition-colors"
          >
            Test Typing
          </button>
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition-colors"
          >
            Clear Logs
          </button>
        </div>
      </div>

      {/* Status Panel */}
      <div className="bg-gray-800 p-4 rounded-lg mb-4">
        <h2 className="text-lg font-bold mb-2">📊 Status</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className={`p-2 rounded text-center ${isConnected ? 'bg-green-600' : 'bg-red-600'}`}>
            Socket: {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <div className="p-2 rounded text-center bg-blue-600">
            Typing Users: {typingUsers.size}
          </div>
          <div className="p-2 rounded text-center bg-purple-600">
            Room: {isGroup ? `group_${testChatId}` : `private_${testChatRoomId}`}
          </div>
        </div>
        
        {/* Typing Indicator Display */}
        {typingUsers.size > 0 && (
          <div className="mt-4 p-3 bg-yellow-600 rounded">
            <div className="flex items-center gap-3">
              <div className="text-lg">⌨️</div>
              <div>
                <div className="font-bold">
                  {typingUsers.size === 1 ? 'Someone is typing...' : `${typingUsers.size} people are typing...`}
                </div>
                <div className="text-sm opacity-75">
                  User IDs: {Array.from(typingUsers).join(', ')}
                </div>
              </div>
              <div className="flex space-x-1 ml-auto">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logs Panel */}
      <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold">📝 Event Logs</h2>
          <div className="text-sm text-gray-400">
            Total: {logs.length} events
          </div>
        </div>
        <div 
          ref={logContainerRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-sm"
        >
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No events yet. Use the test buttons above to generate events.
            </div>
          ) : (
            logs.map((log, index) => (
              <div 
                key={index} 
                className={`mb-2 p-2 rounded ${
                  log.type === 'error' ? 'bg-red-900/50' : 'bg-gray-700/50'
                }`}
              >
                <span className="text-gray-400">[{log.timestamp}]</span>{' '}
                <span className={log.type === 'error' ? 'text-red-300' : 'text-white'}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Test Instructions */}
      <div className="mt-4 p-4 bg-blue-900/30 rounded-lg">
        <h3 className="font-bold mb-2">🚀 Quick Test Instructions:</h3>
        <ol className="list-decimal list-inside text-sm space-y-1">
          <li>Click "Join Chat Room" to join the test room</li>
          <li>Click "Test Typing" to simulate typing</li>
          <li>Open another browser window with this same page</li>
          <li>Use different User IDs in each window</li>
          <li>Test typing between windows</li>
          <li>Check backend logs for "BACKEND: TYPING START" messages</li>
        </ol>
      </div>
    </div>
  );
};

export default ChatWindow;