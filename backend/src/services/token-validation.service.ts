import { SESSION_MAX_PARTICIPANTS } from "../models/session.model";
import type { SessionEntity } from "../models/session.model";
import type { SessionRepository } from "../repositories/session.repository";

export type SessionValidation = {
  valid: boolean;
  status: SessionEntity["status"] | "invalid";
  participantCount: number;
  expiresAt: string | null;
  joinable: boolean;
  reason?: "INVALID_TOKEN" | "TOKEN_EXPIRED" | "SESSION_FULL" | "SESSION_ENDED";
};

export class TokenValidationService {
  constructor(private readonly repo: SessionRepository) {}

  isTokenFormatValid(token: string): boolean {
    return /^[A-Za-z0-9]{8}$/.test(token);
  }

  async exists(token: string): Promise<boolean> {
    return await this.repo.exists(token);
  }

  async isExpired(token: string): Promise<boolean> {
    const ttl = await this.repo.ttlSeconds(token);
    return ttl <= 0;
  }

  async validate(token: string): Promise<SessionValidation> {
    if (!this.isTokenFormatValid(token)) {
      return {
        valid: false,
        status: "invalid",
        participantCount: 0,
        expiresAt: null,
        joinable: false,
        reason: "INVALID_TOKEN"
      };
    }

    const session = await this.repo.get(token);
    if (!session) {
      // Distinguish terminal states even after primary key deletion/expiry.
      const ended = await this.repo.isEnded(token);
      if (ended) {
        return {
          valid: true,
          status: "ended",
          participantCount: 0,
          expiresAt: (await this.repo.getEndedExpiresAt(token)) ?? null,
          joinable: false,
          reason: "SESSION_ENDED"
        };
      }

      const lookupExpiresAt = await this.repo.getLookupExpiresAt(token);
      if (lookupExpiresAt && Date.parse(lookupExpiresAt) <= Date.now()) {
        return {
          valid: false,
          status: "expired",
          participantCount: 0,
          expiresAt: lookupExpiresAt,
          joinable: false,
          reason: "TOKEN_EXPIRED"
        };
      }

      return {
        valid: false,
        status: "invalid",
        participantCount: 0,
        expiresAt: null,
        joinable: false,
        reason: "INVALID_TOKEN"
      };
    }

    if (session.status === "ended") {
      return {
        valid: true,
        status: "ended",
        participantCount: session.participantCount,
        expiresAt: session.expiresAt,
        joinable: false,
        reason: "SESSION_ENDED"
      };
    }

    const now = Date.now();
    if (Date.parse(session.expiresAt) <= now) {
      return {
        valid: false,
        status: "expired",
        participantCount: session.participantCount,
        expiresAt: session.expiresAt,
        joinable: false,
        reason: "TOKEN_EXPIRED"
      };
    }

    const joinable =
      (session.status === "waiting" || session.status === "active") &&
      session.participantCount < SESSION_MAX_PARTICIPANTS;

    if (!joinable && session.participantCount >= SESSION_MAX_PARTICIPANTS) {
      return {
        valid: true,
        status: session.status,
        participantCount: session.participantCount,
        expiresAt: session.expiresAt,
        joinable: false,
        reason: "SESSION_FULL"
      };
    }

    return {
      valid: true,
      status: session.status,
      participantCount: session.participantCount,
      expiresAt: session.expiresAt,
      joinable
    };
  }
}

