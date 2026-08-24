import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import { useCallback, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { toast } from "sonner";
import {
  RICO_GIVEAWAY_ENGINE_ADDRESS,
} from "@/utils/constants";
import { RICO_GIVEAWAY_ENGINE_ABI } from "@/utils/ricoMatrixAbi";

const USD_DECIMALS = 18;

export type ThroneRecord = {
  winner: `0x${string}`;
  milestoneUSD: string;
  rewardRico: string;
  timestamp: number;
  isHistoricalImport: boolean;
};

export type GiveawayGlobalStats = {
  campaignActive: boolean;
  activatedAt: number;
  totalFundedRico: string;
  totalDistributedRico: string;
  totalClaimedRico: string;
  activeVolumeUSD: string;
  totalDropsCount: number;
  contractBalanceRico: string;
};

export type GiveawayUserBreakdown = {
  histTrack1USD: string;
  histTrack2USD: string;
  histTotalUSD: string;
  activeReferralUSD: string;
  activePersonalUSD: string;
  totalCombinedVolumeUSD: string;
  completedMilestones: number;
  nextMilestoneTargetUSD: string;
  totalClaimableRico: string;
};

const formatUsd = (value?: bigint) =>
  value !== undefined ? formatUnits(value, USD_DECIMALS) : "0";

export const useRicoGiveaway = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const hubPublicClient = usePublicClient({ chainId: 56 });
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);

  const isHubChain = chainId === 56;

  const giveawayContract = useMemo(
    () => ({
      address: RICO_GIVEAWAY_ENGINE_ADDRESS,
      abi: RICO_GIVEAWAY_ENGINE_ABI,
    }),
    [],
  );

  // Global campaign data — no wallet required, so this loads even for a
  // disconnected visitor browsing the rewards page.
  const { data: globalReads, refetch: refetchGlobal } = useReadContracts({
    contracts: [
      { ...giveawayContract, chainId: 56, functionName: "isActive" },
      { ...giveawayContract, chainId: 56, functionName: "getGlobalStats" },
      { ...giveawayContract, chainId: 56, functionName: "ricoDecimals" },
      { ...giveawayContract, chainId: 56, functionName: "firstMilestoneUSD" },
      { ...giveawayContract, chainId: 56, functionName: "milestoneStepUSD" },
    ],
    query: { enabled: true },
  });

  const globalList = (globalReads as any[] | undefined) ?? [];
  const isActive = Boolean(globalList[0]?.result);
  const globalStatsRaw = globalList[1]?.result as
    | readonly [boolean, bigint, bigint, bigint, bigint, bigint, bigint, bigint]
    | undefined;
  const ricoDecimals = (globalList[2]?.result as number | undefined) ?? 18;
  const firstMilestoneUSD = (globalList[3]?.result as bigint | undefined) ?? BigInt(0);
  const milestoneStepUSD = (globalList[4]?.result as bigint | undefined) ?? BigInt(0);

  const formatRico = useCallback(
    (value?: bigint) => (value !== undefined ? formatUnits(value, ricoDecimals) : "0"),
    [ricoDecimals],
  );

  const globalStats: GiveawayGlobalStats = useMemo(
    () => ({
      campaignActive: globalStatsRaw?.[0] ?? false,
      activatedAt: Number(globalStatsRaw?.[1] ?? BigInt(0)),
      totalFundedRico: formatRico(globalStatsRaw?.[2]),
      totalDistributedRico: formatRico(globalStatsRaw?.[3]),
      totalClaimedRico: formatRico(globalStatsRaw?.[4]),
      activeVolumeUSD: formatUsd(globalStatsRaw?.[5]),
      totalDropsCount: Number(globalStatsRaw?.[6] ?? BigInt(0)),
      contractBalanceRico: formatRico(globalStatsRaw?.[7]),
    }),
    [globalStatsRaw, formatRico],
  );

  // User-specific data — only meaningful once a wallet is connected.
  const {
    data: userReads,
    refetch: refetchUser,
  } = useReadContracts({
    contracts: address
      ? [
          { ...giveawayContract, chainId: 56, functionName: "isUserImported", args: [address] },
          {
            ...giveawayContract,
            chainId: 56,
            functionName: "getUserFullEarningsBreakdown",
            args: [address],
          },
        ]
      : [],
    query: { enabled: Boolean(address) },
  });

  const userList = (userReads as any[] | undefined) ?? [];
  const isImported = Boolean(userList[0]?.result);
  const breakdownRaw = userList[1]?.result as
    | readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]
    | undefined;

  const userBreakdown: GiveawayUserBreakdown = useMemo(
    () => ({
      histTrack1USD: formatUsd(breakdownRaw?.[0]),
      histTrack2USD: formatUsd(breakdownRaw?.[1]),
      histTotalUSD: formatUsd(breakdownRaw?.[2]),
      activeReferralUSD: formatUsd(breakdownRaw?.[3]),
      activePersonalUSD: formatUsd(breakdownRaw?.[4]),
      totalCombinedVolumeUSD: formatUsd(breakdownRaw?.[5]),
      completedMilestones: Number(breakdownRaw?.[6] ?? BigInt(0)),
      nextMilestoneTargetUSD: formatUsd(breakdownRaw?.[7]),
      totalClaimableRico: formatRico(breakdownRaw?.[8]),
    }),
    [breakdownRaw, formatRico],
  );

  const claimableValue = parseFloat(userBreakdown.totalClaimableRico) || 0;
  const canClaim = claimableValue > 0;

  const refetchAll = useCallback(async () => {
    await Promise.all([refetchGlobal(), refetchUser()]);
  }, [refetchGlobal, refetchUser]);

  // Permissionless self-import: pulls the caller's own historical Hub
  // earnings so their combined volume/milestone count display correctly.
  // Does not credit past $RICO rewards — only an admin batch import with
  // creditPastRewards=true can do that; this just seeds the baseline.
  const importMyHistoricalEarnings = useCallback(async () => {
    const toastId = "giveaway-import";

    try {
      if (!address) {
        throw new Error("Wallet address not available. Please connect your wallet.");
      }
      if (!isHubChain) {
        throw new Error(
          "Please switch your wallet to BNB Smart Chain to sync your rewards.",
        );
      }
      if (!hubPublicClient) {
        throw new Error("BSC client not available. Please reconnect your wallet.");
      }

      setLoading(true);
      toast.info("Syncing your history...", {
        id: toastId,
        description: "Confirm the sync in your wallet.",
        duration: 10000,
      });

      const hash = await writeContractAsync({
        ...giveawayContract,
        chainId: 56,
        functionName: "importMyHistoricalEarnings",
        args: [],
      });

      toast.loading("Sync submitted!", {
        id: toastId,
        description: `Transaction: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });

      const receipt = await hubPublicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status === "success") {
        toast.success("Rewards synced!", {
          id: toastId,
          description: "Your earnings history is now on the leaderboard.",
          duration: 5000,
        });
        setTimeout(() => {
          refetchAll();
        }, 1500);
      } else {
        throw new Error("Sync transaction failed on-chain");
      }

      return hash;
    } catch (error: any) {
      console.error("Error importing giveaway history:", error);

      const rawDetail: string =
        error?.shortMessage || error?.cause?.shortMessage || error?.message || "";

      let errorMessage = "Failed to sync your rewards";
      if (rawDetail.includes("rejected") || error?.code === 4001) {
        errorMessage = "Transaction was rejected in your wallet";
      } else if (rawDetail.includes("AlreadyImported")) {
        errorMessage = "Your history is already synced";
      } else if (rawDetail) {
        errorMessage = `Failed to sync your rewards: ${rawDetail.slice(0, 160)}`;
      }

      toast.error("Sync Failed", {
        id: toastId,
        description: errorMessage,
        duration: 7000,
      });

      throw error;
    } finally {
      setLoading(false);
    }
  }, [address, isHubChain, hubPublicClient, writeContractAsync, giveawayContract, refetchAll]);

  const claimRicoReward = useCallback(async () => {
    const toastId = "giveaway-claim";

    try {
      if (!address) {
        throw new Error("Wallet address not available. Please connect your wallet.");
      }
      if (!isHubChain) {
        throw new Error("Please switch your wallet to BNB Smart Chain to claim.");
      }
      if (!hubPublicClient) {
        throw new Error("BSC client not available. Please reconnect your wallet.");
      }
      if (!canClaim) {
        throw new Error("NothingToClaim: no reward available to claim");
      }

      setLoading(true);
      toast.info("Claiming your $RICO...", {
        id: toastId,
        description: "Confirm the claim in your wallet.",
        duration: 10000,
      });

      const hash = await writeContractAsync({
        ...giveawayContract,
        chainId: 56,
        functionName: "claimRicoReward",
        args: [],
      });

      toast.loading("Claim submitted!", {
        id: toastId,
        description: `Transaction: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });

      const receipt = await hubPublicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status === "success") {
        toast.success("$RICO Claimed!", {
          id: toastId,
          description: "Your reward has landed in your wallet.",
          duration: 5000,
        });
        setTimeout(() => {
          refetchAll();
        }, 1500);
      } else {
        throw new Error("Claim transaction failed on-chain");
      }

      return hash;
    } catch (error: any) {
      console.error("Error claiming giveaway reward:", error);

      const rawDetail: string =
        error?.shortMessage || error?.cause?.shortMessage || error?.message || "";

      let errorMessage = "Failed to claim your reward";
      if (rawDetail.includes("rejected") || error?.code === 4001) {
        errorMessage = "Transaction was rejected in your wallet";
      } else if (rawDetail.includes("NothingToClaim")) {
        errorMessage = "No reward available to claim yet";
      } else if (rawDetail.includes("InsufficientContractPool")) {
        errorMessage = "The rewards pool is temporarily low — please try again later.";
      } else if (rawDetail) {
        errorMessage = `Failed to claim your reward: ${rawDetail.slice(0, 160)}`;
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
  }, [address, isHubChain, hubPublicClient, canClaim, writeContractAsync, giveawayContract, refetchAll]);

  const fetchThroneRecords = useCallback(
    async (offset: number, limit: number): Promise<{ records: ThroneRecord[]; total: number }> => {
      const readerClient = hubPublicClient;
      if (!readerClient) return { records: [], total: 0 };

      try {
        const result = (await readerClient.readContract({
          ...giveawayContract,
          functionName: "getThroneRecordsPaginated",
          args: [BigInt(offset), BigInt(limit)],
        })) as readonly [
          readonly {
            winner: `0x${string}`;
            milestoneUSD: bigint;
            rewardRico: bigint;
            timestamp: bigint;
            isHistoricalImport: boolean;
          }[],
          bigint,
        ];

        const [rawRecords, total] = result;

        return {
          records: rawRecords.map((record) => ({
            winner: record.winner,
            milestoneUSD: formatUsd(record.milestoneUSD),
            rewardRico: formatRico(record.rewardRico),
            timestamp: Number(record.timestamp),
            isHistoricalImport: record.isHistoricalImport,
          })),
          total: Number(total),
        };
      } catch (error) {
        console.error("Error fetching throne history:", error);
        return { records: [], total: 0 };
      }
    },
    [hubPublicClient, giveawayContract, formatRico],
  );

  return {
    isConnected,
    isHubChain,
    loading,
    isActive,
    isImported,
    canClaim,
    globalStats,
    userBreakdown,
    firstMilestoneUSD: formatUsd(firstMilestoneUSD),
    milestoneStepUSD: formatUsd(milestoneStepUSD),
    ricoDecimals,
    importMyHistoricalEarnings,
    claimRicoReward,
    fetchThroneRecords,
    refetchAll,
  };
};
