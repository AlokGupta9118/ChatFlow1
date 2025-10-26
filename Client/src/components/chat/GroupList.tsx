// components/chat/GroupList.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { getToken } from "@/utils/getToken";
import { toast } from "react-hot-toast";

interface Group {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  isJoined: boolean;
  participants: any[];
}

interface JoinRequest {
  _id: string;
  user: { _id: string; name: string; profilePicture?: string };
}

const GroupList = ({ currentUser, onEnterGroup }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [adminModalGroup, setAdminModalGroup] = useState<Group | null>(null);

  const token = getToken();
  const userId = currentUser?._id;

  // Fetch all groups
  const fetchGroups = async () => {
    try {
      const res = await axios.get("http://localhost:3000/chatroom/getallgroups", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroups(res.data.groups);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch groups");
    }
  };

  // Send join request
  const sendJoinRequest = async (groupId: string) => {
    try {
      const res = await axios.post(
        `http://localhost:3000/chatroom/groups/${groupId}/join-request`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message);
      fetchGroups();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to send request");
    }
  };

  // Fetch pending requests for admin
  const fetchPendingRequests = async (groupId: string) => {
    try {
      const res = await axios.get(
        `http://localhost:3000/chatroom/groups/${groupId}/pending-requests`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingRequests(res.data.requests);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch requests");
    }
  };

  // Approve request
  const handleApprove = async (requestId: string) => {
    try {
      await axios.post(
        `http://localhost:3000/chatroom/groups/join-request/${requestId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPendingRequests(adminModalGroup!._id);
      fetchGroups();
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve request");
    }
  };

  // Reject request
  const handleReject = async (requestId: string) => {
    try {
      await axios.post(
        `http://localhost:3000/chatroom/groups/join-request/${requestId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPendingRequests(adminModalGroup!._id);
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject request");
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Groups</h2>
      <div className="space-y-4">
        {groups.map((group) => {
          const isAdmin = group.participants.some(
            (p) => p.user._id === userId && ["owner", "admin"].includes(p.role)
          );

          return (
            <div
              key={group._id}
              className="flex items-center justify-between p-3 border rounded-lg shadow-sm"
            >
              <div className="flex items-center gap-3">
                <img
                  src={group.avatar || "/default-avatar.png"}
                  alt={group.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold">{group.name}</p>
                  <p className="text-sm text-gray-500">{group.description}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {!group.isJoined && (
                  <Button onClick={() => sendJoinRequest(group._id)}>Request to Join</Button>
                )}
                {group.isJoined && (
                  <Button onClick={() => onEnterGroup(group)}>Enter Chat</Button>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAdminModalGroup(group);
                      fetchPendingRequests(group._id);
                    }}
                  >
                    Manage Requests
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Modal */}
      {adminModalGroup && (
        <Modal
          open={!!adminModalGroup}
          onClose={() => setAdminModalGroup(null)}
          title={`Pending Requests for ${adminModalGroup.name}`}
        >
          {pendingRequests.length === 0 && <p>No pending requests</p>}
          <div className="space-y-2 mt-2">
            {pendingRequests.map((req) => (
              <div
                key={req._id}
                className="flex justify-between items-center p-2 border rounded-md"
              >
                <span>{req.user.name}</span>
                <div className="flex gap-2">
                  <Button onClick={() => handleApprove(req._id)}>Approve</Button>
                  <Button variant="destructive" onClick={() => handleReject(req._id)}>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default GroupList;
