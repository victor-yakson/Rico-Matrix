'use client';

import { Header } from '../../components/Navigation/Header';
import { useAccount } from 'wagmi';
import { ConnectWallet } from '../../components/Common/ConnectWallet';
import { Track1Matrix } from '../../components/Matrix/Track1Matrix';
import { Track2Matrix } from '../../components/Matrix/Track2Matrix';
import { MatrixStats } from '../../components/Matrix/MatrixStats';
import { useQuantuMatrix } from '../../hooks/useQuantuMatrix';
import { useState } from 'react';

export default function MatrixPage() {
  const { isConnected } = useAccount();
  const { userData } = useQuantuMatrix();
  const [activeTrack, setActiveTrack] = useState<1 | 2>(1);

  if (!isConnected) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
          <div className="max-w-md w-full rounded-2xl border border-yellow-500/20 bg-black/70 px-6 py-10 text-center shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-3">
              Matrix Access
            </p>
            <h1 className="text-3xl font-bold text-slate-50 mb-4">
              Connect to View Matrix
            </h1>
            <p className="text-sm md:text-base text-slate-400 mb-8">
              Connect your wallet to visualize your X3 & X6 matrix networks and
              monitor how your structure is growing in real time.
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
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto px-4 py-8 md:py-10">
          {/* Header */}
          <div className="text-center mb-10 md:mb-12">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-3">
              Matrix Networks
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
              X3 & X6 Matrix Overview
            </h1>
            <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
              Track your network growth, reinvest cycles, and earnings across
              both matrix tracks in one unified view.
            </p>
          </div>

          {/* Matrix Stats */}
          <MatrixStats userData={userData} />

          {/* Track Selection */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-2xl bg-slate-900/70 border border-yellow-500/20 p-1 shadow-[0_0_24px_rgba(0,0,0,0.6)]">
              <button
                onClick={() => setActiveTrack(1)}
                className={`px-5 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                  activeTrack === 1
                    ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300 text-black shadow-[0_0_18px_rgba(250,204,21,0.7)]'
                    : 'text-slate-300 hover:text-yellow-300 hover:bg-yellow-500/5'
                }`}
              >
                X3 Matrix Track
              </button>
              <button
                onClick={() => setActiveTrack(2)}
                className={`px-5 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                  activeTrack === 2
                    ? 'bg-gradient-to-r from-violet-500 via-purple-600 to-fuchsia-500 text-white shadow-[0_0_18px_rgba(192,132,252,0.7)]'
                    : 'text-slate-300 hover:text-purple-300 hover:bg-purple-500/10'
                }`}
              >
                X6 Matrix Track
              </button>
            </div>
          </div>

          {/* Matrix Display */}
          <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-4 md:p-6 shadow-[0_0_32px_rgba(0,0,0,0.8)] backdrop-blur-sm">
            {activeTrack === 1 ? <Track1Matrix /> : <Track2Matrix />}
          </div>
        </div>
      </div>
    </>
  );
}
