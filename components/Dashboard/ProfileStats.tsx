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
    useGrouping: true
  });
};

export const ProfileStats = ({ userData }: ProfileStatsProps) => {
  const totalEarnings = userData?.exists 
    ? Number(userData.track1TotalEarned || 0) + Number(userData.track2TotalEarned || 0)
    : 0;

  const totalCycles = userData?.exists
    ? (userData.track1TotalCycles || 0) + (userData.track2TotalCycles || 0)
    : 0;

  const totalChapters = userData?.exists
    ? (userData.track1Unlocked || 0) + (userData.track2Unlocked || 0)
    : 0;

  const progressPercentage = Math.min((totalChapters / 24) * 100, 100);

  const trackStats = [
    {
      track: 'X3 Matrix',
      earnings: userData?.track1TotalEarned || '0',
      cycles: userData?.track1TotalCycles || 0,
      chapters: userData?.track1Unlocked || 0,
      color: 'bg-blue-500',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-400',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      track: 'X6 Matrix',
      earnings: userData?.track2TotalEarned || '0',
      cycles: userData?.track2TotalCycles || 0,
      chapters: userData?.track2Unlocked || 0,
      color: 'bg-purple-500',
      borderColor: 'border-purple-500/30',
      textColor: 'text-purple-400',
      gradient: 'from-purple-500 to-pink-500'
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-50 mb-2">Performance Overview</h2>
      
      {/* Progress Overview */}
      <div className="space-y-4">
        <div className="flex justify-between text-sm text-slate-400">
          <span>Chapter Progress</span>
          <span>{totalChapters}/24 ({Math.round(progressPercentage)}%)</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 shadow-inner">
          <div 
            className="bg-gradient-to-r from-yellow-400 to-amber-500 h-3 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(250,204,21,0.5)]"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <div className="text-xl font-bold text-slate-50">{totalChapters}</div>
            <div className="text-xs text-slate-400">Chapters</div>
          </div>
          <div className="text-center p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <div className="text-xl font-bold text-slate-50">{totalCycles}</div>
            <div className="text-xs text-slate-400">Cycles</div>
          </div>
          <div className="text-center p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <div className="text-xl font-bold text-slate-50">${formatCurrency(totalEarnings)}</div>
            <div className="text-xs text-slate-400">Earned</div>
          </div>
        </div>
      </div>

      {/* Track Performance */}
      <div>
        <h3 className="text-lg font-semibold text-slate-50 mb-4">Track Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trackStats.map((track, index) => (
            <div 
              key={index}
              className={`border ${track.borderColor} bg-slate-800/30 rounded-xl p-4 hover:border-slate-600/50 transition-all duration-300`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className={`font-semibold ${track.textColor}`}>{track.track}</h4>
                <div className={`w-3 h-3 rounded-full ${track.color} shadow-[0_0_8px_rgba(59,130,246,0.5)]`}></div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Earnings:</span>
                  <span className="font-medium text-slate-200">${formatCurrency(track.earnings)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Cycles:</span>
                  <span className="font-medium text-slate-200">{track.cycles}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Chapters:</span>
                  <span className="font-medium text-slate-200">{track.chapters}/12</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};