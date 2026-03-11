"use client";

import { Header } from "@/components/Navigation/Header";
import { useQuantuMatrix } from "@/hooks/useQuantuMatrix";
import { LoadingSpinner } from "@/components/Common/LoadingSpinner";
import { useTranslations } from "next-intl";
import Link from "next/link";

type SkillLesson = {
  title: string;
  duration: string;
  videoUrl?: string;
};

type SkillModule = {
  module: number;
  title: string;
  summary: string;
  status: "live" | "upcoming";
  playlistUrl?: string;
  lessons: SkillLesson[];
};

const DIGITAL_MARKETING_MODULES: SkillModule[] = [
  {
    module: 1,
    title: "Foundations & Execution System",
    summary: "Understand the complete execution framework and how all campaign parts connect.",
    status: "live",
    lessons: [
      {
        title: "Digital Marketing Execution System Course",
        duration: "18 min",
        videoUrl: "https://www.youtube.com/embed/oMbs7mTd1Zk?si=9NAC9iayEF_ZfOYF",
      },
      {
        title: "Seven Execution Phases",
        duration: "14 min",
        videoUrl: "https://www.youtube.com/embed/dQckqN0lLKU?si=Al-sT6HIhYHbFpH_",
      },
      {
        title: "What We Are About To Build",
        duration: "12 min",
        videoUrl: "https://www.youtube.com/embed/QvOQ0gusXVo?si=A-G-H_J4HaF90x5c",
      },
    ],
  },
  {
    module: 2,
    title: "Market, Audience & Positioning",
    summary: "Define niche, audience intent, and positioning for strong offer-market fit.",
    status: "live",
    playlistUrl: "https://www.youtube.com/playlist?list=PLdkdBSWW9LiLx9bHWhdlwYH8B2bWF7RtP",
    lessons: [
      {
        title: "Lesson 1",
        duration: "Video",
        videoUrl: "https://www.youtube.com/embed/vTKle7H7eMI?si=Zeer2wZS5TPw1klg",
      },
      {
        title: "Lesson 2",
        duration: "Video",
        videoUrl: "https://www.youtube.com/embed/9X5lmomJXmY?si=LH9YDLEzegvsnSCO",
      },
      {
        title: "Lesson 2.1",
        duration: "Video",
        videoUrl: "https://www.youtube.com/embed/PMpDImcBkaw?si=Fbiw2ceBFgjZBwwB",
      },
      {
        title: "Lesson 3",
        duration: "Video",
        videoUrl: "https://www.youtube.com/embed/-s_QF43E1k4?si=ABFyBDF7o5ipfMCE",
      },
      {
        title: "Lesson 4",
        duration: "Video",
        videoUrl: "https://www.youtube.com/embed/omuv4XXyzsY?si=g7GOeJghdicO-iuq",
      },
    ],
  },
  {
    module: 3,
    title: "Offer Design & Funnel Architecture",
    summary: "Build clear offers and conversion funnels for predictable customer journeys.",
    status: "live",
    lessons: [
      { title: "Designing Irresistible Offers", duration: "19 min" },
      { title: "Funnel Stages & Conversion Events", duration: "18 min" },
      { title: "Landing Page Structure", duration: "14 min" },
    ],
  },
  {
    module: 4,
    title: "Content Engine & Distribution",
    summary: "Create repeatable content systems and distribution loops across channels.",
    status: "live",
    lessons: [
      { title: "Content Pillars & Mapping", duration: "15 min" },
      { title: "Short-Form and Long-Form Strategy", duration: "18 min" },
      { title: "Distribution Calendar & Repurposing", duration: "13 min" },
    ],
  },
  {
    module: 5,
    title: "Organic Growth & Community",
    summary: "Grow audience trust using community workflows and engagement systems.",
    status: "live",
    lessons: [
      { title: "Organic Reach Mechanics", duration: "16 min" },
      { title: "Community-Led Growth", duration: "15 min" },
      { title: "Trust Signals & Social Proof", duration: "12 min" },
    ],
  },
  {
    module: 6,
    title: "Paid Acquisition & Optimization",
    summary: "Launch, measure, and optimize paid campaigns using clear performance loops.",
    status: "live",
    lessons: [
      { title: "Campaign Structure Fundamentals", duration: "20 min" },
      { title: "Creative Testing Matrix", duration: "17 min" },
      { title: "Budget Allocation & ROAS", duration: "14 min" },
    ],
  },
  {
    module: 7,
    title: "Email, Automation & Retention",
    summary: "Increase LTV with email flows, automations, and customer retention systems.",
    status: "live",
    lessons: [
      { title: "Lifecycle Email Architecture", duration: "16 min" },
      { title: "Automation Triggers & Logic", duration: "15 min" },
      { title: "Retention & Win-Back Loops", duration: "13 min" },
    ],
  },
  {
    module: 8,
    title: "Analytics, Reporting & Decisioning",
    summary: "Track the right KPIs, build reporting dashboards, and make data-driven decisions.",
    status: "live",
    lessons: [
      { title: "Core KPI Framework", duration: "14 min" },
      { title: "Attribution & Measurement Hygiene", duration: "16 min" },
      { title: "Weekly Performance Review Process", duration: "12 min" },
    ],
  },
  {
    module: 9,
    title: "Scale Operations & Team Systems",
    summary: "Operationalize growth with SOPs, team roles, and execution governance.",
    status: "live",
    lessons: [
      { title: "Scaling Strategy & Constraints", duration: "15 min" },
      { title: "SOPs and Role Design", duration: "14 min" },
      { title: "Execution Rhythm & Leadership", duration: "12 min" },
    ],
  },
];

