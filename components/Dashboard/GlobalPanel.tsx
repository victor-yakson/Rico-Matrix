"use client";

import { useTranslations } from "next-intl";
import { StatTile } from "../Common/StatTile";

interface GlobalPanelProps {
  totalReaders?: string | number;
  totalChapters?: number;
  totalTransactionsUsdt?: string;
  isLoading?: boolean;
  isUnavailable?: boolean;
}

export const GlobalPanel = ({
  totalReaders,
  isLoading,
}: GlobalPanelProps) => {
  const t = useTranslations("Dashboard.globalPanel");

  const readersValue =
    typeof totalReaders === "string" ? Number(totalReaders) : totalReaders;

  return (
    <div className="theme-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="theme-kicker mb-1">{t("subtitle")}</p>
          <h3 className="text-xl font-semibold text-slate-50">
            {t("title")}
          </h3>
        </div>
        <div className="theme-chip theme-chip--gold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {t("live")}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <StatTile
          label={t("readers")}
          value={isLoading ? 0 : Number.isFinite(readersValue) ? (readersValue as number) : 0}
          decimals={0}
          accent="gold"
          sublabel={isLoading ? t("loading") : t("readersNote")}
        />
      </div>
    </div>
  );
};
