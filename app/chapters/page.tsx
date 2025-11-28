"use client";

import { Header } from "../../components/Navigation/Header";
import { ChapterGrid } from "../../components/Chapters/ChapterGrid";
import { useAccount } from "wagmi";
import { ConnectWallet } from "../../components/Common/ConnectWallet";

export default function ChaptersPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
          <div className="max-w-md w-full rounded-2xl border border-yellow-500/20 bg-black/70 px-6 py-10 text-center shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-3">
              Connect Wallet
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-4">
              Connect to View Chapters
            </h1>
            <p className="text-sm md:text-base text-slate-400 mb-8">
              Link your Web3 wallet to unlock book chapters and start earning
              on-chain royalties.
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
        <div className="container mx-auto px-4 py-10">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-3">
              Quantum Chapters
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
              Book Chapters
            </h1>
            <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
              Unlock real book chapters on-chain, own the intellectual property
              access, and earn matrix + royalty rewards as the library grows.
            </p>
          </div>

          <ChapterGrid />
        </div>
      </div>
    </>
  );
}
