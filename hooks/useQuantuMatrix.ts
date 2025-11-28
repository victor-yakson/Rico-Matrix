import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { quantuMatrixContract, usdtContract } from '../utils/contracts';
import { useState, useEffect, useCallback } from 'react';
import { formatUnits, parseUnits } from 'viem';

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

  // Read reader totals - convert BigInt immediately
  const { 
    data: readerTotals, 
    refetch: refetchReaderTotals 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'getReaderTotals',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!userExists,
      select: (data) => {
        if (!data) return data;
        return safeBigInt(data);
      },
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

  // Read global stats - convert BigInt immediately
  const { 
    data: globalStats, 
    refetch: refetchGlobalStats 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'getGlobalChapterStats',
    query: {
      select: (data) => {
        if (!data) return data;
        return safeBigInt(data);
      },
    },
  });

  // Read chapter prices - convert BigInt immediately
  const { 
    data: chapterPrices, 
    refetch: refetchChapterPrices 
  } = useReadContract({
    ...quantuMatrixContract,
    functionName: 'getChapterPrices',
    query: {
      select: (data) => {
        if (!data) return data;
        // Explicitly type the data as an array
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

  // Calculate join cost (Chapter 1 for both tracks)
  const joinCost = chapterPrices && Array.isArray(chapterPrices) && chapterPrices.length > 1 
    ? (parseFloat(formatUnits(BigInt(chapterPrices[1] || '0'), 18)) * 2).toString()
    : '0';

  // Approve USDT function
  const approveUsdt = useCallback(async (amount: string) => {
    try {
      setLoading(true);
      const amountInWei = parseUnits(amount, 18);
      const hash = await writeContractAsync({
        ...usdtContract,
        functionName: 'approve',
        args: [quantuMatrixContract.address, amountInWei],
      });
      return hash;
    } catch (error) {
      console.error('Error approving USDT:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [writeContractAsync]);

  // Join library function
  const joinLibrary = useCallback(async (referrer: string) => {
    try {
      setLoading(true);
      const hash = await writeContractAsync({
        ...quantuMatrixContract,
        functionName: 'joinLibrary',
        args: [referrer as `0x${string}`],
      });
      return hash;
    } catch (error) {
      console.error('Error joining library:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [writeContractAsync]);

  // Buy chapter function
  const buyChapter = useCallback(async (track: number, chapter: number) => {
    try {
      setLoading(true);
      const hash = await writeContractAsync({
        ...quantuMatrixContract,
        functionName: 'buyNewChapter',
        args: [track, chapter],
      });
      return hash;
    } catch (error) {
      console.error('Error buying chapter:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [writeContractAsync]);

  // Claim royalty function
  const claimRoyalty = useCallback(async () => {
    try {
      setLoading(true);
      const hash = await writeContractAsync({
        ...quantuMatrixContract,
        functionName: 'claimRoyalty',
      });
      return hash;
    } catch (error) {
      console.error('Error claiming royalty:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [writeContractAsync]);

  // Read contract data directly with BigInt handling
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

  // Refetch all user data
  const refetchUserData = useCallback(() => {
    refetchUserExists();
    refetchUsdtAllowance();
    refetchUsdtBalance();
    if (userExists) {
      refetchReaderTotals();
      refetchRoyalty();
      refetchRoyaltyPercent();
    }
  }, [
    refetchUserExists, 
    refetchReaderTotals, 
    refetchRoyalty, 
    refetchRoyaltyPercent, 
    refetchUsdtAllowance,
    refetchUsdtBalance,
    userExists
  ]);

  // Format user data with proper typing and BigInt conversion
  const userData = userExists ? {
    exists: true as const,
    track1TotalEarned: readerTotals ? formatUnits(BigInt((readerTotals as any)[0] || '0'), 18) : '0',
    track2TotalEarned: readerTotals ? formatUnits(BigInt((readerTotals as any)[1] || '0'), 18) : '0',
    track1TotalCycles: readerTotals ? Number((readerTotals as any)[2] || '0') : 0,
    track2TotalCycles: readerTotals ? Number((readerTotals as any)[3] || '0') : 0,
    track1Unlocked: readerTotals ? Number((readerTotals as any)[4] || '0') : 0,
    track2Unlocked: readerTotals ? Number((readerTotals as any)[5] || '0') : 0,
    royaltyAvailable: royaltyAvailable ? formatUnits(royaltyAvailable as bigint, 18) : '0',
    royaltiesClaimed: readerTotals ? formatUnits(BigInt((readerTotals as any)[7] || '0'), 18) : '0',
    royaltyPercent: royaltyPercent ? Number(royaltyPercent) : 0,
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
    
    // Data (all BigInt values are converted to strings)
    userData,
    globalStats: globalStats as any,
    chapterPrices: chapterPrices as string[] | undefined,
    
    // USDT data
    usdtBalance: formattedUsdtBalance,
    usdtAllowance: formattedUsdtAllowance,
    joinCost,
    
    // State
    loading,
    
    // Actions
    approveUsdt,
    joinLibrary,
    buyChapter,
    claimRoyalty,
    refetchUserData,
    refetchGlobalStats,
  };
};