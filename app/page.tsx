'use client';

import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useQuantuMatrix } from '../hooks/useQuantuMatrix';
import { ConnectWallet } from '../components/Common/ConnectWallet';
import { Stats } from '../components/Dashboard/Stats';
import { Header } from '../components/Navigation/Header';
import { ProfileInfo } from '../components/Dashboard/ProfileInfo';
import { ReferralSection } from '../components/Profile/ReferralSection';
import { ProfileStats } from '../components/Dashboard/ProfileStats';
import { RegistrationSection } from '../components/Dashboard/RegistrationSection';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const {
    userData,
    globalStats,
    refetchUserData,
    claimRoyalty,
    loading,
  } = useQuantuMatrix();

  const [mounted, setMounted] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | null>(null);

  const searchParams = useSearchParams();
  const referralAddress = searchParams.get('ref');

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: currentTxHash ?? undefined,
      query: {
        enabled: !!currentTxHash,
      },
    });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (address && isConnected) {
      refetchUserData();
    }
  }, [address, isConnected, refetchUserData]);

  // Refresh data after royalty claim confirmation
  useEffect(() => {
    if (isConfirmed) {
      refetchUserData();
      setCurrentTxHash(null);
    }
  }, [isConfirmed, refetchUserData]);

  const handleClaimRoyalty = async () => {
    if (!userData?.exists || Number(userData.royaltyAvailable) === 0) return;
    try {
      const hash = await claimRoyalty();
      setCurrentTxHash(hash);
    } catch (error) {
      console.error('Claim failed:', error);
      setCurrentTxHash(null);
    }
  };

  const isProcessingRoyalty = loading || isConfirming;
  const canClaimRoyalty =
    userData?.exists && Number(userData.royaltyAvailable) > 0;

  const royaltyAvailable = userData?.exists
    ? Number(userData.royaltyAvailable).toFixed(2)
    : '0.00';

  if (!mounted) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-black to-slate-900">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-2">
              Rico Library
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
              🔥📚✨ RICOMATRIX
            </h1>
            <p className="text-sm md:text-base text-slate-400">
              READ • EARN • OWN — Real book chapters on-chain with matrix & royalty rewards.
            </p>
          </div>
          <div className="flex justify-center items-center">
            <div className="relative">
              <div className="absolute inset-0 blur-xl opacity-40 bg-yellow-400/40 rounded-full" />
              <div className="relative animate-spin rounded-full h-12 w-12 border-2 border-yellow-400 border-t-transparent" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!isConnected) {
    return (
      <>
        <Header />
        <main className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,_#facc15_0,_transparent_55%),radial-gradient(circle_at_bottom,_#22c55e22_0,_#020617_60%)] flex items-center justify-center px-4">
          <div className="w-full max-w-2xl">
            <div className="rounded-3xl border border-yellow-500/30 bg-slate-950/80 px-6 md:px-10 py-10 md:py-12 shadow-[0_0_60px_rgba(15,23,42,0.9)] backdrop-blur-xl relative overflow-hidden">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-yellow-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />

              <div className="mb-6 text-xs uppercase tracking-[0.25em] text-yellow-300/80 flex items-center justify-center gap-2">
                <span className="h-[1px] w-6 bg-yellow-400/40" />
                <span>Welcome to RicoMatrix</span>
                <span className="h-[1px] w-6 bg-yellow-400/40" />
              </div>

              <h1 className="text-3xl md:text-4xl font-semibold text-slate-50 mb-4 text-center">
                Connect your wallet to enter the library
              </h1>

              <p className="text-sm md:text-base text-slate-400 mb-8 text-center max-w-xl mx-auto">
                Plug in your Web3 wallet to unlock Chapters 1–12, activate your matrix slots,
                and start earning from on-chain book royalties.
              </p>

              <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs md:text-[0.8rem]">
                <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/70 px-4 py-3 text-left">
                  <p className="font-medium text-slate-50 mb-1">Non-custodial</p>
                  <p className="text-slate-400">
                    You stay in full control of your USDT & rewards at all times.
                  </p>
                </div>
                <div className="rounded-2xl border border-yellow-500/30 bg-slate-900/70 px-4 py-3 text-left">
                  <p className="font-medium text-slate-50 mb-1">On-chain royalties</p>
                  <p className="text-slate-400">
                    Earn matrix and royalty payouts directly on BSC.
                  </p>
                </div>
                <div className="rounded-2xl border border-purple-500/30 bg-slate-900/70 px-4 py-3 text-left">
                  <p className="font-medium text-slate-50 mb-1">Instant access</p>
                  <p className="text-slate-400">
                    Once connected, your dashboard, chapters & stats appear instantly.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <ConnectWallet />
                <a
                  href="https://t.me/ricomatrix" // TODO: replace with your actual Telegram link
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-sky-400/60 bg-sky-500/10 px-4 py-2 text-xs md:text-sm font-medium text-sky-200 hover:bg-sky-500/20 transition-all"
                >
                  <span className="text-base">📲</span>
                  <span>Join our Telegram for updates</span>
                </a>
                <p className="text-[0.75rem] text-slate-500">
                  Powered by BSC • Best with MetaMask, Trust Wallet, or Rabby
                </p>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="px-4 py-8 md:py-10">
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <div className="text-center mb-8 md:mb-10 lg:mb-12">
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-3">
                Dashboard
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
                🔥📚✨ RICOMATRIX
              </h1>
              <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
                READ • EARN • OWN — Manage your matrix positions, unlock chapters,
                and monitor royalty earnings in one place.
              </p>
              {/* Telegram button in header */}
              <div className="mt-4 flex justify-center">
                
                <a
                  href="https://t.me/ricomatrix" // TODO: replace with your actual Telegram link
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-sky-400/60 bg-sky-500/10 px-4 py-2 text-xs md:text-sm font-medium text-sky-200 hover:bg-sky-500/20 transition-all"
                >
                  <span className="text-base">📲</span>
                  <span>Join our Telegram for updates</span>
                </a>
              </div>
            </div>

            {/* Registration Section for New Users */}
            {!userData?.exists && (
              <div className="mb-8 md:mb-10 lg:mb-12">
                <div className="rounded-3xl border border-yellow-500/25 bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900/90 p-4 sm:p-5 md:p-6 lg:p-7 shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
                  <RegistrationSection
                    referralAddress={referralAddress}
                    onRegistrationComplete={refetchUserData}
                  />
                </div>
              </div>
            )}

            {/* Main Content Grid */}
            <div
              className="
                grid grid-cols-1 
                lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)] 
                gap-6 lg:gap-8 xl:gap-10 mb-8
              "
            >
              {/* Left Column - Profile & Referral */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-5 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                  <ProfileInfo userData={userData} />
                </div>

                <div className="rounded-2xl border border-purple-400/40 bg-slate-950/80 p-5 shadow-[0_0_26px_rgba(88,28,135,0.6)] backdrop-blur-sm">
                  <ReferralSection />
                </div>
              </div>

              {/* Right Column - Stats & Content */}
              <div className="space-y-6 lg:space-y-8">
                {/* Stats Overview + Royalty Button */}
                <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                  <Stats userData={userData} globalStats={globalStats} />

                  {userData?.exists && (
                    <div className="mt-6">
                      <button
                        onClick={handleClaimRoyalty}
                        disabled={!canClaimRoyalty || isProcessingRoyalty}
                        className={`mt-1 flex w-full items-center justify-center rounded-xl px-6 py-3 text-base md:text-lg font-semibold transition-all
                          ${
                            canClaimRoyalty && !isProcessingRoyalty
                              ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-300 text-black shadow-[0_0_22px_rgba(16,185,129,0.7)] hover:brightness-110 active:scale-[0.98]'
                              : 'cursor-not-allowed border border-slate-700 bg-slate-900/80 text-slate-500'
                          }
                        `}
                      >
                        {isProcessingRoyalty
                          ? 'Processing royalty claim...'
                          : `Claim $${royaltyAvailable} USDT`}
                      </button>
                      <p className="mt-2 text-[0.7rem] text-slate-500 text-center">
                        Your royalty balance updates automatically after a successful claim.
                      </p>
                    </div>
                  )}
                </div>

                {userData?.exists && (
                  <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                    <ProfileStats userData={userData} />
                  </div>
                )}

                {userData?.exists && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
                    <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/70 p-6 text-center shadow-[0_0_28px_rgba(0,0,0,0.6)]">
                      <h3 className="text-lg font-semibold text-slate-50 mb-2">
                        View Chapters
                      </h3>
                      <p className="text-sm text-slate-400 mb-4">
                        Explore all available book chapters and upgrade levels as you grow.
                      </p>
                      <Link
                        href="/chapters"
                        className="inline-block rounded-xl bg-yellow-500/10 px-6 py-2 text-sm font-semibold text-yellow-300 border border-yellow-400/60 hover:bg-yellow-500/20 transition-all"
                      >
                        Browse Chapters
                      </Link>
                    </div>

                    <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/70 p-6 text-center shadow-[0_0_28px_rgba(0,0,0,0.6)]">
                      <h3 className="text-lg font-semibold text-slate-50 mb-2">
                        Check Matrix
                      </h3>
                      <p className="text-sm text-slate-400 mb-4">
                        View your matrix network and track your downline growth.
                      </p>
                      <Link
                        href="/matrix"
                        className="inline-block rounded-xl bg-yellow-500/10 px-6 py-2 text-sm font-semibold text-yellow-300 border border-yellow-400/60 hover:bg-yellow-500/20 transition-all"
                      >
                        View Matrix
                      </Link>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/25 bg-slate-950/70 p-6 text-center shadow-[0_0_28px_rgba(0,0,0,0.6)]">
                      <h3 className="text-lg font-semibold text-slate-50 mb-2">
                        Check Royalty
                      </h3>
                      <p className="text-sm text-slate-400 mb-4">
                        View your royalty pool share and claim earnings from library activity.
                      </p>
                      <Link
                        href="/royalty"
                        className="inline-block rounded-xl bg-emerald-500/90 px-6 py-2 text-sm font-semibold text-black shadow-[0_0_18px_rgba(16,185,129,0.7)] hover:brightness-110 active:scale-[0.98] transition-all"
                      >
                        View Royalty
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
