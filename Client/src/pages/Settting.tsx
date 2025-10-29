import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/ttabs";
import { getToken } from "@/utils/getToken";
import axios from "axios";
import {
  Settings2,
  ArrowLeft,
  User,
  Palette,
  Shield,
  Bell,
  Lock,
  Sparkles,
  Download,
  LogOut,
  Camera,
  Trash2,
  Eye,
  Key,
  Bot,
  Zap,
  Database,
  CheckCircle2,
  Sun,
  Moon,
  Laptop,
  Volume2
} from "lucide-react";

const SettingsPanel = ({ currentUser }) => {
  const navigate = useNavigate();
  const token = getToken();
  const systemPrefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const [darkMode, setDarkMode] = useState(systemPrefersDark);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showPassword, setShowPassword] = useState(false);
  const [preview, setPreview] = useState({
    profile: "/default-avatar.png",
    cover: "/default-cover.jpg",
  });

  const [settings, setSettings] = useState({
    name: "",
    email: "",
    bio: "",
    theme: systemPrefersDark ? "dark" : "light",
    aiThemeEnabled: false,
    notifications: true,
    soundEnabled: true,
    messagePreview: true,
    isTwoFactorEnabled: false,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/user/get-settings`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = res.data;
        setSettings((prev) => ({ ...prev, ...data }));
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, [token]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const handleChange = (key, val) =>
    setSettings((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/user/update-settings`,
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTimeout(() => setSaving(false), 1500);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update settings.");
      setSaving(false);
    }
  };

  const tabConfig = [
    { id: "profile", label: "Profile", icon: User },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "privacy", label: "Privacy", icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900/20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/chat")}
              className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-white/70 dark:hover:bg-gray-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">Back to Chat</span>
            </button>
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-indigo-500" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Settings
              </h1>
            </div>
          </div>
          <Badge variant="secondary" className="hidden sm:flex">
            <Sparkles className="w-3 h-3 mr-1" /> Pro
          </Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Tabs */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
                <CardContent className="p-4">
                  <TabsList className="grid grid-cols-2 lg:grid-cols-1 gap-2 w-full">
                    {tabConfig.map((tab) => (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                          activeTab === tab.id
                            ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                        }`}
                      >
                        <tab.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{tab.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {/* Quick Actions */}
                  <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                    <Button variant="outline" className="w-full justify-start gap-3 mb-3">
                      <Download className="w-4 h-4" /> Export Data
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 text-red-500 hover:text-red-700"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <Card className="bg-white/80 dark:bg-gray-800/80 shadow-xl">
                <CardContent className="p-6">
                  <AnimatePresence mode="wait">
                    {/* PROFILE TAB */}
                    <TabsContent value="profile">
                      <motion.div
                        key="profile"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                          <User className="w-5 h-5 text-blue-500" /> Profile Settings
                        </h2>
                        <Input
                          placeholder="Your Name"
                          value={settings.name}
                          onChange={(e) => handleChange("name", e.target.value)}
                          className="mb-3"
                        />
                        <Textarea
                          placeholder="Your Bio"
                          value={settings.bio}
                          onChange={(e) => handleChange("bio", e.target.value)}
                        />
                      </motion.div>
                    </TabsContent>

                    {/* APPEARANCE TAB */}
                    <TabsContent value="appearance">
                      <motion.div
                        key="appearance"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                          <Palette className="w-5 h-5 text-purple-500" /> Appearance
                        </h2>
                        <Button onClick={() => setDarkMode(!darkMode)}>
                          Toggle {darkMode ? "Light" : "Dark"} Mode
                        </Button>
                      </motion.div>
                    </TabsContent>
                  </AnimatePresence>

                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      id="save-btn"
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPanel;
