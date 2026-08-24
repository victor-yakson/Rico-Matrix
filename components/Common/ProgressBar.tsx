"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  label?: string;
  valueLabel?: string;
  percent: number; // 0-100
  accent?: "gold" | "emerald" | "sky";
  className?: string;
}

const ACCENT_GRADIENT: Record<NonNullable<ProgressBarProps["accent"]>, string> = {
  gold: "from-yellow-400 via-amber-400 to-orange-400",
  emerald: "from-emerald-400 via-teal-400 to-emerald-300",
  sky: "from-sky-400 via-blue-400 to-sky-300",
};

export const ProgressBar = ({
  label,
  valueLabel,
  percent,
  accent = "gold",
  className = "",
}: ProgressBarProps) => {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className={className}>
      {(label || valueLabel) && (
        <div className="mb-2 flex items-center justify-between text-xs">
          {label && <span className="text-slate-400">{label}</span>}
          {valueLabel && <span className="text-amber-200">{valueLabel}</span>}
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full border border-white/5 bg-slate-800/70">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${ACCENT_GRADIENT[accent]}`}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};
