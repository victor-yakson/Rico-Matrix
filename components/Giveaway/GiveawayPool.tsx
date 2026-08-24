"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useWaitForTransactionReceipt } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { useRicoGiveaway, type ThroneRecord } from "../../hooks/useRicoGiveaway";
import { StatTile } from "../Common/StatTile";
import { ProgressBar } from "../Common/ProgressBar";

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
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="theme-panel p-6 md:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 flex items-center justify-center text-2xl">
              👑
            </div>
            <div>
              <p className="theme-kicker mb-1">Game of Thrones</p>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-50">
                Giveaway Campaign
              </h2>
            </div>
          </div>
          <div
            className={`theme-chip ${isActive ? "theme-chip--gold" : ""}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isActive ? "bg-emerald-400" : "bg-slate-500"
              }`}
            />
            {isActive ? "Campaign Live" : "Campaign Paused"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile
            label="Pool Balance"
            value={parseFloat(globalStats.contractBalanceRico) || 0}
            decimals={0}
            suffix=" $RICO"
            accent="gold"
            className="!p-4"
          />
          <StatTile
            label="Distributed"
            value={parseFloat(globalStats.totalDistributedRico) || 0}
            decimals={0}
            suffix=" $RICO"
            accent="emerald"
            className="!p-4"
          />
          <StatTile
            label="Crowns Won"
            value={globalStats.totalDropsCount}
            decimals={0}
            accent="sky"
            className="!p-4"
          />
          <StatTile
            label="Active Volume"
            value={parseFloat(globalStats.activeVolumeUSD) || 0}
            decimals={0}
            prefix="$"
            accent="slate"
            className="!p-4"
          />
        </div>
      </motion.div>

      {!isConnected ? (
        <div className="theme-panel-soft p-8 text-center">
          <div className="text-4xl mb-3">🔌</div>
          <h3 className="text-lg font-semibold text-slate-200 mb-2">
            Connect your wallet
          </h3>
          <p className="text-sm text-slate-400">
            Connect your wallet to sync your history and see your rewards.
          </p>
        </div>
      ) : !isHubChain ? (
        <div className="theme-panel-soft p-6 text-center">
          <p className="text-sm text-amber-200">
            Switch your wallet to BNB Smart Chain to sync and claim rewards.
          </p>
        </div>
      ) : (
        <>
          {/* Your progress */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="theme-stat-panel p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white">Your Progress</h3>
              {!isImported && (
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="theme-button-primary px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Syncing..." : "🔄 Sync My History"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 mb-6">
              <div>
                <div className="text-xs text-slate-400 mb-1">Historical Volume</div>
                <div className="text-lg font-bold text-amber-200 tabular-nums">
                  ${formatNumber(userBreakdown.histTotalUSD)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Active Referral Volume</div>
                <div className="text-lg font-bold text-amber-300 tabular-nums">
                  ${formatNumber(userBreakdown.activeReferralUSD)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Active Personal Volume</div>
                <div className="text-lg font-bold text-slate-100 tabular-nums">
                  ${formatNumber(userBreakdown.activePersonalUSD)}
                </div>
              </div>
            </div>

            <ProgressBar
              label={`Crown ${completed} → ${completed + 1}`}
              valueLabel={`$${formatNumber(String(combinedVolume))} / $${formatNumber(String(nextTarget))}`}
              percent={progressPct}
              accent="gold"
            />

            {!isImported && (
              <p className="mt-3 text-xs text-amber-200/70">
                Sync your history to lock in your combined volume toward the
                next crown.
              </p>
            )}
          </motion.div>

          {/* Claim card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="theme-card"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-amber-200 mb-1">
                  Claimable $RICO
                </h4>
                <p className="text-sm text-slate-400">
                  From cashback, referral bonuses, and crown rewards.
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-amber-200 mb-2 tabular-nums">
                  {formatNumber(userBreakdown.totalClaimableRico)} $RICO
                </div>
                <button
                  onClick={handleClaim}
                  disabled={!canClaim || loading}
                  className={
                    canClaim && !loading
                      ? "theme-button-primary px-6 py-3 text-base"
                      : "rounded-xl px-6 py-3 text-base font-bold cursor-not-allowed border border-slate-700 bg-slate-900/80 text-slate-500"
                  }
                >
                  {loading ? "Processing..." : "Claim $RICO"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Hall of Crowns */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="theme-panel-soft p-6"
      >
        <h3 className="text-lg font-semibold text-amber-200 mb-4">
          🏆 Hall of Crowns
        </h3>
        {throneRecords.length === 0 && !throneLoading ? (
          <p className="text-sm text-slate-500">No crowns claimed yet — be the first!</p>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {throneRecords.map((record, index) => (
                <motion.div
                  key={`${record.winner}-${record.timestamp}-${index}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(index, 10) * 0.03 }}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-sm transition-colors hover:border-yellow-400/25"
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
                    <div className="font-semibold text-amber-300 tabular-nums">
                      +{formatNumber(record.rewardRico, 0)} $RICO
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {throneOffset < throneTotal && (
          <button
            onClick={loadMoreThrone}
            disabled={throneLoading}
            className="theme-button-ghost mt-4 w-full py-2.5 text-sm disabled:opacity-50"
          >
            {throneLoading ? "Loading..." : "Load more"}
          </button>
        )}
      </motion.div>
    </div>
  );
};
