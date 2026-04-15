import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { SessionRepository } from "../repositories/session.repository";
import type { TokenValidationService } from "../services/token-validation.service";
import { makeError } from "../models/error.model";
import { SESSION_MAX_PARTICIPANTS } from "../models/session.model";

type JoinSessionPayload = { token: string; clientId?: string };

type InvalidSessionPayload = ReturnType<typeof makeError> & {
  token?: string;
};

export function attachSocketGateway(opts: {
  httpServer: HttpServer;
  corsOrigins: string[];
  repo: SessionRepository;
  validator: TokenValidationService;
}) {
  const io = new Server(opts.httpServer, {
    cors: {
      origin: opts.corsOrigins.length ? opts.corsOrigins : true
    }
  });

  const socketToToken = new Map<string, string>();
  const socketToClientId = new Map<string, string>();
  // token -> (clientId -> socketId)
  const tokenClients = new Map<string, Map<string, string>>();

  io.on("connection", (socket) => {
    socket.on("join-session", async (payload: JoinSessionPayload) => {
      const token = String(payload?.token ?? "");
      const clientId = String(payload?.clientId ?? "");
      const v = await opts.validator.validate(token);

      if (!v.valid) {
        const code = v.reason === "TOKEN_EXPIRED" ? "TOKEN_EXPIRED" : "INVALID_TOKEN";
        const err: InvalidSessionPayload = { ...makeError(code, "Session is not valid", { token }), token };
        socket.emit("invalid-session", err);
        return;
      }

      if (v.reason === "SESSION_ENDED" || v.status === "ended") {
        socket.emit("invalid-session", { ...makeError("SESSION_ENDED", "Session has ended", { token }), token });
        return;
      }

      // Reconnect safety: require a stable clientId to dedupe socket churn.
      // If missing/blank, treat this socket as a distinct client to avoid false merging.
      const effectiveClientId = clientId.trim().length ? clientId.trim() : socket.id;

      // Allow fast reconnect even if the session is currently "full", as long as this clientId
      // is already part of the session according to this server instance.
      const existingMembership = tokenClients.get(token)?.has(effectiveClientId) ?? false;
      if (!v.joinable && !existingMembership) {
        socket.emit("invalid-session", { ...makeError("SESSION_FULL", "Session is full", { token }), token });
        return;
      }

      // Join room first so any subsequent relays have a room.
      await socket.join(token);
      socketToToken.set(socket.id, token);
      socketToClientId.set(socket.id, effectiveClientId);

      const byClient = tokenClients.get(token) ?? new Map<string, string>();
      tokenClients.set(token, byClient);

      const existingSocketId = byClient.get(effectiveClientId);
      if (existingSocketId && existingSocketId === socket.id) {
        // Duplicate join from the same socket/clientId (can happen due to reconnect handlers).
        socket.emit("session-joined", {
          token,
          status: v.status,
          participantCount: v.participantCount,
          expiresAt: v.expiresAt,
          isReconnect: true
        });
        return;
      }
      const isReconnect = Boolean(existingSocketId && existingSocketId !== socket.id);

      if (isReconnect && existingSocketId) {
        // Replace existing socket for this clientId. Do not change participantCount.
        byClient.set(effectiveClientId, socket.id);
        const prev = io.sockets.sockets.get(existingSocketId);
        prev?.disconnect(true);
      }

      const updated = await opts.repo.update(token, (s) => {
        // If this client is already accounted for, keep counts stable.
        if (isReconnect) return { ...s };

        const nextCount = Math.min(SESSION_MAX_PARTICIPANTS, s.participantCount + 1);
        const nextStatus = nextCount >= 2 ? "active" : "waiting";
        // Optional bookkeeping: remember the first socket as creator (non-authoritative).
        const createdBySocketId = s.createdBySocketId ?? socket.id;
        return { ...s, participantCount: nextCount, status: nextStatus, createdBySocketId };
      });

      if (!updated) {
        socket.emit("invalid-session", { ...makeError("INVALID_TOKEN", "Session is not valid", { token }), token });
        return;
      }

      // If this was a new join (not reconnect), record membership after successful update.
      if (!isReconnect) {
        byClient.set(effectiveClientId, socket.id);
      }

      socket.emit("session-joined", {
        token,
        status: updated.status,
        participantCount: updated.participantCount,
        expiresAt: updated.expiresAt,
        isReconnect
      });

      if (isReconnect) {
        socket.to(token).emit("participant-reconnected", { token });
      } else if (updated.participantCount === 2) {
        socket.to(token).emit("participant-joined", { token });
      }
    });

    socket.on("offer", (payload) => {
      const token = socketToToken.get(socket.id);
      if (!token) return;
      socket.to(token).emit("offer", payload);
    });

    socket.on("answer", (payload) => {
      const token = socketToToken.get(socket.id);
      if (!token) return;
      socket.to(token).emit("answer", payload);
    });

    socket.on("ice-candidate", (payload) => {
      const token = socketToToken.get(socket.id);
      if (!token) return;
      socket.to(token).emit("ice-candidate", payload);
    });

    socket.on("message", (payload) => {
      const token = socketToToken.get(socket.id);
      if (!token) return;
      socket.to(token).emit("message", payload);
    });

    socket.on("session-ended", (payload) => {
      const token = socketToToken.get(socket.id);
      if (!token) return;
      socket.to(token).emit("session-ended", payload ?? { token });
    });

    socket.on("disconnect", async () => {
      const token = socketToToken.get(socket.id);
      if (!token) return;
      const clientId = socketToClientId.get(socket.id);
      socketToToken.delete(socket.id);
      socketToClientId.delete(socket.id);

      const byClient = tokenClients.get(token);
      const currentForClient = clientId && byClient ? byClient.get(clientId) : null;

      // If this socket was already superseded by a newer reconnect, do nothing.
      if (clientId && byClient && currentForClient && currentForClient !== socket.id) {
        return;
      }

      if (clientId && byClient) {
        byClient.delete(clientId);
        if (byClient.size === 0) tokenClients.delete(token);
      }

      const updated = await opts.repo.update(token, (s) => {
        const nextCount = Math.max(0, s.participantCount - 1);
        const nextStatus = nextCount >= 2 ? "active" : "waiting";
        return { ...s, participantCount: nextCount, status: nextStatus };
      });

      if (updated && updated.participantCount >= 1) {
        socket.to(token).emit("participant-left", { token });
      }
    });
  });

  return io;
}

