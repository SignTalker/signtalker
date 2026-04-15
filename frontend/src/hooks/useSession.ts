import { useCallback, useMemo, useState } from "react";
import type { CreateSessionResponse, ValidateSessionResponse } from "@signtalker/shared";
import { sessionCoordinator } from "../session/sessionCoordinator";

type SessionUiState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "created"; data: CreateSessionResponse }
  | { kind: "validated"; data: ValidateSessionResponse }
  | { kind: "ended"; ok: true }
  | { kind: "error"; message: string };

export function useSession() {
  const [state, setState] = useState<SessionUiState>({ kind: "idle" });

  const createSession = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const data = await sessionCoordinator.createSession();
      setState({ kind: "created", data });
      return data;
    } catch {
      setState({ kind: "error", message: "Failed to create session" });
      return null;
    }
  }, []);

  const validateSession = useCallback(async (token: string) => {
    setState({ kind: "loading" });
    try {
      const data = await sessionCoordinator.validateSession(token);
      setState({ kind: "validated", data });
      return data;
    } catch {
      setState({ kind: "error", message: "Failed to validate session" });
      return null;
    }
  }, []);

  const endSession = useCallback(async (token: string) => {
    setState({ kind: "loading" });
    try {
      const data = await sessionCoordinator.endSession(token);
      setState({ kind: "ended", ok: true });
      return data;
    } catch {
      setState({ kind: "error", message: "Failed to end session" });
      return null;
    }
  }, []);

  const api = useMemo(
    () => ({ createSession, validateSession, endSession, setIdle: () => setState({ kind: "idle" }) }),
    [createSession, validateSession, endSession]
  );

  return { state, ...api };
}