const getYoutubeWatchUrl = (videoUrl: string) => {
  const embedMatch = videoUrl.match(/\/embed\/([^?&/]+)/);
  if (embedMatch?.[1]) {
    return `https://www.youtube.com/watch?v=${embedMatch[1]}`;
  }
  return videoUrl;
};

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
  const totalLessons = DIGITAL_MARKETING_MODULES.reduce(
    (acc, module) => acc + module.lessons.length,
    0
  );
  const totalVideoLessons = DIGITAL_MARKETING_MODULES.reduce(
    (acc, module) => acc + module.lessons.filter((lesson) => lesson.videoUrl).length,
    0
  );

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

              <section className="rounded-3xl border border-yellow-500/20 bg-slate-950/85 p-6 md:p-8 shadow-[0_0_34px_rgba(0,0,0,0.85)]">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-2">
                      Digital Marketing Learning Path
                    </p>
                    <h2 className="text-2xl md:text-3xl font-semibold text-slate-50">
                      Modules 01 - 09
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[0.7rem] uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-emerald-400/40 text-emerald-200 bg-emerald-400/10">
                      Live • {DIGITAL_MARKETING_MODULES.length} modules
                    </span>
                    <span className="text-[0.7rem] uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-cyan-400/40 text-cyan-200 bg-cyan-400/10">
                      {totalLessons} total lessons
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3 mb-5">
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Modules</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-50">
                      {DIGITAL_MARKETING_MODULES.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Lessons</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-50">{totalLessons}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Video lessons</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-50">{totalVideoLessons}</p>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  {DIGITAL_MARKETING_MODULES.map((module) => (
                    <article
                      key={module.module}
                      className="rounded-2xl border border-white/10 bg-black/55 p-5 shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-yellow-300/80">
                            Module {String(module.module).padStart(2, "0")}
                          </p>
                          <h3 className="mt-1 text-lg md:text-xl font-semibold text-slate-50">
                            {module.title}
                          </h3>
                        </div>
                        <span
                          className={`text-[0.65rem] uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${
                            module.status === "live"
                              ? "border-emerald-400/40 text-emerald-200 bg-emerald-400/10"
                              : "border-yellow-400/40 text-yellow-200 bg-yellow-400/10"
                          }`}
                        >
                          {module.status === "live" ? "Live" : t("status.comingSoon")}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-400">{module.summary}</p>

                      {module.playlistUrl ? (
                        <a
                          href={module.playlistUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center justify-center rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100 hover:bg-amber-400/20"
                        >
                          Open Module Playlist
                        </a>
                      ) : null}

                      <div className="mt-4 space-y-2">
                        {module.lessons.map((lesson, index) => (
                          <div
                            key={`${module.module}-${index}`}
                            className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.2em] text-yellow-300/80">
                                  Lesson {index + 1}
                                </p>
                                <p className="text-sm text-slate-100">{lesson.title}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">{lesson.duration}</span>
                                {lesson.videoUrl ? (
                                  <a
                                    href={getYoutubeWatchUrl(lesson.videoUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100 hover:bg-cyan-400/20"
                                  >
                                    Watch
                                  </a>
                                ) : (
                                  <span className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                    Lesson plan
                                  </span>
                                )}
                              </div>
                            </div>

                            {lesson.videoUrl ? (
                              <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/60">
                                <div className="aspect-video">
                                  <iframe
                                    className="h-full w-full"
                                    src={lesson.videoUrl}
                                    title={`${module.title} - ${lesson.title}`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    referrerPolicy="strict-origin-when-cross-origin"
                                    allowFullScreen
                                    loading="lazy"
                                  />
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-sm text-slate-300">
                    Continue with the full playlist on YouTube for published recordings.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <a
                      href="https://youtube.com/playlist?list=PLdkdBSWW9LiKw1GxyAcUgcATQxssKgmes&si=GDDZwmq9mk7RQ2BC"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_0_24px_rgba(250,204,21,0.35)] hover:brightness-110 active:scale-[0.98] transition-all"
                    >
                      Open Full Playlist
                    </a>
                    <Link
                      href="/chapters"
                      className="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-900/70 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800/80 transition-all"
                    >
                      Continue Chapter Progress
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
