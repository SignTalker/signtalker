import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ControlBar(props) {
    return (_jsxs("div", { className: "flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-3", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsx("div", { className: "text-xs text-slate-300", children: "Session controls" }), _jsxs("div", { className: "flex items-center gap-2", children: [props.onDownloadTranscript ? (_jsx("button", { type: "button", onClick: props.onDownloadTranscript, className: "rounded-md border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-950", children: "Download transcript" })) : null, _jsx("button", { type: "button", onClick: props.onEnd, className: "rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500", children: "End session" })] })] }), props.onSendText ? (_jsxs("form", { className: "flex flex-wrap items-center gap-2", onSubmit: (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const fd = new FormData(form);
                    const text = String(fd.get("message") ?? "").trim();
                    if (!text)
                        return;
                    props.onSendText?.(text);
                    form.reset();
                }, children: [_jsx("label", { className: "sr-only", htmlFor: "message", children: "Message" }), _jsx("input", { id: "message", name: "message", className: "w-full flex-1 rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500", placeholder: "Type a message and press Enter\u2026", autoComplete: "off" }), _jsx("button", { type: "submit", disabled: props.canSend === false, className: "rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60", children: "Send" })] })) : null] }));
}
