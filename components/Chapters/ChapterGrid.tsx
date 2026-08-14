"use client";

import { useQuantuMatrix } from "../../hooks/useQuantuMatrix";
import { ChapterCard } from "./ChapterCard";
import { CHAPTER_NAMES } from "../../utils/constants";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";

type MatrixChapterState = {
  blocked?: boolean;
};

export const ChapterGrid = () => {
  const { address } = useAccount();
  const {
    userData,
    buyChapter,
    buyChapterBatch,
    approveUsdt,
    loading,
    chapterPrices,
    usdtAllowance,
    usdtBalance,
    paymentTokenSymbol,
    paymentTokenMaxAllowance,
    broadcastNativeFeeDisplay,
    broadcastNativeFeeUsd,
    nativePriceLoading,
    paymentTokens,
    selectedPaymentTokenAddress,
    setSelectedPaymentTokenAddress,
    fetchAllTrack1Chapters,
    fetchAllTrack2Chapters,
  } = useQuantuMatrix();

  // Track which chapter is currently being approved
  const [currentlyApproving, setCurrentlyApproving] = useState<{
    track: number;
    chapter: number;
  } | null>(null);
  const [batchTrack, setBatchTrack] = useState(1);
  const [batchStart, setBatchStart] = useState(1);
  const [batchEnd, setBatchEnd] = useState(3);
  const [isBatchBuying, setIsBatchBuying] = useState(false);
  const [broadcastAcrossChains, setBroadcastAcrossChains] = useState(false);
  const [track1States, setTrack1States] = useState<Record<number, "active" | "blocked">>({});
  const [track2States, setTrack2States] = useState<Record<number, "active" | "blocked">>({});
  const t = useTranslations("ChaptersPage.ChapterGrid");

  useEffect(() => {
    const loadChapterStates = async () => {
      if (!userData?.exists) {
        setTrack1States({});
        setTrack2States({});
        return;
      }

      try {
        const [track1Data, track2Data] = await Promise.all([
          address && userData.track1Unlocked > 0
            ? fetchAllTrack1Chapters(address, userData.track1Unlocked)
            : Promise.resolve({}),
          address && userData.track2Unlocked > 0
            ? fetchAllTrack2Chapters(address, userData.track2Unlocked)
            : Promise.resolve({}),
        ]);

        const nextTrack1: Record<number, "active" | "blocked"> = {};
        Object.entries(track1Data || {}).forEach(([chapter, data]) => {
          const chapterData = data as MatrixChapterState;
          nextTrack1[Number(chapter)] = chapterData.blocked ? "blocked" : "active";
        });

        const nextTrack2: Record<number, "active" | "blocked"> = {};
        Object.entries(track2Data || {}).forEach(([chapter, data]) => {
          const chapterData = data as MatrixChapterState;
          nextTrack2[Number(chapter)] = chapterData.blocked ? "blocked" : "active";
        });

        setTrack1States(nextTrack1);
        setTrack2States(nextTrack2);
      } catch (error) {
        console.error("Failed to load chapter matrix states:", error);
      }
    };

    void loadChapterStates();
  }, [
    fetchAllTrack1Chapters,
    fetchAllTrack2Chapters,
    address,
    userData?.exists,
    userData?.track1Unlocked,
    userData?.track2Unlocked,
  ]);

  const handleBuyChapter = async (track: number, chapter: number) => {
    try {
      await buyChapter(track, chapter, broadcastAcrossChains);
    } catch (error) {
      console.error("Purchase failed:", error);
    }
  };

  const handleApproveUsdt = async (
    amount: string,
    track: number,
    chapter: number
  ) => {
    try {
      setCurrentlyApproving({ track, chapter });
      await approveUsdt(formatUnits(BigInt(amount || "0"), 18));
    } catch (error) {
      console.error("Approval failed:", error);
    } finally {
      setCurrentlyApproving(null);
    }
  };

  const handleBatchBuy = async () => {
    try {
      setIsBatchBuying(true);
      await buyChapterBatch(
        batchTrack,
        batchStart,
        batchEnd,
        broadcastAcrossChains,
      );
    } catch (error) {
      console.error("Batch purchase failed:", error);
    } finally {
      setIsBatchBuying(false);
    }
  };

  const track1Chapters = Array.from({ length: 12 }, (_, i) => i + 1);
  const track2Chapters = Array.from({ length: 12 }, (_, i) => i + 1);

  const getChapterPrice = (chapter: number) => {
    if (!chapterPrices || chapterPrices.length === 0) return "0";
    return chapterPrices[chapter - 1]?.toString() || "0";
  };

  // Check if user needs to approve USDT for a specific chapter
  const needsApproval = (chapterPrice: string) => {
    if (!chapterPrice || chapterPrice === "0") return false;

    try {
      const priceNumber = parseFloat(formatUnits(BigInt(chapterPrice), 18));
      const allowanceNumber = parseFloat(usdtAllowance || "0");


      return allowanceNumber < priceNumber;
    } catch (error) {
      console.error("Error checking approval:", error);
      return false;
    }
  };

  const isProcessing = loading;
  const batchCost = Array.from(
    { length: Math.max(0, batchEnd - batchStart + 1) },
    (_, index) => batchStart + index,
  ).reduce((total, chapter) => total + BigInt(getChapterPrice(chapter) || "0"), BigInt(0));
  const batchNeedsApproval = needsApproval(batchCost.toString());
  const batchDisabled =
    isProcessing ||
    isBatchBuying ||
    !userData?.exists ||
    batchStart < 1 ||
    batchEnd > 12 ||
    batchEnd < batchStart;

  // Check if a specific chapter is being approved
  const isChapterApproving = (track: number, chapter: number) => {
    return (
      currentlyApproving?.track === track &&
      currentlyApproving?.chapter === chapter
    );
  };

  return (
    <div className="space-y-8">
      {/* USDT Balance Info */}
      <div className="theme-panel-soft rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-slate-400">
              {t("balance.title")}
            </h4>
            <p className="text-lg font-bold text-slate-50">
              {Number(usdtBalance).toFixed(2) || "0"} {paymentTokenSymbol || t("balance.currency")}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-400">
              {t("balance.approved")}
            </h4>
            <p className="text-lg font-bold text-yellow-300">
              {Number(usdtAllowance).toFixed(2) || "0"} {paymentTokenSymbol || t("balance.currency")}
            </p>
          </div>
        </div>
        {parseFloat(usdtBalance || "0") === 0 && (
          <div className="mt-2 text-sm text-amber-400">
            {t("balance.warning")}
          </div>
        )}
      </div>

      <div className="theme-panel-soft rounded-2xl p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Batch chapter purchase</h4>
            <p className="mt-1 text-xs text-slate-400">
              Buy continuous chapters in one transaction on the active chain.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-6 lg:min-w-[760px]">
            {paymentTokens?.length > 1 && (
              <label className="text-xs text-slate-400">
                Token
                <select
                  value={selectedPaymentTokenAddress}
                  onChange={(event) =>
                    setSelectedPaymentTokenAddress(event.target.value as `0x${string}`)
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                >
                  {paymentTokens.map((token) => (
                    <option key={token.address} value={token.address}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-xs text-slate-400">
              Track
              <select
                value={batchTrack}
                onChange={(event) => setBatchTrack(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value={1}>X3</option>
                <option value={2}>X6</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              From
              <input
                type="number"
                min={1}
                max={12}
                value={batchStart}
                onChange={(event) => setBatchStart(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-400">
              To
              <input
                type="number"
                min={1}
                max={12}
                value={batchEnd}
                onChange={(event) => setBatchEnd(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="flex min-h-[58px] cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 sm:col-span-2">
              <input
                type="checkbox"
                checked={broadcastAcrossChains}
                onChange={(event) =>
                  setBroadcastAcrossChains(event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-yellow-400 focus:ring-yellow-400"
              />
              <span>
                <span className="block font-semibold text-slate-100">
                  Broadcast to all chains
                </span>
                <span className="block text-[0.68rem] text-slate-500">
                  {nativePriceLoading
                    ? "Calculating live native sync value..."
                    : broadcastNativeFeeDisplay
                      ? `Shows about $${broadcastNativeFeeUsd}; exact value is quoted before sync.`
                      : "Exact sync value is quoted before confirmation."}
                </span>
              </span>
            </label>
            <button
              type="button"
              onClick={batchNeedsApproval ? () => approveUsdt(formatUnits(batchCost, 18)) : handleBatchBuy}
              disabled={batchDisabled}
              className="rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
            >
              {isBatchBuying
                ? "Processing..."
                : batchNeedsApproval
                  ? `Approve ${paymentTokenMaxAllowance || "21000"} ${paymentTokenSymbol || "USDT"}`
                  : broadcastAcrossChains
                    ? `Buy ${batchStart}-${batchEnd} + Sync`
                    : `Buy ${batchStart}-${batchEnd}`}
            </button>
          </div>
        </div>
      </div>

      {/* Track 1 - X3 Matrix */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-6">{t("tracks.x3")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {track1Chapters.map((chapter) => {
            const chapterPrice = getChapterPrice(chapter);
            const chapterNeedsApproval = needsApproval(chapterPrice);

            return (
              <ChapterCard
                key={`track1-${chapter}`}
                track={1}
                chapter={chapter}
                title={CHAPTER_NAMES[chapter as keyof typeof CHAPTER_NAMES]}
                price={chapterPrice}
                isUnlocked={
                  userData?.exists && userData.track1Unlocked >= chapter
                }
                chapterState={track1States[chapter]}
                onPurchase={handleBuyChapter}
                onApprove={(amount) => handleApproveUsdt(amount, 1, chapter)}
                disabled={isProcessing}
                needsApproval={chapterNeedsApproval}
                isApproving={isChapterApproving(1, chapter)}
              />
            );
          })}
        </div>
      </div>

      {/* Track 2 - X6 Matrix */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-6">{t("tracks.x6")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {track2Chapters.map((chapter) => {
            const chapterPrice = getChapterPrice(chapter);
            const chapterNeedsApproval = needsApproval(chapterPrice);

            return (
              <ChapterCard
                key={`track2-${chapter}`}
                track={2}
                chapter={chapter}
                title={CHAPTER_NAMES[chapter as keyof typeof CHAPTER_NAMES]}
                price={chapterPrice}
                isUnlocked={
                  userData?.exists && userData.track2Unlocked >= chapter
                }
                chapterState={track2States[chapter]}
                onPurchase={handleBuyChapter}
                onApprove={(amount) => handleApproveUsdt(amount, 2, chapter)}
                disabled={isProcessing}
                needsApproval={chapterNeedsApproval}
                isApproving={isChapterApproving(2, chapter)}
              />
            );
          })}
        </div>
      </div>

      {/* Transaction Status */}
      {(isProcessing || currentlyApproving) && (
        <div className="fixed bottom-4 right-4 rounded-lg border border-yellow-500/20 bg-[rgba(8,8,8,0.95)] p-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
            <span className="text-sm text-slate-300">
              {currentlyApproving
                ? t("transactionStatus.approving")
                : t("transactionStatus.processing")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
