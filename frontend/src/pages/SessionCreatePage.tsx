import { useMemo } from "react";
import { useSession } from "../hooks/useSession";
import { StatusBanner } from "../components/StatusBanner";

export function SessionCreatePage(props: { onBack: () => void; onGoToCall: (token: string) => void }) {
  const { state, createSession } = useSession();

  const link = useMemo(() => {
    if (state.kind !== "created") return null;
    const url = new URL(window.location.href);
    url.hash = `#/join?token=${state.data.token}`;
    return url.toString();
  }, [state]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Create session</h2>
        <button onClick={props.onBack} className="text-sm text-slate-300 hover:text-slate-100">
          Back
        </button>
      </div>

      <button
        onClick={() => void createSession()}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Create session token
      </button>

      {state.kind === "loading" ? <StatusBanner status="warn" title="Creating session…" /> : null}
      {state.kind === "error" ? <StatusBanner status="error" title={state.message} /> : null}

      {state.kind === "created" ? (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-sm text-slate-300">Session token</div>
          <div className="text-2xl font-mono tracking-widest">{state.data.token}</div>
          <div className="text-xs text-slate-400">Expires at: {state.data.expiresAt}</div>
          {link ? (
            <div className="space-y-1">
              <div className="text-sm text-slate-300">Shareable link</div>
              <div className="break-all rounded-md bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-200">
                {link}
              </div>
            </div>
          ) : null}
          <div className="flex gap-3">
            <button
              onClick={() => props.onGoToCall(state.data.token)}
              className="rounded-md border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-900/80"
            >
              Go to call screen
            </button>
          </div>
          <StatusBanner status="warn" title="Waiting for participant to join" detail="Socket join occurs on call screen." />
        </div>
      ) : null}
    </div>
  );
}
