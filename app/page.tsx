"use client";

import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useQuantuMatrix } from "../hooks/useQuantuMatrix";
import { Header } from "../components/Navigation/Header";
import ProfileInfo from "../components/Dashboard/ProfileInfo";
import { ReferralSection } from "../components/Profile/ReferralSection";
import { ProfileStats } from "../components/Dashboard/ProfileStats";
import { RegistrationSection } from "../components/Dashboard/RegistrationSection";
import MigrationPanel from "@/components/Dashboard/MigrationPanel";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatUnits } from "viem";
import Leaderboards from "@/components/Dashboard/Leaderboards";
import { useTranslations } from "next-intl";
import { Stats } from "../components/Dashboard/Stats";
import RicoMatrixLandingPage from "@/components/Landingpage/Landingpage";

export default function Dashboard() {
  const t = useTranslations("Dashboard.page");

  const { address, isConnected } = useAccount();
  const {
    userData,
    globalStats,
    globalSummary,
    globalRicoFarming,
    topEarners,
    topReferrers,
    rewardTokenAddress,
    usdtBalance,
    usdtAllowance,
    joinCost,
    loading,
    approveUsdt,
    joinLibrary,
    buyChapter,
    claimRoyalty,
    claimRoyaltyV2,
    claimRico,
    claimLegacyRoyalty,
    refetchUserData,
    refetchAllData,
    refetchGlobalStats,
    refetchGlobalSummary,
    refetchGlobalRicoFarming,
  } = useQuantuMatrix();

  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | null>(
    null
  );
  const searchParams = useSearchParams();
  const urlReferral = searchParams.get("ref");

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: currentTxHash ?? undefined,
      query: {
        enabled: !!currentTxHash,
      },
    });

  // Check user status to determine what to show
  const getDashboardState = () => {
    if (!isConnected) return "landing";

    // Check if user exists in V2
    const existsInV2 = userData?.exists || false;

    // Check if user exists in V1 (from migrationStatus)
    const existsInV1 = userData?.migrationStatus?.existsV1 || false;

    // Check if already migrated
    const isMigrated = userData?.migrationStatus?.migrated || false;

    if (!existsInV2) {
      // User doesn't exist in V2
      if (existsInV1 && !isMigrated) {
        // User exists in V1 but not migrated to V2 - show migration
        return "migrate";
      } else {
        // User doesn't exist in V1 or V2 - show registration
        return "register";
      }
    } else {
      // User exists in V2 - show dashboard
      return "dashboard";
    }
  };

  const dashboardState = getDashboardState();

  // Log for debugging
  console.log("Dashboard state:", dashboardState);
  console.log("User data:", userData);
  console.log("Migration status:", userData?.migrationStatus);

  const handleRegistrationComplete = () => {
    refetchAllData();
    console.log("Registration complete!");
  };

  const handleMigrationComplete = () => {
    refetchAllData();
    console.log("Migration complete!");
  };

  // Handle V2 royalty claim
  const handleClaimRoyaltyV2 = async () => {
    if (!userData?.exists || Number(userData.royaltyAvailable) === 0) return;
    try {
      const hash = await claimRoyaltyV2();
      setCurrentTxHash(hash);
    } catch (error) {
      console.error("Claim failed:", error);
      setCurrentTxHash(null);
    }
  };

  // Handle legacy royalty claim
  const handleClaimLegacyRoyalty = async () => {
    if (!userData?.migrationData?.canClaimLegacy) return;
    try {
      const hash = await claimLegacyRoyalty();
      setCurrentTxHash(hash);
    } catch (error) {
      console.error("Claim failed:", error);
      setCurrentTxHash(null);
    }
  };

  const isProcessingRoyalty = loading || isConfirming;
  const canClaimRoyalty =
    userData?.exists && Number(userData.royaltyAvailable) > 0;
  const canClaimLegacyRoyalty = userData?.migrationData?.canClaimLegacy;

  const royaltyAvailable = userData?.exists
    ? Number(userData.royaltyAvailable).toFixed(2)
    : "0.00";

  // Helper function to render HTML
  const renderHTML = (html: string) => {
    return { __html: html };
  };

  // Show landing page if not connected
  if (!isConnected) {
    return <RicoMatrixLandingPage />;
  }

  // Show loading state
  if (loading && !userData) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-black to-slate-900">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-2">
              {t("loading.subtitle")}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
              {t("loading.title")}
            </h1>
            <p className="text-sm md:text-base text-slate-400">
              {t("loading.description")}
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

  // Render based on user state
  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="px-4 py-8 md:py-10">
          <div className="mx-auto max-w-7xl">
            {/* Header - Show for all states except landing */}
            <div className="text-center mb-8 md:mb-10 lg:mb-12">
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-3">
                {dashboardState === "migrate"
                  ? "ACCOUNT UPGRADE REQUIRED"
                  : dashboardState === "register"
                  ? "WELCOME TO RICO MATRIX"
                  : t("header.subtitle")}
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
                {dashboardState === "migrate"
                  ? "Upgrade Your Account to V2"
                  : dashboardState === "register"
                  ? "Join RICO Matrix"
                  : t("header.title")}
              </h1>
              <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
                {dashboardState === "migrate"
                  ? "Migrate your V1 account to access new features and enhanced performance"
                  : dashboardState === "register"
                  ? "Start your journey with RICO Matrix and unlock earning opportunities"
                  : t("header.description")}
              </p>

              {/* RICO Token Announcement - only show on dashboard */}
              {dashboardState === "dashboard" &&
                globalRicoFarming?.[0] &&
                parseFloat(formatUnits(BigInt(globalRicoFarming[0]), 18)) >
                  0 && (
                  <div className="mt-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-500/10 px-4 py-2 text-xs md:text-sm font-medium text-cyan-200 hover:bg-cyan-500/20 transition-all">
                      <span className="text-base">🪙</span>
                      <span>{t("header.ricoAnnouncement")}</span>
                    </div>
                  </div>
                )}

              {/* Telegram button in header */}
              <div className="mt-4 flex justify-center">
                <a
                  href="https://t.me/ricomatrixdapp"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-sky-400/60 bg-sky-500/10 px-4 py-2 text-xs md:text-sm font-medium text-sky-200 hover:bg-sky-500/20 transition-all"
                >
                  <span className="text-base">📲</span>
                  <span>{t("header.telegram")}</span>
                </a>
              </div>
            </div>

            {/* Show Migration Panel if user needs to migrate */}
            {dashboardState === "migrate" && (
              <div className="mb-8 md:mb-10 lg:mb-12">
                <MigrationPanel onMigrationComplete={handleMigrationComplete} />
              </div>
            )}

            {/* Show Registration Section if new user */}
            {dashboardState === "register" && (
              <div className="mb-8 md:mb-10 lg:mb-12">
                <div className="rounded-3xl border border-yellow-500/25 bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900/90 p-4 sm:p-5 md:p-6 lg:p-7 shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
                  <RegistrationSection
                    referralAddress={urlReferral}
                    onRegistrationComplete={handleRegistrationComplete}
                  />
                </div>
              </div>
            )}

            {/* Show Full Dashboard if user exists in V2 */}
            {dashboardState === "dashboard" && (
              <>
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
                    {/* Stats Overview + Royalty Buttons */}
                    <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                      <Stats
                        userData={userData}
                        globalStats={globalStats}
                        globalRicoFarming={globalRicoFarming}
                      />

                      {/* Legacy Royalty Claim Button (if available) */}
                      {canClaimLegacyRoyalty && (
                        <div className="mt-4">
                          <button
                            onClick={handleClaimLegacyRoyalty}
                            disabled={isProcessingRoyalty}
                            className={`flex w-full items-center justify-center rounded-xl px-6 py-3 text-base md:text-lg font-semibold transition-all
                              ${
                                !isProcessingRoyalty
                                  ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-[0_0_22px_rgba(245,158,11,0.7)] hover:brightness-110 active:scale-[0.98]"
                                  : "cursor-not-allowed border border-slate-700 bg-slate-900/80 text-slate-500"
                              }
                            `}
                          >
                            {isProcessingRoyalty
                              ? "Processing..."
                              : `Claim Legacy Royalty: ${
                                  userData.migrationData?.legacyClaimable ||
                                  "0.00"
                                } USDT`}
                          </button>
                          <p className="mt-2 text-[0.7rem] text-slate-500 text-center">
                            Claim your V1 royalty balance
                          </p>
                        </div>
                      )}

                      {/* V2 Royalty Claim Button */}
                      {canClaimRoyalty && (
                        <div className="mt-4">
                          <button
                            onClick={handleClaimRoyaltyV2}
                            disabled={!canClaimRoyalty || isProcessingRoyalty}
                            className={`flex w-full items-center justify-center rounded-xl px-6 py-3 text-base md:text-lg font-semibold transition-all
                              ${
                                canClaimRoyalty && !isProcessingRoyalty
                                  ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-300 text-black shadow-[0_0_22px_rgba(16,185,129,0.7)] hover:brightness-110 active:scale-[0.98]"
                                  : "cursor-not-allowed border border-slate-700 bg-slate-900/80 text-slate-500"
                              }
                            `}
                          >
                            {isProcessingRoyalty
                              ? t("royaltyClaim.processing")
                              : t("royaltyClaim.button", {
                                  amount: royaltyAvailable,
                                })}
                          </button>
                          <p className="mt-2 text-[0.7rem] text-slate-500 text-center">
                            {t("royaltyClaim.note")}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* RICO Farming Section */}
                    <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-slate-950 to-slate-900/90 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-cyan-300 flex items-center gap-3">
                          <span className="text-2xl">🪙</span>
                          {t("ricoFarmingSection.title")}
                        </h3>
                        {rewardTokenAddress && (
                          <a
                            href={`https://bscscan.com/token/${rewardTokenAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            <span>{t("ricoFarmingSection.viewToken")}</span>
                            <span>↗</span>
                          </a>
                        )}
                      </div>

                      {/* Personal RICO Stats */}
                      <div className="mb-8">
                        <h4 className="text-lg font-semibold text-slate-200 mb-4">
                          {t("ricoFarmingSection.yourBalance")}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="rounded-xl bg-slate-900/60 p-4 border border-cyan-700/40">
                            <p className="text-sm text-slate-400 mb-1">
                              {t("ricoFarmingSection.stats.totalEarned")}
                            </p>
                            <p className="text-2xl font-bold text-cyan-400">
                              {userData.ricoShouldHave
                                ? parseFloat(userData.ricoShouldHave).toFixed(2)
                                : "0.00"}{" "}
                              RICO
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {t("ricoFarmingSection.stats.fromPurchases")}
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-900/60 p-4 border border-emerald-700/40">
                            <p className="text-sm text-slate-400 mb-1">
                              {t("ricoFarmingSection.stats.alreadyReceived")}
                            </p>
                            <p className="text-2xl font-bold text-emerald-400">
                              {userData.ricoSent
                                ? parseFloat(userData.ricoSent).toFixed(2)
                                : "0.00"}{" "}
                              RICO
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {t("ricoFarmingSection.stats.autoSent")}
                            </p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        {userData.ricoShouldHave &&
                          parseFloat(userData.ricoShouldHave) > 0 && (
                            <div className="mt-4">
                              <div className="flex justify-between text-sm text-slate-400 mb-1">
                                <span>
                                  {t(
                                    "ricoFarmingSection.stats.distributionProgress"
                                  )}
                                </span>
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
                        <p
                          className="mt-4 text-sm text-slate-500 p-3 bg-slate-900/40 rounded-lg"
                          dangerouslySetInnerHTML={renderHTML(
                            t("ricoFarmingSection.note")
                          )}
                        />
                      </div>

                      {/* Global RICO Stats */}
                      {globalRicoFarming && (
                        <div className="mt-6 pt-6 border-t border-slate-800">
                          <h4 className="text-lg font-semibold text-slate-200 mb-4">
                            {t("ricoFarmingSection.globalStats.title")}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="rounded-xl bg-slate-900/60 p-4 border border-slate-700">
                              <p className="text-sm text-slate-400 mb-1">
                                {t(
                                  "ricoFarmingSection.globalStats.totalShouldFarm"
                                )}
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
                                {t(
                                  "ricoFarmingSection.globalStats.totalDistributed"
                                )}
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
                                {t(
                                  "ricoFarmingSection.globalStats.remainingToFarm"
                                )}
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

                    <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                      <ProfileStats userData={userData} />
                    </div>
                  </div>
                </div>

                {/* Quick Links Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 lg:gap-6 mb-8">
                  <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/70 p-6 text-center shadow-[0_0_28px_rgba(0,0,0,0.6)]">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center text-xl mb-4 mx-auto">
                      📚
                    </div>
                    <h3 className="text-lg font-semibold text-slate-50 mb-2">
                      {t("quickLinks.viewChapters.title")}
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      {t("quickLinks.viewChapters.description")}
                    </p>
                    <Link
                      href="/chapters"
                      className="inline-block rounded-xl bg-yellow-500/10 px-6 py-2 text-sm font-semibold text-yellow-300 border border-yellow-400/60 hover:bg-yellow-500/20 transition-all"
                    >
                      {t("quickLinks.viewChapters.button")}
                    </Link>
                  </div>

                  <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/70 p-6 text-center shadow-[0_0_28px_rgba(0,0,0,0.6)]">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-400 to-cyan-500 flex items-center justify-center text-xl mb-4 mx-auto">
                      🕸️
                    </div>
                    <h3 className="text-lg font-semibold text-slate-50 mb-2">
                      {t("quickLinks.checkMatrix.title")}
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      {t("quickLinks.checkMatrix.description")}
                    </p>
                    <Link
                      href="/matrix"
                      className="inline-block rounded-xl bg-yellow-500/10 px-6 py-2 text-sm font-semibold text-yellow-300 border border-yellow-400/60 hover:bg-yellow-500/20 transition-all"
                    >
                      {t("quickLinks.checkMatrix.button")}
                    </Link>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/25 bg-slate-950/70 p-6 text-center shadow-[0_0_28px_rgba(0,0,0,0.6)]">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 flex items-center justify-center text-xl mb-4 mx-auto">
                      👑
                    </div>
                    <h3 className="text-lg font-semibold text-slate-50 mb-2">
                      {t("quickLinks.checkRoyalty.title")}
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      {t("quickLinks.checkRoyalty.description")}
                    </p>
                    <Link
                      href="/royalty"
                      className="inline-block rounded-xl bg-emerald-500/90 px-6 py-2 text-sm font-semibold text-black shadow-[0_0_18px_rgba(16,185,129,0.7)] hover:brightness-110 active:scale-[0.98] transition-all"
                    >
                      {t("quickLinks.checkRoyalty.button")}
                    </Link>
                  </div>

                  <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/70 p-6 text-center shadow-[0_0_28px_rgba(0,0,0,0.6)]">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 flex items-center justify-center text-xl mb-4 mx-auto">
                      🪙
                    </div>
                    <h3 className="text-lg font-semibold text-slate-50 mb-2">
                      {t("quickLinks.viewRICO.title")}
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      {t("quickLinks.viewRICO.description")}
                    </p>
                    <Link
                      href="/rico"
                      className="inline-block rounded-xl bg-cyan-500/90 px-6 py-2 text-sm font-semibold text-black shadow-[0_0_18px_rgba(34,211,238,0.7)] hover:brightness-110 active:scale-[0.98] transition-all"
                    >
                      {t("quickLinks.viewRICO.button")}
                    </Link>
                  </div>
                </div>

                {/* Leaderboards Section */}
                <Leaderboards
                  topEarners={topEarners}
                  topReferrers={topReferrers}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
