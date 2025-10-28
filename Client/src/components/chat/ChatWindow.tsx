// components/chat/TestChatWindow.jsx
import { useEffect, useState } from "react";

const TestChatWindow = ({ selectedChat, isGroup = false, currentUser }) => {
  const [detectedIsGroup, setDetectedIsGroup] = useState(false);

  useEffect(() => {
    // Auto-detect if it's a group
    const isActuallyGroup = isGroup || (Array.isArray(selectedChat?.participants) && selectedChat.participants.length > 0);
    setDetectedIsGroup(isActuallyGroup);
    
    console.log("🔍 TestChatWindow DEBUG:", {
      selectedChat: selectedChat?.name,
      isGroupProp: isGroup,
      detectedIsGroup: isActuallyGroup,
      hasParticipants: !!selectedChat?.participants,
      participantsCount: selectedChat?.participants?.length
    });
  }, [selectedChat, isGroup]);

  return (
    <div className="h-full flex flex-col bg-gray-100 p-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Debug Info</h2>
        <div className="space-y-2 text-sm">
          <div><strong>Chat Name:</strong> {selectedChat?.name}</div>
          <div><strong>isGroup Prop:</strong> {isGroup ? "✅ TRUE" : "❌ FALSE"}</div>
          <div><strong>Detected as Group:</strong> {detectedIsGroup ? "✅ TRUE" : "❌ FALSE"}</div>
          <div><strong>Has Participants:</strong> {selectedChat?.participants ? "✅ YES" : "❌ NO"}</div>
          <div><strong>Participants Count:</strong> {selectedChat?.participants?.length || 0}</div>
        </div>
      </div>
    </div>
  );
};

export default TestChatWindow;