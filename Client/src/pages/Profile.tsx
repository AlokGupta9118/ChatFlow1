import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ChatSidebar from "@/components/chat/ChatSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Mail, Phone, MapPin, Calendar, Upload, ArrowLeft } from "lucide-react";
import { getToken } from "@/utils/getToken";
import { formatDistanceToNow } from "date-fns";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState("/default-avatar.png");

  const [form, setForm] = useState({
    name: "",
    bio: "",
    email: "",
    phone: "",
    location: "",
    birthday: "",
    profilePicture: "",
  });

  // Fetch profile from backend
  const fetchProfile = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api//user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data.user;

      // Build profile URL safely
      let profileUrl = "/default-avatar.png";
      if (data.profilePicture) {
        profileUrl = data.profilePicture.startsWith("http")
          ? data.profilePicture
          : `${import.meta.env.VITE_API_URL}${data.profilePicture.startsWith("/") ? "" : "/"}${data.profilePicture}`;
      }

      setUser(data);
      setForm({
        name: data.name || "",
        bio: data.bio || "",
        email: data.email || "",
        phone: data.phone || "",
        location: data.location || "",
        birthday: data.birthday?.split("T")[0] || "",
        profilePicture: profileUrl,
      });
      setPreview(profileUrl);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  // Save profile updates
  const handleSave = async () => {
    const token = getToken();
    if (!token) return;
    
    setSaving(true);
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/profile`,
        form,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const updatedUser = res.data.user;

      // Build updated profile URL
      let profileUrl = "/default-avatar.png";
      if (updatedUser.profilePicture) {
        profileUrl = updatedUser.profilePicture.startsWith("http")
          ? updatedUser.profilePicture
          : `${import.meta.env.VITE_API_URL}${updatedUser.profilePicture.startsWith("/") ? "" : "/"}${updatedUser.profilePicture}`;
      }

      setUser(updatedUser);
      setPreview(profileUrl);
      setForm((prev) => ({ ...prev, profilePicture: profileUrl }));
      alert("✅ Profile updated successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // Upload profile picture
  const handleProfileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    const token = getToken();
    if (!token) {
      alert('Please log in to upload profile picture');
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/user/upload-profile`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const imageUrl = res.data?.url;
      
      if (!imageUrl) {
        throw new Error('No URL returned from server');
      }

      let finalUrl;
      if (imageUrl.startsWith("http")) {
        finalUrl = imageUrl;
      } else {
        finalUrl = `${import.meta.env.VITE_API_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
      }

      setPreview(finalUrl);
      setForm((prev) => ({ ...prev, profilePicture: finalUrl }));
      setUser((prev) => ({ ...prev, profilePicture: finalUrl }));
      
      alert("✅ Profile picture updated!");
      e.target.value = '';
      
    } catch (err) {
      console.error('Upload error:', err);
      alert("❌ Failed to upload profile picture: " + (err.response?.data?.message || err.message));
    }
  };

  if (!user)
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Loading profile...
      </div>
    );

  const isOnline = user.status === "online";

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      <ChatSidebar />
      <div className="flex-1 overflow-y-auto">
        {/* Back Button */}
        <div className="absolute top-4 left-4 z-20 md:hidden">
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all border border-white/30"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        <div className="max-w-5xl mx-auto p-4 md:p-8 pt-16 md:pt-8">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold mb-2">Profile</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Manage your personal information and preferences
            </p>
          </div>

          <div className="p-4 md:p-8 rounded-3xl bg-card/50 backdrop-blur-lg border border-primary/10 shadow-xl mb-6">
            <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 mb-6 md:mb-8">
              <div className="relative group self-center">
                <Avatar className="w-24 h-24 md:w-32 md:h-32 ring-4 ring-accent">
                  <AvatarImage
                    src={preview}
                    onError={(e) => {
                      e.target.src = "/default-avatar.png";
                      setPreview("/default-avatar.png");
                    }}
                  />
                  <AvatarFallback>
                    {form.name ? form.name[0]?.toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Upload className="w-4 h-4 md:w-6 md:h-6 text-white" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleProfileUpload}
                  />
                </label>
                <span
                  className={`absolute bottom-1 right-1 md:bottom-2 md:right-2 w-4 h-4 md:w-6 md:h-6 rounded-full border-2 md:border-4 border-card ${
                    isOnline ? "bg-green-500" : "bg-gray-400"
                  }`}
                  title={
                    isOnline
                      ? "Online"
                      : `Last seen: ${formatDistanceToNow(
                          new Date(user.lastSeen || new Date())
                        )} ago`
                  }
                />
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center gap-2 mb-1">
                  <h2 className="text-xl md:text-2xl font-bold">{form.name}</h2>
                  <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-xs text-white rounded-full">
                    VIP
                  </span>
                </div>
                <p className="text-muted-foreground mb-4 text-sm md:text-base">
                  @{(form.name || '').toLowerCase().replace(/\s+/g, '')}
                </p>

                <div className="flex justify-center md:justify-start gap-4 md:gap-6 text-sm">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-accent text-base md:text-lg">
                      {user.friends?.length || 0}
                    </span>
                    <span className="text-muted-foreground text-xs">Friends</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-accent text-base md:text-lg">45</span>
                    <span className="text-muted-foreground text-xs">Groups</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-accent text-base md:text-lg">
                      {user.messages?.length || 0}
                    </span>
                    <span className="text-muted-foreground text-xs">Messages</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-accent text-base md:text-lg">
                      {user.stories?.length || 0}
                    </span>
                    <span className="text-muted-foreground text-xs">Stories</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <div className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm md:text-base">Full Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={handleInputChange}
                    className="bg-background/50 border-primary/20 text-sm md:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm md:text-base">Bio</Label>
                  <Textarea
                    id="bio"
                    value={form.bio}
                    onChange={handleInputChange}
                    className="bg-background/50 border-primary/20 min-h-[80px] md:min-h-[100px] text-sm md:text-base"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm md:text-base">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={handleInputChange}
                      className="pl-10 bg-background/50 border-primary/20 text-sm md:text-base"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm md:text-base">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleInputChange}
                      className="pl-10 bg-background/50 border-primary/20 text-sm md:text-base"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm md:text-base">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="location"
                      value={form.location}
                      onChange={handleInputChange}
                      className="pl-10 bg-background/50 border-primary/20 text-sm md:text-base"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthday" className="text-sm md:text-base">Birthday</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="birthday"
                      type="date"
                      value={form.birthday}
                      onChange={handleInputChange}
                      className="pl-10 bg-background/50 border-primary/20 text-sm md:text-base"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 flex-col sm:flex-row">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-gradient-primary hover:shadow-glow transition-all text-sm md:text-base"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  className="border-primary/20 hover:bg-card/60 text-sm md:text-base"
                  onClick={() => fetchProfile()}
                >
                  Cancel
                </Button>
              </div>
            </div>

            {/* Stories Section */}
            {user.stories && user.stories.length > 0 && (
              <div className="mt-6 md:mt-10">
                <h3 className="text-lg font-semibold mb-4">Stories</h3>
                <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2">
                  {user.stories.map((story, idx) => (
                    <div
                      key={idx}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden ring-2 ring-accent flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    >
                      <img
                        src={
                          story.mediaUrl && story.mediaUrl.startsWith("http")
                            ? story.mediaUrl
                            : `${import.meta.env.VITE_API_URL}${story.mediaUrl?.startsWith("/") ? "" : "/"}${story.mediaUrl || ''}`
                        }
                        alt="story"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = "/default-avatar.png";
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;