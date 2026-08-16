import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
  useChainId,
  useWalletClient,
} from "wagmi";
import { quantuMatrixContract } from "../utils/contracts";
import { useState, useCallback, useEffect, useMemo } from "react";
import { formatUnits, parseUnits } from "viem";
import type { ContractFunctionParameters } from "viem";
import { toast } from "sonner";
import {
  CONTRACT_ABI,
  LEGACY_V2_CONTRACT_ADDRESS,
  RICO_MIGRATOR_ABI,
  RICO_CHAIN_CONFIG,
  USDT_ABI,
  getRicoChainConfig,
  getRicoTokenAddress,
} from "@/utils/constants";
import {
  RICO_MATRIX_HUB_ABI,
  RICO_MATRIX_SPOKE_ABI,
} from "@/utils/ricoMatrixAbi";

const MIN_ROYALTY_USDT = 0.5;
const PAYMENT_TOKEN_MAX_ALLOWANCE = "21000";
const WALLET_CONFIRM_TIMEOUT_MS = 45000;
const BROADCAST_SYNC_USD_VALUE = 7;
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;

const withWalletConfirmTimeout = async <T,>(request: Promise<T>): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              "Wallet confirmation did not open. Please reopen your wallet app and try again.",
            ),
          );
        }, WALLET_CONFIRM_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

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

const toBigIntValue = (value: any): bigint => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && value.trim()) {
    try {
      return BigInt(value);
    } catch {
      return BigInt(0);
    }
  }
  return BigInt(0);
};

const toDecimalString = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value.toFixed(18).replace(/\.?0+$/, "");
};

const toUsdtNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") {
    return parseFloat(formatUnits(value, 18));
  }
  const str = String(value);
  if (str.includes(".")) {
    const parsed = parseFloat(str);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  try {
    return parseFloat(formatUnits(BigInt(str), 18));
  } catch {
    const parsed = parseFloat(str);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
};

const formatUnitsSafe = (value: unknown, decimals = 18): string => {
  try {
    if (value === null || value === undefined || value === "") return "0";
    return formatUnits(BigInt(String(value)), decimals);
  } catch {
    return "0";
  }
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

// V2 to current account status interface
interface MigrationStatus {
  status: number; // 0 = Not found, 1 = V2 account pending dashboard access, 2 = Active
}

// V2 to current account data interface
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
  hubTrack1Unlocked?: number;
  hubTrack2Unlocked?: number;
  localTrack1Unlocked?: number;
  localTrack2Unlocked?: number;
}

type ChainActivity = {
  track1Unlocked: number;
  track2Unlocked: number;
};

type MatrixAlertAction = "registration" | "chapter-upgrade" | "royalty-claim";

const notifyTelegramContractAlert = async (
  action: MatrixAlertAction,
  txHash: `0x${string}`,
  chainId: number,
) => {
  try {
    const response = await fetch("/api/telegram/contract-alert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        txHash,
        chainId,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(
        payload?.error || `Contract alert request failed (${response.status}).`,
      );
    }
  } catch (error) {
    console.error(`Failed to send ${action} Telegram alert:`, error);
  }
};

export const useQuantuMatrix = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const hubPublicClient = usePublicClient({ chainId: 56 });
  const { data: walletClient } = useWalletClient();
  const [loading, setLoading] = useState(false);
  const [nativeUsdPrice, setNativeUsdPrice] = useState<number | null>(null);
  const [nativePriceLoading, setNativePriceLoading] = useState(false);
  const rewardTokenAddress = getRicoTokenAddress(chainId);
  const activeChain = useMemo(() => getRicoChainConfig(chainId), [chainId]);
  const isHubChain = activeChain.contractMode === "hub";
  const [selectedPaymentTokenAddress, setSelectedPaymentTokenAddress] =
    useState<`0x${string}` | null>(null);
  const defaultPaymentToken = useMemo(
    () =>
      activeChain.paymentTokens.find(
        (token) =>
          token.address.toLowerCase() === activeChain.paymentToken.toLowerCase(),
      ) ||
      activeChain.paymentTokens.find((token) => token.symbol === "USDT") ||
      activeChain.paymentTokens[0],
    [activeChain],
  );
  const activePaymentToken = useMemo(
    () =>
      activeChain.paymentTokens.find(
        (token) =>
          token.address.toLowerCase() ===
          selectedPaymentTokenAddress?.toLowerCase(),
      ) || defaultPaymentToken,
    [activeChain.paymentTokens, defaultPaymentToken, selectedPaymentTokenAddress],
  );
  const broadcastNativeFeeDisplay = useMemo(() => {
    if (!nativeUsdPrice) return "";
    return toDecimalString(BROADCAST_SYNC_USD_VALUE / nativeUsdPrice);
  }, [nativeUsdPrice]);

  useEffect(() => {
    let cancelled = false;

    const fetchNativePrice = async () => {
      try {
        setNativePriceLoading(true);
        const response = await fetch(
          `/api/native-price?chainId=${activeChain.id}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(`Native price request failed (${response.status})`);
        }

        const payload = await response.json();
        const price = Number(payload?.priceUsd);

        if (!cancelled) {
          setNativeUsdPrice(Number.isFinite(price) && price > 0 ? price : null);
        }
      } catch (error) {
        console.error("Failed to fetch native token price:", error);
        if (!cancelled) {
          setNativeUsdPrice(null);
        }
      } finally {
        if (!cancelled) {
          setNativePriceLoading(false);
        }
      }
    };

    void fetchNativePrice();
    const interval = window.setInterval(fetchNativePrice, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeChain.id]);

  useEffect(() => {
    setSelectedPaymentTokenAddress(defaultPaymentToken.address);
  }, [defaultPaymentToken.address]);

  const activeMatrixContract = useMemo(
    () => ({
      ...quantuMatrixContract,
      address: activeChain.matrix,
      abi: isHubChain ? RICO_MATRIX_HUB_ABI : RICO_MATRIX_SPOKE_ABI,
    }),
    [activeChain.matrix, isHubChain],
  );
  const hubMatrixContract = useMemo(
    () => ({
      address: RICO_CHAIN_CONFIG[56].matrix,
      abi: RICO_MATRIX_HUB_ABI,
    }),
    [],
  );
  const syncTargetChains = useMemo(
    () =>
      (isHubChain ? Object.values(RICO_CHAIN_CONFIG) : [])
        .filter((chain) => chain.id !== activeChain.id)
        .map((chain) => ({
          eid: chain.lzEid,
          name: chain.name,
        })),
    [activeChain.id, isHubChain],
  );
  const activeMigratorContract = useMemo(
    () => ({
      address: activeChain.migrator,
      abi: RICO_MIGRATOR_ABI,
    }),
    [activeChain.migrator],
  );
  const activePaymentTokenContract = useMemo(
    () => ({
      address: activePaymentToken.address,
      abi: USDT_ABI,
    }),
    [activePaymentToken.address],
  );
  const legacyV2Contract = useMemo(
    () => ({
      address: LEGACY_V2_CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
    }),
    [],
  );
  const [matrixCache, setMatrixCache] = useState<{
    track1: Record<string, Record<number, any>>;
    track2: Record<string, Record<number, Track2Data>>;
  }>({ track1: {}, track2: {} });
  const [chainActivity, setChainActivity] = useState<ChainActivity>({
    track1Unlocked: 0,
    track2Unlocked: 0,
  });

  // Canonical user existence always comes from the BSC hub.
  const { data: userReader, refetch: refetchUserExists } = useReadContract({
    ...hubMatrixContract,
    chainId: 56,
    functionName: "readers",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
  const { data: localSpokeReader } = useReadContract({
    ...activeMatrixContract,
    functionName: "localView",
    args: !isHubChain && address ? [address] : undefined,
    query: {
      enabled: Boolean(!isHubChain && address),
    },
  });
  const userExists =
    toBigIntValue((userReader as any)?.id ?? (userReader as any)?.[0]) > BigInt(0);

  useEffect(() => {
    let cancelled = false;

    const loadChainActivity = async () => {
      if (!publicClient || !address || !userExists) {
        setChainActivity({ track1Unlocked: 0, track2Unlocked: 0 });
        return;
      }

      if (!isHubChain) {
        const local = localSpokeReader as any;
        setChainActivity({
          track1Unlocked: toNumber(local?.t1Unlocked ?? local?.[1], 0),
          track2Unlocked: toNumber(local?.t2Unlocked ?? local?.[2], 0),
        });
        return;
      }

      try {
        const getEvents = async (eventName: string) =>
          ((await (publicClient as any).getContractEvents({
            ...activeMatrixContract,
            eventName,
            args: { user: address },
            fromBlock: BigInt(0),
            toBlock: "latest",
          })) || []) as Array<{ args?: Record<string, unknown> }>;

        const [joinedEvents, purchasedEvents, boostedEvents] =
          await Promise.all([
            getEvents("JoinedHub"),
            getEvents("ChapterPurchasedHub"),
            getEvents("UserBoostedHub"),
          ]);

        let track1Unlocked = joinedEvents.length > 0 ? 1 : 0;
        let track2Unlocked = joinedEvents.length > 0 ? 1 : 0;

        purchasedEvents.forEach((event) => {
          const track = Number(event.args?.track || 0);
          const endChapter = Number(
            event.args?.endCh || event.args?.chapter || 0,
          );

          if (track === 1) {
            track1Unlocked = Math.max(track1Unlocked, endChapter);
          } else if (track === 2) {
            track2Unlocked = Math.max(track2Unlocked, endChapter);
          }
        });

        boostedEvents.forEach((event) => {
          const track = Number(event.args?.track || 0);
          const chapter = Number(event.args?.chapter || 0);

          if (track === 1) {
            track1Unlocked = Math.max(track1Unlocked, chapter);
          } else if (track === 2) {
            track2Unlocked = Math.max(track2Unlocked, chapter);
          }
        });

        if (userExists) {
          track1Unlocked = Math.max(track1Unlocked, 1);
          track2Unlocked = Math.max(track2Unlocked, 1);
        }

        if (!cancelled) {
          setChainActivity({ track1Unlocked, track2Unlocked });
        }
      } catch (error) {
        console.error("Failed to load chain-local chapter activity:", error);
        if (!cancelled) {
          setChainActivity({
            track1Unlocked: userExists ? 1 : 0,
            track2Unlocked: userExists ? 1 : 0,
          });
        }
      }
    };

    void loadChainActivity();

    return () => {
      cancelled = true;
    };
  }, [activeMatrixContract, address, isHubChain, localSpokeReader, publicClient, userExists]);

  const legacyV2Configured = Boolean(LEGACY_V2_CONTRACT_ADDRESS);

  const { data: legacyV2UserExists, refetch: refetchLegacyV2UserExists } =
    useReadContract({
      ...legacyV2Contract,
      chainId: 56,
      functionName: "isReaderExists",
      args: address ? [address] : undefined,
      query: {
        enabled: Boolean(address && legacyV2Configured),
      },
    });

  const userContracts = (
    address && userExists
      ? [
          {
            ...hubMatrixContract,
            chainId: 56,
            functionName: "getReaderFullSummary",
            args: [address],
          } as any,
        ]
      : []
  ) as readonly ContractFunctionParameters[];

  const migrationContracts = (
    address
      ? [
          ...(legacyV2Configured
            ? [
                {
                  ...legacyV2Contract,
                  chainId: 56,
                  functionName: "viewRoyaltyPercentV2",
                  args: [address],
                },
              ]
            : []),
          {
            ...activeMigratorContract,
            chainId: 56,
            functionName: "isMigrated",
            args: [address],
          } as any,
          {
            ...activeMigratorContract,
            chainId: 56,
            functionName: "v2ClaimableBalances",
            args: [address],
          } as any,
        ]
      : []
  ) as readonly ContractFunctionParameters[];

  const { data: userReads, refetch: refetchUserReads } = useReadContracts({
    contracts: userContracts,
    query: { enabled: Boolean(address && userExists) },
  });

  const userReadsList = (userReads as any[] | undefined) ?? [];
  const getUserResult = (index: number) => {
    const result = userReadsList[index]?.result;
    return result !== undefined ? safeBigInt(result) : result;
  };

  const readerSummary = getUserResult(0);
  const ricoExpected = "0";
  const ricoClaimed = "0";
  const ricoPendingFromUserReads = "0";
  const totalUnilevelEarned = "0";

  const { data: migrationReads, refetch: refetchMigrationReads } = useReadContracts({
    contracts: migrationContracts,
    query: { enabled: Boolean(address) },
  });

  const migrationReadsList = (migrationReads as any[] | undefined) ?? [];
  const getMigrationResult = (index: number) => {
    const result = migrationReadsList[index]?.result;
    return result !== undefined ? safeBigInt(result) : result;
  };

  const royaltyPercentV2 = legacyV2Configured ? getMigrationResult(0) : "0";
  const isMigratedOnV3 = Boolean(
    migrationReadsList[legacyV2Configured ? 1 : 0]?.result,
  );
  const v2ClaimableTuple = migrationReadsList[
    legacyV2Configured ? 2 : 1
  ]?.result as readonly [bigint, bigint, bigint] | undefined;
  const legacyClaimable = v2ClaimableTuple?.[0] ?? "0";
  const royaltyV2 = v2ClaimableTuple?.[1] ?? "0";
  const migrationRicoPending = v2ClaimableTuple?.[2] ?? "0";
  const ricoPending = migrationRicoPending;
  const royaltyAvailable = royaltyV2 || "0";

  const refetchReaderTotals = () => refetchUserReads();
  const refetchReaderSummary = () => refetchUserReads();
  const refetchRicoFarming = () => refetchUserReads();
  const refetchRoyalty = () => refetchUserReads();
  const refetchRoyaltyPercent = () => refetchUserReads();
  const refetchMigrationAndRoyaltyUI = () => refetchMigrationReads();
  const refetchLegacyClaimable = () => refetchMigrationReads();
  const refetchRoyaltyV2 = () => refetchMigrationReads();
  const refetchRoyaltyPercentV2 = () => refetchMigrationReads();
  const refetchRicoPending = () => refetchMigrationReads();

  const migrationStatusData = userExists || isMigratedOnV3
    ? 2
    : legacyV2UserExists
      ? 1
      : 0;
  const refetchMigrationStatus = () => refetchMigrationReads();
  const migrationAndRoyaltyUI = [
    migrationStatusData,
    royaltyPercentV2 || 0,
    legacyClaimable || 0,
    royaltyV2 || 0,
    toBigIntValue(legacyClaimable) + toBigIntValue(royaltyV2),
  ];

  const preRegistrationContracts = (
    address
      ? [
          ...Array.from({ length: 12 }, (_, index) => ({
            ...activeMatrixContract,
            functionName: "chapterPrice",
            args: [index + 1],
          })),
          {
            ...activeMatrixContract,
            functionName: "isSupportedPaymentToken",
            args: [activePaymentToken.address],
          },
        ]
      : []
  ) as readonly ContractFunctionParameters[];

  const { data: preRegistrationReads, refetch: refetchPreRegistrationReads } =
    useReadContracts({
      contracts: preRegistrationContracts,
      query: { enabled: Boolean(address) },
    });

  const preRegistrationList =
    (preRegistrationReads as any[] | undefined) ?? [];
  const preRegistrationChapterPrices = preRegistrationList
    .slice(0, 12)
    .map((item) => item?.result);
  const selectedPaymentTokenSupported = preRegistrationList[12]?.result !== false;

  const globalContracts = (
    isHubChain
      ? [
          {
            ...hubMatrixContract,
            chainId: 56,
            functionName: "lastReaderId",
          } as any,
          {
            ...hubMatrixContract,
            chainId: 56,
            functionName: "getTopEarners",
          } as any,
          {
            ...hubMatrixContract,
            chainId: 56,
            functionName: "getTopReferrers",
          } as any,
        ]
      : []
  ) as readonly ContractFunctionParameters[];

  const { data: globalReads, refetch: refetchGlobalReads } = useReadContracts({
    contracts: globalContracts,
    query: { enabled: Boolean(userExists) },
  });

  const globalReadsList = (globalReads as any[] | undefined) ?? [];
  const getGlobalResult = (index: number) => {
    const result = globalReadsList[index]?.result;
    return result !== undefined ? safeBigInt(result) : result;
  };

  const globalStats = globalReadsList[0]?.result;
  const globalSummary = globalReadsList[0]?.result;
  const globalRicoFarming = undefined;
  const rawLastReaderId = toBigIntValue(getGlobalResult(0));
  const totalReaders =
    rawLastReaderId > BigInt(2) ? (rawLastReaderId - BigInt(2)).toString() : "0";
  const topEarnersRaw = globalReadsList[1]?.result as
    | readonly [readonly string[], readonly bigint[]]
    | undefined;
  const topReferrersRaw = globalReadsList[2]?.result as
    | readonly [readonly string[], readonly bigint[]]
    | undefined;
  const topEarners = topEarnersRaw
    ? [
        [...topEarnersRaw[0]],
        topEarnersRaw[1].map((item) => item.toString()),
      ]
    : undefined;
  const topReferrers = topReferrersRaw
    ? [
        [...topReferrersRaw[0]],
        topReferrersRaw[1].map((item) => item.toString()),
      ]
    : undefined;

  const chapterPricesRaw = safeBigInt(preRegistrationChapterPrices);
  const usdtAddress = activePaymentToken.address;

  const chapterPrices = Array.isArray(chapterPricesRaw)
    ? (chapterPricesRaw as readonly any[]).map((price) =>
        price?.toString ? price.toString() : String(price)
      )
    : undefined;

  const refetchGlobalStats = () => refetchGlobalReads();
  const refetchGlobalSummary = () => refetchGlobalReads();
  const refetchGlobalRicoFarming = () => refetchGlobalReads();
  const refetchTotalReaders = () => refetchGlobalReads();
  const refetchTopEarners = () => refetchGlobalReads();
  const refetchTopReferrers = () => refetchGlobalReads();
  const refetchChapterPrices = () => refetchPreRegistrationReads();

  const walletContracts = (
    address
      ? [
          {
            ...activePaymentTokenContract,
            functionName: "allowance",
            args: [address, activeMatrixContract.address],
          },
          {
            ...activePaymentTokenContract,
            functionName: "allowance",
            args: [address, PERMIT2_ADDRESS],
          },
          {
            ...activePaymentTokenContract,
            functionName: "balanceOf",
            args: [address],
          },
        ]
      : []
  ) as readonly ContractFunctionParameters[];

  const { data: walletReads, refetch: refetchWalletReads } = useReadContracts({
    contracts: walletContracts,
    query: { enabled: Boolean(address) },
  });

  const walletReadsList = (walletReads as any[] | undefined) ?? [];
  const usdtAllowance = walletReadsList[0]?.result;
  const permit2Allowance = walletReadsList[1]?.result;
  const usdtBalance = walletReadsList[2]?.result;

  const refetchUsdtAllowance = () => refetchWalletReads();
  const refetchUsdtBalance = () => refetchWalletReads();

  // Calculate join cost
  const joinCost =
    chapterPrices && Array.isArray(chapterPrices) && chapterPrices.length > 0
      ? (
          parseFloat(formatUnitsSafe(chapterPrices[0])) * 2
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
        legacyClaimable: formatUnitsSafe(legacyClaimable),
        v2Claimable: formatUnitsSafe(v2Claimable),
        totalClaimable: formatUnitsSafe(totalClaimable),
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
      const readerClient = hubPublicClient || publicClient;
      if (!readerClient || !userAddress || maxChapters <= 0) {
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
            readerClient
              .readContract({
                ...hubMatrixContract,
                functionName: "getTrack2Info",
                args: [userAddress as `0x${string}`, chapter],
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
    [hubMatrixContract, hubPublicClient, publicClient, matrixCache.track2]
  );

  // Single chapter fetch
  const fetchTrack2Matrix = useCallback(
    async (userAddress: string, chapter: number): Promise<Track2Data> => {
      const readerClient = hubPublicClient || publicClient;
      if (!readerClient || !userAddress) {
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
        const data = await readerClient.readContract({
          ...hubMatrixContract,
          functionName: "getTrack2Info",
          args: [userAddress as `0x${string}`, chapter],
        });
        const referrals = (await readerClient.readContract({
          ...hubMatrixContract,
          functionName: "getTrack2Referrals",
          args: [userAddress as `0x${string}`, chapter],
        }).catch(() => [[], []])) as [string[], string[]];

        return {
          currentReferrer: (data as any)?.[0] || "",
          firstLineReferrals: Array.isArray(referrals[0]) ? referrals[0] : [],
          secondLineReferrals: Array.isArray(referrals[1]) ? referrals[1] : [],
          blocked: Boolean((data as any)?.[3]),
          reinvestCount: toNumber((data as any)?.[4], 0),
          closedPart: (data as any)?.[5] || "",
        };
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
    [hubMatrixContract, hubPublicClient, publicClient]
  );

  // Track1 matrix functions
  const fetchTrack1Matrix = useCallback(
    async (userAddress: string, chapter: number) => {
      const readerClient = hubPublicClient || publicClient;
      if (!readerClient || !userAddress) {
        return {
          currentReferrer: "",
          referrals: [],
          blocked: false,
          reinvestCount: 0,
        };
      }

      try {
        const data = (await readerClient.readContract({
          ...hubMatrixContract,
          functionName: "getTrack1Info",
          args: [userAddress as `0x${string}`, chapter],
        })) as any;

        if (data && Array.isArray(data) && data.length >= 4) {
          const referrals = (await readerClient.readContract({
            ...hubMatrixContract,
            functionName: "getTrack1Referrals",
            args: [userAddress as `0x${string}`, chapter],
          }).catch(() => [])) as string[];

          return {
            currentReferrer: data[0] || "",
            referrals: Array.isArray(referrals) ? referrals : [],
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
    [hubMatrixContract, hubPublicClient, publicClient]
  );

  // Bulk fetch Track1 chapters
  const fetchAllTrack1Chapters = useCallback(
    async (
      userAddress: string,
      maxChapters: number
    ): Promise<Record<number, any>> => {
      const readerClient = hubPublicClient || publicClient;
      if (!readerClient || !userAddress || maxChapters <= 0) {
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
            readerClient
              .readContract({
                ...hubMatrixContract,
                functionName: "getTrack1Info",
                args: [userAddress as `0x${string}`, chapter],
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

          for (let batchIndex = 0; batchIndex < batchResults.length; batchIndex += 1) {
            const result = batchResults[batchIndex];
            const chapter = batch[i + batchIndex];
            if (result && Array.isArray(result) && result.length >= 4) {
              const referrals = (await readerClient.readContract({
                ...hubMatrixContract,
                functionName: "getTrack1Referrals",
                args: [userAddress as `0x${string}`, chapter],
              }).catch(() => [])) as string[];
              results[chapter] = {
                currentReferrer: result[0] || "",
                referrals,
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
          }

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
    [hubMatrixContract, hubPublicClient, publicClient, matrixCache.track1]
  );

  // Find free Track1 referrer
  const findFreeTrack1Referrer = useCallback(
    async (userAddress: string, chapter: number): Promise<string> => {
      const toastId = "find-free-track1-referrer";

      try {
        if (!isHubChain) {
          return userAddress;
        }
        if (!publicClient) {
          throw new Error("Wallet client not available");
        }
        return userAddress;
      } catch (error: any) {
        console.error("Error finding free Track1 referrer:", error);
        toast.error("Failed to find referrer", {
          id: toastId,
          description: error.message,
        });
        throw error;
      }
    },
    [isHubChain, publicClient]
  );

  // Find free Track2 referrer
  const findFreeTrack2Referrer = useCallback(
    async (userAddress: string, chapter: number): Promise<string> => {
      const toastId = "find-free-track2-referrer";

      try {
        if (!isHubChain) {
          return userAddress;
        }
        if (!publicClient) {
          throw new Error("Wallet client not available");
        }
        return userAddress;
      } catch (error: any) {
        console.error("Error finding free Track2 referrer:", error);
        toast.error("Failed to find referrer", {
          id: toastId,
          description: error.message,
        });
        throw error;
      }
    },
    [isHubChain, publicClient]
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
        hubTrack1Unlocked: 0,
        hubTrack2Unlocked: 0,
        localTrack1Unlocked: 0,
        localTrack2Unlocked: 0,
      };
    }

    // Get migration and royalty UI data first
    const migrationUI = processMigrationAndRoyaltyUI(migrationAndRoyaltyUI);

    // Use readerSummary as primary source
    if (readerSummary) {
      const reader = readerSummary as any;
      const readerId = reader.id ?? reader[0] ?? "0";
      const readerReferrer = reader.referrer ?? reader[1] ?? address ?? "";
      const partnersCount = reader.partnersCount ?? reader[2] ?? "0";
      const hubTrack1Unlocked = toNumber(
        reader.track1Unlocked ?? reader[3],
        0,
      );
      const hubTrack2Unlocked = toNumber(
        reader.track2Unlocked ?? reader[4],
        0,
      );
      const track1Unlocked = isHubChain
        ? hubTrack1Unlocked
        : Math.max(hubTrack1Unlocked, chainActivity.track1Unlocked);
      const track2Unlocked = isHubChain
        ? hubTrack2Unlocked
        : Math.max(hubTrack2Unlocked, chainActivity.track2Unlocked);
      const royaltyClaimed = reader.royaltyClaimedUSD ?? reader[10] ?? "0";
      const royaltyPercentBps =
        reader.royaltyPercentOfPoolBps ?? reader[11] ?? "0";
      const shouldHave = reader.ricoShouldHave ?? reader[12] ?? "0";
      const sent = reader.ricoSent ?? reader[13] ?? "0";
      const pending = reader.ricoPending ?? reader[14] ?? "0";

      return {
        exists: true,
        readerId: readerId?.toString() || "0",
        referrer: readerReferrer,
        partnersCount: partnersCount?.toString() || "0",
        track1TotalEarned: formatUnitsSafe(
          reader.track1TotalEarnedUSD ?? reader[5],
        ),
        track2TotalEarned: formatUnitsSafe(
          reader.track2TotalEarnedUSD ?? reader[6],
        ),
        track1TotalCycles: toNumber(reader.track1TotalCycles ?? reader[7], 0),
        track2TotalCycles: toNumber(reader.track2TotalCycles ?? reader[8], 0),
        track1Unlocked,
        track2Unlocked,
        royaltyAvailable: formatUnitsSafe(
          reader.royaltyAvailableUSD ?? reader[9],
        ),
        royaltiesClaimed: formatUnitsSafe(royaltyClaimed),
        royaltyPercent: Math.round(toNumber(royaltyPercentBps, 0) / 100),
        ricoShouldHave: formatUnitsSafe(shouldHave),
        ricoSent: formatUnitsSafe(sent),
        ricoPending: formatUnitsSafe(pending),
        hubTrack1Unlocked,
        hubTrack2Unlocked,
        localTrack1Unlocked: chainActivity.track1Unlocked,
        localTrack2Unlocked: chainActivity.track2Unlocked,
      };
    }

    // Fallback to individual data sources
    return {
      exists: true,
      readerId: "0",
      referrer: address || "",
      partnersCount: "0",
      track1TotalEarned: "0",
      track2TotalEarned: "0",
      track1TotalCycles: 0,
      track2TotalCycles: 0,
      track1Unlocked: Math.max(chainActivity.track1Unlocked, 1),
      track2Unlocked: Math.max(chainActivity.track2Unlocked, 1),
      royaltyAvailable: isHubChain ? migrationUI.totalClaimable : "0",
      royaltiesClaimed: "0",
      royaltyPercent: 0,
      ricoShouldHave: "0",
      ricoSent: "0",
      ricoPending: "0",
      hubTrack1Unlocked: 0,
      hubTrack2Unlocked: 0,
      localTrack1Unlocked: chainActivity.track1Unlocked,
      localTrack2Unlocked: chainActivity.track2Unlocked,
    };
  };

  // Refetch all user data
  const refetchUserData = useCallback(async (options?: { showToast?: boolean }) => {
    const showToast = options?.showToast ?? true;
    if (showToast) {
      toast.info("Refreshing user data...", {
        duration: 2000,
      });
    }

    const refetches: Promise<unknown>[] = [
      refetchUserExists(),
      refetchLegacyV2UserExists(),
      refetchUsdtAllowance(),
      refetchUsdtBalance(),
      refetchMigrationStatus(),
      refetchMigrationAndRoyaltyUI(),
      refetchLegacyClaimable(),
      refetchRoyaltyV2(),
      refetchRoyaltyPercentV2(),
      refetchRicoPending(),
    ];

    if (userExists) {
      refetches.push(
        refetchReaderTotals(),
        refetchReaderSummary(),
        refetchRicoFarming(),
        refetchRoyalty(),
        refetchRoyaltyPercent()
      );
    }

    if (address) {
      clearMatrixCache(address);
    }

    await Promise.all(refetches);

    if (showToast) {
      toast.success("User data refreshed!", {
        duration: 2000,
      });
    }
  }, [
    refetchUserExists,
    refetchLegacyV2UserExists,
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
  const refetchAllData = useCallback(async (options?: { showToast?: boolean }) => {
    const showToast = options?.showToast ?? true;
    if (showToast) {
      toast.info("Refreshing all data...", {
        duration: 2000,
      });
    }

    await Promise.all([
      refetchUserData({ showToast: false }),
      refetchGlobalStats(),
      refetchGlobalSummary(),
      refetchGlobalRicoFarming(),
      refetchTopEarners(),
      refetchTopReferrers(),
      refetchChapterPrices(),
    ]);

    if (showToast) {
      toast.success("All data refreshed!", {
        duration: 2000,
      });
    }
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
    async (_amount: string) => {
      const toastId = "approve-usdt";

      try {
        setLoading(true);

        if (!publicClient) {
          throw new Error(
            "Wallet client not available. Please connect your wallet."
          );
        }

        const approvalAmount = PAYMENT_TOKEN_MAX_ALLOWANCE;
        const amountInWei = parseUnits(
          approvalAmount,
          activePaymentToken.decimals,
        );

        toast.info(`Approve ${activePaymentToken.symbol}`, {
          id: toastId,
          description: `Please approve ${approvalAmount} ${activePaymentToken.symbol} in your wallet...`,
          duration: 10000,
        });

        const hash = await writeContractAsync({
          ...activePaymentTokenContract,
          functionName: "approve",
          args: [activeMatrixContract.address, amountInWei],
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
            description: `${approvalAmount} ${activePaymentToken.symbol} approved successfully.`,
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

        let errorMessage = `Failed to approve ${activePaymentToken.symbol}`;
        if (error?.message?.includes("rejected") || error?.code === 4001) {
          errorMessage = "Transaction was rejected in your wallet";
        } else if (error?.message?.includes("insufficient")) {
          errorMessage = `Insufficient ${activePaymentToken.symbol} balance`;
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
    [
      activeChain.id,
      activeMatrixContract,
      activePaymentToken.address,
      activePaymentToken.symbol,
      publicClient,
      refetchAllData,
      writeContractAsync,
    ]
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

        if (selectedPaymentTokenSupported === false) {
          throw new Error(
            `${activePaymentToken.symbol} is not supported for registration on ${activeChain.name}.`
          );
        }

        const hash = isHubChain
          ? await withWalletConfirmTimeout(
              writeContractAsync({
                ...activeMatrixContract,
                functionName: "joinLibraryHub",
                args: [activePaymentToken.address, referrer as `0x${string}`],
              }),
            )
          : await (async () => {
              const estimate = (await publicClient.readContract({
                ...activeMatrixContract,
                functionName: "estimateJoinCost",
                args: [activePaymentToken.address],
              })) as readonly [
                bigint,
                bigint,
                bigint,
                bigint,
                bigint,
                number,
                `0x${string}`,
              ];

              return withWalletConfirmTimeout(
                writeContractAsync({
                  ...activeMatrixContract,
                  functionName: "joinLibrarySpoke",
                  args: [
                    activePaymentToken.address,
                    referrer as `0x${string}`,
                    estimate[2],
                  ],
                  value: estimate[4],
                }),
              );
            })();

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

          void notifyTelegramContractAlert("registration", hash, activeChain.id);

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
          errorMessage = `Insufficient ${activePaymentToken.symbol} balance or allowance`;
        } else if (error?.message?.includes("ReaderExists")) {
          errorMessage = "You are already registered";
        } else if (
          error?.message?.includes("TokenNotSupported") ||
          error?.message?.includes("not supported")
        ) {
          errorMessage = `${activePaymentToken.symbol} is not supported for registration on ${activeChain.name}.`;
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
    [
      activeChain.id,
      activeChain.name,
      activeMatrixContract,
      activePaymentToken.address,
      activePaymentToken.symbol,
      address,
      isHubChain,
      publicClient,
      refetchAllData,
      selectedPaymentTokenSupported,
      writeContractAsync,
    ]
  );

  const syncUserToSupportedChains = useCallback(
    async (toastId: string) => {
      if (!publicClient) {
        throw new Error(
          "Wallet client not available. Please connect your wallet.",
        );
      }

      if (!isHubChain) {
        return [];
      }

      const syncHashes: `0x${string}`[] = [];

      for (const target of syncTargetChains) {
        toast.info("Preparing Cross-chain Sync...", {
          id: toastId,
          description: `Calculating live sync gas for ${target.name}.`,
          duration: 10000,
        });

        const nativeFee = (await publicClient.readContract({
          ...activeMatrixContract,
          functionName: "quoteSyncFee",
          args: [target.eid],
        })) as bigint;

        toast.info("Confirm Cross-chain Sync...", {
          id: toastId,
          description: `Confirm sync to ${target.name} in your wallet.`,
          duration: 10000,
        });

        const syncHash = await withWalletConfirmTimeout(
          writeContractAsync({
            ...activeMatrixContract,
            functionName: "syncUserToSpoke",
            args: [target.eid],
            value: nativeFee,
          }),
        );

        syncHashes.push(syncHash);

        toast.loading("Cross-chain Sync Submitted", {
          id: toastId,
          description: `Syncing to ${target.name}. Transaction: ${syncHash.slice(
            0,
            10,
          )}...${syncHash.slice(-8)}`,
        });

        const receipt = await publicClient.waitForTransactionReceipt({
          hash: syncHash,
          confirmations: 1,
        });

        if (receipt.status !== "success") {
          throw new Error(`Cross-chain sync to ${target.name} failed on-chain`);
        }
      }

      return syncHashes;
    },
    [activeMatrixContract, isHubChain, publicClient, syncTargetChains, writeContractAsync],
  );

  // Buy chapter function
  const buyChapter = useCallback(
    async (track: number, chapter: number, broadcastAcrossChains = false) => {
      const toastId = "buy-chapter";

      try {
        setLoading(true);

        if (!publicClient) {
          throw new Error(
            "Wallet client not available. Please connect your wallet."
          );
        }
        if (!address) {
          throw new Error("Wallet address not available. Please reconnect your wallet.");
        }

        const trackName = track === 1 ? "Track 1 (X3)" : "Track 2 (X6)";

        toast.info("Purchasing Chapter...", {
          id: toastId,
          description: broadcastAcrossChains
            ? `Buying Chapter ${chapter} of ${trackName}. Cross-chain sync will be requested after purchase confirmation.`
            : `Buying Chapter ${chapter} of ${trackName} on this chain only. Please confirm in wallet.`,
          duration: 10000,
        });

        const hash = isHubChain
          ? await (async () => {
              if (!walletClient) {
                throw new Error(
                  "Wallet client not available. Please reconnect your wallet and try again.",
                );
              }

              const { request } = await publicClient.simulateContract({
                ...activeMatrixContract,
                account: address,
                functionName: "buyChapterBatchHub",
                args: [activePaymentToken.address, track, chapter, chapter],
              });

              return withWalletConfirmTimeout(
                walletClient.writeContract(request as ContractFunctionParameters),
              );
            })()
          : await (async () => {
              const estimate = (await publicClient.readContract({
                ...activeMatrixContract,
                functionName: "estimateChapterBuyCost",
                args: [activePaymentToken.address, chapter, chapter],
              })) as readonly [
                bigint,
                bigint,
                bigint,
                bigint,
                bigint,
                number,
                `0x${string}`,
              ];

              return withWalletConfirmTimeout(
                writeContractAsync({
                  ...activeMatrixContract,
                  functionName: "buyChapterSpoke",
                  args: [
                    activePaymentToken.address,
                    track,
                    chapter,
                    chapter,
                    estimate[2],
                  ],
                  value: estimate[4],
                }),
              );
            })();

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

          void notifyTelegramContractAlert("chapter-upgrade", hash, activeChain.id);

          if (address) {
            clearMatrixCache(address);
          }

          if (broadcastAcrossChains && isHubChain) {
            try {
              const syncHashes = await syncUserToSupportedChains(toastId);

              toast.success("Cross-chain Sync Complete!", {
                id: toastId,
                description: `Chapter ${chapter} synced across ${syncHashes.length} supported chains.`,
                duration: 5000,
              });
            } catch (syncError: any) {
              console.error("Error syncing chapter purchase:", syncError);
              toast.error("Sync Failed", {
                id: toastId,
                description:
                  syncError?.message ||
                  "The chapter purchase succeeded, but cross-chain sync did not complete.",
                duration: 8000,
              });
            }
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
          errorMessage = `Insufficient ${activePaymentToken.symbol} balance or allowance`;
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
      activeChain.id,
      activePaymentToken.address,
      activePaymentToken.symbol,
      activeMatrixContract,
      address,
      clearMatrixCache,
      isHubChain,
      publicClient,
      refetchAllData,
      syncUserToSupportedChains,
      walletClient,
    ]
  );

  const buyChapterBatch = useCallback(
    async (
      track: number,
      startChapter: number,
      endChapter: number,
      broadcastAcrossChains = false,
    ) => {
      const toastId = "buy-chapter-batch";

      try {
        setLoading(true);

        if (!publicClient) {
          throw new Error(
            "Wallet client not available. Please connect your wallet."
          );
        }
        if (!address) {
          throw new Error("Wallet address not available. Please reconnect your wallet.");
        }

        if (endChapter < startChapter) {
          throw new Error("Invalid chapter range");
        }

        const trackName = track === 1 ? "Track 1 (X3)" : "Track 2 (X6)";

        toast.info("Purchasing Chapters...", {
          id: toastId,
          description: broadcastAcrossChains
            ? `Buying Chapters ${startChapter}-${endChapter} of ${trackName}. Cross-chain sync will be requested after purchase confirmation.`
            : `Buying Chapters ${startChapter}-${endChapter} of ${trackName} on this chain only. Please confirm in wallet.`,
          duration: 10000,
        });

        const hash = isHubChain
          ? await (async () => {
              if (!walletClient) {
                throw new Error(
                  "Wallet client not available. Please reconnect your wallet and try again.",
                );
              }

              const { request } = await publicClient.simulateContract({
                ...activeMatrixContract,
                account: address,
                functionName: "buyChapterBatchHub",
                args: [
                  activePaymentToken.address,
                  track,
                  startChapter,
                  endChapter,
                ],
              });

              return withWalletConfirmTimeout(
                walletClient.writeContract(request as ContractFunctionParameters),
              );
            })()
          : await (async () => {
              const estimate = (await publicClient.readContract({
                ...activeMatrixContract,
                functionName: "estimateChapterBuyCost",
                args: [activePaymentToken.address, startChapter, endChapter],
              })) as readonly [
                bigint,
                bigint,
                bigint,
                bigint,
                bigint,
                number,
                `0x${string}`,
              ];

              return withWalletConfirmTimeout(
                writeContractAsync({
                  ...activeMatrixContract,
                  functionName: "buyChapterSpoke",
                  args: [
                    activePaymentToken.address,
                    track,
                    startChapter,
                    endChapter,
                    estimate[2],
                  ],
                  value: estimate[4],
                }),
              );
            })();

        toast.loading("Batch Purchase Submitted", {
          id: toastId,
          description: `Chapters ${startChapter}-${endChapter} purchase in progress. Transaction: ${hash.slice(
            0,
            10
          )}...${hash.slice(-8)}`,
        });

        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        if (receipt.status === "success") {
          toast.success("Batch Purchase Successful!", {
            id: toastId,
            description: `Successfully purchased Chapters ${startChapter}-${endChapter} of ${trackName}!`,
            duration: 5000,
          });

          void notifyTelegramContractAlert("chapter-upgrade", hash, activeChain.id);

          if (address) {
            clearMatrixCache(address);
          }

          if (broadcastAcrossChains && isHubChain) {
            try {
              const syncHashes = await syncUserToSupportedChains(toastId);

              toast.success("Cross-chain Sync Complete!", {
                id: toastId,
                description: `Chapters ${startChapter}-${endChapter} synced across ${syncHashes.length} supported chains.`,
                duration: 5000,
              });
            } catch (syncError: any) {
              console.error("Error syncing batch chapter purchase:", syncError);
              toast.error("Sync Failed", {
                id: toastId,
                description:
                  syncError?.message ||
                  "The chapter purchase succeeded, but cross-chain sync did not complete.",
                duration: 8000,
              });
            }
          }

          setTimeout(() => {
            refetchAllData();
          }, 2000);
        } else {
          throw new Error("Transaction failed on-chain");
        }

        return hash;
      } catch (error: any) {
        console.error("Error buying chapter batch:", error);

        let errorMessage = "Failed to purchase chapter batch";
        if (error?.message?.includes("rejected") || error?.code === 4001) {
          errorMessage = "Transaction was rejected in your wallet";
        } else if (error?.message?.includes("insufficient")) {
          errorMessage = `Insufficient ${activePaymentToken.symbol} balance or allowance`;
        } else if (error?.message?.includes("PreviousChapterRequired")) {
          errorMessage = "You need to unlock earlier chapters first";
        } else if (error?.message?.includes("InvalidBatch")) {
          errorMessage = "Invalid chapter batch";
        } else if (error?.message?.includes("on-chain")) {
          errorMessage = "Transaction failed on-chain";
        } else if (error?.message?.includes("Wallet client not available")) {
          errorMessage =
            "Wallet not connected. Please connect your wallet first.";
        }

        toast.error("Batch Purchase Failed", {
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
      activePaymentToken.symbol,
      activePaymentToken.address,
      activeMatrixContract,
      activeChain.id,
      address,
      clearMatrixCache,
      isHubChain,
      publicClient,
      refetchAllData,
      syncUserToSupportedChains,
      walletClient,
      writeContractAsync,
    ]
  );

  // Dashboard access uses the v2-to-v3 migrator contract.
  const migrateSelf = useCallback(async () => {
    const toastId = "migrate-self";

    try {
      setLoading(true);

      if (!publicClient) {
        throw new Error(
          "Wallet client not available. Please connect your wallet."
        );
      }
      if (!address) {
        throw new Error("Wallet address not available. Please reconnect your wallet.");
      }
      if (!isHubChain) {
        throw new Error("Migration must be submitted from BNB Smart Chain. Please switch your wallet to BSC first.");
      }

      toast.info("Preparing dashboard access...", {
        id: toastId,
        description: "Confirm the wallet transaction to continue.",
        duration: 10000,
      });

      const hash = await writeContractAsync({
        ...activeMigratorContract,
        functionName: "importUser",
        args: [address],
        value: BigInt(0),
      });

      toast.loading("Dashboard access submitted", {
        id: toastId,
        description: `Transaction: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status === "success") {
        toast.success("Account updated", {
          id: toastId,
          description: "Your account has been updated. Refreshing dashboard data...",
          duration: 5000,
        });

        setTimeout(() => {
          refetchUserData({ showToast: false });
          refetchAllData({ showToast: false });
        }, 2000);
      } else {
        throw new Error("Dashboard access transaction failed on-chain");
      }

      return hash;
    } catch (error: any) {
      console.error("Error preparing dashboard access:", error);

      let errorMessage = "We could not complete dashboard access for this wallet.";
      if (error?.message?.includes("rejected") || error?.code === 4001) {
        errorMessage = "Transaction was rejected in your wallet";
      } else if (
        error?.message?.includes("UnclaimedBalanceOnV2") ||
        error?.message?.includes("0x1293e7bc")
      ) {
        errorMessage =
          "This wallet still has unresolved legacy account requirements. Please clear any remaining legacy claims or contact support before continuing.";
      } else if (error?.message?.includes("AlreadyMigrated")) {
        errorMessage = "This wallet already has dashboard access.";
      } else if (error?.message?.includes("NotInV2")) {
        errorMessage = "This wallet could not be matched to a legacy dashboard record.";
      } else if (error?.message?.includes("V2CallFailed")) {
        errorMessage = "We could not verify the legacy dashboard record for this wallet right now.";
      } else if (error?.message?.includes("ZeroAddress")) {
        errorMessage = "Wallet address is missing. Please reconnect your wallet";
      } else if (error?.message?.includes("Reentrancy")) {
        errorMessage = "Dashboard access is already being processed. Please wait";
      } else if (error?.message?.includes("not configured")) {
        errorMessage = "Required contract is not configured";
      } else if (error?.message?.includes("Wallet client not available")) {
        errorMessage =
          "Wallet not connected. Please connect your wallet first.";
      } else if (error?.message?.includes("on-chain")) {
        errorMessage = "Transaction failed on-chain";
      }

      toast.error("Dashboard Access Unavailable", {
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
    address,
    publicClient,
    activeMigratorContract,
    refetchUserData,
    refetchAllData,
  ]);

  // Claim legacy royalty function
  const claimLegacyRoyalty = useCallback(
    async (amount?: string) => {
      const toastId = "claim-legacy-royalty";

      try {
        const availableAmount = amount
          ? Number(amount)
          : toUsdtNumber(legacyClaimable);
        if (availableAmount <= 0) {
          toast.error("Claim Failed", {
            id: toastId,
            description: "No legacy royalty is available to claim.",
            duration: 5000,
          });
          return;
        }

        setLoading(true);

        if (!publicClient) {
          throw new Error(
            "Wallet client not available. Please connect your wallet."
          );
        }

        if (!legacyV2Configured) {
          throw new Error("Legacy V2 contract is not configured.");
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
          ...legacyV2Contract,
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

          void notifyTelegramContractAlert("royalty-claim", hash, activeChain.id);

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
        } else if (error?.message?.includes("not configured")) {
          errorMessage = "Legacy V2 contract is not configured";
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
      legacyV2Configured,
      legacyV2Contract,
      legacyClaimable,
      refetchMigrationAndRoyaltyUI,
      refetchUserData,
    ]
  );

  const claimLegacyPendingRico = useCallback(
    async (amount?: string) => {
      const toastId = "claim-legacy-rico";

      try {
        const available = amount ? Number(amount) : toUsdtNumber(ricoPending);
        if (available <= 0) {
          toast.error("Legacy RICO Claim Failed", {
            id: toastId,
            description: "No pending legacy RICO is available to claim.",
            duration: 5000,
          });
          return;
        }

        setLoading(true);

        if (!publicClient) {
          throw new Error(
            "Wallet client not available. Please connect your wallet."
          );
        }

        if (!legacyV2Configured) {
          throw new Error("Legacy V2 contract is not configured.");
        }

        const claimAmount = amount ? parseUnits(amount, 18) : BigInt(0);

        toast.info("Claiming Legacy RICO...", {
          id: toastId,
          description: amount
            ? `Claiming ${amount} legacy RICO tokens`
            : "Claiming all available legacy RICO tokens",
          duration: 10000,
        });

        const hash = await writeContractAsync({
          ...legacyV2Contract,
          functionName: "claimRico",
          args: [claimAmount],
        });

        toast.loading("Legacy RICO Claim Submitted!", {
          id: toastId,
          description: `Transaction: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
        });

        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        if (receipt.status === "success") {
          toast.success("Legacy RICO Claimed!", {
            id: toastId,
            description: "Successfully claimed pending legacy RICO.",
            duration: 5000,
          });

          setTimeout(() => {
            refetchRicoPending();
            refetchMigrationAndRoyaltyUI();
            refetchUserData({ showToast: false });
          }, 2000);
        } else {
          throw new Error("Legacy RICO claim transaction failed on-chain");
        }

        return hash;
      } catch (error: any) {
        console.error("Error claiming legacy RICO:", error);

        let errorMessage = "Failed to claim legacy RICO";
        if (error?.message?.includes("rejected") || error?.code === 4001) {
          errorMessage = "Transaction was rejected in your wallet";
        } else if (error?.message?.includes("NoRicoToClaim")) {
          errorMessage = "No pending legacy RICO is available to claim";
        } else if (error?.message?.includes("not configured")) {
          errorMessage = "Legacy V2 contract is not configured";
        } else if (error?.message?.includes("on-chain")) {
          errorMessage = "Legacy RICO claim transaction failed on-chain";
        } else if (error?.message?.includes("Wallet client not available")) {
          errorMessage =
            "Wallet not connected. Please connect your wallet first.";
        }

        toast.error("Legacy RICO Claim Failed", {
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
      legacyV2Configured,
      legacyV2Contract,
      ricoPending,
      refetchRicoPending,
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
          ...activeMatrixContract,
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
    [
      activeMatrixContract,
      publicClient,
      refetchRicoFarming,
      refetchUserData,
      writeContractAsync,
    ]
  );

  // Claim V2 royalty function
  const claimRoyaltyV2 = useCallback(async () => {
    const toastId = "claim-royalty-v2";

    try {
      const available = toUsdtNumber(royaltyV2);
      if (available <= 0) {
        toast.error("V2 Royalty Claim Failed", {
          id: toastId,
          description: "No V2 royalty is available to claim.",
          duration: 5000,
        });
        return;
      }

      setLoading(true);

      if (!publicClient) {
        throw new Error(
          "Wallet client not available. Please connect your wallet."
        );
      }
      if (!legacyV2Configured) {
        throw new Error("Legacy V2 contract is not configured.");
      }

      toast.info("Claiming V2 Royalty...", {
        id: toastId,
        description: "Claiming fresh V2 royalty earnings",
        duration: 10000,
      });

      const hash = await writeContractAsync({
        ...legacyV2Contract,
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

        void notifyTelegramContractAlert("royalty-claim", hash, activeChain.id);

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
      } else if (error?.message?.includes("not configured")) {
        errorMessage = "Legacy V2 contract is not configured";
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
    legacyV2Contract,
    legacyV2Configured,
    royaltyV2,
    refetchRoyaltyV2,
    refetchMigrationAndRoyaltyUI,
    refetchUserData,
  ]);

  // Legacy claim royalty function (keep for compatibility)
  const claimRoyalty = useCallback(async () => {
    const toastId = "claim-royalty";

    try {
      const available = toUsdtNumber(royaltyAvailable);
      if (available < MIN_ROYALTY_USDT) {
        toast.error("Claim Failed", {
          id: toastId,
          description: `Minimum claim is ${MIN_ROYALTY_USDT} USDT.`,
          duration: 5000,
        });
        return;
      }

      toast.error("Claim Unavailable", {
        id: toastId,
        description:
          "The new hub ABI no longer exposes claimRoyaltyV3. V3 royalty claims must use the royalty vault flow.",
        duration: 7000,
      });

      return undefined;
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
  }, [
    royaltyAvailable,
  ]);

  const resolvedMigrationStatus = processMigrationStatus(migrationStatusData);
  const resolvedMigrationUI = processMigrationAndRoyaltyUI(migrationAndRoyaltyUI);
  const resolvedMigrationData: MigrationData = {
    ...resolvedMigrationUI,
    status: resolvedMigrationStatus.status,
    shouldMigrate: resolvedMigrationStatus.status === 1,
    canClaimLegacy: parseFloat(resolvedMigrationUI.legacyClaimable) > 0,
    hasV1: resolvedMigrationStatus.status === 1 || resolvedMigrationStatus.status === 2,
  };

  const userData: UserData = {
    ...parseUserDataFromMultipleSources(),
    migrationStatus: resolvedMigrationStatus,
    migrationData: resolvedMigrationData,
  };

  const formattedUsdtBalance = usdtBalance
    ? formatUnits(usdtBalance as bigint, activePaymentToken.decimals)
    : "0";
  const formattedUsdtAllowance = usdtAllowance
    ? formatUnits(usdtAllowance as bigint, activePaymentToken.decimals)
    : "0";
  const formattedPermit2Allowance = permit2Allowance
    ? formatUnits(permit2Allowance as bigint, activePaymentToken.decimals)
    : "0";

  return {
    // Contract interaction methods
    writeContract: writeContractAsync,
    contractConfig: activeMatrixContract,
    dashboardContractConfig: hubMatrixContract,
    isHubChain,
    dataScopeLabel: isHubChain ? "Hub" : `${activeChain.name} spoke + BSC hub data`,

    // Data
    userData,
    globalStats: globalStats as any,
    globalSummary: globalSummary as any,
    globalRicoFarming: globalRicoFarming as any,
    totalReaders: totalReaders as any,
    topEarners: topEarners as any,
    topReferrers: topReferrers as any,
    chapterPrices: chapterPrices as string[] | undefined,

    // Migration and royalty UI data
    migrationAndRoyaltyUI: resolvedMigrationData,

    // Individual data points
    legacyClaimable: legacyClaimable
      ? formatUnits(toBigIntValue(legacyClaimable), 18)
      : "0",
    royaltyV2: royaltyV2 ? formatUnits(toBigIntValue(royaltyV2), 18) : "0",
    royaltyPercentV2: royaltyPercentV2 ? Number(royaltyPercentV2) : 0,
    ricoPending: ricoPending ? formatUnits(toBigIntValue(ricoPending), 18) : "0",

    // Token addresses
    usdtAddress: usdtAddress as `0x${string}` | undefined,
    paymentTokenAddress: activePaymentToken.address,
    paymentTokenSymbol: activePaymentToken.symbol,
    paymentTokenDecimals: activePaymentToken.decimals,
    paymentTokenMaxAllowance: PAYMENT_TOKEN_MAX_ALLOWANCE,
    broadcastNativeFeeDisplay,
    broadcastNativeFeeUsd: BROADCAST_SYNC_USD_VALUE,
    nativePriceLoading,
    paymentTokenSupported: selectedPaymentTokenSupported,
    paymentTokens: activeChain.paymentTokens,
    selectedPaymentTokenAddress: activePaymentToken.address,
    setSelectedPaymentTokenAddress,
    activeChain,
    rewardTokenAddress,

    // Selected payment token data
    paymentTokenBalance: formattedUsdtBalance,
    paymentTokenAllowance: formattedUsdtAllowance,
    permit2Allowance: formattedPermit2Allowance,

    // Legacy aliases used by older components
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
    buyChapterBatch,
    migrateSelf,
    claimLegacyRoyalty,
    claimLegacyPendingRico,
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
