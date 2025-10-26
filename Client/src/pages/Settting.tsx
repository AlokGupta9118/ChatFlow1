import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";

const SettingsPanel = ({ currentUser }) => {
  const token = getToken();
  const systemPrefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const [darkMode, setDarkMode] = useState(systemPrefersDark);
  const [saving, setSaving] = useState(false);
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
  });

  // Fetch user settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(
          "${import.meta.env.VITE_API_URL}/api/user/get-settings",
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

  // Auto system theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => settings.theme === "system" && setDarkMode(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [settings.theme]);

  const handleChange = (key, val) =>
    setSettings((prev) => ({ ...prev, [key]: val }));

  // Save settings
  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        "${import.meta.env.VITE_API_URL}/api/user/update-settings",
        settings,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("✅ Settings updated successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update settings.");
    } finally {
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

      // Update preview AND settings state
      setPreview((prev) => ({ ...prev, [type]: url }));
      if (type === "profile") handleChange("profilePicture", url);
      else if (type === "cover") handleChange("coverPhoto", url);

      alert(`✅ ${type === "profile" ? "Profile" : "Cover"} image updated!`);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("❌ Upload failed!");
    }
  };

  // UI classes
  const base = darkMode
    ? "bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white"
    : "bg-gradient-to-br from-gray-700 via-gray-600 to-gray-800 text-white";

  const card =
    "bg-white/10 dark:bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 transition hover:shadow-lg hover:shadow-blue-500/20";

  return (
    <div className={`min-h-screen py-12 px-6 transition-colors ${base}`}>
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto p-10 rounded-3xl shadow-2xl bg-white/5 dark:bg-white/10 backdrop-blur-2xl border border-white/10"
      >
        <h2 className="text-4xl font-bold mb-10 flex items-center gap-3">
          <Settings2 className="text-blue-400" size={32} /> Settings & Preferences
        </h2>

        {/* PROFILE */}
        <section className={`${card} mb-10`}>
          <h3 className="text-2xl font-semibold mb-4">Profile</h3>
          <div className="relative w-full h-48 rounded-xl overflow-hidden mb-6">
            <img
              src={preview.cover}
              alt="Cover"
              className="object-cover w-full h-full"
            />
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition cursor-pointer">
              <Upload size={24} />
              <input
                type="file"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "cover")}
              />
            </label>
          </div>

          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              <img
                src={preview.profile}
                alt="Profile"
                className="w-24 h-24 rounded-full border-4 border-blue-400 object-cover shadow-lg"
              />
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 rounded-full cursor-pointer transition">
                <Upload size={20} />
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "profile")}
                />
              </label>
            </div>
            <div className="flex-1">
              <Input
                value={settings.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Display Name"
                className="mb-3 bg-white/10 border-none text-white"
              />
              <Textarea
                value={settings.bio}
                onChange={(e) => handleChange("bio", e.target.value)}
                placeholder="Bio"
                className="bg-white/10 border-none text-white"
              />
            </div>
          </div>
        </section>

        {/* THEME & DISPLAY */}
        <section className={`${card} mb-10`}>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Monitor className="text-green-400" /> Display & Theme
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => {
                  const val = e.target.value;
                  handleChange("theme", val);
                  if (val === "dark") setDarkMode(true);
                  else if (val === "light") setDarkMode(false);
                  else setDarkMode(systemPrefersDark);
                }}
                className="w-full bg-white/10 border-none rounded-lg p-2 text-white"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block mb-1">Language</label>
              <select
                value={settings.language}
                onChange={(e) => handleChange("language", e.target.value)}
                className="w-full bg-white/10 border-none rounded-lg p-2 text-white"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Spanish">Spanish</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bot size={18} /> AI Chat Theme Personalization
            </span>
            <Switch
              checked={settings.aiThemeEnabled}
              onCheckedChange={(val) => handleChange("aiThemeEnabled", val)}
            />
          </div>
        </section>

        {/* STATUS & ACTIVITY */}
        <section className={`${card} mb-10`}>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="text-cyan-400" /> Status & Activity
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Status</label>
              <select
                value={settings.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full bg-white/10 border-none rounded-lg p-2 text-white"
              >
                <option value="online">Online</option>
                <option value="away">Away</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span>Auto Status (based on activity)</span>
              <Switch
                checked={settings.autoStatus}
                onCheckedChange={(val) => handleChange("autoStatus", val)}
              />
            </div>
          </div>
        </section>

        {/* SECURITY */}
        <section className={`${card} mb-10`}>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Lock className="text-yellow-400" /> Security
          </h3>
          <div className="flex items-center justify-between mb-3">
            <span>Two-Factor Authentication</span>
            <Switch
              checked={settings.isTwoFactorEnabled}
              onCheckedChange={(val) => handleChange("isTwoFactorEnabled", val)}
            />
          </div>
          <Button
            className="bg-white/10 mt-3"
            onClick={() => alert("Change Password flow")}
          >
            Change Password
          </Button>
        </section>

        {/* DATA & PRIVACY */}
        <section className={`${card} mb-10`}>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Database className="text-purple-400" /> Data & Privacy
          </h3>
          <Button
            variant="outline"
            className="bg-white/10 w-full mb-3"
            onClick={() => alert("Export data")}
          >
            Download Chat Data
          </Button>
          <Button
            variant="outline"
            className="bg-white/10 w-full"
            onClick={() => alert("View login history")}
          >
            View Login History
          </Button>
        </section>

        {/* DANGER */}
        <section className="bg-red-600/10 p-6 rounded-2xl border border-red-400/30 mb-10">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-400">
            <Trash2 /> Danger Zone
          </h3>
          <Button
            variant="destructive"
            className="w-full bg-red-600 hover:bg-red-700"
            onClick={() => alert("Delete account flow")}
          >
            Delete Account
          </Button>
        </section>

        {/* SAVE */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 text-lg bg-blue-500 hover:bg-blue-600"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </motion.div>
    </div>
  );
};

export default SettingsPanel;
