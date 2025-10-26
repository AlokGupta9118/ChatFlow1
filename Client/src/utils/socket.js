import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3000"; // your backend

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});
