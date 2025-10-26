import { useEffect, useState } from "react";
import axios from "axios";
import { getToken } from "@/utils/getToken";
import { formatDistanceToNow } from "date-fns";
import { Plus, X } from "lucide-react";
import clsx from "clsx";

const API_URL = import.meta.env.VITE_API_URL || "${import.meta.env.VITE_API_URL}";

interface Story {
  _id: string;
  mediaUrl: string;
  caption: string;
  createdAt: string;
  viewers: string[];
}

interface FriendStories {
  friendId: string;
  name: string;
  stories: Story[];
}

const Status = () => {
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [friendsStories, setFriendsStories] = useState<FriendStories[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);

  const token = getToken();

  // Fetch all stories
  const fetchStories = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/stories/${"me"}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyStories(res.data.myStories || []);
      setFriendsStories(res.data.friendsStatuses || []);
    } catch (err) {
      console.error("Error fetching stories:", err);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  // Upload new story
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Select a file first");
    if (!token) return alert("You must be logged in");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", caption);

    setLoading(true);
    try {
      await axios.post(`${API_URL}/stories/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      setCaption("");
      setFile(null);
      fetchStories();
    } catch (err) {
      console.error("Error uploading story:", err);
    } finally {
      setLoading(false);
    }
  };

  // Mark story as viewed
  const markViewed = async (storyId: string) => {
    if (!token) return;
    try {
      await axios.post(
        `${API_URL}/status/viewed`,
        { storyId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("Error marking story viewed:", err);
    }
  };

  // Open story modal
  const openStory = (story: Story) => {
    setViewingStory(story);
    markViewed(story._id);
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* Upload new story */}
      <form
        onSubmit={handleUpload}
        className="flex flex-col md:flex-row items-center gap-4 mb-6 bg-card/50 p-4 rounded-xl shadow-md border border-primary/20"
      >
        <div className="relative w-32 h-32 rounded-full overflow-hidden flex-shrink-0 border-4 border-gradient-to-tr from-purple-400 via-pink-400 to-red-400">
          {file ? (
            <img
              src={URL.createObjectURL(file)}
              alt="preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-gray-400 text-xl">
              <Plus />
            </div>
          )}
          <input
            type="file"
            accept="image/*,video/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        <input
          type="text"
          placeholder="Add a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="flex-1 p-3 rounded-lg border border-primary/20 bg-background/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-blue-400 to-purple-500 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Post Story"}
        </button>
      </form>

      {/* My stories */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Your Stories</h2>
        <div className="flex gap-4 overflow-x-auto">
          {myStories.map((story) => (
            <div
              key={story._id}
              className={clsx(
                "w-28 h-28 rounded-full border-4 p-1 flex-shrink-0 cursor-pointer transition-transform hover:scale-110",
                story.viewers.includes("me") ? "border-gray-300" : "border-gradient-to-tr from-purple-400 via-pink-400 to-red-400"
              )}
              onClick={() => openStory(story)}
            >
              <img
                src={
                  story.mediaUrl.startsWith("http")
                    ? story.mediaUrl
                    : `${API_URL}${story.mediaUrl.startsWith("/") ? "" : "/"}${story.mediaUrl}`
                }
                alt="story"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Friends stories */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Friends' Stories</h2>
        <div className="flex gap-4 overflow-x-auto">
          {friendsStories.map((friend) =>
            friend.stories.map((story) => (
              <div
                key={story._id}
                className={clsx(
                  "w-28 h-28 rounded-full border-4 p-1 flex-shrink-0 cursor-pointer transition-transform hover:scale-110",
                  story.viewers.includes("me") ? "border-gray-300" : "border-gradient-to-tr from-green-400 via-yellow-400 to-red-400"
                )}
                onClick={() => openStory(story)}
              >
                <img
                  src={
                    story.mediaUrl.startsWith("http")
                      ? story.mediaUrl
                      : `${API_URL}${story.mediaUrl.startsWith("/") ? "" : "/"}${story.mediaUrl}`
                  }
                  alt="story"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Story modal */}
      {viewingStory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-3xl w-full">
            <button
              onClick={() => setViewingStory(null)}
              className="absolute top-2 right-2 text-white p-2 rounded-full hover:bg-white/20 transition"
            >
              <X size={24} />
            </button>
            {viewingStory.mediaUrl.endsWith(".mp4") ? (
              <video src={viewingStory.mediaUrl} controls autoPlay className="w-full rounded-xl" />
            ) : (
              <img src={viewingStory.mediaUrl} alt="story" className="w-full rounded-xl" />
            )}
            {viewingStory.caption && (
              <p className="text-white mt-2 text-center">{viewingStory.caption}</p>
            )}
            <p className="text-gray-400 text-sm mt-1 text-center">
              {formatDistanceToNow(new Date(viewingStory.createdAt))} ago
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Status;
