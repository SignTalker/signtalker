export function HomePage(props: { onStart: () => void; onJoin: () => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">SignTalker</h1>
        <p className="max-w-2xl text-slate-300">
          Temporary token-based sessions for real-time sign ↔ speech assistance. No accounts, no uploads—client-side
          processing only.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={props.onStart}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Create session
        </button>
        <button
          onClick={props.onJoin}
          className="rounded-md border border-slate-700 bg-slate-900/40 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-900/70"
        >
          Join session
        </button>
      </div>
    </div>
  );
}

