"use client";

import { useTranslations } from "next-intl";

const NETWORKS = ["Ethereum", "Polygon", "Base", "BSC"];

export default function NetworkShowcase() {
  const t = useTranslations("GlobalNetworks");

  return (
    <div className="relative z-30 border-b border-yellow-400/15 bg-[linear-gradient(90deg,rgba(7,10,17,0.92),rgba(20,16,8,0.88),rgba(7,10,17,0.92))] px-3 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-3">
        <span className="text-[0.64rem] font-semibold uppercase tracking-[0.28em] text-yellow-200/90">
          {t("availableOn")}
        </span>
        <div className="flex max-w-full flex-wrap justify-center gap-1.5 sm:gap-2">
          {NETWORKS.map((network) => (
            <span
              key={network}
              className="inline-flex min-h-7 items-center rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-[0.68rem] font-semibold text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:px-3 sm:text-xs"
            >
              {network}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
