'use client';

interface ProfileStatsProps {
  userData: any;
}

// Format currency with commas
const formatCurrency = (amount: string | number): string => {
  const numberValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numberValue)) return '0.00';

  return numberValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  });
};

export const ProfileStats = ({ userData }: ProfileStatsProps) => {
  const totalEarnings = userData?.exists
    ? Number(userData.track1TotalEarned || 0) +
      Number(userData.track2TotalEarned || 0)
    : 0;

  const totalCycles = userData?.exists
    ? (userData.track1TotalCycles || 0) + (userData.track2TotalCycles || 0)
    : 0;

  const totalChapters = userData?.exists
    ? (userData.track1Unlocked || 0) + (userData.track2Unlocked || 0)
    : 0;

  const progressPercentage = Math.min((totalChapters / 24) * 100, 100);

  const stats = [
    {
      title: 'Total Earnings',
      value: `$${formatCurrency(totalEarnings)}`,
      description: 'Combined earnings from both matrix tracks',
      icon: '💰',
      accent: 'from-yellow-400 via-amber-500 to-yellow-300',
      border: 'border-yellow-400/60',
      text: 'text-yellow-300',
    },
    {
      title: 'Royalty Available',
      value: `$${userData?.exists
        ? formatCurrency(userData.royaltyAvailable || 0)
        : '0.00'}`,
      description: 'Available royalty to claim',
      icon: '👑',
      accent: 'from-emerald-400 via-emerald-500 to-teal-300',
      border: 'border-emerald-400/60',
      text: 'text-emerald-300',
    },
    {
      title: 'Royalty Share',
      value: userData?.exists ? `${userData.royaltyPercent}%` : '0%',
      description: 'Your share of the royalty pool',
      icon: '📊',
      accent: 'from-sky-400 via-cyan-400 to-blue-400',
      border: 'border-sky-400/60',
      text: 'text-sky-300',
    },
    {
      title: 'Total Claimed',
      value: `$${userData?.exists
        ? formatCurrency(userData.royaltiesClaimed || 0)
        : '0.00'}`,
      description: 'Lifetime royalty earnings',
      icon: '🏆',
      accent: 'from-violet-500 via-purple-500 to-fuchsia-400',
      border: 'border-purple-400/60',
      text: 'text-purple-300',
    },
  ];

  const trackStats = [
    {
      track: 'X3 Matrix',
      earnings: userData?.track1TotalEarned || '0',
      cycles: userData?.track1TotalCycles || 0,
      chapters: userData?.track1Unlocked || 0,
      border: 'border-yellow-400/50',
      dot: 'bg-yellow-300',
    },
    {
      track: 'X6 Matrix',
      earnings: userData?.track2TotalEarned || '0',
      cycles: userData?.track2TotalCycles || 0,
      chapters: userData?.track2Unlocked || 0,
      border: 'border-purple-400/60',
      dot: 'bg-purple-300',
    },
  ];

  const achievements = [
    { name: 'First Chapter', earned: userData?.exists, icon: '🎯' },
    { name: 'Matrix Master', earned: totalCycles > 0, icon: '🔮' },
    {
      name: 'Royalty Earner',
      earned: Number(userData?.royaltiesClaimed || 0) > 0,
      icon: '👑',
    },
    { name: 'Quantum Reader', earned: totalChapters >= 12, icon: '⚡' },
  ];

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.9)] backdrop-blur-sm">
        <h3 className="mb-4 text-xl font-bold text-slate-50">
          Progress Overview
        </h3>

        {/* Progress Bar */}
        <div className="mb-5">
          <div className="mb-2 flex justify-between text-xs text-slate-400">
            <span>Chapter Progress</span>
            <span>
              {totalChapters}/24 ({Math.round(progressPercentage)}%)
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-yellow-400 via-amber-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-300">
              {totalChapters}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
              Chapters
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-300">
              {totalCycles}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
              Cycles
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-50">
              ${formatCurrency(totalEarnings)}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
              Earned
            </div>
          </div>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`
              relative overflow-hidden rounded-2xl border bg-slate-950/80 p-4
              shadow-[0_0_22px_rgba(0,0,0,0.8)] backdrop-blur-sm
              ${stat.border}
            `}
          >
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.accent}`}
            />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {stat.title}
                </p>
                <p className={`mt-2 text-2xl font-bold ${stat.text}`}>
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {stat.description}
                </p>
              </div>
              <span className="text-2xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Track Performance */}
      <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.9)] backdrop-blur-sm">
        <h3 className="mb-4 text-xl font-bold text-slate-50">
          Track Performance
        </h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {trackStats.map((track, index) => (
            <div
              key={index}
              className={`rounded-2xl border bg-slate-950/80 p-4 shadow-[0_0_20px_rgba(0,0,0,0.7)] ${track.border}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-100">
                  {track.track}
                </h4>
                <span
                  className={`h-2 w-2 rounded-full ${track.dot} shadow-[0_0_10px_rgba(255,255,255,0.5)]`}
                />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Earnings:</span>
                  <span className="font-semibold text-slate-50">
                    ${formatCurrency(track.earnings)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cycles:</span>
                  <span className="font-semibold text-yellow-300">
                    {track.cycles}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Chapters:</span>
                  <span className="font-semibold text-emerald-300">
                    {track.chapters}/12
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.9)] backdrop-blur-sm">
        <h3 className="mb-4 text-xl font-bold text-slate-50">
          Achievements
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {achievements.map((achievement, index) => (
            <div
              key={index}
              className={`rounded-2xl border p-3 text-center transition-all ${
                achievement.earned
                  ? 'border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_18px_rgba(16,185,129,0.6)]'
                  : 'border-slate-800 bg-slate-950/80 opacity-60'
              }`}
            >
              <div className="mb-2 text-2xl">{achievement.icon}</div>
              <div
                className={`text-sm font-medium ${
                  achievement.earned ? 'text-slate-50' : 'text-slate-500'
                }`}
              >
                {achievement.name}
              </div>
              <div
                className={`text-xs ${
                  achievement.earned ? 'text-emerald-300' : 'text-slate-500'
                }`}
              >
                {achievement.earned ? 'Earned' : 'Locked'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
