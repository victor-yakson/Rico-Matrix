"use client";

import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useQuantuMatrix } from "../hooks/useQuantuMatrix";
import { Header } from "../components/Navigation/Header";
import ProfileInfo from "../components/Dashboard/ProfileInfo";
import { ReferralSection } from "../components/Profile/ReferralSection";
import { ProfileStats } from "../components/Dashboard/ProfileStats";
import { RegistrationSection } from "../components/Dashboard/RegistrationSection";
import MigrationPanel from "@/components/Dashboard/MigrationPanel";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatUnits } from "viem";
import Leaderboards from "@/components/Dashboard/Leaderboards";
import { useTranslations } from "next-intl";
import { Stats } from "../components/Dashboard/Stats";
import RicoMatrixLandingPage from "@/components/Landingpage/Landingpage";
import { GlobalPanel } from "@/components/Dashboard/GlobalPanel";
import SiteFooter from "@/components/Layout/SiteFooter";
import { VotingModal } from "@/components/Voting/VotingModal";
import { isRicoQuantEngineLive } from "@/lib/launchSchedule";

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
    fetchTrack1Matrix,
    fetchTrack2Matrix,
    refetchUserData,
    refetchAllData,
    refetchGlobalStats,
    refetchGlobalSummary,
    refetchGlobalRicoFarming,
    migrationAndRoyaltyUI,
  } = useQuantuMatrix();
  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | null>(
    null,
  );
  const [isClaimingRico, setIsClaimingRico] = useState(false);
  const [blockedChapters, setBlockedChapters] = useState<
    Array<{ track: "X3" | "X6"; chapter: number }>
  >([]);
  const [featureCarouselIndex, setFeatureCarouselIndex] = useState(0);
  const [isVotingModalOpen, setIsVotingModalOpen] = useState(false);
  const [hasPromptedVoting, setHasPromptedVoting] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const searchParams = useSearchParams();
  const urlReferral = searchParams.get("ref");

  const isQuantEngineLive = useMemo(
    () => isRicoQuantEngineLive(currentTime),
    [currentTime],
  );

  const upcomingFeatures = useMemo(
    () => [
      {
        icon: "📈",
        title: t("header.featureCarousel.items.0.title"),
        status: t("header.featureCarousel.items.0.status"),
        tone:
          "border-yellow-400/20 bg-[radial-gradient(circle_at_30%_30%,rgba(250,204,21,0.22),rgba(250,204,21,0.08))] text-yellow-100 shadow-[0_0_24px_rgba(234,179,8,0.16)]",
      },
      {
        icon: "⚙️",
        title: t("header.featureCarousel.items.1.title"),
        status: isQuantEngineLive
          ? t("header.featureCarousel.items.1.liveStatus")
          : t("header.featureCarousel.items.1.status"),
        tone:
          "border-cyan-400/20 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.2),rgba(34,211,238,0.06))] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.14)]",
      },
      {
        icon: "🧠",
        title: t("header.featureCarousel.items.2.title"),
        status: t("header.featureCarousel.items.2.status"),
        tone:
          "border-amber-300/20 bg-[radial-gradient(circle_at_30%_30%,rgba(251,191,36,0.22),rgba(251,191,36,0.07))] text-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.14)]",
      },
      {
        icon: "⚡",
        title: t("header.featureCarousel.items.3.title"),
        status: t("header.featureCarousel.items.3.status"),
        tone:
          "border-sky-400/20 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.2),rgba(56,189,248,0.06))] text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.14)]",
      },
    ],
    [isQuantEngineLive, t],
  );

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
    const migrationStatus =
      userData?.migrationStatus?.status ?? userData?.migrationData?.status ?? 0;

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

  useEffect(() => {
    const loadBlockedChapters = async () => {
      if (dashboardState !== "dashboard" || !address || !userData?.exists) {
        setBlockedChapters([]);
        return;
      }

      try {
        const checks: Array<
          Promise<{ track: "X3" | "X6"; chapter: number; blocked: boolean }>
        > = [];

        if (userData.track1Unlocked > 0) {
          checks.push(
            fetchTrack1Matrix(address, userData.track1Unlocked).then(
              (data) => ({
                track: "X3" as const,
                chapter: userData.track1Unlocked,
                blocked: Boolean(data?.blocked),
              }),
            ),
          );
        }

        if (userData.track2Unlocked > 0) {
          checks.push(
            fetchTrack2Matrix(address, userData.track2Unlocked).then(
              (data) => ({
                track: "X6" as const,
                chapter: userData.track2Unlocked,
                blocked: Boolean(data?.blocked),
              }),
            ),
          );
        }

        const results = await Promise.all(checks);
        setBlockedChapters(
          results
            .filter((item) => item.blocked)
            .map(({ track, chapter }) => ({ track, chapter })),
        );
      } catch (error) {
        console.error("Failed to load blocked chapter state:", error);
        setBlockedChapters([]);
      }
    };

    void loadBlockedChapters();
  }, [
    address,
    dashboardState,
    fetchTrack1Matrix,
    fetchTrack2Matrix,
    userData?.exists,
    userData?.track1Unlocked,
    userData?.track2Unlocked,
  ]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (dashboardState !== "dashboard") {
      setFeatureCarouselIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setFeatureCarouselIndex(
        (current) => (current + 1) % upcomingFeatures.length,
      );
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [dashboardState, upcomingFeatures.length]);

  useEffect(() => {
    if (
      dashboardState === "dashboard" &&
      userData?.exists &&
      !hasPromptedVoting
    ) {
      setIsVotingModalOpen(true);
      setHasPromptedVoting(true);
    }
  }, [dashboardState, hasPromptedVoting, userData?.exists]);

  // Show landing page if not connected
  if (!isConnected) {
    return <RicoMatrixLandingPage />;
  }

  // Show loading state
  if (loading && !userData) {
    return (
      <>
        <Header />
        <div className="theme-shell flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
          <div className="text-center mb-8">
            <p className="theme-kicker justify-center">
              {t("loading.subtitle")}
            </p>
            <h1 className="theme-title mb-3 text-3xl md:text-4xl">
              {t("loading.title")}
            </h1>
            <p className="theme-copy text-sm md:text-base">
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
      <div className="theme-shell theme-page-shell">
        <div className="theme-container px-4">
          {/* Header - Show for all states except landing */}
          <div className="mx-auto mb-8 max-w-4xl text-center md:mb-10 lg:mb-12">
            <p className="theme-kicker justify-center mb-3">
              {dashboardState === "migrate"
                ? "ACCOUNT UPGRADE REQUIRED"
                : dashboardState === "register"
                  ? "WELCOME TO RICO MATRIX"
                  : t("header.subtitle")}
            </p>
            <h1 className="theme-title mb-3 text-3xl md:text-4xl">
              {dashboardState === "migrate"
                ? "Migration Required"
                : dashboardState === "register"
                  ? "Join RICO Matrix"
                  : t("header.title")}
            </h1>
            <p className="theme-copy max-w-2xl mx-auto text-sm md:text-base">
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
              parseFloat(formatUnits(BigInt(globalRicoFarming[0]), 18)) > 0 && (
                <div className="mt-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/50 bg-yellow-500/10 px-4 py-2 text-xs md:text-sm font-medium text-yellow-100 hover:bg-yellow-500/20 transition-all">
                    <span className="text-base">🪙</span>
                    <span>{t("header.ricoAnnouncement")}</span>
                  </div>
                </div>
              )}

            {dashboardState === "dashboard" && (
              <div className="mx-auto mt-4 max-w-3xl">
                <div className="theme-panel relative overflow-hidden border border-yellow-400/20 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.12),transparent_32%),linear-gradient(180deg,rgba(24,24,32,0.96),rgba(10,10,18,0.98))] px-4 py-4 shadow-[0_0_34px_rgba(234,179,8,0.12)] sm:px-5">
                  <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-yellow-300/70 to-transparent" />
                  <div className="pointer-events-none absolute -right-12 top-6 h-24 w-24 rounded-full bg-yellow-300/10 blur-3xl" />
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 text-center sm:text-left">
                      <p className="theme-kicker mb-2 justify-center text-[10px] sm:justify-start">
                        {t("header.featureCarousel.kicker")}
                      </p>
                      <div
                        key={featureCarouselIndex}
                        className="dashboard-feature-carousel min-h-[116px] sm:min-h-[92px]"
                      >
                        <div className="inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-yellow-200/90">
                          <span>
                            {upcomingFeatures[featureCarouselIndex]?.status}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-center gap-3 sm:justify-start">
                          <div
                            className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-3xl ${upcomingFeatures[featureCarouselIndex]?.tone}`}
                          >
                            <span aria-hidden="true">
                              {upcomingFeatures[featureCarouselIndex]?.icon}
                            </span>
                          </div>
                          <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">
                            {upcomingFeatures[featureCarouselIndex]?.title}
                          </h2>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-3 sm:items-end">
                      <a
                        href="https://app.ricomatrix.com"
                        target="_blank"
                        rel="noreferrer"
                        className="theme-button-secondary px-4 py-2 text-xs md:text-sm"
                      >
                        <span>{t("header.featureCarousel.learnMore")}</span>
                      </a>

                      <div className="flex items-center justify-center gap-2 sm:justify-end">
                        {upcomingFeatures.map((feature, index) => (
                          <button
                            key={feature.title}
                            type="button"
                            aria-label={feature.title}
                            onClick={() => setFeatureCarouselIndex(index)}
                            className={`h-2.5 rounded-full transition-all ${
                              index === featureCarouselIndex
                                ? "w-8 bg-yellow-400"
                                : "w-2.5 bg-white/20 hover:bg-white/35"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
              <div className="theme-panel p-4 sm:p-5 md:p-6 lg:p-7">
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
              {blockedChapters.length > 0 && (
                <section className="mb-6 rounded-2xl border border-red-500/35 bg-red-500/10 p-5 shadow-[0_0_28px_rgba(127,29,29,0.22)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-200">
                        {t("blockedChapter.kicker")}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-slate-50">
                        {t("blockedChapter.title")}
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm text-slate-300">
                        {t("blockedChapter.description")}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {blockedChapters.map((item) => (
                          <span
                            key={`${item.track}-${item.chapter}`}
                            className="inline-flex items-center rounded-full border border-red-400/35 bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-red-100"
                          >
                            {t("blockedChapter.item", {
                              track: item.track,
                              chapter: item.chapter,
                            })}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Link
                      href="/chapters"
                      className="inline-flex items-center justify-center rounded-xl bg-red-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-red-300"
                    >
                      {t("blockedChapter.action")}
                    </Link>
                  </div>
                </section>
              )}

              {/* Main Content Grid */}
              <div className="mb-8 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)] lg:gap-8 xl:gap-10">
                {/* Left Column - Profile */}
                <div className="space-y-6 order-2 lg:order-1 h-full">
                  <div className="theme-panel h-full p-5">
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
                  {/* Stats Overview + Royalty Buttons */}
                  <div className="theme-panel p-5 md:p-6">
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
                                  ? "bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-[0_0_22px_rgba(245,158,11,0.7)] hover:brightness-110 active:scale-[0.98]"
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
                                  ? "bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200 text-black shadow-[0_0_22px_rgba(184,128,54,0.62)] hover:brightness-110 active:scale-[0.98]"
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
                          <span className="font-bold text-amber-300">
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

              {/* Leaderboards Section */}
              <Leaderboards
                topEarners={topEarners}
                topReferrers={topReferrers}
              />

              <div className="mt-8">
                <GlobalPanel totalReaders={totalReaders} />
              </div>
            </>
          )}
        </div>
        <SiteFooter />
      </div>
      <VotingModal
        open={dashboardState === "dashboard" && userData?.exists && isVotingModalOpen}
        onClose={() => setIsVotingModalOpen(false)}
      />
      <style jsx>{`
        .dashboard-feature-carousel {
          animation: dashboardFeatureFade 0.5s ease;
        }

        @keyframes dashboardFeatureFade {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
