import React, { useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSelectChat = (friend, group, groupFlag) => {
    setSelectedChat(groupFlag ? group : friend);
    setIsGroupSelected(groupFlag);
    setShowGroupInfo(false);
    // close menu on mobile when opening chat
    setMenuOpen(false);
  };

  const handleBackToList = () => {
    setSelectedChat(null);
  };

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-black text-gray-900 dark:text-gray-200 overflow-hidden">
      {/* TOP HEADER */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/12 dark:bg-gray-900/40 backdrop-blur-md border-b border-gray-200/6 dark:border-gray-800/40 flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setMenuOpen((s) => !s)}
          aria-label="Open menu"
          className="p-2 rounded-lg bg-white/20 dark:bg-gray-800/60 hover:bg-white/30 dark:hover:bg-gray-700/60 transition"
        >
          <Menu className="w-6 h-6 text-gray-100" />
        </button>

        <h1 className="text-lg font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent select-none">
          FlowLink Chat
        </h1>

        <div className="w-8" />
      </header>

      {/* BACKDROP OVERLAY (only when menuOpen) */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* SLIDE-IN MENU DRAWER */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 transform transition-transform duration-300 ease-in-out
          ${menuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ width: 320 }} // fixed width in px to avoid layout issues
        aria-hidden={!menuOpen}
      >
        <div className="h-full bg-white/95 dark:bg-gray-900/95 shadow-2xl backdrop-blur-xl border-r border-gray-200/10 dark:border-gray-800/40">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/10 dark:border-gray-800/40">
            <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">Menu</div>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              ✕
            </button>
          </div>

          {/* Pass compact=true so the sidebar renders cleanly in drawer (no internal mobile button) */}
          <div className="p-3 overflow-y-auto h-[calc(100%-64px)]">
            <ChatSidebar closeMenu={() => setMenuOpen(false)} compact />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT (under header) */}
      <main className="pt-16 h-[calc(100vh-4rem)]">
        {!selectedChat ? (
          // Chat list screen (full page on mobile)
          <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex justify-center items-center gap-4 p-3 border-b border-gray-200/6 dark:border-gray-800/30 bg-white/6 dark:bg-gray-900/6">
              <button
                onClick={() => setIsGroupView(false)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
                  !isGroupView
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow"
                    : "text-gray-300"
                }`}
              >
                Chats
              </button>
              <button
                onClick={() => setIsGroupView(true)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
                  isGroupView
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow"
                    : "text-gray-300"
                }`}
              >
                Groups
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isGroupView ? (
                <GroupChatSidebar
                  currentUser={currentUser}
                  onSelectGroup={(group) => handleSelectChat(null, group, true)}
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
          // Chat window screen (full screen on mobile; stays within layout on desktop)
          <div className="relative flex flex-col h-full">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200/6 dark:border-gray-800/30 bg-white/6 dark:bg-gray-900/6">
              <button
                onClick={handleBackToList}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white/8 dark:bg-gray-800/60 hover:bg-white/12 dark:hover:bg-gray-700/60 transition"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>

              <h2 className="text-lg font-semibold">
                {isGroupSelected ? selectedChat?.groupName : selectedChat?.name}
              </h2>
            </div>

            <div className="flex-1 overflow-hidden">
              <ChatWindow
                currentUser={currentUser}
                selectedChat={selectedChat}
                isGroup={isGroupSelected}
                onToggleGroupInfo={() => setShowGroupInfo((s) => !s)}
              />
            </div>

            {/* group info drawer (desktop only visual) */}
            {isGroupSelected && (
              <div
                className={`absolute top-0 right-0 h-full w-96 bg-white/95 dark:bg-gray-900/95 shadow-2xl border-l border-gray-200/6 dark:border-gray-800/30 transform transition-transform duration-300 ${
                  showGroupInfo ? "translate-x-0" : "translate-x-full"
                }`}
              >
                <div className="p-4">
                  <button
                    onClick={() => setShowGroupInfo(false)}
                    className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
                <div className="h-[calc(100%-64px)] overflow-y-auto p-4">
                  <GroupChatAdminPanel
                    group={selectedChat}
                    currentUser={currentUser}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ChatPage;
