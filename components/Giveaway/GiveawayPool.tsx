"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useWaitForTransactionReceipt } from "wagmi";
import { useRicoGiveaway, type ThroneRecord } from "../../hooks/useRicoGiveaway";

const PAGE_SIZE = 10;

const shortAddress = (address?: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

const formatNumber = (value: string, maxFractionDigits = 2) => {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxFractionDigits,
  }).format(parsed);
};

export const GiveawayPool = () => {
  const { address, isConnected } = useAccount();
  const {
    isHubChain,
    loading,
    isActive,
    isImported,
    canClaim,
    globalStats,
    userBreakdown,
    firstMilestoneUSD,
    milestoneStepUSD,
    importMyHistoricalEarnings,
    claimRicoReward,
    fetchThroneRecords,
  } = useRicoGiveaway();

  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
    query: { enabled: !!txHash },
  });

  useEffect(() => {
    if (isConfirmed) setTxHash(null);
  }, [isConfirmed]);

  const [throneRecords, setThroneRecords] = useState<ThroneRecord[]>([]);
  const [throneTotal, setThroneTotal] = useState(0);
  const [throneLoading, setThroneLoading] = useState(false);
  const [throneOffset, setThroneOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setThroneLoading(true);
      const { records, total } = await fetchThroneRecords(0, PAGE_SIZE);
      if (!cancelled) {
        setThroneRecords(records);
        setThroneTotal(total);
        setThroneOffset(records.length);
        setThroneLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMoreThrone = async () => {
    setThroneLoading(true);
    const { records } = await fetchThroneRecords(throneOffset, PAGE_SIZE);
    setThroneRecords((prev) => [...prev, ...records]);
    setThroneOffset((prev) => prev + records.length);
    setThroneLoading(false);
  };

  const handleImport = async () => {
    try {
      const hash = await importMyHistoricalEarnings();
      if (hash) setTxHash(hash);
    } catch {
      // toasts already handled inside the hook
    }
  };

  const handleClaim = async () => {
    try {
      const hash = await claimRicoReward();
      if (hash) setTxHash(hash);
    } catch {
      // toasts already handled inside the hook
    }
  };

  const combinedVolume = parseFloat(userBreakdown.totalCombinedVolumeUSD) || 0;
  const nextTarget = parseFloat(userBreakdown.nextMilestoneTargetUSD) || 0;
  const first = parseFloat(firstMilestoneUSD) || 0;
  const step = parseFloat(milestoneStepUSD) || 0;
  const completed = userBreakdown.completedMilestones;
  const prevThreshold = completed === 0 ? 0 : first + (completed - 1) * step;
  const milestoneSpan = Math.max(nextTarget - prevThreshold, 1);
  const progressPct = Math.min(
    100,
    Math.max(0, ((combinedVolume - prevThreshold) / milestoneSpan) * 100),
  );

  return (
    <div className="space-y-6">
      {/* Campaign status */}
      <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-slate-950 to-slate-900/90 p-6 md:p-7 shadow-[0_0_32px_rgba(0,0,0,0.85)] backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 flex items-center justify-center text-2xl">
              👑
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-1">
                Game of Thrones
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-50">
                Giveaway Campaign
              </h2>
            </div>
          </div>
          <div
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${
              isActive
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                : "border-slate-600/50 bg-slate-800/40 text-slate-400"
            }`}
          >
            {isActive ? "🟢 Campaign Live" : "⏸ Campaign Paused"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-yellow-400/20 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-400 mb-1">Pool Balance</div>
            <div className="text-xl font-bold text-yellow-300">
              {formatNumber(globalStats.contractBalanceRico, 0)}
            </div>
            <div className="text-[0.65rem] text-slate-500">$RICO</div>
          </div>
          <div className="rounded-xl border border-yellow-400/20 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-400 mb-1">Distributed</div>
            <div className="text-xl font-bold text-amber-300">
              {formatNumber(globalStats.totalDistributedRico, 0)}
            </div>
            <div className="text-[0.65rem] text-slate-500">$RICO</div>
          </div>
          <div className="rounded-xl border border-yellow-400/20 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-400 mb-1">Crowns Won</div>
            <div className="text-xl font-bold text-yellow-200">
              {globalStats.totalDropsCount}
            </div>
            <div className="text-[0.65rem] text-slate-500">total</div>
          </div>
          <div className="rounded-xl border border-yellow-400/20 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-400 mb-1">Active Volume</div>
            <div className="text-xl font-bold text-slate-100">
              ${formatNumber(globalStats.activeVolumeUSD, 0)}
            </div>
            <div className="text-[0.65rem] text-slate-500">USD</div>
          </div>
        </div>
      </div>

      {!isConnected ? (
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-8 text-center">
          <div className="text-4xl mb-3">🔌</div>
          <h3 className="text-lg font-semibold text-slate-200 mb-2">
            Connect your wallet
          </h3>
          <p className="text-sm text-slate-400">
            Connect your wallet to sync your history and see your rewards.
          </p>
        </div>
      ) : !isHubChain ? (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 to-slate-950 p-6 text-center">
          <p className="text-sm text-amber-200">
            Switch your wallet to BNB Smart Chain to sync and claim rewards.
          </p>
        </div>
      ) : (
        <>
          {/* Your progress */}
          <div className="rounded-2xl border border-yellow-500/25 bg-gradient-to-r from-yellow-900/20 to-black p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white">Your Progress</h3>
              {!isImported && (
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_18px_rgba(245,158,11,0.4)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Syncing..." : "🔄 Sync My History"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 mb-6">
              <div>
                <div className="text-xs text-slate-400 mb-1">Historical Volume</div>
                <div className="text-lg font-bold text-yellow-300">
                  ${formatNumber(userBreakdown.histTotalUSD)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Active Referral Volume</div>
                <div className="text-lg font-bold text-amber-300">
                  ${formatNumber(userBreakdown.activeReferralUSD)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Active Personal Volume</div>
                <div className="text-lg font-bold text-slate-100">
                  ${formatNumber(userBreakdown.activePersonalUSD)}
                </div>
              </div>
            </div>

            {/* Milestone progress */}
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Crown {completed} → {completed + 1}
              </span>
              <span className="text-yellow-300">
                ${formatNumber(String(combinedVolume))} / $
                {formatNumber(String(nextTarget))}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800/80 border border-slate-700/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {!isImported && (
              <p className="mt-3 text-xs text-yellow-300/70">
                Sync your history to lock in your combined volume toward the
                next crown.
              </p>
            )}
          </div>

          {/* Claim card */}
          <div className="rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-slate-900/80 to-yellow-950/10 p-6 shadow-[0_0_22px_rgba(245,158,11,0.2)]">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-yellow-200 mb-1">
                  Claimable $RICO
                </h4>
                <p className="text-sm text-slate-400">
                  From cashback, referral bonuses, and crown rewards.
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-yellow-300 mb-2">
                  {formatNumber(userBreakdown.totalClaimableRico)} $RICO
                </div>
                <button
                  onClick={handleClaim}
                  disabled={!canClaim || loading}
                  className={`rounded-xl px-6 py-3 text-base font-bold transition-all ${
                    canClaim && !loading
                      ? "bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-black shadow-[0_0_22px_rgba(245,158,11,0.45)] hover:brightness-110 active:scale-[0.98]"
                      : "cursor-not-allowed border border-slate-700 bg-slate-900/80 text-slate-500"
                  }`}
                >
                  {loading ? "Processing..." : "Claim $RICO"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hall of Crowns */}
      <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-6">
        <h3 className="text-lg font-semibold text-amber-200 mb-4">
          🏆 Hall of Crowns
        </h3>
        {throneRecords.length === 0 && !throneLoading ? (
          <p className="text-sm text-slate-500">No crowns claimed yet — be the first!</p>
        ) : (
          <div className="space-y-2">
            {throneRecords.map((record, index) => (
              <div
                key={`${record.winner}-${record.timestamp}-${index}`}
                className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-950/50 px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">👑</span>
                  <div>
                    <div className="font-mono text-slate-200">
                      {address &&
                      record.winner.toLowerCase() === address.toLowerCase()
                        ? "You"
                        : shortAddress(record.winner)}
                    </div>
                    <div className="text-xs text-slate-500">
                      ${formatNumber(record.milestoneUSD, 0)} milestone
                      {record.isHistoricalImport ? " · historical" : ""}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-amber-300">
                    +{formatNumber(record.rewardRico, 0)} $RICO
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {throneOffset < throneTotal && (
          <button
            onClick={loadMoreThrone}
            disabled={throneLoading}
            className="mt-4 w-full rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 transition hover:border-yellow-400 hover:text-yellow-300 disabled:opacity-50"
          >
            {throneLoading ? "Loading..." : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
};
