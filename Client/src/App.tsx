import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import TruthOrDare from "./components/games/TruthOrDare.jsx"
import CompatibilityQuiz from "./components/games/CompatibilityQuiz.jsx"
import WhosMostLikely from "./components/games/WhoMostLikely.jsx"
import Index from "./pages/Index";
// ... other imports

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
  element={<SettingPanel currentUser={JSON.parse(localStorage.getItem("user"))} />}
/>
           <Route path="/Games" element={<IndexGames />} />
          <Route path="/truth-or-dare" element={<TruthOrDare  roomCode="ABC123"
      player={{
        name: "Player Name",
        avatar: "avatar-url",
        isHost: true
      }}
      onLeaveGame={() => console.log('Leave game')}/>} />
          <Route path="/compatibility-quiz" element={<CompatibilityQuiz />} />
          <Route path="/whos-most-likely" element={<WhosMostLikely />} />
          <Route path="user/status" element={<Status/>}/>
          <Route path="/friends" element={<AddFriends/>}/>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
