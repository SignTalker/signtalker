import { useEffect, useMemo, useState } from "react";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { SessionCreatePage } from "./pages/SessionCreatePage";
import { SessionJoinPage } from "./pages/SessionJoinPage";
import { CallPage } from "./pages/CallPage";
import { ErrorPage } from "./pages/ErrorPage";

type Route =
  | { kind: "home" }
  | { kind: "create" }
  | { kind: "join"; token?: string }
  | { kind: "call"; token: string }
  | { kind: "error"; title: string; detail?: string };

function parseHash(): Route {
  const hash = window.location.hash || "#/";
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const [path, query] = raw.split("?");

  if (path === "/" || path === "") return { kind: "home" };
  if (path === "/create") return { kind: "create" };
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

function nav(to: string) {
  window.location.hash = to;
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash());

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const title = useMemo(() => {
    if (route.kind === "home") return "Home";
    if (route.kind === "create") return "Create";
    if (route.kind === "join") return "Join";
    if (route.kind === "call") return "Call";
    return "Error";
  }, [route.kind]);

  return (
    <Layout title={title}>
      {route.kind === "home" ? (
        <HomePage onStart={() => nav("/create")} onJoin={() => nav("/join")} />
      ) : null}

      {route.kind === "create" ? (
        <SessionCreatePage onBack={() => nav("/")} onGoToCall={(t) => nav(`/call/${t}`)} />
      ) : null}

      {route.kind === "join" ? (
        <SessionJoinPage
          initialToken={route.token}
          onBack={() => nav("/")}
          onGoToCall={(t) => nav(`/call/${t}`)}
        />
      ) : null}

      {route.kind === "call" ? <CallPage token={route.token} onExit={() => nav("/")} /> : null}

      {route.kind === "error" ? <ErrorPage title={route.title} detail={route.detail} onHome={() => nav("/")} /> : null}
    </Layout>
  );
}
