'use client';

import { Header } from '@/components/Navigation/Header';
import SiteFooter from '@/components/Layout/SiteFooter';
import { VotingExperience } from '@/components/Voting/VotingExperience';
import { useTranslations } from 'next-intl';

export default function VotingPage() {
  const t = useTranslations('VotingPage.page');
  return (
    <>
      <Header />
      <div className="theme-shell theme-page-shell">
        <main className="theme-container px-4">
          <section className="mx-auto mb-5 max-w-6xl rounded-[1.5rem] border border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(245,166,35,0.12),transparent_26%),linear-gradient(180deg,rgba(10,12,18,0.98),rgba(4,6,10,0.98))] px-4 py-4 shadow-[0_24px_70px_rgba(0,0,0,0.34)] sm:mb-6 sm:rounded-[1.75rem] sm:px-5 sm:py-5 md:px-6 md:py-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-4xl">
                <p className="theme-kicker">{t('kicker')}</p>
                <h1 className="mt-2 text-[1.85rem] font-semibold tracking-tight text-slate-50 sm:mt-3 sm:text-3xl md:text-4xl">
                  {t('title')}
                </h1>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-start">
                <span className="rounded-full border border-yellow-400/25 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-yellow-100 sm:px-3 sm:text-[11px] sm:tracking-[0.18em]">
                  Quantima vote
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100 sm:px-3 sm:text-[11px] sm:tracking-[0.18em]">
                  Live contract
                </span>
              </div>
            </div>
            <p className="theme-copy mt-2.5 max-w-3xl text-sm leading-6 md:mt-3 md:text-base">
              {t('description')}
            </p>
          </section>

          <VotingExperience variant="page" />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
