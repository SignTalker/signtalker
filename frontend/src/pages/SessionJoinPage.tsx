import { useMemo, useState } from "react";
import { useSession } from "../hooks/useSession";
import { StatusBanner } from "../components/StatusBanner";

function normalizeToken(raw: string) {
  return raw.trim();
}

export function SessionJoinPage(props: { onBack: () => void; onGoToCall: (token: string) => void; initialToken?: string }) {
  const { state, validateSession } = useSession();
  const [token, setToken] = useState(props.initialToken ?? "");

  const banner = useMemo(() => {
    if (state.kind === "loading") return <StatusBanner status="warn" title="Validating…" />;
    if (state.kind === "error") return <StatusBanner status="error" title={state.message} />;
    if (state.kind !== "validated") return null;

    const v = state.data;
    if (!v.valid) {
      const title = v.status === "expired" || v.reason === "TOKEN_EXPIRED" ? "Session expired" : "Invalid session token";
      return <StatusBanner status="error" title={title} />;
    }

    if (!v.joinable && v.participantCount >= 2) return <StatusBanner status="warn" title="Session is full" />;
    if (v.status === "ended" || v.reason === "SESSION_ENDED") return <StatusBanner status="error" title="Session ended" />;

    return <StatusBanner status="ok" title="Session is joinable" detail={`Participants: ${v.participantCount}/2`} />;
  }, [state]);

  const canJoin =
    state.kind === "validated" &&
    state.data.valid &&
    state.data.joinable &&
    state.data.participantCount < 2 &&
    state.data.status !== "ended";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Join session</h2>
        <button onClick={props.onBack} className="text-sm text-slate-300 hover:text-slate-100">
          Back
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-slate-300">Token (8 alphanumeric characters)</label>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 font-mono text-lg tracking-widest text-slate-100 outline-none focus:border-indigo-500"
          placeholder="e.g. A1b2C3d4"
          maxLength={32}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => void validateSession(normalizeToken(token))}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Validate
        </button>
        <button
          disabled={!canJoin}
          onClick={() => props.onGoToCall(normalizeToken(token))}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            canJoin ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-slate-800 text-slate-400"
          }`}
        >
          Join call
        </button>
      </div>

      {banner}
    </div>
  );
}

