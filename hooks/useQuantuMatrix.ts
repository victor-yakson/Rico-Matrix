import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { quantuMatrixContract, usdtContract } from '../utils/contracts';
import { useState, useEffect, useCallback } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { toast } from 'sonner';

// Helper function to safely convert BigInt to string for serialization
const safeBigInt = (value: any): any => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(safeBigInt);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, safeBigInt(val)])
    );
  }
  return value;
};

// Helper function to convert values to numbers
const toNumber = (value: any, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

// Track2 Data interface
interface Track2Data {
  currentReferrer: string;
  firstLineReferrals: string[];
  secondLineReferrals: string[];
  blocked: boolean;
  reinvestCount: number;
  closedPart: string;
}

export const useQuantuMatrix = () => {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [loading, setLoading] = useState(false);
  const [matrixCache, setMatrixCache] = useState<{
    track1: Record<string, Record<number, any>>;
    track2: Record<string, Record<number, Track2Data>>;
  }>({ track1: {}, track2: {} });

  // Read user existence
  const { 
    data: userExists, 
    refetch: refetchUserExists 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'isReaderExists',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read reader totals
  const { 
    data: readerTotals, 
    refetch: refetchReaderTotals 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'getReaderTotals',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!userExists,
      select: safeBigInt,
    },
  });

  // Read reader summary (comprehensive data)
  const { 
    data: readerSummary, 
    refetch: refetchReaderSummary 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'getReaderSummary',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!userExists,
      select: safeBigInt,
    },
  });

  // Read RICO farming for user
  const { 
    data: ricoFarming, 
    refetch: refetchRicoFarming 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'getRicoFarming',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!userExists,
      select: safeBigInt,
    },
  });

  // Read royalty available
  const { 
    data: royaltyAvailable, 
    refetch: refetchRoyalty 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'viewRoyalty',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!userExists,
    },
  });

  // Read royalty percent
  const { 
    data: royaltyPercent, 
    refetch: refetchRoyaltyPercent 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'viewRoyaltyPercent',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!userExists,
    },
  });

  // Read global stats
  const { 
    data: globalStats, 
    refetch: refetchGlobalStats 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'getGlobalChapterStats',
    query: {
      select: safeBigInt,
    },
  });

  // Read global summary
  const { 
    data: globalSummary, 
    refetch: refetchGlobalSummary 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'getGlobalSummary',
    query: {
      select: safeBigInt,
    },
  });

  // Read global RICO farming
  const { 
    data: globalRicoFarming, 
    refetch: refetchGlobalRicoFarming 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'getRicoFarmingGlobal',
    query: {
      select: safeBigInt,
    },
  });

  // Read top earners leaderboard
  const { 
    data: topEarners, 
    refetch: refetchTopEarners 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'getTopEarners',
    query: {
      select: safeBigInt,
    },
  });

  // Read top referrers leaderboard
  const { 
    data: topReferrers, 
    refetch: refetchTopReferrers 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'getTopReferrers',
    query: {
      select: safeBigInt,
    },
  });

  // Read chapter prices
  const { 
    data: chapterPrices, 
    refetch: refetchChapterPrices 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'getChapterPrices',
    query: {
      select: (data) => {
        if (!data) return data;
        const pricesArray = data as readonly bigint[];
        return pricesArray.map(price => price.toString());
      },
    },
  });

  // Read USDT allowance
  const { 
    data: usdtAllowance, 
    refetch: refetchUsdtAllowance 
  } = useReadContract({
    ...usdtContract,
    functionName: 'allowance',
    args: address ? [address, quantuMatrixContract.address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read USDT balance
  const { 
    data: usdtBalance, 
    refetch: refetchUsdtBalance 
  } = useReadContract({
    ...usdtContract,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read token addresses
  const { 
    data: usdtAddress 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'usdt',
  });

  const { 
    data: rewardTokenAddress 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'rewardToken',
  });

  // Calculate join cost
  const joinCost = chapterPrices && Array.isArray(chapterPrices) && chapterPrices.length > 1 
    ? (parseFloat(formatUnits(BigInt(chapterPrices[1] || '0'), 18)) * 2).toString()
    : '0';

  // Process Track2 data
  const processTrack2Data = (data: any): Track2Data => {
    if (data && Array.isArray(data) && data.length >= 6) {
      return {
        currentReferrer: data[0] || '',
        firstLineReferrals: Array.isArray(data[1]) ? data[1] : [],
        secondLineReferrals: Array.isArray(data[2]) ? data[2] : [],
        blocked: Boolean(data[3]),
        reinvestCount: toNumber(data[4], 0),
        closedPart: data[5] || '',
      };
    }
    
    return {
      currentReferrer: '',
      firstLineReferrals: [],
      secondLineReferrals: [],
      blocked: false,
      reinvestCount: 0,
      closedPart: '',
    };
  };

  // Bulk fetch all Track2 chapters - MOST EFFICIENT METHOD
  const fetchAllTrack2Chapters = useCallback(async (
    userAddress: string, 
    maxChapters: number
  ): Promise<Record<number, Track2Data>> => {
    if (!publicClient || !userAddress || maxChapters <= 0) {
      return {};
    }

    try {
      // Create cache key
      const cacheKey = `${userAddress}-${maxChapters}`;
      
      // Check cache first
      if (matrixCache.track2[cacheKey]) {
        return matrixCache.track2[cacheKey];
      }

      // Create array of chapter numbers to fetch
      const chapters = Array.from({ length: maxChapters }, (_, i) => i + 1);
      
      // Batch size - adjust based on your RPC limits
      const BATCH_SIZE = 5;
      const results: Record<number, Track2Data> = {};
      
      // Process in batches
      for (let i = 0; i < chapters.length; i += BATCH_SIZE) {
        const batch = chapters.slice(i, i + BATCH_SIZE);
        
        // Create promises for this batch
        const batchPromises = batch.map(chapter => 
          publicClient.readContract({
            ...quantuMatrixContract,
            functionName: 'getTrack2',
            args: [userAddress, chapter],
          }).catch(error => {
            console.error(`Error fetching chapter ${chapter}:`, error);
            return null;
          })
        );

        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Process batch results
        batchResults.forEach((result, batchIndex) => {
          const chapter = batch[i + batchIndex];
          if (result) {
            results[chapter] = processTrack2Data(result);
          } else {
            results[chapter] = {
              currentReferrer: '',
              firstLineReferrals: [],
              secondLineReferrals: [],
              blocked: false,
              reinvestCount: 0,
              closedPart: '',
            };
          }
        });

        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < chapters.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Update cache
      setMatrixCache(prev => ({
        ...prev,
        track2: {
          ...prev.track2,
          [cacheKey]: results
        }
      }));

      return results;
    } catch (error) {
      console.error('Error fetching all Track2 chapters:', error);
      throw error;
    }
  }, [publicClient, matrixCache.track2]);

  // Single chapter fetch (for retries or specific needs)
  const fetchTrack2Matrix = useCallback(async (userAddress: string, chapter: number): Promise<Track2Data> => {
    if (!publicClient || !userAddress) {
      return {
        currentReferrer: '',
        firstLineReferrals: [],
        secondLineReferrals: [],
        blocked: false,
        reinvestCount: 0,
        closedPart: '',
      };
    }

    try {
      const data = await publicClient.readContract({
        ...quantuMatrixContract,
        functionName: 'getTrack2',
        args: [userAddress, chapter],
      });

      return processTrack2Data(data);
    } catch (error) {
      console.error(`Error fetching Track2 chapter ${chapter}:`, error);
      return {
        currentReferrer: '',
        firstLineReferrals: [],
        secondLineReferrals: [],
        blocked: false,
        reinvestCount: 0,
        closedPart: '',
      };
    }
  }, [publicClient]);

  // Track1 matrix functions (if needed)
  const fetchTrack1Matrix = useCallback(async (userAddress: string, chapter: number) => {
    if (!publicClient || !userAddress) {
      return {
        currentReferrer: '',
        referrals: [],
        blocked: false,
        reinvestCount: 0,
      };
    }

    try {
      const data = await publicClient.readContract({
        ...quantuMatrixContract,
        functionName: 'getTrack1',
        args: [userAddress, chapter],
      }) as any;
      
      if (data && Array.isArray(data) && data.length >= 4) {
        return {
          currentReferrer: data[0] || '',
          referrals: Array.isArray(data[1]) ? data[1] : [],
          blocked: Boolean(data[2]),
          reinvestCount: toNumber(data[3], 0),
        };
      }
      
      return {
        currentReferrer: '',
        referrals: [],
        blocked: false,
        reinvestCount: 0,
      };
    } catch (error) {
      console.error('Error fetching Track1 matrix:', error);
      return {
        currentReferrer: '',
        referrals: [],
        blocked: false,
        reinvestCount: 0,
      };
    }
  }, [publicClient]);

  // Bulk fetch Track1 chapters
  const fetchAllTrack1Chapters = useCallback(async (
    userAddress: string, 
    maxChapters: number
  ): Promise<Record<number, any>> => {
    if (!publicClient || !userAddress || maxChapters <= 0) {
      return {};
    }

    try {
      const cacheKey = `${userAddress}-${maxChapters}`;
      
      if (matrixCache.track1[cacheKey]) {
        return matrixCache.track1[cacheKey];
      }

      const chapters = Array.from({ length: maxChapters }, (_, i) => i + 1);
      const BATCH_SIZE = 5;
      const results: Record<number, any> = {};
      
      for (let i = 0; i < chapters.length; i += BATCH_SIZE) {
        const batch = chapters.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(chapter => 
          publicClient.readContract({
            ...quantuMatrixContract,
            functionName: 'getTrack1',
            args: [userAddress, chapter],
          }).catch(error => {
            console.error(`Error fetching Track1 chapter ${chapter}:`, error);
            return null;
          })
        );

        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach((result, batchIndex) => {
          const chapter = batch[i + batchIndex];
          if (result && Array.isArray(result) && result.length >= 4) {
            results[chapter] = {
              currentReferrer: result[0] || '',
              referrals: Array.isArray(result[1]) ? result[1] : [],
              blocked: Boolean(result[2]),
              reinvestCount: toNumber(result[3], 0),
            };
          } else {
            results[chapter] = {
              currentReferrer: '',
              referrals: [],
              blocked: false,
              reinvestCount: 0,
            };
          }
        });

        if (i + BATCH_SIZE < chapters.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      setMatrixCache(prev => ({
        ...prev,
        track1: {
          ...prev.track1,
          [cacheKey]: results
        }
      }));

      return results;
    } catch (error) {
      console.error('Error fetching all Track1 chapters:', error);
      throw error;
    }
  }, [publicClient, matrixCache.track1]);

  // Clear matrix cache for a user
  const clearMatrixCache = useCallback((userAddress: string) => {
    setMatrixCache(prev => {
      const newCache = { ...prev };
      Object.keys(newCache.track1).forEach(key => {
        if (key.startsWith(userAddress)) {
          delete newCache.track1[key];
        }
      });
      Object.keys(newCache.track2).forEach(key => {
        if (key.startsWith(userAddress)) {
          delete newCache.track2[key];
        }
      });
      return newCache;
    });
  }, []);

  // Clear all cache
  const clearAllCache = useCallback(() => {
    setMatrixCache({ track1: {}, track2: {} });
  }, []);

  // Approve USDT function with toast notifications
  const approveUsdt = useCallback(async (amount: string) => {
    try {
      setLoading(true);
      const amountInWei = parseUnits(amount, 18);
      
      toast.info('Approving USDT...', {
        description: 'Please confirm the transaction in your wallet.',
        duration: 3000,
      });

      const hash = await writeContractAsync({
        ...usdtContract,
        functionName: 'approve',
        args: [quantuMatrixContract.address, amountInWei],
      });

      toast.success('Transaction Submitted!', {
        description: `Transaction hash: ${hash.slice(0, 8)}...`,
        duration: 5000,
      });

      return hash;
    } catch (error: any) {
      console.error('Error approving USDT:', error);
      
      let errorMessage = 'Failed to approve USDT';
      if (error?.message?.includes('rejected')) {
        errorMessage = 'Transaction was rejected in your wallet';
      } else if (error?.message?.includes('insufficient')) {
        errorMessage = 'Insufficient USDT balance';
      }

      toast.error('Approval Failed', {
        description: errorMessage,
        duration: 5000,
      });

      throw error;
    } finally {
      setLoading(false);
    }
  }, [writeContractAsync]);

  // Join library function with toast notifications
  const joinLibrary = useCallback(async (referrer: string) => {
    try {
      setLoading(true);
      
      toast.info('Joining RICOMATRIX...', {
        description: 'Please confirm the transaction in your wallet.',
        duration: 3000,
      });

      const hash = await writeContractAsync({
        ...quantuMatrixContract,
        functionName: 'joinLibrary',
        args: [referrer as `0x${string}`],
      });

      toast.success('Registration Submitted!', {
        description: `Welcome to RICOMATRIX! Transaction: ${hash.slice(0, 8)}...`,
        duration: 5000,
      });

      return hash;
    } catch (error: any) {
      console.error('Error joining library:', error);
      
      let errorMessage = 'Failed to join library';
      if (error?.message?.includes('rejected')) {
        errorMessage = 'Transaction was rejected in your wallet';
      } else if (error?.message?.includes('insufficient')) {
        errorMessage = 'Insufficient USDT balance or allowance';
      } else if (error?.message?.includes('ReaderExists')) {
        errorMessage = 'You are already registered';
      }

      toast.error('Registration Failed', {
        description: errorMessage,
        duration: 5000,
      });

      throw error;
    } finally {
      setLoading(false);
    }
  }, [writeContractAsync]);

  // Buy chapter function with toast notifications
  const buyChapter = useCallback(async (track: number, chapter: number) => {
    try {
      setLoading(true);
      
      const trackName = track === 1 ? 'Track 1 (X3)' : 'Track 2 (X6)';
      
      toast.info('Purchasing Chapter...', {
        description: `Buying Chapter ${chapter} of ${trackName}. Please confirm in wallet.`,
        duration: 3000,
      });

      const hash = await writeContractAsync({
        ...quantuMatrixContract,
        functionName: 'buyNewChapter',
        args: [track, chapter],
      });

      toast.success('Chapter Purchase Submitted!', {
        description: `Chapter ${chapter} purchase in progress. Transaction: ${hash.slice(0, 8)}...`,
        duration: 5000,
      });

      // Clear cache after purchase
      if (address) {
        clearMatrixCache(address);
      }

      return hash;
    } catch (error: any) {
      console.error('Error buying chapter:', error);
      
      let errorMessage = 'Failed to purchase chapter';
      if (error?.message?.includes('rejected')) {
        errorMessage = 'Transaction was rejected in your wallet';
      } else if (error?.message?.includes('insufficient')) {
        errorMessage = 'Insufficient USDT balance or allowance';
      } else if (error?.message?.includes('PreviousChapterRequired')) {
        errorMessage = 'You need to unlock the previous chapter first';
      } else if (error?.message?.includes('ChapterAlreadyUnlocked')) {
        errorMessage = 'This chapter is already unlocked';
      }

      toast.error('Purchase Failed', {
        description: errorMessage,
        duration: 5000,
      });

      throw error;
    } finally {
      setLoading(false);
    }
  }, [writeContractAsync, address, clearMatrixCache]);

  // Claim royalty function with toast notifications
  const claimRoyalty = useCallback(async () => {
    try {
      setLoading(true);
      
      toast.info('Claiming Royalty...', {
        description: 'Please confirm the transaction in your wallet.',
        duration: 3000,
      });

      const hash = await writeContractAsync({
        ...quantuMatrixContract,
        functionName: 'claimRoyalty',
      });

      toast.success('Royalty Claim Submitted!', {
        description: `Royalty claim in progress. Transaction: ${hash.slice(0, 8)}...`,
        duration: 5000,
      });

      return hash;
    } catch (error: any) {
      console.error('Error claiming royalty:', error);
      
      let errorMessage = 'Failed to claim royalty';
      if (error?.message?.includes('rejected')) {
        errorMessage = 'Transaction was rejected in your wallet';
      } else if (error?.message?.includes('NoRoyalty')) {
        errorMessage = 'No royalty available to claim';
      }

      toast.error('Claim Failed', {
        description: errorMessage,
        duration: 5000,
      });

      throw error;
    } finally {
      setLoading(false);
    }
  }, [writeContractAsync]);

  // Refetch all user data
  const refetchUserData = useCallback(() => {
    refetchUserExists();
    refetchUsdtAllowance();
    refetchUsdtBalance();
    if (userExists) {
      refetchReaderTotals();
      refetchReaderSummary();
      refetchRicoFarming();
      refetchRoyalty();
      refetchRoyaltyPercent();
    }
    
    // Clear cache on refetch
    if (address) {
      clearMatrixCache(address);
    }
  }, [
    refetchUserExists,
    refetchReaderTotals,
    refetchReaderSummary,
    refetchRicoFarming,
    refetchRoyalty,
    refetchRoyaltyPercent,
    refetchUsdtAllowance,
    refetchUsdtBalance,
    userExists,
    address,
    clearMatrixCache
  ]);

  // Refetch all global data
  const refetchAllData = useCallback(() => {
    toast.info('Refreshing all data...', {
      duration: 2000,
    });
    
    refetchUserData();
    refetchGlobalStats();
    refetchGlobalSummary();
    refetchGlobalRicoFarming();
    refetchTopEarners();
    refetchTopReferrers();
    refetchChapterPrices();
    
    toast.success('Data refreshed!', {
      duration: 2000,
    });
  }, [
    refetchUserData,
    refetchGlobalStats,
    refetchGlobalSummary,
    refetchGlobalRicoFarming,
    refetchTopEarners,
    refetchTopReferrers,
    refetchChapterPrices,
  ]);

  // Format user data
  const userData = userExists ? {
    exists: true as const,
    // Basic totals
    track1TotalEarned: readerTotals ? formatUnits(BigInt((readerTotals as any)[0] || '0'), 18) : '0',
    track2TotalEarned: readerTotals ? formatUnits(BigInt((readerTotals as any)[1] || '0'), 18) : '0',
    track1TotalCycles: readerTotals ? Number((readerTotals as any)[2] || '0') : 0,
    track2TotalCycles: readerTotals ? Number((readerTotals as any)[3] || '0') : 0,
    track1Unlocked: readerTotals ? Number((readerTotals as any)[4] || '0') : 0,
    track2Unlocked: readerTotals ? Number((readerTotals as any)[5] || '0') : 0,
    
    // Royalty
    royaltyAvailable: royaltyAvailable ? formatUnits(royaltyAvailable as bigint, 18) : '0',
    royaltiesClaimed: readerTotals ? formatUnits(BigInt((readerTotals as any)[7] || '0'), 18) : '0',
    royaltyPercent: royaltyPercent ? Number(royaltyPercent) : 0,
    
    // RICO Farming
    ricoShouldHave: ricoFarming ? formatUnits(BigInt((ricoFarming as any)[0] || '0'), 18) : '0',
    ricoSent: ricoFarming ? formatUnits(BigInt((ricoFarming as any)[1] || '0'), 18) : '0',
    ricoPending: ricoFarming ? formatUnits(BigInt((ricoFarming as any)[2] || '0'), 18) : '0',
    
    // Reader Summary data (if available)
    ...(readerSummary ? {
      readerId: (readerSummary as any).id?.toString(),
      referrer: (readerSummary as any).referrer,
      partnersCount: (readerSummary as any).partnersCount?.toString(),
      track1TotalEarnedFromSummary: formatUnits(BigInt((readerSummary as any).track1TotalEarned || '0'), 18),
      track2TotalEarnedFromSummary: formatUnits(BigInt((readerSummary as any).track2TotalEarned || '0'), 18),
    } : {}),
  } : { 
    exists: false as const 
  };

  const formattedUsdtBalance = usdtBalance ? formatUnits(usdtBalance as bigint, 18) : '0';
  const formattedUsdtAllowance = usdtAllowance ? formatUnits(usdtAllowance as bigint, 18) : '0';

  return {
    // Contract interaction methods
    writeContract: writeContractAsync,
    contractConfig: quantuMatrixContract,
    
    // Data
    userData,
    globalStats: globalStats as any,
    globalSummary: globalSummary as any,
    globalRicoFarming: globalRicoFarming as any,
    topEarners: topEarners as any,
    topReferrers: topReferrers as any,
    chapterPrices: chapterPrices as string[] | undefined,
    
    // Token addresses
    usdtAddress: usdtAddress as `0x${string}` | undefined,
    rewardTokenAddress: rewardTokenAddress as `0x${string}` | undefined,
    
    // USDT data
    usdtBalance: formattedUsdtBalance,
    usdtAllowance: formattedUsdtAllowance,
    joinCost,
    
    // Matrix data fetching - BULK OPTIMIZED
    fetchTrack1Matrix,
    fetchTrack2Matrix,
    fetchAllTrack1Chapters,
    fetchAllTrack2Chapters,
    
    // Cache management
    clearMatrixCache,
    clearAllCache,
    matrixCache,
    
    // State
    loading,
    
    // Actions
    approveUsdt,
    joinLibrary,
    buyChapter,
    claimRoyalty,
    refetchUserData,
    refetchAllData,
    refetchGlobalStats,
    refetchGlobalSummary,
    refetchGlobalRicoFarming,
  };
};