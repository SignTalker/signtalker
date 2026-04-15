import { useCallback, useMemo, useState } from "react";
import { sessionCoordinator } from "../session/sessionCoordinator";
export function useSession() {
    const [state, setState] = useState({ kind: "idle" });
    const createSession = useCallback(async () => {
        setState({ kind: "loading" });
        try {
            const data = await sessionCoordinator.createSession();
            setState({ kind: "created", data });
            return data;
        }
        catch {
            setState({ kind: "error", message: "Failed to create session" });
            return null;
        }
    }, []);
    const validateSession = useCallback(async (token) => {
        setState({ kind: "loading" });
        try {
            const data = await sessionCoordinator.validateSession(token);
            setState({ kind: "validated", data });
            return data;
        }
        catch {
            setState({ kind: "error", message: "Failed to validate session" });
            return null;
        }
    }, []);
    const endSession = useCallback(async (token) => {
        setState({ kind: "loading" });
        try {
            const data = await sessionCoordinator.endSession(token);
            setState({ kind: "ended", ok: true });
            return data;
        }
        catch {
            setState({ kind: "error", message: "Failed to end session" });
            return null;
        }
    }, []);
    const api = useMemo(() => ({ createSession, validateSession, endSession, setIdle: () => setState({ kind: "idle" }) }), [createSession, validateSession, endSession]);
    return { state, ...api };
}
