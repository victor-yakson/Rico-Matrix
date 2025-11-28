'use client';

import { Header } from '../../components/Navigation/Header';
import { useAccount } from 'wagmi';
import { ConnectWallet } from '../../components/Common/ConnectWallet';
import { ProfileStats } from '../../components/Profile/ProfileStats';
import { ProfileInfo } from '../../components/Profile/ProfileInfo';
import { ReferralSection } from '../../components/Profile/ReferralSection';
import { useQuantuMatrix } from '../../hooks/useQuantuMatrix';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
  const { isConnected, address } = useAccount();
  const { userData, refetchUserData } = useQuantuMatrix();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (address && isConnected) {
      refetchUserData();
    }
  }, [address, isConnected, refetchUserData]);

  // Loading / hydration-safe state
  if (!mounted) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-2">
              Profile
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
              Loading your profile…
            </h1>
            <p className="text-sm md:text-base text-slate-400">
              Fetching your on-chain activity and referral stats.
            </p>
          </div>
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-yellow-400 border-t-transparent" />
          </div>
        </div>
      </>
    );
  }

  if (!isConnected) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
          <div className="max-w-md w-full rounded-2xl border border-yellow-500/20 bg-black/70 px-6 py-10 text-center shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-3">
              Profile Access
            </p>
            <h1 className="text-3xl font-bold text-slate-50 mb-4">
              Connect to View Profile
            </h1>
            <p className="text-sm md:text-base text-slate-400 mb-8">
              Connect your wallet to view your profile, matrix progress, and
              referral earnings.
            </p>
            <div className="flex justify-center">
              <ConnectWallet />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] pb-20 md:pb-8">
        <div className="container mx-auto px-4 py-8 md:py-10">
          {/* Header */}
          <div className="text-center mb-8 md:mb-10">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-3">
              Your Profile
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
              Account Overview
            </h1>
            <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
              Track your chapters, earnings, status, and referral network inside
              the QuantuMatrix ecosystem.
            </p>
          </div>

          {/* Profile Content */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column - Profile Info & Referral */}
            <div className="space-y-6 lg:col-span-1">
              {/* Expect these components to be themed as well; container them in dark cards if needed */}
              <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-5 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                <ProfileInfo userData={userData} />
              </div>

              <div className="rounded-2xl border border-purple-400/40 bg-slate-950/80 p-5 shadow-[0_0_26px_rgba(88,28,135,0.6)] backdrop-blur-sm">
                <ReferralSection />
              </div>
            </div>

            {/* Right Column - Stats */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                <ProfileStats userData={userData} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
