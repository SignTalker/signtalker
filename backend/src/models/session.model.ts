import type { SessionRecord, SessionStatus } from "@signtalker/shared";

export type SessionStatusInternal = SessionStatus;

export type SessionEntity = SessionRecord;

export const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours
export const SESSION_MAX_PARTICIPANTS = 2;

