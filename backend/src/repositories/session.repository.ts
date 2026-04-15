import type { RedisClientType } from "redis";
import type { SessionEntity, SessionStatusInternal } from "../models/session.model";

function sessionKey(token: string) {
  return `session:${token}`;
}

function endedKey(token: string) {
  return `sessionEnded:${token}`;
}

function lookupKey(token: string) {
  return `sessionLookup:${token}`;
}

type EndedMarker = {
  token: string;
  endedAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
};

type LookupMarker = {
  token: string;
  expiresAt: string; // ISO timestamp
};

export class SessionRepository {
  constructor(private readonly redis: RedisClientType) {}

  async get(token: string): Promise<SessionEntity | null> {
    const raw = await this.redis.get(sessionKey(token));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionEntity;
    } catch {
      return null;
    }
  }

  async exists(token: string): Promise<boolean> {
    return (await this.redis.exists(sessionKey(token))) === 1;
  }

  async set(session: SessionEntity, ttlSeconds: number): Promise<void> {
    await this.redis.set(sessionKey(session.token), JSON.stringify(session), { EX: ttlSeconds });
  }

  async delete(token: string): Promise<void> {
    await this.redis.del(sessionKey(token));
  }

  async ttlSeconds(token: string): Promise<number> {
    return await this.redis.ttl(sessionKey(token));
  }

  async updateStatus(token: string, status: SessionStatusInternal): Promise<SessionEntity | null> {
    return await this.update(token, (s) => ({ ...s, status }));
  }

  async updateParticipantCount(token: string, nextCount: number, nextStatus?: SessionStatusInternal): Promise<SessionEntity | null> {
    return await this.update(token, (s) => ({
      ...s,
      participantCount: nextCount,
      status: nextStatus ?? s.status
    }));
  }

  /**
   * A lightweight marker so the API can distinguish "expired" vs "invalid"
   * after the primary session key is gone.
   *
   * We keep this slightly longer than the session TTL to avoid flapping UI
   * around boundary conditions and clock skew.
   */
  async setLookup(token: string, expiresAt: string, ttlSeconds: number): Promise<void> {
    const marker: LookupMarker = { token, expiresAt };
    await this.redis.set(lookupKey(token), JSON.stringify(marker), { EX: ttlSeconds });
  }

  async getLookupExpiresAt(token: string): Promise<string | null> {
    const raw = await this.redis.get(lookupKey(token));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as LookupMarker;
      return typeof parsed.expiresAt === "string" ? parsed.expiresAt : null;
    } catch {
      return null;
    }
  }

  async markEnded(token: string, expiresAt: string, ttlSeconds: number): Promise<void> {
    const marker: EndedMarker = { token, endedAt: new Date().toISOString(), expiresAt };
    // Write marker first, then delete the session record.
    await this.redis.set(endedKey(token), JSON.stringify(marker), { EX: ttlSeconds });
    await this.delete(token);
  }

  async isEnded(token: string): Promise<boolean> {
    return (await this.redis.exists(endedKey(token))) === 1;
  }

  async getEndedExpiresAt(token: string): Promise<string | null> {
    const raw = await this.redis.get(endedKey(token));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as EndedMarker;
      return typeof parsed.expiresAt === "string" ? parsed.expiresAt : null;
    } catch {
      return null;
    }
  }

  /**
   * Optimistic transaction update to avoid lost updates under concurrent joins/leaves.
   */
  async update(token: string, mutate: (current: SessionEntity) => SessionEntity, maxRetries = 5): Promise<SessionEntity | null> {
    const k = sessionKey(token);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await this.redis.watch(k);
      const raw = await this.redis.get(k);
      if (!raw) {
        await this.redis.unwatch();
        return null;
      }

      let current: SessionEntity;
      try {
        current = JSON.parse(raw) as SessionEntity;
      } catch {
        await this.redis.unwatch();
        return null;
      }

      const next = mutate(current);
      const tx = this.redis.multi();
      tx.set(k, JSON.stringify(next), { KEEPTTL: true });
      const res = await tx.exec();
      if (res) return next;
    }

    await this.redis.unwatch();
    return null;
  }
}

