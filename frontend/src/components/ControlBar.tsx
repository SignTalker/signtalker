export function ControlBar(props: {
  onEnd: () => void;
  onDownloadTranscript?: () => void;
  onSendText?: (text: string) => void;
  canSend?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-300">Session controls</div>
        <div className="flex items-center gap-2">
          {props.onDownloadTranscript ? (
            <button
              type="button"
              onClick={props.onDownloadTranscript}
              className="rounded-md border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-950"
            >
              Download transcript
            </button>
          ) : null}
          <button
            type="button"
            onClick={props.onEnd}
            className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500"
          >
            End session
          </button>
        </div>
      </div>

      {props.onSendText ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const text = String(fd.get("message") ?? "").trim();
            if (!text) return;
            props.onSendText?.(text);
            form.reset();
          }}
        >
          <label className="sr-only" htmlFor="message">
            Message
          </label>
          <input
            id="message"
            name="message"
            className="w-full flex-1 rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500"
            placeholder="Type a message and press Enter…"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={props.canSend === false}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </form>
      ) : null}
    </div>
  );
}

