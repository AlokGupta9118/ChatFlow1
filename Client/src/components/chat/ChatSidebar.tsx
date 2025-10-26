import { MessageCircle, Users, Clock, Settings, User, GamepadIcon, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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

  return (
    <div className="w-20 h-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col items-center py-6 gap-2 relative overflow-hidden shadow-xl">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-300/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-indigo-300/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>

      {/* Enhanced Logo */}
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
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to={item.href}
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
                    isActive ? "text-white" : "text-gray-600 dark:text-gray-400 group-hover:text-indigo-500"
                  )}
                />
                
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-l-full"
                  />
                )}

                {/* Tooltip */}
                <span className="absolute left-full ml-3 px-3 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-lg z-20">
                  {item.name}
                  <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-white/90 dark:border-l-gray-800/90"></div>
                </span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Create New Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300 group relative"
      >
        <Plus className="w-6 h-6 text-white" />
        <span className="absolute left-full ml-3 px-3 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-lg z-20">
          New Chat
          <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-white/90 dark:border-l-gray-800/90"></div>
        </span>
      </motion.button>
    </div>
  );
};

export default ChatSidebar;
