"use client";

import { Header } from "../../components/Navigation/Header";
import { RoyaltyPool } from "../../components/Royalty/RoyaltyPool";
import { useTranslations } from "next-intl";

export default function RoyaltyPage() {
  const t = useTranslations("RoyaltyPage");

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto px-4 py-8 md:py-10">
          <div className="text-center mb-10 md:mb-12">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-3">
              {t("dashboard.label")}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3">
              {t("dashboard.title")}
            </h1>
            <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
              {t("dashboard.description")}
            </p>
          </div>

          <RoyaltyPool />
        </div>
      </div>
    </>
  );
}
