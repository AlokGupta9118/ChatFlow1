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
  { name: "Games", href: "/Games", icon: GamepadIcon },
  { name: "Status", href: "/user/status", icon: Clock },
  { name: "Friends", href: "/friends", icon: Users },
  { name: "Profile", href: "/chat/profile", icon: User },
  { name: "Settings", href: "/setting", icon: Settings },
];

const ChatSidebar = () => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Disable scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? "hidden" : "auto";
  }, [isMobileOpen]);

  const closeSidebar = () => setIsMobileOpen(false);

  return (
    <>
      {/* ✅ Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-gray-200/50 dark:border-gray-700/50"
      >
        <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
      </button>

      {/* ✅ Desktop Sidebar (Always Visible) */}
      <div className="hidden lg:flex fixed left-0 top-0 h-full w-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 flex-col items-center py-6 gap-2 z-30 shadow-xl">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/25 relative overflow-hidden"
        >
          <MessageCircle className="w-7 h-7 text-white z-10" />
          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
        </motion.div>

        {/* Navigation Icons */}
        <nav className="flex-1 flex flex-col gap-3">
          {navigation.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.href}
                  onClick={closeSidebar}
                  className={cn(
                    "relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group",
                    isActive
                      ? "bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/25"
                      : "bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/50 hover:shadow-md hover:scale-105"
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
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-l-full"
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Add New Chat Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300"
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      {/* ✅ Mobile Fullscreen Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={closeSidebar}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Sidebar Content */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="fixed left-0 top-0 h-full w-72 bg-white dark:bg-gray-900 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col py-6 gap-2 z-50 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 relative overflow-hidden"
                >
                  <MessageCircle className="w-7 h-7 text-white z-10" />
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </motion.div>
                <button
                  onClick={closeSidebar}
                  className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Navigation (Text + Icons) */}
              <nav className="flex-1 flex flex-col gap-3 px-4">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={closeSidebar}
                      className={cn(
                        "flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300",
                        isActive
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/25"
                          : "bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/50 hover:shadow-md"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-6 h-6",
                          isActive ? "text-white" : "text-gray-600 dark:text-gray-400"
                        )}
                      />
                      <span
                        className={cn(
                          "font-medium",
                          isActive ? "text-white" : "text-gray-600 dark:text-gray-400"
                        )}
                      >
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </nav>

              {/* New Chat Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="mx-4 mb-4 flex items-center gap-4 px-4 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300"
              >
                <Plus className="w-6 h-6 text-white" />
                <span className="font-medium text-white">New Chat</span>
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatSidebar;
