// app/loading.tsx
export default function RootLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[radial-gradient(circle_at_top,_#111827,_#020617)]">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-2">
          Loading RicoMatrix
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-2">
          READ • EARN • OWN
        </h1>
        <p className="text-sm md:text-base text-slate-400">
          Preparing your dashboard and on-chain data...
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
        <span className="text-sm text-slate-400">
          Syncing with BSC network...
        </span>
      </div>
    </div>
  );
}
