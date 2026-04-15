import { StatusBanner } from "../components/StatusBanner";

export function ErrorPage(props: { title: string; detail?: string; onHome: () => void }) {
  return (
    <div className="space-y-4">
      <StatusBanner status="error" title={props.title} detail={props.detail} />
      <button
        onClick={props.onHome}
        className="rounded-md border border-slate-700 bg-slate-900/40 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-900/70"
      >
        Go Home
      </button>
    </div>
  );
}

