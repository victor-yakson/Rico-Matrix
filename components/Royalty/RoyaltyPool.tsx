"use client";

import { useQuantuMatrix } from "../../hooks/useQuantuMatrix";
import { useState, useEffect } from "react";
import { useWaitForTransactionReceipt } from "wagmi";
import { useTranslations } from "next-intl";

export const RoyaltyPool = () => {
  const {
    userData,
    migrationAndRoyaltyUI,
    claimRoyalty,
    claimRoyaltyV2,
    isHubChain,
    loading,
    refetchUserData,
    dataRefreshing,
  } = useQuantuMatrix();

  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | null>(
    null
  );
  const t = useTranslations("RoyaltyPool");

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

  const parseAmount = (value?: string) => {
    const parsed = Number.parseFloat(value || "0");
    return Number.isFinite(parsed) ? parsed : 0;
  };

  // Handle V3 royalty claim
  const handleClaimRoyaltyV3 = async () => {
    if (!userData?.exists) return;

    const v3Claimable = userData?.royaltyAvailable || "0";
    if (parseAmount(v3Claimable) === 0) return;

    try {
      const hash = await claimRoyalty();
      if (hash) {
        setCurrentTxHash(hash);
      }
    } catch (error) {
      console.error("V3 claim failed:", error);
      setCurrentTxHash(null);
    }
  };

  // Handle V2 royalty claim
  const handleClaimRoyaltyV2 = async () => {
    if (!userData?.exists) return;
    
    const v2Claimable = migrationAndRoyaltyUI?.v2Claimable || "0";
    if (parseAmount(v2Claimable) === 0) return;
    
    try {
      const hash = await claimRoyaltyV2();
      if (hash) {
        setCurrentTxHash(hash);
      }
    } catch (error) {
      console.error("Current Claim failed:", error);
      setCurrentTxHash(null);
    }
  };

  const isProcessing = loading || isConfirming;

  // Get royalty data from migrationAndRoyaltyUI
  const legacyClaimableAmount = "0";
  const v3ClaimableAmount = userData?.royaltyAvailable || "0";
  const v2ClaimableAmount = migrationAndRoyaltyUI?.v2Claimable || "0";
  const v3ClaimableValue = parseAmount(v3ClaimableAmount);
  const v2ClaimableValue = parseAmount(v2ClaimableAmount);
  const totalClaimableAmount = (v3ClaimableValue + v2ClaimableValue).toString();
  const v1RoyaltyPercent = 0;
  const migrationStatus = migrationAndRoyaltyUI?.status || 0;

  // Check what type of royalty is available
  const hasLegacyRoyalty = false;
  const hasV3Royalty = v3ClaimableValue > 0;
  const hasV2Royalty = v2ClaimableValue > 0;
  const canClaimV3 = v3ClaimableValue >= 0.5 && isHubChain;
  const canClaimV2 = v2ClaimableValue >= 0.5;
  const canClaim = hasV3Royalty || hasV2Royalty;

  // Calculate current royalty percent
  const v2RoyaltyPercent = userData?.exists ? userData.royaltyPercent : 0;

  // Calculate total claimed (including legacy)
  const totalClaimed = userData?.exists
    ? Number(userData.royaltiesClaimed)
    : 0;

  // Get migration status badge label
  const getMigrationStatusLabel = () => {
    if (migrationStatus === 1) return "Dashboard access pending";
    if (migrationStatus === 2) return t("migration.migrated");
    return "";
  };

  // Get summary description based on available royalties
  const getSummaryDescription = () => {
    if (hasV2Royalty) return t("summary.descriptionCurrent");
    return "";
  };

  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-slate-950 to-slate-900/90 p-6 md:p-7 shadow-[0_0_32px_rgba(0,0,0,0.85)] backdrop-blur-sm">
      {dataRefreshing && (
        <div className="fixed left-1/2 top-24 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-yellow-400/30 bg-slate-950/90 px-4 py-2 text-xs font-semibold text-yellow-100 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-300 border-t-transparent" />
          <span>Refreshing data</span>
        </div>
      )}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-1">
                {t("header.label")}
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-50">
                {t("header.title")}
              </h2>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs">
            <div className={`px-3 py-1.5 rounded-full border ${
              isProcessing 
                ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300" 
                : "border-yellow-400/35 bg-yellow-500/10 text-amber-300"
            }`}>
              {isProcessing ? t("status.processing") : t("status.ready")}
            </div>
          </div>
        </div>

        {/* Migration Status Badge */}
        {migrationStatus > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {migrationStatus === 1 && (
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-300">
                <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                {getMigrationStatusLabel()}
              </div>
            )}
            {migrationStatus === 2 && (
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/35 bg-yellow-500/10 px-3 py-1 text-xs text-amber-300">
                <span className="h-2 w-2 rounded-full bg-yellow-300" />
                {getMigrationStatusLabel()}
              </div>
            )}
            {hasLegacyRoyalty && (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.7)]" />
                {t("migration.legacyAvailable")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Royalty Summary */}
      {canClaim && (
        <div className="mb-8 rounded-2xl border border-yellow-500/25 bg-gradient-to-r from-yellow-900/20 to-black p-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                {t("summary.title")}
              </h3>
              <p className="text-sm text-slate-300">
                {getSummaryDescription()}
              </p>
            </div>
            <div className="text-center md:text-right">
              <div className="text-3xl md:text-4xl font-bold text-yellow-300">
                ${parseFloat(totalClaimableAmount).toFixed(2)}
              </div>
              <div className="text-sm text-slate-400">
                {t("summary.totalClaimable")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Royalty Share */}
        <div className="relative overflow-hidden rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-slate-900/80 to-yellow-950/10 p-5 shadow-[0_0_22px_rgba(245,158,11,0.2)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-300" />
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-yellow-200">
              {t("stats.royaltyShare")}
            </h3>
            <div className="text-xs px-2 py-1 rounded bg-yellow-900/30 text-yellow-300">
              {migrationStatus === 2 ? "Legacy+Current" : "Current"}
            </div>
          </div>
          <div className="space-y-3">
            {v1RoyaltyPercent > 0 && (
              <div>
                <div className="text-xs text-slate-400 mb-1">
                  {t("stats.legacyShare")}
                </div>
                <div className="text-2xl font-bold text-yellow-400">
                  {v1RoyaltyPercent.toFixed(2)}%
                </div>
                <div className="text-xs text-slate-500">
                  {t("stats.fromMigration")}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-slate-400 mb-1">
                {t("stats.currentShare")}
              </div>
              <div className="text-2xl font-bold text-yellow-200">
                {v2RoyaltyPercent.toFixed(2)}%
              </div>
              <div className="text-xs text-slate-500">
                {t("stats.activeShare")}
              </div>
            </div>
          </div>
        </div>

        {/* Available Royalty */}
        <div className="relative overflow-hidden rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-slate-900/80 to-yellow-950/10 p-5 shadow-[0_0_22px_rgba(245,158,11,0.2)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-300" />
          <h3 className="text-sm font-semibold text-yellow-200 mb-3">
            {t("stats.availableRoyalty")}
          </h3>
          
          <div className="space-y-4">
            {/* Current Royalty */}
            {hasV2Royalty && (
              <div className="pb-3 border-b border-yellow-800/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-400">
                    {t("stats.currentRoyalty")}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-yellow-900/30 text-yellow-300">
                    {t("stats.active")}
                  </span>
                </div>
                <div className="text-2xl font-bold text-yellow-300">
                  ${parseFloat(v2ClaimableAmount).toFixed(2)}
                </div>
                <div className="text-xs text-slate-500">
                  {t("stats.fromRecent")}
                </div>
              </div>
            )}

            {/* Legacy Royalty */}
            {hasLegacyRoyalty && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-400">
                    {t("stats.legacyRoyalty")}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-amber-900/50 text-amber-300">
                    {t("stats.snapshot")}
                  </span>
                </div>
                <div className="text-2xl font-bold text-amber-300">
                  ${parseFloat(legacyClaimableAmount).toFixed(2)}
                </div>
                <div className="text-xs text-slate-500">
                  {t("stats.fromSnapshot")}
                </div>
              </div>
            )}

            {/* No Royalty */}
            {!hasLegacyRoyalty && !hasV2Royalty && (
              <div className="text-center py-4">
                <div className="text-2xl font-bold text-slate-400 mb-1">
                  $0.00
                </div>
                <div className="text-xs text-slate-500">
                  {t("stats.noRoyalty")}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Total Claimed */}
        <div className="relative overflow-hidden rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-slate-900/80 to-yellow-950/10 p-5 shadow-[0_0_22px_rgba(245,158,11,0.2)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-300" />
          <h3 className="text-sm font-semibold text-yellow-200 mb-3">
            {t("stats.totalClaimed")}
          </h3>
          <div className="text-3xl font-bold text-yellow-300 mb-2">
            ${totalClaimed.toFixed(2)}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{t("stats.currentClaimed")}</span>
              <span className="text-amber-300">
                ${userData?.exists ? Number(userData.royaltiesClaimed).toFixed(2) : "0.00"}
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {t("stats.claimedDescription")}
          </p>
        </div>
      </div>

      {/* Claim Buttons */}
      <div className="space-y-4">
        {/* V3 Royalty Claim */}
        {hasV3Royalty && (
          <div className="rounded-2xl border border-yellow-500/35 bg-gradient-to-r from-yellow-900/18 to-black p-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-200">
                      V3 Royalty
                    </h4>
                    <p className="text-sm text-yellow-300/80">
                      Current Rico Matrix royalty
                    </p>
                  </div>
                </div>
                <p className="text-xs text-yellow-300/70">
                  {isHubChain
                    ? "Claim the royalty currently available on the V3 hub."
                    : "Switch to BSC to claim this V3 royalty from the hub."}
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-yellow-300 mb-1">
                  ${v3ClaimableValue.toFixed(2)}
                </div>
                <button
                  onClick={handleClaimRoyaltyV3}
                  disabled={!canClaimV3 || isProcessing}
                  className={`mt-3 flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-bold transition-all relative overflow-hidden group
                    ${
                      canClaimV3 && !isProcessing
                        ? "bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-black shadow-[0_0_22px_rgba(245,158,11,0.45)] hover:brightness-110 hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] active:scale-[0.98]"
                        : "cursor-not-allowed border border-slate-700 bg-slate-900/80 text-slate-500"
                    }
                  `}
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  {isProcessing ? (
                    <span className="relative z-10">Processing...</span>
                  ) : (
                    <span className="relative z-10">
                      {isHubChain ? "Claim V3 Royalty" : "Switch to BSC to Claim"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* V2 Royalty Claim */}
        {hasV2Royalty && (
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 to-slate-950 p-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-100">
                      V2 Royalty
                    </h4>
                    <p className="text-sm text-amber-200/80">
                      Older Rico Matrix royalty balance
                    </p>
                  </div>
                </div>
                <p className="text-xs text-amber-200/70">
                  Claimable balance from the V2 royalty contract.
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-amber-200 mb-1">
                  ${v2ClaimableValue.toFixed(2)}
                </div>
                <button
                  onClick={handleClaimRoyaltyV2}
                  disabled={!canClaimV2 || isProcessing}
                  className={`mt-3 flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-bold transition-all relative overflow-hidden group
                    ${
                      canClaimV2 && !isProcessing
                        ? "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-black shadow-[0_0_22px_rgba(245,158,11,0.35)] hover:brightness-110 active:scale-[0.98]"
                        : "cursor-not-allowed border border-slate-700 bg-slate-900/80 text-slate-500"
                    }
                  `}
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  {isProcessing ? (
                    <span className="relative z-10">Processing...</span>
                  ) : (
                    <span className="relative z-10">
                      Claim V2 Royalty
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Royalty Available */}
        {!canClaim && (
          <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-6 text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-slate-700/50 to-slate-800/50 border border-slate-600/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-slate-300 mb-2">
              {t("claims.none.title")}
            </h4>
            <p className="text-sm text-slate-400 mb-4">
              {t("claims.none.description")}
            </p>
            <div className="text-xs text-slate-500 max-w-md mx-auto">
              {t("claims.none.hint")}
            </div>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className={`mt-8 rounded-2xl border p-5 ${
        hasLegacyRoyalty
          ? "border-amber-400/40 bg-gradient-to-r from-amber-900/10 to-amber-900/5"
          : "border-amber-400/40 bg-gradient-to-r from-amber-900/10 to-amber-900/5"
      }`}>
        <div className="mb-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-amber-200">
              {hasLegacyRoyalty ? t("info.legacyTitle") : t("info.title")}
            </h4>
            <p className="text-sm text-amber-300/80">
              {t("info.subtitle")}
            </p>
          </div>
        </div>

        {hasLegacyRoyalty ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h5 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                {t("info.legacySection.title")}
              </h5>
              <ul className="space-y-2 text-sm text-amber-100/90">
                {t.raw("info.legacySection.items").map((item: string, index: number) => (
                  <li className="flex items-start" key={index}>
                    <span className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <h5 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-300"></span>
                {t("info.currentSection.title")}
              </h5>
              <ul className="space-y-2 text-sm text-amber-100/90">
                {t.raw("info.currentSection.items").map((item: string, index: number) => (
                  <li className="flex items-start" key={index}>
                    <span className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-yellow-300"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <ul className="space-y-3 text-sm text-amber-100/90">
            {t.raw("info.items").map((item: any, index: number) => (
              <li className="flex items-start gap-3" key={index}>
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400">{item.icon}</span>
                </div>
                <div>
                  <span className="font-medium text-amber-200">{item.title}</span>
                  <p className="mt-1 text-amber-300/80">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
