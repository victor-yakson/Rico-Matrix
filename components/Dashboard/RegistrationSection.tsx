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
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToDisclaimer, setAgreedToDisclaimer] = useState(false);

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
  const canProceed = agreedToTerms && agreedToDisclaimer && hasSufficientBalance;

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
    if (!canProceed) return;
    
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
    if (!canProceed) return;
    
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
    if (!agreedToTerms || !agreedToDisclaimer) {
      return 'Review Terms Required';
    }
    
    if (!hasSufficientBalance) {
      return 'Insufficient Balance';
    }
    
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
    <>
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

            {/* Terms & Conditions Checkboxes */}
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms-checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-yellow-500 focus:ring-yellow-500/30 focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <label htmlFor="terms-checkbox" className="text-sm font-medium text-slate-100 cursor-pointer">
                      I agree to the RicoMatrix Terms & Conditions
                    </label>
                    <p className="text-xs text-slate-400 mt-1">
                      By checking this box, you acknowledge and accept our terms of service, including participation rules, referral guidelines, and community standards.
                    </p>
                    <button
                      onClick={() => setShowTermsModal(true)}
                      className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 underline"
                    >
                      Read full Terms & Conditions
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="disclaimer-checkbox"
                    checked={agreedToDisclaimer}
                    onChange={(e) => setAgreedToDisclaimer(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-yellow-500 focus:ring-yellow-500/30 focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <label htmlFor="disclaimer-checkbox" className="text-sm font-medium text-slate-100 cursor-pointer">
                      I understand and accept the Financial Disclaimer
                    </label>
                    <p className="text-xs text-slate-400 mt-1">
                      By checking this box, you confirm that you understand the risks involved in cryptocurrency investments and matrix participation. Past performance does not guarantee future results.
                    </p>
                    <button
                      onClick={() => setShowDisclaimerModal(true)}
                      className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 underline"
                    >
                      Read full Disclaimer
                    </button>
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
                    disabled={!canProceed || isProcessing || numericJoinCost === 0}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-sm md:text-base transition-all ${
                      canProceed && !isProcessing && numericJoinCost > 0
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
                    disabled={!canProceed || !hasSufficientAllowance || isProcessing}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-sm md:text-base transition-all ${
                      canProceed && hasSufficientAllowance && !isProcessing
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

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">
                    RicoMatrix Terms & Conditions
                  </h3>
                  <p className="text-sm text-slate-400">
                    Last updated: {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Terms Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6 text-sm text-slate-300">
                <div>
                  <h4 className="text-lg font-semibold text-yellow-300 mb-3">1. Acceptance of Terms</h4>
                  <p className="mb-2">
                    By accessing and using RicoMatrix, you accept and agree to be bound by these Terms & Conditions. If you do not agree with any part of these terms, you must not use our services.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-yellow-300 mb-3">2. Service Description</h4>
                  <p className="mb-2">
                    RicoMatrix is a decentralized application built on blockchain technology that enables users to participate in matrix-based referral programs through chapter purchases. The platform operates on the Binance Smart Chain (BSC).
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-yellow-300 mb-3">3. User Responsibilities</h4>
                  <ul className="space-y-2 ml-4 list-disc">
                    <li>You must be at least 18 years old to use our services</li>
                    <li>You are responsible for maintaining the security of your wallet</li>
                    <li>You must comply with all applicable laws and regulations</li>
                    <li>You may not use the service for illegal activities</li>
                    <li>You are solely responsible for your referral activities</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-yellow-300 mb-3">4. Matrix Participation Rules</h4>
                  <ul className="space-y-2 ml-4 list-disc">
                    <li>Matrix positions are non-transferable</li>
                    <li>Referral earnings are calculated based on smart contract logic</li>
                    <li>Matrix cycling follows predefined smart contract rules</li>
                    <li>Unlocking chapters requires payment in USDT</li>
                    <li>Royalty distributions follow contract-specified percentages</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-yellow-300 mb-3">5. Intellectual Property</h4>
                  <p className="mb-2">
                    All content, including PDF materials, matrix structures, and platform design, are the intellectual property of RicoMatrix. You may not reproduce, distribute, or create derivative works without permission.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-yellow-300 mb-3">6. Termination</h4>
                  <p className="mb-2">
                    We reserve the right to terminate or suspend your access to the platform at our sole discretion, without prior notice, for conduct that we believe violates these Terms & Conditions or is harmful to other users.
                  </p>
                </div>

                <div className="rounded-lg bg-slate-800/50 p-4 border border-yellow-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <h5 className="font-semibold text-yellow-300">Important Notice</h5>
                  </div>
                  <p className="text-sm">
                    By checking the agreement box, you confirm that you have read, understood, and agree to be bound by these Terms & Conditions. This agreement constitutes a legally binding contract between you and RicoMatrix.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-700 bg-slate-800/50">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setAgreedToTerms(true);
                    setShowTermsModal(false);
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  I Accept Terms
                </button>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer Modal */}
      {showDisclaimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">
                    Financial Risk Disclaimer
                  </h3>
                  <p className="text-sm text-slate-400">
                    Important information before you proceed
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDisclaimerModal(false)}
                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Disclaimer Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6 text-sm text-slate-300">
                <div className="rounded-lg bg-red-500/10 p-4 border border-red-500/30 mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <h4 className="text-lg font-semibold text-red-300">WARNING: HIGH FINANCIAL RISK</h4>
                  </div>
                  <p className="mt-2">
                    Participation in matrix programs involves significant financial risk. You could lose some or all of your investment.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-red-300 mb-3">1. No Financial Advice</h4>
                  <p className="mb-2">
                    RicoMatrix does not provide financial advice. All information provided is for educational purposes only. You should consult with a qualified financial advisor before making any investment decisions.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-red-300 mb-3">2. Cryptocurrency Volatility</h4>
                  <p className="mb-2">
                    Cryptocurrencies, including USDT, are highly volatile. Market fluctuations can significantly affect the value of your investments. Past performance is not indicative of future results.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-red-300 mb-3">3. Matrix Program Risks</h4>
                  <ul className="space-y-2 ml-4 list-disc">
                    <li>Matrix programs depend on new participants joining</li>
                    <li>Earnings are not guaranteed and may fluctuate</li>
                    <li>You may not recover your initial investment</li>
                    <li>Market saturation can affect earning potential</li>
                    <li>Smart contract risks exist (despite audits)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-red-300 mb-3">4. Regulatory Considerations</h4>
                  <p className="mb-2">
                    Cryptocurrency regulations vary by jurisdiction. You are responsible for understanding and complying with all applicable laws in your country of residence. Some jurisdictions may restrict or prohibit participation in matrix programs.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-red-300 mb-3">5. Investment Warning</h4>
                  <ul className="space-y-2 ml-4 list-disc">
                    <li>Only invest what you can afford to lose completely</li>
                    <li>Diversify your investments across different assets</li>
                    <li>Matrix participation should not be your primary investment strategy</li>
                    <li>Consider this a high-risk, speculative investment</li>
                    <li>Be prepared for the possibility of total loss</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-red-300 mb-3">6. Technical Risks</h4>
                  <p className="mb-2">
                    While we strive for security, blockchain technology involves risks including smart contract vulnerabilities, wallet security issues, exchange failures, and technological changes that could affect platform functionality.
                  </p>
                </div>

                <div className="rounded-lg bg-slate-800/50 p-4 border border-red-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h5 className="font-semibold text-red-300">Acknowledgment Required</h5>
                  </div>
                  <p className="text-sm">
                    By proceeding with registration, you acknowledge that you have read this disclaimer, understand the risks involved, and accept full responsibility for your investment decisions. You confirm that you are participating voluntarily and at your own risk.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-700 bg-slate-800/50">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setAgreedToDisclaimer(true);
                    setShowDisclaimerModal(false);
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  I Accept Risks
                </button>
                <button
                  onClick={() => setShowDisclaimerModal(false)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};