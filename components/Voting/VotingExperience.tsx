'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatUnits, maxUint256, parseUnits } from 'viem';
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { toast } from 'sonner';
import { votingContract } from '@/utils/contracts';
import { USDT_ABI, USDT_CONTRACT_ADDRESS, TOKEN_CONTRACT_ADDRESS } from '@/utils/constants';
import { useQuantuMatrix } from '@/hooks/useQuantuMatrix';
import { useTranslations } from 'next-intl';

const ZERO = BigInt(0);
const DEFAULT_SLIDER_MAX = 250;
const QUICK_PICK_COUNTS = [1, 5, 10, 25, 50, 100] as const;
const ALPHA_START = new Date('2026-06-20T00:00:00Z').getTime();
const MAINNET_START = new Date('2026-06-30T00:00:00Z').getTime();
const DEFAULT_USDT_PER_VOTE = parseUnits('2', 18);
const DEFAULT_RICO_PER_VOTE = parseUnits('70', 18);

const toBigInt = (value: unknown) => {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === 'string' && value.trim() !== '') return BigInt(value);
  return ZERO;
};

const formatToken = (value?: bigint | null, digits = 2) => {
  if (typeof value !== 'bigint') return '--';
  const parsed = Number(formatUnits(value, 18));
  if (!Number.isFinite(parsed)) return '--';
  return parsed.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: Math.max(digits, 4),
  });
};

const formatCount = (value?: bigint | null) => {
  if (typeof value !== 'bigint') return '--';
  return value.toLocaleString();
};

const shortAddress = (value?: string | null) => {
  if (!value) return '--';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const formatCountdown = (diff: number) => {
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalSeconds };
};

type VotingExperienceProps = {
  variant?: 'page' | 'modal';
  registeredOnly?: boolean;
  onSuccess?: () => void;
};

