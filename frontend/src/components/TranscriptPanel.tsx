import { useEffect, useMemo, useRef } from "react";

export type TranscriptItem = {
  id: string;
  createdAt: string; // ISO
  senderLabel: "You" | "Peer" | "System";
  origin?: "typed" | "speech" | "sign";
  text: string;
  kind: "text" | "system";
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function originLabel(origin?: TranscriptItem["origin"]): string {
  if (origin === "speech") return "Speech";
  if (origin === "sign") return "Sign";
  if (origin === "typed") return "Text";
  return "Text";
}

export function TranscriptPanel(props: { items: TranscriptItem[]; onDownload?: () => void }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const sorted = useMemo(() => {
    const copy = [...props.items];
    copy.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    return copy;
  }, [props.items]);

  useEffect(() => {
    // Auto-scroll to newest message without fighting manual scrolling too much.
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
    if (nearBottom) endRef.current?.scrollIntoView({ block: "end" });
  }, [sorted.length]);

  return (
    <div className="flex h-64 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900/30">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
        <div className="text-xs text-slate-300">Transcript</div>
        {props.onDownload ? (
          <button
            type="button"
            onClick={props.onDownload}
            className="rounded-md border border-slate-700 bg-slate-950/40 px-2 py-1 text-xs text-slate-100 hover:bg-slate-950"
            aria-label="Download transcript"
          >
            Download .txt
          </button>
        ) : null}
      </div>
      <div ref={scrollerRef} className="flex-1 overflow-auto px-3 py-2 text-base leading-relaxed">
        {sorted.length === 0 ? (
          <div className="text-slate-400">No messages yet.</div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((m) => (
              <li key={m.id} className="text-slate-100">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-medium">{m.senderLabel}</span>
                  <span className="text-xs text-slate-400">{formatTime(m.createdAt)}</span>
                  {m.kind === "text" ? (
                    <span className="text-xs text-slate-400">({originLabel(m.origin)})</span>
                  ) : (
                    <span className="text-xs text-slate-400">(System)</span>
                  )}
                </div>
                <div className={m.kind === "system" ? "text-slate-300" : "text-slate-100"}>{m.text}</div>
              </li>
            ))}
          </ul>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

