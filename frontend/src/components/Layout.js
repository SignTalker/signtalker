import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Layout(props) {
    return (_jsxs("div", { className: "min-h-screen", children: [_jsx("header", { className: "border-b border-slate-800 bg-slate-950/70 backdrop-blur", children: _jsxs("div", { className: "mx-auto flex max-w-5xl items-center justify-between px-4 py-4", children: [_jsx("div", { className: "text-lg font-semibold tracking-tight", children: "SignTalker" }), props.title ? _jsx("div", { className: "text-sm text-slate-300", children: props.title }) : null] }) }), _jsx("main", { className: "mx-auto max-w-5xl px-4 py-6", children: props.children })] }));
}
