"use client";

import { Header } from "@/components/Navigation/Header";
import { useQuantuMatrix } from "@/hooks/useQuantuMatrix";
import { LoadingSpinner } from "@/components/Common/LoadingSpinner";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function SkillsPage() {
  const { userData, loading } = useQuantuMatrix();
  const t = useTranslations("SkillsPage");

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

  const maxUnlocked = Math.max(
    userData?.track1Unlocked ?? 0,
    userData?.track2Unlocked ?? 0
  );
  const hasAccess = maxUnlocked >= 5;

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

          {!hasAccess && (
            <div className="mx-auto max-w-2xl rounded-3xl border border-yellow-500/20 bg-slate-950/80 p-8 text-center shadow-[0_0_40px_rgba(0,0,0,0.8)]">
              <div className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-3">
                {t("status.comingSoon")}
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold text-slate-50 mb-4">
                {t("locked.title")}
              </h2>
              <p className="text-sm md:text-base text-slate-400 mb-6">
                {t("locked.description")}
              </p>
              <Link
                href="/chapters"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-sm md:text-base font-semibold text-black shadow-[0_0_24px_rgba(245,158,11,0.5)] hover:brightness-110 active:scale-[0.98] transition-all"
              >
                {t("locked.button")}
              </Link>
            </div>
          )}

          {hasAccess && (
            <div className="space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <article className="rounded-2xl border border-white/10 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs uppercase tracking-[0.25em] text-yellow-300/80">
                      Track 01
                    </div>
                    <span className="text-[0.7rem] uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-emerald-400/40 text-emerald-200 bg-emerald-400/10">
                      Live
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold text-slate-50 mb-3">
                    {t("tracks.marketing.title")}
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    {t("tracks.marketing.description")}
                  </p>
                  <div className="text-xs uppercase tracking-[0.22em] text-yellow-200/80">
                    Now available
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs uppercase tracking-[0.25em] text-yellow-300/80">
                      Track 02
                    </div>
                    <span className="text-[0.7rem] uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-yellow-400/40 text-yellow-200 bg-yellow-400/10">
                      {t("status.comingSoon")}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold text-slate-50 mb-3">
                    {t("tracks.trading.title")}
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    {t("tracks.trading.description")}
                  </p>
                  <div className="text-xs uppercase tracking-[0.22em] text-yellow-200/80">
                    {t("tracks.trading.note")}
                  </div>
                </article>
              </div>

              <section className="rounded-3xl border border-yellow-500/20 bg-slate-950/80 p-6 md:p-8 shadow-[0_0_34px_rgba(0,0,0,0.85)]">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-2">
                      Digital Marketing • Module 01
                    </p>
                    <h2 className="text-2xl md:text-3xl font-semibold text-slate-50">
                      Module 1 (Intro)
                    </h2>
                  </div>
                  <span className="text-[0.7rem] uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-emerald-400/40 text-emerald-200 bg-emerald-400/10">
                    Live • 3 lessons
                  </span>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <article className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden">
                    <div className="aspect-video">
                      <iframe
                        className="h-full w-full"
                        src="https://www.youtube.com/embed/oMbs7mTd1Zk?si=9NAC9iayEF_ZfOYF"
                        title="Module 1 - Lesson 1"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-yellow-300/80 mb-2">
                        Lesson 1
                      </p>
                      <h4 className="text-base font-semibold text-slate-50">
                        Digital Marketing execution system Course
                      </h4>
                    </div>
                  </article>

                  <article className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden">
                    <div className="aspect-video">
                      <iframe
                        className="h-full w-full"
                        src="https://www.youtube.com/embed/dQckqN0lLKU?si=Al-sT6HIhYHbFpH_"
                        title="Module 1 - Lesson 2"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-yellow-300/80 mb-2">
                        Lesson 2
                      </p>
                      <h4 className="text-base font-semibold text-slate-50">
                        Seven Execution phases
                      </h4>
                    </div>
                  </article>

                  <article className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden">
                    <div className="aspect-video">
                      <iframe
                        className="h-full w-full"
                        src="https://www.youtube.com/embed/QvOQ0gusXVo?si=A-G-H_J4HaF90x5c"
                        title="Module 1 - Lesson 3"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-yellow-300/80 mb-2">
                        Lesson 3
                      </p>
                      <h4 className="text-base font-semibold text-slate-50">
                        What we are about to build
                      </h4>
                    </div>
                  </article>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm text-slate-400">
                    Continue with the full playlist on YouTube.
                  </p>
                  <a
                    href="https://youtube.com/playlist?list=PLdkdBSWW9LiKw1GxyAcUgcATQxssKgmes&si=GDDZwmq9mk7RQ2BC"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_0_24px_rgba(250,204,21,0.35)] hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    Open Full Playlist
                  </a>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
