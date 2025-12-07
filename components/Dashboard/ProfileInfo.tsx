'use client';

import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';

interface ProfileInfoProps {
  userData: any;
  rewardTokenAddress?: string;
}

const ProfileInfo = ({ userData, rewardTokenAddress }: ProfileInfoProps) => {
  const { address } = useAccount();

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatRICO = (amount: string) => {
    const num = parseFloat(amount || '0');
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  };

  // Calculate total RICO stats
  const ricoTotal = userData?.ricoShouldHave || '0';
  const ricoReceived = userData?.ricoSent || '0';
  const ricoPending = userData?.ricoPending || '0';
  const hasRICOData = parseFloat(ricoTotal) > 0 || parseFloat(ricoPending) > 0;

  // Calculate distribution percentage
  const ricoDistributionPercentage = parseFloat(ricoTotal) > 0 
    ? (parseFloat(ricoReceived) / parseFloat(ricoTotal)) * 100 
    : 0;

  return (
    <div className="p-1">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-50">Profile</h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          userData?.exists 
            ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40' 
            : 'bg-slate-800/60 text-slate-400 border border-slate-700/40'
        }`}>
          {userData?.exists ? 'Active Reader' : 'Not Registered'}
        </div>
      </div>

      {/* Wallet Address */}
      <div className="mb-6">
        <p className="text-sm text-slate-400 mb-1">Your Wallet</p>
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-700/50">
          <span className="text-slate-200 font-medium">{formatAddress(address || '')}</span>
          <button
            onClick={() => address && navigator.clipboard.writeText(address)}
            className="text-slate-400 hover:text-slate-300 p-1 hover:bg-slate-800/50 rounded transition-all"
            title="Copy address"
          >
            📋
          </button>
        </div>
      </div>

      {/* Reader ID and Referrer (if exists) */}
      {userData?.exists && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl bg-slate-900/50 p-4 border border-slate-700/40">
              <p className="text-xs text-slate-400 mb-1">Reader ID</p>
              <p className="text-lg font-bold text-slate-100">
                #{userData.readerId || '--'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-900/50 p-4 border border-slate-700/40">
              <p className="text-xs text-slate-400 mb-1">Referrer</p>
              <p className="text-sm font-medium text-slate-200">
                {userData.referrer ? formatAddress(userData.referrer) : 'None'}
              </p>
            </div>
          </div>

          {/* Partners Count */}
          <div className="mb-6">
            <div className="rounded-xl bg-gradient-to-r from-purple-900/30 to-slate-900/50 p-4 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300 mb-1">Direct Partners</p>
                  <p className="text-2xl font-bold text-slate-50">
                    {userData.partnersCount || 0}
                  </p>
                </div>
                <div className="text-3xl text-purple-400/50">👥</div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Total users you've directly referred
              </p>
            </div>
          </div>

          {/* RICO Farming Section - Only show if user has RICO data */}
          {hasRICOData && (
            <div className="mb-6">
              <div className="rounded-xl bg-gradient-to-r from-cyan-900/30 to-slate-900/50 p-4 border border-cyan-500/30 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                    <span className="text-lg">🪙</span> RICO Token Farming
                  </h4>
                  {rewardTokenAddress && (
                    <a
                      href={`https://bscscan.com/token/${rewardTokenAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-500 hover:text-cyan-400"
                      title="View token on BSCScan"
                    >
                      ↗
                    </a>
                  )}
                </div>
                
                {/* RICO Stats Grid */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Total Earned</span>
                    <span className="text-lg font-bold text-cyan-300">{formatRICO(ricoTotal)} RICO</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Received</span>
                    <span className="text-lg font-bold text-emerald-300">{formatRICO(ricoReceived)} RICO</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Pending</span>
                    <span className="text-lg font-bold text-yellow-300">{formatRICO(ricoPending)} RICO</span>
                  </div>
                </div>
                
                {/* Distribution Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Distribution Progress</span>
                    <span>{ricoDistributionPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${ricoDistributionPercentage}%` }}
                    />
                  </div>
                </div>
                
                {/* Farming Info */}
                <div className="mt-3 text-xs text-slate-500">
                  <p>🔄 1 RICO = 1 USDT spent/earned</p>
                  <p className="mt-1">⏳ Pending RICO sent automatically</p>
                </div>
              </div>
            </div>
          )}

          {/* Royalty Section */}
          <div className="mb-6">
            <div className="rounded-xl bg-gradient-to-r from-emerald-900/30 to-slate-900/50 p-4 border border-emerald-500/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                  <span className="text-lg">👑</span> Royalty Share
                </h4>
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-900/40 text-emerald-300">
                  {userData.royaltyPercent || 0}%
                </span>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Available</span>
                  <span className="text-lg font-bold text-emerald-300">
                    ${formatCurrency(userData.royaltyAvailable || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Claimed</span>
                  <span className="text-lg font-bold text-slate-300">
                    ${formatCurrency(userData.royaltiesClaimed || 0)}
                  </span>
                </div>
              </div>
              
              <div className="text-xs text-slate-500">
                Your share of the royalty pool based on chapter purchases
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl bg-slate-900/50 p-3 border border-slate-700/40">
              <p className="text-xs text-slate-400 mb-1">Track 1 Unlocked</p>
              <p className="text-lg font-bold text-yellow-300">
                {userData.track1Unlocked || 0}/12
              </p>
            </div>
            <div className="rounded-xl bg-slate-900/50 p-3 border border-slate-700/40">
              <p className="text-xs text-slate-400 mb-1">Track 2 Unlocked</p>
              <p className="text-lg font-bold text-blue-300">
                {userData.track2Unlocked || 0}/12
              </p>
            </div>
          </div>

          {/* Total Earnings */}
          <div className="rounded-xl bg-gradient-to-r from-yellow-900/30 to-slate-900/50 p-4 border border-yellow-500/30">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-yellow-400">Total Earnings</h4>
              <div className="text-xl">💰</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Track 1</span>
                <span className="text-lg font-bold text-yellow-300">
                  ${formatCurrency(userData.track1TotalEarned || 0)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Track 2</span>
                <span className="text-lg font-bold text-blue-300">
                  ${formatCurrency(userData.track2TotalEarned || 0)}
                </span>
              </div>
              
              <div className="pt-2 border-t border-slate-700/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-300">Total</span>
                  <span className="text-xl font-bold text-slate-50">
                    ${formatCurrency(
                      (parseFloat(userData.track1TotalEarned || 0) + 
                       parseFloat(userData.track2TotalEarned || 0))
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Not Registered Message */}
      {!userData?.exists && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📚</div>
          <h4 className="text-lg font-semibold text-slate-300 mb-2">Not Registered Yet</h4>
          <p className="text-sm text-slate-500 mb-4">
            Join the RICOMATRIX library to start earning from both tracks and farm RICO tokens!
          </p>
          <div className="text-xs text-slate-600">
            <p>• Farm 1:1 RICO tokens with all USDT activity</p>
            <p>• Earn USDT from matrix system</p>
            <p>• Participate in royalty pool</p>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="mt-6 pt-4 border-t border-slate-800/50">
        <p className="text-xs text-slate-600 text-center">
          Profile data updates in real-time
        </p>
      </div>
    </div>
  );
};

export default ProfileInfo;