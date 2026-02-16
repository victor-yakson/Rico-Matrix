"use client";

interface StatsCardProps {
  label: string;
  value: string;
  note?: string;
}

export default function StatsCard({ label, value, note }: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-black/70 p-4 shadow-[0_0_28px_rgba(0,0,0,0.55)]">
      <div className="text-xs uppercase tracking-[0.22em] text-yellow-300/80">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {note && <div className="mt-2 text-xs text-slate-400">{note}</div>}
    </div>
  );
}
