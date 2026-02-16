"use client";

import { useQuantuMatrix } from "../../hooks/useQuantuMatrix";
import { ChapterCard } from "./ChapterCard";
import { CHAPTER_NAMES } from "../../utils/constants";
import { useState } from "react";
import { formatUnits } from "viem";
import { useTranslations } from "next-intl";

export const ChapterGrid = () => {
  const {
    userData,
    buyChapter,
    approveUsdt,
    loading,
    chapterPrices,
    usdtAllowance,
    usdtBalance,
  } = useQuantuMatrix();

  // Track which chapter is currently being approved
  const [currentlyApproving, setCurrentlyApproving] = useState<{
    track: number;
    chapter: number;
  } | null>(null);
  const t = useTranslations("ChaptersPage.ChapterGrid");

  const handleBuyChapter = async (track: number, chapter: number) => {
    try {
      await buyChapter(track, chapter);
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
      await approveUsdt(amount);
    } catch (error) {
      console.error("Approval failed:", error);
    } finally {
      setCurrentlyApproving(null);
    }
  };

  const chapters = Array.from({ length: 12 }, (_, i) => i + 1);

  const getChapterPrice = (chapter: number) => {
    if (!chapterPrices || chapterPrices.length === 0) return "0";
    return chapterPrices[chapter]?.toString() || "0";
  };

  const isProcessing = loading;

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
      <div className="rounded-2xl border border-blue-500/20 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-slate-400">
              {t("balance.title")}
            </h4>
            <p className="text-lg font-bold text-slate-50">
              {Number(usdtBalance).toFixed(2) || "0"} {t("balance.currency")}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-400">
              {t("balance.approved")}
            </h4>
            <p className="text-lg font-bold text-emerald-400">
              {Number(usdtAllowance).toFixed(2) || "0"} {t("balance.currency")}
            </p>
          </div>
        </div>
        {parseFloat(usdtBalance || "0") === 0 && (
          <div className="mt-2 text-sm text-amber-400">
            {t("balance.warning")}
          </div>
        )}
      </div>

      {/* Track 1 - X3 Matrix */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-6">{t("tracks.x3")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {chapters.map((chapter) => {
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
          {chapters.map((chapter) => {
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
        <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-lg">
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
