import crypto from "node:crypto";
import type { CreateSessionResponse, SessionRecord, SessionStatus, ValidateSessionResponse } from "@signtalker/shared";
import { SESSION_TTL_SECONDS } from "../models/session.model";
import type { SessionRepository } from "../repositories/session.repository";
import type { TokenValidationService } from "./token-validation.service";

const ALPHANUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomToken(length = 8): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHANUM[bytes[i] % ALPHANUM.length];
  return out;
}

export class SessionService {
  constructor(
    private readonly repo: SessionRepository,
    private readonly validator: TokenValidationService
  ) {}

  async generateUniqueToken(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const token = randomToken(8);
      const exists = await this.repo.exists(token);
      if (!exists) return token;
    }
    throw new Error("Failed to generate unique session token");
  }

  async createSession(createdBySocketId?: string): Promise<CreateSessionResponse> {
    const token = await this.generateUniqueToken();
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
    const status: SessionStatus = "waiting";

    const session: SessionRecord = {
      token,
      createdAt,
      expiresAt,
      status,
      participantCount: 0,
      createdBySocketId
    };

    await this.repo.set(session, SESSION_TTL_SECONDS);
    // Keep a small lookup marker longer than the session TTL to enable "expired" UI state
    // even after Redis evicts the session key.
    await this.repo.setLookup(token, expiresAt, SESSION_TTL_SECONDS + 60 * 60);

    return { token, expiresAt, status, participantCount: 0 };
  }

  async validateSession(token: string): Promise<ValidateSessionResponse> {
    const v = await this.validator.validate(token);
    return {
      valid: v.valid,
      token,
      status: v.status,
      participantCount: v.participantCount,
      expiresAt: v.expiresAt,
      joinable: v.joinable,
      reason: v.reason
    };
  }

  async endSession(token: string): Promise<{ ok: true }> {
    // Best-effort: if the token is valid, we leave an "ended" marker so clients can
    // distinguish ended vs invalid after deletion.
    if (this.validator.isTokenFormatValid(token)) {
      const session = await this.repo.get(token);
      const expiresAt = session?.expiresAt ?? (await this.repo.getLookupExpiresAt(token));
      if (expiresAt) {
        // Ended marker TTL: at least 1 hour, at most 25 hours, roughly aligned to session TTL.
        const ttl = Math.max(60 * 60, Math.min(25 * 60 * 60, SESSION_TTL_SECONDS + 60 * 60));
        await this.repo.markEnded(token, expiresAt, ttl);
      } else {
        // If it's already gone and we have no lookup, just ensure the session key is removed.
        await this.repo.delete(token);
      }
    }
    return { ok: true };
  }
}

