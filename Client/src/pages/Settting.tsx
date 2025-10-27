import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getToken } from "@/utils/getToken";
import axios from "axios";
import {
  Upload,
  Settings2,
  Lock,
  Monitor,
  Trash2,
  Database,
  Bot,
  Clock,
  ArrowLeft,
  User,
  Palette,
  Shield,
  Bell,
  Download,
  Eye,
  EyeOff,
  Key,
  LogOut,
  Smartphone,
  Globe,
  Zap,
  Sparkles,
  CheckCircle2,
  Camera,
  Image,
  Sun,
  Moon,
  Laptop
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
    language: "English",
    aiThemeEnabled: false,
    autoStatus: true,
    isTwoFactorEnabled: false,
    profilePicture: "",
    coverPhoto: "",
    status: "online",
    notifications: true,
    soundEnabled: true,
    messagePreview: true,
  });

  // Fetch user settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/user/get-settings`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = res.data;

        // Ensure full URLs
        const profileUrl = data.profilePicture
          ? data.profilePicture.startsWith("http")
            ? data.profilePicture
            : `${import.meta.env.VITE_API_URL}${data.profilePicture.startsWith("/") ? "" : "/"}${data.profilePicture}`
          : "/default-avatar.png";

        const coverUrl = data.coverPhoto
          ? data.coverPhoto.startsWith("http")
            ? data.coverPhoto
            : `${import.meta.env.VITE_API_URL}${data.coverPhoto.startsWith("/") ? "" : "/"}${data.coverPhoto}`
          : "/default-cover.jpg";

        // Update settings and preview
        setSettings((prev) => ({
          ...prev,
          ...data,
          profilePicture: profileUrl,
          coverPhoto: coverUrl,
        }));

        setPreview({
          profile: profileUrl,
          cover: coverUrl,
        });

        setDarkMode(data.theme === "dark");
        document.documentElement.classList.toggle("dark", data.theme === "dark");
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, [token]);

  // Sync dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const handleChange = (key, val) =>
    setSettings((prev) => ({ ...prev, [key]: val }));

  // Save settings
  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/user/update-settings`,
        settings,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // Show success animation
      const saveBtn = document.getElementById('save-btn');
      if (saveBtn) {
        saveBtn.innerHTML = '<CheckCircle2 className="w-5 h-5 mx-auto" />';
        setTimeout(() => {
          setSaving(false);
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update settings.");
      setSaving(false);
    }
  };

  // Upload profile or cover
  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/user/upload-${type}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const url = res.data.url.startsWith("http")
        ? res.data.url
        : `${import.meta.env.VITE_API_URL}${res.data.url.startsWith("/") ? "" : "/"}${res.data.url}`;

      setPreview((prev) => ({ ...prev, [type]: url }));
      if (type === "profile") handleChange("profilePicture", url);
      else if (type === "cover") handleChange("coverPhoto", url);

    } catch (err) {
      console.error("Upload failed:", err);
      alert("❌ Upload failed!");
    }
  };

  const tabConfig = [
    { id: "profile", label: "Profile", icon: User, color: "text-blue-400" },
    { id: "appearance", label: "Appearance", icon: Palette, color: "text-purple-400" },
    { id: "notifications", label: "Notifications", icon: Bell, color: "text-green-400" },
    { id: "security", label: "Security", icon: Shield, color: "text-yellow-400" },
    { id: "privacy", label: "Privacy", icon: Lock, color: "text-orange-400" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900/20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/chat')}
                className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/50 transition-all border border-gray-200/50 dark:border-gray-600/50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:block">Back to Chat</span>
              </button>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
                  <Settings2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                    Settings
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                    Manage your account preferences
                  </p>
                </div>
              </div>
            </div>

            <Badge variant="secondary" className="hidden sm:flex">
              <Sparkles className="w-3 h-3 mr-1" />
              Pro
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg sticky top-24">
              <CardContent className="p-4">
                <TabsList className="grid grid-cols-2 lg:grid-cols-1 gap-2 w-full">
                  {tabConfig.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                        activeTab === tab.id
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : tab.color}`} />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Quick Actions */}
                <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-3"
                    onClick={() => alert("Export data")}
                  >
                    <Download className="w-4 h-4" />
                    Export Data
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    onClick={() => alert("Logout")}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
              <CardContent className="p-6">
                <AnimatePresence mode="wait">
                  {/* PROFILE TAB */}
                  {activeTab === "profile" && (
                    <motion.div
                      key="profile"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <User className="w-6 h-6 text-blue-500" />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          Profile Settings
                        </h2>
                      </div>

                      {/* Cover Photo */}
                      <div className="relative rounded-2xl overflow-hidden group">
                        <img
                          src={preview.cover}
                          alt="Cover"
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <label className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-white/30 transition-colors">
                            <Camera className="w-4 h-4" />
                            Change Cover
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, "cover")}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Profile Picture & Basic Info */}
                      <div className="flex flex-col md:flex-row items-start gap-6">
                        <div className="relative group">
                          <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white dark:border-gray-800 shadow-2xl">
                            <img
                              src={preview.profile}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <label className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <Camera className="w-6 h-6 text-white" />
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, "profile")}
                            />
                          </label>
                        </div>

                        <div className="flex-1 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Display Name
                              </label>
                              <Input
                                value={settings.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                className="bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                                placeholder="Your name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Email Address
                              </label>
                              <Input
                                value={settings.email}
                                onChange={(e) => handleChange("email", e.target.value)}
                                className="bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                                type="email"
                                placeholder="your@email.com"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Bio
                            </label>
                            <Textarea
                              value={settings.bio}
                              onChange={(e) => handleChange("bio", e.target.value)}
                              className="bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 min-h-[100px]"
                              placeholder="Tell us about yourself..."
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* APPEARANCE TAB */}
                  {activeTab === "appearance" && (
                    <motion.div
                      key="appearance"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <Palette className="w-6 h-6 text-purple-500" />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          Appearance
                        </h2>
                      </div>

                      {/* Theme Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {[
                          { id: "light", label: "Light", icon: Sun, description: "Clean and bright" },
                          { id: "dark", label: "Dark", icon: Moon, description: "Easy on the eyes" },
                          { id: "system", label: "System", icon: Laptop, description: "Follows your device" },
                        ].map((theme) => (
                          <div
                            key={theme.id}
                            onClick={() => {
                              handleChange("theme", theme.id);
                              if (theme.id === "dark") setDarkMode(true);
                              else if (theme.id === "light") setDarkMode(false);
                            }}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              settings.theme === theme.id
                                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                                : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                            }`}
                          >
                            <theme.icon className={`w-8 h-8 mb-2 ${
                              settings.theme === theme.id ? "text-purple-500" : "text-gray-400"
                            }`} />
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              {theme.label}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {theme.description}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-gray-700/50">
                          <div className="flex items-center gap-3">
                            <Bot className="w-5 h-5 text-green-500" />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                AI Theme Personalization
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Let AI customize your theme based on usage
                              </div>
                            </div>
                          </div>
                          <Switch
                            checked={settings.aiThemeEnabled}
                            onCheckedChange={(val) => handleChange("aiThemeEnabled", val)}
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-gray-700/50">
                          <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-blue-500" />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                Performance Mode
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Optimize for better performance
                              </div>
                            </div>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* NOTIFICATIONS TAB */}
                  {activeTab === "notifications" && (
                    <motion.div
                      key="notifications"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <Bell className="w-6 h-6 text-green-500" />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          Notifications
                        </h2>
                      </div>

                      <div className="space-y-4">
                        {[
                          {
                            label: "Push Notifications",
                            description: "Receive notifications on your device",
                            checked: settings.notifications,
                            onChange: (val) => handleChange("notifications", val),
                            icon: Bell
                          },
                          {
                            label: "Sound Effects",
                            description: "Play sounds for new messages",
                            checked: settings.soundEnabled,
                            onChange: (val) => handleChange("soundEnabled", val),
                            icon: Volume2
                          },
                          {
                            label: "Message Previews",
                            description: "Show message content in notifications",
                            checked: settings.messagePreview,
                            onChange: (val) => handleChange("messagePreview", val),
                            icon: Eye
                          },
                          {
                            label: "Email Notifications",
                            description: "Receive important updates via email",
                            checked: true,
                            onChange: () => {},
                            icon: Download
                          }
                        ].map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-gray-700/50"
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className="w-5 h-5 text-blue-500" />
                              <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {item.label}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {item.description}
                                </div>
                              </div>
                            </div>
                            <Switch
                              checked={item.checked}
                              onCheckedChange={item.onChange}
                            />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* SECURITY TAB */}
                  {activeTab === "security" && (
                    <motion.div
                      key="security"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <Shield className="w-6 h-6 text-yellow-500" />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          Security
                        </h2>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-gray-700/50">
                          <div className="flex items-center gap-3">
                            <Key className="w-5 h-5 text-green-500" />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                Two-Factor Authentication
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Add an extra layer of security to your account
                              </div>
                            </div>
                          </div>
                          <Switch
                            checked={settings.isTwoFactorEnabled}
                            onCheckedChange={(val) => handleChange("isTwoFactorEnabled", val)}
                          />
                        </div>

                        <div className="p-4 rounded-xl bg-white/50 dark:bg-gray-700/50">
                          <div className="flex items-center gap-3 mb-4">
                            <Lock className="w-5 h-5 text-blue-500" />
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              Change Password
                            </div>
                          </div>
                          <div className="space-y-3">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Current Password"
                              className="bg-white dark:bg-gray-600"
                            />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="New Password"
                              className="bg-white dark:bg-gray-600"
                            />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Confirm New Password"
                              className="bg-white dark:bg-gray-600"
                            />
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={showPassword}
                                onCheckedChange={setShowPassword}
                              />
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                Show passwords
                              </span>
                            </div>
                          </div>
                          <Button className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-500">
                            Update Password
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* PRIVACY TAB */}
                  {activeTab === "privacy" && (
                    <motion.div
                      key="privacy"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <Lock className="w-6 h-6 text-orange-500" />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          Privacy & Data
                        </h2>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-white/50 dark:bg-gray-700/50">
                          <div className="flex items-center gap-3 mb-4">
                            <Database className="w-5 h-5 text-purple-500" />
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              Data Management
                            </div>
                          </div>
                          <div className="space-y-3">
                            <Button
                              variant="outline"
                              className="w-full justify-start gap-3"
                              onClick={() => alert("Export data")}
                            >
                              <Download className="w-4 h-4" />
                              Export Chat Data
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start gap-3"
                              onClick={() => alert("Clear data")}
                            >
                              <Trash2 className="w-4 h-4" />
                              Clear Chat History
                            </Button>
                          </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                          <div className="flex items-center gap-3 mb-4">
                            <Trash2 className="w-5 h-5 text-red-500" />
                            <div className="font-medium text-red-900 dark:text-red-100">
                              Danger Zone
                            </div>
                          </div>
                          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                            Once you delete your account, there is no going back. Please be certain.
                          </p>
                          <Button
                            variant="destructive"
                            className="w-full bg-red-600 hover:bg-red-700"
                            onClick={() => alert("Delete account flow")}
                          >
                            Delete Account
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Save Button */}
                <div className="mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                  <Button
                    id="save-btn"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3 text-base bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all"
                    size="lg"
                  >
                    {saving ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving Changes...
                      </div>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;