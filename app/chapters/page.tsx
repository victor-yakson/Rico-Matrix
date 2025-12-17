"use client";

import { Header } from "../../components/Navigation/Header";
import { ChapterGrid } from "../../components/Chapters/ChapterGrid";
import { useAccount } from "wagmi";
import { ConnectWallet } from "../../components/Common/ConnectWallet";
import { useTranslations } from "next-intl";
import { useQuantuMatrix } from "../../hooks/useQuantuMatrix";
import { LoadingSpinner } from "../../components/Common/LoadingSpinner";
import { useRouter } from "next/navigation";

export default function ChaptersPage() {
  const { isConnected } = useAccount();
  const { userData, loading } = useQuantuMatrix();
  const router = useRouter();
  const t = useTranslations("ChaptersPage");

  if (!isConnected) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
          <div className="max-w-md w-full rounded-2xl border border-yellow-500/20 bg-black/70 px-6 py-10 text-center shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-3">
              {t("connect.label")}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-4">
              {t("connect.title")}
            </h1>
            <p className="text-sm md:text-base text-slate-400 mb-8">
              {t("connect.description")}
            </p>
            <div className="flex justify-center">
              <ConnectWallet />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </>
    );
  }

  // Check if user is registered
  if (!userData?.exists) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
          <div className="max-w-md w-full rounded-2xl border border-amber-500/20 bg-black/70 px-6 py-10 text-center shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-amber-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
            
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300/80 mb-3">
              {t("registration.label")}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-4">
              {t("registration.title")}
            </h1>
            <p className="text-sm md:text-base text-slate-400 mb-8">
              {t("registration.description")}
            </p>
            
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
            >
              {t("registration.button")}
            </button>
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
              {t("header.label")}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
              {t("header.title")}
            </h1>
            <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
              {t("header.description")}
            </p>
          </div>

          <ChapterGrid />
        </div>
      </div>
    </>
  );
}