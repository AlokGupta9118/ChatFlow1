import { useState } from "react";
import ChatList from "../components/chat/ChatList";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatWindow from "../components/chat/ChatWindow";
import GroupChatAdminPanel from "../components/chat/GroupChatAdminPanel";
import GroupChatSidebar from "../components/chat/GroupChatSidebar";

const ChatPage = ({ currentUser }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [isGroupView, setIsGroupView] = useState(false);
  const [isGroupSelected, setIsGroupSelected] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const handleSelectChat = (friend, group, groupFlag) => {
    setSelectedChat(groupFlag ? group : friend);
    setIsGroupSelected(groupFlag);
    setShowGroupInfo(false);
  };

  const handleSelectGroupFromSidebar = (group) => {
    setSelectedChat(group);
    setIsGroupSelected(true);
    setShowGroupInfo(false);
  };

  return (
    <div className="flex h-screen w-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-950 dark:to-black text-gray-900 dark:text-gray-200 overflow-hidden fixed inset-0">
      {/* Reset default browser styles */}
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      {/* Enhanced Sidebar */}
      <div className="w-20 border-r border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-xl z-20 flex-shrink-0">
        <ChatSidebar />
      </div>

      {/* Enhanced Middle Panel */}
      <div className="w-80 border-r border-gray-200/50 dark:border-gray-800/50 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl flex flex-col shadow-lg z-10 flex-shrink-0 h-full">
        <div className="flex justify-around items-center p-4 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex-shrink-0">
          <button
            onClick={() => setIsGroupView(false)}
            className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              !isGroupView
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:scale-105"
            }`}
          >
            {!isGroupView && (
              <span className="absolute inset-0 bg-white/20 rounded-xl animate-pulse"></span>
            )}
            Chats
          </button>
          <button
            onClick={() => setIsGroupView(true)}
            className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              isGroupView
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:scale-105"
            }`}
          >
            {isGroupView && (
              <span className="absolute inset-0 bg-white/20 rounded-xl animate-pulse"></span>
            )}
            Groups
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {isGroupView ? (
            <GroupChatSidebar currentUser={currentUser} onSelectGroup={handleSelectGroupFromSidebar} />
          ) : (
            <ChatList
              currentUser={currentUser}
              onSelectFriend={handleSelectChat}
              selectedChat={selectedChat}
              isGroupSelected={isGroupSelected}
              viewGroups={isGroupView}
            />
          )}
        </div>
      </div>

      {/* Enhanced Chat Window Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-white/40 via-blue-50/30 to-purple-50/20 dark:from-gray-900/40 dark:via-gray-800/30 dark:to-purple-900/20 backdrop-blur-sm overflow-hidden relative min-h-0">
        {selectedChat ? (
          <>
            <div className="flex-1 min-h-0">
              <ChatWindow
                currentUser={currentUser}
                selectedChat={selectedChat}
                isGroup={isGroupSelected}
                onToggleGroupInfo={() => setShowGroupInfo((prev) => !prev)}
              />
            </div>

            {/* Enhanced Slide-in Group Info */}
            {isGroupSelected && (
              <div
                className={`absolute top-0 right-0 h-full w-96 bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl border-l border-gray-200/50 dark:border-gray-700/50 transform transition-all duration-500 ease-out ${
                  showGroupInfo ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
                }`}
              >
                <div className="absolute top-4 left-4 z-30">
                  <button
                    onClick={() => setShowGroupInfo(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    ✕
                  </button>
                </div>
                <div className="h-full overflow-y-auto">
                  <GroupChatAdminPanel
                    group={selectedChat}
                    currentUser={currentUser}
                    refreshGroup={() => console.log("Reload group")}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 space-y-6 p-4">
            <div className="w-32 h-32 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center shadow-2xl">
              <div className="text-4xl">💬</div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Welcome to Chat
              </h3>
              <p className="text-lg opacity-75">Select a friend or group to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;