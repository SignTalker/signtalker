export function VideoPanel(props: {
  label: string;
  videoRef?: React.Ref<HTMLVideoElement>;
  placeholder?: string;
}) {
  return (
    <div className="flex h-64 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900/30">
      <div className="border-b border-slate-800 px-3 py-2 text-xs text-slate-300">{props.label}</div>
      {props.videoRef ? (
        <video ref={props.videoRef} className="h-full w-full bg-black object-cover" autoPlay playsInline muted />
      ) : (
        <div className="flex flex-1 items-center justify-center px-3 text-center text-sm text-slate-400">
          {props.placeholder ?? "Video unavailable."}
        </div>
      )}
    </div>
  );
}