export function VotingExperience({
  variant = 'page',
  registeredOnly = false,
  onSuccess,
}: VotingExperienceProps) {
  const t = useTranslations('VotingPage');
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { userData, rewardTokenAddress } = useQuantuMatrix();

  const [voteCountInput, setVoteCountInput] = useState('10');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [activeAction, setActiveAction] = useState<'approve' | 'vote' | null>(null);
  const [submittedVoteCount, setSubmittedVoteCount] = useState(0);
  const [submittedReward, setSubmittedReward] = useState<bigint>(ZERO);
  const [now, setNow] = useState(() => Date.now());

  const isRegistered = Boolean(userData?.exists);
  const pageIsCompact = variant === 'modal';

  const announcementBullets = useMemo(
    () => t.raw('announcementBullets') as string[],
    [t],
  );

  const launchMilestones = useMemo(
    () => t.raw('launchMilestones') as Array<{ date: string; title: string }>,
    [t],
  );

  const { data: usdtPerVote, refetch: refetchUsdtPerVote } = useReadContract({
    ...votingContract,
    functionName: 'usdtPerVote',
  });

  const { data: ricoPerVote, refetch: refetchRicoPerVote } = useReadContract({
    ...votingContract,
    functionName: 'ricoPerVote',
  });

  const { data: usdtTokenAddress } = useReadContract({
    ...votingContract,
    functionName: 'usdtToken',
  });

  const { data: ricoTokenAddress } = useReadContract({
    ...votingContract,
    functionName: 'ricoToken',
  });

  const { data: dashboardData, refetch: refetchDashboardData } = useReadContract({
    ...votingContract,
    functionName: 'getDashboardData',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: totalVotesCast, refetch: refetchTotalVotesCast } = useReadContract({
    ...votingContract,
    functionName: 'totalVotesCast',
  });

  const { data: totalRicoDistributed, refetch: refetchTotalRicoDistributed } = useReadContract({
    ...votingContract,
    functionName: 'totalRicoDistributed',
  });

  const effectiveUsdtAddress =
    (usdtTokenAddress as `0x${string}` | undefined) || USDT_CONTRACT_ADDRESS;
  const effectiveRicoAddress =
    (ricoTokenAddress as `0x${string}` | undefined) ||
    rewardTokenAddress ||
    TOKEN_CONTRACT_ADDRESS;

  const { data: usdtBalance, refetch: refetchUsdtBalance } = useReadContract({
    address: effectiveUsdtAddress,
    abi: USDT_ABI,
    functionName: 'balanceOf',
    args: address && effectiveUsdtAddress ? [address] : undefined,
    query: { enabled: Boolean(address && effectiveUsdtAddress) },
  });

  const { data: usdtAllowance, refetch: refetchUsdtAllowance } = useReadContract({
    address: effectiveUsdtAddress,
    abi: USDT_ABI,
    functionName: 'allowance',
    args: address && effectiveUsdtAddress ? [address, votingContract.address] : undefined,
    query: { enabled: Boolean(address && effectiveUsdtAddress) },
  });

  const { data: ricoBalance, refetch: refetchRicoBalance } = useReadContract({
    address: effectiveRicoAddress,
    abi: USDT_ABI,
    functionName: 'balanceOf',
    args: address && effectiveRicoAddress ? [address] : undefined,
    query: { enabled: Boolean(address && effectiveRicoAddress) },
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
    query: { enabled: Boolean(txHash) },
  });

  const voteCount = useMemo(() => {
    const trimmed = voteCountInput.trim();
    if (!trimmed) return 0;
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.floor(value);
  }, [voteCountInput]);

  const sliderValue = Math.max(1, Math.min(DEFAULT_SLIDER_MAX, voteCount || 1));
  const parsedUsdtPerVote = toBigInt(usdtPerVote) > ZERO ? toBigInt(usdtPerVote) : DEFAULT_USDT_PER_VOTE;
  const parsedRicoPerVote = toBigInt(ricoPerVote) > ZERO ? toBigInt(ricoPerVote) : DEFAULT_RICO_PER_VOTE;
  const parsedUsdtBalance = toBigInt(usdtBalance);
  const parsedUsdtAllowance = toBigInt(usdtAllowance);
  const hasMaxStyleAllowance = parsedUsdtAllowance >= maxUint256 / BigInt(2);
  const allowanceDisplay = hasMaxStyleAllowance
    ? t('setup.unlimitedAllowance')
    : `${formatToken(parsedUsdtAllowance)} USDT`;

  const totalCost = voteCount > 0 ? parsedUsdtPerVote * BigInt(voteCount) : ZERO;
  const totalReward = voteCount > 0 ? parsedRicoPerVote * BigInt(voteCount) : ZERO;
  const needsApproval = !hasMaxStyleAllowance;
  const hasEnoughUsdt = totalCost <= parsedUsdtBalance;
  const canSubmitVote =
    isConnected &&
    voteCount > 0 &&
    hasEnoughUsdt &&
    (!registeredOnly || isRegistered) &&
    Boolean(writeContractAsync);

  const dashboardGlobal =
    ((dashboardData as any)?.global ?? (dashboardData as any)?.[0]) || undefined;
  const dashboardUser =
    ((dashboardData as any)?.user ?? (dashboardData as any)?.[1]) || undefined;

  const globalVotes = dashboardGlobal ? toBigInt(dashboardGlobal.totalVotesCast) : toBigInt(totalVotesCast);
  const globalRico = dashboardGlobal
    ? toBigInt(dashboardGlobal.totalRicoDistributed)
    : toBigInt(totalRicoDistributed);

  const userVotes = dashboardUser ? toBigInt(dashboardUser.votesCast) : ZERO;
  const userUsdtSpent = dashboardUser ? toBigInt(dashboardUser.usdtSpent) : ZERO;
  const userRicoReceived = dashboardUser ? toBigInt(dashboardUser.ricoReceived) : ZERO;
  const projectedUsdtDisplay = formatToken(totalCost);
  const projectedRicoDisplay = formatToken(totalReward);
  const currentStep = !isConnected
    ? 1
    : registeredOnly && !isRegistered
      ? 1
      : needsApproval
        ? 1
        : 2;

  const countdownState = useMemo(() => {
    if (now < ALPHA_START) {
      return {
        phase: 'alpha' as const,
        target: ALPHA_START,
      };
    }
    if (now < MAINNET_START) {
      return {
        phase: 'mainnet' as const,
        target: MAINNET_START,
      };
    }
    return {
      phase: 'live' as const,
      target: MAINNET_START,
    };
  }, [now]);

  const countdown = useMemo(() => {
    if (countdownState.phase === 'live') return null;
    return formatCountdown(countdownState.target - now);
  }, [countdownState, now]);

  const primaryButtonLabel = !isConnected
    ? t('actions.connectWallet')
    : registeredOnly && !isRegistered
      ? t('actions.registerRequired')
      : activeAction === 'approve' || (isConfirming && needsApproval)
        ? t('actions.approving')
        : activeAction === 'vote' || (isConfirming && !needsApproval)
          ? t('actions.casting')
          : needsApproval
            ? t('actions.approveMax')
            : t('actions.castVotes', { count: voteCount || 0 });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!txHash || !isConfirmed) return;

    const finish = async () => {
      await Promise.all([
        refetchDashboardData(),
        refetchTotalVotesCast(),
        refetchTotalRicoDistributed(),
        refetchUsdtBalance(),
        refetchUsdtAllowance(),
        refetchUsdtPerVote(),
        refetchRicoPerVote(),
        refetchRicoBalance(),
      ]);
      toast.success(t('toasts.voteSuccessTitle'), {
        description: t('toasts.voteSuccessDescription', {
          count: submittedVoteCount,
          reward: formatToken(submittedReward),
        }),
      });
      setActiveAction(null);
      setTxHash(null);
      setSubmittedVoteCount(0);
      setSubmittedReward(ZERO);
      onSuccess?.();
    };

    void finish();
  }, [
    isConfirmed,
    onSuccess,
    refetchDashboardData,
    refetchRicoBalance,
    refetchRicoPerVote,
    refetchTotalRicoDistributed,
    refetchTotalVotesCast,
    refetchUsdtAllowance,
    refetchUsdtBalance,
    refetchUsdtPerVote,
    txHash,
    submittedReward,
    submittedVoteCount,
  ]);

  const handleQuickPick = (count: number) => setVoteCountInput(String(count));

  const handleSliderChange = (value: number) => setVoteCountInput(String(value));

  const handleVote = async () => {
    if (!isConnected) {
      toast.error(t('toasts.connectWallet'));
      return;
    }
    if (registeredOnly && !isRegistered) {
      toast.error(t('toasts.registerRequired'));
      return;
    }
    if (!effectiveUsdtAddress || !writeContractAsync) return;
    if (voteCount <= 0) {
      toast.error(t('toasts.invalidCount'));
      return;
    }
    if (!hasEnoughUsdt) {
      toast.error(t('toasts.insufficientUsdt'));
      return;
    }

    try {
      if (needsApproval) {
        setActiveAction('approve');
        const approveHash = await writeContractAsync({
          address: effectiveUsdtAddress,
          abi: USDT_ABI,
          functionName: 'approve',
          args: [votingContract.address, maxUint256],
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
        await refetchUsdtAllowance();
        toast.success(t('toasts.approvalSuccessTitle'), {
          description: t('toasts.approvalSuccessDescription'),
        });
        setActiveAction(null);
        return;
      }

      setActiveAction('vote');
      setSubmittedVoteCount(voteCount);
      setSubmittedReward(totalReward);
      const hash = await writeContractAsync({
        ...votingContract,
        functionName: 'vote',
        args: [BigInt(voteCount)],
      });
      setTxHash(hash);
    } catch (error: any) {
      const message =
        error?.shortMessage ||
        error?.message ||
        t('toasts.voteFailedFallback');
      toast.error(t('toasts.voteFailedTitle'), { description: message });
      setActiveAction(null);
      setTxHash(null);
      setSubmittedVoteCount(0);
      setSubmittedReward(ZERO);
    }
  };

  return (
    <div className={`space-y-4 ${pageIsCompact ? 'max-h-[78vh] overflow-y-auto pr-1' : ''}`}>
      <section className="theme-panel relative overflow-hidden border border-yellow-400/20 bg-[radial-gradient(circle_at_top_right,rgba(245,166,35,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(0,212,255,0.08),transparent_26%),linear-gradient(180deg,rgba(10,12,18,0.98),rgba(4,6,10,0.98))] p-3.5 sm:p-4 md:p-5">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-yellow-300/70 to-transparent" />
        <div className="grid gap-3.5 md:gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <p className="theme-kicker mb-2">{t('hero.kicker')}</p>
                <h2 className="text-[1.4rem] font-semibold leading-tight text-slate-50 sm:text-2xl md:text-[2rem]">
                  {t('hero.title')}
                </h2>
                <p className="mt-2.5 text-sm leading-6 text-slate-300 md:mt-3 md:text-base">
                  {t('hero.description')}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {launchMilestones.map((milestone) => (
                  <div
                    key={milestone.date}
                    className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-200/80">
                      {milestone.date}
                    </p>
                    <p className="mt-1 text-xs text-slate-200">{milestone.title}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:mt-4 md:grid-cols-3">
              {announcementBullets.map((bullet) => (
                <div
                  key={bullet}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 sm:px-4"
                >
                  <p className="text-sm leading-6 text-slate-300">{bullet}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/80">
                    {countdownState.phase === 'alpha'
                      ? t('countdown.alphaKicker')
                      : countdownState.phase === 'mainnet'
                        ? t('countdown.mainnetKicker')
                        : t('countdown.liveKicker')}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-slate-50 md:text-lg">
                    {countdownState.phase === 'alpha'
                      ? t('countdown.alphaTitle')
                      : countdownState.phase === 'mainnet'
                        ? t('countdown.mainnetTitle')
                        : t('countdown.liveTitle')}
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">
                    {countdownState.phase === 'alpha'
                      ? t('countdown.alphaDate')
                      : countdownState.phase === 'mainnet'
                        ? t('countdown.mainnetDate')
                        : t('countdown.liveDate')}
                  </p>
                </div>
                <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-yellow-100">
                  {t('incentive.badge')}
                </span>
              </div>
              {countdown ? (
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-yellow-300 to-yellow-500 transition-[width] duration-1000 ease-linear"
                    style={{
                      width: `${Math.max(
                        3,
                        Math.min(
                          100,
                          ((countdown.totalSeconds % 86400) / 86400) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-4">
                {countdown ? (
                  <>
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-2.5 py-2.5 text-center sm:px-3 sm:py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{t('countdown.days')}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-50 sm:text-xl">{countdown.days}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-2.5 py-2.5 text-center sm:px-3 sm:py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{t('countdown.hours')}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-50 sm:text-xl">{countdown.hours}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-2.5 py-2.5 text-center sm:px-3 sm:py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{t('countdown.minutes')}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-50 sm:text-xl">{countdown.minutes}</p>
                    </div>
                    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-2.5 text-center sm:px-3 sm:py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/70">{t('countdown.seconds')}</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-50 sm:text-xl">{countdown.seconds}</p>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3 text-center sm:col-span-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-yellow-200/80">{t('countdown.liveBadge')}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-50">{t('countdown.liveNow')}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-3.5 sm:p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-yellow-200/80">{t('stats.perVoteCost')}</p>
              <p className="mt-2 text-lg font-semibold text-slate-50 sm:text-xl">{formatToken(parsedUsdtPerVote)} USDT</p>
            </div>
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-3.5 sm:p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">{t('stats.ricoPerVote')}</p>
              <p className="mt-2 text-lg font-semibold text-slate-50 sm:text-xl">{formatToken(parsedRicoPerVote)} RICO</p>
            </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 sm:col-span-2 sm:p-4 xl:col-span-1">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('stats.globalVotes')}</p>
                <p className="mt-2 text-lg font-semibold text-slate-50 sm:text-xl">{formatCount(globalVotes)}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>{t('stats.ricoDistributed')}</span>
                  <span className="font-medium text-slate-200">{formatToken(globalRico)} RICO</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="theme-panel border border-yellow-400/20 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(4,6,10,0.98))] p-4 sm:p-5 md:p-6">
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-6">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="theme-kicker mb-2">{t('setup.kicker')}</p>
                <h3 className="text-xl font-semibold text-slate-50 sm:text-2xl">{t('setup.title')}</h3>
                <p className="mt-2 text-sm text-slate-400">
                  {t('setup.description', {
                    usdt: formatToken(parsedUsdtPerVote),
                    rico: formatToken(parsedRicoPerVote),
                  })}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:mt-5 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <div
                className={`rounded-[1.5rem] border p-3.5 transition-all sm:p-4 ${
                  currentStep === 1
                    ? 'border-yellow-300/40 bg-yellow-500/12 shadow-[0_0_28px_rgba(245,166,35,0.16)]'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-yellow-300/40 bg-black/35 text-sm font-semibold text-yellow-100">
                    1
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-yellow-200/80">{t('flow.step1Label')}</p>
                    <h4 className="mt-1 text-base font-semibold text-slate-50">{t('flow.step1Title')}</h4>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{t('flow.step1Description')}</p>
              </div>

              <div className="hidden xl:flex items-center justify-center">
                <div className="h-px w-12 bg-gradient-to-r from-yellow-400/70 to-cyan-400/60" />
              </div>

              <div
                className={`rounded-[1.5rem] border p-3.5 transition-all sm:p-4 ${
                  currentStep === 2
                    ? 'border-cyan-300/35 bg-cyan-400/10 shadow-[0_0_28px_rgba(0,212,255,0.12)]'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/35 bg-black/35 text-sm font-semibold text-cyan-100">
                    2
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">{t('flow.step2Label')}</p>
                    <h4 className="mt-1 text-base font-semibold text-slate-50">{t('flow.step2Title')}</h4>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{t('flow.step2Description')}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/30 p-3.5 sm:mt-6 sm:rounded-[1.75rem] sm:p-4 md:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <label className="block flex-1">
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('setup.voteCount')}</span>
                  <div className="mt-2 flex items-center gap-3 rounded-2xl border border-yellow-400/20 bg-slate-950/80 px-4 py-3">
                    <span className="text-2xl text-yellow-300">⚡</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={voteCountInput}
                      onChange={(event) => setVoteCountInput(event.target.value)}
                      className="w-full bg-transparent text-2xl font-semibold text-slate-50 outline-none"
                      aria-label={t('setup.voteCount')}
                    />
                  </div>
                </label>
              </div>

              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                  <span>{t('setup.quickSlider')}</span>
                  <span>{voteCount > DEFAULT_SLIDER_MAX ? t('setup.customCount', { count: voteCount }) : t('setup.sliderCount', { count: sliderValue })}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={DEFAULT_SLIDER_MAX}
                  value={sliderValue}
                  onChange={(event) => handleSliderChange(Number(event.target.value))}
                  className="voting-range"
                  aria-label={t('setup.sliderAria')}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {QUICK_PICK_COUNTS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => handleQuickPick(count)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${voteCount === count ? 'border-yellow-300 bg-yellow-400/15 text-yellow-100' : 'border-white/10 bg-white/5 text-slate-300 hover:border-yellow-400/30 hover:text-slate-100'}`}
                    >
                      {count} vote{count === 1 ? '' : 's'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-yellow-400/20 bg-[linear-gradient(135deg,rgba(245,166,35,0.14),rgba(245,166,35,0.05))] px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex min-w-[3.5rem] items-center justify-center rounded-full border border-yellow-300/25 bg-black/25 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-yellow-100 shadow-[0_0_20px_rgba(245,166,35,0.12)]">
                        USDT
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-yellow-100/80">
                          {t('setup.projectedUsdt')}
                        </p>
                        <p className="mt-2 break-words text-xl font-semibold text-slate-50 sm:text-2xl">
                          {projectedUsdtDisplay} <span className="text-base text-yellow-100/80">USDT</span>
                        </p>
                      </div>
                    </div>
                    <div className="w-fit rounded-2xl border border-yellow-300/20 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.16em] text-yellow-100/70">
                      {voteCount || 0}x
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(0,212,255,0.14),rgba(0,212,255,0.04))] px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex min-w-[3.5rem] items-center justify-center rounded-full border border-cyan-300/25 bg-black/25 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100 shadow-[0_0_20px_rgba(0,212,255,0.12)]">
                        RICO
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/80">
                          {t('setup.projectedRico')}
                        </p>
                        <p className="mt-2 break-words text-xl font-semibold text-slate-50 sm:text-2xl">
                          {projectedRicoDisplay} <span className="text-base text-cyan-100/80">RICO</span>
                        </p>
                      </div>
                    </div>
                    <div className="w-fit rounded-2xl border border-cyan-300/20 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.16em] text-cyan-100/70">
                      +{voteCount || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('setup.totalCost')}</p>
                <p className="mt-2 text-xl font-semibold text-slate-50">{formatToken(totalCost)} USDT</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('setup.yourUsdt')}</p>
                <p className="mt-2 text-xl font-semibold text-slate-50">{formatToken(parsedUsdtBalance)} USDT</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('setup.allowance')}</p>
                <p className="mt-2 break-words text-xl font-semibold text-slate-50">{allowanceDisplay}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('setup.yourRicoWallet')}</p>
                <p className="mt-2 text-xl font-semibold text-slate-50">{formatToken(toBigInt(ricoBalance))} RICO</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-3.5 sm:rounded-[1.75rem] sm:p-4 md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('flow.currentStepLabel')}</p>
                  <h4 className="mt-2 text-lg font-semibold text-slate-50">
                    {currentStep === 1 ? t('flow.currentStepApprove') : t('flow.currentStepVote')}
                  </h4>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleVote}
                    disabled={activeAction !== null || isConfirming}
                    aria-disabled={!canSubmitVote}
                    className={`theme-button-primary min-h-12 justify-center px-6 text-sm ${
                      !canSubmitVote ? 'opacity-80 saturate-75' : ''
                    } disabled:cursor-not-allowed disabled:opacity-55`}
                  >
                    {primaryButtonLabel}
                  </button>
                  {pageIsCompact ? null : (
                    <a
                      href="https://t.me/ricomatrixdapp"
                      target="_blank"
                      rel="noreferrer"
                      className="theme-button-secondary min-h-12 justify-center px-6 text-sm"
                    >
                      {t('actions.joinTelegram')}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <aside className="grid gap-3 sm:gap-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-cyan-400/15 bg-[radial-gradient(circle_at_top,rgba(0,212,255,0.14),transparent_55%),linear-gradient(180deg,rgba(10,18,26,0.95),rgba(3,7,12,0.98))] p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">{t('flow.summaryKicker')}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3.5 sm:p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-300">{t('flow.summaryVotes')}</span>
                    <span className="text-lg font-semibold text-slate-50">{voteCount || 0}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3.5 sm:p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-300">{t('flow.summaryUsdt')}</span>
                    <span className="text-lg font-semibold text-slate-50">{projectedUsdtDisplay} USDT</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3.5 sm:p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-300">{t('flow.summaryRico')}</span>
                    <span className="text-lg font-semibold text-slate-50">{projectedRicoDisplay} RICO</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-yellow-400/20 bg-[linear-gradient(180deg,rgba(250,204,21,0.12),rgba(15,23,42,0.28))] p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-yellow-200/80">{t('snapshot.kicker')}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3.5 sm:p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('snapshot.votesCast')}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-50">{formatCount(userVotes)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3.5 sm:p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('snapshot.usdtSpent')}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-50">{formatToken(userUsdtSpent)} USDT</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3.5 sm:p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('snapshot.ricoReceived')}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-50">{formatToken(userRicoReceived)} RICO</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('details.kicker')}</p>
              <dl className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-4">
                  <dt>{t('details.contract')}</dt>
                  <dd className="font-medium text-slate-100">{shortAddress(votingContract.address)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>{t('details.usdtToken')}</dt>
                  <dd className="font-medium text-slate-100">{shortAddress(effectiveUsdtAddress)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>{t('details.ricoToken')}</dt>
                  <dd className="font-medium text-slate-100">{shortAddress(effectiveRicoAddress)}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </section>

      <style jsx>{`
        .voting-range {
          appearance: none;
          width: 100%;
          height: 16px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(245, 166, 35, 0.9), rgba(255, 205, 92, 0.72), rgba(0, 212, 255, 0.7));
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 24px rgba(245,166,35,0.18);
          outline: none;
        }

        .voting-range::-webkit-slider-thumb {
          appearance: none;
          width: 26px;
          height: 26px;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, #fff8d6, #f5a623 60%, #dd8c00 100%);
          border: 2px solid rgba(255, 255, 255, 0.76);
          box-shadow: 0 0 0 6px rgba(245,166,35,0.15), 0 0 28px rgba(0,212,255,0.2);
          cursor: pointer;
        }

        .voting-range::-moz-range-thumb {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, #fff8d6, #f5a623 60%, #dd8c00 100%);
          border: 2px solid rgba(255, 255, 255, 0.76);
          box-shadow: 0 0 0 6px rgba(245,166,35,0.15), 0 0 28px rgba(0,212,255,0.2);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
