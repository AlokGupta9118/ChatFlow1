export const getToken = (): string | null => {
  const rawToken = localStorage.getItem("token");
  if (!rawToken) return null;
  // Remove quotes if accidentally stored
  return rawToken.replace(/^"(.*)"$/, "$1");
};
