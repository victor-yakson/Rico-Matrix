'use client';

import { formatUnits } from 'viem';

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

// Format RICO tokens
const formatRICO = (amount: string | number): string => {
  const numberValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numberValue)) return '0';
  
  if (numberValue >= 1000) {
    return (numberValue / 1000).toFixed(1) + 'K';
  }
  
  return numberValue.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true
  });
};

interface StatsProps {
  userData: any;
  globalStats: any;
  globalRicoFarming?: any;
}

export const Stats = ({ userData, globalStats, globalRicoFarming }: StatsProps) => {
  const totalEarnings = userData?.exists 
    ? Number(userData.track1TotalEarned || 0) + Number(userData.track2TotalEarned || 0)
    : 0;

  // Calculate RICO stats
  const ricoPending = userData?.ricoPending || '0';
  const ricoReceived = userData?.ricoSent || '0';
  const ricoTotal = userData?.ricoShouldHave || '0';

  // Global RICO stats
  const globalRicoShouldHave = globalRicoFarming?.[0] ? formatUnits(BigInt(globalRicoFarming[0]), 18) : '0';
  const globalRicoSent = globalRicoFarming?.[1] ? formatUnits(BigInt(globalRicoFarming[1]), 18) : '0';
  const globalRicoPending = globalRicoFarming?.[2] ? formatUnits(BigInt(globalRicoFarming[2]), 18) : '0';

  const stats = [
    {
      name: 'Total Earnings',
      value: `$${formatCurrency(totalEarnings)}`,
      description: 'Combined earnings from both tracks',
      icon: '💰',
      gradient: 'from-yellow-400 to-amber-500',
      priority: 1
    },
    {
      name: 'Royalty Available',
      value: `$${userData?.exists ? formatCurrency(userData.royaltyAvailable || 0) : '0.00'}`,
      description: 'Available royalty to claim',
      icon: '👑',
      gradient: 'from-purple-400 to-pink-500',
      priority: 1
    },
    {
      name: 'Chapters Unlocked',
      value: userData?.exists ? `${(userData.track1Unlocked || 0) + (userData.track2Unlocked || 0)}/24` : '0/24',
      description: 'Total chapters across both tracks',
      icon: '📚',
      gradient: 'from-blue-400 to-cyan-500',
      priority: 1
    },
    {
      name: 'Matrix Cycles',
      value: userData?.exists ? `${(userData.track1TotalCycles || 0) + (userData.track2TotalCycles || 0)}` : '0',
      description: 'Total reinvestment cycles',
      icon: '🔄',
      gradient: 'from-green-400 to-emerald-500',
      priority: 1
    },
    // NEW: RICO Stats
    {
      name: 'RICO Earned',
      value: userData?.exists ? `${formatRICO(ricoTotal)}` : '0',
      description: 'Total RICO tokens farmed',
      icon: '🪙',
      gradient: 'from-cyan-400 to-sky-500',
      priority: userData?.exists && parseFloat(ricoTotal) > 0 ? 1 : 2
    },
    {
      name: 'RICO Pending',
      value: userData?.exists ? `${formatRICO(ricoPending)}` : '0',
      description: 'RICO waiting to be sent',
      icon: '⏳',
      gradient: 'from-orange-400 to-red-500',
      priority: userData?.exists && parseFloat(ricoPending) > 0 ? 1 : 2
    },
    // Optional: Global stats that could be shown conditionally
    {
      name: 'Global RICO Sent',
      value: `${formatRICO(globalRicoSent)}`,
      description: 'Total RICO distributed',
      icon: '🌍',
      gradient: 'from-violet-400 to-purple-500',
      priority: 3,
      isGlobal: true
    },
    {
      name: 'Global RICO Pending',
      value: `${formatRICO(globalRicoPending)}`,
      description: 'Total RICO to be distributed',
      icon: '📊',
      gradient: 'from-rose-400 to-pink-500',
      priority: 3,
      isGlobal: true
    }
  ];

  // Filter stats based on priority
  // Priority 1: Always show (if user exists or always)
  // Priority 2: Show only if user exists AND has data
  // Priority 3: Global stats - show optionally
  const filteredStats = stats.filter(stat => {
    if (stat.priority === 1) return true;
    if (stat.priority === 2) {
      return userData?.exists && parseFloat(stat.name === 'RICO Pending' ? ricoPending : ricoTotal) > 0;
    }
    if (stat.priority === 3) {
      // Show global stats if they have meaningful values
      return parseFloat(stat.name === 'Global RICO Sent' ? globalRicoSent : globalRicoPending) > 0;
    }
    return true;
  }).slice(0, 6); // Limit to 6 stats max

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-50">Quick Stats</h2>
        {(userData?.exists && (parseFloat(ricoTotal) > 0 || parseFloat(ricoPending) > 0)) && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-900/30 border border-cyan-700/50">
            <span className="text-sm text-cyan-400">🪙 RICO Farming Active</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredStats.map((stat, index) => (
          <div 
            key={index}
            className={`
              relative rounded-xl p-4 hover:scale-[1.02] transition-all duration-300
              ${stat.isGlobal ? 'border border-violet-500/30 bg-violet-950/20' : 'border border-slate-700/50 bg-slate-800/30'}
              hover:border-slate-600/50 hover:shadow-lg hover:shadow-slate-900/30
              ${parseFloat(stat.value.replace(/[^0-9.]/g, '')) > 0 ? 'opacity-100' : 'opacity-70'}
            `}
          >
            {stat.isGlobal && (
              <div className="absolute -top-2 -right-2">
                <span className="text-xs px-2 py-1 rounded-full bg-violet-900/80 text-violet-200">
                  Global
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between mb-3">
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center text-lg
                bg-gradient-to-r ${stat.gradient} shadow-md
              `}>
                {stat.icon}
              </div>
              {stat.name.includes('RICO') && parseFloat(stat.value.replace(/[^0-9.]/g, '')) > 0 && (
                <div className={`text-xs px-2 py-1 rounded-full ${
                  stat.name.includes('Pending') 
                    ? 'bg-orange-900/40 text-orange-300 border border-orange-700/40'
                    : 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/40'
                }`}>
                  {stat.name.includes('Pending') ? 'Pending' : 'Farmed'}
                </div>
              )}
            </div>
            
            <dt className="text-sm font-medium text-slate-400 truncate mb-1">
              {stat.name}
            </dt>
            <dd className={`
              text-xl font-bold mb-1
              ${stat.name.includes('RICO') ? 'text-cyan-300' : 'text-slate-50'}
              ${stat.isGlobal ? 'text-violet-300' : ''}
            `}>
              {stat.value}
              {stat.name.includes('RICO') && !stat.name.includes('Global') && (
                <span className="text-xs ml-1 text-cyan-400">RICO</span>
              )}
              {stat.name.includes('Global RICO') && (
                <span className="text-xs ml-1 text-violet-400">RICO</span>
              )}
            </dd>
            <p className="text-xs text-slate-500 leading-tight">
              {stat.description}
            </p>
            
            {/* Progress bar for RICO stats */}
            {stat.name === 'RICO Earned' && userData?.exists && parseFloat(ricoTotal) > 0 && parseFloat(ricoReceived) > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Progress</span>
                  <span>{Math.round((parseFloat(ricoReceived) / parseFloat(ricoTotal)) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-sky-600 h-1.5 rounded-full"
                    style={{ width: `${Math.min((parseFloat(ricoReceived) / parseFloat(ricoTotal)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Progress bar for Global RICO */}
            {stat.name === 'Global RICO Sent' && parseFloat(globalRicoShouldHave) > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Distributed</span>
                  <span>{Math.round((parseFloat(globalRicoSent) / parseFloat(globalRicoShouldHave)) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-violet-500 to-purple-600 h-1.5 rounded-full"
                    style={{ width: `${Math.min((parseFloat(globalRicoSent) / parseFloat(globalRicoShouldHave)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* RICO Farming Summary */}
      {userData?.exists && (parseFloat(ricoTotal) > 0 || parseFloat(ricoPending) > 0) && (
        <div className="mt-6 p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-600 flex items-center justify-center">
              <span className="text-lg">🪙</span>
            </div>
            <h3 className="text-sm font-semibold text-cyan-300">RICO Farming Summary</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-slate-400 mb-1">Total Earned</p>
              <p className="text-lg font-bold text-cyan-400">{formatRICO(ricoTotal)} RICO</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Received</p>
              <p className="text-lg font-bold text-emerald-400">{formatRICO(ricoReceived)} RICO</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Pending</p>
              <p className="text-lg font-bold text-yellow-400">{formatRICO(ricoPending)} RICO</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 text-center">
            📈 You farm 1 RICO for every 1 USDT spent/earned. Pending RICO is sent automatically when available.
          </p>
        </div>
      )}
    </div>
  );
};