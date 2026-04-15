export type SessionToken = string;

export type SessionStatus = "waiting" | "active" | "ended" | "expired";

export type SessionRecord = {
  token: SessionToken;
  createdAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  status: SessionStatus;
  participantCount: number; // 0..2
  createdBySocketId?: string;
};

export type CreateSessionResponse = {
  token: SessionToken;
  expiresAt: string;
  status: SessionStatus;
  participantCount: number;
};

export type ValidateSessionResponse = {
  valid: boolean;
  token: SessionToken;
  status: SessionStatus | "invalid";
  participantCount: number;
  expiresAt: string | null;
  joinable: boolean;
  /**
   * Optional machine-readable reason for invalid/non-joinable states.
   * Kept optional for backwards compatibility with older clients.
   */
  reason?: "INVALID_TOKEN" | "TOKEN_EXPIRED" | "SESSION_FULL" | "SESSION_ENDED";
};

