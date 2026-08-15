import React, { useMemo, useState } from "react";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { useQuantuMatrix } from "@/hooks/useQuantuMatrix";
import {
  CONTRACT_ABI,
  LEGACY_V2_CONTRACT_ADDRESS,
  RICO_CHAIN_CONFIG,
  RICO_MIGRATOR_ABI,
} from "@/utils/constants";

interface MigrationPanelProps {
  onMigrationComplete?: () => void;
}

const formatAmount = (value?: bigint) => {
  try {
    return Number(formatUnits(value || BigInt(0), 18)).toFixed(2);
  } catch {
    return "0.00";
  }
};

const getMigrationErrorMessage = (error: unknown) => {
  const message =
    (error as { shortMessage?: string; message?: string })?.shortMessage ||
    (error as { message?: string })?.message ||
    "Migration failed. Try again.";

  if (
    message.includes("UnclaimedBalanceOnV2") ||
    message.includes("0x1293e7bc")
  ) {
    return "This wallet still has claimable V2 balances. Claim the legacy royalty, V2 royalty, and pending RICO first, then try migration again.";
  }

  if (message.includes("NotInV2")) {
    return "This wallet does not exist in the Rico Matrix V2 contract.";
  }

  if (message.includes("AlreadyMigrated")) {
    return "This wallet has already been imported into the current V3 hub.";
  }

  return message;
};

const MigrationPanel: React.FC<MigrationPanelProps> = ({
  onMigrationComplete,
}) => {
  const { address } = useAccount();
  const chainId = useChainId();
  const {
    userData,
    migrateSelf,
    loading,
    refetchAllData,
  } = useQuantuMatrix();

  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const migratorAddress = RICO_CHAIN_CONFIG[56].migrator;

  const { data: legacyExists } = useReadContract({
    address: LEGACY_V2_CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "isReaderExists",
    args: address ? [address] : undefined,
    chainId: 56,
    query: {
      enabled: Boolean(address && LEGACY_V2_CONTRACT_ADDRESS),
    },
  });

  const { data: migrated } = useReadContract({
    address: migratorAddress,
    abi: RICO_MIGRATOR_ABI,
    functionName: "isMigrated",
    args: address ? [address] : undefined,
    chainId: 56,
    query: {
      enabled: Boolean(address && migratorAddress),
    },
  });

  const { data: claimables } = useReadContract({
    address: migratorAddress,
    abi: RICO_MIGRATOR_ABI,
    functionName: "v2ClaimableBalances",
    args: address ? [address] : undefined,
    chainId: 56,
    query: {
      enabled: Boolean(address && migratorAddress),
    },
  });

  const [legacyClaimable, v2Royalty, ricoPending] =
    (claimables as readonly [bigint, bigint, bigint] | undefined) ||
    [BigInt(0), BigInt(0), BigInt(0)];

  const hasUnclaimedBalances =
    legacyClaimable > BigInt(0) ||
    v2Royalty > BigInt(0) ||
    ricoPending > BigInt(0);
  const totalOutstandingClaims = legacyClaimable + v2Royalty + ricoPending;

  const shouldShow = useMemo(() => {
    const foundInV2 = Boolean(legacyExists);
    const alreadyMigrated = Boolean(migrated) || userData?.exists;
    return foundInV2 && !alreadyMigrated;
  }, [legacyExists, migrated, userData?.exists]);

  const onMigrate = async () => {
    setError(null);
    setDone(false);

    if (chainId !== 56) {
      setError("Switch your wallet to BNB Smart Chain before migrating this account.");
      return;
    }

    if (hasUnclaimedBalances) {
      setError(
        "Claim your V2 legacy royalty, V2 royalty, and pending RICO before migrating. The live migrator contract blocks migration until all three balances are zero.",
      );
      return;
    }

    setIsMigrating(true);

    try {
      await migrateSelf();
      await refetchAllData?.({ showToast: false });
      setDone(true);
      onMigrationComplete?.();
    } catch (e: any) {
      setError(getMigrationErrorMessage(e));
    } finally {
      setIsMigrating(false);
    }
  };

  const busy = loading || isMigrating;

  if (!shouldShow) return null;

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="rounded-2xl border border-[#2a2a2a] bg-black/80 backdrop-blur shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center">
              <svg className="h-5 w-5 text-[#d4af37]" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l9 4.5-9 4.5L3 7.5 12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M21 7.5V16.5L12 21 3 16.5V7.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-sm text-white/70">V2 to V3 migration</div>
              <div className="text-lg font-semibold text-[#d4af37] truncate">
                Finish legacy account import
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Migration Summary
                </p>
                <p className="mt-1 text-sm text-white/70">
                  One-time import from Rico Matrix V2 into the live BSC V3 hub.
                </p>
              </div>
              <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                V2 Found
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-3">
                <p className="text-[0.7rem] uppercase tracking-[0.16em] text-white/45">
                  Legacy royalty
                </p>
                <p className="mt-1 text-lg font-semibold text-amber-300">
                  {formatAmount(legacyClaimable)}
                </p>
              </div>
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-3 py-3">
                <p className="text-[0.7rem] uppercase tracking-[0.16em] text-white/45">
                  V2 royalty
                </p>
                <p className="mt-1 text-lg font-semibold text-yellow-300">
                  {formatAmount(v2Royalty)}
                </p>
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-3">
                <p className="text-[0.7rem] uppercase tracking-[0.16em] text-white/45">
                  Pending RICO
                </p>
                <p className="mt-1 text-lg font-semibold text-cyan-300">
                  {formatAmount(ricoPending)}
                </p>
              </div>
            </div>
          </div>

          {hasUnclaimedBalances && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Migration is blocked because this wallet still has outstanding V2 balances. Total remaining to clear: {formatAmount(totalOutstandingClaims)}.
            </div>
          )}

          {chainId !== 56 && (
            <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200">
              Switch your wallet to BNB Smart Chain to submit the migration transaction.
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {done && (
            <div className="mt-4 rounded-xl border border-yellow-400/35 bg-yellow-500/10 px-3 py-2 text-sm text-amber-200">
              Migration submitted successfully. Refreshing dashboard state now.
            </div>
          )}

          <button
            onClick={onMigrate}
            disabled={busy || hasUnclaimedBalances || chainId !== 56}
            className={[
              "mt-5 w-full rounded-xl px-4 py-3 font-semibold transition",
              "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40",
              busy || hasUnclaimedBalances || chainId !== 56
                ? "bg-[#d4af37]/60 text-black cursor-not-allowed"
                : "bg-[#d4af37] text-black hover:brightness-110 active:brightness-95",
            ].join(" ")}
          >
            {busy ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                Preparing migration...
              </span>
            ) : hasUnclaimedBalances ? (
              "Claim V2 balances first"
            ) : chainId !== 56 ? (
              "Switch to BSC to migrate"
            ) : (
              "Import account into V3"
            )}
          </button>

          <div className="mt-3 text-center text-xs text-white/45">
            Migration only works on BNB Smart Chain after all three V2 balances are zero.
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationPanel;
