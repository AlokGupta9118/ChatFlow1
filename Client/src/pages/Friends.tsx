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
  Star,
  Trophy,
  Sparkles,
  Crown
} from "lucide-react";
import { getToken } from "@/utils/getToken";

interface IUser {
  _id: string;
  name: string;
  profilePicture?: string;
}

interface IFriendsData {
  friends: IUser[];
  incomingRequests: IUser[];
  outgoingRequests: IUser[];
}

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
      setUsers(allUsers.filter((u: IUser) => u._id !== currentUserId));
    } catch (err) {
      console.error("❌ Error fetching users:", err);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/friends`, axiosConfig);
      const data = res.data || {};
      setFriendsData({
        friends: (data.friends || []).filter((f: IUser) => f._id !== currentUserId),
        incomingRequests: data.incomingRequests || [],
        outgoingRequests: data.outgoingRequests || [],
      });
    } catch (err) {
      console.error("❌ Error fetching friends data:", err);
    } finally {
      setLoading(false);
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
      fetchFriends();
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
      fetchFriends();
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
      fetchFriends();
    } catch (err) {
      console.error("❌ Error declining request:", err);
    }
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
        className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all duration-300 ${
          highlight 
            ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/50 shadow-lg" 
            : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={user.profilePicture || "/default-avatar.png"}
              alt={user.name}
              className="w-12 h-12 rounded-2xl border-2 border-white/20 shadow-lg"
            />
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
        {actions}
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
                          onClick={() => handleSendRequest(user._id)}
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
    </div>
  );
};

export default AddFriends;