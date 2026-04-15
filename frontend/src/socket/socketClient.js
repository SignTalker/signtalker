import { io } from "socket.io-client";
import { getBackendUrl } from "../utils/env";
let socket = null;
export function getSocket() {
    if (socket)
        return socket;
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
