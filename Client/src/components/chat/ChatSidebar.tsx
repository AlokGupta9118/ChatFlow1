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

const ChatSidebar = ({ closeMenu, isInsideDrawer = false }) => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // 🧠 Handle open/close depending on usage context
  const openSidebar = () => {
    if (!isInsideDrawer) setIsMobileOpen(true);
  };

  const closeSidebar = () => {
    if (isInsideDrawer) closeMenu?.();
    else setIsMobileOpen(false);
  };

  useEffect(() => {
    if (!isInsideDrawer) {
      document.body.style.overflow = isMobileOpen ? "hidden" : "auto";
    }
  }, [isMobileOpen, isInsideDrawer]);

  return (
    <>
      {/* ✅ Mobile menu button (only if not inside a parent drawer) */}
      {!isInsideDrawer && (
        <button
          onClick={openSidebar}
          className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-gray-200/50 dark:border-gray-700/50"
        >
          <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </button>
      )}

      {/* ✅ Desktop Sidebar */}
      {!isInsideDrawer && (
        <div className="hidden lg:flex w-20 h-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 flex-col items-center py-6 gap-2 relative overflow-hidden shadow-xl">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/25 relative overflow-hidden"
          >
            <MessageCircle className="w-7 h-7 text-white z-10" />
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </motion.div>

          {/* Navigation */}
          <nav className="flex-1 flex flex-col gap-3 z-10">
            {navigation.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
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

          {/* New Chat Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300"
          >
            <Plus className="w-6 h-6 text-white" />
          </motion.button>
        </div>
      )}

      {/* ✅ Mobile Sidebar */}
      <AnimatePresence>
        {!isInsideDrawer && isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSidebar}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col py-6 gap-2 z-50 shadow-2xl"
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

              {/* Navigation Links */}
              <nav className="flex-1 flex flex-col gap-3 px-4">
                {navigation.map((item, index) => {
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
                className="mx-4 flex items-center gap-4 px-4 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300"
              >
                <Plus className="w-6 h-6 text-white" />
                <span className="font-medium text-white">New Chat</span>
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ✅ Compact version (for use inside external drawer) */}
      {isInsideDrawer && (
        <div className="flex flex-col h-full py-4 px-3 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
                💬
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  FlowLink
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Account
                </p>
              </div>
            </div>
            <button
              onClick={closeSidebar}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <nav className="flex flex-col gap-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={closeSidebar}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300",
                    isActive
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5",
                      isActive
                        ? "text-white"
                        : "text-gray-600 dark:text-gray-400"
                    )}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
};

export default ChatSidebar;
