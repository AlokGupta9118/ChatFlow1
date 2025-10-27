import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { UserPlus, Users, Inbox, SendHorizonal, ArrowLeft } from "lucide-react";
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-lg text-gray-500">
        Loading friends...
      </div>
    );
  }

  const availableToAdd = users.filter(
    (user) =>
      user._id !== currentUserId &&
      !friendsData.friends.some((f) => f._id === user._id) &&
      !friendsData.incomingRequests.some((f) => f._id === user._id) &&
      !friendsData.outgoingRequests.some((f) => f._id === user._id)
  );

  const Section: React.FC<{ title: string; icon: JSX.Element; children: React.ReactNode }> = ({
    title,
    icon,
    children,
  }) => (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white/10 backdrop-blur-md rounded-2xl shadow-md p-4 md:p-5 border border-white/10 hover:shadow-lg transition"
    >
      <div className="flex items-center gap-2 mb-4 text-lg md:text-xl font-semibold text-indigo-300">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </motion.section>
  );

  const FriendCard: React.FC<{ user: IUser; actions?: React.ReactNode }> = ({ user, actions }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10"
    >
      <div className="flex items-center">
        <img
          src={user.profilePicture || "/default-avatar.png"}
          alt={user.name}
          className="w-8 h-8 md:w-10 md:h-10 rounded-full mr-3 border border-white/20"
        />
        <span className="font-medium text-gray-100 text-sm md:text-base">{user.name}</span>
      </div>
      {actions}
    </motion.div>
  );

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      {/* Main Content Area with Scroll */}
      <div className="flex-1 overflow-y-auto">
        <motion.div
          className="min-h-full bg-gradient-to-br from-gray-900 via-indigo-900 to-black text-white py-8 md:py-12 px-4 md:px-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Back Button */}
          <div className="relative mb-6 md:absolute md:top-4 md:left-4 z-20">
            <button
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all border border-white/30 w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Chat</span>
            </button>
          </div>

          <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 pt-2 md:pt-0">
            <motion.h2
              className="text-2xl md:text-4xl font-bold text-center mb-6 md:mb-10 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400"
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              🌐 Friends System
            </motion.h2>

            <Section title="Your Friends" icon={<Users size={20} />}>
              {friendsData.friends.length > 0 ? (
                friendsData.friends.map((user) => (
                  <FriendCard key={user._id} user={user}>
                    <span className="text-green-400 text-xs md:text-sm">Friend</span>
                  </FriendCard>
                ))
              ) : (
                <p className="text-gray-400 text-sm md:text-base">You don't have any friends yet 😅</p>
              )}
            </Section>

            <Section title="Incoming Friend Requests" icon={<Inbox size={20} />}>
              {friendsData.incomingRequests.length > 0 ? (
                friendsData.incomingRequests.map((user) => (
                  <FriendCard
                    key={user._id}
                    user={user}
                    actions={
                      <div className="flex gap-1 md:gap-2">
                        <button
                          onClick={() => handleAcceptRequest(user._id)}
                          className="bg-green-500 hover:bg-green-600 px-2 py-1 md:px-3 md:py-1 rounded text-white text-xs md:text-sm"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(user._id)}
                          className="bg-red-500 hover:bg-red-600 px-2 py-1 md:px-3 md:py-1 rounded text-white text-xs md:text-sm"
                        >
                          Decline
                        </button>
                      </div>
                    }
                  />
                ))
              ) : (
                <p className="text-gray-400 text-sm md:text-base">No incoming requests</p>
              )}
            </Section>

            <Section title="Sent Requests" icon={<SendHorizonal size={20} />}>
              {friendsData.outgoingRequests.length > 0 ? (
                friendsData.outgoingRequests.map((user) => (
                  <FriendCard key={user._id} user={user}>
                    <span className="text-blue-400 text-xs md:text-sm">Pending...</span>
                  </FriendCard>
                ))
              ) : (
                <p className="text-gray-400 text-sm md:text-base">You haven't sent any requests</p>
              )}
            </Section>

            <Section title="Discover Users" icon={<UserPlus size={20} />}>
              {availableToAdd.length > 0 ? (
                availableToAdd.map((user) => (
                  <FriendCard
                    key={user._id}
                    user={user}
                    actions={
                      <button
                        onClick={() => handleSendRequest(user._id)}
                        className="bg-indigo-600 hover:bg-indigo-700 px-2 py-1 md:px-3 md:py-1 rounded text-white text-xs md:text-sm"
                      >
                        Add Friend
                      </button>
                    }
                  />
                ))
              ) : (
                <p className="text-gray-400 text-sm md:text-base">No new users available 🎉</p>
              )}
            </Section>

            {/* Add some bottom padding for better scrolling */}
            <div className="pb-8"></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AddFriends;