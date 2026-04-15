export type ErrorCode =
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "SESSION_FULL"
  | "SESSION_ENDED"
  | "INTERNAL_ERROR";

export type AppError = {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

