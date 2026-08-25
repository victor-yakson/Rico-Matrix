'use client';

import { Header } from '@/components/Navigation/Header';
import { LoadingSpinner } from '@/components/Common/LoadingSpinner';
import { useQuantuMatrix } from '@/hooks/useQuantuMatrix';
import { ricoStakingContract } from '@/utils/contracts';
import { TOKEN_CONTRACT_ADDRESS, USDT_ABI } from '@/utils/constants';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from 'wagmi';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { StatTile } from '@/components/Common/StatTile';
import { ProgressBar } from '@/components/Common/ProgressBar';

type StakeRecord = {
  index: number;
  amount: bigint;
  startTime: bigint;
  duration: bigint;
  apy: bigint;
  bonus: bigint;
  rewardDebt: bigint;
  isActive: boolean;
  pendingReward: bigint;
};

const MAX_UINT256 = BigInt(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
);
const ZERO = BigInt(0);
const TEN_THOUSAND = BigInt(10000);
const DAY_IN_SECONDS = 86400;
const STAKE_SCAN_LIMIT = 24;
const PRESET_DURATIONS = [
  { label: '30 Days', days: 30, apy: '5% APY', apyRate: BigInt(5) },
  { label: '180 Days', days: 180, apy: '35% APY', apyRate: BigInt(35) },
  { label: '365 Days', days: 365, apy: '110% APY', apyRate: BigInt(110) },
] as const;
const ALLOWED_STAKE_DAYS: ReadonlySet<number> = new Set(
  PRESET_DURATIONS.map((option) => option.days)
);
const WHITEPAPER_URL = 'https://rico-token.gitbook.io/rico';

const formatTokenAmount = (value?: bigint | null, fractionDigits = 2) => {
  if (typeof value !== 'bigint') return '--';
  const parsed = Number(formatUnits(value, 18));
  if (!Number.isFinite(parsed)) return '--';
  return parsed.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: Math.max(fractionDigits, 4),
  });
};

