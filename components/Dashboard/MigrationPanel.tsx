import React, { useMemo, useState } from "react";
import { useQuantuMatrix } from "@/hooks/useQuantuMatrix";

interface MigrationPanelProps {
  onMigrationComplete?: () => void;
}

const MigrationPanel: React.FC<MigrationPanelProps> = ({
  onMigrationComplete,
}) => {
  const { userData, migrateSelf, loading, refetchAllData } = useQuantuMatrix();

  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const shouldShow = useMemo(() => {
    if (!userData) return false;
    const existsInV1 = !!userData.migrationStatus?.existsV1;
    const migrated = !!userData.migrationStatus?.migrated;
    return existsInV1 && !migrated;
  }, [userData]);

  if (!shouldShow) return null;

  const onMigrate = async () => {
    setError(null);
    setDone(false);
    setIsMigrating(true);

    try {
      await migrateSelf();
      await refetchAllData?.();
      setDone(true);
      onMigrationComplete?.();
    } catch (e: any) {
      setError(e?.message ?? "Migration failed. Try again.");
    } finally {
      setIsMigrating(false);
    }
  };

  const busy = loading || isMigrating;

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="rounded-2xl border border-[#2a2a2a] bg-black/80 backdrop-blur shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center">
              <svg
                className="h-5 w-5 text-[#d4af37]"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 3l9 4.5-9 4.5L3 7.5 12 3Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 7.5V16.5L12 21 3 16.5V7.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="min-w-0">
              <div className="text-sm text-white/70">Upgrade required</div>
              <div className="text-lg font-semibold text-[#d4af37] truncate">
                Move to V2
              </div>
            </div>
          </div>

          {/* Minimal feedback only */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {done && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              Done.
            </div>
          )}

          <button
            onClick={onMigrate}
            disabled={busy}
            className={[
              "mt-5 w-full rounded-xl px-4 py-3 font-semibold transition",
              "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40",
              busy
                ? "bg-[#d4af37]/60 text-black cursor-not-allowed"
                : "bg-[#d4af37] text-black hover:brightness-110 active:brightness-95",
            ].join(" ")}
          >
            {busy ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                Upgrading…
              </span>
            ) : (
              "Upgrade Now"
            )}
          </button>

          <div className="mt-3 text-center text-xs text-white/45">
            One-time action.
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationPanel;
