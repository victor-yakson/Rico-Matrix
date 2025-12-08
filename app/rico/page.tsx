// app/rico/page.tsx
'use client';

import {Header} from '@/components/Navigation/Header';
import { useQuantuMatrix } from '@/hooks/useQuantuMatrix';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function RICOStatsPage() {
  const { address } = useAccount();
  const {
    userData,
    globalRicoFarming,
    rewardTokenAddress,
    usdtAddress,
    refetchAllData,
    loading
  } = useQuantuMatrix();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Format global RICO data
  const globalRicoShouldHave = globalRicoFarming?.[0] 
    ? parseFloat(formatUnits(BigInt(globalRicoFarming[0]), 18)).toFixed(2)
    : '0.00';
  const globalRicoSent = globalRicoFarming?.[1] 
    ? parseFloat(formatUnits(BigInt(globalRicoFarming[1]), 18)).toFixed(2)
    : '0.00';
  const globalRicoPending = globalRicoFarming?.[2] 
    ? parseFloat(formatUnits(BigInt(globalRicoFarming[2]), 18)).toFixed(2)
    : '0.00';

  // Calculate percentages
  const globalDistributionPercentage = parseFloat(globalRicoShouldHave) > 0
    ? (parseFloat(globalRicoSent) / parseFloat(globalRicoShouldHave)) * 100
    : 0;

  const personalDistributionPercentage = userData?.exists && parseFloat(userData.ricoShouldHave) > 0
    ? (parseFloat(userData.ricoSent) / parseFloat(userData.ricoShouldHave)) * 100
    : 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchAllData();
    setIsRefreshing(false);
    toast.success('RICO data refreshed!');
  };

  // Add this effect to handle auto-refresh when wallet changes
  useEffect(() => {
    if (address) {
      refetchAllData();
    }
  }, [address]);

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="px-4 py-8 md:py-10">
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <div className="text-center mb-8 md:mb-10 lg:mb-12">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/80 mb-3">
                Token Farming
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
                🪙 RICO Token Farming
              </h1>
              <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
                Earn 1 RICO for every 1 USDT spent on chapters and earned in upline rewards.
                Track your token accumulation and distribution in real-time.
              </p>
            </div>

            {/* Refresh Button */}
            <div className="mb-8 flex justify-end">
              <button
                onClick={handleRefresh}
                disabled={loading || isRefreshing}
                className="flex items-center gap-2 rounded-xl bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-500/20 transition-all border border-cyan-500/30"
              >
                {loading || isRefreshing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <span className="text-lg">🔄</span>
                    Refresh Data
                  </>
                )}
              </button>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Personal RICO Stats */}
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-slate-950 to-slate-900/90 p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                  <h2 className="text-xl font-bold text-cyan-300 mb-6 flex items-center gap-3">
                    <span className="text-2xl">🪙</span>
                    Your RICO Token Balance
                  </h2>

                  {userData?.exists ? (
                    <div className="space-y-8">
                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="rounded-xl bg-gradient-to-br from-cyan-900/30 to-slate-900/60 p-5 border border-cyan-500/30">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-600 flex items-center justify-center">
                              <span className="text-lg">📈</span>
                            </div>
                            <div>
                              <p className="text-sm text-slate-400">Total Earned</p>
                              <p className="text-2xl font-bold text-cyan-300">
                                {parseFloat(userData.ricoShouldHave || '0').toFixed(2)} RICO
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500">
                            From all chapter purchases and upline earnings
                          </p>
                        </div>

                        <div className="rounded-xl bg-gradient-to-br from-emerald-900/30 to-slate-900/60 p-5 border border-emerald-500/30">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-center">
                              <span className="text-lg">✅</span>
                            </div>
                            <div>
                              <p className="text-sm text-slate-400">Already Received</p>
                              <p className="text-2xl font-bold text-emerald-300">
                                {parseFloat(userData.ricoSent || '0').toFixed(2)} RICO
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500">
                            Automatically sent to your wallet
                          </p>
                        </div>

                        <div className="rounded-xl bg-gradient-to-br from-amber-900/30 to-slate-900/60 p-5 border border-amber-500/30">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center">
                              <span className="text-lg">⏳</span>
                            </div>
                            <div>
                              <p className="text-sm text-slate-400">Pending</p>
                              <p className="text-2xl font-bold text-amber-300">
                                {parseFloat(userData.ricoPending || '0').toFixed(2)} RICO
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500">
                            Will be sent when contract has balance
                          </p>
                        </div>
                      </div>

                      {/* Distribution Progress */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-slate-200">Distribution Progress</h3>
                          <span className="text-sm font-semibold text-cyan-300">
                            {personalDistributionPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-3 mb-2">
                          <div 
                            className="bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-300 h-3 rounded-full transition-all duration-1000"
                            style={{ width: `${personalDistributionPercentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>0%</span>
                          <span>Distribution Progress</span>
                          <span>100%</span>
                        </div>
                      </div>

                      {/* Farming Breakdown */}
                      <div className="rounded-xl bg-slate-900/60 p-5 border border-slate-700/50">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Farming Breakdown</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 flex items-center justify-center">
                                <span className="text-cyan-400">📚</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-300">Chapter Purchases</p>
                                <p className="text-xs text-slate-500">From buying chapters in both tracks</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-cyan-300">
                                {((parseFloat(userData.ricoShouldHave || '0') * 0.5) || 0).toFixed(2)} RICO
                              </p>
                              <p className="text-xs text-slate-500">~50% of total</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 flex items-center justify-center">
                                <span className="text-emerald-400">👑</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-300">Upline Rewards</p>
                                <p className="text-xs text-slate-500">From unilevel earnings</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-emerald-300">
                                {((parseFloat(userData.ricoShouldHave || '0') * 0.5) || 0).toFixed(2)} RICO
                              </p>
                              <p className="text-xs text-slate-500">~50% of total</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="text-5xl mb-4">🪙</div>
                      <h3 className="text-xl font-semibold text-slate-300 mb-3">
                        Not Registered Yet
                      </h3>
                      <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                        Join the RICOMATRIX library to start farming RICO tokens from all your USDT activity.
                      </p>
                      <Link
                        href="/dashboard"
                        className="inline-block rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 px-6 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(34,211,238,0.7)] hover:brightness-110 transition-all"
                      >
                        Go to Dashboard to Register
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar - Global Stats & Info */}
              <div className="space-y-8">
                {/* Global RICO Stats */}
                <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-br from-slate-950 to-slate-900/90 p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                  <h3 className="text-lg font-bold text-violet-300 mb-6 flex items-center gap-2">
                    <span className="text-xl">🌍</span>
                    Global RICO Distribution
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="rounded-xl bg-slate-900/60 p-4 border border-slate-700/50">
                      <p className="text-sm text-slate-400 mb-1">Total Should Farm</p>
                      <p className="text-xl font-bold text-violet-300">
                        {globalRicoShouldHave} RICO
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Based on all USDT activity in the system
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-900/60 p-4 border border-slate-700/50">
                      <p className="text-sm text-slate-400 mb-1">Total Distributed</p>
                      <p className="text-xl font-bold text-emerald-300">
                        {globalRicoSent} RICO
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Successfully sent to wallets
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-900/60 p-4 border border-slate-700/50">
                      <p className="text-sm text-slate-400 mb-1">Remaining to Farm</p>
                      <p className="text-xl font-bold text-amber-300">
                        {globalRicoPending} RICO
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Waiting for contract balance
                      </p>
                    </div>
                  </div>

                  {/* Global Progress */}
                  <div className="mt-6">
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                      <span>Global Distribution</span>
                      <span>{globalDistributionPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-violet-500 to-purple-600 h-2 rounded-full"
                        style={{ width: `${globalDistributionPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Token Info */}
                <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-slate-950 to-slate-900/90 p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                  <h3 className="text-lg font-bold text-cyan-300 mb-6 flex items-center gap-2">
                    <span className="text-xl">ℹ️</span>
                    Token Information
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="rounded-lg bg-slate-900/60 p-3">
                      <p className="text-xs text-slate-400 mb-1">RICO Token Contract</p>
                      {rewardTokenAddress ? (
                        <a
                          href={`https://bscscan.com/token/${rewardTokenAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                        >
                          {`${rewardTokenAddress.slice(0, 8)}...${rewardTokenAddress.slice(-6)}`}
                          <span className="text-xs">↗</span>
                        </a>
                      ) : (
                        <p className="text-sm text-slate-500">Loading...</p>
                      )}
                    </div>

                    <div className="rounded-lg bg-slate-900/60 p-3">
                      <p className="text-xs text-slate-400 mb-1">USDT Token Contract</p>
                      {usdtAddress ? (
                        <a
                          href={`https://bscscan.com/token/${usdtAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-1"
                        >
                          {`${usdtAddress.slice(0, 8)}...${usdtAddress.slice(-6)}`}
                          <span className="text-xs">↗</span>
                        </a>
                      ) : (
                        <p className="text-sm text-slate-500">Loading...</p>
                      )}
                    </div>
                  </div>

                  {/* Farming Rules */}
                  <div className="mt-6 pt-6 border-t border-slate-800/50">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Farming Rules</h4>
                    <ul className="space-y-2 text-xs text-slate-400">
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">•</span>
                        <span>1 RICO = 1 USDT spent on chapter purchases</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">•</span>
                        <span>1 RICO = 1 USDT earned in upline rewards</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">•</span>
                        <span>RICO is sent automatically when available</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">•</span>
                        <span>Pending RICO accumulates and gets distributed</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="rounded-2xl border border-slate-700/50 bg-slate-950/80 p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">Quick Links</h3>
                  <div className="space-y-3">
                    <Link
                      href="/chapters"
                      className="flex items-center gap-3 rounded-xl bg-slate-900/60 p-3 border border-slate-700/50 hover:border-cyan-500/30 hover:bg-slate-800/60 transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center">
                        <span className="text-lg">📚</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">Buy Chapters</p>
                        <p className="text-xs text-slate-500">Purchase more to farm RICO</p>
                      </div>
                    </Link>

                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 rounded-xl bg-slate-900/60 p-3 border border-slate-700/50 hover:border-emerald-500/30 hover:bg-slate-800/60 transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-emerald-400 to-green-500 flex items-center justify-center">
                        <span className="text-lg">💰</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">Dashboard</p>
                        <p className="text-xs text-slate-500">View all your earnings</p>
                      </div>
                    </Link>

                    <Link
                      href="/matrix"
                      className="flex items-center gap-3 rounded-xl bg-slate-900/60 p-3 border border-slate-700/50 hover:border-blue-500/30 hover:bg-slate-800/60 transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-400 to-cyan-500 flex items-center justify-center">
                        <span className="text-lg">🕸️</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">Matrix View</p>
                        <p className="text-xs text-slate-500">Check your network</p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Info */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-950/80 p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl mb-2">🔄</div>
                  <h4 className="text-sm font-semibold text-slate-200 mb-1">Automatic Distribution</h4>
                  <p className="text-xs text-slate-500">
                    RICO tokens are sent automatically when the contract has sufficient balance
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">📊</div>
                  <h4 className="text-sm font-semibold text-slate-200 mb-1">Real-Time Tracking</h4>
                  <p className="text-xs text-slate-500">
                    All farming calculations are updated in real-time as you use the platform
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">💎</div>
                  <h4 className="text-sm font-semibold text-slate-200 mb-1">1:1 Farming Ratio</h4>
                  <p className="text-xs text-slate-500">
                    Earn 1 RICO for every 1 USDT spent or earned in the system
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}