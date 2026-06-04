import React, { useMemo, useState } from "react";
import { useQuantuMatrix } from "@/hooks/useQuantuMatrix";
import { useTranslations } from "next-intl";

interface MigrationPanelProps {
  onMigrationComplete?: () => void;
}

const MigrationPanel: React.FC<MigrationPanelProps> = ({
  onMigrationComplete,
}) => {
  const { 
    userData, 
    migrateSelf, 
    loading, 
    refetchAllData,
    migrationAndRoyaltyUI 
  } = useQuantuMatrix();
  const t = useTranslations("MigrationPanel");

  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Determine if panel should be shown
  const shouldShow = useMemo(() => {
    const status =
      userData?.migrationStatus?.status ?? userData?.migrationData?.status ?? 0;
    // Show panel only if user exists in V1 (status 1) and hasn't migrated
    return status === 1;
  }, [userData]);

  // Legacy claimable amount
  const legacyClaimable = useMemo(() => {
    return migrationAndRoyaltyUI?.legacyClaimable || "0";
  }, [migrationAndRoyaltyUI]);

  // V2 claimable amount
  const v2Claimable = useMemo(() => {
    return migrationAndRoyaltyUI?.v2Claimable || "0";
  }, [migrationAndRoyaltyUI]);

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
      setError(t("error") || e?.message || "Migration failed. Try again.");
    } finally {
      setIsMigrating(false);
    }
  };

  const busy = loading || isMigrating;

  // Don't show panel if user shouldn't migrate
  if (!shouldShow) return null;

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
              <div className="text-sm text-white/70">{t("subtitle")}</div>
              <div className="text-lg font-semibold text-[#d4af37] truncate">
                {t("title")}
              </div>
            </div>
          </div>

          {/* Migration Details */}
          <div className="mt-4 space-y-3">
            {/* V1 Status */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/60">{t("v1Status")}</span>
              <span className="text-sm font-medium text-yellow-400">
                {t("status.found")}
              </span>
            </div>

            {/* V2 Status */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/60">{t("v2Status")}</span>
              <span className="text-sm font-medium text-red-400">
                {t("status.notMigrated")}
              </span>
            </div>

            {/* Legacy Royalty */}
            {parseFloat(legacyClaimable) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/60">{t("legacyRoyalty")}</span>
                <span className="text-sm font-medium text-amber-300">
                  {parseFloat(legacyClaimable).toFixed(2)} USDT
                </span>
              </div>
            )}

            {/* V2 Royalty */}
            {parseFloat(v2Claimable) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/60">{t("v2Royalty")}</span>
                <span className="text-sm font-medium text-yellow-300">
                  {parseFloat(v2Claimable).toFixed(2)} USDT
                </span>
              </div>
            )}
          </div>

          {/* Migration Benefits */}
          <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-yellow-900/20 to-yellow-800/10 border border-yellow-700/30">
            <h4 className="text-sm font-semibold text-yellow-400 mb-2">
              {t("benefits.title")}
            </h4>
            <ul className="space-y-1 text-xs text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">✓</span>
                {t("benefits.transferHistory")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">✓</span>
                {t("benefits.preserveEarnings")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">✓</span>
                {t("benefits.accessV2")}
              </li>
            </ul>
          </div>

          {/* Error Feedback */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Success Feedback */}
          {done && (
            <div className="mt-4 rounded-xl border border-yellow-400/35 bg-yellow-500/10 px-3 py-2 text-sm text-amber-200">
              {t("status.success")}
            </div>
          )}

          {/* Migrate Button */}
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
                {t("button.busy")}
              </span>
            ) : (
              t("button.ready")
            )}
          </button>

          {/* Info Text */}
          <div className="mt-3 text-center text-xs text-white/45">
            {t("oneTime")}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationPanel;
