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
          <section className="mx-auto mb-6 max-w-6xl rounded-[1.75rem] border border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(245,166,35,0.12),transparent_26%),linear-gradient(180deg,rgba(10,12,18,0.98),rgba(4,6,10,0.98))] px-5 py-5 shadow-[0_24px_70px_rgba(0,0,0,0.34)] md:px-6 md:py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-4xl">
                <p className="theme-kicker">{t('kicker')}</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
                  {t('title')}
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-yellow-400/25 bg-yellow-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-yellow-100">
                  Quantima vote
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                  Live contract
                </span>
              </div>
            </div>
            <p className="theme-copy mt-3 max-w-4xl text-sm md:text-base">
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
