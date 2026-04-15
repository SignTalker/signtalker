import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { SessionCreatePage } from "./pages/SessionCreatePage";
import { SessionJoinPage } from "./pages/SessionJoinPage";
import { CallPage } from "./pages/CallPage";
import { ErrorPage } from "./pages/ErrorPage";
function parseHash() {
    const hash = window.location.hash || "#/";
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    const [path, query] = raw.split("?");
    if (path === "/" || path === "")
        return { kind: "home" };
    if (path === "/create")
        return { kind: "create" };
    if (path === "/join") {
        const params = new URLSearchParams(query ?? "");
        const token = params.get("token") ?? undefined;
        return { kind: "join", token };
    }
    if (path?.startsWith("/call/")) {
        const token = path.replace("/call/", "");
        return token ? { kind: "call", token } : { kind: "error", title: "Missing token" };
    }
    return { kind: "error", title: "Not found", detail: `Unknown route: ${hash}` };
}
function nav(to) {
    window.location.hash = to;
}
export default function App() {
    const [route, setRoute] = useState(() => parseHash());
    useEffect(() => {
        const onChange = () => setRoute(parseHash());
        window.addEventListener("hashchange", onChange);
        return () => window.removeEventListener("hashchange", onChange);
    }, []);
    const title = useMemo(() => {
        if (route.kind === "home")
            return "Home";
        if (route.kind === "create")
            return "Create";
        if (route.kind === "join")
            return "Join";
        if (route.kind === "call")
            return "Call";
        return "Error";
    }, [route.kind]);
    return (_jsxs(Layout, { title: title, children: [route.kind === "home" ? (_jsx(HomePage, { onStart: () => nav("/create"), onJoin: () => nav("/join") })) : null, route.kind === "create" ? (_jsx(SessionCreatePage, { onBack: () => nav("/"), onGoToCall: (t) => nav(`/call/${t}`) })) : null, route.kind === "join" ? (_jsx(SessionJoinPage, { initialToken: route.token, onBack: () => nav("/"), onGoToCall: (t) => nav(`/call/${t}`) })) : null, route.kind === "call" ? _jsx(CallPage, { token: route.token, onExit: () => nav("/") }) : null, route.kind === "error" ? _jsx(ErrorPage, { title: route.title, detail: route.detail, onHome: () => nav("/") }) : null] }));
}
