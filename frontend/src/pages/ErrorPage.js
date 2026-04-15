import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StatusBanner } from "../components/StatusBanner";
export function ErrorPage(props) {
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(StatusBanner, { status: "error", title: props.title, detail: props.detail }), _jsx("button", { onClick: props.onHome, className: "rounded-md border border-slate-700 bg-slate-900/40 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-900/70", children: "Go Home" })] }));
}
