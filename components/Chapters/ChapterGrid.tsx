'use client';

import { useQuantuMatrix } from '../../hooks/useQuantuMatrix';
import { ChapterCard } from './ChapterCard';
import { CHAPTER_NAMES } from '../../utils/constants';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';

export const ChapterGrid = () => {
  const { 
    userData, 
    buyChapter, 
    approveUsdt, 
    loading, 
    chapterPrices, 
    refetchUserData,
    usdtAllowance,
    usdtBalance
  } = useQuantuMatrix();
  
  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | null>(null);
  const [currentApproveHash, setCurrentApproveHash] = useState<`0x${string}` | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: currentTxHash!,
    query: {
      enabled: !!currentTxHash,
    },
  });

  const { 
    isLoading: isApproveConfirming, 
    isSuccess: isApproveConfirmed 
  } = useWaitForTransactionReceipt({
    hash: currentApproveHash!,
    query: {
      enabled: !!currentApproveHash,
    },
  });

  // Refetch data when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      refetchUserData();
      setCurrentTxHash(null);
    }
  }, [isConfirmed, refetchUserData]);

  // Refetch data when approval is confirmed
  useEffect(() => {
    if (isApproveConfirmed) {
      refetchUserData();
      setCurrentApproveHash(null);
      setIsApproving(false);
    }
  }, [isApproveConfirmed, refetchUserData]);

  const handleBuyChapter = async (track: number, chapter: number) => {
    try {
      const hash = await buyChapter(track, chapter);
      setCurrentTxHash(hash);
    } catch (error) {
      console.error('Purchase failed:', error);
      setCurrentTxHash(null);
    }
  };

  const handleApproveUsdt = async (amount: string) => {
    try {
      setIsApproving(true);
      const hash = await approveUsdt(amount);
      setCurrentApproveHash(hash);
    } catch (error) {
      console.error('Approval failed:', error);
      setCurrentApproveHash(null);
      setIsApproving(false);
    }
  };

  const chapters = Array.from({ length: 12 }, (_, i) => i + 1);

  const getChapterPrice = (chapter: number) => {
    if (!chapterPrices || chapterPrices.length === 0) return '0';
    return chapterPrices[chapter]?.toString() || '0';
  };

  const isProcessing = loading || isConfirming;
  const isApprovalProcessing = isApproving || isApproveConfirming;

  // Check if user needs to approve USDT for a specific chapter
  const needsApproval = (chapterPrice: string) => {
    if (!chapterPrice || chapterPrice === '0') return false;
    
    try {
      const priceNumber = parseFloat(formatUnits(BigInt(chapterPrice), 18));
      const allowanceNumber = parseFloat(usdtAllowance || '0');
      
      return allowanceNumber < priceNumber;
    } catch (error) {
      console.error('Error checking approval:', error);
      return false;
    }
  };

  return (
    <div className="space-y-8">
      {/* USDT Balance Info */}
      <div className="rounded-2xl border border-blue-500/20 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-slate-400">USDT Balance</h4>
            <p className="text-lg font-bold text-slate-50">{usdtBalance || '0'} USDT</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-400">Approved</h4>
            <p className="text-lg font-bold text-emerald-400">{usdtAllowance || '0'} USDT</p>
          </div>
        </div>
        {parseFloat(usdtBalance || '0') === 0 && (
          <div className="mt-2 text-sm text-amber-400">
            You need USDT to purchase chapters. Make sure you have sufficient balance.
          </div>
        )}
      </div>

      {/* Track 1 - X3 Matrix */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-6">X3 Matrix Track</h3>
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
                isUnlocked={userData?.exists && userData.track1Unlocked >= chapter}
                onPurchase={handleBuyChapter}
                onApprove={handleApproveUsdt}
                disabled={isProcessing}
                needsApproval={chapterNeedsApproval}
                isApproving={isApprovalProcessing}
              />
            );
          })}
        </div>
      </div>

      {/* Track 2 - X6 Matrix */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-6">X6 Matrix Track</h3>
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
                isUnlocked={userData?.exists && userData.track2Unlocked >= chapter}
                onPurchase={handleBuyChapter}
                onApprove={handleApproveUsdt}
                disabled={isProcessing}
                needsApproval={chapterNeedsApproval}
                isApproving={isApprovalProcessing}
              />
            );
          })}
        </div>
      </div>

      {/* Transaction Status */}
      {(isProcessing || isApprovalProcessing) && (
        <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
            <span className="text-sm text-slate-300">
              {isApprovalProcessing ? 'Approving USDT...' : 'Processing transaction...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};