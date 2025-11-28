'use client';

import { useQuantuMatrix } from '../../hooks/useQuantuMatrix';
import { useState, useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';

export const RoyaltyPool = () => {
  const { userData, claimRoyalty, loading, refetchUserData } = useQuantuMatrix();
  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | null>(null);

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: currentTxHash ?? undefined,
      query: {
        enabled: !!currentTxHash,
      },
    });

  // Refetch data when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      refetchUserData();
      setCurrentTxHash(null);
    }
  }, [isConfirmed, refetchUserData]);

  const handleClaimRoyalty = async () => {
    if (!userData?.exists || Number(userData.royaltyAvailable) === 0) return;

    try {
      const hash = await claimRoyalty();
      setCurrentTxHash(hash);
    } catch (error) {
      console.error('Claim failed:', error);
      setCurrentTxHash(null);
    }
  };

  const isProcessing = loading || isConfirming;
  const canClaim = userData?.exists && Number(userData.royaltyAvailable) > 0;
  const available = userData?.exists
    ? Number(userData.royaltyAvailable).toFixed(2)
    : '0.00';
  const share = userData?.exists ? userData.royaltyPercent : '0';
  const claimed = userData?.exists
    ? Number(userData.royaltiesClaimed).toFixed(2)
    : '0.00';

  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-6 md:p-7 shadow-[0_0_32px_rgba(0,0,0,0.85)] backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-1">
            Royalty Pool
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-50">
            Global Royalty Earnings
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
          <span>
            {isProcessing ? 'Processing transaction on-chain…' : 'On-chain pool stats'}
          </span>
        </div>
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-yellow-400/40 bg-slate-950/90 p-4 shadow-[0_0_22px_rgba(250,204,21,0.3)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300" />
          <h3 className="mb-1 text-sm font-semibold text-yellow-200">
            Your Royalty Share
          </h3>
          <p className="text-3xl font-bold text-yellow-300">
            {share}%
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Of the active global royalty pool
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-emerald-400/40 bg-slate-950/90 p-4 shadow-[0_0_22px_rgba(16,185,129,0.35)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-300" />
          <h3 className="mb-1 text-sm font-semibold text-emerald-200">
            Available to Claim
          </h3>
          <p className="text-3xl font-bold text-emerald-300">
            ${available}
          </p>
          <p className="mt-1 text-xs text-slate-400">USDT</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-purple-400/40 bg-slate-950/90 p-4 shadow-[0_0_22px_rgba(192,132,252,0.35)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-400" />
          <h3 className="mb-1 text-sm font-semibold text-purple-200">
            Total Claimed
          </h3>
          <p className="text-3xl font-bold text-purple-300">
            ${claimed}
          </p>
          <p className="mt-1 text-xs text-slate-400">Lifetime royalties</p>
        </div>
      </div>

      {/* Claim CTA */}
      <button
        onClick={handleClaimRoyalty}
        disabled={!canClaim || isProcessing}
        className={`mt-1 flex w-full items-center justify-center rounded-xl px-6 py-3 text-lg font-semibold transition-all
          ${
            canClaim && !isProcessing
              ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-300 text-black shadow-[0_0_22px_rgba(16,185,129,0.7)] hover:brightness-110 active:scale-[0.98]'
              : 'cursor-not-allowed border border-slate-700 bg-slate-900/80 text-slate-500'
          }
        `}
      >
        {isProcessing
          ? 'Processing royalty claim...'
          : `Claim $${available} USDT`}
      </button>

      {/* Info box */}
      <div className="mt-5 rounded-2xl border border-amber-400/40 bg-amber-500/5 p-4">
        <h4 className="mb-2 text-sm font-semibold text-amber-200">
          How Royalties Work
        </h4>
        <ul className="space-y-1.5 text-xs md:text-sm text-amber-100/90">
          <li>• 15% of every chapter purchase flows into the global royalty pool.</li>
          <li>• Your share is based on your total contribution and activity tier.</li>
          <li>• Payouts are fully on-chain and distributed proportionally.</li>
          <li>• You can claim anytime — no lock period or cooldown.</li>
        </ul>
      </div>
    </div>
  );
};
