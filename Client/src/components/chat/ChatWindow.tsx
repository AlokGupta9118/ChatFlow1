// ChatWindow.jsx - DEBUG ONLY VERSION (WITH NAME FIXES)
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
  const [typingUsers, setTypingUsers] = useState(new Map()); // ✅ CHANGED: Using Map to store userId -> userName
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

  // ✅ ADDED: Test user names mapping for quick testing
  const TEST_USER_NAMES = {
    'user123': 'Alice',
    'user456': 'Bob',
    'user789': 'Charlie',
    '68e1a7358455f4adf45ee208': 'Alokk'
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

    // ✅ FIXED: Typing listener - Store both userId and userName
    const handleUserTyping = (data) => {
      addLog(`🎯 TYPING EVENT RECEIVED: ${JSON.stringify(data)}`);
      
      if (data.isTyping) {
        // ✅ Store both user ID and name
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(data.userId, data.userName || TEST_USER_NAMES[data.userId] || `User ${data.userId}`);
          addLog(`➕ Added typing user: ${newMap.get(data.userId)} (ID: ${data.userId})`);
          return newMap;
        });
      } else {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          const userName = newMap.get(data.userId) || data.userName || `User ${data.userId}`;
          newMap.delete(data.userId);
          addLog(`➖ Removed typing user: ${userName} (ID: ${data.userId})`);
          return newMap;
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
      userName: testUserName, // ✅ This will be sent to backend and forwarded to other users
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

  // ✅ ADDED: Function to get typing display text with names
  const getTypingDisplayText = () => {
    if (typingUsers.size === 0) return null;
    
    const typingArray = Array.from(typingUsers.entries());
    
    if (typingArray.length === 1) {
      const [userId, userName] = typingArray[0];
      return `${userName} is typing...`;
    } else {
      const names = typingArray.map(([_, userName]) => userName).join(', ');
      return `${names} are typing...`;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">🎯 CHAT WINDOW - DEBUG MODE</h1>
      
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
              placeholder="user123, user456, etc."
            />
          </div>
          <div>
            <label className="block text-sm mb-1">User Name:</label>
            <input
              type="text"
              value={testUserName}
              onChange={(e) => setTestUserName(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded text-white"
              placeholder="This name will be shown to others"
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
        
        {/* ✅ FIXED: Typing Indicator Display with Names */}
        {typingUsers.size > 0 && (
          <div className="mt-4 p-3 bg-yellow-600 rounded">
            <div className="flex items-center gap-3">
              <div className="text-lg">⌨️</div>
              <div>
                <div className="font-bold">
                  {getTypingDisplayText()}
                </div>
                <div className="text-sm opacity-75">
                  User IDs: {Array.from(typingUsers.keys()).join(', ')}
                </div>
                <div className="text-sm opacity-75">
                  User Names: {Array.from(typingUsers.values()).join(', ')}
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
            Total: {logs.length} events | Typing Users: {typingUsers.size}
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
          <li><strong>Window 1:</strong> User ID: "user123", Name: "Alice"</li>
          <li><strong>Window 2:</strong> User ID: "user456", Name: "Bob"</li>
          <li>Both windows: Use same Chat ID and Chat Room ID</li>
          <li>Click "Join Chat Room" in both windows</li>
          <li>Click "Test Typing" in one window - should see name in other window</li>
          <li><strong>Expected:</strong> Should see "Alice is typing..." instead of "Someone is typing..."</li>
        </ol>
        
        <div className="mt-3 p-2 bg-green-900/30 rounded">
          <h4 className="font-bold mb-1">✅ What's Fixed:</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>Using Map to store userId → userName pairs</li>
            <li>Backend forwards userName to other users</li>
            <li>Display shows actual names instead of "Someone"</li>
            <li>Added test user name mappings for common IDs</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;