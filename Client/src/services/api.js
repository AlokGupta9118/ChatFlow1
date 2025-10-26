// src/services/api.js or similar
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://chatflow1-production.up.railway.app";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
