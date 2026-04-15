export function StatusBanner(props: { status: "ok" | "warn" | "error"; title: string; detail?: string }) {
  const styles =
    props.status === "ok"
      ? "border-emerald-700/60 bg-emerald-950/40 text-emerald-100"
      : props.status === "warn"
        ? "border-amber-700/60 bg-amber-950/40 text-amber-100"
        : "border-rose-700/60 bg-rose-950/40 text-rose-100";

  const role = props.status === "error" ? "alert" : "status";
  const ariaLive = props.status === "error" ? "assertive" : "polite";

  return (
    <div className={`rounded-lg border px-3 py-2 ${styles}`} role={role} aria-live={ariaLive}>
      <div className="text-sm font-medium">{props.title}</div>
      {props.detail ? <div className="mt-0.5 text-xs opacity-90">{props.detail}</div> : null}
    </div>
  );
}

