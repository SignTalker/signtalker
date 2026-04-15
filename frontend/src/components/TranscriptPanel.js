import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef } from "react";
function formatTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function originLabel(origin) {
    if (origin === "speech")
        return "Speech";
    if (origin === "sign")
        return "Sign";
    if (origin === "typed")
        return "Text";
    return "Text";
}
export function TranscriptPanel(props) {
    const scrollerRef = useRef(null);
    const endRef = useRef(null);
    const sorted = useMemo(() => {
        const copy = [...props.items];
        copy.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
        return copy;
    }, [props.items]);
    useEffect(() => {
        // Auto-scroll to newest message without fighting manual scrolling too much.
        const scroller = scrollerRef.current;
        if (!scroller)
            return;
        const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
        if (nearBottom)
            endRef.current?.scrollIntoView({ block: "end" });
    }, [sorted.length]);
    return (_jsxs("div", { className: "flex h-64 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900/30", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2", children: [_jsx("div", { className: "text-xs text-slate-300", children: "Transcript" }), props.onDownload ? (_jsx("button", { type: "button", onClick: props.onDownload, className: "rounded-md border border-slate-700 bg-slate-950/40 px-2 py-1 text-xs text-slate-100 hover:bg-slate-950", "aria-label": "Download transcript", children: "Download .txt" })) : null] }), _jsxs("div", { ref: scrollerRef, className: "flex-1 overflow-auto px-3 py-2 text-base leading-relaxed", children: [sorted.length === 0 ? (_jsx("div", { className: "text-slate-400", children: "No messages yet." })) : (_jsx("ul", { className: "space-y-2", children: sorted.map((m) => (_jsxs("li", { className: "text-slate-100", children: [_jsxs("div", { className: "flex flex-wrap items-baseline gap-x-2 gap-y-1", children: [_jsx("span", { className: "font-medium", children: m.senderLabel }), _jsx("span", { className: "text-xs text-slate-400", children: formatTime(m.createdAt) }), m.kind === "text" ? (_jsxs("span", { className: "text-xs text-slate-400", children: ["(", originLabel(m.origin), ")"] })) : (_jsx("span", { className: "text-xs text-slate-400", children: "(System)" }))] }), _jsx("div", { className: m.kind === "system" ? "text-slate-300" : "text-slate-100", children: m.text })] }, m.id))) })), _jsx("div", { ref: endRef })] })] }));
}
