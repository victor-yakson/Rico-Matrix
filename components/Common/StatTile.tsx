"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { useCountUp } from "../../hooks/useCountUp";

type StatAccent = "gold" | "emerald" | "sky" | "rose" | "slate";

const ACCENT_STYLES: Record<StatAccent, { icon: string; value: string; ring: string }> = {
  gold: {
    icon: "border-yellow-400/30 bg-yellow-500/10 text-yellow-300",
    value: "text-amber-200",
    ring: "hover:border-yellow-400/40",
  },
  emerald: {
    icon: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    value: "text-emerald-200",
    ring: "hover:border-emerald-400/40",
  },
  sky: {
    icon: "border-sky-400/30 bg-sky-500/10 text-sky-300",
    value: "text-sky-200",
    ring: "hover:border-sky-400/40",
  },
  rose: {
    icon: "border-rose-400/30 bg-rose-500/10 text-rose-300",
    value: "text-rose-200",
    ring: "hover:border-rose-400/40",
  },
  slate: {
    icon: "border-slate-500/30 bg-slate-500/10 text-slate-300",
    value: "text-slate-100",
    ring: "hover:border-slate-400/40",
  },
};

interface StatTileProps {
  icon?: ReactNode;
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  accent?: StatAccent;
  sublabel?: ReactNode;
  trend?: { direction: "up" | "down"; label: string };
  animate?: boolean;
  className?: string;
}

export const StatTile = ({
  icon,
  label,
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
  accent = "gold",
  sublabel,
  trend,
  animate = true,
  className = "",
}: StatTileProps) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const animated = useCountUp(animate ? safeValue : safeValue, 700);
  const displayValue = animate ? animated : safeValue;

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(displayValue);

  const style = ACCENT_STYLES[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -2 }}
      className={`theme-stat-panel p-4 transition-colors ${style.ring} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className={`mt-2 text-2xl font-semibold tabular-nums ${style.value}`}>
            {prefix}
            {formatted}
            {suffix}
          </p>
          {sublabel && (
            <p className="mt-1 text-xs text-slate-500">{sublabel}</p>
          )}
        </div>
        {icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg ${style.icon}`}
          >
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div
          className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
            trend.direction === "up"
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-rose-500/10 text-rose-300"
          }`}
        >
          <span>{trend.direction === "up" ? "▲" : "▼"}</span>
          {trend.label}
        </div>
      )}
    </motion.div>
  );
};
