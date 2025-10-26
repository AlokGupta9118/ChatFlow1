import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { UserPlus, Users, Inbox, SendHorizonal } from "lucide-react";
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
      const res = await axios.get("http://localhost:3000/api/users", axiosConfig);
      const allUsers = res.data.users || res.data || [];
      setUsers(allUsers.filter((u: IUser) => u._id !== currentUserId));
    } catch (err) {
      console.error("❌ Error fetching users:", err);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await axios.get("http://localhost:3000/api/friends", axiosConfig);
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
        `http://localhost:3000/api/friends/request/${userId}`,
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
        `http://localhost:3000/api/friends/accept/${userId}`,
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
        `http://localhost:3000/api/friends/decline/${userId}`,
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
      className="bg-white/10 backdrop-blur-md rounded-2xl shadow-md p-5 border border-white/10 hover:shadow-lg transition"
    >
      <div className="flex items-center gap-2 mb-4 text-xl font-semibold text-indigo-300">
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
          className="w-10 h-10 rounded-full mr-3 border border-white/20"
        />
        <span className="font-medium text-gray-100">{user.name}</span>
      </div>
      {actions}
    </motion.div>
  );

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-black text-white py-12 px-6 md:px-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="max-w-4xl mx-auto space-y-10">
        <motion.h2
          className="text-4xl font-bold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          🌐 Friends System
        </motion.h2>

        <Section title="Your Friends" icon={<Users size={22} />}>
          {friendsData.friends.length > 0 ? (
            friendsData.friends.map((user) => (
              <FriendCard key={user._id} user={user}>
                <span className="text-green-400 text-sm">Friend</span>
              </FriendCard>
            ))
          ) : (
            <p className="text-gray-400">You don’t have any friends yet 😅</p>
          )}
        </Section>

        <Section title="Incoming Friend Requests" icon={<Inbox size={22} />}>
          {friendsData.incomingRequests.length > 0 ? (
            friendsData.incomingRequests.map((user) => (
              <FriendCard
                key={user._id}
                user={user}
                actions={
                  <div>
                    <button
                      onClick={() => handleAcceptRequest(user._id)}
                      className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded mr-2 text-white text-sm"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(user._id)}
                      className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-white text-sm"
                    >
                      Decline
                    </button>
                  </div>
                }
              />
            ))
          ) : (
            <p className="text-gray-400">No incoming requests</p>
          )}
        </Section>

        <Section title="Sent Requests" icon={<SendHorizonal size={22} />}>
          {friendsData.outgoingRequests.length > 0 ? (
            friendsData.outgoingRequests.map((user) => (
              <FriendCard key={user._id} user={user}>
                <span className="text-blue-400 text-sm">Pending...</span>
              </FriendCard>
            ))
          ) : (
            <p className="text-gray-400">You haven’t sent any requests</p>
          )}
        </Section>

        <Section title="Discover Users" icon={<UserPlus size={22} />}>
          {availableToAdd.length > 0 ? (
            availableToAdd.map((user) => (
              <FriendCard
                key={user._id}
                user={user}
                actions={
                  <button
                    onClick={() => handleSendRequest(user._id)}
                    className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-white text-sm"
                  >
                    Add Friend
                  </button>
                }
              />
            ))
          ) : (
            <p className="text-gray-400">No new users available 🎉</p>
          )}
        </Section>
      </div>
    </motion.div>
  );
};

export default AddFriends;
