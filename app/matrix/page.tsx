'use client';

import { Header } from '../../components/Navigation/Header';
import { useAccount } from 'wagmi';
import { ConnectWallet } from '../../components/Common/ConnectWallet';
import { Track1Matrix } from '../../components/Matrix/Track1Matrix';
import { Track2Matrix } from '../../components/Matrix/Track2Matrix';
import { MatrixStats } from '../../components/Matrix/MatrixStats';
import { useQuantuMatrix } from '../../hooks/useQuantuMatrix';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

export default function MatrixPage() {
  const { isConnected } = useAccount();
  const { userData } = useQuantuMatrix();
  const searchParams = useSearchParams();
  const initialTrack = searchParams.get('track') === '2' ? 2 : 1;
  const requestedChapter = Number.parseInt(searchParams.get('chapter') || '1', 10);
  const initialChapter = Number.isFinite(requestedChapter)
    ? Math.max(1, Math.min(12, requestedChapter))
    : 1;
  const [activeTrack, setActiveTrack] = useState<1 | 2>(initialTrack);
  const t = useTranslations('Matrix.MatrixPage');

  useEffect(() => {
    setActiveTrack(initialTrack);
  }, [initialTrack]);

  const focusLabel = useMemo(
    () => `${activeTrack === 1 ? t('trackSelection.x3Track') : t('trackSelection.x6Track')} • ${initialChapter}`,
    [activeTrack, initialChapter, t]
  );

  if (!isConnected) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
          <div className="max-w-md w-full rounded-2xl border border-yellow-500/20 bg-black/70 px-6 py-10 text-center shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-3">
              {t('connect.accessLabel')}
            </p>
            <h1 className="text-3xl font-bold text-slate-50 mb-4">
              {t('connect.title')}
            </h1>
            <p className="text-sm md:text-base text-slate-400 mb-8">
              {t('connect.description')}
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
              {t('header.networksLabel')}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
              {t('header.title')}
            </h1>
            <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
              {t('header.description')}
            </p>
          </div>

          <div className="mx-auto mb-8 max-w-4xl rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-5 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-yellow-300/80">
                  {t('header.focusTitle')}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {t('header.focusDescription')}
                </p>
              </div>
              <div className="inline-flex w-fit items-center rounded-full border border-yellow-400/30 bg-yellow-500/10 px-4 py-2 text-sm font-semibold text-yellow-100">
                {focusLabel}
              </div>
            </div>
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
                {t('trackSelection.x3Track')}
              </button>
              <button
                onClick={() => setActiveTrack(2)}
                className={`px-5 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                  activeTrack === 2
                    ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300 text-white shadow-[0_0_18px_rgba(245,158,11,0.35)]'
                    : 'text-slate-300 hover:text-yellow-300 hover:bg-yellow-500/10'
                }`}
              >
                {t('trackSelection.x6Track')}
              </button>
            </div>
          </div>

          {/* Matrix Display */}
          <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-4 md:p-6 shadow-[0_0_32px_rgba(0,0,0,0.8)] backdrop-blur-sm">
            {activeTrack === 1 ? (
              <Track1Matrix initialChapter={initialChapter} />
            ) : (
              <Track2Matrix initialChapter={initialChapter} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
