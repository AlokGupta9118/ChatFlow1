import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { 
  UserPlus, 
  Users, 
  Inbox, 
  SendHorizonal, 
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Shield,
  Heart,
  X,
  Calendar,
  MapPin,
  Phone,
  Mail
} from "lucide-react";
import { getToken } from "@/utils/getToken";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface IUser {
  _id: string;
  name: string;
  email?: string;
  profilePicture?: string;
  bio?: string;
  phone?: string;
  location?: string;
  birthday?: string;
  status?: string;
  lastSeen?: string;
  isOnline?: boolean;
  joinedAt?: string;
  friends?: IUser[];
  stories?: any[];
}

interface IFriendsData {
  friends: IUser[];
  incomingRequests: IUser[];
  outgoingRequests: IUser[];
}

interface IProfile {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  phone?: string;
  location?: string;
  birthday?: string;
  status: string;
  lastSeen: string;
  friends: IUser[];
  stories: any[];
  isOnline: boolean;
  joinedAt: string;
}

// EXACT SAME LOGIC AS PROFILE.TSX
const buildImageUrl = (imagePath: string | undefined | null): string => {
  if (!imagePath) return "/default-avatar.png";
  if (imagePath.startsWith("http")) {
    return imagePath;
  }
  return `${import.meta.env.VITE_API_URL}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
};

const AddFriends: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<IUser[]>([]);
  const [friendsData, setFriendsData] = useState<IFriendsData>({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<IProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const token = getToken();
  const userData = localStorage.getItem("user");
  const currentUserId = userData ? JSON.parse(userData)._id : null;

  const axiosConfig = {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users`, axiosConfig);
      const allUsers = res.data.users || res.data || [];
      
      // Process users with proper image URLs (EXACTLY like profile.tsx)
      const processedUsers = allUsers.filter((u: IUser) => u._id !== currentUserId).map((user: IUser) => ({
        ...user,
        profilePicture: buildImageUrl(user.profilePicture)
      }));
      
      setUsers(processedUsers);
    } catch (err) {
      console.error("❌ Error fetching users:", err);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/friends`, axiosConfig);
      const data = res.data || {};
      
      // Process all user data with image URLs
      const processUserData = (userArray: IUser[]) => {
        return userArray.filter((f: IUser) => f._id !== currentUserId).map((user: IUser) => ({
          ...user,
          profilePicture: buildImageUrl(user.profilePicture)
        }));
      };

      setFriendsData({
        friends: processUserData(data.friends || []),
        incomingRequests: processUserData(data.incomingRequests || []),
        outgoingRequests: processUserData(data.outgoingRequests || []),
      });
    } catch (err) {
      console.error("❌ Error fetching friends data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/other/profile/${userId}`,
        axiosConfig
      );
      
      const userData = res.data.user;
      
      // Use EXACT same logic as profile.tsx
      let profileUrl = "/default-avatar.png";
      if (userData.profilePicture) {
        profileUrl = userData.profilePicture.startsWith("http")
          ? userData.profilePicture
          : `${import.meta.env.VITE_API_URL}${userData.profilePicture.startsWith("/") ? "" : "/"}${userData.profilePicture}`;
      }

      const processedUser = {
        ...userData,
        profilePicture: profileUrl,
        friends: (userData.friends || []).map((friend: any) => {
          let friendProfileUrl = "/default-avatar.png";
          if (friend.profilePicture) {
            friendProfileUrl = friend.profilePicture.startsWith("http")
              ? friend.profilePicture
              : `${import.meta.env.VITE_API_URL}${friend.profilePicture.startsWith("/") ? "" : "/"}${friend.profilePicture}`;
          }
          return {
            ...friend,
            profilePicture: friendProfileUrl
          };
        })
      };

      console.log('Processed User:', processedUser);
      setSelectedUser(processedUser);
    } catch (err: any) {
      console.error("❌ Error fetching user profile:", err);
      
      // Enhanced fallback with profile.tsx logic
      const allUsers = [...users, ...friendsData.friends, ...friendsData.incomingRequests, ...friendsData.outgoingRequests];
      const user = allUsers.find(u => u._id === userId);
      
      if (user) {
        let profileUrl = "/default-avatar.png";
        if (user.profilePicture) {
          profileUrl = user.profilePicture.startsWith("http")
            ? user.profilePicture
            : `${import.meta.env.VITE_API_URL}${user.profilePicture.startsWith("api/pfp") ? "" : "/"}${user.profilePicture}`;
        }

        const fallbackUser: IProfile = {
          _id: user._id,
          name: user.name,
          email: user.email || "email@example.com",
          profilePicture: profileUrl,
          bio: user.bio || '',
          phone: user.phone || '',
          location: user.location || '',
          birthday: user.birthday || '',
          status: user.status || 'offline',
          lastSeen: user.lastSeen || new Date().toISOString(),
          friends: (user.friends || []).map((f: any) => {
            let friendProfileUrl = "/default-avatar.png";
            if (f.profilePicture) {
              friendProfileUrl = f.profilePicture.startsWith("http")
                ? f.profilePicture
                : `${import.meta.env.VITE_API_URL}${f.profilePicture.startsWith("/") ? "" : "/"}${f.profilePicture}`;
            }
            return {
              ...f,
              profilePicture: friendProfileUrl
            };
          }),
          stories: user.stories || [],
          isOnline: user.isOnline || false,
          joinedAt: user.joinedAt || new Date().toISOString()
        };
        setSelectedUser(fallbackUser);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      console.warn("⚠️ No token found!");
      setLoading(false);
      return;
    }
    fetchUsers();
    fetchFriends();
  }, []);

  const handleSendRequest = async (userId: string) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/friends/request/${userId}`,
        {},
        axiosConfig
      );
      // Update UI immediately
      setFriendsData(prev => ({
        ...prev,
        outgoingRequests: [...prev.outgoingRequests, users.find(u => u._id === userId)!]
      }));
      setUsers(prev => prev.filter(u => u._id !== userId));
    } catch (err) {
      console.error("❌ Error sending request:", err);
    }
  };

  const handleAcceptRequest = async (userId: string) => {
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/friends/accept/${userId}`,
        {},
        axiosConfig
      );
      // Update UI immediately
      const acceptedUser = friendsData.incomingRequests.find(u => u._id === userId);
      setFriendsData(prev => ({
        ...prev,
        friends: [...prev.friends, acceptedUser!],
        incomingRequests: prev.incomingRequests.filter(u => u._id !== userId)
      }));
    } catch (err) {
      console.error("❌ Error accepting request:", err);
    }
  };

  const handleDeclineRequest = async (userId: string) => {
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/friends/decline/${userId}`,
        {},
        axiosConfig
      );
      // Update UI immediately
      setFriendsData(prev => ({
        ...prev,
        incomingRequests: prev.incomingRequests.filter(u => u._id !== userId)
      }));
    } catch (err) {
      console.error("❌ Error declining request:", err);
    }
  };

  const handleViewProfile = (user: IUser) => {
    fetchUserProfile(user._id);
  };

  const handleCloseProfile = () => {
    setSelectedUser(null);
  };

  // Filter users based on search query
  const filteredAvailableToAdd = users.filter(
    (user) =>
      user._id !== currentUserId &&
      !friendsData.friends.some((f) => f._id === user._id) &&
      !friendsData.incomingRequests.some((f) => f._id === user._id) &&
      !friendsData.outgoingRequests.some((f) => f._id === user._id) &&
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFriends = friendsData.friends.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredIncoming = friendsData.incomingRequests.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOutgoing = friendsData.outgoingRequests.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-200 text-lg">Loading your friends network...</p>
        </div>
      </div>
    );
  }

  const Section: React.FC<{ 
    title: string; 
    icon: JSX.Element; 
    count: number;
    gradient: string;
    children: React.ReactNode 
  }> = ({
    title,
    icon,
    count,
    gradient,
    children,
  }) => (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/20 hover:border-white/30 transition-all duration-300"
    >
      <div className={`flex items-center justify-between mb-6 p-4 rounded-2xl ${gradient}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            {icon}
          </div>
          <span className="text-xl font-bold text-white">{title}</span>
        </div>
        <div className="bg-white/30 px-3 py-1 rounded-full">
          <span className="text-white font-bold text-sm">{count}</span>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </motion.section>
  );

  const FriendCard: React.FC<{ 
    user: IUser; 
    status: "friend" | "incoming" | "outgoing" | "discover";
    actions?: React.ReactNode;
    highlight?: boolean;
  }> = ({ user, status, actions, highlight = false }) => {
    const statusConfig = {
      friend: { color: "from-emerald-500 to-green-500", icon: <Shield className="w-4 h-4" />, text: "Friend" },
      incoming: { color: "from-amber-500 to-orange-500", icon: <Clock className="w-4 h-4" />, text: "Incoming" },
      outgoing: { color: "from-blue-500 to-cyan-500", icon: <SendHorizonal className="w-4 h-4" />, text: "Pending" },
      discover: { color: "from-purple-500 to-pink-500", icon: <UserPlus className="w-4 h-4" />, text: "Add Friend" }
    };

    const config = statusConfig[status];

    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
          highlight 
            ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/50 shadow-lg" 
            : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
        }`}
        onClick={() => handleViewProfile(user)}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            {/* USE AVATAR COMPONENT EXACTLY LIKE PROFILE.TSX */}
            <Avatar className="w-12 h-12 rounded-2xl border-2 border-white/20 shadow-lg">
              <AvatarImage
                src={user.profilePicture}
                alt={user.name}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/default-avatar.png";
                }}
              />
              <AvatarFallback className="rounded-2xl bg-white/20 text-white font-semibold">
                {user.name ? user.name[0]?.toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            {status === "friend" && (
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 border-2 border-white">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div>
            <span className="font-semibold text-white text-lg block">{user.name}</span>
            <div className="flex items-center gap-1 mt-1">
              <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${config.color} text-white font-medium`}>
                {config.text}
              </span>
            </div>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      </motion.div>
    );
  };

  const ProfileDrawer: React.FC = () => {
    if (!selectedUser) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleCloseProfile}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-3xl shadow-2xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {profileLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="relative">
                <div className="h-48 bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-3xl"></div>
                <button
                  onClick={handleCloseProfile}
                  className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
                
                <div className="absolute -bottom-12 left-8">
                  {/* USE AVATAR COMPONENT EXACTLY LIKE PROFILE.TSX */}
                  <Avatar className="w-24 h-24 rounded-3xl border-4 border-white/20 shadow-2xl">
                    <AvatarImage
                      src={selectedUser.profilePicture}
                      alt={selectedUser.name}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/default-avatar.png";
                      }}
                    />
                    <AvatarFallback className="rounded-3xl text-2xl bg-white/20 text-white font-bold">
                      {selectedUser.name ? selectedUser.name[0]?.toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* Content */}
              <div className="pt-16 p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">{selectedUser.name}</h2>
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-3 h-3 rounded-full ${selectedUser.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      <span className="text-white/70 text-sm">
                        {selectedUser.isOnline ? 'Online' : `Last seen ${new Date(selectedUser.lastSeen).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {!friendsData.friends.some(f => f._id === selectedUser._id) &&
                     !friendsData.outgoingRequests.some(f => f._id === selectedUser._id) &&
                     !friendsData.incomingRequests.some(f => f._id === selectedUser._id) && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSendRequest(selectedUser._id)}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-xl text-white font-semibold flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add Friend
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {selectedUser.bio && (
                  <div className="mb-6">
                    <p className="text-white/80 text-lg leading-relaxed">{selectedUser.bio}</p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="text-center bg-white/10 rounded-2xl p-4">
                    <div className="text-2xl font-bold text-white">{selectedUser.friends?.length || 0}</div>
                    <div className="text-white/70 text-sm">Friends</div>
                  </div>
                  <div className="text-center bg-white/10 rounded-2xl p-4">
                    <div className="text-2xl font-bold text-white">{selectedUser.stories?.length || 0}</div>
                    <div className="text-white/70 text-sm">Stories</div>
                  </div>
                  <div className="text-center bg-white/10 rounded-2xl p-4">
                    <div className="text-2xl font-bold text-white">
                      {selectedUser.joinedAt ? new Date(selectedUser.joinedAt).getFullYear() : 'N/A'}
                    </div>
                    <div className="text-white/70 text-sm">Joined</div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  {selectedUser.email && (
                    <div className="flex items-center gap-3 text-white/80">
                      <Mail className="w-5 h-5 text-purple-400" />
                      <span>{selectedUser.email}</span>
                    </div>
                  )}
                  
                  {selectedUser.phone && (
                    <div className="flex items-center gap-3 text-white/80">
                      <Phone className="w-5 h-5 text-green-400" />
                      <span>{selectedUser.phone}</span>
                    </div>
                  )}
                  
                  {selectedUser.location && (
                    <div className="flex items-center gap-3 text-white/80">
                      <MapPin className="w-5 h-5 text-red-400" />
                      <span>{selectedUser.location}</span>
                    </div>
                  )}
                  
                  {selectedUser.birthday && (
                    <div className="flex items-center gap-3 text-white/80">
                      <Calendar className="w-5 h-5 text-yellow-400" />
                      <span>{new Date(selectedUser.birthday).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Friends Preview */}
                {selectedUser.friends && selectedUser.friends.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-white mb-4">Friends ({selectedUser.friends.length})</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedUser.friends.slice(0, 6).map(friend => (
                        <div key={friend._id} className="text-center">
                          {/* USE AVATAR COMPONENT FOR FRIENDS TOO */}
                          <Avatar className="w-12 h-12 rounded-2xl mx-auto mb-2">
                            <AvatarImage
                              src={friend.profilePicture}
                              alt={friend.name}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/default-avatar.png";
                              }}
                            />
                            <AvatarFallback className="rounded-2xl bg-white/20 text-white text-xs">
                              {friend.name ? friend.name[0]?.toUpperCase() : 'F'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-white/70 text-sm block truncate">{friend.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Main Content Area with Scroll */}
      <div className="flex-1 overflow-y-auto">
        <motion.div
          className="min-h-full text-white py-8 px-4 md:px-8 lg:px-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header with Back Button and Search */}
          <div className="max-w-6xl mx-auto mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
              {/* Back Button */}
              <motion.button
                onClick={() => navigate('/chat')}
                className="flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20 transition-all border border-white/20 hover:border-white/30 group w-fit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-semibold">Back to Chat</span>
              </motion.button>

              {/* Search Bar */}
              <motion.div 
                className="relative w-full lg:w-96"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                />
              </motion.div>
            </div>

            {/* Main Title */}
            <motion.div
              className="text-center mb-12"
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
                Friends Network
              </h1>
              <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto">
                Connect, chat, and build your community with amazing people around you
              </p>
            </motion.div>
          </div>

          {/* Stats Overview */}
          <motion.div 
            className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl p-4 text-center backdrop-blur-md">
              <Users className="w-8 h-8 mx-auto mb-2 text-white" />
              <div className="text-2xl font-bold text-white">{friendsData.friends.length}</div>
              <div className="text-white/90 text-sm">Friends</div>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 text-center backdrop-blur-md">
              <Inbox className="w-8 h-8 mx-auto mb-2 text-white" />
              <div className="text-2xl font-bold text-white">{friendsData.incomingRequests.length}</div>
              <div className="text-white/90 text-sm">Requests</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-4 text-center backdrop-blur-md">
              <SendHorizonal className="w-8 h-8 mx-auto mb-2 text-white" />
              <div className="text-2xl font-bold text-white">{friendsData.outgoingRequests.length}</div>
              <div className="text-white/90 text-sm">Sent</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-4 text-center backdrop-blur-md">
              <UserPlus className="w-8 h-8 mx-auto mb-2 text-white" />
              <div className="text-2xl font-bold text-white">{filteredAvailableToAdd.length}</div>
              <div className="text-white/90 text-sm">Discover</div>
            </div>
          </motion.div>

          {/* Main Content Grid */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-8">
              {/* Friends Section */}
              <Section 
                title="Your Friends" 
                icon={<Users className="w-6 h-6" />}
                count={filteredFriends.length}
                gradient="bg-gradient-to-r from-emerald-500/80 to-green-500/80"
              >
                {filteredFriends.length > 0 ? (
                  filteredFriends.map((user) => (
                    <FriendCard 
                      key={user._id} 
                      user={user} 
                      status="friend"
                      actions={
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl border border-emerald-400/30 transition-all"
                            title="Message Friend"
                          >
                            <Heart className="w-4 h-4 text-emerald-300" />
                          </motion.button>
                        </div>
                      }
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    <p className="text-white/50 text-lg">No friends yet</p>
                    <p className="text-white/30 text-sm">Start adding friends to build your network!</p>
                  </div>
                )}
              </Section>

              {/* Incoming Requests */}
              <Section 
                title="Friend Requests" 
                icon={<Inbox className="w-6 h-6" />}
                count={filteredIncoming.length}
                gradient="bg-gradient-to-r from-amber-500/80 to-orange-500/80"
              >
                {filteredIncoming.length > 0 ? (
                  filteredIncoming.map((user) => (
                    <FriendCard
                      key={user._id}
                      user={user}
                      status="incoming"
                      highlight={true}
                      actions={
                        <div className="flex gap-2">
                          <motion.button
                            onClick={() => handleAcceptRequest(user._id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-xl text-white font-semibold flex items-center gap-2 transition-all shadow-lg"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Accept
                          </motion.button>
                          <motion.button
                            onClick={() => handleDeclineRequest(user._id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-red-500/20 hover:bg-red-500/30 px-4 py-2 rounded-xl text-red-300 font-semibold flex items-center gap-2 transition-all border border-red-400/30"
                          >
                            <XCircle className="w-4 h-4" />
                            Decline
                          </motion.button>
                        </div>
                      }
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Inbox className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    <p className="text-white/50 text-lg">No incoming requests</p>
                    <p className="text-white/30 text-sm">When someone sends you a request, it will appear here</p>
                  </div>
                )}
              </Section>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Sent Requests */}
              <Section 
                title="Sent Requests" 
                icon={<SendHorizonal className="w-6 h-6" />}
                count={filteredOutgoing.length}
                gradient="bg-gradient-to-r from-blue-500/80 to-cyan-500/80"
              >
                {filteredOutgoing.length > 0 ? (
                  filteredOutgoing.map((user) => (
                    <FriendCard 
                      key={user._id} 
                      user={user} 
                      status="outgoing"
                      actions={
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30"
                          title="Pending Request"
                        >
                          <Clock className="w-4 h-4 text-blue-300" />
                        </motion.button>
                      }
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <SendHorizonal className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    <p className="text-white/50 text-lg">No sent requests</p>
                    <p className="text-white/30 text-sm">Your sent friend requests will appear here</p>
                  </div>
                )}
              </Section>

              {/* Discover Users */}
              <Section 
                title="Discover People" 
                icon={<UserPlus className="w-6 h-6" />}
                count={filteredAvailableToAdd.length}
                gradient="bg-gradient-to-r from-purple-500/80 to-pink-500/80"
              >
                {filteredAvailableToAdd.length > 0 ? (
                  filteredAvailableToAdd.map((user) => (
                    <FriendCard
                      key={user._id}
                      user={user}
                      status="discover"
                      actions={
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendRequest(user._id);
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-4 py-2 rounded-xl text-white font-semibold flex items-center gap-2 transition-all shadow-lg"
                        >
                          <UserPlus className="w-4 h-4" />
                          Add Friend
                        </motion.button>
                      }
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <UserPlus className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    <p className="text-white/50 text-lg">No users to discover</p>
                    <p className="text-white/30 text-sm">You've connected with everyone! 🎉</p>
                  </div>
                )}
              </Section>
            </div>
          </div>

          {/* Bottom Padding */}
          <div className="h-20"></div>
        </motion.div>
      </div>

      {/* Profile Drawer */}
      <ProfileDrawer />
    </div>
  );
};

export default AddFriends;