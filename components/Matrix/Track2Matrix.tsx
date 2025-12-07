"use client";

import { useQuantuMatrix } from "@/hooks/useQuantuMatrix";
import { useAccount } from "wagmi";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";

interface Track2Data {
  currentReferrer: string;
  firstLineReferrals: string[];
  secondLineReferrals: string[];
  blocked: boolean;
  reinvestCount: number;
  closedPart: string;
}

export const Track2Matrix = () => {
  const { address } = useAccount();
  const {
    fetchTrack2Matrix,
    userData,
    loading: hookLoading,
  } = useQuantuMatrix();

  const [track2Data, setTrack2Data] = useState<Record<number, Track2Data>>({});
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Type guard to check if userData has the full properties
  const hasFullUserData = (
    data: any
  ): data is {
    exists: true;
    track2Unlocked: number | string;
    track2TotalEarned: number | string;
    track2TotalCycles: number | string;
  } => {
    return (
      data?.exists &&
      "track2Unlocked" in data &&
      "track2TotalEarned" in data &&
      "track2TotalCycles" in data
    );
  };

  // Normalize unlocked chapters to a safe JS number
  const unlockedChapters = useMemo(() => {
    if (userData?.exists && "track2Unlocked" in userData) {
      const value = userData.track2Unlocked;
      if (typeof value === "number") return value;
      if (typeof value === "string") return parseInt(value) || 0;
      return 0;
    }
    return 0;
  }, [userData]);

  // Clamp selected chapter when unlocked chapters change
  useEffect(() => {
    if (unlockedChapters === 0) {
      setSelectedChapter(1);
    } else if (selectedChapter > unlockedChapters) {
      setSelectedChapter(unlockedChapters);
    }
  }, [unlockedChapters, selectedChapter]);

  const fetchAllTrack2Data = useCallback(async () => {
    if (!hasFullUserData(userData) || !address || !fetchTrack2Matrix) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data: Record<number, Track2Data> = {};

      if (unlockedChapters === 0) {
        setTrack2Data({});
        return;
      }

      // Fetch chapters sequentially
      for (let chapter = 1; chapter <= unlockedChapters; chapter++) {
        try {
          if (chapter > 1) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }

          const chapterData = await fetchTrack2Matrix(address, chapter);
          data[chapter] = chapterData;
        } catch (err) {
          console.error(`Error fetching chapter ${chapter} data:`, err);
          data[chapter] = {
            currentReferrer: "",
            firstLineReferrals: [],
            secondLineReferrals: [],
            blocked: false,
            reinvestCount: 0,
            closedPart: "",
          };
        }
      }

      setTrack2Data(data);
    } catch (err) {
      console.error("Error fetching track 2 matrix data:", err);
      setError("Failed to load matrix data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [address, fetchTrack2Matrix, userData, unlockedChapters]);

  useEffect(() => {
    fetchAllTrack2Data();
  }, [fetchAllTrack2Data]);

  // Get earnings data safely
  const totalEarned = hasFullUserData(userData)
    ? (() => {
        const value = userData.track2TotalEarned;
        if (typeof value === "number") return value;
        if (typeof value === "string") return parseFloat(value) || 0;
        return 0;
      })()
    : 0;

  const totalCycles = hasFullUserData(userData)
    ? (() => {
        const value = userData.track2TotalCycles;
        if (typeof value === "number") return value;
        if (typeof value === "string") return parseInt(value) || 0;
        return 0;
      })()
    : 0;

  // Show simplified view if contract functions aren't available
  if (error && Object.keys(track2Data).length === 0) {
    return (
      <div className="py-10">
        <div className="mx-auto max-w-md rounded-2xl border border-amber-400/40 bg-amber-500/5 p-6 shadow-[0_0_26px_rgba(0,0,0,0.75)]">
          <h3 className="mb-2 text-lg font-semibold text-amber-200">
            Matrix Data Unavailable
          </h3>
          <p className="mb-4 text-sm text-amber-100/90">
            The matrix visualization features are currently unavailable. You can
            still purchase chapters and earn rewards.
          </p>
          <div className="rounded-xl border border-blue-500/40 bg-slate-950/80 p-4 text-left">
            <h4 className="mb-2 text-sm font-semibold text-blue-300">
              Your X6 Matrix Stats
            </h4>
            <div className="space-y-2 text-sm text-slate-200">
              <div className="flex justify-between">
                <span>Total Earnings:</span>
                <span className="font-semibold text-blue-300">
                  ${totalEarned.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Chapters Unlocked:</span>
                <span className="font-semibold">{unlockedChapters}/12</span>
              </div>
              <div className="flex justify-between">
                <span>Total Cycles:</span>
                <span className="font-semibold">{totalCycles}</span>
              </div>
            </div>
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/dashboard"
              className="inline-block rounded-xl bg-blue-500/10 px-6 py-2 text-sm font-semibold text-blue-300 border border-blue-400/60 hover:bg-blue-500/20 transition-all"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading || hookLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
        <p className="text-slate-400">Loading X6 Matrix data...</p>
      </div>
    );
  }

  if (!userData?.exists) {
    return (
      <div className="py-10">
        <div className="mx-auto max-w-md rounded-2xl border border-blue-500/30 bg-slate-950/80 p-8 text-center shadow-[0_0_26px_rgba(0,0,0,0.75)]">
          <div className="text-5xl mb-4">🌐</div>
          <h3 className="mb-3 text-xl font-semibold text-slate-50">
            Not a Reader Yet
          </h3>
          <p className="text-sm text-slate-400 mb-6">
            Join the library to start building your X6 matrix network and earn
            from 2×3 matrix structure.
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-xl bg-gradient-to-r from-blue-400 to-cyan-500 px-6 py-3 text-sm font-semibold text-black shadow-[0_0_16px_rgba(59,130,246,0.7)] hover:brightness-110 transition-all"
          >
            Go to Dashboard to Register
          </Link>
        </div>
      </div>
    );
  }

  const currentData = track2Data[selectedChapter];

  // Calculate total referrals
  const totalReferrals = currentData
    ? currentData.firstLineReferrals.length +
      currentData.secondLineReferrals.length
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
          🌐 X6 Matrix Network
        </h1>
        <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
          Track your 2×3 matrix positions with first line and second line
          referrals.
        </p>
      </div>

      {/* Chapter Selector */}
      <div className="rounded-2xl border border-blue-500/20 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-slate-50 mb-4">
          Select Chapter
        </h2>
        <div className="flex flex-wrap gap-2">
          {unlockedChapters > 0 ? (
            Array.from({ length: unlockedChapters }, (_, i) => i + 1).map(
              (chapter) => (
                <button
                  key={chapter}
                  onClick={() => setSelectedChapter(chapter)}
                  className={`rounded-xl px-5 py-3 text-base font-medium transition-all ${
                    selectedChapter === chapter
                      ? "bg-gradient-to-r from-blue-400 via-cyan-500 to-blue-300 text-black shadow-[0_0_16px_rgba(59,130,246,0.7)]"
                      : "border border-blue-500/20 bg-slate-950/70 text-slate-300 hover:border-blue-400/60 hover:text-blue-300"
                  }`}
                >
                  Chapter {chapter}
                </button>
              )
            )
          ) : (
            <div className="w-full text-center py-4">
              <p className="text-slate-500">No chapters unlocked yet.</p>
              <Link
                href="/chapters"
                className="inline-block mt-2 rounded-xl bg-blue-500/10 px-6 py-2 text-sm font-semibold text-blue-300 border border-blue-400/60 hover:bg-blue-500/20 transition-all"
              >
                Buy Your First Chapter
              </Link>
            </div>
          )}
        </div>
      </div>

      {currentData ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Matrix Visualization */}
          <div className="rounded-2xl border border-blue-500/20 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
            <h3 className="mb-6 text-xl font-bold text-slate-50">
              X6 Matrix — Chapter {selectedChapter}
            </h3>

            {/* Current Referrer */}
            <div className="mb-8">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Your Referrer
              </h4>
              <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 p-4">
                <p className="truncate font-mono text-sm text-slate-200">
                  {currentData.currentReferrer || "No direct referrer"}
                </p>
                {currentData.currentReferrer && (
                  <p className="mt-1 text-xs text-slate-500">
                    The reader who referred you to this chapter
                  </p>
                )}
              </div>
            </div>

            {/* First Line Referrals (Direct) */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  First Line (Direct)
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
                            Direct Position {index + 1}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/40">
                            Direct
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-slate-900/60 p-4 text-center">
                    <p className="text-sm text-slate-400">
                      No first line referrals yet.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Second Line Referrals (Spillover) */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Second Line (Spillover)
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
                            Spillover Position {index + 1}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/40">
                            Spillover
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-slate-900/60 p-4 text-center">
                    <p className="text-sm text-slate-400">
                      No second line referrals yet.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="rounded-xl bg-slate-900/80 p-6 border border-slate-700/80">
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Chapter Status
              </h4>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <div
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                      currentData.blocked
                        ? "bg-red-500/10 text-red-300 border border-red-500/40"
                        : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {currentData.blocked ? "⛔ Blocked" : "✅ Active"}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Reinvest Cycles</p>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-blue-300">
                      {currentData.reinvestCount}
                    </span>
                    <span className="ml-2 text-sm text-slate-400">cycles</span>
                  </div>
                </div>
              </div>

              {/* Closed Part */}
              {currentData.closedPart && (
                <div className="pt-4 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-2">Closed Part</p>
                  <div className="rounded-lg border border-purple-500/30 bg-slate-900/60 p-3">
                    <p className="truncate font-mono text-sm text-purple-300">
                      {currentData.closedPart}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Fully cycled sub-matrix
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
                X6 Matrix Rules
              </h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>
                    <strong>6 positions</strong> total (2×3 matrix structure)
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>
                    <strong>First line:</strong> 2 direct referrals you place
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>
                    <strong>Second line:</strong> 4 spillovers from referrer's
                    matrix
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>
                    <strong>Auto-reinvest</strong> when all 6 positions are
                    filled
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>
                    <strong>Closed part</strong> indicates fully cycled
                    sub-matrix
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Earnings from both lines and reinvestments</span>
                </li>
              </ul>

              <div className="mt-6 rounded-xl bg-blue-900/20 p-5 border border-blue-700/30">
                <h4 className="mb-3 text-sm font-semibold text-blue-300">
                  Current Chapter Stats
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Referrals:</span>
                    <span className="font-semibold text-blue-300">
                      {totalReferrals}/6
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">First Line:</span>
                    <span className="font-semibold text-blue-300">
                      {currentData.firstLineReferrals.length}/2
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Second Line:</span>
                    <span className="font-semibold text-cyan-300">
                      {currentData.secondLineReferrals.length}/4
                    </span>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Matrix Progress</span>
                      <span>{Math.round((totalReferrals / 6) * 100)}%</span>
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
                Chapter {selectedChapter} Earnings Snapshot
              </h3>
              <div className="space-y-4">
                <div className="bg-slate-900/60 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300">Total X6 Earnings:</span>
                    <span className="text-xl font-bold text-emerald-300">
                      ${totalEarned.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Lifetime earnings from all X6 matrix chapters
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300">
                      Current Chapter Cycles:
                    </span>
                    <span className="text-xl font-bold text-blue-300">
                      {currentData.reinvestCount}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Reinvestment cycles for Chapter {selectedChapter}
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300">Total X6 Cycles:</span>
                    <span className="text-xl font-bold text-cyan-300">
                      {totalCycles}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Total reinvestments across all X6 chapters
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-400">
                    Matrix Status
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
                      ? "Blocked"
                      : totalReferrals >= 6
                      ? "Ready to Cycle"
                      : "Building"}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {currentData.blocked
                    ? "Unlock the next chapter to unblock this matrix"
                    : totalReferrals >= 6
                    ? "All 6 positions filled! Next placement will trigger reinvestment"
                    : "Place more referrals to complete the matrix"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
              <h3 className="mb-4 text-xl font-bold text-purple-300">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Link
                  href="/chapters"
                  className="rounded-xl bg-purple-500/10 p-4 text-center border border-purple-500/40 hover:bg-purple-500/20 transition-all"
                >
                  <div className="text-2xl mb-2">📚</div>
                  <p className="text-sm font-semibold text-purple-300">
                    Buy Chapters
                  </p>
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-emerald-500/10 p-4 text-center border border-emerald-500/40 hover:bg-emerald-500/20 transition-all"
                >
                  <div className="text-2xl mb-2">💰</div>
                  <p className="text-sm font-semibold text-emerald-300">
                    View Earnings
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
            Data Not Available
          </h3>
          <p className="text-sm text-amber-100/90">
            No matrix data found for Chapter {selectedChapter}.
          </p>
          <button
            onClick={fetchAllTrack2Data}
            className="mt-4 rounded-xl bg-amber-500/10 px-6 py-2 text-sm font-semibold text-amber-300 border border-amber-400/60 hover:bg-amber-500/20 transition-all"
          >
            Try Loading Again
          </button>
        </div>
      ) : null}
    </div>
  );
};
