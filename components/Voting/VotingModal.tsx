'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

type VotingModalProps = {
  open: boolean;
  onClose: () => void;
};

export function VotingModal({ open, onClose }: VotingModalProps) {
  const t = useTranslations('VotingPage.modal');
  const milestones = t.raw('milestones') as Array<{ date: string; title: string }>;
  const highlights = t.raw('highlights') as string[];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto px-3 py-3 sm:px-4 sm:py-5 md:items-center md:px-6 md:py-8">
      <button
        type="button"
        aria-label={t('close')}
        className="voting-modal-backdrop absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="voting-modal-panel relative z-10 my-auto w-full max-w-4xl overflow-hidden rounded-[1.5rem] border border-yellow-400/20 bg-[radial-gradient(circle_at_top_right,rgba(245,166,35,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(0,212,255,0.1),transparent_34%),linear-gradient(180deg,rgba(8,10,16,0.98),rgba(3,5,9,0.99))] shadow-[0_32px_90px_rgba(0,0,0,0.68)] sm:rounded-[2rem] sm:shadow-[0_40px_120px_rgba(0,0,0,0.72)]">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-yellow-300/75 to-transparent sm:inset-x-10" />

        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/8 bg-[linear-gradient(180deg,rgba(8,10,16,0.98),rgba(8,10,16,0.92))] px-4 py-3 backdrop-blur-xl sm:items-center sm:px-5 sm:py-4 md:px-6">
          <div className="absolute inset-x-0 top-2 flex justify-center sm:hidden">
            <span className="h-1 w-12 rounded-full bg-white/12" />
          </div>
          <div className="min-w-0">
            <p className="pt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-yellow-200/80 sm:pt-0 sm:text-xs">
              {t('kicker')}
            </p>
            <h2 className="mt-1 max-w-[14ch] text-lg font-semibold leading-tight text-slate-50 sm:max-w-none sm:text-xl md:text-2xl">
              {t('title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-yellow-400/30 hover:text-yellow-100 sm:px-4 sm:text-sm"
          >
            {t('close')}
          </button>
        </div>

        <div className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-4 sm:max-h-[calc(100dvh-2.5rem)] sm:p-5 md:max-h-[calc(100dvh-6rem)] md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-5 md:p-6">
          <div>
            <p className="max-w-2xl text-[0.95rem] leading-6 text-slate-300 md:text-base md:leading-7">
              {t('description')}
            </p>

            <div className="mt-4 rounded-[1.5rem] border border-yellow-400/20 bg-yellow-500/10 p-4 sm:mt-5 sm:rounded-3xl sm:p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-yellow-200/80">
                {t('incentiveKicker')}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('votePriceLabel')}</p>
                  <p className="mt-2 text-xl font-semibold text-slate-50 sm:text-2xl">{t('votePriceValue')}</p>
                </div>
                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">{t('voteRewardLabel')}</p>
                  <p className="mt-2 text-xl font-semibold text-slate-50 sm:text-2xl">{t('voteRewardValue')}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 sm:px-4"
                >
                  <span className="mt-0.5 text-yellow-300">•</span>
                  <p className="text-sm leading-6 text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 md:mt-0">
            <div className="order-1 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 shadow-[0_20px_48px_rgba(0,0,0,0.28)] sm:rounded-3xl sm:p-5 md:order-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t('ctaKicker')}</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-50">{t('ctaTitle')}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{t('ctaDescription')}</p>

              <div className="mt-4 grid gap-3 sm:mt-5">
                <Link
                  href="/voting"
                  onClick={onClose}
                  className="theme-button-primary w-full justify-center px-5 py-3 text-sm"
                >
                  {t('openVotingPage')}
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="theme-button-secondary w-full justify-center px-5 py-3 text-sm"
                >
                  {t('dismiss')}
                </button>
              </div>
            </div>

            <div className="order-2 rounded-[1.5rem] border border-cyan-400/15 bg-cyan-400/10 p-4 sm:rounded-3xl sm:p-5 md:order-1">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">{t('timelineKicker')}</p>
              <div className="mt-4 space-y-2.5 sm:space-y-3">
                {milestones.map((milestone) => (
                  <div
                    key={`${milestone.date}-${milestone.title}`}
                    className="rounded-2xl border border-white/10 bg-black/20 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-200/80">
                      {milestone.date}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-100">{milestone.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
