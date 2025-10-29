import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./contexts/AuthContext"; // You'll need to create this
import socketService from "./utils/socketService"; // You'll need to create this
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ChatApp from "./pages/App";
import Profile from "./pages/Profile";
import Status from "./pages/Status";
import AddFriends from "./pages/Friends";
import ChatPage from "@/pages/ChatPage";
import SettingPanel from "./pages/Settting";
import IndexGames from "./pages/IndexGame";
import TruthOrDare from "./pages/TruthOrDare";
import CompatibilityQuiz from "./pages/CompatibilityQuiz";
import WhosMostLikely from "./pages/WhosMostLikely";
import Index from "./pages/Index";

const queryClient = new QueryClient();

// Socket connection wrapper component
const SocketConnectionManager = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("🔄 Initializing socket connection for user:", user._id);
      
      // Connect socket when user is authenticated
      const socket = socketService.connect(user._id);
      
      // Setup page visibility detection
      const handleVisibilityChange = () => {
        if (document.hidden) {
          console.log('👋 User is away from page');
          // Note: We don't set offline immediately when switching tabs
          // Only on actual disconnect or logout
        } else {
          console.log('🔙 User returned to page');
          // Ensure socket is connected when user returns
          if (socket && !socket.connected) {
            socket.connect();
          }
        }
      };

      // Setup beforeunload for browser close/tab close
      const handleBeforeUnload = () => {
        console.log('🚪 User is leaving the page, disconnecting socket');
        socketService.disconnect();
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        console.log('🧹 Cleaning up socket connection');
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        
        // Only disconnect if user is explicitly navigating away while authenticated
        // Don't disconnect on page refresh - let beforeunload handle it
        if (!document.hidden) {
          socketService.disconnect();
        }
      };
    }
  }, [isAuthenticated, user]);

  return children;
};

// Auth context provider wrapper (you need to create this)
const AppWithAuth = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SocketConnectionManager>
            {children}
          </SocketConnectionManager>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const App = () => (
  <AppWithAuth>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/chat" element={<ChatApp />} />
      <Route path="/chat/profile" element={<Profile />} />
      <Route path="*" element={<NotFound />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route
        path="/setting"
        element={<SettingPanel currentUser={JSON.parse(localStorage.getItem("user") || "{}")} />}
      />
      <Route path="/Games" element={<IndexGames />} />
      <Route 
        path="/truth-or-dare" 
        element={
          <TruthOrDare  
            roomCode="ABC123"
            player={{
              name: "Player Name",
              avatar: "avatar-url",
              isHost: true
            }}
            onLeaveGame={() => console.log('Leave game')}
          />
        } 
      />
      <Route path="/compatibility-quiz" element={<CompatibilityQuiz />} />
      <Route path="/whos-most-likely" element={<WhosMostLikely />} />
      <Route path="/user/status" element={<Status/>}/>
      <Route path="/friends" element={<AddFriends/>}/>
    </Routes>
  </AppWithAuth>
);

export default App;