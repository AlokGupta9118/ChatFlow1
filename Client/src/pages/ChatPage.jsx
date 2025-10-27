import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";

const ChatPage = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Lock body scroll when sidebar is open (mobile)
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? "hidden" : "auto";
  }, [isMobileOpen]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-950 dark:to-black text-gray-900 dark:text-gray-200">
      
      {/* === Desktop Sidebar === */}
      <div className="hidden lg:block fixed top-0 left-0 h-full w-20 z-30 bg-gray-900/90 backdrop-blur-md">
        <ChatSidebar />
      </div>

      {/* === Mobile Sidebar Overlay === */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Dark backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setIsMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            {/* Sidebar sliding in */}
            <motion.div
              className="fixed top-0 left-0 h-full w-72 bg-gray-900 text-white shadow-xl z-50"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <ChatSidebar closeSidebar={() => setIsMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* === Main Chat Area === */}
      <div className="flex h-screen lg:pl-20 overflow-hidden">
        {/* === Chat List Panel === */}
        <div className="w-80 border-r border-gray-200/50 dark:border-gray-800/50 bg-white/60 dark:bg-gray-900/70 backdrop-blur-xl flex flex-col shadow-lg z-10 flex-shrink-0 h-full">
          <div className="flex justify-between items-center p-4">
            <h2 className="text-xl font-semibold text-purple-600 dark:text-purple-400">
              Messages
            </h2>
            {/* Mobile menu button */}
            <button
              className="lg:hidden text-gray-800 dark:text-gray-200 p-2 rounded-md hover:bg-gray-200/20"
              onClick={() => setIsMobileOpen(true)}
            >
              ☰
            </button>
          </div>

          {/* Scrollable Chat List */}
          <div className="overflow-y-auto flex-1 px-3 pb-4 space-y-3">
            {/* Example chat items */}
            {["AlokSingh", "Ansh Verma", "NewGroup1", "SpiderMan", "Alok's Room"].map((name, i) => (
              <div
                key={i}
                className="bg-gray-200/70 dark:bg-gray-800/70 p-3 rounded-xl shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center">
                  {name[0]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* === Chat Window === */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-white/40 via-blue-50/30 to-purple-50/20 dark:from-gray-900/40 dark:via-gray-800/30 dark:to-purple-900/20 backdrop-blur-sm overflow-hidden min-h-0 relative">
          <ChatWindow />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
