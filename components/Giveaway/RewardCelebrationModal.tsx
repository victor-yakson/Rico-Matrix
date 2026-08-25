"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

interface RewardCelebrationModalProps {
  open: boolean;
  onClose: () => void;
  /** "new" for a just-completed registration, "returning" for an existing
   * account being made aware of the giveaway on wallet connect. */
  variant?: "new" | "returning";
}

const COPY = {
  new: {
    kicker: "Welcome to Rico Matrix",
    title: "You're In! 👑",
    body: (
      <>
        Your account is live — and you may already qualify for the{" "}
        <span className="font-semibold text-yellow-300">$RICO Giveaway</span>{" "}
        and a shot at the{" "}
        <span className="font-semibold text-amber-300">Game of Thrones</span>{" "}
        crown. Check your eligibility now.
      </>
    ),
  },
  returning: {
    kicker: "New On Rico Matrix",
    title: "Rewards Are Waiting 🎁",
    body: (
      <>
        The{" "}
        <span className="font-semibold text-yellow-300">$RICO Giveaway</span>{" "}
        and{" "}
        <span className="font-semibold text-amber-300">Game of Thrones</span>{" "}
        crown system just launched — your account may already qualify.
      </>
    ),
  },
} as const;

const CONFETTI_COLORS = [
  "#facc15", // yellow-400
  "#fbbf24", // amber-400
  "#f472b6", // pink-400
  "#34d399", // emerald-400
  "#38bdf8", // sky-400
  "#f97316", // orange-500
];

const CONFETTI_COUNT = 44;

type ConfettiPiece = {
  id: number;
  left: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  rotate: number;
  drift: number;
};

const generateConfetti = (): ConfettiPiece[] =>
  Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 6 + Math.random() * 8,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 0.6,
    duration: 2.2 + Math.random() * 1.6,
    rotate: Math.random() * 360,
    drift: (Math.random() - 0.5) * 160,
  }));

export const RewardCelebrationModal = ({
  open,
  onClose,
  variant = "new",
}: RewardCelebrationModalProps) => {
  const copy = COPY[variant];
  // Generated client-side only, after mount: Math.random() during render
  // would embed different values in the server HTML vs. the client's first
  // render, which React flags as a hydration mismatch if the modal is ever
  // open on that very first render.
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (open) setConfetti(generateConfetti());
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Confetti burst */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {confetti.map((piece) => (
              <motion.span
                key={piece.id}
                className="absolute top-[-5%] rounded-sm"
                style={{
                  left: `${piece.left}%`,
                  width: piece.size,
                  height: piece.size * 0.4,
                  backgroundColor: piece.color,
                }}
                initial={{ y: "-10vh", x: 0, rotate: 0, opacity: 0 }}
                animate={{
                  y: "110vh",
                  x: piece.drift,
                  rotate: piece.rotate,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: piece.duration,
                  delay: piece.delay,
                  ease: "easeIn",
                }}
              />
            ))}
          </div>

          <motion.div
            className="relative w-full max-w-md rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-slate-950 via-black to-slate-900 p-7 md:p-9 text-center shadow-[0_40px_120px_rgba(0,0,0,0.85)]"
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-slate-400 transition hover:border-yellow-400 hover:text-yellow-300"
            >
              ✕
            </button>

            <motion.div
              className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-500 p-3 shadow-[0_0_40px_rgba(245,158,11,0.55)]"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.15 }}
            >
              <Image
                src="/logo.png"
                alt="Rico Matrix"
                width={56}
                height={56}
                className="h-full w-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
                priority
              />
            </motion.div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-yellow-300/80">
              {copy.kicker}
            </p>
            <h2 className="mb-3 text-2xl md:text-3xl font-bold text-slate-50">
              {copy.title}
            </h2>
            <p className="mb-6 text-sm text-slate-300">{copy.body}</p>

            <div className="flex flex-col gap-3">
              <Link
                href="/rewards"
                onClick={onClose}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 px-6 py-3 text-base font-bold text-black shadow-[0_0_22px_rgba(245,158,11,0.45)] transition hover:brightness-110 active:scale-[0.98]"
              >
                🚀 Check My Rewards
              </Link>
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
