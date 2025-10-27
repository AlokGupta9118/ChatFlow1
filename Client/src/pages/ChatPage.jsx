import { useState } from "react";
import ChatList from "../components/chat/ChatList";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatWindow from "../components/chat/ChatWindow";
import GroupChatAdminPanel from "../components/chat/GroupChatAdminPanel";
import GroupChatSidebar from "../components/chat/GroupChatSidebar";
import { ArrowLeft } from "lucide-react";

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

  const handleBackToList = () => {
    setSelectedChat(null);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-950 dark:to-black text-gray-900 dark:text-gray-200">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed top-0 left-0 h-full w-20 z-30">
        <ChatSidebar />
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex h-screen lg:pl-20 overflow-hidden">
        {/* LEFT PANEL (Chat List / Group List) */}
        <div
          className={`w-full md:w-80 border-r border-gray-200/50 dark:border-gray-800/50 
            bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl flex flex-col shadow-lg z-10
            transition-transform duration-500 ease-in-out
            ${selectedChat ? "translate-x-0 md:translate-x-0" : "translate-x-0"}
            ${selectedChat && "md:block hidden"} 
          `}
        >
          <div className="flex justify-around items-center p-4 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex-shrink-0">
            <button
              onClick={() => setIsGroupView(false)}
              className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                !isGroupView
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:scale-105"
              }`}
            >
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
              Groups
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {isGroupView ? (
              <GroupChatSidebar
                currentUser={currentUser}
                onSelectGroup={handleSelectGroupFromSidebar}
              />
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

        {/* RIGHT PANEL (Chat Window) */}
        <div
          className={`flex-1 flex flex-col bg-gradient-to-br from-white/40 via-blue-50/30 to-purple-50/20 
          dark:from-gray-900/40 dark:via-gray-800/30 dark:to-purple-900/20 backdrop-blur-sm 
          overflow-hidden min-h-0 transition-all duration-500 ease-in-out 
          ${selectedChat ? "translate-x-0" : "translate-x-full md:translate-x-0"} 
          absolute top-0 left-0 w-full h-full md:relative md:w-auto`}
        >
          {selectedChat ? (
            <>
              {/* Mobile back button */}
              <div className="flex md:hidden items-center gap-3 px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80">
                <button
                  onClick={handleBackToList}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {isGroupSelected ? selectedChat?.groupName : selectedChat?.name}
                </h3>
              </div>

              <div className="flex-1 min-h-0 z-10 relative">
                <ChatWindow
                  currentUser={currentUser}
                  selectedChat={selectedChat}
                  isGroup={isGroupSelected}
                  onToggleGroupInfo={() => setShowGroupInfo((prev) => !prev)}
                />
              </div>

              {/* Group Info Panel (Desktop only) */}
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
    </div>
  );
};

export default ChatPage;
