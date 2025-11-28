'use client';

import { formatUnits } from 'viem';

interface ChapterCardProps {
  track: number;
  chapter: number;
  title: string;
  price: string;
  isUnlocked: boolean;
  onPurchase: (track: number, chapter: number) => Promise<void>;
  disabled: boolean;
}

export const ChapterCard = ({
  track,
  chapter,
  title,
  price,
  isUnlocked,
  onPurchase,
  disabled,
}: ChapterCardProps) => {
  const getTrackBadgeClass = (track: number) => {
    if (track === 1) {
      // Primary / X3
      return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black';
    }
    // Secondary / X6 or other tracks
    return 'bg-gradient-to-r from-slate-600 to-slate-400 text-white';
  };

  const getStatusText = () => {
    if (isUnlocked) return 'Unlocked';
    if (chapter > 1) return 'Locked — Complete previous chapter';
    return 'Available to unlock';
  };

  const getStatusColor = () => {
    if (isUnlocked) return 'text-emerald-400';
    if (chapter > 1) return 'text-amber-300';
    return 'text-yellow-400';
  };

  const formattedPrice =
    price && price !== '0' ? formatUnits(BigInt(price), 18) : '0';

  const isButtonDisabled = isUnlocked || disabled || chapter > 1;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-b from-black via-slate-950 to-slate-900 p-5 shadow-[0_0_40px_rgba(0,0,0,0.7)] transition-all duration-300 hover:-translate-y-1 hover:border-yellow-400 hover:shadow-[0_0_60px_rgba(250,204,21,0.4)]">
      {/* Glow accent */}
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-32 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.35),_transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between mb-4">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide shadow-sm ${getTrackBadgeClass(
            track
          )}`}
        >
          <span className="inline-block h-2 w-2 rounded-full bg-black/60" />
          Track {track}
        </span>

        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Chapter
          </p>
          <p className="text-2xl font-extrabold text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]">
            #{chapter}
          </p>
        </div>
      </div>

      <h3 className="relative mb-3 line-clamp-2 text-base font-semibold text-slate-50">
        {title}
      </h3>

      <div className="relative space-y-3 rounded-xl bg-slate-900/60 p-3 ring-1 ring-slate-700/70">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Price</span>
          <span className="font-semibold text-yellow-300">
            {formattedPrice} <span className="text-xs text-slate-400">USDT</span>
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Status</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      <button
        onClick={() => onPurchase(track, chapter)}
        disabled={isButtonDisabled}
        className={`relative mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide transition-all duration-200
          ${
            isButtonDisabled
              ? 'cursor-not-allowed bg-slate-800 text-slate-500 ring-1 ring-slate-700'
              : 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300 text-black shadow-[0_0_24px_rgba(250,204,21,0.5)] hover:shadow-[0_0_32px_rgba(250,204,21,0.8)] hover:brightness-110 active:scale-[0.98]'
          }
        `}
      >
        {isUnlocked
          ? 'Chapter Unlocked'
          : disabled
          ? 'Processing...'
          : 'Unlock Chapter'}
      </button>

      {/* Subtle bottom border highlight */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent opacity-60" />
    </div>
  );
};
