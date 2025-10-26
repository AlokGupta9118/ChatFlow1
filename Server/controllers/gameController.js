import { v4 as uuidv4 } from "uuid";

const rooms = {}; // temporary storage (in-memory, can later use Redis/DB)

// CREATE ROOM
export const createRoom = (req, res) => {
  const { creatorId } = req.body;
  const roomId = uuidv4().slice(0, 8);
  const roomKey = Math.floor(100000 + Math.random() * 900000).toString();

  rooms[roomId] = {
    roomId,
    roomKey,
    creatorId,
    players: [],
    gameData: [],
  };

  res.status(200).json({ roomId, roomKey });
};

// JOIN ROOM
export const joinRoom = (req, res) => {
  const { roomId, roomKey, userId } = req.body;

  const room = rooms[roomId];
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (room.roomKey !== roomKey) return res.status(403).json({ message: "Invalid key" });
  if (room.players.length >= 2) return res.status(400).json({ message: "Room full" });

  room.players.push(userId);
  res.status(200).json({ message: "Joined successfully", room });
};

// GET ACTIVE ROOMS (optional)
export const getActiveRooms = (req, res) => {
  res.status(200).json(Object.values(rooms));
};
