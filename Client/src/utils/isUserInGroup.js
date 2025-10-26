export function isUserInGroup(selectedChat, userId) {
  if (!selectedChat || !userId) return false;

  const participants =
    selectedChat.participants ||
    selectedChat.members ||
    [];

  // ✅ If user is the admin/creator, always allow
  if (
    selectedChat.adminId?.toString() === userId.toString() ||
    selectedChat.createdBy?._id === userId
  ) {
    return true;
  }

  return participants.some((p) => {
    const participantId =
      p?._id ||
      p?.userId ||
      (typeof p?.user === "string" ? p.user : p?.user?._id);
    return participantId?.toString() === userId.toString();
  });
}
