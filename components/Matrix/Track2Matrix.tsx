'use client';

import { useQuantuMatrix } from '../../hooks/useQuantuMatrix';
import { useState, useEffect, useCallback, useMemo } from 'react';

interface Track1Data {
  currentReferrer: string;
  referrals: string[];
  blocked: boolean;
  reinvestCount: number;
}

// Helper to normalize onchain numeric values (bigint / string / number)
const toNumber = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

export const Track2Matrix = () => {
  // TEMP: static address for testing – replace with connected wallet when ready
  const address = '0xEe42c6b5d634ffa1Ad6cB69789dCCcccBB9f4A1A';
  const { readContract, userData } = useQuantuMatrix();

  const [track1Data, setTrack1Data] = useState<Record<number, Track1Data>>({});
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Normalize unlocked chapters to a safe JS number
  const unlockedChapters = useMemo(
    () => toNumber(userData?.track1Unlocked, 0),
    [userData?.track1Unlocked]
  );

  // Clamp selected chapter when unlocked chapters change
  useEffect(() => {
    if (unlockedChapters === 0) {
      setSelectedChapter(1);
    } else if (selectedChapter > unlockedChapters) {
      setSelectedChapter(unlockedChapters);
    }
  }, [unlockedChapters, selectedChapter]);

  const fetchTrack1Data = useCallback(async () => {
    if (!userData?.exists || !address || !readContract) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const chapters = unlockedChapters;
      const data: Record<number, Track1Data> = {};

      if (chapters === 0) {
        setTrack1Data({});
        return;
      }

      // Fetch chapters sequentially (12 max, so this is fine)
      for (let chapter = 1; chapter <= chapters; chapter++) {
        try {
          if (chapter > 1) {
            await new Promise((resolve) => setTimeout(resolve, 80));
          }

          const trackData = (await readContract('getTrack2', [
            address,
            chapter,
          ])) as any;

          if (trackData && Array.isArray(trackData) && trackData.length >= 4) {
            data[chapter] = {
              currentReferrer: trackData[0] || '',
              referrals: Array.isArray(trackData[1]) ? trackData[1] : [],
              blocked: Boolean(trackData[2]),
              reinvestCount: toNumber(trackData[3], 0),
            };
          } else {
            data[chapter] = {
              currentReferrer: '',
              referrals: [],
              blocked: false,
              reinvestCount: 0,
            };
          }
        } catch (err) {
          console.error(
            `Error fetching track 1 data for chapter ${chapter}:`,
            err
          );
          data[chapter] = {
            currentReferrer: '',
            referrals: [],
            blocked: false,
            reinvestCount: 0,
          };
        }
      }

      setTrack1Data(data);
    } catch (err) {
      console.error('Error fetching track 1 matrix data:', err);
      setError(
        'Failed to load matrix data. The contract function may not be available.'
      );
    } finally {
      setLoading(false);
    }
  }, [address, readContract, userData?.exists, unlockedChapters]);

  useEffect(() => {
    fetchTrack1Data();
  }, [fetchTrack1Data]);

  // Show simplified view if contract functions aren't available
  if (error && Object.keys(track1Data).length === 0) {
    const totalEarned = toNumber(userData?.track1TotalEarned, 0);

    return (
      <div className="py-10 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-amber-400/40 bg-amber-500/5 p-6 shadow-[0_0_26px_rgba(0,0,0,0.75)]">
          <h3 className="mb-2 text-lg font-semibold text-amber-200">
            Matrix Data Unavailable
          </h3>
          <p className="mb-4 text-sm text-amber-100/90">
            The matrix visualization features are currently unavailable.
            You can still purchase chapters and earn rewards.
          </p>
          <div className="rounded-xl border border-yellow-500/40 bg-slate-950/80 p-4 text-left">
            <h4 className="mb-2 text-sm font-semibold text-yellow-300">
              Your X3 Matrix Stats
            </h4>
            <div className="space-y-2 text-sm text-slate-200">
              <div className="flex justify-between">
                <span>Total Earnings:</span>
                <span className="font-semibold text-yellow-300">
                  ${totalEarned.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Chapters Unlocked:</span>
                <span className="font-semibold">
                  {unlockedChapters}/12
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Cycles:</span>
                <span className="font-semibold">
                  {toNumber(userData?.track1TotalCycles, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
      </div>
    );
  }

  if (!userData?.exists) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-yellow-500/30 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.75)]">
          <h3 className="mb-2 text-xl font-semibold text-slate-50">
            Not a Reader Yet
          </h3>
          <p className="text-sm text-slate-400">
            Join the library to start building your X3 matrix network and earn
            from spillovers and cycles.
          </p>
        </div>
      </div>
    );
  }

  const currentData = track1Data[selectedChapter];

  return (
    <div className="space-y-6">
      {/* Chapter Selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {unlockedChapters > 0 &&
          Array.from({ length: unlockedChapters }, (_, i) => i + 1).map(
            (chapter) => (
              <button
                key={chapter}
                onClick={() => setSelectedChapter(chapter)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  selectedChapter === chapter
                    ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300 text-black shadow-[0_0_16px_rgba(250,204,21,0.7)]'
                    : 'border border-yellow-500/20 bg-slate-950/70 text-slate-300 hover:border-yellow-400/60 hover:text-yellow-300'
                }`}
              >
                Chapter {chapter}
              </button>
            )
          )}
      </div>

      {currentData ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Matrix Visualization */}
          <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-50">
              X3 Matrix Structure — Chapter {selectedChapter}
            </h3>

            {/* Current Referrer */}
            <div className="mb-6">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Your Referrer
              </h4>
              <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-3">
                <p className="truncate font-mono text-xs text-slate-200">
                  {currentData.currentReferrer || 'No referrer'}
                </p>
              </div>
            </div>

            {/* Your Referrals */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Your Referrals ({currentData.referrals.length}/3)
              </h4>
              <div className="space-y-2">
                {currentData.referrals.length > 0 ? (
                  currentData.referrals.map((referral, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-3"
                    >
                      <p className="truncate font-mono text-xs text-slate-200">
                        {referral}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                        Position {index + 1}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-slate-900/60 px-4 py-4 text-center">
                    <p className="text-sm text-slate-500">
                      No referrals yet — your matrix slots are still open.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="mt-6 rounded-xl bg-slate-900/80 p-4 border border-slate-700/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Status
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    currentData.blocked
                      ? 'bg-red-500/10 text-red-300 border border-red-500/40'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {currentData.blocked ? 'Blocked' : 'Active'}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Reinvest Cycles
                </span>
                <span className="text-sm font-semibold text-yellow-300">
                  {currentData.reinvestCount}
                </span>
              </div>
            </div>
          </div>

          {/* Matrix Info */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
              <h3 className="mb-3 text-lg font-semibold text-yellow-300">
                X3 Matrix Rules
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• 3 positions per level (3× matrix structure).</li>
                <li>• Earn from direct and spillover placements.</li>
                <li>• Auto-reinvest when the level is fully cycled.</li>
                <li>• Earnings are routed based on matrix positions.</li>
                <li>• Reinvest cycles increase your earning potential.</li>
                <li>• Slot can be blocked when next chapter is not unlocked.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
              <h3 className="mb-3 text-lg font-semibold text-emerald-300">
                Chapter {selectedChapter} Earnings Snapshot
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Total X3 Earnings:</span>
                  <span className="font-semibold text-emerald-300">
                    ${toNumber(userData?.track1TotalEarned, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Reinvest Cycles:</span>
                  <span className="font-semibold text-yellow-300">
                    {currentData.reinvestCount}
                  </span>
                </div>
                <p className="pt-2 text-xs text-slate-500">
                  Note: This panel shows total X3 earnings across all chapters,
                  not only Chapter {selectedChapter}. Per-chapter earnings
                  breakdown can be added in a future upgrade.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-10 text-center">
          <p className="text-sm text-slate-400">
            No data available for this chapter.
          </p>
        </div>
      )}
    </div>
  );
};
