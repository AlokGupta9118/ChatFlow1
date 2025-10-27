import { useState } from "react";
import ChatList from "../components/chat/ChatList";
import ChatWindow from "../components/chat/ChatWindow";
import GroupChatAdminPanel from "../components/chat/GroupChatAdminPanel";
import GroupChatSidebar from "../components/chat/GroupChatSidebar";
import ChatSidebar from "../components/chat/ChatSidebar";
import { ArrowLeft, Menu, X } from "lucide-react";

const ChatPage = ({ currentUser }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [isGroupView, setIsGroupView] = useState(false);
  const [isGroupSelected, setIsGroupSelected] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSelectChat = (friend, group, groupFlag) => {
    setSelectedChat(groupFlag ? group : friend);
    setIsGroupSelected(groupFlag);
    setShowGroupInfo(false);
  };

  const handleBackToList = () => {
    setSelectedChat(null);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-black text-gray-900 dark:text-gray-200">
      {/* TOP HEADER */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/20 dark:bg-gray-900/40 backdrop-blur-2xl border-b border-gray-200/10 dark:border-gray-800/40 shadow-sm flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-xl bg-white/30 dark:bg-gray-800/60 hover:bg-white/50 dark:hover:bg-gray-700/60 transition-all shadow-sm"
        >
          {menuOpen ? (
            <X className="w-6 h-6 text-gray-800 dark:text-gray-200" />
          ) : (
            <Menu className="w-6 h-6 text-gray-800 dark:text-gray-200" />
          )}
        </button>

        <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent select-none">
          FlowLink Chat
        </h1>

        <div className="w-8" /> {/* spacer */}
      </header>

      {/* SIDE DRAWER MENU */}
      <div
        className={`fixed top-0 left-0 h-full w-72 sm:w-80 z-50 bg-white/90 dark:bg-gray-900/95 shadow-2xl backdrop-blur-2xl transform transition-transform duration-500 ease-in-out ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-gray-200/20 dark:border-gray-800/50 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Menu
          </h3>
          <button
            onClick={() => setMenuOpen(false)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            ✕
          </button>
        </div>
        <div className="p-3 overflow-y-auto h-[calc(100%-60px)]">
          <ChatSidebar />
        </div>
      </div>

      {/* OVERLAY BEHIND MENU */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* MAIN SECTION */}
      <div className="pt-16 flex flex-col h-[calc(100vh-4rem)] relative z-10">
        {!selectedChat ? (
          <>
            {/* Tabs */}
            <div className="flex justify-center items-center gap-6 py-3 border-b border-gray-200/10 dark:border-gray-800/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md">
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

            {/* Chat List */}
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
          </>
        ) : (
          <>
            {/* CHAT WINDOW */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200/10 dark:border-gray-800/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md">
              <button
                onClick={handleBackToList}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
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

            {/* GROUP INFO PANEL */}
            {isGroupSelected && (
              <div
                className={`absolute top-0 right-0 h-full w-96 bg-white/95 dark:bg-gray-900/95 
                backdrop-blur-xl shadow-2xl border-l border-gray-200/10 dark:border-gray-700/50 
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
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
