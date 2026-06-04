"use client";

import { Header } from "../../components/Navigation/Header";
import { RoyaltyPool } from "../../components/Royalty/RoyaltyPool";
import { useTranslations } from "next-intl";

export default function RoyaltyPage() {
  const t = useTranslations("RoyaltyPage");

  return (
    <>
      <Header />
      <div className="theme-shell theme-page-shell">
        <div className="theme-container px-4">
          <div className="mx-auto mb-10 max-w-4xl text-center md:mb-12">
            <p className="theme-kicker justify-center mb-3">
              {t("dashboard.label")}
            </p>
            <h1 className="theme-title mb-3 text-3xl md:text-4xl">
              {t("dashboard.title")}
            </h1>
            <p className="theme-copy max-w-2xl mx-auto text-sm md:text-base">
              {t("dashboard.description")}
            </p>
          </div>

          <RoyaltyPool />
        </div>
      </div>
    </>
  );
}
