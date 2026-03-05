"use client";

import { useTranslations } from "next-intl";

interface GlobalPanelProps {
  totalReaders?: string | number;
  totalChapters?: number;
  totalTransactionsUsdt?: string;
  isLoading?: boolean;
  isUnavailable?: boolean;
}

const formatNumber = (value: string | number | undefined) => {
  if (value === undefined || value === null) return "0";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "0";
  return num.toLocaleString("en-US");
};

const formatCurrency = (value: string | number | undefined) => {
  if (value === undefined || value === null) return "0.00";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const GlobalPanel = ({
  totalReaders,
  totalChapters,
  totalTransactionsUsdt,
  isLoading,
  isUnavailable,
}: GlobalPanelProps) => {
  const t = useTranslations("Dashboard.globalPanel");

  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-6 shadow-[0_0_28px_rgba(0,0,0,0.7)] backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-slate-50">
            {t("title")}
          </h3>
          <p className="text-sm text-slate-400">{t("subtitle")}</p>
        </div>
        <div className="text-xs px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-300">
          {t("live")}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-xl border border-slate-800/80 bg-black/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-yellow-300/80 mb-2">
            {t("readers")}
          </p>
          <p className="text-2xl font-semibold text-white">
            {isLoading ? t("loading") : formatNumber(totalReaders)}
          </p>
          <p className="text-xs text-slate-500 mt-2">{t("readersNote")}</p>
        </div>
      </div>
    </div>
  );
};
