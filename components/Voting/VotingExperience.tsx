'use client';

import { useMemo, useState } from 'react';
import { formatUnits, maxUint256, parseUnits } from 'viem';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { toast } from 'sonner';
import { votingContract } from '@/utils/contracts';
import { TOKEN_CONTRACT_ADDRESS, USDT_ABI, USDT_CONTRACT_ADDRESS } from '@/utils/constants';
import { useQuantuMatrix } from '@/hooks/useQuantuMatrix';
import { useTranslations } from 'next-intl';

const ZERO = BigInt(0);
const DEFAULT_SLIDER_MAX = 250;
const MIN_USDT_AMOUNT = 0.1;
const QUICK_PICK_AMOUNTS = [0.1, 1, 5, 10, 25, 50] as const;
const DEFAULT_USDT_RATE = parseUnits('1', 18);
const DEFAULT_RICO_RATE = parseUnits('33', 18);

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

const shortAddress = (value?: string | null) => {
  if (!value) return '--';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

type VotingExperienceProps = {
  variant?: 'page' | 'modal';
  registeredOnly?: boolean;
  onSuccess?: () => void;
};

type CompletedVote = {
  usdt: bigint;
  rico: bigint;
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

  const [usdtAmountInput, setUsdtAmountInput] = useState('1');
  const [isApproving, setIsApproving] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [showApprovedState, setShowApprovedState] = useState(false);
  const [lastCompletedVote, setLastCompletedVote] = useState<CompletedVote | null>(null);

  const pageIsCompact = variant === 'modal';
  const isRegistered = Boolean(userData?.exists);

  const campaignHighlights = useMemo(
    () => t.raw('campaignHighlights') as string[],
    [t],
  );

  const perks = useMemo(
    () => t.raw('perks') as string[],
    [t],
  );

  const launchBadges = useMemo(
    () => t.raw('launchBadges') as Array<{ label: string; value: string }>,
    [t],
  );

  const { data: usdtRateBasis, refetch: refetchUsdtRateBasis } = useReadContract({
    ...votingContract,
    functionName: 'usdtRateBasis',
  });

  const { data: ricoRateBasis, refetch: refetchRicoRateBasis } = useReadContract({
    ...votingContract,
    functionName: 'ricoRateBasis',
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

  const parsedUsdtRate = toBigInt(usdtRateBasis) > ZERO ? toBigInt(usdtRateBasis) : DEFAULT_USDT_RATE;
  const parsedRicoRate = toBigInt(ricoRateBasis) > ZERO ? toBigInt(ricoRateBasis) : DEFAULT_RICO_RATE;
  const parsedUsdtBalance = toBigInt(usdtBalance);
  const parsedUsdtAllowance = toBigInt(usdtAllowance);
  const parsedRicoBalance = toBigInt(ricoBalance);
  const hasUnlimitedApproval = parsedUsdtAllowance >= maxUint256 / BigInt(2);
  const needsApproval = !hasUnlimitedApproval;

  const parsedUsdtAmount = useMemo(() => {
    const trimmed = usdtAmountInput.trim();
    if (!trimmed) return null;
    const numericValue = Number(trimmed);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
    try {
      return parseUnits(trimmed, 18);
    } catch {
      return null;
    }
  }, [usdtAmountInput]);

  const numericUsdtAmount = useMemo(() => {
    const value = Number(usdtAmountInput);
    return Number.isFinite(value) ? value : 0;
  }, [usdtAmountInput]);

  const sliderValue = Math.max(MIN_USDT_AMOUNT, Math.min(DEFAULT_SLIDER_MAX, numericUsdtAmount || MIN_USDT_AMOUNT));
  const projectedRico =
    parsedUsdtAmount && parsedUsdtRate > ZERO
      ? (parsedUsdtAmount * parsedRicoRate) / parsedUsdtRate
      : ZERO;

  const hasEnoughUsdt = parsedUsdtAmount ? parsedUsdtAmount <= parsedUsdtBalance : false;
  const meetsMinimum = numericUsdtAmount >= MIN_USDT_AMOUNT;
  const canSubmit = Boolean(
    isConnected &&
      parsedUsdtAmount &&
      parsedUsdtAmount > ZERO &&
      meetsMinimum &&
      hasEnoughUsdt &&
      (!registeredOnly || isRegistered),
  );

  const dashboardGlobal =
    ((dashboardData as any)?.global ?? (dashboardData as any)?.[0]) || undefined;
  const dashboardUser =
    ((dashboardData as any)?.user ?? (dashboardData as any)?.[1]) || undefined;

  const globalRico = dashboardGlobal
    ? toBigInt(dashboardGlobal.totalRicoDistributed)
    : toBigInt(totalRicoDistributed);
  const userUsdtSpent = dashboardUser ? toBigInt(dashboardUser.usdtSpent) : ZERO;
  const userRicoReceived = dashboardUser ? toBigInt(dashboardUser.ricoReceived) : ZERO;

  const rateDisplay = useMemo(() => {
    if (parsedUsdtRate === ZERO) return '33';
    const oneDollarReward = (parseUnits('1', 18) * parsedRicoRate) / parsedUsdtRate;
    return formatToken(oneDollarReward, 0);
  }, [parsedRicoRate, parsedUsdtRate]);

  const statusTone = !isConnected
    ? 'border-white/10 bg-white/5 text-slate-300'
    : registeredOnly && !isRegistered
      ? 'border-yellow-400/25 bg-yellow-500/10 text-yellow-100'
      : !meetsMinimum
        ? 'border-rose-400/25 bg-rose-500/10 text-rose-100'
        : !hasEnoughUsdt
          ? 'border-rose-400/25 bg-rose-500/10 text-rose-100'
          : needsApproval
            ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-50'
            : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-50';

  const statusMessage = !isConnected
    ? t('status.connectWallet')
    : registeredOnly && !isRegistered
      ? t('status.registeredOnly')
      : !meetsMinimum
        ? t('status.minimumVote')
        : !hasEnoughUsdt
          ? t('status.needUsdt')
          : needsApproval
            ? t('status.needApproval')
            : t('status.ready');

  const primaryButtonLabel = !isConnected
    ? t('actions.connectWallet')
    : registeredOnly && !isRegistered
      ? t('actions.registerRequired')
      : isApproving
        ? t('actions.approving')
        : isVoting
          ? t('actions.casting')
          : needsApproval
            ? t('actions.approveMax')
            : t('actions.castVotes', { amount: formatToken(parsedUsdtAmount ?? ZERO) });

  const refreshVoteData = async () => {
    await Promise.all([
      refetchDashboardData(),
      refetchTotalRicoDistributed(),
      refetchUsdtBalance(),
      refetchUsdtAllowance(),
      refetchUsdtRateBasis(),
      refetchRicoRateBasis(),
      refetchRicoBalance(),
    ]);
  };

  const handlePrimaryAction = async () => {
    if (!isConnected) {
      toast.error(t('toasts.connectWallet'));
      return;
    }

    if (registeredOnly && !isRegistered) {
      toast.error(t('toasts.registerRequired'));
      return;
    }

    if (!writeContractAsync || !effectiveUsdtAddress || !parsedUsdtAmount) {
      toast.error(t('toasts.voteFailedFallback'));
      return;
    }

    if (!meetsMinimum) {
      toast.error(t('toasts.minimumVote'));
      return;
    }

    if (!hasEnoughUsdt) {
      toast.error(t('toasts.insufficientUsdt'));
      return;
    }

    try {
      if (needsApproval) {
        setIsApproving(true);
        const approveHash = await writeContractAsync({
          address: effectiveUsdtAddress,
          abi: USDT_ABI,
          functionName: 'approve',
          args: [votingContract.address, maxUint256],
        });
        await publicClient?.waitForTransactionReceipt({ hash: approveHash });
        await refetchUsdtAllowance();
        setShowApprovedState(true);
        toast.success(t('toasts.approvalSuccessTitle'), {
          description: t('toasts.approvalSuccessDescription'),
        });
        return;
      }

      setIsVoting(true);
      const voteHash = await writeContractAsync({
        ...votingContract,
        functionName: 'vote',
        args: [parsedUsdtAmount],
      });
      await publicClient?.waitForTransactionReceipt({ hash: voteHash });
      await refreshVoteData();
      setLastCompletedVote({ usdt: parsedUsdtAmount, rico: projectedRico });
      setShowApprovedState(false);
      toast.success(t('toasts.voteSuccessTitle'), {
        description: t('toasts.voteSuccessDescription', {
          amount: formatToken(parsedUsdtAmount),
          reward: formatToken(projectedRico),
        }),
      });
      onSuccess?.();
    } catch (error: any) {
      const message = error?.shortMessage || error?.message || t('toasts.voteFailedFallback');
      toast.error(t('toasts.voteFailedTitle'), { description: message });
    } finally {
      setIsApproving(false);
      setIsVoting(false);
    }
  };

  return (
    <div className={`space-y-4 ${pageIsCompact ? 'max-h-[78vh] overflow-y-auto pr-1' : ''}`}>
      <section className="theme-panel relative overflow-hidden border border-yellow-400/20 bg-[radial-gradient(circle_at_top_right,rgba(245,166,35,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(0,212,255,0.08),transparent_28%),linear-gradient(180deg,rgba(10,12,18,0.98),rgba(4,6,10,0.98))] p-4 sm:p-5 md:p-6">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-yellow-300/70 to-transparent" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:gap-5">
          <div>
            <p className="theme-kicker mb-2">{t('hero.kicker')}</p>
            <h2 className="text-[1.6rem] font-semibold leading-tight text-slate-50 sm:text-3xl">
              {t('hero.title')}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              {t('hero.description')}
            </p>

            <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-black/25 p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-yellow-200/80">
                {t('announcement.kicker')}
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-200 sm:text-[0.95rem]">
                {t('announcement.body')}
              </p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {campaignHighlights.map((highlight) => (
                <div key={highlight} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-sm leading-6 text-slate-300">{highlight}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-yellow-200/80">{t('campaign.totalPool')}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">50,000 RICO</p>
              </div>
              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">{t('campaign.rate')}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">{rateDisplay} RICO</p>
                <p className="mt-1 text-xs text-cyan-100/75">{t('campaign.perDollarNote')}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('campaign.minimum')}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">0.1 USDT</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('campaign.maximum')}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">{t('campaign.unlimited')}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {launchBadges.map((badge) => (
                <div key={`${badge.label}-${badge.value}`} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{badge.label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{badge.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-cyan-400/15 bg-cyan-400/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">{t('perksKicker')}</p>
              <div className="mt-3 space-y-2.5">
                {perks.map((perk) => (
                  <div key={perk} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-100">
                    {perk}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="theme-panel border border-yellow-400/20 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(4,6,10,0.98))] p-4 sm:p-5 md:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] xl:gap-6">
          <div>
            {lastCompletedVote ? (
              <div className="mb-4 rounded-[1.5rem] border border-emerald-400/25 bg-emerald-500/10 p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
                  {t('success.kicker')}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-50">{t('success.title')}</h3>
                <p className="mt-2 text-sm leading-6 text-emerald-50/90">
                  {t('success.description', {
                    usdt: formatToken(lastCompletedVote.usdt),
                    rico: formatToken(lastCompletedVote.rico),
                  })}
                </p>
              </div>
            ) : null}

            {showApprovedState && !needsApproval ? (
              <div className="mb-4 rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/80">
                  {t('approval.kicker')}
                </p>
                <p className="mt-2 text-sm leading-6 text-cyan-50">{t('approval.description')}</p>
              </div>
            ) : null}

            <div>
              <p className="theme-kicker mb-2">{t('setup.kicker')}</p>
              <h3 className="text-xl font-semibold text-slate-50 sm:text-2xl">{t('setup.title')}</h3>
              <p className="mt-2 text-sm text-slate-400">
                {t('setup.description', {
                  usdt: '1',
                  rico: rateDisplay,
                })}
              </p>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <div className={`rounded-[1.5rem] border p-4 transition-all ${needsApproval ? 'border-yellow-300/40 bg-yellow-500/12 shadow-[0_0_28px_rgba(245,166,35,0.16)]' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-yellow-300/40 bg-black/35 text-sm font-semibold text-yellow-100">1</span>
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

              <div className={`rounded-[1.5rem] border p-4 transition-all ${needsApproval ? 'border-white/10 bg-white/5' : 'border-cyan-300/35 bg-cyan-400/10 shadow-[0_0_28px_rgba(0,212,255,0.12)]'}`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/35 bg-black/35 text-sm font-semibold text-cyan-100">2</span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">{t('flow.step2Label')}</p>
                    <h4 className="mt-1 text-base font-semibold text-slate-50">{t('flow.step2Title')}</h4>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{t('flow.step2Description')}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/30 p-4 sm:p-5">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('setup.amountLabel')}</span>
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-yellow-400/20 bg-slate-950/80 px-4 py-3">
                  <span className="text-2xl text-yellow-300">$</span>
                  <input
                    type="number"
                    min={MIN_USDT_AMOUNT}
                    step={0.1}
                    value={usdtAmountInput}
                    onChange={(event) => setUsdtAmountInput(event.target.value)}
                    className="w-full bg-transparent text-2xl font-semibold text-slate-50 outline-none"
                    aria-label={t('setup.amountLabel')}
                  />
                  <span className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">USDT</span>
                </div>
              </label>

              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                  <span>{t('setup.quickSlider')}</span>
                  <span>
                    {numericUsdtAmount > DEFAULT_SLIDER_MAX
                      ? t('setup.customAmount', { amount: numericUsdtAmount.toFixed(1) })
                      : t('setup.sliderAmount', { amount: sliderValue.toFixed(1) })}
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_USDT_AMOUNT}
                  max={DEFAULT_SLIDER_MAX}
                  step={0.1}
                  value={sliderValue}
                  onChange={(event) => setUsdtAmountInput(Number(event.target.value).toFixed(1))}
                  className="voting-range"
                  aria-label={t('setup.sliderAria')}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {QUICK_PICK_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setUsdtAmountInput(String(amount))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        numericUsdtAmount === amount
                          ? 'border-yellow-300 bg-yellow-400/15 text-yellow-100'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-yellow-400/30 hover:text-slate-100'
                      }`}
                    >
                      {amount} USDT
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-yellow-400/20 bg-[linear-gradient(135deg,rgba(245,166,35,0.14),rgba(245,166,35,0.05))] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-yellow-100/80">{t('setup.selectedUsdt')}</p>
                  <p className="mt-2 break-words text-2xl font-semibold text-slate-50">{formatToken(parsedUsdtAmount ?? ZERO)} <span className="text-base text-yellow-100/80">USDT</span></p>
                </div>

                <div className="rounded-[1.5rem] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(0,212,255,0.14),rgba(0,212,255,0.04))] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/80">{t('setup.projectedRico')}</p>
                  <p className="mt-2 break-words text-2xl font-semibold text-slate-50">{formatToken(projectedRico)} <span className="text-base text-cyan-100/80">RICO</span></p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('setup.minimumLabel')}</p>
                <p className="mt-2 text-xl font-semibold text-slate-50">0.1 USDT</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('setup.yourUsdt')}</p>
                <p className="mt-2 break-words text-xl font-semibold text-slate-50">{formatToken(parsedUsdtBalance)} USDT</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('setup.allowance')}</p>
                <p className="mt-2 break-words text-xl font-semibold text-slate-50">{hasUnlimitedApproval ? t('setup.unlimitedAllowance') : `${formatToken(parsedUsdtAllowance)} USDT`}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('setup.yourRicoWallet')}</p>
                <p className="mt-2 break-words text-xl font-semibold text-slate-50">{formatToken(parsedRicoBalance)} RICO</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 sm:p-5">
              <div className="flex flex-col gap-4">
                <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${statusTone}`}>
                  {statusMessage}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('flow.currentStepLabel')}</p>
                    <h4 className="mt-2 text-lg font-semibold text-slate-50">
                      {needsApproval ? t('flow.currentStepApprove') : t('flow.currentStepVote')}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    disabled={isApproving || isVoting}
                    aria-disabled={!canSubmit}
                    className={`theme-button-primary min-h-12 justify-center px-6 text-sm disabled:cursor-not-allowed disabled:opacity-55 ${!canSubmit ? 'opacity-80 saturate-75' : ''}`}
                  >
                    {primaryButtonLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside className="grid gap-3 sm:gap-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-cyan-400/15 bg-[radial-gradient(circle_at_top,rgba(0,212,255,0.14),transparent_55%),linear-gradient(180deg,rgba(10,18,26,0.95),rgba(3,7,12,0.98))] p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">{t('flow.summaryKicker')}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-300">{t('flow.summaryUsdt')}</span>
                    <span className="text-lg font-semibold text-slate-50 break-words text-right">{formatToken(parsedUsdtAmount ?? ZERO)} USDT</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-300">{t('flow.summaryRico')}</span>
                    <span className="text-lg font-semibold text-slate-50 break-words text-right">{formatToken(projectedRico)} RICO</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-300">{t('flow.summaryRate')}</span>
                    <span className="text-lg font-semibold text-slate-50 break-words text-right">$1 = {rateDisplay}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-yellow-400/20 bg-[linear-gradient(180deg,rgba(250,204,21,0.12),rgba(15,23,42,0.28))] p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-yellow-200/80">{t('snapshot.kicker')}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('snapshot.usdtSpent')}</p>
                  <p className="mt-2 break-words text-2xl font-semibold text-slate-50">{formatToken(userUsdtSpent)} USDT</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('snapshot.ricoReceived')}</p>
                  <p className="mt-2 break-words text-2xl font-semibold text-slate-50">{formatToken(userRicoReceived)} RICO</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('stats.kicker')}</p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('stats.ricoDistributed')}</p>
                <p className="mt-2 break-words text-2xl font-semibold text-slate-50">{formatToken(globalRico)} RICO</p>
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
