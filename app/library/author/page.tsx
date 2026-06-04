"use client";

import { Header } from "@/components/Navigation/Header";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function LibraryAuthorRedirect() {
  const t = useTranslations("LibraryAuthorRedirect");
  const copy = {
    kicker: t("kicker"),
    title: t("title"),
    description: t("description"),
    cta: t("cta"),
  };
  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950">
        <div className="container mx-auto px-4 py-12">
          <div className="rounded-3xl border border-white/10 bg-black/60 p-8 text-center shadow-[0_0_28px_rgba(0,0,0,0.8)]">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-3">
              {copy.kicker}
            </p>
            <h1 className="text-3xl font-bold text-slate-50 mb-4">
              {copy.title}
            </h1>
            <p className="text-sm text-slate-400 mb-6">
              {copy.description}
            </p>
            <Link
              href="/library/upload"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_0_24px_rgba(250,204,21,0.35)]"
            >
              {copy.cta}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
