"use client";

import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useQuantuMatrix } from "../hooks/useQuantuMatrix";
import { ConnectWallet } from "../components/Common/ConnectWallet";
import { Stats } from "../components/Dashboard/Stats";
import { Header } from "../components/Navigation/Header";
import ProfileInfo from "../components/Dashboard/ProfileInfo";
import { ReferralSection } from "../components/Profile/ReferralSection";
import { ProfileStats } from "../components/Dashboard/ProfileStats";
import { RegistrationSection } from "../components/Dashboard/RegistrationSection";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MobileWalletConnector from "@/components/Common/MobileWalletConnector";
import RicoMatrixLandingPage from "@/components/Landingpage/Landingpage";
import { formatUnits } from "viem";
import Leaderboards from "@/components/Dashboard/Leaderboards";

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  // Use the hook with all new data
  const {
    // User data
    userData,

    // Global data
    globalStats,
    globalSummary,
    globalRicoFarming,

    // Leaderboards
    topEarners,
    topReferrers,

    // Token addresses
    usdtAddress,
    rewardTokenAddress,

    // USDT data
    usdtBalance,
    usdtAllowance,
    joinCost,

    // Loading state
    loading,

    // Actions
    approveUsdt,
    joinLibrary,
    buyChapter,
    claimRoyalty,
    refetchUserData,
    refetchAllData,
    refetchGlobalStats,
    refetchGlobalSummary,
    refetchGlobalRicoFarming,
  } = useQuantuMatrix();

  const [mounted, setMounted] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | null>(
    null
  );

  const searchParams = useSearchParams();
  const referralAddress = searchParams.get("ref");

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: currentTxHash ?? undefined,
      query: {
        enabled: !!currentTxHash,
      },
    });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (address && isConnected) {
      refetchUserData();
    }
  }, [address, isConnected, refetchUserData]);

  // Refresh data after royalty claim confirmation
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
      console.error("Claim failed:", error);
      setCurrentTxHash(null);
    }
  };

  const isProcessingRoyalty = loading || isConfirming;
  const canClaimRoyalty =
    userData?.exists && Number(userData.royaltyAvailable) > 0;

  const royaltyAvailable = userData?.exists
    ? Number(userData.royaltyAvailable).toFixed(2)
    : "0.00";

  if (!mounted) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-black to-slate-900">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-2">
              Rico Library
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
              🔥📚✨ RICOMATRIX
            </h1>
            <p className="text-sm md:text-base text-slate-400">
              READ • EARN • OWN — Real book chapters on-chain with matrix &
              royalty rewards.
            </p>
          </div>
          <div className="flex justify-center items-center">
            <div className="relative">
              <div className="absolute inset-0 blur-xl opacity-40 bg-yellow-400/40 rounded-full" />
              <div className="relative animate-spin rounded-full h-12 w-12 border-2 border-yellow-400 border-t-transparent" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!isConnected) {
    return (
      <>
        <RicoMatrixLandingPage />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="px-4 py-8 md:py-10">
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <div className="text-center mb-8 md:mb-10 lg:mb-12">
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-3">
                Dashboard
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
                🔥📚✨ RICOMATRIX
              </h1>
              <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
                READ • EARN • OWN — Manage your matrix positions, unlock
                chapters, and monitor royalty earnings in one place.
              </p>

              {/* RICO Token Announcement */}
              {globalRicoFarming?.[0] &&
                parseFloat(formatUnits(BigInt(globalRicoFarming[0]), 18)) >
                  0 && (
                  <div className="mt-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-500/10 px-4 py-2 text-xs md:text-sm font-medium text-cyan-200 hover:bg-cyan-500/20 transition-all">
                      <span className="text-base">🪙</span>
                      <span>Earn RICO tokens 1:1 with all USDT activity!</span>
                    </div>
                  </div>
                )}

              {/* Telegram button in header */}
              <div className="mt-4 flex justify-center">
                <a
                  href="https://t.me/ricomatrix"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-sky-400/60 bg-sky-500/10 px-4 py-2 text-xs md:text-sm font-medium text-sky-200 hover:bg-sky-500/20 transition-all"
                >
                  <span className="text-base">📲</span>
                  <span>Join our Telegram for updates</span>
                </a>
              </div>
            </div>

            {/* Registration Section for New Users */}
            {!userData?.exists && (
              <div className="mb-8 md:mb-10 lg:mb-12">
                <div className="rounded-3xl border border-yellow-500/25 bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900/90 p-4 sm:p-5 md:p-6 lg:p-7 shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
                  <RegistrationSection
                    referralAddress={referralAddress}
                    onRegistrationComplete={refetchUserData}
                  />
                </div>
              </div>
            )}

            {/* Main Content Grid */}
            <div
              className="
                grid grid-cols-1 
                lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)] 
                gap-6 lg:gap-8 xl:gap-10 mb-8
              "
            >
              {/* Left Column - Profile & Referral */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-5 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                  <ProfileInfo
                    userData={userData}
                    rewardTokenAddress={rewardTokenAddress}
                  />
                </div>

                <div className="rounded-2xl border border-purple-400/40 bg-slate-950/80 p-5 shadow-[0_0_26px_rgba(88,28,135,0.6)] backdrop-blur-sm">
                  <ReferralSection />
                </div>
              </div>

              {/* Right Column - Stats & Content */}
              <div className="space-y-6 lg:space-y-8">
                {/* Stats Overview + Royalty Button */}
                <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                  <Stats
                    userData={userData}
                    globalStats={globalStats}
                    globalRicoFarming={globalRicoFarming}
                  />

                  {userData?.exists && (
                    <div className="mt-6">
                      <button
                        onClick={handleClaimRoyalty}
                        disabled={!canClaimRoyalty || isProcessingRoyalty}
                        className={`mt-1 flex w-full items-center justify-center rounded-xl px-6 py-3 text-base md:text-lg font-semibold transition-all
                          ${
                            canClaimRoyalty && !isProcessingRoyalty
                              ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-300 text-black shadow-[0_0_22px_rgba(16,185,129,0.7)] hover:brightness-110 active:scale-[0.98]"
                              : "cursor-not-allowed border border-slate-700 bg-slate-900/80 text-slate-500"
                          }
                        `}
                      >
                        {isProcessingRoyalty
                          ? "Processing royalty claim..."
                          : `Claim $${royaltyAvailable} USDT`}
                      </button>
                      <p className="mt-2 text-[0.7rem] text-slate-500 text-center">
                        Your royalty balance updates automatically after a
                        successful claim.
                      </p>
                    </div>
                  )}
                </div>

                {/* NEW: RICO Farming Section */}
                {userData?.exists && (
                  <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-slate-950 to-slate-900/90 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-cyan-300 flex items-center gap-3">
                        <span className="text-2xl">🪙</span>
                        RICO Token Farming
                      </h3>
                      {rewardTokenAddress && (
                        <a
                          href={`https://bscscan.com/token/${rewardTokenAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                          <span>View Token</span>
                          <span>↗</span>
                        </a>
                      )}
                    </div>

                    {/* Personal RICO Stats */}
                    <div className="mb-8">
                      <h4 className="text-lg font-semibold text-slate-200 mb-4">
                        Your RICO Balance
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-xl bg-slate-900/60 p-4 border border-cyan-700/40">
                          <p className="text-sm text-slate-400 mb-1">
                            Total Earned
                          </p>
                          <p className="text-2xl font-bold text-cyan-400">
                            {userData.ricoShouldHave
                              ? parseFloat(userData.ricoShouldHave).toFixed(2)
                              : "0.00"}{" "}
                            RICO
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            From all chapter purchases
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-900/60 p-4 border border-emerald-700/40">
                          <p className="text-sm text-slate-400 mb-1">
                            Already Received
                          </p>
                          <p className="text-2xl font-bold text-emerald-400">
                            {userData.ricoSent
                              ? parseFloat(userData.ricoSent).toFixed(2)
                              : "0.00"}{" "}
                            RICO
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Automatically sent to wallet
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-900/60 p-4 border border-yellow-700/40">
                          <p className="text-sm text-slate-400 mb-1">Pending</p>
                          <p className="text-2xl font-bold text-yellow-400">
                            {userData.ricoPending
                              ? parseFloat(userData.ricoPending).toFixed(2)
                              : "0.00"}{" "}
                            RICO
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Will be sent automatically
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {userData.ricoShouldHave &&
                        parseFloat(userData.ricoShouldHave) > 0 && (
                          <div className="mt-4">
                            <div className="flex justify-between text-sm text-slate-400 mb-1">
                              <span>Distribution Progress</span>
                              <span>
                                {userData.ricoSent &&
                                parseFloat(userData.ricoSent) > 0
                                  ? `${Math.round(
                                      (parseFloat(userData.ricoSent) /
                                        parseFloat(userData.ricoShouldHave)) *
                                        100
                                    )}%`
                                  : "0%"}
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-2 rounded-full"
                                style={{
                                  width:
                                    userData.ricoShouldHave &&
                                    userData.ricoSent &&
                                    parseFloat(userData.ricoShouldHave) > 0
                                      ? `${Math.min(
                                          (parseFloat(userData.ricoSent) /
                                            parseFloat(
                                              userData.ricoShouldHave
                                            )) *
                                            100,
                                          100
                                        )}%`
                                      : "0%",
                                }}
                              />
                            </div>
                          </div>
                        )}

                      {/* Note about automatic farming */}
                      <p className="mt-4 text-sm text-slate-500 p-3 bg-slate-900/40 rounded-lg">
                        📈 <span className="text-cyan-300">RICO Farming:</span>{" "}
                        You earn 1 RICO for every 1 USDT spent on chapters, plus
                        1 RICO for every 1 USDT earned in upline rewards. RICO
                        is sent automatically when available in the contract.
                      </p>
                    </div>

                    {/* Global RICO Stats */}
                    {globalRicoFarming && (
                      <div className="mt-6 pt-6 border-t border-slate-800">
                        <h4 className="text-lg font-semibold text-slate-200 mb-4">
                          Global RICO Distribution
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="rounded-xl bg-slate-900/60 p-4 border border-slate-700">
                            <p className="text-sm text-slate-400 mb-1">
                              Total Should Farm
                            </p>
                            <p className="text-xl font-bold text-cyan-400">
                              {globalRicoFarming?.[0]
                                ? parseFloat(
                                    formatUnits(
                                      BigInt(globalRicoFarming[0]),
                                      18
                                    )
                                  ).toFixed(2)
                                : "0.00"}{" "}
                              RICO
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-900/60 p-4 border border-slate-700">
                            <p className="text-sm text-slate-400 mb-1">
                              Total Distributed
                            </p>
                            <p className="text-xl font-bold text-emerald-400">
                              {globalRicoFarming?.[1]
                                ? parseFloat(
                                    formatUnits(
                                      BigInt(globalRicoFarming[1]),
                                      18
                                    )
                                  ).toFixed(2)
                                : "0.00"}{" "}
                              RICO
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-900/60 p-4 border border-slate-700">
                            <p className="text-sm text-slate-400 mb-1">
                              Remaining to Farm
                            </p>
                            <p className="text-xl font-bold text-yellow-400">
                              {globalRicoFarming?.[2]
                                ? parseFloat(
                                    formatUnits(
                                      BigInt(globalRicoFarming[2]),
                                      18
                                    )
                                  ).toFixed(2)
                                : "0.00"}{" "}
                              RICO
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {userData?.exists && (
                  <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                    <ProfileStats userData={userData} />
                  </div>
                )}
              </div>
            </div>
            {/* Add this wrapper */}
            {userData?.exists && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 lg:gap-6  mb-8">
                <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/70 p-6 text-center shadow-[0_0_28px_rgba(0,0,0,0.6)]">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center text-xl mb-4 mx-auto">
                    📚
                  </div>
                  <h3 className="text-lg font-semibold text-slate-50 mb-2">
                    View Chapters
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Explore all available book chapters and upgrade levels as
                    you grow.
                  </p>
                  <Link
                    href="/chapters"
                    className="inline-block rounded-xl bg-yellow-500/10 px-6 py-2 text-sm font-semibold text-yellow-300 border border-yellow-400/60 hover:bg-yellow-500/20 transition-all"
                  >
                    Browse Chapters
                  </Link>
                </div>

                <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/70 p-6 text-center shadow-[0_0_28px_rgba(0,0,0,0.6)]">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-400 to-cyan-500 flex items-center justify-center text-xl mb-4 mx-auto">
                    🕸️
                  </div>
                  <h3 className="text-lg font-semibold text-slate-50 mb-2">
                    Check Matrix
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    View your matrix network and track your downline growth.
                  </p>
                  <Link
                    href="/matrix"
                    className="inline-block rounded-xl bg-yellow-500/10 px-6 py-2 text-sm font-semibold text-yellow-300 border border-yellow-400/60 hover:bg-yellow-500/20 transition-all"
                  >
                    View Matrix
                  </Link>
                </div>

                <div className="rounded-2xl border border-emerald-500/25 bg-slate-950/70 p-6 text-center shadow-[0_0_28px_rgba(0,0,0,0.6)]">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 flex items-center justify-center text-xl mb-4 mx-auto">
                    👑
                  </div>
                  <h3 className="text-lg font-semibold text-slate-50 mb-2">
                    Check Royalty
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    View your royalty pool share and claim earnings from library
                    activity.
                  </p>
                  <Link
                    href="/royalty"
                    className="inline-block rounded-xl bg-emerald-500/90 px-6 py-2 text-sm font-semibold text-black shadow-[0_0_18px_rgba(16,185,129,0.7)] hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    View Royalty
                  </Link>
                </div>

                <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/70 p-6 text-center shadow-[0_0_28px_rgba(0,0,0,0.6)]">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 flex items-center justify-center text-xl mb-4 mx-auto">
                    🪙
                  </div>
                  <h3 className="text-lg font-semibold text-slate-50 mb-2">
                    View RICO Farming
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Track your RICO token earnings from chapter purchases and
                    upline rewards.
                  </p>
                  <Link
                    href="/rico"
                    className="inline-block rounded-xl bg-cyan-500/90 px-6 py-2 text-sm font-semibold text-black shadow-[0_0_18px_rgba(34,211,238,0.7)] hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    View RICO Stats
                  </Link>
                </div>
              </div>
            )}
            {/* Leaderboards Section */}
            {userData?.exists && (
              <Leaderboards
                topEarners={topEarners}
                topReferrers={topReferrers}
              />
            )}

            {/* Global Summary for All Users */}
            <div className="mb-8 md:mb-10 lg:mb-12">
              <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-950 to-slate-900/90 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                <h3 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-3">
                  <span className="text-2xl">🌍</span>
                  Global Network Summary
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="rounded-xl bg-slate-900/60 p-4">
                    <p className="text-xs text-slate-400 mb-1">Total Readers</p>
                    <p className="text-lg font-bold text-slate-100">
                      {globalSummary?.totalReaders?.toString() || "0"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/60 p-4">
                    <p className="text-xs text-slate-400 mb-1">
                      Chapters Purchased
                    </p>
                    <p className="text-lg font-bold text-cyan-300">
                      {globalSummary?.globalTotalChaptersPurchased?.toString() ||
                        "0"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/60 p-4">
                    <p className="text-xs text-slate-400 mb-1">
                      USDT Distributed
                    </p>
                    <p className="text-lg font-bold text-yellow-300">
                      {globalSummary?.globalTotalUnilevelPaid
                        ? parseFloat(
                            formatUnits(
                              BigInt(globalSummary.globalTotalUnilevelPaid),
                              18
                            )
                          ).toFixed(2)
                        : "0.00"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/60 p-4">
                    <p className="text-xs text-slate-400 mb-1">Royalty Pool</p>
                    <p className="text-lg font-bold text-purple-300">
                      {globalSummary?.royaltyPot
                        ? parseFloat(
                            formatUnits(BigInt(globalSummary.royaltyPot), 18)
                          ).toFixed(2)
                        : "0.00"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/60 p-4">
                    <p className="text-xs text-slate-400 mb-1">RICO Farmed</p>
                    <p className="text-lg font-bold text-cyan-400">
                      {globalSummary?.ricoExpectedTotal
                        ? parseFloat(
                            formatUnits(
                              BigInt(globalSummary.ricoExpectedTotal),
                              18
                            )
                          ).toFixed(2)
                        : "0.00"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/60 p-4">
                    <p className="text-xs text-slate-400 mb-1">
                      Active Referrers
                    </p>
                    <p className="text-lg font-bold text-emerald-300">
                      {globalSummary?.globalActiveReferrers?.toString() || "0"}
                    </p>
                  </div>
                </div>

                {/* Refresh Button */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={refetchAllData}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl bg-slate-800/50 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-all border border-slate-700/50"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <span className="text-lg">🔄</span>
                        Refresh All Data
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
