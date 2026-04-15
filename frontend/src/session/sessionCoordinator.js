import { getBackendUrl } from "../utils/env";
import { disconnectSocket, getSocket } from "../socket/socketClient";
import { stableClientId } from "../utils/id";
async function http(path, init) {
    const res = await fetch(`${getBackendUrl()}${path}`, {
        ...init,
        headers: {
            "content-type": "application/json",
            ...(init?.headers ?? {})
        }
    });
    // Validate endpoint returns typed payload even on invalid tokens.
    const data = (await res.json());
    return data;
}
export const sessionCoordinator = {
    async createSession() {
        return await http("/api/session/create", { method: "POST" });
    },
    async validateSession(token) {
        return await http(`/api/session/${encodeURIComponent(token)}/validate`, {
            method: "GET"
        });
    },
    async endSession(token) {
        return await http(`/api/session/${encodeURIComponent(token)}`, { method: "DELETE" });
    },
    joinSession(token) {
        const socket = getSocket();
        socket.emit("join-session", { token, clientId: stableClientId() });
        return socket;
    },
    leaveSession() {
        disconnectSocket();
    }
};
