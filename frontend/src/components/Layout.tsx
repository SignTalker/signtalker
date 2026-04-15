import type { ReactNode } from "react";

export function Layout(props: { title?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="text-lg font-semibold tracking-tight">SignTalker</div>
          {props.title ? <div className="text-sm text-slate-300">{props.title}</div> : null}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{props.children}</main>
    </div>
  );
}

