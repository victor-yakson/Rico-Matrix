// components/Common/LoadingSpinner.tsx
export const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-white/8 bg-[radial-gradient(circle_at_center,rgba(241,210,133,0.08),transparent_68%)]" />
        <div className="absolute left-0 top-0 h-16 w-16 animate-spin rounded-full border-4 border-[rgba(107,184,255,0.22)] border-t-[var(--primary)] border-r-[var(--accent)] border-b-transparent" />
      </div>
      <p className="text-sm text-slate-400">Loading...</p>
    </div>
  );
};
