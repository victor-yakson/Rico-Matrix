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
    approveUsdt,
    joinLibrary,
    buyChapter,
    claimRoyalty,
    claimRoyaltyV2,
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
      if (canClaimRoyaltyV2) {
        const hash = await claimRoyaltyV2();
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
  const pendingRicoAmount = userData?.migrationData?.hasV1
    ? userData?.ricoPending || "0.00"
    : "0.00";
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
      <div className="theme-shell theme-page-shell">
        <div className="theme-container px-4">
          {/* Header - Show for all states except landing */}
          <div className="mx-auto mb-8 max-w-4xl text-center md:mb-10 lg:mb-12">
            <p className="theme-kicker justify-center mb-3">
              {dashboardState === "legacy"
                ? "LEGACY ACCOUNT"
                : dashboardState === "register"
                  ? "WELCOME TO RICO MATRIX"
                  : t("header.subtitle")}
            </p>
            <h1 className="theme-title mb-3 text-3xl md:text-4xl">
              {dashboardState === "legacy"
                ? "Complete Your Dashboard Access"
                : dashboardState === "register"
                  ? "Join RICO Matrix"
                  : t("header.title")}
            </h1>
            <p className="theme-copy max-w-2xl mx-auto text-sm md:text-base">
              {dashboardState === "legacy"
                ? "We found a legacy Rico Matrix account for this wallet. Clear any remaining V2 balance requirements, then continue into your refreshed dashboard."
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
                <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-4 text-left shadow-[0_0_22px_rgba(34,211,238,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    Connected Network
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-50">
                    {activeChain.name}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {isHubChain
                      ? "You are on the BSC hub. Account data and transactions are both handled on the hub chain."
                      : `You are on the ${activeChain.name} spoke. Account data is loaded from the BSC hub, and new purchases/registration run on this connected chain.`}
                  </p>
                  <p className="mt-2 text-xs text-cyan-100/80">
                    Data scope: {dataScopeLabel}
                  </p>
                </div>
                <div className="theme-panel relative overflow-hidden border border-yellow-400/20 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.12),transparent_32%),linear-gradient(180deg,rgba(24,24,32,0.96),rgba(10,10,18,0.98))] px-4 py-4 shadow-[0_0_34px_rgba(234,179,8,0.12)] sm:px-5">
                  <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-yellow-300/70 to-transparent" />
                  <div className="pointer-events-none absolute -right-12 top-6 h-24 w-24 rounded-full bg-yellow-300/10 blur-3xl" />
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <a
                      href={activeFeature?.href}
                      target={activeFeature?.href?.startsWith("http") ? "_blank" : undefined}
                      rel={activeFeature?.href?.startsWith("http") ? "noreferrer" : undefined}
                      className="group min-w-0 flex-1 rounded-[1.6rem] text-center transition-transform duration-300 hover:-translate-y-0.5 hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b12] sm:-mx-2 sm:px-2 sm:py-1 sm:text-left"
                    >
                      <p className="theme-kicker mb-2 justify-center text-[10px] sm:justify-start">
                        {t("header.featureCarousel.kicker")}
                      </p>
                      <div
                        key={featureCarouselIndex}
                        className="dashboard-feature-carousel min-h-[116px] sm:min-h-[92px]"
                      >
                        <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/90 shadow-[0_0_18px_rgba(34,211,238,0.12)]">
                          <span>
                            {activeFeature?.status}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-center gap-3 sm:justify-start">
                          <div
                            className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-3xl transition-transform duration-300 group-hover:scale-105 ${activeFeature?.tone}`}
                          >
                            <span aria-hidden="true">
                              {activeFeature?.icon}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                              <h2 className="text-xl font-semibold text-slate-50 transition-colors duration-300 group-hover:text-cyan-100 sm:text-2xl">
                                {activeFeature?.title}
                              </h2>
                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                                {activeFeature?.domainLabel}
                              </span>
                            </div>
                            <div className="mt-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-200/90">
                              <span>{t("header.featureCarousel.learnMore")}</span>
                              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </a>

                    <div className="flex flex-col items-center gap-3 sm:items-end">
                      <a
                        href={activeFeature?.href}
                        target={activeFeature?.href?.startsWith("http") ? "_blank" : undefined}
                        rel={activeFeature?.href?.startsWith("http") ? "noreferrer" : undefined}
                        className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-cyan-300/35 bg-[linear-gradient(135deg,rgba(14,165,233,0.22),rgba(6,182,212,0.34),rgba(30,41,59,0.92))] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-200/70 hover:shadow-[0_0_32px_rgba(34,211,238,0.28)] md:text-sm"
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

          {dashboardState === "legacy" && (
            <div className="mb-8 md:mb-10 lg:mb-12">
              <div className="theme-panel mx-auto max-w-2xl p-5 text-center sm:p-6">
                <p className="theme-kicker justify-center">Dashboard access</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-50">
                  Continue to Dashboard
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">
                  The V3 migrator only succeeds after every V2 balance blocker is cleared. This includes legacy royalty, V2 royalty, and pending RICO.
                </p>
                <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-yellow-100/80">
                    Outstanding V2 balances blocking migration
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-yellow-100">
                    {totalLegacyBlockerAmount.toFixed(2)}
                  </p>
                  <div className="mt-3 grid gap-2 text-left text-sm text-yellow-50/90 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                      <p className="text-[0.65rem] uppercase tracking-[0.14em] text-yellow-100/65">
                        Legacy royalty
                      </p>
                      <p className="mt-1 font-semibold">{parseFloat(legacyClaimableAmount).toFixed(2)} USDT</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                      <p className="text-[0.65rem] uppercase tracking-[0.14em] text-yellow-100/65">
                        V2 royalty
                      </p>
                      <p className="mt-1 font-semibold">{parseFloat(v2ClaimableAmount).toFixed(2)} USDT</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                      <p className="text-[0.65rem] uppercase tracking-[0.14em] text-yellow-100/65">
                        Pending RICO
                      </p>
                      <p className="mt-1 font-semibold">{parseFloat(pendingRicoAmount).toFixed(2)} RICO</p>
                    </div>
                  </div>
                </div>
                {hasOutstandingLegacyBlocker ? (
                  <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                    Migration is still blocked. Claim every non-zero balance above first, then continue to the dashboard.
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
                    disabled={isProcessingRoyalty || hasOutstandingLegacyBlocker}
                    className="theme-button-primary justify-center px-5 py-3 text-sm"
                  >
                    {isProcessingRoyalty
                      ? canClaimRoyaltyV2
                        ? "Claiming and checking dashboard..."
                        : "Checking dashboard..."
                      : hasOutstandingLegacyBlocker
                        ? "Claim remaining V2 balances first"
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
