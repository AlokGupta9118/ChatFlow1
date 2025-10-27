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
  Sparkles,
  Home,
  Zap,
  Crown,
  Bot,
  Palette,
  Music,
  Video,
  BookOpen,
  Camera,
  Star,
  Rocket,
  Compass,
  Heart,
  TrendingUp,
  Aperture,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

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

const premiumFeatures = [
  { name: "AI Assistant", icon: Bot, color: "from-purple-500 to-pink-500" },
  { name: "Themes", icon: Palette, color: "from-blue-500 to-cyan-500" },
  { name: "Music", icon: Music, color: "from-green-500 to-emerald-500" },
  { name: "Video", icon: Video, color: "from-orange-500 to-red-500" },
];

const ChatSidebar = () => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [activeSection, setActiveSection] = useState("main");
  const sidebarRef = useRef(null);

  // Disable scroll when mobile menu open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isMobileOpen]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsMobileOpen(false);
      }
    };

    if (isMobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileOpen]);

  const closeSidebar = () => setIsMobileOpen(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <>
      {/* 🎯 Enhanced Mobile Hamburger Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-6 left-6 z-50 w-14 h-14 bg-gradient-to-br from-purple-500/90 to-pink-500/90 backdrop-blur-2xl rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/30 border border-white/20"
      >
        <Menu className="w-6 h-6 text-white" />
        {/* Animated ping dot */}
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-lg"
        />
      </motion.button>

      {/* 💫 Enhanced Desktop Sidebar */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
        className="hidden lg:flex fixed left-0 top-0 h-full w-24 bg-gradient-to-b from-slate-50/80 via-white/60 to-white/40 dark:from-gray-900/90 dark:via-gray-800/80 dark:to-gray-900/90 backdrop-blur-2xl border-r border-white/20 dark:border-gray-700/30 flex-col items-center py-8 gap-3 z-40 shadow-2xl"
      >
        {/* Animated Logo */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="relative mb-8 group"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-purple-500/30 relative overflow-hidden">
            <MessageCircle className="w-7 h-7 text-white z-10" />
            {/* Animated background shine */}
            <motion.div
              animate={{ x: [-100, 300] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
            />
          </div>
          {/* Floating particles */}
          <motion.div
            animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full shadow-lg"
          />
        </motion.div>

        {/* Navigation Icons with Enhanced Effects */}
        <motion.nav
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 flex flex-col gap-4 w-full px-3"
        >
          {navigation.map((item, index) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <motion.div
                key={item.name}
                variants={itemVariants}
                onHoverStart={() => setHoveredItem(item.name)}
                onHoverEnd={() => setHoveredItem(null)}
                className="relative"
              >
                <Link
                  to={item.href}
                  className={cn(
                    "relative w-full aspect-square rounded-2xl flex items-center justify-center transition-all duration-500 group overflow-hidden",
                    isActive
                      ? `bg-gradient-to-br ${item.color} shadow-2xl`
                      : "bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700/30 hover:bg-white/80 dark:hover:bg-gray-700/50 hover:shadow-xl hover:scale-110"
                  )}
                >
                  {/* Background shine effect */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className={cn(
                      "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                      isActive ? "opacity-100" : ""
                    )}
                  >
                    <div className={`w-full h-full bg-gradient-to-br ${item.color} opacity-20`} />
                  </motion.div>

                  <Icon
                    className={cn(
                      "w-6 h-6 transition-all duration-300 relative z-10",
                      isActive
                        ? "text-white scale-110"
                        : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:scale-110"
                    )}
                  />

                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-l-full shadow-lg"
                    />
                  )}

                  {/* Badge */}
                  {item.badge && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-[10px] text-white font-bold shadow-lg"
                    >
                      {item.badge}
                    </motion.div>
                  )}

                  {/* Hover tooltip */}
                  <AnimatePresence>
                    {hoveredItem === item.name && !isActive && (
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="absolute left-full ml-3 px-3 py-2 bg-gray-900/90 backdrop-blur-sm text-white text-sm rounded-xl whitespace-nowrap z-50 shadow-2xl"
                      >
                        {item.name}
                        <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-0 border-r-4 border-r-gray-900/90 border-t-transparent border-b-transparent" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Link>
              </motion.div>
            );
          })}
        </motion.nav>

        {/* Premium Features Section */}
        <div className="w-full px-3 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mb-3"
          >
            <div className="w-8 h-8 mx-auto bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg mb-2">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
              PREMIUM
            </div>
          </motion.div>

          <div className="space-y-2">
            {premiumFeatures.slice(0, 2).map((feature, index) => (
              <motion.button
                key={feature.name}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-full aspect-square rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border border-white/30 dark:border-gray-700/30 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <feature.icon className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:scale-110 transition-transform" />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Enhanced Add New Chat Button */}
        <motion.button
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 flex items-center justify-center shadow-2xl shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-300 relative overflow-hidden group"
        >
          <Plus className="w-6 h-6 text-white z-10" />
          {/* Animated rings */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 border-2 border-white/30 rounded-2xl"
          />
        </motion.button>
      </motion.div>

      {/* ✨ Premium Mobile Fullscreen Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Enhanced Overlay with Gradient */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSidebar}
              className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-pink-900/20 backdrop-blur-3xl z-40"
            />

            {/* Sidebar Content */}
            <motion.div
              ref={sidebarRef}
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ 
                type: "spring", 
                damping: 30, 
                stiffness: 250,
                mass: 0.8
              }}
              className="fixed left-0 top-0 h-full w-80 bg-gradient-to-b from-slate-50/95 via-white/90 to-white/80 dark:from-gray-900/95 dark:via-gray-800/90 dark:to-gray-900/95 backdrop-blur-3xl border-r border-white/20 dark:border-gray-700/30 flex flex-col z-50 shadow-2xl"
            >
              {/* Enhanced Header */}
              <div className="p-6 border-b border-white/20 dark:border-gray-700/30">
                <div className="flex items-center justify-between mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-purple-500/30">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <motion.div
                        animate={{ 
                          scale: [1, 1.2, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-lg"
                      />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        FlowLink
                      </h1>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Connected & Secure
                      </p>
                    </div>
                  </motion.div>

                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={closeSidebar}
                    className="w-10 h-10 rounded-xl bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700/30 flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </motion.button>
                </div>

                {/* User Quick Info */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700/30 backdrop-blur-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      Welcome Back!
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Ready to connect?
                    </p>
                  </div>
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                </motion.div>
              </div>

              {/* Navigation Sections */}
              <div className="flex-1 overflow-y-auto">
                {/* Main Navigation */}
                <motion.nav
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="p-4 space-y-2"
                >
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;
                    
                    return (
                      <motion.div
                        key={item.name}
                        variants={itemVariants}
                      >
                        <Link
                          to={item.href}
                          onClick={closeSidebar}
                          className={cn(
                            "group flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-500 relative overflow-hidden",
                            isActive
                              ? `bg-gradient-to-r ${item.color} shadow-2xl text-white`
                              : "bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700/30 hover:bg-white/80 dark:hover:bg-gray-700/50 hover:shadow-xl"
                          )}
                        >
                          {/* Animated background */}
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className={cn(
                              "absolute inset-0 rounded-2xl transition-opacity duration-500",
                              isActive ? `bg-gradient-to-r ${item.color}` : "bg-gray-200/50 dark:bg-gray-700/50 opacity-0 group-hover:opacity-100"
                            )}
                          />
                          
                          <Icon className={cn(
                            "w-5 h-5 relative z-10 transition-transform duration-300",
                            isActive ? "text-white scale-110" : "text-gray-600 dark:text-gray-400 group-hover:scale-110"
                          )} />
                          
                          <span className={cn(
                            "font-medium relative z-10 transition-all duration-300",
                            isActive ? "text-white" : "text-gray-700 dark:text-gray-300"
                          )}>
                            {item.name}
                          </span>

                          {item.badge && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={cn(
                                "ml-auto px-2 py-1 rounded-full text-xs font-bold relative z-10",
                                isActive ? "bg-white/20 text-white" : "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                              )}
                            >
                              {item.badge}
                            </motion.span>
                          )}

                          {/* Hover arrow */}
                          <motion.div
                            initial={{ x: -10, opacity: 0 }}
                            whileHover={{ x: 0, opacity: 1 }}
                            className="absolute right-4 text-current opacity-0 group-hover:opacity-100 transition-all duration-300"
                          >
                            <Zap className="w-4 h-4" />
                          </motion.div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.nav>

                {/* Premium Features Grid */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-4 border-t border-white/20 dark:border-gray-700/30"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Premium Features
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {premiumFeatures.map((feature, index) => (
                      <motion.button
                        key={feature.name}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-lg hover:shadow-xl transition-all duration-300 text-xs font-medium flex items-center gap-2`}
                      >
                        <feature.icon className="w-4 h-4" />
                        {feature.name}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Enhanced New Chat Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="p-4 border-t border-white/20 dark:border-gray-700/30"
              >
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white font-semibold shadow-2xl shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group"
                >
                  <Plus className="w-5 h-5" />
                  <span>New Conversation</span>
                  <motion.div
                    animate={{ x: [-100, 300] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                  />
                </motion.button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatSidebar;