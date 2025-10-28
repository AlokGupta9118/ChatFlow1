import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { getToken } from "@/utils/getToken";
import { formatDistanceToNow } from "date-fns";
import { 
  Plus, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Heart,
  MessageCircle,
  Send,
  MoreHorizontal,
  User,
  Clock,
  Eye,
  Sparkles,
  Camera,
  Video,
  Smile,
  MapPin,
  GripVertical,
  ArrowLeft // Added ArrowLeft icon
} from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useNavigate } from "react-router-dom"; // Added useNavigate hook

const API_URL = import.meta.env.VITE_API_URL || "${import.meta.env.VITE_API_URL}";

interface Story {
  _id: string;
  mediaUrl: string;
  caption: string;
  createdAt: string;
  viewers: string[];
  type: 'image' | 'video';
  duration?: number;
  location?: string;
  likes: string[];
  comments: Comment[];
}

interface Comment {
  _id: string;
  user: {
    _id: string;
    name: string;
    profilePicture?: string;
  };
  text: string;
  createdAt: string;
}

interface FriendStories {
  friendId: string;
  name: string;
  profilePicture?: string;
  stories: Story[];
  isViewed: boolean;
}

const Status = () => {
  const navigate = useNavigate(); // Initialize navigate hook
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [friendsStories, setFriendsStories] = useState<FriendStories[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [currentFriendIndex, setCurrentFriendIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [viewersModal, setViewersModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'friends'>('friends');

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout>();
  const token = getToken();

  // Handle back button click
  const handleBackClick = () => {
    navigate(-1); // Go back to previous page
  };

  // Fetch all stories
  const fetchStories = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/stories/${"me"}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyStories(res.data.myStories || []);
      
      // Enhance friends stories with additional data
      const enhancedFriendsStories = (res.data.friendsStatuses || []).map((friend: FriendStories) => ({
        ...friend,
        isViewed: friend.stories.every(story => story.viewers.includes("me"))
      }));
      
      setFriendsStories(enhancedFriendsStories);
    } catch (err) {
      console.error("Error fetching stories:", err);
    }
  };

  useEffect(() => {
    fetchStories();
    const interval = setInterval(fetchStories, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Upload new story
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Select a file first");
    if (!token) return alert("You must be logged in");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", caption);
    formData.append("location", location);
    formData.append("type", file.type.startsWith('video/') ? 'video' : 'image');

    setLoading(true);
    try {
      await axios.post(`${API_URL}/stories/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "multipart/form-data" 
        },
      });
      setCaption("");
      setLocation("");
      setFile(null);
      setShowCaptionInput(false);
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
      fetchStories(); // Refresh to update viewed status
    } catch (err) {
      console.error("Error marking story viewed:", err);
    }
  };

  // Like/unlike story
  const handleLike = async (storyId: string) => {
    if (!token) return;
    try {
      await axios.post(
        `${API_URL}/stories/${storyId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsLiked(!isLiked);
      fetchStories();
    } catch (err) {
      console.error("Error liking story:", err);
    }
  };

  // Add comment to story
  const handleComment = async (storyId: string) => {
    if (!commentText.trim() || !token) return;
    try {
      await axios.post(
        `${API_URL}/stories/${storyId}/comment`,
        { text: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCommentText("");
      fetchStories();
    } catch (err) {
      console.error("Error commenting on story:", err);
    }
  };

  // Progress bar animation
  const startProgress = useCallback((duration: number = 5000) => {
    setProgress(0);
    clearInterval(progressIntervalRef.current);
    
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressIntervalRef.current);
          handleNextStory();
          return 0;
        }
        return prev + (100 / (duration / 100));
      });
    }, 100);
  }, []);

  // Handle next story
  const handleNextStory = () => {
    const currentFriend = friendsStories[currentFriendIndex];
    if (currentStoryIndex < currentFriend.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else if (currentFriendIndex < friendsStories.length - 1) {
      setCurrentFriendIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      closeStoryViewer();
    }
  };

  // Handle previous story
  const handlePreviousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else if (currentFriendIndex > 0) {
      setCurrentFriendIndex(prev => prev - 1);
      const prevFriendStories = friendsStories[prev].stories;
      setCurrentStoryIndex(prevFriendStories.length - 1);
    }
  };

  // Open story viewer
  const openStory = (friendIndex: number, storyIndex: number = 0) => {
    setCurrentFriendIndex(friendIndex);
    setCurrentStoryIndex(storyIndex);
    const story = friendsStories[friendIndex].stories[storyIndex];
    setViewingStory(story);
    markViewed(story._id);
    startProgress(story.type === 'video' ? (story.duration || 10000) : 5000);
    setIsPlaying(true);
  };

  // Close story viewer
  const closeStoryViewer = () => {
    setViewingStory(null);
    setCurrentStoryIndex(0);
    setCurrentFriendIndex(0);
    setProgress(0);
    clearInterval(progressIntervalRef.current);
    setIsPlaying(true);
    setShowReactions(false);
  };

  // Handle drag for story navigation
  const handleDrag = (event: any, info: PanInfo) => {
    if (info.offset.x < -50) {
      handleNextStory();
    } else if (info.offset.x > 50) {
      handlePreviousStory();
    }
  };

  // Toggle play/pause for videos
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        clearInterval(progressIntervalRef.current);
      } else {
        videoRef.current.play();
        startProgress(viewingStory?.duration || 5000);
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle file selection with preview
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setShowCaptionInput(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900/20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <button
                onClick={handleBackClick}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Stories
              </h1>
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('friends')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === 'friends'
                      ? 'bg-purple-500 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  Friends
                </button>
                <button
                  onClick={() => setActiveTab('my')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === 'my'
                      ? 'bg-purple-500 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  My Stories
                </button>
              </div>
            </div>
            
            <button
              onClick={() => setShowCaptionInput(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              New Story
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4">
        {/* Create Story Modal */}
        <AnimatePresence>
          {showCaptionInput && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowCaptionInput(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Create Story
                  </h3>
                  <button
                    onClick={() => setShowCaptionInput(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpload} className="p-6 space-y-4">
                  {/* File Preview */}
                  {file && (
                    <div className="relative aspect-[9/16] max-h-80 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {file.type.startsWith('video/') ? (
                        <video
                          src={URL.createObjectURL(file)}
                          className="w-full h-full object-cover"
                          controls
                        />
                      ) : (
                        <img
                          src={URL.createObjectURL(file)}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  )}

                  {/* File Input */}
                  {!file && (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center">
                      <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Upload a photo or video
                      </p>
                      <label className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full cursor-pointer hover:shadow-lg transition-all inline-block">
                        <Camera className="w-4 h-4 inline mr-2" />
                        Choose File
                        <input
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        />
                      </label>
                    </div>
                  )}

                  {/* Caption Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Caption
                    </label>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="What's happening?"
                      className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={3}
                    />
                  </div>

                  {/* Location Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Location
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Add location"
                      className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCaptionInput(false)}
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !file}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Posting...
                        </div>
                      ) : (
                        "Post Story"
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My Stories Section */}
        {activeTab === 'my' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Your Stories
              </h2>
              {myStories.length > 0 && (
                <button
                  onClick={() => setViewersModal(true)}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                >
                  View Analytics
                </button>
              )}
            </div>

            {myStories.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  No stories yet
                </h3>
                <p className="text-gray-500 dark:text-gray-500 mb-6">
                  Share your first story with friends
                </p>
                <button
                  onClick={() => setShowCaptionInput(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                  Create First Story
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {myStories.map((story, index) => (
                  <motion.div
                    key={story._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative group cursor-pointer"
                    onClick={() => openStory(0, index)}
                  >
                    <div className="aspect-[9/16] rounded-2xl overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-1">
                      <div className="w-full h-full rounded-xl overflow-hidden relative">
                        {story.type === 'video' ? (
                          <video
                            src={story.mediaUrl}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={story.mediaUrl}
                            alt="story"
                            className="w-full h-full object-cover"
                          />
                        )}
                        
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                        
                        {/* Story Info */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-white text-sm truncate">
                            {story.caption || "Your Story"}
                          </p>
                          <div className="flex items-center justify-between text-xs text-white/80 mt-1">
                            <span>{story.viewers.length} views</span>
                            <span>{formatDistanceToNow(new Date(story.createdAt))} ago</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Friends Stories Section */}
        {activeTab === 'friends' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Friends' Stories
            </h2>

            {friendsStories.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  No stories from friends
                </h3>
                <p className="text-gray-500 dark:text-gray-500">
                  When your friends post stories, they'll appear here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {friendsStories.map((friend, friendIndex) => (
                  <motion.div
                    key={friend.friendId}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: friendIndex * 0.1 }}
                    className="text-center cursor-pointer group"
                    onClick={() => openStory(friendIndex)}
                  >
                    {/* Story Ring */}
                    <div className={`relative mx-auto mb-3 p-1 rounded-full ${
                      friend.isViewed 
                        ? 'bg-gradient-to-r from-gray-300 to-gray-400' 
                        : 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 animate-pulse'
                    }`}>
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-white dark:bg-gray-800 p-1">
                        <img
                          src={friend.profilePicture || "/default-avatar.png"}
                          alt={friend.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                      
                      {/* Online Indicator */}
                      <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">
                      {friend.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {friend.stories.length} {friend.stories.length === 1 ? 'story' : 'stories'}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Story Viewer */}
        <AnimatePresence>
          {viewingStory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            >
              {/* Progress Bars */}
              <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
                {friendsStories[currentFriendIndex]?.stories.map((_, index) => (
                  <div key={index} className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-100 ${
                        index === currentStoryIndex 
                          ? 'bg-white' 
                          : index < currentStoryIndex 
                            ? 'bg-white' 
                            : 'bg-gray-600'
                      }`}
                      style={{
                        width: index === currentStoryIndex ? `${progress}%` : index < currentStoryIndex ? '100%' : '0%'
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="absolute top-4 left-4 right-4 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={friendsStories[currentFriendIndex]?.profilePicture || "/default-avatar.png"}
                      alt={friendsStories[currentFriendIndex]?.name}
                      className="w-8 h-8 rounded-full border-2 border-white"
                    />
                    <div>
                      <h3 className="text-white font-semibold">
                        {friendsStories[currentFriendIndex]?.name}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {formatDistanceToNow(new Date(viewingStory.createdAt))} ago
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Play/Pause Button for Videos */}
                    {viewingStory.type === 'video' && (
                      <button
                        onClick={togglePlayPause}
                        className="text-white p-2 hover:bg-white/20 rounded-full transition-colors"
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                    )}

                    {/* Mute/Unmute Button for Videos */}
                    {viewingStory.type === 'video' && (
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="text-white p-2 hover:bg-white/20 rounded-full transition-colors"
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                    )}

                    <button
                      onClick={closeStoryViewer}
                      className="text-white p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Story Content */}
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDrag}
                className="relative max-w-md w-full mx-4 aspect-[9/16] rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
              >
                {viewingStory.type === 'video' ? (
                  <video
                    ref={videoRef}
                    src={viewingStory.mediaUrl}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted={isMuted}
                    onEnded={handleNextStory}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                ) : (
                  <img
                    src={viewingStory.mediaUrl}
                    alt="story"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Caption & Location */}
                {(viewingStory.caption || viewingStory.location) && (
                  <div className="absolute bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    {viewingStory.caption && (
                      <p className="text-white text-lg mb-2">{viewingStory.caption}</p>
                    )}
                    {viewingStory.location && (
                      <p className="text-white/80 text-sm flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {viewingStory.location}
                      </p>
                    )}
                  </div>
                )}

                {/* Reaction Buttons */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleLike(viewingStory._id)}
                      className={`p-3 rounded-full backdrop-blur-sm transition-all ${
                        isLiked 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
                    </button>
                    
                    <button
                      onClick={() => setShowReactions(!showReactions)}
                      className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm transition-all"
                    >
                      <MessageCircle className="w-6 h-6" />
                    </button>

                    <button className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm transition-all">
                      <Send className="w-6 h-6" />
                    </button>
                  </div>

                  <button className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm transition-all">
                    <MoreHorizontal className="w-6 h-6" />
                  </button>
                </div>

                {/* Comment Section */}
                <AnimatePresence>
                  {showReactions && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute bottom-20 left-4 right-4 bg-black/80 backdrop-blur-xl rounded-xl p-4"
                    >
                      <div className="max-h-32 overflow-y-auto mb-3 space-y-2">
                        {viewingStory.comments?.map((comment) => (
                          <div key={comment._id} className="flex items-start gap-2">
                            <img
                              src={comment.user.profilePicture || "/default-avatar.png"}
                              alt={comment.user.name}
                              className="w-6 h-6 rounded-full"
                            />
                            <div>
                              <p className="text-white text-sm font-semibold">
                                {comment.user.name}
                              </p>
                              <p className="text-white/80 text-sm">{comment.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 bg-white/20 rounded-full px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                          onKeyPress={(e) => e.key === 'Enter' && handleComment(viewingStory._id)}
                        />
                        <button
                          onClick={() => handleComment(viewingStory._id)}
                          className="bg-white text-black px-4 py-2 rounded-full hover:bg-white/90 transition-colors"
                        >
                          Send
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation Arrows */}
                <button
                  onClick={handlePreviousStory}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                
                <button
                  onClick={handleNextStory}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Viewers Modal */}
        <AnimatePresence>
          {viewersModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setViewersModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Story Analytics
                  </h3>
                  <button
                    onClick={() => setViewersModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-4 text-center mb-6">
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {myStories.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Stories</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {myStories.reduce((total, story) => total + story.viewers.length, 0)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Views</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {myStories.reduce((total, story) => total + story.likes.length, 0)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Likes</div>
                    </div>
                  </div>
                  
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Recent Viewers
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {myStories.flatMap(story => story.viewers).slice(0, 10).map((viewer, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {viewer.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">{viewer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Status;