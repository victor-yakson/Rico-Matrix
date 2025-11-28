'use client';

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

interface StatsProps {
  userData: any;
  globalStats: any;
}

export const Stats = ({ userData, globalStats }: StatsProps) => {
  const totalEarnings = userData?.exists 
    ? Number(userData.track1TotalEarned || 0) + Number(userData.track2TotalEarned || 0)
    : 0;

  const stats = [
    {
      name: 'Total Earnings',
      value: `$${formatCurrency(totalEarnings)}`,
      description: 'Combined earnings from both tracks',
      icon: '💰',
      gradient: 'from-yellow-400 to-amber-500'
    },
    {
      name: 'Royalty Available',
      value: `$${userData?.exists ? formatCurrency(userData.royaltyAvailable || 0) : '0.00'}`,
      description: 'Available royalty to claim',
      icon: '👑',
      gradient: 'from-purple-400 to-pink-500'
    },
    {
      name: 'Chapters Unlocked',
      value: userData?.exists ? `${(userData.track1Unlocked || 0) + (userData.track2Unlocked || 0)}/24` : '0/24',
      description: 'Total chapters across both tracks',
      icon: '📚',
      gradient: 'from-blue-400 to-cyan-500'
    },
    {
      name: 'Matrix Cycles',
      value: userData?.exists ? `${(userData.track1TotalCycles || 0) + (userData.track2TotalCycles || 0)}` : '0',
      description: 'Total reinvestment cycles',
      icon: '🔄',
      gradient: 'from-green-400 to-emerald-500'
    }
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-50 mb-6">Quick Stats</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div 
            key={index}
            className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${stat.gradient} flex items-center justify-center text-lg`}>
                {stat.icon}
              </div>
            </div>
            <dt className="text-sm font-medium text-slate-400 truncate mb-1">
              {stat.name}
            </dt>
            <dd className="text-2xl font-bold text-slate-50 mb-2">
              {stat.value}
            </dd>
            <p className="text-xs text-slate-500">
              {stat.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};