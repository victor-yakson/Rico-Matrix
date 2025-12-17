// components/Common/LoadingSpinner.tsx
export const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-yellow-500/30"></div>
        <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin"></div>
      </div>
      <p className="text-sm text-slate-400">Loading...</p>
    </div>
  );
};