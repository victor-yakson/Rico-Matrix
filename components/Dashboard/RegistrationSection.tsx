'use client';

import { useQuantuMatrix } from '../../hooks/useQuantuMatrix';
import { useState, useEffect, useMemo } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';

interface RegistrationSectionProps {
  referralAddress: string | null;
  onRegistrationComplete: () => void;
}

export const RegistrationSection = ({
  referralAddress,
  onRegistrationComplete,
}: RegistrationSectionProps) => {
  const {
    userData,
    joinLibrary,
    approveUsdt,
    usdtBalance,
    usdtAllowance,
    joinCost,
    loading,
  } = useQuantuMatrix();

  const [step, setStep] = useState<'info' | 'approve' | 'register'>('info');
  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash: currentTxHash ?? undefined,
    query: {
      enabled: !!currentTxHash,
    },
  });

  const numericJoinCost = useMemo(
    () => parseFloat(joinCost || '0'),
    [joinCost]
  );
  const numericBalance = useMemo(
    () => parseFloat(usdtBalance || '0'),
    [usdtBalance]
  );
  const numericAllowance = useMemo(
    () => parseFloat(usdtAllowance || '0'),
    [usdtAllowance]
  );

  const hasSufficientBalance = numericBalance >= numericJoinCost && numericJoinCost > 0;
  const hasSufficientAllowance = numericAllowance >= numericJoinCost && numericJoinCost > 0;
  const isProcessing = loading || isConfirming;
  const stepIndex = step === 'info' ? 1 : 2;

  useEffect(() => {
    if (hasSufficientAllowance && step === 'info' && !currentTxHash && !isProcessing) {
      setStep('register');
    }
  }, [hasSufficientAllowance, step, currentTxHash, isProcessing]);

  useEffect(() => {
    if (!isConfirmed) return;

    if (step === 'approve') {
      setStep('register');
    } else if (step === 'register') {
      onRegistrationComplete();
      setStep('info');
    }

    setCurrentTxHash(null);
  }, [isConfirmed, step, onRegistrationComplete]);

  const handleApprove = async () => {
    try {
      setError(null);
      const hash = await approveUsdt(joinCost);
      setCurrentTxHash(hash);
      setStep('approve');
    } catch (error) {
      console.error('Approval failed:', error);
      setError('USDT approval failed. Please confirm the transaction in your wallet and try again.');
    }
  };

  const handleRegister = async () => {
    try {
      setError(null);
      const referrer =
        referralAddress || '0x0000000000000000000000000000000000000000';
      const hash = await joinLibrary(referrer);
      setCurrentTxHash(hash);
      setStep('register');
    } catch (error) {
      console.error('Registration failed:', error);
      setError('Registration failed. Please confirm the transaction in your wallet and try again.');
    }
  };

  const primaryButtonLabel = () => {
    if (isProcessing) {
      if (step === 'approve') return 'Waiting for approval...';
      if (step === 'register') return 'Confirming registration...';
      return 'Processing...';
    }
    if (step === 'info') {
      return `Approve ${joinCost || '0'} USDT`;
    }
    if (step === 'approve') {
      return 'Complete Registration';
    }
    if (step === 'register') {
      return 'Confirming...';
    }
    return 'Continue';
  };

  return (
    <section className="space-y-5 md:space-y-6">
      {/* Top label + title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.25em] text-yellow-300/80 mb-1">
            RicoMatrix • Onboarding
          </p>
          <h2 className="text-lg md:text-2xl font-semibold text-slate-50">
            Join the RicoMatrix Library (Chapter 1 Access)
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[0.7rem] text-slate-400">
          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/40 px-3 py-1 text-emerald-300">
            Step {stepIndex} of 2
          </span>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid gap-5 md:gap-6 lg:gap-8 xl:gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* LEFT: Info / benefits */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-500/25 bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-950/95 p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-blue-300 mb-1">
                  What you unlock with Chapter 1
                </h3>
                <p className="text-xs text-slate-400">
                  A one-time on-chain registration that positions you in both X3 & X6.
                </p>
              </div>
              <span className="hidden md:inline-flex items-center rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-[0.65rem] uppercase tracking-wide text-blue-200">
                X3 + X6 Matrix
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 text-xs md:text-[0.8rem]">
              <div className="flex gap-3">
                <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-lg bg-slate-900 border border-blue-500/40 text-[0.7rem] text-blue-300">
                  1
                </div>
                <div>
                  <p className="font-medium text-slate-100">
                    Dual-track matrix entry
                  </p>
                  <p className="text-slate-400 mt-1">
                    Instant placement in both X3 and X6 matrices for Chapter 1.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-lg bg-slate-900 border border-blue-500/40 text-[0.7rem] text-blue-300">
                  2
                </div>
                <div>
                  <p className="font-medium text-slate-100">
                    Global matrix position
                  </p>
                  <p className="text-slate-400 mt-1">
                    Eligible for spillovers and team activity as the library grows.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-lg bg-slate-900 border border-blue-500/40 text-[0.7rem] text-blue-300">
                  3
                </div>
                <div>
                  <p className="font-medium text-slate-100">
                    Referral earning rights
                  </p>
                  <p className="text-slate-400 mt-1">
                    Share your link and earn from every Chapter 1 activation.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-lg bg-slate-900 border border-blue-500/40 text-[0.7rem] text-blue-300">
                  4
                </div>
                <div>
                  <p className="font-medium text-slate-100">
                    Royalty pool access
                  </p>
                  <p className="text-slate-400 mt-1">
                    Participate in on-chain royalties powered by real book chapters.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Referral info */}
          {referralAddress && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-emerald-300">
                  Referral detected
                </div>
                <div className="text-[0.7rem] text-slate-100 truncate max-w-xs">
                  Referrer:{' '}
                  <span className="font-mono">
                    {referralAddress}
                  </span>
                </div>
              </div>
              <span className="hidden md:inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-[0.65rem] text-emerald-200">
                Linked to your matrix position
              </span>
            </div>
          )}

          {/* Error / balance warnings */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
              {error}
            </div>
          )}

          {!hasSufficientBalance && numericJoinCost > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
              Insufficient USDT balance. You need{' '}
              <span className="font-semibold">{joinCost} USDT</span> but currently
              have <span className="font-semibold">{usdtBalance} USDT</span>.
            </div>
          )}
        </div>

        {/* RIGHT: Cost / actions */}
        <div className="rounded-2xl border border-yellow-500/25 bg-slate-950/95 p-4 md:p-5 shadow-[0_0_26px_rgba(0,0,0,0.9)] flex flex-col justify-between">
          <div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-slate-900/80 border border-slate-700 px-3 py-3">
                <div className="text-[0.7rem] text-slate-400 mb-1">
                  Registration Cost
                </div>
                <div className="text-base md:text-lg font-semibold text-yellow-300">
                  {joinCost || '0'} USDT
                </div>
              </div>
              <div className="rounded-xl bg-slate-900/80 border border-slate-700 px-3 py-3">
                <div className="text-[0.7rem] text-slate-400 mb-1">
                  Your USDT Balance
                </div>
                <div className="text-base md:text-lg font-semibold text-slate-100">
                  {usdtBalance || '0'} USDT
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between text-[0.7rem]">
              <span className="text-slate-400">USDT Allowance</span>
              <span
                className={
                  hasSufficientAllowance ? 'text-emerald-300' : 'text-slate-500'
                }
              >
                {hasSufficientAllowance ? 'Ready' : 'Approval required'}
              </span>
            </div>

            <div className="space-y-3">
              {step === 'info' && (
                <button
                  onClick={handleApprove}
                  disabled={!hasSufficientBalance || isProcessing || numericJoinCost === 0}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm md:text-base transition-all ${
                    hasSufficientBalance && !isProcessing && numericJoinCost > 0
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-[0_0_24px_rgba(250,204,21,0.7)] hover:brightness-110 active:scale-[0.98]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {primaryButtonLabel()}
                </button>
              )}

              {step === 'approve' && (
                <button
                  onClick={handleRegister}
                  disabled={!hasSufficientAllowance || isProcessing}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm md:text-base transition-all ${
                    hasSufficientAllowance && !isProcessing
                      ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-black shadow-[0_0_24px_rgba(16,185,129,0.7)] hover:brightness-110 active:scale-[0.98]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? 'Confirming in wallet...' : 'Complete Registration'}
                </button>
              )}

              {step === 'register' && (
                <div className="py-3 flex flex-col items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-yellow-400 border-t-transparent" />
                  <div className="text-[0.8rem] text-yellow-300">
                    Confirming your registration on-chain...
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex justify-between items-center text-[0.7rem] text-slate-500 mb-2">
              <span className={step === 'info' ? 'text-yellow-300' : 'text-slate-400'}>
                1. Approve USDT
              </span>
              <span className={step !== 'info' ? 'text-yellow-300' : 'text-slate-400'}>
                2. Register Wallet
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-emerald-400 transition-all duration-500"
                style={{ width: step === 'info' ? '50%' : '100%' }}
              />
            </div>
            <p className="mt-3 text-[0.7rem] text-slate-500 text-center">
              All actions happen directly on BSC via your wallet. RicoMatrix cannot move
              your funds without your transaction approval.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
