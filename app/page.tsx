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
import { GlobalPanel } from "@/components/Dashboard/GlobalPanel";
import { TestimonialPromoPanel } from "@/components/Dashboard/TestimonialPromoPanel";

export default function Dashboard() {
  const t = useTranslations("Dashboard.page");

  const { address, isConnected } = useAccount();
  const {
    userData,
    globalStats,
    globalSummary,
    globalRicoFarming,
    totalReaders,
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
    migrationAndRoyaltyUI,
  } = useQuantuMatrix();



  console.log("user data", userData)
  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | null>(
    null,
  );
  const [isClaimingRico, setIsClaimingRico] = useState(false);
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

    // Check migration status
    const migrationStatus = userData?.migrationData?.status || 0;

    if (!existsInV2) {
      // User doesn't exist in V2
      if (migrationStatus === 1) {
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

  const handleRegistrationComplete = () => {
    refetchUserData();
    refetchAllData();
  };

  const handleMigrationComplete = () => {
    refetchAllData();
  };

  // Handle V2 royalty claim
  const handleClaimRoyaltyV2 = async () => {
    if (!userData?.exists) return;

    const v2Claimable = migrationAndRoyaltyUI?.v2Claimable || "0";
    if (parseFloat(v2Claimable) === 0) return;

    try {
      const hash = await claimRoyaltyV2();
      if (hash) {
        setCurrentTxHash(hash);
      }
    } catch (error) {
      console.error("Claim failed:", error);
      setCurrentTxHash(null);
    }
  };

  // Handle legacy royalty claim
  const handleClaimLegacyRoyalty = async () => {
    const legacyClaimable = migrationAndRoyaltyUI?.legacyClaimable || "0";
    if (parseFloat(legacyClaimable) === 0) return;

    try {
      const hash = await claimLegacyRoyalty();
      if (hash) {
        setCurrentTxHash(hash);
      }
    } catch (error) {
      console.error("Claim failed:", error);
      setCurrentTxHash(null);
    }
  };

  const isProcessingRoyalty = loading || isConfirming;

  // Check if user can claim V2 royalty
  const canClaimRoyaltyV2 =
    userData?.exists &&
    migrationAndRoyaltyUI?.v2Claimable &&
    parseFloat(migrationAndRoyaltyUI.v2Claimable) >= 0.5;

  // Check if user can claim legacy royalty
  const canClaimLegacyRoyalty =
    userData?.exists &&
    migrationAndRoyaltyUI?.legacyClaimable &&
    parseFloat(migrationAndRoyaltyUI.legacyClaimable) >= 0.5;

  const royaltyAvailable = userData?.royaltyAvailable || "0.00";
  const legacyClaimableAmount =
    migrationAndRoyaltyUI?.legacyClaimable || "0.00";
  const v2ClaimableAmount = migrationAndRoyaltyUI?.v2Claimable || "0.00";

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
                  ? "Migration Required"
                  : dashboardState === "register"
                    ? "Join RICO Matrix"
                    : t("header.title")}
              </h1>
              <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
                {dashboardState === "migrate"
                  ? "Transfer your V1 account to access new V2 features and rewards"
                  : dashboardState === "register"
                    ? "Start your journey with RICO Matrix and unlock earning opportunities"
                    : t("header.description")}
              </p>

              {/* Show Migration Status for migrated users */}
              {/* {dashboardState === "dashboard" && userData?.migrationData && (
                <div className="mt-6 max-w-2xl mx-auto">
                  <MigrationStatus />
                </div>
              )} */}

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
                    gap-6 lg:gap-8 xl:gap-10 mb-8 items-stretch
                  "
                >
                  {/* Left Column - Profile */}
                  <div className="space-y-6 order-2 lg:order-1 h-full">
                    <div className="h-full rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-5 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                      <ProfileInfo
                        userData={userData}
                        rewardTokenAddress={rewardTokenAddress}
                        isClaimingRico={isClaimingRico}
                        onClaimRico={async () => {
                          try {
                            setIsClaimingRico(true);
                            await claimRico();
                          } finally {
                            setIsClaimingRico(false);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Right Column - Stats & Content */}
                  <div className="space-y-6 lg:space-y-8 order-1 lg:order-2 h-full">
                    <TestimonialPromoPanel defaultWallet={address ?? null} />

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
                              : `Claim V1 Royalty: ${parseFloat(
                                  legacyClaimableAmount,
                                ).toFixed(2)} USDT`}
                          </button>
                          <p className="mt-2 text-[0.7rem] text-slate-500 text-center">
                            Claim your V1 royalty balance from before migration
                          </p>
                        </div>
                      )}

                      {/* V2 Royalty Claim Button */}
                      {canClaimRoyaltyV2 && (
                        <div className="mt-4">
                          <button
                            onClick={handleClaimRoyaltyV2}
                            disabled={!canClaimRoyaltyV2 || isProcessingRoyalty}
                            className={`flex w-full items-center justify-center rounded-xl px-6 py-3 text-base md:text-lg font-semibold transition-all
                              ${
                                canClaimRoyaltyV2 && !isProcessingRoyalty
                                  ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-300 text-black shadow-[0_0_22px_rgba(16,185,129,0.7)] hover:brightness-110 active:scale-[0.98]"
                                  : "cursor-not-allowed border border-slate-700 bg-slate-900/80 text-slate-500"
                              }
                            `}
                          >
                            {isProcessingRoyalty
                              ? t("royaltyClaim.processing")
                              : `Claim V2 Royalty: ${parseFloat(
                                  v2ClaimableAmount,
                                ).toFixed(2)} USDT`}
                          </button>
                          <p className="mt-2 text-[0.7rem] text-slate-500 text-center">
                            {t("royaltyClaim.note")}
                          </p>
                        </div>
                      )}

                      {/* Combined Total if both available */}
                      {(canClaimLegacyRoyalty || canClaimRoyaltyV2) && (
                        <div className="mt-3 pt-3 border-t border-slate-800">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">
                              Total Available:
                            </span>
                            <span className="font-bold text-green-400">
                              {(
                                parseFloat(legacyClaimableAmount) +
                                parseFloat(v2ClaimableAmount)
                              ).toFixed(2)}{" "}
                              USDT
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RICO Farming Section */}

                    <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                      <ProfileStats userData={userData} />
                    </div>
                      <ReferralSection />
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
                      🎓
                    </div>
                    <h3 className="text-lg font-semibold text-slate-50 mb-2">
                      {t("quickLinks.skillLab.title")}
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      {t("quickLinks.skillLab.description")}
                    </p>
                    <Link
                      href="/skills"
                      className="inline-block rounded-xl bg-yellow-500/10 px-6 py-2 text-sm font-semibold text-yellow-300 border border-yellow-400/60 hover:bg-yellow-500/20 transition-all"
                    >
                      {t("quickLinks.skillLab.button")}
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

                <div className="mt-8">
                  <GlobalPanel
                    totalReaders={totalReaders}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
