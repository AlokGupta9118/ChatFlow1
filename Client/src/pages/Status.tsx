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
  ArrowLeft,
  Trash2,
  Settings,
  Users,
  Shield,
  Download
} from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL;

interface Story {
  _id: string;
  user: {
    _id: string;
    name: string;
    profilePicture?: string;
    status?: string;
  };
  mediaUrl: string;
  caption: string;
  createdAt: string;
  viewers: Array<{
    user: {
      _id: string;
      name: string;
      profilePicture?: string;
    };
    viewedAt: string;
  }>;
  type: 'image' | 'video';
  duration?: number;
  location?: string;
  likes: Array<{
    user: {
      _id: string;
      name: string;
      profilePicture?: string;
    };
    likedAt: string;
  }>;
  comments: Array<{
    _id: string;
    user: {
      _id: string;
      name: string;
      profilePicture?: string;
    };
    text: string;
    createdAt: string;
  }>;
  privacy?: string;
  hideFrom?: string[];
}

interface FriendStories {
  user: {
    _id: string;
    name: string;
    profilePicture?: string;
    status?: string;
  };
  stories: Story[];
  isViewed: boolean;
}

const Status = () => {
  const navigate = useNavigate();
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
  const [viewersModal, setViewersModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'friends'>('friends');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('friends');
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [selectedStoryForSettings, setSelectedStoryForSettings] = useState<Story | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout>();
  const token = getToken();

  // Enhanced fetch stories with proper error handling
  const fetchStories = async () => {
    if (!token) {
      toast.error("Please login to view stories");
      return;
    }
    
    try {
      const [myStoriesRes, friendsStoriesRes] = await Promise.all([
        axios.get(`${API_URL}/stories/my`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/stories/friends`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      if (myStoriesRes.data.success) {
        setMyStories(myStoriesRes.data.stories || []);
      }

      if (friendsStoriesRes.data.success) {
        setFriendsStories(friendsStoriesRes.data.friendsStories || []);
      }
    } catch (err: any) {
      console.error("Error fetching stories:", err);
      if (err.response?.status === 401) {
        toast.error("Session expired. Please login again.");
      } else {
        toast.error("Failed to load stories");
      }
    }
  };

  useEffect(() => {
    fetchStories();
    const interval = setInterval(fetchStories, 30000);
    return () => clearInterval(interval);
  }, []);

  // Enhanced upload with progress and error handling
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    if (!token) {
      toast.error("Please login to upload stories");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", caption);
    formData.append("location", location);
    formData.append("privacy", privacy);

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/stories/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percent}%`);
          }
        },
      });

      if (response.data.success) {
        toast.success("Story uploaded successfully!");
        setCaption("");
        setLocation("");
        setFile(null);
        setShowCaptionInput(false);
        setPrivacy('friends');
        fetchStories();
      } else {
        throw new Error(response.data.message || "Upload failed");
      }
    } catch (err: any) {
      console.error("Error uploading story:", err);
      const errorMessage = err.response?.data?.message || "Failed to upload story";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced mark as viewed
  const markViewed = async (storyId: string) => {
    if (!token) return;
    try {
      await axios.post(
        `${API_URL}/stories/viewed`,
        { storyId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Optimistically update the viewed status
      setFriendsStories(prev => prev.map(friend => ({
        ...friend,
        stories: friend.stories.map(story => 
          story._id === storyId 
            ? { ...story, viewers: [...story.viewers, { user: { _id: "current-user" }, viewedAt: new Date().toISOString() }] }
            : story
        )
      })));
    } catch (err) {
      console.error("Error marking story viewed:", err);
    }
  };

  // Enhanced like functionality
  const handleLike = async (storyId: string) => {
    if (!token) return;
    try {
      const response = await axios.post(
        `${API_URL}/stories/${storyId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        // Optimistically update likes
        const updatedLikes = response.data.likes;
        setFriendsStories(prev => prev.map(friend => ({
          ...friend,
          stories: friend.stories.map(story => 
            story._id === storyId ? { ...story, likes: updatedLikes } : story
          )
        })));
        
        if (viewingStory?._id === storyId) {
          setViewingStory(prev => prev ? { ...prev, likes: updatedLikes } : null);
        }
      }
    } catch (err: any) {
      console.error("Error liking story:", err);
      toast.error(err.response?.data?.message || "Failed to like story");
    }
  };

  // Enhanced comment functionality
  const handleComment = async (storyId: string) => {
    if (!commentText.trim() || !token) return;
    try {
      const response = await axios.post(
        `${API_URL}/stories/${storyId}/comment`,
        { text: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        const newComment = response.data.comment;
        // Optimistically update comments
        setFriendsStories(prev => prev.map(friend => ({
          ...friend,
          stories: friend.stories.map(story => 
            story._id === storyId 
              ? { ...story, comments: [...story.comments, newComment] } 
              : story
          )
        })));
        
        if (viewingStory?._id === storyId) {
          setViewingStory(prev => prev ? { ...prev, comments: [...prev.comments, newComment] } : null);
        }
        
        setCommentText("");
        toast.success("Comment added!");
      }
    } catch (err: any) {
      console.error("Error commenting on story:", err);
      toast.error(err.response?.data?.message || "Failed to add comment");
    }
  };

  // Enhanced progress bar with better timing
  const startProgress = useCallback((duration: number = 5000) => {
    setProgress(0);
    clearInterval(progressIntervalRef.current);
    
    const startTime = Date.now();
    const totalDuration = duration;
    
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / totalDuration) * 100;
      
      if (newProgress >= 100) {
        clearInterval(progressIntervalRef.current);
        handleNextStory();
      } else {
        setProgress(newProgress);
      }
    }, 50); // More frequent updates for smoother progress
  }, []);

  // Enhanced story navigation
  const handleNextStory = () => {
    const currentFriend = friendsStories[currentFriendIndex];
    if (!currentFriend) {
      closeStoryViewer();
      return;
    }

    if (currentStoryIndex < currentFriend.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else if (currentFriendIndex < friendsStories.length - 1) {
      setCurrentFriendIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      closeStoryViewer();
    }
  };

  const handlePreviousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else if (currentFriendIndex > 0) {
      setCurrentFriendIndex(prev => prev - 1);
      const prevFriendStories = friendsStories[prev - 1].stories;
      setCurrentStoryIndex(prevFriendStories.length - 1);
    }
  };

  // Enhanced open story with better state management
  const openStory = (friendIndex: number, storyIndex: number = 0) => {
    if (friendIndex >= friendsStories.length || !friendsStories[friendIndex]?.stories[storyIndex]) {
      toast.error("Story not available");
      return;
    }

    setCurrentFriendIndex(friendIndex);
    setCurrentStoryIndex(storyIndex);
    const story = friendsStories[friendIndex].stories[storyIndex];
    setViewingStory(story);
    
    // Mark as viewed if not already
    const hasViewed = story.viewers.some(viewer => viewer.user._id === "current-user");
    if (!hasViewed) {
      markViewed(story._id);
    }
    
    const duration = story.type === 'video' ? (story.duration || 15000) : 5000;
    startProgress(duration);
    setIsPlaying(true);
  };

  // Enhanced close story viewer
  const closeStoryViewer = () => {
    setViewingStory(null);
    setCurrentStoryIndex(0);
    setCurrentFriendIndex(0);
    setProgress(0);
    clearInterval(progressIntervalRef.current);
    setIsPlaying(true);
    setShowReactions(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // Enhanced drag handling
  const handleDrag = (event: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 50) {
      if (info.offset.x < -50) {
        handleNextStory();
      } else if (info.offset.x > 50) {
        handlePreviousStory();
      }
    }
  };

  // Enhanced video controls
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        clearInterval(progressIntervalRef.current);
      } else {
        videoRef.current.play();
        const duration = viewingStory?.type === 'video' ? (viewingStory.duration || 15000) : 5000;
        startProgress(duration);
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Enhanced file selection
  const handleFileSelect = (selectedFile: File) => {
    // Validate file size (50MB max)
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error("File size too large. Maximum size is 50MB.");
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("File type not supported. Please use images or videos.");
      return;
    }

    setFile(selectedFile);
    setShowCaptionInput(true);
  };

  // Delete story functionality
  const deleteStory = async (storyId: string) => {
    if (!token) return;
    try {
      await axios.delete(`${API_URL}/stories/${storyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Story deleted successfully");
      fetchStories();
      setSelectedStoryForSettings(null);
    } catch (err: any) {
      console.error("Error deleting story:", err);
      toast.error(err.response?.data?.message || "Failed to delete story");
    }
  };

  // Update privacy settings
  const updatePrivacy = async (storyId: string, newPrivacy: string) => {
    if (!token) return;
    try {
      await axios.put(
        `${API_URL}/stories/${storyId}/privacy`,
        { privacy: newPrivacy },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Privacy settings updated");
      fetchStories();
      setSelectedStoryForSettings(null);
    } catch (err: any) {
      console.error("Error updating privacy:", err);
      toast.error(err.response?.data?.message || "Failed to update privacy");
    }
  };

  // Check if current user has liked a story
  const hasLiked = (story: Story) => {
    if (!token) return false;
    // In a real app, you'd get current user ID from token or context
    return story.likes.some(like => like.user._id === "current-user");
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!viewingStory) return;
      
      switch (e.key) {
        case 'ArrowRight':
          handleNextStory();
          break;
        case 'ArrowLeft':
          handlePreviousStory();
          break;
        case 'Escape':
          closeStoryViewer();
          break;
        case ' ':
          if (viewingStory.type === 'video') {
            togglePlayPause();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [viewingStory]);

  // Auto-play video when story opens
  useEffect(() => {
    if (viewingStory?.type === 'video' && videoRef.current && isPlaying) {
      videoRef.current.play().catch(console.error);
    }
  }, [viewingStory, isPlaying]);

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900/20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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

      <div className="max-w-7xl mx-auto p-4">
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

                  {/* Privacy Settings */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Shield className="w-4 h-4 inline mr-2" />
                      Privacy
                    </label>
                    <select
                      value={privacy}
                      onChange={(e) => setPrivacy(e.target.value as any)}
                      className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

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
                      onClick={() => {
                        setShowCaptionInput(false);
                        setFile(null);
                        setCaption("");
                        setLocation("");
                      }}
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
                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {myStories.map((story, index) => (
                  <motion.div
                    key={story._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative group cursor-pointer"
                  >
                    <div 
                      className="aspect-[9/16] rounded-2xl overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-1"
                      onClick={() => {
                        // Find this story in friends stories to open properly
                        const friendIndex = friendsStories.findIndex(f => f.user._id === story.user._id);
                        if (friendIndex !== -1) {
                          const storyIndex = friendsStories[friendIndex].stories.findIndex(s => s._id === story._id);
                          openStory(friendIndex, storyIndex);
                        }
                      }}
                    >
                      <div className="w-full h-full rounded-xl overflow-hidden relative">
                        {story.type === 'video' ? (
                          <video
                            src={story.mediaUrl}
                            className="w-full h-full object-cover"
                            muted
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
                        
                        {/* Settings Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStoryForSettings(story);
                          }}
                          className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        
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
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
                {friendsStories.map((friend, friendIndex) => (
                  <motion.div
                    key={friend.user._id}
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
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-white dark:bg-gray-800 p-1">
                        <img
                          src={friend.user.profilePicture || "/default-avatar.png"}
                          alt={friend.user.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                      
                      {/* Online Indicator */}
                      {friend.user.status === 'online' && (
                        <div className="absolute bottom-1 right-1 w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">
                      {friend.user.name}
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
                      src={friendsStories[currentFriendIndex]?.user.profilePicture || "/default-avatar.png"}
                      alt={friendsStories[currentFriendIndex]?.user.name}
                      className="w-8 h-8 rounded-full border-2 border-white"
                    />
                    <div>
                      <h3 className="text-white font-semibold">
                        {friendsStories[currentFriendIndex]?.user.name}
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
                className="relative w-full max-w-sm sm:max-w-md mx-4 aspect-[9/16] rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
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
                    playsInline
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
                        hasLiked(viewingStory)
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      <Heart className={`w-6 h-6 ${hasLiked(viewingStory) ? 'fill-current' : ''}`} />
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
                              className="w-6 h-6 rounded-full flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-semibold truncate">
                                {comment.user.name}
                              </p>
                              <p className="text-white/80 text-sm break-words">{comment.text}</p>
                            </div>
                          </div>
                        ))}
                        {viewingStory.comments?.length === 0 && (
                          <p className="text-white/60 text-sm text-center py-2">
                            No comments yet
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 bg-white/20 rounded-full px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
                          onKeyPress={(e) => e.key === 'Enter' && handleComment(viewingStory._id)}
                        />
                        <button
                          onClick={() => handleComment(viewingStory._id)}
                          disabled={!commentText.trim()}
                          className="bg-white text-black px-4 py-2 rounded-full hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
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
                  className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 text-white p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                
                <button
                  onClick={handleNextStory}
                  className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 text-white p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Story Settings Modal */}
        <AnimatePresence>
          {selectedStoryForSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedStoryForSettings(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Story Settings
                  </h3>
                  <button
                    onClick={() => setSelectedStoryForSettings(null)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Privacy
                    </label>
                    <select
                      value={selectedStoryForSettings.privacy || 'friends'}
                      onChange={(e) => updatePrivacy(selectedStoryForSettings._id, e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this story?")) {
                        deleteStory(selectedStoryForSettings._id);
                      }
                    }}
                    className="w-full flex items-center gap-2 p-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Story
                  </button>

                  <button
                    onClick={() => setSelectedStoryForSettings(null)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
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
                    {myStories.flatMap(story => story.viewers)
                      .slice(0, 10)
                      .map((viewer, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {viewer.user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">{viewer.user.name}</span>
                      </div>
                    ))}
                    {myStories.flatMap(story => story.viewers).length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No viewers yet
                      </p>
                    )}
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