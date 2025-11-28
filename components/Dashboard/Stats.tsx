'use client';

interface StatsProps {
  userData: any;
  globalStats: any;
}

export const Stats = ({ userData, globalStats }: StatsProps) => {
  const stats = [
    {
      name: 'Total Earnings',
      value: userData?.exists
        ? `$${(
            Number(userData.track1TotalEarned || 0) +
            Number(userData.track2TotalEarned || 0)
          ).toFixed(2)}`
        : '$0.00',
      description: 'Combined earnings from both tracks',
    },
    {
      name: 'Royalty Available',
      value: userData?.exists
        ? `$${Number(userData.royaltyAvailable || 0).toFixed(2)}`
        : '$0.00',
      description: 'Available royalty to claim',
    },
    {
      name: 'Chapters Unlocked',
      value: userData?.exists
        ? `${(userData.track1Unlocked || 0) + (userData.track2Unlocked || 0)}/24`
        : '0/24',
      description: 'Total chapters across both tracks',
    },
    {
      name: 'Matrix Cycles',
      value: userData?.exists
        ? `${(userData.track1TotalCycles || 0) +
            (userData.track2TotalCycles || 0)}`
        : '0',
      description: 'Total reinvestment cycles',
    },
  ];

  const accentBorders = [
    'border-yellow-400/60',
    'border-emerald-400/60',
    'border-sky-400/60',
    'border-purple-400/60',
  ];

  const accentGlows = [
    'shadow-[0_0_24px_rgba(250,204,21,0.4)]',
    'shadow-[0_0_24px_rgba(52,211,153,0.35)]',
    'shadow-[0_0_24px_rgba(56,189,248,0.35)]',
    'shadow-[0_0_24px_rgba(192,132,252,0.35)]',
  ];

  return (
    <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`
            relative overflow-hidden rounded-2xl border bg-slate-950/70 p-5
            backdrop-blur-sm transition-all duration-300
            ${accentBorders[index]}
            ${accentGlows[index]}
            hover:-translate-y-1
          `}
        >
          {/* subtle top glow */}
          <div className="pointer-events-none absolute inset-x-0 -top-10 h-14 bg-[radial-gradient(circle_at_top,_rgba(250,250,250,0.12),_transparent)]" />

          <dt className="relative text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {stat.name}
          </dt>

          <dd className="relative mt-3 text-3xl font-bold text-slate-50">
            {stat.value}
          </dd>

          <p className="relative mt-2 text-sm text-slate-400">
            {stat.description}
          </p>
        </div>
      ))}
    </div>
  );
};
