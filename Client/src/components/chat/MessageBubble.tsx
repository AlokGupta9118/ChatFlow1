import React from "react";

interface MessageBubbleProps {
  message: any;
  currentUserId: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, currentUserId }) => {
  const isOwnMessage = message.sender._id === currentUserId;

  return (
    <div className={`flex items-end mb-2 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      {!isOwnMessage && (
        <img
          src={message.sender.avatar || "/default-avatar.png"}
          alt={message.sender.username}
          className="w-8 h-8 rounded-full mr-2"
        />
      )}
      <div
        className={`px-4 py-2 rounded-2xl max-w-xs break-words shadow-sm ${
          isOwnMessage
            ? "bg-blue-500 text-white rounded-br-none"
            : "bg-gray-200 text-black rounded-bl-none"
        }`}
      >
        <p className="text-sm">{message.content}</p>
        <span className="block text-xs opacity-70 mt-1 text-right">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      {isOwnMessage && (
        <img
          src={message.sender.avatar || "/default-avatar.png"}
          alt="You"
          className="w-8 h-8 rounded-full ml-2"
        />
      )}
    </div>
  );
};

export default MessageBubble;
