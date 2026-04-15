import type { AppError, ErrorCode } from "@signtalker/shared";

export type ApiErrorResponse = {
  error: AppError;
};

export function makeError(code: ErrorCode, message: string, details?: Record<string, unknown>): ApiErrorResponse {
  return { error: { code, message, details } };
}

