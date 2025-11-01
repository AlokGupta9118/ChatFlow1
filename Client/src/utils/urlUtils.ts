// utils/urlUtils.ts
export const getSafeImageUrl = (url: string | undefined): string => {
  if (!url) return '/default-avatar.png';
  
  // If it's already HTTPS, return as is
  if (url.startsWith('https://')) return url;
  
  // If it's HTTP, convert to HTTPS
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  
  // If it's a relative path, construct absolute URL with HTTPS
  const baseUrl = import.meta.env.VITE_API_URL || 'https://chatflow1.onrender.com';
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  
  return `${cleanBaseUrl}${cleanUrl}`;
};