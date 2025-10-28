import {
  MessageCircle,
  Users,
  Settings,
  User,
  GamepadIcon,
  Plus,
  Menu,
  X,
  Home,
  Compass,
  Camera,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

// ✅ Initialize socket with backend URL from Vite environment variable
const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,
  transports: ["websocket"],
});

const navigation = [
  { name: "Home", href: "/", icon: Home, badge: "New", color: "from-blue-500 to-cyan-500" },
  { name: "Chats", href: "/chat", icon: MessageCircle, badge: "Live", color: "from-purple-500 to-pink-500" },
  { name: "Games", href: "/Games", icon: GamepadIcon, badge: "Hot", color: "from-orange-500 to-red-500" },
  { name: "Status", href: "/user/status", icon: Camera, badge: "24h", color: "from-green-500 to-emerald-500" },
  { name: "Friends", href: "/friends", icon: Users, badge: "Social", color: "from-indigo-500 to-blue-500" },
  { name: "Explore", href: "/explore", icon: Compass, badge: "Trend", color: "from-yellow-500 to-orange-500" },
  { name: "Profile", href: "/chat/profile", icon: User, color: "from-gray-600 to-gray-700" },
  { name: "Settings", href: "/setting", icon: Settings, color: "from-slate-600 to-slate-700" },
];

const ChatSidebar = () => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const sidebarRef = useRef(null);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? "hidden" : "auto";
  }, [isMobileOpen]);

  // Close sidebar when clicking outside (on mobile)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setIsMobileOpen(false);
      }
    };
    if (isMobileOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileOpen]);

  const closeSidebar = () => setIsMobileOpen(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-6 left-6 z-50 w-14 h-14 bg-gradient-to-br from-purple-500/90 to-pink-500/90 rounded-2xl flex items-center justify-center shadow-2xl"
      >
        <Menu className="w-6 h-6 text-white" />
      </motion.button>

      {/* Desktop Sidebar */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
        className="hidden lg:flex fixed left-0 top-0 h-full w-24 bg-gradient-to-b from-slate-50/80 via-white/60 to-white/40 dark:from-gray-900/90 dark:via-gray-800/80 dark:to-gray-900/90 backdrop-blur-2xl border-r border-white/20 dark:border-gray-700/30 flex-col items-center py-8 gap-3 z-40 shadow-2xl"
      >
        {/* Logo */}
        <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-2xl">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.nav variants={containerVariants} initial="hidden" animate="visible" className="flex-1 flex flex-col gap-4 w-full px-3">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            return (
              <motion.div key={item.name} variants={itemVariants}>
                <Link
                  to={item.href}
                  onClick={() => {
                    if (item.name === "Home") {
                      socket.emit("userlogout"); // ✅ emit logout event
                    }
                  }}
                  className={cn(
                    "relative w-full aspect-square rounded-2xl flex items-center justify-center transition-all duration-500 overflow-hidden",
                    isActive
                      ? `bg-gradient-to-br ${item.color} shadow-2xl`
                      : "bg-white/50 dark:bg-gray-800/50 border border-white/30 hover:shadow-xl hover:scale-110"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-6 h-6 transition-all duration-300 relative z-10",
                      isActive ? "text-white scale-110" : "text-gray-600 dark:text-gray-400"
                    )}
                  />
                </Link>
              </motion.div>
            );
          })}
        </motion.nav>

        {/* Add Chat Button */}
        <motion.button
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 flex items-center justify-center shadow-2xl"
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </motion.div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSidebar}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              ref={sidebarRef}
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="fixed left-0 top-0 h-full w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col z-50 shadow-2xl"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">FlowLink</h1>
                <button onClick={closeSidebar}>
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <motion.nav variants={containerVariants} initial="hidden" animate="visible" className="p-4 space-y-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <motion.div key={item.name} variants={itemVariants}>
                      <Link
                        to={item.href}
                        onClick={() => {
                          if (item.name === "Home") {
                            socket.emit("userlogout"); // ✅ mobile logout too
                          }
                          closeSidebar();
                        }}
                        className={cn(
                          "group flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-500",
                          isActive
                            ? `bg-gradient-to-r ${item.color} shadow-2xl text-white`
                            : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                        {item.badge && (
                          <span className="ml-auto px-2 py-1 text-xs rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatSidebar;
