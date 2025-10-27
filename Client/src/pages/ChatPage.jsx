import { useState } from "react";
import ChatList from "../components/chat/ChatList";
import ChatWindow from "../components/chat/ChatWindow";
import GroupChatAdminPanel from "../components/chat/GroupChatAdminPanel";
import GroupChatSidebar from "../components/chat/GroupChatSidebar";
import ChatSidebar from "../components/chat/ChatSidebar";
import { ArrowLeft, Menu } from "lucide-react";

const ChatPage = ({ currentUser }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [isGroupView, setIsGroupView] = useState(false);
  const [isGroupSelected, setIsGroupSelected] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // ✅ Hamburger toggle

  const handleSelectChat = (friend, group, groupFlag) => {
    setSelectedChat(groupFlag ? group : friend);
    setIsGroupSelected(groupFlag);
    setShowGroupInfo(false);
  };

  const handleBackToList = () => {
    setSelectedChat(null);
  };

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-950 dark:to-black text-gray-900 dark:text-gray-200 overflow-hidden">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md shadow-sm sticky top-0 z-20">
        {/* Hamburger Menu */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>

        <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          FlowLink Chat
        </h2>

        <div className="w-6" /> {/* Spacer for symmetry */}
      </div>

      {/* SLIDING CHAT MENU */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white/90 dark:bg-gray-900/95 shadow-2xl z-30 backdrop-blur-xl transform transition-transform duration-500 ease-in-out ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-gray-200/40 dark:border-gray-800/40 flex justify-between items-center">
          <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
            Menu
          </h3>
          <button
            onClick={() => setMenuOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-full">
          <ChatSidebar />
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="relative flex flex-col h-[calc(100vh-4rem)]">
        {!selectedChat ? (
          // 📋 Chat List Screen
          <div className="flex flex-col h-full">
            <div className="flex justify-around items-center p-3 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex-shrink-0">
              <button
                onClick={() => setIsGroupView(false)}
                className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  !isGroupView
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
                }`}
              >
                Chats
              </button>
              <button
                onClick={() => setIsGroupView(true)}
                className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  isGroupView
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
                }`}
              >
                Groups
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isGroupView ? (
                <GroupChatSidebar
                  currentUser={currentUser}
                  onSelectGroup={(group) =>
                    handleSelectChat(null, group, true)
                  }
                />
              ) : (
                <ChatList
                  currentUser={currentUser}
                  onSelectFriend={(friend) =>
                    handleSelectChat(friend, null, false)
                  }
                  selectedChat={selectedChat}
                  isGroupSelected={isGroupSelected}
                />
              )}
            </div>
          </div>
        ) : (
          // 💬 Chat Window Screen
          <div className="flex-1 flex flex-col bg-gradient-to-br from-white/40 via-blue-50/30 to-purple-50/20 dark:from-gray-900/40 dark:via-gray-800/30 dark:to-purple-900/20 backdrop-blur-sm overflow-hidden">
            {/* Header for Chat Window */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80">
              <button
                onClick={handleBackToList}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <h3 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {isGroupSelected
                  ? selectedChat?.groupName
                  : selectedChat?.name}
              </h3>
            </div>

            <div className="flex-1 relative">
              <ChatWindow
                currentUser={currentUser}
                selectedChat={selectedChat}
                isGroup={isGroupSelected}
                onToggleGroupInfo={() => setShowGroupInfo((prev) => !prev)}
              />
            </div>

            {/* Group Info Drawer */}
            {isGroupSelected && (
              <div
                className={`absolute top-0 right-0 h-full w-96 bg-white/95 dark:bg-gray-900/95 
                backdrop-blur-xl shadow-2xl border-l border-gray-200/50 dark:border-gray-700/50 
                transform transition-all duration-500 ease-in-out z-20 
                ${showGroupInfo ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"}`}
              >
                <div className="absolute top-4 left-4 z-30">
                  <button
                    onClick={() => setShowGroupInfo(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                  >
                    ✕
                  </button>
                </div>
                <div className="h-full overflow-y-auto pt-4">
                  <GroupChatAdminPanel
                    group={selectedChat}
                    currentUser={currentUser}
                    refreshGroup={() => console.log("Reload group")}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
