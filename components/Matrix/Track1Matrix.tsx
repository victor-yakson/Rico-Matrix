"use client";

import { useQuantuMatrix } from "@/hooks/useQuantuMatrix";
import { useAccount } from "wagmi";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface Track1Data {
  currentReferrer: string;
  referrals: string[];
  blocked: boolean;
  reinvestCount: number;
}

export const Track1Matrix = () => {
  const t = useTranslations("Matrix.track1");
  const { address, isConnected } = useAccount();
  const {
    fetchAllTrack1Chapters,
    fetchTrack1Matrix,
    userData,
    loading: hookLoading,
  } = useQuantuMatrix();

  const [track1Data, setTrack1Data] = useState<Record<number, Track1Data>>({});
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Helper function to render HTML
  const renderHTML = (html: string) => {
    return { __html: html };
  };

  // Get unlocked chapters safely
  const unlockedChapters = useMemo(() => {
    if (!userData?.exists) return 0;

    const value = (userData as any).track1Unlocked;
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

  // Main fetch function
  const fetchAllTrack1Data = useCallback(async () => {
    if (!address || unlockedChapters <= 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Always fetch fresh data
      const data = await fetchAllTrack1Chapters(address, unlockedChapters);

      // Always update state even if data appears empty
      if (data && typeof data === "object") {
        setTrack1Data(data);
        setRetryCount(0); // Reset retry count on success
      } else {
        // If no data returned, set empty object
        setTrack1Data({});
      }
    } catch (err) {
      console.error("Error fetching track 1 matrix data:", err);

      if (retryCount < 3) {
        // Retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        setRetryCount((prev) => prev + 1);
        await fetchAllTrack1Data(); // Retry
      } else {
        setError(t("error.description"));
      }
    } finally {
      setLoading(false);
    }
  }, [address, unlockedChapters, fetchAllTrack1Chapters, retryCount, t]);

  // Single chapter retry
  const retrySingleChapter = useCallback(
    async (chapter: number) => {
      if (!address) return;

      try {
        setError(null);
        const chapterData = await fetchTrack1Matrix(address, chapter);
        setTrack1Data((prev) => ({
          ...prev,
          [chapter]: chapterData,
        }));
      } catch (err) {
        console.error(`Error retrying chapter ${chapter}:`, err);
        setError(t("error.description"));
      }
    },
    [address, fetchTrack1Matrix, t]
  );

  // Initial fetch and refetch when dependencies change
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      if (!address || unlockedChapters <= 0) {
        if (mounted) setLoading(false);
        return;
      }

      await fetchAllTrack1Data();
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [address, unlockedChapters, fetchAllTrack1Data]);

  // Auto-refresh every 30 seconds if unlockedChapters > 0
  useEffect(() => {
    if (unlockedChapters === 0 || !address || loading) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAllTrack1Data(); // Refresh
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [unlockedChapters, address, loading, fetchAllTrack1Data]);

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    fetchAllTrack1Data();
  }, [fetchAllTrack1Data]);

  // Get stats safely
  const totalEarned = useMemo(() => {
    if (!userData?.exists) return 0;
    const value = (userData as any).track1TotalEarned;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }, [userData]);

  const totalCycles = useMemo(() => {
    if (!userData?.exists) return 0;
    const value = (userData as any).track1TotalCycles;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseInt(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }, [userData]);

  // Calculate totals for selected chapter
  const currentData = track1Data[selectedChapter];
  const totalReferrals = currentData ? currentData.referrals.length : 0;

  // Show connection required
  if (!isConnected) {
    return (
      <div className="py-10">
        <div className="mx-auto max-w-md rounded-2xl border border-blue-500/30 bg-slate-950/80 p-8 text-center shadow-[0_0_26px_rgba(0,0,0,0.75)]">
          <div className="text-5xl mb-4">🔗</div>
          <h3 className="mb-3 text-xl font-semibold text-slate-50">
            {t("connect.title")}
          </h3>
          <p className="text-sm text-slate-400 mb-6">
            {t("connect.description")}
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
            ? t("loading.retry", { count: retryCount })
            : t("loading.default")}
        </p>
        {retryCount > 0 && (
          <p className="text-xs text-slate-500">{t("loading.slow")}</p>
        )}
      </div>
    );
  }

  // Show error view
  if (error && Object.keys(track1Data).length === 0) {
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
              {t("error.stats")}
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
              {t("error.refresh")}
            </button>
            <Link
              href="/dashboard"
              className="inline-block rounded-xl bg-blue-500/10 px-6 py-2 text-sm font-semibold text-blue-300 border border-blue-400/60 hover:bg-blue-500/20 transition-all"
            >
              {t("error.dashboard")}
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
            {t("notRegistered.button")}
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
            {t("header.refresh")}
          </button>
          <span className="text-xs text-slate-500">
            {t("header.autoRefresh")}
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
                  {track1Data[chapter] && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500/90 flex items-center justify-center">
                      <span className="text-xs">✓</span>
                    </div>
                  )}
                </div>
              )
            )
          ) : (
            <div className="w-full text-center py-4">
              <p className="text-slate-500">
                {t("chapterSelector.noChapters")}
              </p>
              <Link
                href="/chapters"
                className="inline-block mt-2 rounded-xl bg-blue-500/10 px-6 py-2 text-sm font-semibold text-blue-300 border border-blue-400/60 hover:bg-blue-500/20 transition-all"
              >
                {t("chapterSelector.buyChapter")}
              </Link>
            </div>
          )}
        </div>
        {unlockedChapters > 0 && (
          <div className="mt-4 text-xs text-slate-500">
            {t("chapterSelector.loaded", {
              loaded: Object.keys(track1Data).length,
              unlocked: unlockedChapters,
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
                {t("matrixVisualization.referrer.title")}
              </h4>
              <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 p-4">
                <p className="truncate font-mono text-sm text-slate-200">
                  {currentData.currentReferrer ||
                    t("matrixVisualization.referrer.none")}
                </p>
                {currentData.currentReferrer && (
                  <p className="mt-1 text-xs text-slate-500">
                    {t("matrixVisualization.referrer.description")}
                  </p>
                )}
              </div>
            </div>

            {/* Direct Referrals */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {t("matrixVisualization.directReferrals.title")}
                </h4>
                <span className="text-sm font-semibold text-blue-300">
                  {currentData.referrals.length}/3
                </span>
              </div>
              <div className="space-y-3">
                {currentData.referrals.length > 0 ? (
                  currentData.referrals.map((referral, index) => (
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
                            {t("matrixVisualization.directReferrals.position", {
                              number: index + 1,
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/40">
                            {t("matrixVisualization.directReferrals.badge")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-slate-900/60 p-4 text-center">
                    <p className="text-sm text-slate-400">
                      {t("matrixVisualization.directReferrals.empty")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="rounded-xl bg-slate-900/80 p-6 border border-slate-700/80">
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t("matrixVisualization.status.title")}
              </h4>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-slate-500 mb-1">
                    {t("matrixVisualization.status.statusLabel")}
                  </p>
                  <div
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                      currentData.blocked
                        ? "bg-red-500/10 text-red-300 border border-red-500/40"
                        : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {currentData.blocked
                      ? t("matrixVisualization.status.blocked")
                      : t("matrixVisualization.status.active")}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">
                    {t("matrixVisualization.status.reinvestCycles")}
                  </p>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-blue-300">
                      {currentData.reinvestCount}
                    </span>
                    <span className="ml-2 text-sm text-slate-400">
                      {t("matrixVisualization.status.cycles")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Matrix Progress */}
              <div className="pt-4 border-t border-slate-700/50">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>{t("matrixVisualization.status.progress.label")}</span>
                  <span>
                    {t("matrixVisualization.status.progress.percentage", {
                      percentage: Math.round((totalReferrals / 3) * 100),
                    })}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                    style={{ width: `${(totalReferrals / 3) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Matrix Info */}
          <div className="space-y-8">
            <div className="rounded-2xl border border-blue-500/20 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
              <h3 className="mb-4 text-xl font-bold text-blue-300">
                {t("matrixRules.title")}
              </h3>
              <ul className="space-y-3 text-sm text-slate-300">
                {t
                  .raw("matrixRules.items")
                  .map((item: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span dangerouslySetInnerHTML={renderHTML(item)} />
                    </li>
                  ))}
              </ul>

              <div className="mt-6 rounded-xl bg-blue-900/20 p-5 border border-blue-700/30">
                <h4 className="mb-3 text-sm font-semibold text-blue-300">
                  {t("matrixRules.currentStats.title")}
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      {t("matrixRules.currentStats.totalReferrals")}
                    </span>
                    <span className="font-semibold text-blue-300">
                      {totalReferrals}/3
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      {t("matrixRules.currentStats.matrixCompletion")}
                    </span>
                    <span className="font-semibold text-blue-300">
                      {Math.round((totalReferrals / 3) * 100)}%
                    </span>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{t("matrixRules.currentStats.progress")}</span>
                      <span>
                        {t("matrixRules.currentStats.positions", {
                          current: totalReferrals,
                        })}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                        style={{ width: `${(totalReferrals / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
              <h3 className="mb-4 text-xl font-bold text-emerald-300">
                {t("earningsSnapshot.title", { chapter: selectedChapter })}
              </h3>
              <div className="space-y-4">
                <div className="bg-slate-900/60 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300">
                      {t("earningsSnapshot.totalEarnings.label")}
                    </span>
                    <span className="text-xl font-bold text-emerald-300">
                      ${totalEarned.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {t("earningsSnapshot.totalEarnings.description")}
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300">
                      {t("earningsSnapshot.currentChapterCycles.label")}
                    </span>
                    <span className="text-xl font-bold text-blue-300">
                      {currentData.reinvestCount}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {t("earningsSnapshot.currentChapterCycles.description", {
                      chapter: selectedChapter,
                    })}
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300">
                      {t("earningsSnapshot.totalCycles.label")}
                    </span>
                    <span className="text-xl font-bold text-cyan-300">
                      {totalCycles}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {t("earningsSnapshot.totalCycles.description")}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-400">
                    {t("earningsSnapshot.matrixStatus.title")}
                  </h4>
                  <span
                    className={`text-sm font-semibold ${
                      currentData.blocked
                        ? "text-red-300"
                        : totalReferrals >= 3
                        ? "text-amber-300"
                        : "text-emerald-300"
                    }`}
                  >
                    {currentData.blocked
                      ? t("earningsSnapshot.matrixStatus.blocked")
                      : totalReferrals >= 3
                      ? t("earningsSnapshot.matrixStatus.readyToCycle")
                      : t("earningsSnapshot.matrixStatus.building")}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {currentData.blocked
                    ? t("earningsSnapshot.matrixStatus.descriptions.blocked")
                    : totalReferrals >= 3
                    ? t(
                        "earningsSnapshot.matrixStatus.descriptions.readyToCycle"
                      )
                    : t("earningsSnapshot.matrixStatus.descriptions.building")}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
              <h3 className="mb-4 text-xl font-bold text-purple-300">
                {t("quickActions.title")}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Link
                  href="/chapters"
                  className="rounded-xl bg-purple-500/10 p-4 text-center border border-purple-500/40 hover:bg-purple-500/20 transition-all"
                >
                  <div className="text-2xl mb-2">
                    {t("quickActions.buyChapters.icon")}
                  </div>
                  <p className="text-sm font-semibold text-purple-300">
                    {t("quickActions.buyChapters.title")}
                  </p>
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-emerald-500/10 p-4 text-center border border-emerald-500/40 hover:bg-emerald-500/20 transition-all"
                >
                  <div className="text-2xl mb-2">
                    {t("quickActions.viewEarnings.icon")}
                  </div>
                  <p className="text-sm font-semibold text-emerald-300">
                    {t("quickActions.viewEarnings.title")}
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
            {t("noData.title", { chapter: selectedChapter })}
          </h3>
          <p className="text-sm text-amber-100/90">{t("noData.description")}</p>
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => retrySingleChapter(selectedChapter)}
              className="rounded-xl bg-amber-500/10 px-6 py-2 text-sm font-semibold text-amber-300 border border-amber-400/60 hover:bg-amber-500/20 transition-all"
            >
              {t("noData.retryChapter")}
            </button>
            <button
              onClick={handleManualRefresh}
              className="rounded-xl bg-blue-500/10 px-6 py-2 text-sm font-semibold text-blue-300 border border-blue-400/60 hover:bg-blue-500/20 transition-all"
            >
              {t("noData.reloadAll")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
