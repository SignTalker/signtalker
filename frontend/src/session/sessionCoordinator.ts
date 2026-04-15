import type { CreateSessionResponse, ValidateSessionResponse } from "@signtalker/shared";
import { getBackendUrl } from "../utils/env";
import { disconnectSocket, getSocket } from "../socket/socketClient";
import { stableClientId } from "../utils/id";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBackendUrl()}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  // Validate endpoint returns typed payload even on invalid tokens.
  const data = (await res.json()) as T;
  return data;
}

export const sessionCoordinator = {
  async createSession(): Promise<CreateSessionResponse> {
    return await http<CreateSessionResponse>("/api/session/create", { method: "POST" });
  },

  async validateSession(token: string): Promise<ValidateSessionResponse> {
    return await http<ValidateSessionResponse>(`/api/session/${encodeURIComponent(token)}/validate`, {
      method: "GET"
    });
  },

  async endSession(token: string): Promise<{ ok: true }> {
    return await http<{ ok: true }>(`/api/session/${encodeURIComponent(token)}`, { method: "DELETE" });
  },

  joinSession(token: string) {
    const socket = getSocket();
    socket.emit("join-session", { token, clientId: stableClientId() });
    return socket;
  },

  leaveSession() {
    disconnectSocket();
  }
};

