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

export const useQuantuMatrix = () => {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [loading, setLoading] = useState(false);

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

  // Read contract data directly - MOVE THIS BEFORE THE MATRIX FUNCTIONS
  const readContract = useCallback(async (functionName: string, args: any[] = []) => {
    if (!publicClient) throw new Error('No public client available');
    
    try {
      const result = await publicClient.readContract({
        ...quantuMatrixContract,
        functionName: functionName as any,
        args: args,
      });
      return safeBigInt(result);
    } catch (error) {
      console.error(`Error reading contract function ${functionName}:`, error);
      throw error;
    }
  }, [publicClient]);

  // Track 1 Matrix data fetch - NOW IT CAN USE readContract
  const fetchTrack1Matrix = useCallback(async (userAddress: string, chapter: number) => {
    try {
      const data = await readContract('getTrack1', [userAddress, chapter]) as any;
      
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
  }, [readContract]);

  // Track 2 Matrix data fetch - NOW IT CAN USE readContract
  const fetchTrack2Matrix = useCallback(async (userAddress: string, chapter: number) => {
    try {
      const data = await readContract('getTrack2', [userAddress, chapter]) as any;
      
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
    } catch (error) {
      console.error('Error fetching Track2 matrix:', error);
      return {
        currentReferrer: '',
        firstLineReferrals: [],
        secondLineReferrals: [],
        blocked: false,
        reinvestCount: 0,
        closedPart: '',
      };
    }
  }, [readContract]);

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
  }, [writeContractAsync]);

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

  // Refetch all user data with toast
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
  }, [
    refetchUserExists,
    refetchReaderTotals,
    refetchReaderSummary,
    refetchRicoFarming,
    refetchRoyalty,
    refetchRoyaltyPercent,
    refetchUsdtAllowance,
    refetchUsdtBalance,
    userExists
  ]);

  // Refetch all global data with toast
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
    readContract,
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
    
    // Matrix data fetching
    fetchTrack1Matrix,
    fetchTrack2Matrix,
    
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
    
    // Toast utility (optional - for external use)
    toast,
  };
};