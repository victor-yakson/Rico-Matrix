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
    approveUsdt,
    loading,
    chapterPrices,
    usdtAllowance,
    usdtBalance,
    fetchAllTrack1Chapters,
    fetchAllTrack2Chapters,
  } = useQuantuMatrix();

  // Track which chapter is currently being approved
  const [currentlyApproving, setCurrentlyApproving] = useState<{
    track: number;
    chapter: number;
  } | null>(null);
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

  const track1Chapters = Array.from({ length: 12 }, (_, i) => i + 1);
  const track2Chapters = Array.from({ length: 12 }, (_, i) => i + 1);

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
      <div className="theme-panel-soft rounded-2xl p-4">
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
            <p className="text-lg font-bold text-yellow-300">
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