const toDisplayNumber = (value?: bigint | null) => {
  if (typeof value !== 'bigint') return 0;
  const parsed = Number(formatUnits(value, 18));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatPercent = (value?: bigint | null) => {
  if (typeof value !== 'bigint') return '--';
  return `${value.toString()}%`;
};

const shortAddress = (value?: string | null) => {
  if (!value) return '--';
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const formatDateTime = (timestamp?: bigint | null) => {
  if (typeof timestamp !== 'bigint' || timestamp <= ZERO) return '--';
  return new Date(Number(timestamp) * 1000).toLocaleString();
};

const formatDuration = (duration?: bigint | null) => {
  if (typeof duration !== 'bigint' || duration <= ZERO) return '--';
  const days = Number(duration) / DAY_IN_SECONDS;
  if (days >= 365 && days % 365 === 0) {
    return `${days / 365} year${days / 365 > 1 ? 's' : ''}`;
  }
  return `${days.toLocaleString()} day${days === 1 ? '' : 's'}`;
};

const formatTimeLeft = (startTime?: bigint | null, duration?: bigint | null) => {
  if (typeof startTime !== 'bigint' || typeof duration !== 'bigint') return '--';
  const unlockAt = startTime + duration;
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (unlockAt <= now) return 'Unlocked';
  const remaining = Number(unlockAt - now);
  const days = Math.floor(remaining / DAY_IN_SECONDS);
  const hours = Math.floor((remaining % DAY_IN_SECONDS) / 3600);
  return `${days}d ${hours}h left`;
};

const getProgress = (startTime?: bigint | null, duration?: bigint | null) => {
  if (typeof startTime !== 'bigint' || typeof duration !== 'bigint' || duration <= ZERO) {
    return 0;
  }
  const now = BigInt(Math.floor(Date.now() / 1000));
  const elapsed = now > startTime ? now - startTime : ZERO;
  const ratio = Number((elapsed * TEN_THOUSAND) / duration) / 100;
  return Math.max(0, Math.min(100, ratio));
};

const getCooldownText = (lastClaim?: bigint | null, cooldown?: bigint | null) => {
  if (typeof lastClaim !== 'bigint' || typeof cooldown !== 'bigint' || cooldown <= ZERO) {
    return 'No cooldown data';
  }
  const readyAt = lastClaim + cooldown;
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (lastClaim === ZERO || readyAt <= now) return 'Claim available now';
  const remaining = Number(readyAt - now);
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  return `Ready in ${hours}h ${minutes}m`;
};

const SectionCard = ({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <section
    id={id}
    className="theme-panel p-5 md:p-6 lg:p-7"
  >
    <div className="mb-5">
      <h2 className="text-xl font-semibold text-slate-50">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
    {children}
  </section>
);

export default function RICOStatsPage() {
  const t = useTranslations("RicoPage");
  const copy = {
    hero: t.raw("hero") as Record<string, string>,
    nav: t.raw("nav") as Record<string, string>,
    summary: t.raw("summary") as Record<string, string>,
    sections: t.raw("sections") as Record<string, string>,
    labels: t.raw("labels") as Record<string, string>,
    actions: t.raw("actions") as Record<string, string>,
    inputs: t.raw("inputs") as Record<string, string>,
  };
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const {
    userData,
    globalRicoFarming,
    rewardTokenAddress,
    usdtAddress,
    refetchAllData,
    loading,
  } = useQuantuMatrix();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeDurationDays, setStakeDurationDays] = useState('365');
  const [fundAmount, setFundAmount] = useState('');
  const [recoverTokenAddress, setRecoverTokenAddress] = useState('');
  const [recoverTokenAmount, setRecoverTokenAmount] = useState('');
  const [recoverTokenDecimals, setRecoverTokenDecimals] = useState('18');
  const [newOwner, setNewOwner] = useState('');
  const [restakeDurations, setRestakeDurations] = useState<Record<number, string>>({});
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [stakes, setStakes] = useState<StakeRecord[]>([]);
  const [stakesLoading, setStakesLoading] = useState(false);

  const { data: ricoTokenAddress, refetch: refetchRicoToken } = useReadContract({
    ...ricoStakingContract,
    functionName: 'ricoToken',
  });
  const effectiveRicoTokenAddress =
    (ricoTokenAddress as `0x${string}` | undefined) ||
    rewardTokenAddress ||
    TOKEN_CONTRACT_ADDRESS;
  const { data: owner, refetch: refetchOwner } = useReadContract({
    ...ricoStakingContract,
    functionName: 'owner',
  });
  const { data: paused, refetch: refetchPaused } = useReadContract({
    ...ricoStakingContract,
    functionName: 'paused',
  });
  const { data: minStakeHolder, refetch: refetchMinStakeHolder } = useReadContract({
    ...ricoStakingContract,
    functionName: 'MIN_STAKE_HOLDER',
  });
  const { data: totalStaked, refetch: refetchTotalStaked } = useReadContract({
    ...ricoStakingContract,
    functionName: 'totalStaked',
  });
  const { data: totalBurned, refetch: refetchTotalBurned } = useReadContract({
    ...ricoStakingContract,
    functionName: 'totalBurned',
  });
  const { data: totalPenaltyDistributed, refetch: refetchTotalPenaltyDistributed } = useReadContract({
    ...ricoStakingContract,
    functionName: 'totalPenaltyDistributed',
  });
  const { data: accRewardPerShare, refetch: refetchAccRewardPerShare } = useReadContract({
    ...ricoStakingContract,
    functionName: 'accRewardPerShare',
  });
  const { data: totalStakedByUser, refetch: refetchTotalStakedByUser } = useReadContract({
    ...ricoStakingContract,
    functionName: 'totalStakedBy',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const { data: userKarma, refetch: refetchUserKarma } = useReadContract({
    ...ricoStakingContract,
    functionName: 'userKarma',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: ricoBalance, refetch: refetchRicoBalance } = useReadContract({
    address: effectiveRicoTokenAddress,
    abi: USDT_ABI,
    functionName: 'balanceOf',
    args: address && effectiveRicoTokenAddress ? [address] : undefined,
    query: { enabled: Boolean(address && effectiveRicoTokenAddress) },
  });
  const { data: ricoAllowance, refetch: refetchRicoAllowance } = useReadContract({
    address: effectiveRicoTokenAddress,
    abi: USDT_ABI,
    functionName: 'allowance',
    args: address && effectiveRicoTokenAddress ? [address, ricoStakingContract.address] : undefined,
    query: { enabled: Boolean(address && effectiveRicoTokenAddress) },
  });
  const { data: rewardPoolBalance, refetch: refetchRewardPoolBalance } = useReadContract({
    address: effectiveRicoTokenAddress,
    abi: USDT_ABI,
    functionName: 'balanceOf',
    args: effectiveRicoTokenAddress ? [ricoStakingContract.address] : undefined,
    query: { enabled: Boolean(effectiveRicoTokenAddress) },
  });

  const globalRicoShouldHave = globalRicoFarming?.[0]
    ? parseFloat(formatUnits(BigInt(globalRicoFarming[0]), 18)).toFixed(2)
    : '0.00';
  const globalRicoSent = globalRicoFarming?.[1]
    ? parseFloat(formatUnits(BigInt(globalRicoFarming[1]), 18)).toFixed(2)
    : '0.00';
  const globalRicoPending = globalRicoFarming?.[2]
    ? parseFloat(formatUnits(BigInt(globalRicoFarming[2]), 18)).toFixed(2)
    : '0.00';

  const globalDistributionPercentage = parseFloat(globalRicoShouldHave) > 0
    ? (parseFloat(globalRicoSent) / parseFloat(globalRicoShouldHave)) * 100
    : 0;
  const globalPortfolioCards = [
    {
      key: "earned",
      label: "Global Earned",
      value: `${globalRicoShouldHave} RICO`,
      numericValue: parseFloat(globalRicoShouldHave),
    },
    {
      key: "sent",
      label: "Global Sent",
      value: `${globalRicoSent} RICO`,
      numericValue: parseFloat(globalRicoSent),
    },
    {
      key: "pending",
      label: "Global Pending",
      value: `${globalRicoPending} RICO`,
      numericValue: parseFloat(globalRicoPending),
    },
    {
      key: "distribution",
      label: "Global Distribution",
      value: `${globalDistributionPercentage.toFixed(1)}%`,
      numericValue: globalDistributionPercentage,
    },
  ].filter((item) => item.numericValue > 0);
  const ricoBalanceValue = typeof ricoBalance === 'bigint' ? ricoBalance : undefined;
  const ricoAllowanceValue = typeof ricoAllowance === 'bigint' ? ricoAllowance : undefined;
  const totalStakedByUserValue = typeof totalStakedByUser === 'bigint' ? totalStakedByUser : undefined;
  const userKarmaValue = typeof userKarma === 'bigint' ? userKarma : undefined;
  const rewardPoolBalanceValue = typeof rewardPoolBalance === 'bigint' ? rewardPoolBalance : undefined;
  const accRewardPerShareValue = typeof accRewardPerShare === 'bigint' ? accRewardPerShare : undefined;
  const minStakeHolderValue = typeof minStakeHolder === 'bigint' ? minStakeHolder : undefined;
  const totalStakedValue = typeof totalStaked === 'bigint' ? totalStaked : undefined;
  const totalBurnedValue = typeof totalBurned === 'bigint' ? totalBurned : undefined;
  const totalPenaltyDistributedValue = typeof totalPenaltyDistributed === 'bigint' ? totalPenaltyDistributed : undefined;
  const personalDistributionPercentage = userData?.exists && parseFloat(userData.ricoShouldHave) > 0
    ? (parseFloat(userData.ricoSent) / parseFloat(userData.ricoShouldHave)) * 100
    : 0;

  const isOwner = useMemo(() => {
    if (!address || typeof owner !== 'string') return false;
    return owner.toLowerCase() === address.toLowerCase();
  }, [address, owner]);

  const parsedStakeAmount = useMemo(() => {
    try {
      return stakeAmount ? parseUnits(stakeAmount, 18) : ZERO;
    } catch {
      return ZERO;
    }
  }, [stakeAmount]);
  const selectedStakePlan = useMemo(
    () => PRESET_DURATIONS.find((option) => option.days === Number(stakeDurationDays)) ?? PRESET_DURATIONS[2],
    [stakeDurationDays]
  );
  const stakeProjection = useMemo(() => {
    if (parsedStakeAmount <= ZERO) {
      return {
        principal: ZERO,
        reward: ZERO,
        bonus: ZERO,
        total: ZERO,
      };
    }

    const durationSeconds = BigInt(selectedStakePlan.days * DAY_IN_SECONDS);
    const reward =
      (parsedStakeAmount * selectedStakePlan.apyRate * durationSeconds) /
      (BigInt(365 * DAY_IN_SECONDS) * BigInt(100));

    let bonus = ZERO;
    const tokenUnit = BigInt(10) ** BigInt(18);
    if (parsedStakeAmount >= BigInt(70000) * tokenUnit) {
      bonus = (parsedStakeAmount * BigInt(5)) / BigInt(100);
    } else if (parsedStakeAmount >= BigInt(15000) * tokenUnit) {
      bonus = parsedStakeAmount / BigInt(100);
    }

    return {
      principal: parsedStakeAmount,
      reward,
      bonus,
      total: parsedStakeAmount + reward + bonus,
    };
  }, [parsedStakeAmount, selectedStakePlan]);

  const hasAllowance = typeof ricoAllowanceValue === 'bigint' && ricoAllowanceValue >= parsedStakeAmount;
  const hasBalance = typeof ricoBalanceValue === 'bigint' && ricoBalanceValue >= parsedStakeAmount;
  const walletTokenAddress = useMemo(() => effectiveRicoTokenAddress, [effectiveRicoTokenAddress]);
  const tokenImportImage = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    return `${window.location.origin}/logo.png`;
  }, []);

  const loadStakes = useCallback(async () => {
    if (!publicClient || !address) {
      setStakes([]);
      return;
    }

    setStakesLoading(true);
    try {
      const collected: StakeRecord[] = [];
      let consecutiveFailures = 0;

      for (let index = 0; index < STAKE_SCAN_LIMIT; index += 1) {
        try {
          const rawStake = await publicClient.readContract({
            ...ricoStakingContract,
            functionName: 'userStakes',
            args: [address, BigInt(index)],
          });
          const tuple = rawStake as [bigint, bigint, bigint, bigint, bigint, bigint, boolean];
          const pendingReward = (await publicClient.readContract({
            ...ricoStakingContract,
            functionName: 'getPendingLTB',
            args: [address, BigInt(index)],
          })) as bigint;

          const record: StakeRecord = {
            index,
            amount: tuple[0] ?? ZERO,
            startTime: tuple[1] ?? ZERO,
            duration: tuple[2] ?? ZERO,
            apy: tuple[3] ?? ZERO,
            bonus: tuple[4] ?? ZERO,
            rewardDebt: tuple[5] ?? ZERO,
            isActive: Boolean(tuple[6]),
            pendingReward,
          };

          const hasData =
            record.amount > ZERO ||
            record.duration > ZERO ||
            record.startTime > ZERO ||
            record.pendingReward > ZERO;

          if (hasData) {
            collected.push(record);
            consecutiveFailures = 0;
          } else {
            consecutiveFailures += 1;
          }
        } catch {
          consecutiveFailures += 1;
        }

        if (consecutiveFailures >= 3 && index >= 2) break;
      }

      setStakes(collected);
    } finally {
      setStakesLoading(false);
    }
  }, [address, publicClient]);

  const refreshAll = useCallback(async (showToast = false) => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchAllData({ showToast }),
        refetchRicoToken(),
        refetchOwner(),
        refetchPaused(),
        refetchMinStakeHolder(),
        refetchTotalStaked(),
        refetchTotalBurned(),
        refetchTotalPenaltyDistributed(),
        refetchAccRewardPerShare(),
        refetchTotalStakedByUser(),
        refetchUserKarma(),
        refetchRicoBalance(),
        refetchRicoAllowance(),
        refetchRewardPoolBalance(),
      ]);
      await loadStakes();
      if (showToast) {
        toast.success('RICO dashboard refreshed.');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [
    loadStakes,
    refetchAccRewardPerShare,
    refetchAllData,
    refetchMinStakeHolder,
    refetchOwner,
    refetchPaused,
    refetchRewardPoolBalance,
    refetchRicoAllowance,
    refetchRicoBalance,
    refetchRicoToken,
    refetchTotalBurned,
    refetchTotalPenaltyDistributed,
    refetchTotalStaked,
    refetchTotalStakedByUser,
    refetchUserKarma,
  ]);

  useEffect(() => {
    if (!address) {
      setStakes([]);
      return;
    }

    void refreshAll(false);
  }, [address]);

  const runWrite = async (
    actionKey: string,
    successMessage: string,
    config: Parameters<typeof writeContractAsync>[0]
  ) => {
    if (!publicClient) {
      toast.error('Public client unavailable.');
      return;
    }
    setActiveAction(actionKey);
    try {
      const hash = await writeContractAsync(config);
      toast.success(`${successMessage} submitted.`);
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      await refreshAll(false);
      toast.success(successMessage);
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || `${successMessage} failed.`);
    } finally {
      setActiveAction(null);
    }
  };

  const handleApprove = async () => {
    if (!effectiveRicoTokenAddress) return toast.error('RICO token unavailable.');
    await runWrite('approve', 'Allowance updated', {
      address: effectiveRicoTokenAddress,
      abi: USDT_ABI,
      functionName: 'approve',
      args: [ricoStakingContract.address, MAX_UINT256],
    });
  };

  const handleStake = async () => {
    const durationDays = Number(stakeDurationDays);
    if (!stakeAmount || parsedStakeAmount <= ZERO) {
      toast.error('Enter a valid stake amount.');
      return;
    }
    if (!Number.isFinite(durationDays) || !ALLOWED_STAKE_DAYS.has(durationDays)) {
      toast.error('Choose one of the available staking plans.');
      return;
    }
    if (!hasBalance) {
      toast.error('Insufficient RICO balance.');
      return;
    }
    if (!hasAllowance) {
      toast.error('Approve RICO before staking.');
      return;
    }

    await runWrite('stake', 'Stake created successfully', {
      ...ricoStakingContract,
      functionName: 'stake',
      args: [parsedStakeAmount, BigInt(durationDays * DAY_IN_SECONDS)],
    });
  };

  const handleUnstake = async (index: number) => {
    await runWrite(`unstake-${index}`, 'Stake unstaked successfully', {
      ...ricoStakingContract,
      functionName: 'unstake',
      args: [BigInt(index)],
    });
  };

  const handleRestake = async (index: number) => {
    const durationDays = Number(restakeDurations[index] || '0');
    if (!Number.isFinite(durationDays) || !ALLOWED_STAKE_DAYS.has(durationDays)) {
      toast.error('Choose one of the available staking plans.');
      return;
    }
    await runWrite(`restake-${index}`, 'Stake restaked successfully', {
      ...ricoStakingContract,
      functionName: 'restake',
      args: [BigInt(index), BigInt(durationDays * DAY_IN_SECONDS)],
    });
  };

  const handleFundRewardPool = async () => {
    const amount = fundAmount ? parseUnits(fundAmount, 18) : ZERO;
    if (amount <= ZERO) {
      toast.error('Enter a valid funding amount.');
      return;
    }
    await runWrite('fundRewardPool', 'Reward pool funded successfully', {
      ...ricoStakingContract,
      functionName: 'fundRewardPool',
      args: [amount],
    });
  };

  const handlePause = async (shouldPause: boolean) => {
    await runWrite(shouldPause ? 'pause' : 'unpause', shouldPause ? 'Contract paused' : 'Contract unpaused', {
      ...ricoStakingContract,
      functionName: shouldPause ? 'pause' : 'unpause',
    });
  };

  const handleRecoverToken = async () => {
    const decimals = Number(recoverTokenDecimals);
    const amount = recoverTokenAmount ? parseUnits(recoverTokenAmount, decimals) : ZERO;
    if (!/^0x[a-fA-F0-9]{40}$/.test(recoverTokenAddress)) {
      toast.error('Enter a valid token address.');
      return;
    }
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36 || amount <= ZERO) {
      toast.error('Enter a valid recovery amount and decimals.');
      return;
    }

    await runWrite('recoverToken', 'Token recovered successfully', {
      ...ricoStakingContract,
      functionName: 'recoverToken',
      args: [recoverTokenAddress as `0x${string}`, amount],
    });
  };

  const handleTransferOwnership = async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(newOwner)) {
      toast.error('Enter a valid new owner address.');
      return;
    }
    await runWrite('transferOwnership', 'Ownership transferred successfully', {
      ...ricoStakingContract,
      functionName: 'transferOwnership',
      args: [newOwner as `0x${string}`],
    });
  };

  const handleRenounceOwnership = async () => {
    await runWrite('renounceOwnership', 'Ownership renounced successfully', {
      ...ricoStakingContract,
      functionName: 'renounceOwnership',
    });
  };

  const handleCopyTokenAddress = useCallback(async () => {
    if (!walletTokenAddress) {
      toast.error('RICO token address unavailable.');
      return;
    }

    try {
      await navigator.clipboard.writeText(walletTokenAddress);
      toast.success('RICO token address copied.');
    } catch {
      toast.error('Unable to copy token address.');
    }
  }, [walletTokenAddress]);

  const handleAddTokenToWallet = useCallback(async () => {
    if (!walletTokenAddress) {
      toast.error('RICO token address unavailable.');
      return;
    }

    if (typeof window === 'undefined') {
      toast.error('Wallet integration unavailable.');
      return;
    }

    const walletProvider = (
      window as Window & {
        ethereum?: { request: (args: { method: string; params?: unknown }) => Promise<unknown> };
      }
    ).ethereum;

    if (!walletProvider) {
      toast.error('No compatible wallet detected.');
      return;
    }

    setIsAddingToken(true);
    try {
      const wasAdded = await walletProvider.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: walletTokenAddress,
            symbol: 'RICO',
            decimals: 18,
            image: tokenImportImage,
          },
        },
      });

      if (wasAdded) {
        toast.success('RICO token added to wallet.');
      } else {
        toast.error('Wallet rejected the token import.');
      }
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || 'Unable to add token to wallet.');
    } finally {
      setIsAddingToken(false);
    }
  }, [tokenImportImage, walletTokenAddress]);

  if (loading && !userData) {
    return (
      <>
        <Header />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <LoadingSpinner />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="theme-shell theme-page-shell">
        <div className="theme-container px-4 sm:px-6 lg:px-8">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="theme-panel p-6 md:p-8 lg:p-10"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="theme-kicker">{copy.hero.kicker}</p>
                <h1 className="theme-title theme-title-accent mt-3 md:text-5xl">
                  {copy.hero.title}
                </h1>
                <p className="theme-copy mt-3 text-sm md:text-base">
                  {copy.hero.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(isRefreshing || stakesLoading) && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-yellow-100">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-300" />
                    Syncing protocol data
                  </span>
                )}
                <a
                  href={WHITEPAPER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="theme-button-ghost px-4 py-2 text-xs uppercase tracking-[0.18em]"
                >
                  {copy.actions.readWhitepaper}
                </a>
                <button
                  type="button"
                  onClick={() => void refreshAll(true)}
                  disabled={isRefreshing || activeAction !== null}
                  className="theme-button-secondary px-4 py-2 text-xs uppercase tracking-[0.18em] disabled:opacity-50"
                >
                  {isRefreshing ? copy.nav.refreshing : copy.nav.refresh}
                </button>
              </div>
            </div>
          </motion.section>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label={copy.summary.walletRico}
              value={toDisplayNumber(ricoBalanceValue)}
              accent="gold"
              icon={<span>👛</span>}
              sublabel={`${copy.summary.allowance} ${formatTokenAmount(ricoAllowanceValue)}`}
            />
            <StatTile
              label={copy.summary.yourStaked}
              value={toDisplayNumber(totalStakedByUserValue)}
              accent="emerald"
              icon={<span>🔒</span>}
              sublabel={`${copy.summary.karma} ${formatTokenAmount(userKarmaValue)}`}
            />
            <StatTile
              label={copy.summary.rewardPool}
              value={toDisplayNumber(rewardPoolBalanceValue)}
              accent="sky"
              icon={<span>🏆</span>}
              sublabel={`${copy.summary.accShare} ${formatTokenAmount(accRewardPerShareValue, 4)}`}
            />
            <StatTile
              label={copy.labels.totalStaked}
              value={toDisplayNumber(totalStakedValue)}
              accent="gold"
              icon={<span>📊</span>}
              sublabel={`${copy.labels.penaltyDistributed} ${formatTokenAmount(totalPenaltyDistributedValue)}`}
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-12">
            <div className="space-y-6 xl:col-span-8">
              <SectionCard
                id="staking"
                title={copy.sections.stakeTitle}
                description={copy.sections.stakeDescription}
              >
                <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
                  <div className="space-y-4 rounded-[28px] border border-yellow-400/15 bg-[linear-gradient(180deg,rgba(255,219,128,0.07),rgba(12,12,12,0.82))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.3)] sm:p-5 md:p-6">
                    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/35 p-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Staking Flow</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-50 sm:text-xl">
                          Pick a plan, enter your amount, then complete the next step.
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm text-slate-400">
                          Three plans. Clear APY. No guesswork.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Selected Plan</p>
                        <p className="mt-1 text-base font-semibold text-yellow-100 sm:text-lg">{selectedStakePlan.apy}</p>
                        <p className="text-sm text-slate-300">{selectedStakePlan.label}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      {PRESET_DURATIONS.map((plan) => {
                        const isSelected = plan.days === Number(stakeDurationDays);
                        return (
                          <button
                            type="button"
                            key={plan.days}
                            onClick={() => setStakeDurationDays(String(plan.days))}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                              isSelected
                                ? 'border-yellow-400/40 bg-yellow-500/12 shadow-[0_0_0_1px_rgba(241,210,133,0.14)]'
                                : 'border-white/10 bg-black/30 hover:border-yellow-400/20 hover:bg-yellow-500/5'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="text-left">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Plan</p>
                                <p className="mt-1 text-base font-semibold text-slate-50">{plan.label}</p>
                                <p className="mt-1 text-sm text-yellow-200">{plan.apy}</p>
                              </div>
                              <span
                                className={`mt-1 inline-flex h-3 w-3 rounded-full ${
                                  isSelected ? 'bg-yellow-300 shadow-[0_0_12px_rgba(241,210,133,0.7)]' : 'bg-slate-600'
                                }`}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-yellow-200">Step 1</p>
                        <label className="mt-3 block">
                          <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{copy.inputs.amountRico}</span>
                          <input
                            value={stakeAmount}
                            onChange={(event) => setStakeAmount(event.target.value)}
                            placeholder="1000"
                            inputMode="decimal"
                            className="mt-1.5 w-full rounded-xl border border-slate-700 bg-black/60 px-3 py-3 text-sm text-slate-200 outline-none transition focus:border-yellow-300/40"
                          />
                        </label>
                        <p className="mt-3 text-xs text-slate-400">
                          Minimum stake is {formatTokenAmount(minStakeHolderValue)} RICO. Larger positions unlock bonus rewards at 15,000 and 70,000 RICO.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-yellow-200">Step 2</p>
                        <label className="mt-3 block">
                          <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{copy.inputs.duration}</span>
                          <select
                            value={stakeDurationDays}
                            onChange={(event) => setStakeDurationDays(event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-slate-700 bg-black/60 px-3 py-3 text-sm text-slate-200 outline-none transition focus:border-yellow-300/40"
                          >
                            {PRESET_DURATIONS.map((option) => (
                              <option key={option.days} value={option.days}>
                                {option.apy} - {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p className="mt-3 text-xs text-slate-400">
                          Selected plan:{' '}
                          <span className="font-semibold text-yellow-200">
                            {selectedStakePlan.apy} - {selectedStakePlan.label}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className={`rounded-xl border px-3 py-3 ${hasBalance ? 'border-yellow-400/30 bg-yellow-500/10 text-yellow-100' : 'border-red-400/30 bg-red-500/10 text-red-100'}`}>
                        <p className="text-[11px] uppercase tracking-[0.16em]">{copy.labels.balanceCheck}</p>
                        <p className="mt-1 text-sm">{hasBalance ? copy.labels.sufficientBalance : copy.labels.insufficientBalance}</p>
                      </div>
                      <div className={`rounded-xl border px-3 py-3 ${hasAllowance ? 'border-yellow-400/30 bg-yellow-500/10 text-yellow-100' : 'border-yellow-400/30 bg-yellow-500/10 text-yellow-100'}`}>
                        <p className="text-[11px] uppercase tracking-[0.16em]">{copy.labels.allowanceCheck}</p>
                        <p className="mt-1 text-sm">{hasAllowance ? copy.labels.allowanceReady : copy.labels.approvalRequired}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-yellow-200">Step 3</p>
                          <p className="mt-1 text-sm text-slate-300">
                            {!hasAllowance
                              ? 'Approve the staking contract once before you lock your position.'
                              : 'Allowance is ready. You can create your stake now.'}
                          </p>
                        </div>
                        <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-yellow-100">
                          {!hasAllowance ? 'Step 1 of 2' : 'Step 2 of 2'}
                        </span>
                      </div>

                      <div className="mt-4">
                        {!hasAllowance ? (
                          <button
                            type="button"
                            onClick={() => void handleApprove()}
                            disabled={activeAction === 'approve' || !address || !effectiveRicoTokenAddress}
                            className="w-full rounded-xl bg-gradient-to-r from-yellow-300 to-amber-200 px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
                          >
                            {activeAction === 'approve' ? copy.actions.approving : copy.actions.approveRico}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleStake()}
                            disabled={activeAction === 'stake' || !address || paused === true}
                            className="w-full rounded-xl bg-gradient-to-r from-yellow-300 to-amber-200 px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
                          >
                            {activeAction === 'stake' ? copy.actions.staking : copy.actions.createStake}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-4 sm:p-5">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">{copy.labels.protocolRules}</h3>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{copy.labels.minimumHolder}</p>
                          <p className="mt-1 text-lg font-semibold text-slate-50">{formatTokenAmount(minStakeHolderValue)}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{copy.labels.paused}</p>
                          <p className="mt-1 text-lg font-semibold text-slate-50">{paused ? copy.labels.yes : copy.labels.no}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">RICO Token</p>
                          <p className="mt-1 text-sm font-semibold text-slate-50">{shortAddress(effectiveRicoTokenAddress)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-yellow-400/20 bg-yellow-500/8 p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Stake Calculator</p>
                          <p className="mt-1 text-sm text-slate-300">
                            Estimate your maturity payout for the selected staking plan.
                          </p>
                        </div>
                        <span className="rounded-full border border-yellow-400/30 bg-yellow-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-yellow-100">
                          {selectedStakePlan.apy}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Principal</p>
                          <p className="mt-1 text-lg font-semibold text-slate-50">
                            {formatTokenAmount(stakeProjection.principal)} RICO
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Plan</p>
                          <p className="mt-1 text-lg font-semibold text-slate-50">
                            {selectedStakePlan.label}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Estimated APY Reward</p>
                          <p className="mt-1 text-lg font-semibold text-yellow-200">
                            {formatTokenAmount(stakeProjection.reward)} RICO
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Bonus</p>
                          <p className="mt-1 text-lg font-semibold text-yellow-200">
                            {formatTokenAmount(stakeProjection.bonus)} RICO
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl border border-yellow-400/20 bg-black/40 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Estimated Total At Maturity</p>
                        <p className="mt-1 text-2xl font-semibold text-yellow-100">
                          {formatTokenAmount(stakeProjection.total)} RICO
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          This estimate includes principal, plan reward, and stake-size bonus. It excludes additional penalty distribution rewards.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                id="positions"
                title={copy.sections.positionsTitle}
                description={copy.sections.positionsDescription}
              >
                {stakesLoading ? (
                  <div className="flex justify-center py-10">
                    <LoadingSpinner />
                  </div>
                ) : stakes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
                    {copy.labels.noPositions}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stakes.map((stake, stakeIndex) => {
                      const progress = getProgress(stake.startTime, stake.duration);
                      const restakeValue = restakeDurations[stake.index] || '365';
                      return (
                        <motion.article
                          key={stake.index}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: Math.min(stakeIndex, 8) * 0.05 }}
                          className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,17,17,0.96),rgba(8,8,8,0.92))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.32)] transition-colors hover:border-yellow-400/25"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-[0.16em] text-amber-300/80">Stake #{stake.index}</p>
                              <h3 className="mt-1 text-xl font-semibold text-slate-50">{formatTokenAmount(stake.amount)} RICO</h3>
                              <p className="mt-1 text-sm text-slate-400">
                                Started {formatDateTime(stake.startTime)} • Duration {formatDuration(stake.duration)}
                              </p>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${stake.isActive ? 'border-yellow-400/30 bg-yellow-500/10 text-yellow-100' : 'border-slate-600 bg-slate-800/80 text-slate-300'}`}>
                              {stake.isActive ? copy.labels.active : copy.labels.closed}
                            </span>
                          </div>

                          <div className="mt-5 grid gap-3 md:grid-cols-4">
                            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{copy.labels.pendingReward}</p>
                              <p className="mt-1 text-lg font-semibold text-slate-50">{formatTokenAmount(stake.pendingReward, 4)}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">APY</p>
                              <p className="mt-1 text-lg font-semibold text-slate-50">{formatPercent(stake.apy)}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{copy.labels.bonus}</p>
                              <p className="mt-1 text-lg font-semibold text-slate-50">{formatTokenAmount(stake.bonus, 4)}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{copy.labels.unlockStatus}</p>
                              <p className="mt-1 text-lg font-semibold text-slate-50">{formatTimeLeft(stake.startTime, stake.duration)}</p>
                            </div>
                          </div>

                          <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                            <ProgressBar
                              label={copy.labels.progress}
                              valueLabel={`${progress.toFixed(1)}%`}
                              percent={progress}
                            />
                          </div>

                          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                            <div className="flex items-center gap-2">
                              <select
                                value={restakeValue}
                                onChange={(event) =>
                                  setRestakeDurations((current) => ({
                                    ...current,
                                    [stake.index]: event.target.value,
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-700 bg-black/60 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-yellow-300/40"
                              >
                                {PRESET_DURATIONS.map((option) => (
                                  <option key={option.days} value={option.days}>
                                    {copy.actions.restake} {option.apy} - {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleRestake(stake.index)}
                              disabled={activeAction === `restake-${stake.index}` || !stake.isActive || paused === true}
                              className="rounded-xl border border-yellow-400/40 bg-yellow-500/10 px-4 py-2.5 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-500/20 disabled:opacity-50"
                            >
                              {activeAction === `restake-${stake.index}` ? copy.actions.restaking : copy.actions.restake}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleUnstake(stake.index)}
                              disabled={activeAction === `unstake-${stake.index}` || !stake.isActive || paused === true}
                              className="rounded-xl border border-yellow-400/40 bg-yellow-500/10 px-4 py-2.5 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-500/20 disabled:opacity-50"
                            >
                              {activeAction === `unstake-${stake.index}` ? copy.actions.unstaking : copy.actions.unstake}
                            </button>
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                id="portfolio"
                title={copy.sections.portfolioTitle}
                description={copy.sections.portfolioDescription}
              >
                {globalPortfolioCards.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {globalPortfolioCards.map((card) => (
                      <StatTile
                        key={card.key}
                        label={card.label}
                        value={Number.isFinite(card.numericValue) ? card.numericValue : 0}
                        suffix=" RICO"
                        accent="slate"
                      />
                    ))}
                  </div>
                ) : null}
                {userData?.exists ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <StatTile
                      label="Your Earned"
                      value={parseFloat(userData.ricoShouldHave || '0')}
                      suffix=" RICO"
                      accent="gold"
                    />
                    <StatTile
                      label="Your Sent"
                      value={parseFloat(userData.ricoSent || '0')}
                      suffix=" RICO"
                      accent="gold"
                    />
                    <StatTile
                      label="Your Distribution"
                      value={personalDistributionPercentage}
                      suffix="%"
                      accent="gold"
                    />
                  </div>
                ) : null}
              </SectionCard>
            </div>

            <div className="space-y-6 xl:col-span-4">
              <SectionCard
                title={copy.sections.totalsTitle}
                description={copy.sections.totalsDescription}
              >
                <div className="grid gap-3">
                  <StatTile
                    label={copy.labels.totalStaked}
                    value={toDisplayNumber(totalStakedValue)}
                    accent="gold"
                    className="!p-4"
                  />
                  <StatTile
                    label={copy.labels.totalBurned}
                    value={toDisplayNumber(totalBurnedValue)}
                    accent="rose"
                    className="!p-4"
                  />
                  <StatTile
                    label={copy.labels.penaltyDistributed}
                    value={toDisplayNumber(totalPenaltyDistributedValue)}
                    accent="slate"
                    className="!p-4"
                  />
                </div>
              </SectionCard>

              {isOwner ? (
                <SectionCard
                  id="owner"
                  title={copy.sections.ownerTitle}
                  description={copy.sections.ownerDescription}
                >
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{copy.labels.contractOwner}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-50">{shortAddress(owner as string | undefined)}</p>
                    </div>

                    <div className="grid gap-3">
                      <label className="block">
                        <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{copy.inputs.fundRewardPool}</span>
                        <input
                          value={fundAmount}
                          onChange={(event) => setFundAmount(event.target.value)}
                          placeholder="10000"
                          className="mt-1.5 w-full rounded-xl border border-slate-700 bg-black/60 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-amber-300/50"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void handleFundRewardPool()}
                        disabled={activeAction === 'fundRewardPool'}
                        className="rounded-xl border border-yellow-400/40 bg-yellow-500/10 px-4 py-2.5 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-500/20 disabled:opacity-50"
                      >
                        {activeAction === 'fundRewardPool' ? copy.actions.funding : copy.actions.fundRewardPool}
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => void handlePause(true)}
                        disabled={activeAction === 'pause' || paused === true}
                        className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {copy.actions.pauseContract}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handlePause(false)}
                        disabled={activeAction === 'unpause' || paused === false}
                        className="rounded-xl border border-yellow-400/40 bg-yellow-500/10 px-4 py-2.5 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-500/20 disabled:opacity-50"
                      >
                        {copy.actions.unpauseContract}
                      </button>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                      <h3 className="text-sm font-semibold text-slate-100">{copy.labels.recoverToken}</h3>
                      <input
                        value={recoverTokenAddress}
                        onChange={(event) => setRecoverTokenAddress(event.target.value)}
                        placeholder={copy.inputs.tokenAddress}
                        className="w-full rounded-xl border border-slate-700 bg-black/60 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-amber-300/50"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          value={recoverTokenAmount}
                          onChange={(event) => setRecoverTokenAmount(event.target.value)}
                          placeholder={copy.inputs.amount}
                          className="w-full rounded-xl border border-slate-700 bg-black/60 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-amber-300/50"
                        />
                        <input
                          value={recoverTokenDecimals}
                          onChange={(event) => setRecoverTokenDecimals(event.target.value)}
                          placeholder={copy.inputs.decimals}
                          className="w-full rounded-xl border border-slate-700 bg-black/60 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-amber-300/50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRecoverToken()}
                        disabled={activeAction === 'recoverToken'}
                        className="w-full rounded-xl border border-yellow-400/40 bg-yellow-500/10 px-4 py-2.5 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-500/20 disabled:opacity-50"
                      >
                        {activeAction === 'recoverToken' ? copy.actions.recovering : copy.actions.recoverToken}
                      </button>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                      <h3 className="text-sm font-semibold text-slate-100">{copy.labels.ownership}</h3>
                      <input
                        value={newOwner}
                        onChange={(event) => setNewOwner(event.target.value)}
                        placeholder={copy.inputs.newOwnerAddress}
                        className="w-full rounded-xl border border-slate-700 bg-black/60 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-amber-300/50"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => void handleTransferOwnership()}
                          disabled={activeAction === 'transferOwnership'}
                          className="rounded-xl border border-yellow-400/40 bg-yellow-500/10 px-4 py-2.5 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-500/20 disabled:opacity-50"
                        >
                          {copy.actions.transferOwnership}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRenounceOwnership()}
                          disabled={activeAction === 'renounceOwnership'}
                          className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 disabled:opacity-50"
                        >
                          {copy.actions.renounceOwnership}
                        </button>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              ) : null}
            </div>
          </div>

          <div className="mt-6">
            <SectionCard
              id="token-tools"
              title={copy.nav.tokenTools}
              description={copy.sections.stakeDescription}
            >
              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{copy.labels.tokenAddress}</p>
                    <p className="mt-2 text-lg font-semibold text-amber-200">{shortAddress(walletTokenAddress)}</p>
                    <button
                      type="button"
                      onClick={() => void handleCopyTokenAddress()}
                      className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-yellow-200 transition hover:text-yellow-100"
                    >
                      {copy.actions.copyTokenAddress}
                    </button>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{copy.labels.tokenSymbol}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-50">RICO</p>
                    <p className="mt-2 text-xs text-slate-500">{copy.labels.walletSupport}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{copy.labels.tokenDecimals}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-50">18</p>
                    <p className="mt-2 text-xs text-slate-500">{copy.labels.manualImport}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-yellow-100/80">{copy.labels.walletSupport}</p>
                  <h3 className="mt-2 text-xl font-semibold text-yellow-50">{copy.actions.addToken}</h3>
                  <p className="mt-2 text-sm text-yellow-100/80">
                    Use the automatic wallet prompt or copy the contract address and import the token manually in MetaMask, Trust Wallet, or Coinbase Wallet.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleAddTokenToWallet()}
                      disabled={isAddingToken || !walletTokenAddress}
                      className="theme-button-primary px-4 py-2.5 text-sm disabled:opacity-50"
                    >
                      {isAddingToken ? copy.actions.addingToken : copy.actions.addToken}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopyTokenAddress()}
                      disabled={!walletTokenAddress}
                      className="theme-button-secondary px-4 py-2.5 text-sm disabled:opacity-50"
                    >
                      {copy.actions.copyTokenAddress}
                    </button>
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/50 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{copy.labels.manualImport}</p>
                    <p className="mt-1 break-all text-sm font-medium text-slate-100">{walletTokenAddress ?? '--'}</p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </>
  );
}
