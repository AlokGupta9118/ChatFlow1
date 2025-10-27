import { useState, useEffect } from "react";
import ChatList from "../components/chat/ChatList";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatWindow from "../components/chat/ChatWindow";
import GroupChatAdminPanel from "../components/chat/GroupChatAdminPanel";
import GroupChatSidebar from "../components/chat/GroupChatSidebar";
import { ArrowLeft, Users, MessageCircle } from "lucide-react";

const ChatPage = ({ currentUser }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [isGroupView, setIsGroupView] = useState(false);
  const [isGroupSelected, setIsGroupSelected] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list', 'chat', 'groupInfo'

  const handleSelectChat = (friend, group, groupFlag) => {
    setSelectedChat(groupFlag ? group : friend);
    setIsGroupSelected(groupFlag);
    setShowGroupInfo(false);
    
    // On mobile, switch to chat view when a chat is selected
    if (window.innerWidth < 1024) {
      setMobileView('chat');
    }
  };

  const handleSelectGroupFromSidebar = (group) => {
    setSelectedChat(group);
    setIsGroupSelected(true);
    setShowGroupInfo(false);
    
    // On mobile, switch to chat view when a group is selected
    if (window.innerWidth < 1024) {
      setMobileView('chat');
    }
  };

  const handleBackToList = () => {
    setMobileView('list');
    setSelectedChat(null);
    setShowGroupInfo(false);
  };

  const handleToggleGroupInfo = () => {
    if (window.innerWidth < 1024) {
      setMobileView(mobileView === 'groupInfo' ? 'chat' : 'groupInfo');
    } else {
      setShowGroupInfo((prev) => !prev);
    }
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileView('list'); // Reset to default view on desktop
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

      {/* Enhanced Sidebar - Hidden on mobile */}
      <div className="hidden lg:flex w-20 border-r border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-xl z-20 flex-shrink-0">
        <ChatSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Chat List/Group Sidebar */}
        <div className={`
          w-full lg:w-80 border-r border-gray-200/50 dark:border-gray-800/50 
          bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl flex flex-col shadow-lg 
          z-10 flex-shrink-0 h-full transition-transform duration-300 ease-in-out
          ${mobileView === 'list' ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Mobile Header for List View */}
          <div className="lg:hidden flex items-center gap-4 p-4 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Messages
            </h1>
          </div>

          {/* View Toggle Buttons */}
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

        {/* Chat Window Area - FIXED: Proper visibility logic */}
        <div className={`
          flex-1 flex flex-col bg-gradient-to-br from-white/40 via-blue-50/30 to-purple-50/20 
          dark:from-gray-900/40 dark:via-gray-800/30 dark:to-purple-900/20 backdrop-blur-sm 
          overflow-hidden min-h-0 transition-transform duration-300 ease-in-out
          ${mobileView === 'chat' || mobileView === 'groupInfo' || (window.innerWidth >= 1024 && selectedChat) 
            ? 'translate-x-0 flex' 
            : 'translate-x-full lg:translate-x-0 lg:flex'
          }
          ${!selectedChat && window.innerWidth >= 1024 ? 'lg:flex' : ''}
        `}>
          {selectedChat ? (
            <>
              {/* Mobile Header for Chat View */}
              <div className="lg:hidden flex items-center gap-3 p-4 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex-shrink-0">
                <button
                  onClick={handleBackToList}
                  className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 dark:text-white truncate">
                    {selectedChat.name || selectedChat.username}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isGroupSelected ? `${selectedChat.members?.length || 0} members` : 'Online'}
                  </p>
                </div>

                {isGroupSelected && (
                  <button
                    onClick={handleToggleGroupInfo}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      mobileView === 'groupInfo' 
                        ? 'bg-indigo-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:scale-105'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-0">
                <ChatWindow
                  currentUser={currentUser}
                  selectedChat={selectedChat}
                  isGroup={isGroupSelected}
                  onToggleGroupInfo={handleToggleGroupInfo}
                />
              </div>

              {/* Group Info Panel */}
              {isGroupSelected && (
                <div className={`
                  absolute inset-0 flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl 
                  shadow-2xl border-l border-gray-200/50 dark:border-gray-700/50 
                  transition-transform duration-300 ease-in-out z-20
                  ${(showGroupInfo && window.innerWidth >= 1024) || mobileView === 'groupInfo' 
                    ? 'translate-x-0' 
                    : 'translate-x-full'
                  }
                `}>
                  {/* Mobile Header for Group Info */}
                  <div className="lg:hidden flex items-center gap-3 p-4 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex-shrink-0">
                    <button
                      onClick={handleToggleGroupInfo}
                      className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:scale-105 transition-transform"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <h2 className="font-semibold text-gray-900 dark:text-white">Group Info</h2>
                  </div>

                  {/* Desktop Close Button */}
                  <div className="hidden lg:block absolute top-4 left-4 z-30">
                    <button
                      onClick={() => setShowGroupInfo(false)}
                      className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto pt-16 lg:pt-0">
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
            <div className="hidden lg:flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 space-y-6 p-4">
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