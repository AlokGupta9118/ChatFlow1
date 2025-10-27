import {
  MessageCircle,
  Users,
  Clock,
  Settings,
  User,
  GamepadIcon,
  Plus,
  Menu,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const navigation = [
  { name: "Chats", href: "/chat", icon: MessageCircle },
  { name: "Games", href: "/games", icon: GamepadIcon },
  { name: "Status", href: "/user/status", icon: Clock },
  { name: "Friends", href: "/friends", icon: Users },
  { name: "Profile", href: "/chat/profile", icon: User },
  { name: "Settings", href: "/setting", icon: Settings },
];

const ChatSidebar = () => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? "hidden" : "auto";
  }, [isMobileOpen]);

  const closeSidebar = () => setIsMobileOpen(false);

  return (
    <>
      {/* ✅ Mobile menu toggle */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-11 h-11 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-md border border-gray-300/30"
      >
        <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* ✅ Desktop Sidebar */}
      <div className="hidden lg:flex w-20 h-screen bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 flex-col items-center py-6 gap-3 relative shadow-md">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-6"
        >
          <MessageCircle className="w-7 h-7 text-white" />
        </motion.div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-3">
          {navigation.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.href}
                  onClick={closeSidebar}
                  className={cn(
                    "relative w-14 h-14 flex items-center justify-center rounded-2xl transition-all duration-300 group",
                    isActive
                      ? "bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/25"
                      : "bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 hover:scale-105 hover:shadow-md"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-6 h-6 transition-colors duration-300",
                      isActive
                        ? "text-white"
                        : "text-gray-600 dark:text-gray-400 group-hover:text-indigo-500"
                    )}
                  />
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* New Chat */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-md"
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      {/* ✅ Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Background overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={closeSidebar}
              className="fixed inset-0 bg-black/40 z-40"
            />
            {/* Sidebar Drawer */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 w-72 h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-300/30 dark:border-gray-800/50 shadow-xl z-50 flex flex-col py-6"
            >
              <div className="flex items-center justify-between px-6 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    FlowLink
                  </h2>
                </div>
                <button
                  onClick={closeSidebar}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800"
                >
                  <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
              </div>

              <nav className="flex-1 flex flex-col gap-3 px-4">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={closeSidebar}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300",
                        isActive
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                          : "bg-white/50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-5 h-5",
                          isActive
                            ? "text-white"
                            : "text-gray-700 dark:text-gray-300"
                        )}
                      />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <motion.button
                whileTap={{ scale: 0.95 }}
                className="mx-4 flex items-center gap-3 px-4 py-3 mt-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-md text-white"
              >
                <Plus className="w-5 h-5" /> New Chat
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatSidebar;
