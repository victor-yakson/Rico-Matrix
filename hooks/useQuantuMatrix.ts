import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { quantuMatrixContract, usdtContract } from "../utils/contracts";
import { useState, useCallback } from "react";
import { formatUnits, parseUnits } from "viem";
import { toast } from "sonner";
import { TOKEN_CONTRACT_ADDRESS } from "@/utils/constants";

// Helper function to safely convert BigInt to string for serialization
const safeBigInt = (value: any): any => {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(safeBigInt);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, safeBigInt(val)])
    );
  }
  return value;
};

// Helper function to convert values to numbers
const toNumber = (value: any, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
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

// Migration Status interface
interface MigrationStatus {
  status: number; // 0 = Not found in V1, 1 = Found in V1 but not migrated, 2 = Migrated ✅
}

// Migration Data interface
interface MigrationData {
  status: number;
  v1RoyaltyPercent: number;
  legacyClaimable: string;
  v2Claimable: string;
  totalClaimable: string;
  shouldMigrate: boolean; // status === 1
  canClaimLegacy: boolean; // legacyClaimable > 0
  hasV1: boolean; // status === 1 || status === 2
}

interface UserData {
  exists: boolean;
  // From readerSummary
  readerId: string;
  referrer: string;
  partnersCount: string;
  track1TotalEarned: string;
  track2TotalEarned: string;
  track1TotalCycles: number;
  track2TotalCycles: number;
  track1Unlocked: number;
  track2Unlocked: number;
  royaltyAvailable: string;
  royaltiesClaimed: string;
  royaltyPercent: number;
  ricoShouldHave: string;
  ricoSent: string;
  ricoPending: string;
  // Migration data
  migrationStatus?: MigrationStatus;
  migrationData?: MigrationData;
}

export const useQuantuMatrix = () => {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [loading, setLoading] = useState(false);
  const rewardTokenAddress = TOKEN_CONTRACT_ADDRESS;
  const [matrixCache, setMatrixCache] = useState<{
    track1: Record<string, Record<number, any>>;
    track2: Record<string, Record<number, Track2Data>>;
  }>({ track1: {}, track2: {} });

  // Read user existence
  const { data: userExists, refetch: refetchUserExists } = useReadContract({
    ...quantuMatrixContract,
    functionName: "isReaderExists",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read reader totals
  const { data: readerTotals, refetch: refetchReaderTotals } = useReadContract({
    ...quantuMatrixContract,
    functionName: "getReaderTotals",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!userExists,
      select: safeBigInt,
    },
  });

  // Read reader summary (comprehensive data)
  const { data: readerSummary, refetch: refetchReaderSummary } =
    useReadContract({
      ...quantuMatrixContract,
      functionName: "getReaderSummary",
      args: address ? [address] : undefined,
      query: {
        enabled: !!address && !!userExists,
        select: safeBigInt,
      },
    });

  // Read RICO farming for user
  const { data: ricoFarming, refetch: refetchRicoFarming } = useReadContract({
    ...quantuMatrixContract,
    functionName: "getRicoFarming",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!userExists,
      select: safeBigInt,
    },
  });

  // Read royalty available (V1 style)
  const { data: royaltyAvailable, refetch: refetchRoyalty } = useReadContract({
    ...quantuMatrixContract,
    functionName: "viewRoyalty",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!userExists,
    },
  });

  // Read royalty percent (V1 style)
  const { data: royaltyPercent, refetch: refetchRoyaltyPercent } =
    useReadContract({
      ...quantuMatrixContract,
      functionName: "viewRoyaltyPercent",
      args: address ? [address] : undefined,
      query: {
        enabled: !!address && !!userExists,
      },
    });

  // Read migration status
  const { data: migrationStatusData, refetch: refetchMigrationStatus } =
    useReadContract({
      ...quantuMatrixContract,
      functionName: "migrationStatus",
      args: address ? [address] : undefined,
      query: {
        enabled: !!address,
      },
    });

  // Read migration and royalty UI (combined function)
  const { data: migrationAndRoyaltyUI, refetch: refetchMigrationAndRoyaltyUI } =
    useReadContract({
      ...quantuMatrixContract,
      functionName: "getMigrationAndRoyaltyUI",
      args: address ? [address] : undefined,
      query: {
        enabled: !!address,
        select: safeBigInt,
      },
    });

  // Read legacy claimable
  const { data: legacyClaimable, refetch: refetchLegacyClaimable } =
    useReadContract({
      ...quantuMatrixContract,
      functionName: "viewLegacyClaimable",
      args: address ? [address] : undefined,
      query: {
        enabled: !!address,
      },
    });

  // Read royalty V2 (fresh V2 royalty)
  const { data: royaltyV2, refetch: refetchRoyaltyV2 } = useReadContract({
    ...quantuMatrixContract,
    functionName: "viewRoyaltyV2",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read royalty percent V2
  const { data: royaltyPercentV2, refetch: refetchRoyaltyPercentV2 } =
    useReadContract({
      ...quantuMatrixContract,
      functionName: "viewRoyaltyPercentV2",
      args: address ? [address] : undefined,
      query: {
        enabled: !!address,
      },
    });

  // Read RICO pending
  const { data: ricoPending, refetch: refetchRicoPending } = useReadContract({
    ...quantuMatrixContract,
    functionName: "viewRicoPending",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read global stats
  const { data: globalStats, refetch: refetchGlobalStats } = useReadContract({
    ...quantuMatrixContract,
    functionName: "getGlobalChapterStats",
    query: {
      select: safeBigInt,
    },
  });

  // Read global summary
  const { data: globalSummary, refetch: refetchGlobalSummary } =
    useReadContract({
      ...quantuMatrixContract,
      functionName: "getGlobalSummary",
      query: {
        select: safeBigInt,
      },
    });

  // Read global RICO farming
  const { data: globalRicoFarming, refetch: refetchGlobalRicoFarming } =
    useReadContract({
      ...quantuMatrixContract,
      functionName: "getRicoFarmingGlobal",
      query: {
        select: safeBigInt,
      },
    });

  // Read top earners leaderboard
  const { data: topEarners, refetch: refetchTopEarners } = useReadContract({
    ...quantuMatrixContract,
    functionName: "getTopEarners",
    query: {
      select: safeBigInt,
    },
  });

  // Read top referrers leaderboard
  const { data: topReferrers, refetch: refetchTopReferrers } = useReadContract({
    ...quantuMatrixContract,
    functionName: "getTopReferrers",
    query: {
      select: safeBigInt,
    },
  });

  // Read chapter prices
  const { data: chapterPrices, refetch: refetchChapterPrices } =
    useReadContract({
      ...quantuMatrixContract,
      functionName: "getChapterPrices",
      query: {
        select: (data) => {
          if (!data) return data;
          const pricesArray = data as readonly bigint[];
          return pricesArray.map((price) => price.toString());
        },
      },
    });

  // Read USDT allowance
  const { data: usdtAllowance, refetch: refetchUsdtAllowance } =
    useReadContract({
      ...usdtContract,
      functionName: "allowance",
      args: address ? [address, quantuMatrixContract.address] : undefined,
      query: {
        enabled: !!address,
      },
    });

  // Read USDT balance
  const { data: usdtBalance, refetch: refetchUsdtBalance } = useReadContract({
    ...usdtContract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read token addresses
  const { data: usdtAddress } = useReadContract({
    ...quantuMatrixContract,
    functionName: "usdt",
  });

  // Calculate join cost
  const joinCost =
    chapterPrices && Array.isArray(chapterPrices) && chapterPrices.length > 1
      ? (
          parseFloat(formatUnits(BigInt(chapterPrices[1] || "0"), 18)) * 2
        ).toString()
      : "0";

  // Process Track2 data
  const processTrack2Data = (data: any): Track2Data => {
    if (data && Array.isArray(data) && data.length >= 6) {
      return {
        currentReferrer: data[0] || "",
        firstLineReferrals: Array.isArray(data[1]) ? data[1] : [],
        secondLineReferrals: Array.isArray(data[2]) ? data[2] : [],
        blocked: Boolean(data[3]),
        reinvestCount: toNumber(data[4], 0),
        closedPart: data[5] || "",
      };
    }

    return {
      currentReferrer: "",
      firstLineReferrals: [],
      secondLineReferrals: [],
      blocked: false,
      reinvestCount: 0,
      closedPart: "",
    };
  };

  // Process migration status
  const processMigrationStatus = (data: any): MigrationStatus => {
    if (data !== undefined && data !== null) {
      const status = toNumber(data, 0);
      return { status };
    }
    return { status: 0 };
  };

  // Process migration and royalty UI data
  const processMigrationAndRoyaltyUI = (data: any) => {
    if (data && Array.isArray(data) && data.length >= 5) {
      const [
        status,
        v1RoyaltyPercent,
        legacyClaimable,
        v2Claimable,
        totalClaimable,
      ] = data;
      return {
        status: toNumber(status, 0),
        v1RoyaltyPercent: toNumber(v1RoyaltyPercent, 0),
        legacyClaimable: formatUnits(
          BigInt(legacyClaimable?.toString() || "0"),
          18
        ),
        v2Claimable: formatUnits(BigInt(v2Claimable?.toString() || "0"), 18),
        totalClaimable: formatUnits(
          BigInt(totalClaimable?.toString() || "0"),
          18
        ),
      };
    }
    return {
      status: 0,
      v1RoyaltyPercent: 0,
      legacyClaimable: "0",
      v2Claimable: "0",
      totalClaimable: "0",
    };
  };

  // Process migration data
  const processMigrationData = (data: any): MigrationData => {
    const migrationUI = processMigrationAndRoyaltyUI(data);

    return {
      ...migrationUI,
      shouldMigrate: migrationUI.status === 1,
      canClaimLegacy: parseFloat(migrationUI.legacyClaimable) > 0,
      hasV1: migrationUI.status === 1 || migrationUI.status === 2,
    };
  };

  // Bulk fetch all Track2 chapters
  const fetchAllTrack2Chapters = useCallback(
    async (
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
          const batchPromises = batch.map((chapter) =>
            publicClient
              .readContract({
                ...quantuMatrixContract,
                functionName: "getTrack2",
                args: [userAddress, chapter],
              })
              .catch((error) => {
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
                currentReferrer: "",
                firstLineReferrals: [],
                secondLineReferrals: [],
                blocked: false,
                reinvestCount: 0,
                closedPart: "",
              };
            }
          });

          // Small delay between batches to avoid rate limiting
          if (i + BATCH_SIZE < chapters.length) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }

        // Update cache
        setMatrixCache((prev) => ({
          ...prev,
          track2: {
            ...prev.track2,
            [cacheKey]: results,
          },
        }));

        return results;
      } catch (error) {
        console.error("Error fetching all Track2 chapters:", error);
        throw error;
      }
    },
    [publicClient, matrixCache.track2]
  );

  // Single chapter fetch
  const fetchTrack2Matrix = useCallback(
    async (userAddress: string, chapter: number): Promise<Track2Data> => {
      if (!publicClient || !userAddress) {
        return {
          currentReferrer: "",
          firstLineReferrals: [],
          secondLineReferrals: [],
          blocked: false,
          reinvestCount: 0,
          closedPart: "",
        };
      }

      try {
        const data = await publicClient.readContract({
          ...quantuMatrixContract,
          functionName: "getTrack2",
          args: [userAddress, chapter],
        });

        return processTrack2Data(data);
      } catch (error) {
        console.error(`Error fetching Track2 chapter ${chapter}:`, error);
        return {
          currentReferrer: "",
          firstLineReferrals: [],
          secondLineReferrals: [],
          blocked: false,
          reinvestCount: 0,
          closedPart: "",
        };
      }
    },
    [publicClient]
  );

  // Track1 matrix functions
  const fetchTrack1Matrix = useCallback(
    async (userAddress: string, chapter: number) => {
      if (!publicClient || !userAddress) {
        return {
          currentReferrer: "",
          referrals: [],
          blocked: false,
          reinvestCount: 0,
        };
      }

      try {
        const data = (await publicClient.readContract({
          ...quantuMatrixContract,
          functionName: "getTrack1",
          args: [userAddress, chapter],
        })) as any;

        if (data && Array.isArray(data) && data.length >= 4) {
          return {
            currentReferrer: data[0] || "",
            referrals: Array.isArray(data[1]) ? data[1] : [],
            blocked: Boolean(data[2]),
            reinvestCount: toNumber(data[3], 0),
          };
        }

        return {
          currentReferrer: "",
          referrals: [],
          blocked: false,
          reinvestCount: 0,
        };
      } catch (error) {
        console.error("Error fetching Track1 matrix:", error);
        return {
          currentReferrer: "",
          referrals: [],
          blocked: false,
          reinvestCount: 0,
        };
      }
    },
    [publicClient]
  );

  // Bulk fetch Track1 chapters
  const fetchAllTrack1Chapters = useCallback(
    async (
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

          const batchPromises = batch.map((chapter) =>
            publicClient
              .readContract({
                ...quantuMatrixContract,
                functionName: "getTrack1",
                args: [userAddress, chapter],
              })
              .catch((error) => {
                console.error(
                  `Error fetching Track1 chapter ${chapter}:`,
                  error
                );
                return null;
              })
          );

          const batchResults = await Promise.all(batchPromises);

          batchResults.forEach((result, batchIndex) => {
            const chapter = batch[i + batchIndex];
            if (result && Array.isArray(result) && result.length >= 4) {
              results[chapter] = {
                currentReferrer: result[0] || "",
                referrals: Array.isArray(result[1]) ? result[1] : [],
                blocked: Boolean(result[2]),
                reinvestCount: toNumber(result[3], 0),
              };
            } else {
              results[chapter] = {
                currentReferrer: "",
                referrals: [],
                blocked: false,
                reinvestCount: 0,
              };
            }
          });

          if (i + BATCH_SIZE < chapters.length) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }

        setMatrixCache((prev) => ({
          ...prev,
          track1: {
            ...prev.track1,
            [cacheKey]: results,
          },
        }));

        return results;
      } catch (error) {
        console.error("Error fetching all Track1 chapters:", error);
        throw error;
      }
    },
    [publicClient, matrixCache.track1]
  );

  // Find free Track1 referrer
  const findFreeTrack1Referrer = useCallback(
    async (userAddress: string, chapter: number): Promise<string> => {
      const toastId = "find-free-track1-referrer";

      try {
        if (!publicClient) {
          throw new Error("Wallet client not available");
        }

        const result = await publicClient.readContract({
          ...quantuMatrixContract,
          functionName: "findFreeTrack1Referrer",
          args: [userAddress as `0x${string}`, chapter],
        });

        return result as string;
      } catch (error: any) {
        console.error("Error finding free Track1 referrer:", error);
        toast.error("Failed to find referrer", {
          id: toastId,
          description: error.message,
        });
        throw error;
      }
    },
    [publicClient]
  );

  // Find free Track2 referrer
  const findFreeTrack2Referrer = useCallback(
    async (userAddress: string, chapter: number): Promise<string> => {
      const toastId = "find-free-track2-referrer";

      try {
        if (!publicClient) {
          throw new Error("Wallet client not available");
        }

        const result = await publicClient.readContract({
          ...quantuMatrixContract,
          functionName: "findFreeTrack2Referrer",
          args: [userAddress as `0x${string}`, chapter],
        });

        return result as string;
      } catch (error: any) {
        console.error("Error finding free Track2 referrer:", error);
        toast.error("Failed to find referrer", {
          id: toastId,
          description: error.message,
        });
        throw error;
      }
    },
    [publicClient]
  );

  // Clear matrix cache for a user
  const clearMatrixCache = useCallback((userAddress: string) => {
    setMatrixCache((prev) => {
      const newCache = { ...prev };
      Object.keys(newCache.track1).forEach((key) => {
        if (key.startsWith(userAddress)) {
          delete newCache.track1[key];
        }
      });
      Object.keys(newCache.track2).forEach((key) => {
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

  // Parse user data from multiple sources
  const parseUserDataFromMultipleSources = () => {
    if (!userExists) {
      return {
        exists: false,
        readerId: "0",
        referrer: address || "",
        partnersCount: "0",
        track1TotalEarned: "0",
        track2TotalEarned: "0",
        track1TotalCycles: 0,
        track2TotalCycles: 0,
        track1Unlocked: 0,
        track2Unlocked: 0,
        royaltyAvailable: "0",
        royaltiesClaimed: "0",
        royaltyPercent: 0,
        ricoShouldHave: "0",
        ricoSent: "0",
        ricoPending: "0",
      };
    }

    // Get migration and royalty UI data first
    const migrationUI = processMigrationAndRoyaltyUI(migrationAndRoyaltyUI);

    // Use readerSummary as primary source
    if (readerSummary) {
      return {
        exists: true,
        readerId: (readerSummary as any).id?.toString() || "0",
        referrer: (readerSummary as any).referrer || address || "",
        partnersCount: (readerSummary as any).partnersCount?.toString() || "0",
        track1TotalEarned: formatUnits(
          BigInt((readerSummary as any).track1TotalEarned || "0"),
          18
        ),
        track2TotalEarned: formatUnits(
          BigInt((readerSummary as any).track2TotalEarned || "0"),
          18
        ),
        track1TotalCycles: Number(
          (readerSummary as any).track1TotalCycles || "0"
        ),
        track2TotalCycles: Number(
          (readerSummary as any).track2TotalCycles || "0"
        ),
        track1Unlocked: Number((readerSummary as any).track1Unlocked || "0"),
        track2Unlocked: Number((readerSummary as any).track2Unlocked || "0"),
        royaltyAvailable: migrationUI.totalClaimable,
        royaltiesClaimed: formatUnits(
          BigInt((readerSummary as any).royaltyClaimed || "0"),
          18
        ),
        royaltyPercent: Number((readerSummary as any).royaltyPercent || "0"),
        ricoShouldHave: formatUnits(
          BigInt((readerSummary as any).ricoShouldHave || "0"),
          18
        ),
        ricoSent: formatUnits(
          BigInt((readerSummary as any).ricoSent || "0"),
          18
        ),
        ricoPending: formatUnits(
          BigInt((readerSummary as any).ricoPending || "0"),
          18
        ),
      };
    }

    // Fallback to individual data sources
    return {
      exists: true,
      readerId: "0",
      referrer: address || "",
      partnersCount: "0",
      track1TotalEarned: readerTotals
        ? formatUnits(BigInt((readerTotals as any)[0] || "0"), 18)
        : "0",
      track2TotalEarned: readerTotals
        ? formatUnits(BigInt((readerTotals as any)[1] || "0"), 18)
        : "0",
      track1TotalCycles: readerTotals
        ? Number((readerTotals as any)[2] || "0")
        : 0,
      track2TotalCycles: readerTotals
        ? Number((readerTotals as any)[3] || "0")
        : 0,
      track1Unlocked: readerTotals
        ? Number((readerTotals as any)[4] || "0")
        : 0,
      track2Unlocked: readerTotals
        ? Number((readerTotals as any)[5] || "0")
        : 0,
      royaltyAvailable: migrationUI.totalClaimable,
      royaltiesClaimed: readerTotals
        ? formatUnits(BigInt((readerTotals as any)[7] || "0"), 18)
        : "0",
      royaltyPercent: royaltyPercent ? Number(royaltyPercent) : 0,
      ricoShouldHave: ricoFarming
        ? formatUnits(BigInt((ricoFarming as any)[0] || "0"), 18)
        : "0",
      ricoSent: ricoFarming
        ? formatUnits(BigInt((ricoFarming as any)[1] || "0"), 18)
        : "0",
      ricoPending: ricoFarming
        ? formatUnits(BigInt((ricoFarming as any)[2] || "0"), 18)
        : "0",
    };
  };

  // Refetch all user data
  const refetchUserData = useCallback(() => {
    toast.info("Refreshing user data...", {
      duration: 2000,
    });

    refetchUserExists();
    refetchUsdtAllowance();
    refetchUsdtBalance();
    refetchMigrationStatus();
    refetchMigrationAndRoyaltyUI();
    refetchLegacyClaimable();
    refetchRoyaltyV2();
    refetchRoyaltyPercentV2();
    refetchRicoPending();

    if (userExists) {
      refetchReaderTotals();
      refetchReaderSummary();
      refetchRicoFarming();
      refetchRoyalty();
      refetchRoyaltyPercent();
    }

    if (address) {
      clearMatrixCache(address);
    }

    toast.success("User data refreshed!", {
      duration: 2000,
    });
  }, [
    refetchUserExists,
    refetchReaderTotals,
    refetchReaderSummary,
    refetchRicoFarming,
    refetchRoyalty,
    refetchRoyaltyPercent,
    refetchUsdtAllowance,
    refetchUsdtBalance,
    refetchMigrationStatus,
    refetchMigrationAndRoyaltyUI,
    refetchLegacyClaimable,
    refetchRoyaltyV2,
    refetchRoyaltyPercentV2,
    refetchRicoPending,
    userExists,
    address,
    clearMatrixCache,
  ]);

  // Refetch all global data
  const refetchAllData = useCallback(() => {
    toast.info("Refreshing all data...", {
      duration: 2000,
    });

    refetchUserData();
    refetchGlobalStats();
    refetchGlobalSummary();
    refetchGlobalRicoFarming();
    refetchTopEarners();
    refetchTopReferrers();
    refetchChapterPrices();

    toast.success("All data refreshed!", {
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

  // Approve USDT function
  const approveUsdt = useCallback(
    async (amount: string) => {
      const toastId = "approve-usdt";

      try {
        setLoading(true);

        if (!publicClient) {
          throw new Error(
            "Wallet client not available. Please connect your wallet."
          );
        }

        const amountInWei = parseUnits(amount, 18);

        toast.info("Approve USDT", {
          id: toastId,
          description: "Please confirm the transaction in your wallet...",
          duration: 10000,
        });

        const hash = await writeContractAsync({
          ...usdtContract,
          functionName: "approve",
          args: [quantuMatrixContract.address, amountInWei],
        });

        toast.loading("Transaction Submitted", {
          id: toastId,
          description: `Waiting for confirmation...\nHash: ${hash.slice(
            0,
            10
          )}...${hash.slice(-8)}`,
        });

        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        if (receipt.status === "success") {
          toast.success("Approval Successful!", {
            id: toastId,
            description: `USDT approved successfully.`,
            duration: 5000,
          });

          // Refresh user data after successful approval
          setTimeout(() => {
            refetchAllData();
          }, 2000);
        } else {
          throw new Error("Transaction failed on-chain");
        }

        return hash;
      } catch (error: any) {
        console.error("Error approving USDT:", error);

        let errorMessage = "Failed to approve USDT";
        if (error?.message?.includes("rejected") || error?.code === 4001) {
          errorMessage = "Transaction was rejected in your wallet";
        } else if (error?.message?.includes("insufficient")) {
          errorMessage = "Insufficient USDT balance";
        } else if (error?.message?.includes("User denied")) {
          errorMessage = "User denied transaction signature";
        } else if (error?.message?.includes("on-chain")) {
          errorMessage = "Transaction failed on-chain";
        } else if (error?.message?.includes("Wallet client not available")) {
          errorMessage =
            "Wallet not connected. Please connect your wallet first.";
        }

        toast.error("Approval Failed", {
          id: toastId,
          description: errorMessage,
          duration: 7000,
        });

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [writeContractAsync, publicClient, refetchAllData]
  );

  // Join library function
  const joinLibrary = useCallback(
    async (referrer: string) => {
      const toastId = "join-library";

      try {
        setLoading(true);

        if (!publicClient) {
          throw new Error(
            "Wallet client not available. Please connect your wallet."
          );
        }

        toast.info("Joining RICOMATRIX...", {
          id: toastId,
          description: "Please confirm the transaction in your wallet.",
          duration: 10000,
        });

        const hash = await writeContractAsync({
          ...quantuMatrixContract,
          functionName: "joinLibrary",
          args: [referrer as `0x${string}`],
        });

        toast.loading("Registration Submitted!", {
          id: toastId,
          description: `Welcome to RICOMATRIX! Transaction: ${hash.slice(
            0,
            10
          )}...${hash.slice(-8)}`,
        });

        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        if (receipt.status === "success") {
          toast.success("Registration Successful!", {
            id: toastId,
            description: "You have successfully joined RICOMATRIX!",
            duration: 5000,
          });

          setTimeout(() => {
            refetchAllData();
          }, 2000);
        } else {
          throw new Error("Transaction failed on-chain");
        }

        return hash;
      } catch (error: any) {
        console.error("Error joining library:", error);

        let errorMessage = "Failed to join library";
        if (error?.message?.includes("rejected") || error?.code === 4001) {
          errorMessage = "Transaction was rejected in your wallet";
        } else if (error?.message?.includes("insufficient")) {
          errorMessage = "Insufficient USDT balance or allowance";
        } else if (error?.message?.includes("ReaderExists")) {
          errorMessage = "You are already registered";
        } else if (error?.message?.includes("on-chain")) {
          errorMessage = "Transaction failed on-chain";
        } else if (error?.message?.includes("Wallet client not available")) {
          errorMessage =
            "Wallet not connected. Please connect your wallet first.";
        }

        toast.error("Registration Failed", {
          id: toastId,
          description: errorMessage,
          duration: 7000,
        });

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [writeContractAsync, publicClient, refetchAllData]
  );

  // Buy chapter function
  const buyChapter = useCallback(
    async (track: number, chapter: number) => {
      const toastId = "buy-chapter";

      try {
        setLoading(true);

        if (!publicClient) {
          throw new Error(
            "Wallet client not available. Please connect your wallet."
          );
        }

        const trackName = track === 1 ? "Track 1 (X3)" : "Track 2 (X6)";

        toast.info("Purchasing Chapter...", {
          id: toastId,
          description: `Buying Chapter ${chapter} of ${trackName}. Please confirm in wallet.`,
          duration: 10000,
        });

        const hash = await writeContractAsync({
          ...quantuMatrixContract,
          functionName: "buyNewChapter",
          args: [track, chapter],
        });

        toast.loading("Transaction Submitted", {
          id: toastId,
          description: `Chapter ${chapter} purchase in progress. Transaction: ${hash.slice(
            0,
            10
          )}...${hash.slice(-8)}`,
        });

        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        if (receipt.status === "success") {
          toast.success("Chapter Purchase Successful!", {
            id: toastId,
            description: `Successfully purchased Chapter ${chapter} of ${trackName}!`,
            duration: 5000,
          });

          if (address) {
            clearMatrixCache(address);
          }

          setTimeout(() => {
            refetchAllData();
          }, 2000);
        } else {
          throw new Error("Transaction failed on-chain");
        }

        return hash;
      } catch (error: any) {
        console.error("Error buying chapter:", error);

        let errorMessage = "Failed to purchase chapter";
        if (error?.message?.includes("rejected") || error?.code === 4001) {
          errorMessage = "Transaction was rejected in your wallet";
        } else if (error?.message?.includes("insufficient")) {
          errorMessage = "Insufficient USDT balance or allowance";
        } else if (error?.message?.includes("PreviousChapterRequired")) {
          errorMessage = "You need to unlock the previous chapter first";
        } else if (error?.message?.includes("ChapterAlreadyUnlocked")) {
          errorMessage = "This chapter is already unlocked";
        } else if (error?.message?.includes("on-chain")) {
          errorMessage = "Transaction failed on-chain";
        } else if (error?.message?.includes("Wallet client not available")) {
          errorMessage =
            "Wallet not connected. Please connect your wallet first.";
        }

        toast.error("Purchase Failed", {
          id: toastId,
          description: errorMessage,
          duration: 7000,
        });

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [
      writeContractAsync,
      address,
      clearMatrixCache,
      publicClient,
      refetchAllData,
    ]
  );

  // Migrate self function
  const migrateSelf = useCallback(async () => {
    const toastId = "migrate-self";

    try {
      setLoading(true);

      if (!publicClient) {
        throw new Error(
          "Wallet client not available. Please connect your wallet."
        );
      }

      // Get current migration status
      const currentStatus = processMigrationStatus(migrationStatusData);
      if (currentStatus.status === 2) {
        throw new Error("You have already migrated from V1");
      }

      if (currentStatus.status === 0) {
        throw new Error("You are not registered in V1");
      }

      toast.info("Migrating to V2...", {
        id: toastId,
        description: "Please confirm the migration transaction in your wallet.",
        duration: 10000,
      });

      const hash = await writeContractAsync({
        ...quantuMatrixContract,
        functionName: "migrateSelf",
      });

      toast.loading("Migration Submitted!", {
        id: toastId,
        description: `Migration transaction: ${hash.slice(
          0,
          10
        )}...${hash.slice(-8)}`,
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status === "success") {
        toast.success("Migration Successful!", {
          id: toastId,
          description: "You have successfully migrated from V1 to V2!",
          duration: 5000,
        });

        setTimeout(() => {
          refetchAllData();
          refetchMigrationStatus();
          refetchMigrationAndRoyaltyUI();
        }, 2000);
      } else {
        throw new Error("Migration transaction failed on-chain");
      }

      return hash;
    } catch (error: any) {
      console.error("Error migrating:", error);

      let errorMessage = "Failed to migrate";
      if (error?.message?.includes("rejected") || error?.code === 4001) {
        errorMessage = "Transaction was rejected in your wallet";
      } else if (error?.message?.includes("AlreadyMigrated")) {
        errorMessage = "You have already migrated from V1";
      } else if (error?.message?.includes("NotInV1")) {
        errorMessage = "You are not registered in V1";
      } else if (error?.message?.includes("on-chain")) {
        errorMessage = "Migration transaction failed on-chain";
      } else if (error?.message?.includes("Wallet client not available")) {
        errorMessage =
          "Wallet not connected. Please connect your wallet first.";
      }

      toast.error("Migration Failed", {
        id: toastId,
        description: errorMessage,
        duration: 7000,
      });

      throw error;
    } finally {
      setLoading(false);
    }
  }, [
    writeContractAsync,
    publicClient,
    migrationStatusData,
    refetchAllData,
    refetchMigrationStatus,
    refetchMigrationAndRoyaltyUI,
  ]);

  // Claim legacy royalty function
  const claimLegacyRoyalty = useCallback(
    async (amount?: string) => {
      const toastId = "claim-legacy-royalty";

      try {
        setLoading(true);

        if (!publicClient) {
          throw new Error(
            "Wallet client not available. Please connect your wallet."
          );
        }

        // Check migration status
        const currentStatus = processMigrationStatus(migrationStatusData);
        if (currentStatus.status !== 2) {
          throw new Error("You need to migrate from V1 first");
        }

        const claimAmount = amount ? parseUnits(amount, 18) : BigInt(0);

        toast.info("Claiming Legacy Royalty...", {
          id: toastId,
          description: amount
            ? `Claiming ${amount} USDT from V1 royalty`
            : "Claiming all available V1 royalty",
          duration: 10000,
        });

        const hash = await writeContractAsync({
          ...quantuMatrixContract,
          functionName: "claimLegacyRoyalty",
          args: [claimAmount],
        });

        toast.loading("Claim Submitted!", {
          id: toastId,
          description: `Claim transaction: ${hash.slice(0, 10)}...${hash.slice(
            -8
          )}`,
        });

        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        if (receipt.status === "success") {
          toast.success("Legacy Royalty Claimed!", {
            id: toastId,
            description: "Successfully claimed V1 royalty!",
            duration: 5000,
          });

          setTimeout(() => {
            refetchMigrationAndRoyaltyUI();
            refetchUserData();
          }, 2000);
        } else {
          throw new Error("Claim transaction failed on-chain");
        }

        return hash;
      } catch (error: any) {
        console.error("Error claiming legacy royalty:", error);

        let errorMessage = "Failed to claim legacy royalty";
        if (error?.message?.includes("rejected") || error?.code === 4001) {
          errorMessage = "Transaction was rejected in your wallet";
        } else if (error?.message?.includes("NotMigrated")) {
          errorMessage = "You need to migrate from V1 first";
        } else if (error?.message?.includes("NoLegacyRoyalty")) {
          errorMessage = "No legacy royalty available to claim";
        } else if (error?.message?.includes("on-chain")) {
          errorMessage = "Claim transaction failed on-chain";
        } else if (error?.message?.includes("Wallet client not available")) {
          errorMessage =
            "Wallet not connected. Please connect your wallet first.";
        }

        toast.error("Claim Failed", {
          id: toastId,
          description: errorMessage,
          duration: 7000,
        });

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [
      writeContractAsync,
      publicClient,
      migrationStatusData,
      refetchMigrationAndRoyaltyUI,
      refetchUserData,
    ]
  );

  // Claim RICO function
  const claimRico = useCallback(
    async (amount?: string) => {
      const toastId = "claim-rico";

      try {
        setLoading(true);

        if (!publicClient) {
          throw new Error(
            "Wallet client not available. Please connect your wallet."
          );
        }

        const claimAmount = amount ? parseUnits(amount, 18) : BigInt(0);

        toast.info("Claiming RICO...", {
          id: toastId,
          description: amount
            ? `Claiming ${amount} RICO tokens`
            : "Claiming all available RICO tokens",
          duration: 10000,
        });

        const hash = await writeContractAsync({
          ...quantuMatrixContract,
          functionName: "claimRico",
          args: [claimAmount],
        });

        toast.loading("RICO Claim Submitted!", {
          id: toastId,
          description: `Transaction: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
        });

        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        if (receipt.status === "success") {
          toast.success("RICO Claimed Successfully!", {
            id: toastId,
            description: "RICO tokens claimed successfully!",
            duration: 5000,
          });

          setTimeout(() => {
            refetchRicoFarming();
            refetchUserData();
          }, 2000);
        } else {
          throw new Error("RICO claim transaction failed on-chain");
        }

        return hash;
      } catch (error: any) {
        console.error("Error claiming RICO:", error);

        let errorMessage = "Failed to claim RICO tokens";
        if (error?.message?.includes("rejected") || error?.code === 4001) {
          errorMessage = "Transaction was rejected in your wallet";
        } else if (error?.message?.includes("NoRicoToClaim")) {
          errorMessage = "No RICO tokens available to claim";
        } else if (error?.message?.includes("on-chain")) {
          errorMessage = "Claim transaction failed on-chain";
        } else if (error?.message?.includes("Wallet client not available")) {
          errorMessage =
            "Wallet not connected. Please connect your wallet first.";
        }

        toast.error("RICO Claim Failed", {
          id: toastId,
          description: errorMessage,
          duration: 7000,
        });

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [writeContractAsync, publicClient, refetchRicoFarming, refetchUserData]
  );

  // Claim V2 royalty function
  const claimRoyaltyV2 = useCallback(async () => {
    const toastId = "claim-royalty-v2";

    try {
      setLoading(true);

      if (!publicClient) {
        throw new Error(
          "Wallet client not available. Please connect your wallet."
        );
      }

      toast.info("Claiming V2 Royalty...", {
        id: toastId,
        description: "Claiming fresh V2 royalty earnings",
        duration: 10000,
      });

      const hash = await writeContractAsync({
        ...quantuMatrixContract,
        functionName: "claimRoyaltyV2",
      });

      toast.loading("V2 Royalty Claim Submitted!", {
        id: toastId,
        description: `Transaction: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status === "success") {
        toast.success("V2 Royalty Claimed!", {
          id: toastId,
          description: "Successfully claimed V2 royalty!",
          duration: 5000,
        });

        setTimeout(() => {
          refetchRoyaltyV2();
          refetchMigrationAndRoyaltyUI();
          refetchUserData();
        }, 2000);
      } else {
        throw new Error("V2 royalty claim transaction failed on-chain");
      }

      return hash;
    } catch (error: any) {
      console.error("Error claiming V2 royalty:", error);

      let errorMessage = "Failed to claim V2 royalty";
      if (error?.message?.includes("rejected") || error?.code === 4001) {
        errorMessage = "Transaction was rejected in your wallet";
      } else if (error?.message?.includes("NoRoyalty")) {
        errorMessage = "No V2 royalty available to claim";
      } else if (error?.message?.includes("on-chain")) {
        errorMessage = "Claim transaction failed on-chain";
      } else if (error?.message?.includes("Wallet client not available")) {
        errorMessage =
          "Wallet not connected. Please connect your wallet first.";
      }

      toast.error("V2 Royalty Claim Failed", {
        id: toastId,
        description: errorMessage,
        duration: 7000,
      });

      throw error;
    } finally {
      setLoading(false);
    }
  }, [
    writeContractAsync,
    publicClient,
    refetchRoyaltyV2,
    refetchMigrationAndRoyaltyUI,
    refetchUserData,
  ]);

  // Legacy claim royalty function (keep for compatibility)
  const claimRoyalty = useCallback(async () => {
    const toastId = "claim-royalty";

    try {
      setLoading(true);

      if (!publicClient) {
        throw new Error(
          "Wallet client not available. Please connect your wallet."
        );
      }

      toast.info("Claiming Royalty...", {
        id: toastId,
        description: "Please confirm the transaction in your wallet.",
        duration: 10000,
      });

      const hash = await writeContractAsync({
        ...quantuMatrixContract,
        functionName: "claimRoyalty",
      });

      toast.loading("Royalty Claim Submitted!", {
        id: toastId,
        description: `Transaction: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status === "success") {
        toast.success("Royalty Claimed!", {
          id: toastId,
          description: "Successfully claimed royalty!",
          duration: 5000,
        });

        setTimeout(() => {
          refetchRoyalty();
          refetchUserData();
        }, 2000);
      } else {
        throw new Error("Royalty claim transaction failed on-chain");
      }

      return hash;
    } catch (error: any) {
      console.error("Error claiming royalty:", error);

      let errorMessage = "Failed to claim royalty";
      if (error?.message?.includes("rejected") || error?.code === 4001) {
        errorMessage = "Transaction was rejected in your wallet";
      } else if (error?.message?.includes("NoRoyalty")) {
        errorMessage = "No royalty available to claim";
      } else if (error?.message?.includes("on-chain")) {
        errorMessage = "Claim transaction failed on-chain";
      } else if (error?.message?.includes("Wallet client not available")) {
        errorMessage =
          "Wallet not connected. Please connect your wallet first.";
      }

      toast.error("Claim Failed", {
        id: toastId,
        description: errorMessage,
        duration: 7000,
      });

      throw error;
    } finally {
      setLoading(false);
    }
  }, [writeContractAsync, publicClient, refetchRoyalty, refetchUserData]);

  const userData: UserData = {
    ...parseUserDataFromMultipleSources(),
    migrationStatus: processMigrationStatus(migrationStatusData),
    migrationData: processMigrationData(migrationAndRoyaltyUI),
  };

  const formattedUsdtBalance = usdtBalance
    ? formatUnits(usdtBalance as bigint, 18)
    : "0";
  const formattedUsdtAllowance = usdtAllowance
    ? formatUnits(usdtAllowance as bigint, 18)
    : "0";

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

    // Migration and royalty UI data
    migrationAndRoyaltyUI: processMigrationData(migrationAndRoyaltyUI),

    // Individual data points
    legacyClaimable: legacyClaimable
      ? formatUnits(legacyClaimable as bigint, 18)
      : "0",
    royaltyV2: royaltyV2 ? formatUnits(royaltyV2 as bigint, 18) : "0",
    royaltyPercentV2: royaltyPercentV2 ? Number(royaltyPercentV2) : 0,
    ricoPending: ricoPending ? formatUnits(ricoPending as bigint, 18) : "0",

    // Token addresses
    usdtAddress: usdtAddress as `0x${string}` | undefined,
    rewardTokenAddress,

    // USDT data
    usdtBalance: formattedUsdtBalance,
    usdtAllowance: formattedUsdtAllowance,
    joinCost,

    // Find referrer functions
    findFreeTrack1Referrer,
    findFreeTrack2Referrer,

    // Matrix data fetching
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
    isConnected,

    // Actions
    approveUsdt,
    joinLibrary,
    buyChapter,
    migrateSelf,
    claimLegacyRoyalty,
    claimRico,
    claimRoyaltyV2,
    claimRoyalty,

    // Refresh functions
    refetchUserData,
    refetchAllData,
    refetchGlobalStats,
    refetchGlobalSummary,
    refetchGlobalRicoFarming,
    refetchMigrationStatus,
    refetchMigrationAndRoyaltyUI,
  };
};
