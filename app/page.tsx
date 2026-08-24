"use client";

import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useQuantuMatrix } from "../hooks/useQuantuMatrix";
import { Header } from "../components/Navigation/Header";
import ProfileInfo from "../components/Dashboard/ProfileInfo";
import { ReferralSection } from "../components/Profile/ReferralSection";
import { ProfileStats } from "../components/Dashboard/ProfileStats";
import { RegistrationSection } from "../components/Dashboard/RegistrationSection";
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
import { isRicoQuantEngineLive } from "@/lib/launchSchedule";
import { motion } from "framer-motion";
import { RewardCelebrationModal } from "../components/Giveaway/RewardCelebrationModal";

const formatUnitsSafe = (value: unknown, decimals = 18): string => {
  try {
    if (value === null || value === undefined || value === "") return "0";
    return formatUnits(BigInt(String(value)), decimals);
  } catch {
    return "0";
  }
};

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
    dataRefreshing,
    approveUsdt,
    joinLibrary,
    buyChapter,
    claimRoyalty,
    claimRoyaltyV2,
    claimLegacyRoyalty,
    claimLegacyPendingRico,
    migrateSelf,
    claimRico,
    fetchTrack1Matrix,
    fetchTrack2Matrix,
    refetchUserData,
    refetchAllData,
    refetchGlobalStats,
    refetchGlobalSummary,
    refetchGlobalRicoFarming,
    migrationAndRoyaltyUI,
    ricoPending,
    activeChain,
    isHubChain,
    dataScopeLabel,
  } = useQuantuMatrix();
  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | null>(
    null,
  );
  const [isClaimingRico, setIsClaimingRico] = useState(false);
  const [blockedChapters, setBlockedChapters] = useState<
    Array<{ track: "X3" | "X6"; chapter: number }>
  >([]);
  const [featureCarouselIndex, setFeatureCarouselIndex] = useState(0);
  const [showRewardCelebration, setShowRewardCelebration] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [isLegacyActionRunning, setIsLegacyActionRunning] = useState(false);
  const [legacyActionChecked, setLegacyActionChecked] = useState(false);
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
        href: "https://app.ricomatrix.com",
        domainLabel: "app.ricomatrix.com",
        tone:
          "border-yellow-400/20 bg-[radial-gradient(circle_at_30%_30%,rgba(250,204,21,0.22),rgba(250,204,21,0.08))] text-yellow-100 shadow-[0_0_24px_rgba(234,179,8,0.16)]",
      },
      {
        icon: "⚙️",
        title: t("header.featureCarousel.items.1.title"),
        status: isQuantEngineLive
          ? t("header.featureCarousel.items.1.liveStatus")
          : t("header.featureCarousel.items.1.status"),
        href: "https://app.ricomatrix.com",
        domainLabel: "app.ricomatrix.com",
        tone:
          "border-cyan-400/20 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.2),rgba(34,211,238,0.06))] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.14)]",
      },
      {
        icon: "🧠",
        title: t("header.featureCarousel.items.2.title"),
        status: t("header.featureCarousel.items.2.status"),
        href: "https://app.ricomatrix.com",
        domainLabel: "app.ricomatrix.com",
        tone:
          "border-amber-300/20 bg-[radial-gradient(circle_at_30%_30%,rgba(251,191,36,0.22),rgba(251,191,36,0.07))] text-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.14)]",
      },
      {
        icon: "⚡",
        title: t("header.featureCarousel.items.3.title"),
        status: t("header.featureCarousel.items.3.status"),
        href: "https://app.ricomatrix.com",
        domainLabel: "app.ricomatrix.com",
        tone:
          "border-sky-400/20 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.2),rgba(56,189,248,0.06))] text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.14)]",
      },
    ],
    [isQuantEngineLive, t],
  );

  const activeFeature = upcomingFeatures[featureCarouselIndex];

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

    const existsInV3 = userData?.exists || false;

    const migrationStatus =
      userData?.migrationStatus?.status ?? userData?.migrationData?.status ?? 0;
    const legacyClaimable = parseFloat(
      migrationAndRoyaltyUI?.legacyClaimable || "0",
    );
    const v2Claimable = parseFloat(migrationAndRoyaltyUI?.v2Claimable || "0");
    const hasLegacyAccount =
      migrationStatus === 1 || legacyClaimable > 0 || v2Claimable > 0;

    if (!existsInV3) {
      if (hasLegacyAccount) {
        return "legacy";
      } else {
        return "register";
      }
    }

    return "dashboard";
  };

  const dashboardState = getDashboardState();

  // Log for debugging

  const handleRegistrationComplete = () => {
    refetchUserData();
    refetchAllData();
    // Owned by the Dashboard component (not RegistrationSection) since
    // dashboardState flips to "dashboard" as soon as the refetches above
    // resolve, unmounting RegistrationSection — a modal living there would
    // never survive long enough to be seen.
    setShowRewardCelebration(true);
  };

  // Handle V2 royalty claim
  const handleClaimRoyaltyV2 = async () => {
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

  const handleLegacyDashboardContinue = async () => {
    if (isLegacyActionRunning) return;

    setLegacyActionChecked(false);
    setIsLegacyActionRunning(true);

    try {
      const legacyClaimable = parseFloat(legacyClaimableAmount || "0");
      const pendingLegacyRico = parseFloat(pendingRicoAmount || "0");

      if (legacyClaimable > 0) {
        const hash = await claimLegacyRoyalty();
        if (hash) {
          setCurrentTxHash(hash);
        }
      }

      if (canClaimRoyaltyV2) {
        const hash = await claimRoyaltyV2();
        if (hash) {
          setCurrentTxHash(hash);
        }
      }

      if (pendingLegacyRico > 0) {
        const hash = await claimLegacyPendingRico();
        if (hash) {
          setCurrentTxHash(hash);
        }
      }

      const migrationHash = await migrateSelf();
      if (migrationHash) {
        setCurrentTxHash(migrationHash);
      }

      await refetchAllData({ showToast: false });
      setLegacyActionChecked(true);
    } catch (error) {
      console.error("Legacy dashboard flow failed:", error);
      setCurrentTxHash(null);
    } finally {
      setIsLegacyActionRunning(false);
    }
  };

  const isProcessingRoyalty = loading || isConfirming || isLegacyActionRunning;

  // Check if user can claim V2 royalty
  const canClaimRoyaltyV2 =
    migrationAndRoyaltyUI?.v2Claimable &&
    parseFloat(migrationAndRoyaltyUI.v2Claimable) > 0;
  const v2ClaimableAmount = migrationAndRoyaltyUI?.v2Claimable || "0.00";
  const legacyClaimableAmount = migrationAndRoyaltyUI?.legacyClaimable || "0.00";
  const pendingRicoAmount =
    userData?.migrationData?.hasV1 ? ricoPending || "0.00" : "0.00";
  const totalLegacyBlockerAmount =
    parseFloat(legacyClaimableAmount || "0") +
    parseFloat(v2ClaimableAmount || "0") +
    parseFloat(pendingRicoAmount || "0");
  const hasOutstandingLegacyBlocker = totalLegacyBlockerAmount > 0;

  const royaltyAvailable = userData?.royaltyAvailable || "0.00";

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
      <RewardCelebrationModal
        open={showRewardCelebration}
        onClose={() => setShowRewardCelebration(false)}
      />
      {dataRefreshing && (
        <div className="fixed left-1/2 top-24 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-yellow-400/30 bg-slate-950/90 px-4 py-2 text-xs font-semibold text-yellow-100 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-300 border-t-transparent" />
          <span>Refreshing data</span>
        </div>
      )}
      <div className="theme-shell theme-page-shell">
        <div className="theme-container px-4">
          {/* Header - Show for all states except landing */}
          <div className="mx-auto mb-8 max-w-4xl text-center md:mb-10 lg:mb-12">
            <p className="theme-kicker justify-center mb-3">
              {dashboardState === "legacy"
                ? "DASHBOARD ACCESS"
                : dashboardState === "register"
                  ? "WELCOME TO RICO MATRIX"
                  : t("header.subtitle")}
            </p>
            <h1 className="theme-title mb-3 text-3xl md:text-4xl">
              {dashboardState === "legacy"
                ? "Complete Account Access"
                : dashboardState === "register"
                  ? "Join RICO Matrix"
                  : t("header.title")}
            </h1>
            <p className="theme-copy max-w-2xl mx-auto text-sm md:text-base">
              {dashboardState === "legacy"
                ? "We found an earlier Rico Matrix account for this wallet. Continue below to unlock the latest dashboard access for this account."
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
              parseFloat(formatUnitsSafe(globalRicoFarming[0])) > 0 && (
                <div className="mt-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/50 bg-yellow-500/10 px-4 py-2 text-xs md:text-sm font-medium text-yellow-100 hover:bg-yellow-500/20 transition-all">
                    <span className="text-base">🪙</span>
                    <span>{t("header.ricoAnnouncement")}</span>
                  </div>
                </div>
              )}

            {dashboardState === "dashboard" && (
              <div className="mx-auto mt-4 max-w-3xl">
                <div className="theme-card-compact flex flex-col gap-3 px-4 py-3 text-left sm:flex-row sm:items-center sm:justify-between">
                  <div
                    className="flex items-center gap-2 text-xs text-slate-300"
                    title={
                      isHubChain
                        ? "You are on the BSC hub. Account data and transactions are both handled on the hub chain."
                        : `You are on the ${activeChain.name} spoke. Account data is loaded from the BSC hub, and new purchases/registration run on this connected chain.`
                    }
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="font-semibold text-slate-100">{activeChain.name}</span>
                    <span className="text-slate-500">· {dataScopeLabel}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={activeFeature?.href}
                      target={activeFeature?.href?.startsWith("http") ? "_blank" : undefined}
                      rel={activeFeature?.href?.startsWith("http") ? "noreferrer" : undefined}
                      className="group flex min-w-0 items-center gap-2 text-xs"
                    >
                      <span className="shrink-0 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-100">
                        {activeFeature?.status}
                      </span>
                      <span
                        key={featureCarouselIndex}
                        className="dashboard-feature-carousel truncate font-medium text-slate-200 transition-colors group-hover:text-cyan-100"
                      >
                        {activeFeature?.title}
                      </span>
                      <span className="shrink-0 text-cyan-300 transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </a>

                    <div className="flex shrink-0 items-center gap-1">
                      {upcomingFeatures.map((feature, index) => (
                        <button
                          key={feature.title}
                          type="button"
                          aria-label={feature.title}
                          onClick={() => setFeatureCarouselIndex(index)}
                          className={`h-1.5 rounded-full transition-all ${
                            index === featureCarouselIndex
                              ? "w-4 bg-cyan-300"
                              : "w-1.5 bg-white/20 hover:bg-white/35"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {dashboardState === "legacy" && (
            <div className="mb-8 md:mb-10 lg:mb-12">
              <div className="theme-panel mx-auto max-w-2xl p-5 text-center sm:p-6">
                <p className="theme-kicker justify-center">Dashboard access</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-50">
                  Continue to Dashboard
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">
                  We will verify this wallet, clear any eligible legacy step automatically, and then refresh the latest dashboard state.
                </p>
                {hasOutstandingLegacyBlocker ? (
                  <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                    This account still has an unresolved legacy requirement, so dashboard access is temporarily unavailable. Clear any remaining legacy claim or contact support before continuing.
                  </div>
                ) : null}
                {legacyActionChecked ? (
                  <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                    Account refreshed. You can continue to your dashboard.
                  </div>
                ) : null}
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLegacyDashboardContinue}
                    disabled={isProcessingRoyalty}
                    className="theme-button-primary justify-center px-5 py-3 text-sm"
                  >
                    {isProcessingRoyalty
                      ? "Processing legacy account..."
                      : hasOutstandingLegacyBlocker
                        ? "Claim pending balances & continue"
                        : canClaimRoyaltyV2
                          ? "Process Royalty & Go to Dashboard"
                          : "Go to Dashboard"}
                  </button>
                </div>
              </div>
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

          {/* Show Full Dashboard if user exists */}
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
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6 order-2 lg:order-1 h-full"
                >
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
                </motion.div>

                {/* Right Column - Stats & Content */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.08 }}
                  className="space-y-6 lg:space-y-8 order-1 lg:order-2 h-full"
                >
                  {/* Stats Overview + Royalty Buttons */}
                  <div className="theme-panel p-5 md:p-6">
                    <Stats
                      userData={userData}
                      globalStats={globalStats}
                      globalRicoFarming={globalRicoFarming}
                    />

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
                    {canClaimRoyaltyV2 && (
                      <div className="mt-3 pt-3 border-t border-slate-800">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">
                            Total Available:
                          </span>
                          <span className="font-bold text-amber-300">
                            {parseFloat(v2ClaimableAmount).toFixed(2)}{" "}
                            USDT
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RICO Farming Section */}

                  <div className="theme-panel p-5 md:p-6">
                    <ProfileStats userData={userData} />
                  </div>
                  <ReferralSection />
                </motion.div>
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
