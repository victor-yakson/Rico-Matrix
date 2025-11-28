'use client';

import { useQuantuMatrix } from '../../hooks/useQuantuMatrix';
import { ChapterCard } from './ChapterCard';
import { CHAPTER_NAMES } from '../../utils/constants';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';

export const ChapterGrid = () => {
  const { userData, buyChapter, loading, chapterPrices, refetchUserData } = useQuantuMatrix();
  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | null>(null);

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: currentTxHash!,
    query: {
      enabled: !!currentTxHash,
    },
  });

  // Refetch data when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      refetchUserData();
      setCurrentTxHash(null);
    }
  }, [isConfirmed, refetchUserData]);

  const handleBuyChapter = async (track: number, chapter: number) => {
    try {
      const hash = await buyChapter(track, chapter);
      setCurrentTxHash(hash);
    } catch (error) {
      console.error('Purchase failed:', error);
      setCurrentTxHash(null);
    }
  };

  const chapters = Array.from({ length: 12 }, (_, i) => i + 1);

  const getChapterPrice = (chapter: number) => {
    if (!chapterPrices || chapterPrices.length === 0) return '0';
    return chapterPrices[chapter]?.toString() || '0';
  };

  const isProcessing = loading || isConfirming;

  return (
    <div className="space-y-8">
      {/* Track 1 - X3 Matrix */}
      <div>
        <h3 className="text-2xl font-bold text-white  mb-6">X3 Matrix Track</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {chapters.map((chapter) => (
            <ChapterCard
              key={`track1-${chapter}`}
              track={1}
              chapter={chapter}
              title={CHAPTER_NAMES[chapter as keyof typeof CHAPTER_NAMES]}
              price={getChapterPrice(chapter)}
              isUnlocked={userData?.exists && userData.track1Unlocked >= chapter}
              onPurchase={handleBuyChapter}
              disabled={isProcessing}
            />
          ))}
        </div>
      </div>

      {/* Track 2 - X6 Matrix */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-6">X6 Matrix Track</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {chapters.map((chapter) => (
            <ChapterCard
              key={`track2-${chapter}`}
              track={2}
              chapter={chapter}
              title={CHAPTER_NAMES[chapter as keyof typeof CHAPTER_NAMES]}
              price={getChapterPrice(chapter)}
              isUnlocked={userData?.exists && userData.track2Unlocked >= chapter}
              onPurchase={handleBuyChapter}
              disabled={isProcessing}
            />
          ))}
        </div>
      </div>
    </div>
  );
};