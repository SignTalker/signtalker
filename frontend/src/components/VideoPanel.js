import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function VideoPanel(props) {
    return (_jsxs("div", { className: "flex h-64 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900/30", children: [_jsx("div", { className: "border-b border-slate-800 px-3 py-2 text-xs text-slate-300", children: props.label }), props.videoRef ? (_jsx("video", { ref: props.videoRef, className: "h-full w-full bg-black object-cover", autoPlay: true, playsInline: true, muted: true })) : (_jsx("div", { className: "flex flex-1 items-center justify-center px-3 text-center text-sm text-slate-400", children: props.placeholder ?? "Video unavailable." }))] }));
}
