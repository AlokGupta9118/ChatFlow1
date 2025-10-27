import { useState } from "react";
import ChatList from "../components/chat/ChatList";
import ChatWindow from "../components/chat/ChatWindow";
import GroupChatAdminPanel from "../components/chat/GroupChatAdminPanel";
import GroupChatSidebar from "../components/chat/GroupChatSidebar";
import ChatSidebar from "../components/chat/ChatSidebar";
import { ArrowLeft } from "lucide-react";

const ChatPage = ({ currentUser }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [isGroupView, setIsGroupView] = useState(false);
  const [isGroupSelected, setIsGroupSelected] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  // Unified handler for both friends and groups
  const handleSelectChat = (chat, isGroup = false) => {
    console.log("Selected chat:", { chat, isGroup }); // Debug log
    setSelectedChat(chat);
    setIsGroupSelected(isGroup);
    setShowGroupInfo(false);
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    setIsGroupSelected(false);
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-black text-gray-900 dark:text-gray-200">
      {/* Sidebar */}
      <ChatSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 bg-white/20 dark:bg-gray-900/40 backdrop-blur-2xl border-b border-gray-200/10 dark:border-gray-800/40 shadow-sm flex items-center justify-center px-4 py-3 lg:pl-24">
          <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent select-none">
            FlowLink Chat
          </h1>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedChat ? (
            <>
              {/* Tabs */}
              <div className="flex-shrink-0 flex justify-center items-center gap-6 py-3 border-b border-gray-200/10 dark:border-gray-800/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md">
                <button
                  onClick={() => setIsGroupView(false)}
                  className={`px-6 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    !isGroupView
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-200/30 dark:hover:bg-gray-700/40"
                  }`}
                >
                  Chats
                </button>
                <button
                  onClick={() => setIsGroupView(true)}
                  className={`px-6 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isGroupView
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-200/30 dark:hover:bg-gray-700/40"
                  }`}
                >
                  Groups
                </button>
              </div>

              {/* Chat List - Scrollable Area */}
              <div className="flex-1 overflow-y-auto">
                {isGroupView ? (
                  <GroupChatSidebar
                    currentUser={currentUser}
                    onSelectGroup={(group) => handleSelectChat(group, true)}
                  />
                ) : (
                  <ChatList
                    currentUser={currentUser}
                    onSelectChat={(chat) => handleSelectChat(chat, false)}
                    selectedChat={selectedChat}
                  />
                )}
              </div>
            </>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-200/10 dark:border-gray-800/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md">
                <button
                  onClick={handleBackToList}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {selectedChat?.name}
                </h3>
              </div>

              {/* Chat Window - Scrollable Area */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <ChatWindow
                    currentUser={currentUser}
                    selectedChat={selectedChat}
                    isGroup={isGroupSelected}
                    onToggleGroupInfo={() => setShowGroupInfo((prev) => !prev)}
                  />
                </div>
              </div>

              {/* Group Info Panel */}
              {isGroupSelected && (
                <div
                  className={`absolute top-0 right-0 h-full w-96 bg-white/95 dark:bg-gray-900/95 
                  backdrop-blur-xl shadow-2xl border-l border-gray-200/10 dark:border-gray-700/50 
                  transform transition-all duration-500 ease-in-out z-20 
                  ${
                    showGroupInfo
                      ? "translate-x-0 opacity-100"
                      : "translate-x-full opacity-0 pointer-events-none"
                  }`}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;