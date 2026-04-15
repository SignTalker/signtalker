import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { useSession } from "../hooks/useSession";
import { StatusBanner } from "../components/StatusBanner";
export function SessionCreatePage(props) {
    const { state, createSession } = useSession();
    const link = useMemo(() => {
        if (state.kind !== "created")
            return null;
        const url = new URL(window.location.href);
        url.hash = `#/join?token=${state.data.token}`;
        return url.toString();
    }, [state]);
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Create session" }), _jsx("button", { onClick: props.onBack, className: "text-sm text-slate-300 hover:text-slate-100", children: "Back" })] }), _jsx("button", { onClick: () => void createSession(), className: "rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500", children: "Create session token" }), state.kind === "loading" ? _jsx(StatusBanner, { status: "warn", title: "Creating session\u2026" }) : null, state.kind === "error" ? _jsx(StatusBanner, { status: "error", title: state.message }) : null, state.kind === "created" ? (_jsxs("div", { className: "space-y-3 rounded-lg border border-slate-800 bg-slate-900/30 p-4", children: [_jsx("div", { className: "text-sm text-slate-300", children: "Session token" }), _jsx("div", { className: "text-2xl font-mono tracking-widest", children: state.data.token }), _jsxs("div", { className: "text-xs text-slate-400", children: ["Expires at: ", state.data.expiresAt] }), link ? (_jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "text-sm text-slate-300", children: "Shareable link" }), _jsx("div", { className: "break-all rounded-md bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-200", children: link })] })) : null, _jsx("div", { className: "flex gap-3", children: _jsx("button", { onClick: () => props.onGoToCall(state.data.token), className: "rounded-md border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-900/80", children: "Go to call screen" }) }), _jsx(StatusBanner, { status: "warn", title: "Waiting for participant to join", detail: "Socket join occurs on call screen." })] })) : null] }));
}
