import { useState, useRef, useEffect } from "react";
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
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const handleSelectChat = (chat, isGroup = false) => {
    console.log("🔄 ChatPage: Selected chat:", { 
      chat: chat?.name, 
      isGroup,
      chatType: isGroup ? "GROUP" : "PRIVATE"
    });
    
    setSelectedChat(chat);
    setIsGroupSelected(isGroup);
    setShowGroupInfo(false);
    setShowMobileSidebar(false);
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    setIsGroupSelected(false);
  };

  const toggleMobileSidebar = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowMobileSidebar(!showMobileSidebar);
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMobileSidebar && 
          !event.target.closest('.mobile-sidebar') && 
          !event.target.closest('.hamburger-button')) {
        setShowMobileSidebar(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMobileSidebar]);

  // Debug: Log when selectedChat changes
  useEffect(() => {
    console.log("🔄 ChatPage: selectedChat updated", {
      selectedChat: selectedChat?.name,
      isGroupSelected,
      hasParticipants: selectedChat?.participants,
      participantsCount: selectedChat?.participants?.length
    });
  }, [selectedChat, isGroupSelected]);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-black text-gray-900 dark:text-gray-200">
      {/* Mobile Sidebar Overlay */}
      <div className={`
        mobile-sidebar
        lg:hidden
        fixed inset-0 z-40
        transition-all duration-300 ease-in-out
        ${showMobileSidebar 
          ? 'opacity-100 pointer-events-auto' 
          : 'opacity-0 pointer-events-none'
        }
      `}>
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowMobileSidebar(false)}
        />
        
        {/* Sidebar Content */}
        <div className={`
          absolute left-0 top-0 h-full w-80 max-w-[65vw]
          bg-white dark:bg-gray-900 shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <ChatSidebar />
        </div>
      </div>

      {/* Desktop Sidebar - Always visible */}
      <div className="hidden lg:flex">
        <ChatSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative z-10">
        {/* Header with hamburger menu */}
        <header className="flex-shrink-0 bg-white/20 dark:bg-gray-900/40 backdrop-blur-2xl border-b border-gray-200/10 dark:border-gray-800/40 shadow-sm flex items-center justify-between px-4 py-3">
          {/* Hamburger menu for mobile */}
          <button
            onClick={toggleMobileSidebar}
            className="hamburger-button lg:hidden w-10 h-10 rounded-full flex items-center justify-center bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/50 transition active:scale-95"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          
          {/* Center title */}
          <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent select-none flex-1 text-center lg:text-left lg:pl-8">
            FlowLink Chat
          </h1>
          
          {/* Spacer for mobile to balance the hamburger menu */}
          <div className="lg:hidden w-10 h-10" />
        </header>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
          {!selectedChat ? (
            <>
              {/* Tabs */}
              <div className="flex-shrink-0 flex justify-center items-center gap-4 sm:gap-6 py-3 border-b border-gray-200/10 dark:border-gray-800/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md px-2">
                <button
                  onClick={() => setIsGroupView(false)}
                  className={`px-4 sm:px-6 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    !isGroupView
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-200/30 dark:hover:bg-gray-700/40"
                  }`}
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Chats
                </button>
                <button
                  onClick={() => setIsGroupView(true)}
                  className={`px-4 sm:px-6 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isGroupView
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-200/30 dark:hover:bg-gray-700/40"
                  }`}
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Groups
                </button>
              </div>

              {/* Chat List */}
              <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                {isGroupView ? (
                  <GroupChatSidebar
                    currentUser={currentUser}
                    onSelectGroup={(group) => {
                      console.log("🎯 Group selected from GroupChatSidebar:", group?.name);
                      handleSelectChat(group, true); // Force isGroup to true
                    }}
                  />
                ) : (
                  // FIXED: Make sure ChatList passes the isGroup parameter correctly
                  <ChatList
                    currentUser={currentUser}
                    onSelectChat={(chat, isGroup = false) => {
                      console.log("🎯 Chat selected from ChatList:", { 
                        chat: chat?.name, 
                        isGroup,
                        hasParticipants: chat?.participants 
                      });
                      handleSelectChat(chat, isGroup);
                    }}
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
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition active:scale-95"
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate flex-1">
                  {selectedChat?.name}
                </h3>
                
                {/* Debug info */}
                <div className="text-xs text-gray-500 bg-white/50 px-2 py-1 rounded">
                  {isGroupSelected ? "GROUP" : "PRIVATE"}
                </div>
                
                {/* Mobile hamburger in chat view */}
                <button
                  onClick={toggleMobileSidebar}
                  className="hamburger-button lg:hidden w-9 h-9 rounded-full flex items-center justify-center bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/50 transition active:scale-95"
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
              </div>

              {/* Chat Window - Make sure isGroup prop is passed correctly */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <ChatWindow
                    currentUser={currentUser}
                    selectedChat={selectedChat}
                    isGroup={isGroupSelected} // This should be true for groups
                    onToggleGroupInfo={() => setShowGroupInfo((prev) => !prev)}
                  />
                </div>
              </div>

              {/* Group Info Panel */}
              {isGroupSelected && (
                <div
                  className={`absolute top-0 right-0 h-full w-80 lg:w-96 bg-white/95 dark:bg-gray-900/95 
                  backdrop-blur-xl shadow-2xl border-l border-gray-200/10 dark:border-gray-700/50 
                  transform transition-all duration-500 ease-in-out z-30 
                  ${
                    showGroupInfo
                      ? "translate-x-0 opacity-100"
                      : "translate-x-full opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="absolute top-4 left-4 z-40">
                    <button
                      onClick={() => setShowGroupInfo(false)}
                      className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
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