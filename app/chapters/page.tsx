"use client";

import { Header } from "../../components/Navigation/Header";
import { ChapterGrid } from "../../components/Chapters/ChapterGrid";
import { useTranslations } from "next-intl";
import { useQuantuMatrix } from "../../hooks/useQuantuMatrix";
import { LoadingSpinner } from "../../components/Common/LoadingSpinner";
import { useRouter } from "next/navigation";

export default function ChaptersPage() {
  const { userData, loading } = useQuantuMatrix();
  const router = useRouter();
  const t = useTranslations("ChaptersPage");

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

        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 bg-gradient-to-br from-black via-[#0b0b0b] to-[#070707]">
          <div className="relative max-w-md w-full">
            {/* Glow background */}
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/20 via-amber-300/15 to-yellow-200/10 blur-2xl opacity-50 rounded-3xl"></div>

            {/* Card */}
            <div className="relative bg-black/70 backdrop-blur-xl border border-yellow-500/20 rounded-3xl p-8 md:p-10 shadow-2xl text-center">
              {/* Icon */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-400/10 flex items-center justify-center ring-1 ring-yellow-400/30">
                <svg
                  className="w-10 h-10 text-yellow-300"
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

              {/* Label */}
              <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/70 mb-4">
                {t("registration.label")}
              </p>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
                {t("registration.title")}
              </h1>

              {/* Description */}
              <p className="text-sm md:text-base text-zinc-300/80 mb-8 leading-relaxed">
                {t("registration.description")}
              </p>

              {/* Button */}
              <button
                onClick={() => router.push("/")}
                className="group relative w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 text-black font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_10px_30px_rgba(241,210,133,0.35)]"
              >
                <span className="relative z-10">
                  {t("registration.button")}
                </span>

                {/* Subtle shine effect */}
                <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-white/10"></span>
              </button>
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
