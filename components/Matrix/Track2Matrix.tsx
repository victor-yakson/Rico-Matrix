"use client";

import { useQuantuMatrix } from "@/hooks/useQuantuMatrix";
import { useAccount } from "wagmi";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface Track2Data {
  currentReferrer: string;
  firstLineReferrals: string[];
  secondLineReferrals: string[];
  blocked: boolean;
  reinvestCount: number;
  closedPart: string;
}

export const Track2Matrix = () => {
  const { address, isConnected } = useAccount();
  const {
    fetchAllTrack2Chapters,
    fetchTrack2Matrix,
    userData,
    loading: hookLoading,
  } = useQuantuMatrix();

  const [track2Data, setTrack2Data] = useState<Record<number, Track2Data>>({});
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const t = useTranslations("Matrix.Track2");

  // Use refs to track previous values and avoid unnecessary re-renders
  const prevAddressRef = useRef<string | undefined>(undefined);
  const prevUnlockedChaptersRef = useRef<number>(0);

  // ... later in the code ...
  const isSameAddress = prevAddressRef.current === address;
  
  // Get unlocked chapters safely
  const unlockedChapters = useMemo(() => {
    if (!userData?.exists) return 0;

    const value = (userData as any).track2Unlocked;
    if (typeof value === "number") return Math.max(0, value);
    if (typeof value === "string") {
      const parsed = parseInt(value);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }
    return 0;
  }, [userData]);

  // Clamp selected chapter
  useEffect(() => {
    if (unlockedChapters === 0) {
      setSelectedChapter(1);
    } else if (selectedChapter > unlockedChapters) {
      setSelectedChapter(unlockedChapters);
    }
  }, [unlockedChapters, selectedChapter]);

  // Stable fetch function using useCallback with minimal dependencies
  const fetchAllTrack2Data = useCallback(
    async (forceRefresh = false) => {
      if (!address || unlockedChapters <= 0) {
        setLoading(false);
        return;
      }

      // Check if we already have data and don't need to refresh
      const hasExistingData = Object.keys(track2Data).length > 0;
      if (hasExistingData && !forceRefresh) {
        // Check if the data is still relevant (same address and chapters)
        const isSameAddress = prevAddressRef.current === address;
        const isSameChapters =
          prevUnlockedChaptersRef.current === unlockedChapters;

        if (isSameAddress && isSameChapters) {
          setLoading(false);
          return;
        }
      }

      try {
        setLoading(true);
        setError(null);

        // Update refs
        prevAddressRef.current = address;
        prevUnlockedChaptersRef.current = unlockedChapters;

        // Use bulk fetch for all chapters
        const data = await fetchAllTrack2Chapters(address, unlockedChapters);

        // Check if we got any valid data
        const hasValidData = Object.values(data).some(
          (chapterData) =>
            chapterData.currentReferrer ||
            chapterData.firstLineReferrals.length > 0 ||
            chapterData.secondLineReferrals.length > 0
        );

        if (hasValidData) {
          setTrack2Data(data);
          setRetryCount(0); // Reset retry count on success
        } else if (retryCount < 3) {
          // Retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
          setTimeout(() => {
            fetchAllTrack2Data(true);
          }, delay);
          setRetryCount((prev) => prev + 1);
        } else {
          setError(t("error.afterRetries"));
        }
      } catch (err) {
        console.error("Error fetching track 2 matrix data:", err);

        if (retryCount < 3) {
          // Retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
          setTimeout(() => {
            fetchAllTrack2Data(true);
          }, delay);
          setRetryCount((prev) => prev + 1);
        } else {
          setError(t("error.failed"));
        }
      } finally {
        setLoading(false);
      }
    },
    [address, unlockedChapters, fetchAllTrack2Chapters, retryCount, track2Data, t]
  );

  // Single chapter retry - stable function
  const retrySingleChapter = useCallback(
    async (chapter: number) => {
      if (!address) return;

      try {
        setError(null);
        const chapterData = await fetchTrack2Matrix(address, chapter);
        setTrack2Data((prev) => ({
          ...prev,
          [chapter]: chapterData,
        }));
      } catch (err) {
        console.error(`Error retrying chapter ${chapter}:`, err);
        setError(t("error.failed", { chapter }));
      }
    },
    [address, fetchTrack2Matrix, t]
  );

  // Initial fetch and refetch when dependencies change
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      if (!address || unlockedChapters <= 0) {
        if (mounted) setLoading(false);
        return;
      }

      await fetchAllTrack2Data();
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [address, unlockedChapters, fetchAllTrack2Data]);

  // Auto-refresh every 30 seconds if unlockedChapters > 0
  useEffect(() => {
    if (unlockedChapters === 0 || !address || loading) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAllTrack2Data(true); // Force refresh
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [unlockedChapters, address, loading, fetchAllTrack2Data]);

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    fetchAllTrack2Data(true);
  }, [fetchAllTrack2Data]);

  // Get stats safely
  const totalEarned = useMemo(() => {
    if (!userData?.exists) return 0;
    const value = (userData as any).track2TotalEarned;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }, [userData]);

  const totalCycles = useMemo(() => {
    if (!userData?.exists) return 0;
    const value = (userData as any).track2TotalCycles;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseInt(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }, [userData]);

  // Calculate totals for selected chapter
  const currentData = track2Data[selectedChapter];
  const totalReferrals = currentData
    ? currentData.firstLineReferrals.length +
      currentData.secondLineReferrals.length
    : 0;

  // Show connection required
  if (!isConnected) {
    return (
      <div className="py-10">
        <div className="mx-auto max-w-md rounded-2xl border border-blue-500/30 bg-slate-950/80 p-8 text-center shadow-[0_0_26px_rgba(0,0,0,0.75)]">
          <div className="text-5xl mb-4">🔗</div>
          <h3 className="mb-3 text-xl font-semibold text-slate-50">
            {t("connectWallet.title")}
          </h3>
          <p className="text-sm text-slate-400 mb-6">
            {t("connectWallet.description")}
          </p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading || hookLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
        <p className="text-slate-400">
          {retryCount > 0
            ? t("loading.retrying", { retryCount })
            : t("loading.loading")}
        </p>
        {retryCount > 0 && (
          <p className="text-xs text-slate-500">{t("loading.takingLonger")}</p>
        )}
      </div>
    );
  }

  // Show simplified view if contract functions aren't available
  if (error && Object.keys(track2Data).length === 0) {
    return (
      <div className="py-10">
        <div className="mx-auto max-w-md rounded-2xl border border-amber-400/40 bg-amber-500/5 p-6 shadow-[0_0_26px_rgba(0,0,0,0.75)]">
          <h3 className="mb-2 text-lg font-semibold text-amber-200">
            {t("error.title")}
          </h3>
          <p className="mb-4 text-sm text-amber-100/90">
            {t("error.description")}
          </p>
          <div className="rounded-xl border border-blue-500/40 bg-slate-950/80 p-4 text-left">
            <h4 className="mb-2 text-sm font-semibold text-blue-300">
              {t("error.statsTitle")}
            </h4>
            <div className="space-y-2 text-sm text-slate-200">
              <div className="flex justify-between">
                <span>{t("stats.totalEarnings")}</span>
                <span className="font-semibold text-blue-300">
                  ${totalEarned.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t("stats.chaptersUnlocked")}</span>
                <span className="font-semibold">{unlockedChapters}/12</span>
              </div>
              <div className="flex justify-between">
                <span>{t("stats.totalCycles")}</span>
                <span className="font-semibold">{totalCycles}</span>
              </div>
            </div>
          </div>
          <div className="mt-6 text-center">
            <button
              onClick={handleManualRefresh}
              className="mr-3 inline-block rounded-xl bg-amber-500/10 px-6 py-2 text-sm font-semibold text-amber-300 border border-amber-400/60 hover:bg-amber-500/20 transition-all"
            >
              {t("error.retry")}
            </button>
            <Link
              href="/dashboard"
              className="inline-block rounded-xl bg-blue-500/10 px-6 py-2 text-sm font-semibold text-blue-300 border border-blue-400/60 hover:bg-blue-500/20 transition-all"
            >
              {t("error.return")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!userData?.exists) {
    return (
      <div className="py-10">
        <div className="mx-auto max-w-md rounded-2xl border border-blue-500/30 bg-slate-950/80 p-8 text-center shadow-[0_0_26px_rgba(0,0,0,0.75)]">
          <div className="text-5xl mb-4">🌐</div>
          <h3 className="mb-3 text-xl font-semibold text-slate-50">
            {t("notRegistered.title")}
          </h3>
          <p className="text-sm text-slate-400 mb-6">
            {t("notRegistered.description")}
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-xl bg-gradient-to-r from-blue-400 to-cyan-500 px-6 py-3 text-sm font-semibold text-black shadow-[0_0_16px_rgba(59,130,246,0.7)] hover:brightness-110 transition-all"
          >
            {t("notRegistered.register")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
          {t("title")}
        </h1>
        <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
          {t("description")}
        </p>
        <div className="mt-4 flex justify-center items-center gap-4">
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {t("refresh")}
          </button>
          <span className="text-xs text-slate-500">
            {t("autoRefresh")}
          </span>
        </div>
      </div>

      {/* Chapter Selector */}
      <div className="rounded-2xl border border-blue-500/20 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-slate-50 mb-4">
          {t("chapterSelector.title")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {unlockedChapters > 0 ? (
            Array.from({ length: unlockedChapters }, (_, i) => i + 1).map(
              (chapter) => (
                <div key={chapter} className="relative">
                  <button
                    onClick={() => setSelectedChapter(chapter)}
                    className={`rounded-xl px-5 py-3 text-base font-medium transition-all ${
                      selectedChapter === chapter
                        ? "bg-gradient-to-r from-blue-400 via-cyan-500 to-blue-300 text-black shadow-[0_0_16px_rgba(59,130,246,0.7)]"
                        : "border border-blue-500/20 bg-slate-950/70 text-slate-300 hover:border-blue-400/60 hover:text-blue-300"
                    }`}
                  >
                    {t("chapter", { chapter })}
                  </button>
                  {track2Data[chapter] && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500/90 flex items-center justify-center">
                      <span className="text-xs">✓</span>
                    </div>
                  )}
                </div>
              )
            )
          ) : (
            <div className="w-full text-center py-4">
              <p className="text-slate-500">{t("chapterSelector.noChapters")}</p>
              <Link
                href="/chapters"
                className="inline-block mt-2 rounded-xl bg-blue-500/10 px-6 py-2 text-sm font-semibold text-blue-300 border border-blue-400/60 hover:bg-blue-500/20 transition-all"
              >
                {t("chapterSelector.buyFirst")}
              </Link>
            </div>
          )}
        </div>
        {unlockedChapters > 0 && (
          <div className="mt-4 text-xs text-slate-500">
            {t("chapterSelector.loaded", { 
              loaded: Object.keys(track2Data).length, 
              total: unlockedChapters 
            })}
          </div>
        )}
      </div>

      {currentData ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Matrix Visualization */}
          <div className="rounded-2xl border border-blue-500/20 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-50">
                {t("matrixVisualization.title", { chapter: selectedChapter })}
              </h3>
              <button
                onClick={() => retrySingleChapter(selectedChapter)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {t("matrixVisualization.refresh")}
              </button>
            </div>

            {/* Current Referrer */}
            <div className="mb-8">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t("matrixVisualization.yourReferrer.title")}
              </h4>
              <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 p-4">
                <p className="truncate font-mono text-sm text-slate-200">
                  {currentData.currentReferrer || t("matrixVisualization.yourReferrer.none")}
                </p>
                {currentData.currentReferrer && (
                  <p className="mt-1 text-xs text-slate-500">
                    {t("matrixVisualization.yourReferrer.description")}
                  </p>
                )}
              </div>
            </div>

            {/* First Line Referrals (Direct) */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {t("matrixVisualization.firstLine.title")}
                </h4>
                <span className="text-sm font-semibold text-blue-300">
                  {currentData.firstLineReferrals.length}/2
                </span>
              </div>
              <div className="space-y-3">
                {currentData.firstLineReferrals.length > 0 ? (
                  currentData.firstLineReferrals.map((referral, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-blue-700/50 bg-slate-900/80 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="truncate font-mono text-sm text-blue-200">
                            {referral}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-blue-500">
                            {t("matrixVisualization.firstLine.position", { index: index + 1 })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/40">
                            {t("matrixVisualization.firstLine.tag")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-slate-900/60 p-4 text-center">
                    <p className="text-sm text-slate-400">
                      {t("matrixVisualization.firstLine.empty")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Second Line Referrals (Spillover) */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {t("matrixVisualization.secondLine.title")}
                </h4>
                <span className="text-sm font-semibold text-cyan-300">
                  {currentData.secondLineReferrals.length}/4
                </span>
              </div>
              <div className="space-y-3">
                {currentData.secondLineReferrals.length > 0 ? (
                  currentData.secondLineReferrals.map((referral, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-cyan-700/50 bg-slate-900/80 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="truncate font-mono text-sm text-cyan-200">
                            {referral}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-cyan-500">
                            {t("matrixVisualization.secondLine.position", { index: index + 1 })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/40">
                            {t("matrixVisualization.secondLine.tag")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-slate-900/60 p-4 text-center">
                    <p className="text-sm text-slate-400">
                      {t("matrixVisualization.secondLine.empty")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="rounded-xl bg-slate-900/80 p-6 border border-slate-700/80">
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t("matrixVisualization.chapterStatus.title")}
              </h4>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-slate-500 mb-1">
                    {t("matrixVisualization.chapterStatus.status")}
                  </p>
                  <div
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                      currentData.blocked
                        ? "bg-red-500/10 text-red-300 border border-red-500/40"
                        : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {currentData.blocked 
                      ? t("matrixVisualization.chapterStatus.blocked")
                      : t("matrixVisualization.chapterStatus.active")
                    }
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">
                    {t("matrixVisualization.chapterStatus.reinvestCycles")}
                  </p>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-blue-300">
                      {currentData.reinvestCount}
                    </span>
                    <span className="ml-2 text-sm text-slate-400">
                      {t("matrixVisualization.chapterStatus.cycles")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Closed Part */}
              {currentData.closedPart && (
                <div className="pt-4 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-2">
                    {t("matrixVisualization.chapterStatus.closedPart")}
                  </p>
                  <div className="rounded-lg border border-purple-500/30 bg-slate-900/60 p-3">
                    <p className="truncate font-mono text-sm text-purple-300">
                      {currentData.closedPart}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {t("matrixVisualization.chapterStatus.closedDescription")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Matrix Info */}
          <div className="space-y-8">
            <div className="rounded-2xl border border-blue-500/20 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
              <h3 className="mb-4 text-xl font-bold text-blue-300">
                {t("matrixInfo.rules.title")}
              </h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>
                    <strong>{t("matrixInfo.rules.positions")}</strong>
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>
                    <strong>{t("matrixInfo.rules.firstLine")}</strong>
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>
                    <strong>{t("matrixInfo.rules.secondLine")}</strong>
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>
                    <strong>{t("matrixInfo.rules.autoReinvest")}</strong>
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>
                    <strong>{t("matrixInfo.rules.closedPart")}</strong>
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>{t("matrixInfo.rules.earnings")}</span>
                </li>
              </ul>

              <div className="mt-6 rounded-xl bg-blue-900/20 p-5 border border-blue-700/30">
                <h4 className="mb-3 text-sm font-semibold text-blue-300">
                  {t("matrixInfo.stats.title")}
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t("matrixInfo.stats.totalReferrals")}</span>
                    <span className="font-semibold text-blue-300">
                      {totalReferrals}/6
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t("matrixInfo.stats.firstLine")}</span>
                    <span className="font-semibold text-blue-300">
                      {currentData.firstLineReferrals.length}/2
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t("matrixInfo.stats.secondLine")}</span>
                    <span className="font-semibold text-cyan-300">
                      {currentData.secondLineReferrals.length}/4
                    </span>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{t("matrixInfo.stats.matrixProgress")}</span>
                      <span>{t("matrixInfo.stats.progress", { 
                        percent: Math.round((totalReferrals / 6) * 100) 
                      })}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                        style={{ width: `${(totalReferrals / 6) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
              <h3 className="mb-4 text-xl font-bold text-emerald-300">
                {t("matrixInfo.earnings.title", { chapter: selectedChapter })}
              </h3>
              <div className="space-y-4">
                <div className="bg-slate-900/60 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300">{t("matrixInfo.earnings.totalEarnings")}</span>
                    <span className="text-xl font-bold text-emerald-300">
                      ${totalEarned.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {t("matrixInfo.earnings.totalDescription")}
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300">{t("matrixInfo.earnings.currentCycles")}</span>
                    <span className="text-xl font-bold text-blue-300">
                      {currentData.reinvestCount}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {t("matrixInfo.earnings.currentDescription", { chapter: selectedChapter })}
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300">{t("matrixInfo.earnings.totalCycles")}</span>
                    <span className="text-xl font-bold text-cyan-300">
                      {totalCycles}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {t("matrixInfo.earnings.totalCyclesDescription")}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-400">
                    {t("matrixInfo.status.title")}
                  </h4>
                  <span
                    className={`text-sm font-semibold ${
                      currentData.blocked
                        ? "text-red-300"
                        : totalReferrals >= 6
                        ? "text-amber-300"
                        : "text-emerald-300"
                    }`}
                  >
                    {currentData.blocked
                      ? t("matrixInfo.status.blocked")
                      : totalReferrals >= 6
                      ? t("matrixInfo.status.ready")
                      : t("matrixInfo.status.building")
                    }
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {currentData.blocked
                    ? t("matrixInfo.status.blockedDesc")
                    : totalReferrals >= 6
                    ? t("matrixInfo.status.readyDesc")
                    : t("matrixInfo.status.buildingDesc")
                  }
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
              <h3 className="mb-4 text-xl font-bold text-purple-300">
                {t("matrixInfo.quickActions.title")}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Link
                  href="/chapters"
                  className="rounded-xl bg-purple-500/10 p-4 text-center border border-purple-500/40 hover:bg-purple-500/20 transition-all"
                >
                  <div className="text-2xl mb-2">📚</div>
                  <p className="text-sm font-semibold text-purple-300">
                    {t("matrixInfo.quickActions.buyChapters")}
                  </p>
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-emerald-500/10 p-4 text-center border border-emerald-500/40 hover:bg-emerald-500/20 transition-all"
                >
                  <div className="text-2xl mb-2">💰</div>
                  <p className="text-sm font-semibold text-emerald-300">
                    {t("matrixInfo.quickActions.viewEarnings")}
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : unlockedChapters > 0 ? (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/5 p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="mb-2 text-lg font-semibold text-amber-200">
            {t("dataNotAvailable.title", { chapter: selectedChapter })}
          </h3>
          <p className="text-sm text-amber-100/90">
            {t("dataNotAvailable.description")}
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => retrySingleChapter(selectedChapter)}
              className="rounded-xl bg-amber-500/10 px-6 py-2 text-sm font-semibold text-amber-300 border border-amber-400/60 hover:bg-amber-500/20 transition-all"
            >
              {t("error.retrySingle")}
            </button>
            <button
              onClick={handleManualRefresh}
              className="rounded-xl bg-blue-500/10 px-6 py-2 text-sm font-semibold text-blue-300 border border-blue-400/60 hover:bg-blue-500/20 transition-all"
            >
              {t("error.reloadAll")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};