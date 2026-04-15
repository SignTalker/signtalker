import { io, type Socket } from "socket.io-client";
import { getBackendUrl } from "../utils/env";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(getBackendUrl(), {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    timeout: 8000
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

