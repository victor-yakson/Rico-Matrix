'use client';

import { useAccount } from 'wagmi';
import { useQuantuMatrix } from '../hooks/useQuantuMatrix';
import { ConnectWallet } from '../components/Common/ConnectWallet';
import { Stats } from '../components/Dashboard/Stats';
import { Header } from '../components/Navigation/Header';
import { ProfileInfo } from '../components/Profile/ProfileInfo';
import { ReferralSection } from '../components/Dashboard/ReferralSection';
import { ProfileStats } from '../components/Dashboard/ProfileStats';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { userData, globalStats, refetchUserData } = useQuantuMatrix();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (address && isConnected) {
      refetchUserData();
    }
  }, [address, isConnected, refetchUserData]);

  // Loading state during SSR and initial client render
  if (!mounted) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-2">
              Quantum Library
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
              🔥📚✨ RICOMATRIX
            </h1>
            <p className="text-sm md:text-base text-slate-400">
              READ • EARN • OWN — Real book chapters on-chain with matrix & royalty rewards.
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
              Welcome to RicoMatrix
            </p>
            <h1 className="text-3xl font-bold text-slate-50 mb-4">
              Connect your wallet to start
            </h1>
            <p className="text-sm md:text-base text-slate-400 mb-8">
              Connect your Web3 wallet to access your dashboard, unlock chapters,
              and track your matrix & royalty earnings.
            </p>
            <div className="flex justify-center">
              <ConnectWallet/>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-900 via-slate-950 to-black">
        <div className="container mx-auto px-4 py-8 md:py-10">
          {/* Header */}
          <div className="text-center mb-10 md:mb-12">
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
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
            {/* Left Column - Profile & Referral */}
            <div className="lg:col-span-1 space-y-6">
              {/* Profile Info with Enhanced Border */}
              <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-5 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                <ProfileInfo userData={userData} />
              </div>

              {/* Referral Section with Enhanced Border */}
              <div className="rounded-2xl border border-purple-400/40 bg-slate-950/80 p-5 shadow-[0_0_26px_rgba(88,28,135,0.6)] backdrop-blur-sm">
                <ReferralSection />
              </div>
            </div>

            {/* Right Column - Stats & Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Stats Overview with Enhanced Border */}
              <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                <Stats userData={userData} globalStats={globalStats} />
              </div>

              {/* Profile Stats with Enhanced Border */}
              <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                <ProfileStats userData={userData} />
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/70 p-6 text-center shadow-[0_0_28px_rgba(0,0,0,0.6)]">
                  <h3 className="text-lg font-semibold text-slate-50 mb-2">
                    Join Library
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Start your journey with Chapter 1 and secure your first matrix position.
                  </p>
                  <Link
                    href="/chapters"
                    className="inline-block rounded-xl bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300 px-6 py-2 text-sm font-semibold text-black shadow-[0_0_18px_rgba(250,204,21,0.6)] hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    Get Started
                  </Link>
                </div>

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

              {/* User Status */}
              {!userData?.exists && (
                <div className="rounded-2xl border border-amber-400/40 bg-amber-500/5 p-6 md:p-7 text-center shadow-[0_0_24px_rgba(0,0,0,0.7)]">
                  <h3 className="text-lg md:text-xl font-semibold text-amber-200 mb-2">
                    Welcome! You haven't joined the library yet.
                  </h3>
                  <p className="text-sm md:text-base text-amber-100/90 mb-4 max-w-xl mx-auto">
                    Join the RicoMatrix library to start unlocking chapters, activating matrix
                    positions, and earning from the global ecosystem.
                  </p>
                  <Link
                    href="/chapters"
                    className="inline-block rounded-xl bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300 px-7 py-2.5 text-sm font-semibold text-black shadow-[0_0_20px_rgba(250,204,21,0.7)] hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    Join RicoMatrix Library
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}