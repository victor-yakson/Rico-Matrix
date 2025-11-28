'use client';

interface MatrixStatsProps {
  userData: any;
}

export const MatrixStats = ({ userData }: MatrixStatsProps) => {
  const stats = [
    {
      name: 'X3 Total Earnings',
      value: userData?.exists
        ? `$${Number(userData.track1TotalEarned || 0).toFixed(2)}`
        : '$0.00',
      description: 'Earnings from X3 Matrix',
      accent: 'from-yellow-400 via-amber-500 to-yellow-300',
      dot: 'bg-yellow-300',
      border: 'border-yellow-400/60',
      glow: 'shadow-[0_0_24px_rgba(250,204,21,0.45)]',
    },
    {
      name: 'X6 Total Earnings',
      value: userData?.exists
        ? `$${Number(userData.track2TotalEarned || 0).toFixed(2)}`
        : '$0.00',
      description: 'Earnings from X6 Matrix',
      accent: 'from-violet-500 via-purple-500 to-fuchsia-400',
      dot: 'bg-purple-300',
      border: 'border-purple-400/60',
      glow: 'shadow-[0_0_24px_rgba(192,132,252,0.45)]',
    },
    {
      name: 'X3 Cycles',
      value: userData?.exists
        ? String(userData.track1TotalCycles || 0)
        : '0',
      description: 'Reinvestment cycles',
      accent: 'from-emerald-500 via-emerald-400 to-teal-300',
      dot: 'bg-emerald-300',
      border: 'border-emerald-400/60',
      glow: 'shadow-[0_0_24px_rgba(52,211,153,0.45)]',
    },
    {
      name: 'X6 Cycles',
      value: userData?.exists
        ? String(userData.track2TotalCycles || 0)
        : '0',
      description: 'Reinvestment cycles',
      accent: 'from-sky-500 via-cyan-400 to-blue-400',
      dot: 'bg-sky-300',
      border: 'border-sky-400/60',
      glow: 'shadow-[0_0_24px_rgba(56,189,248,0.45)]',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`
            relative overflow-hidden rounded-2xl border bg-slate-950/80 p-5
            backdrop-blur-sm transition-all duration-300
            ${stat.border} ${stat.glow}
            hover:-translate-y-1
          `}
        >
          {/* Accent gradient strip at the top */}
          <div
            className={`
              pointer-events-none absolute inset-x-0 top-0 h-1
              bg-gradient-to-r ${stat.accent}
            `}
          />

          <div className="flex items-center justify-between mb-2 relative">
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {stat.name}
            </dt>
            <span
              className={`w-2 h-2 rounded-full ${stat.dot} shadow-[0_0_10px_rgba(255,255,255,0.5)]`}
            />
          </div>

          <dd className="relative text-2xl md:text-3xl font-bold text-slate-50">
            {stat.value}
          </dd>

          <p className="relative mt-1.5 text-sm text-slate-400">
            {stat.description}
          </p>
        </div>
      ))}
    </div>
  );
};
