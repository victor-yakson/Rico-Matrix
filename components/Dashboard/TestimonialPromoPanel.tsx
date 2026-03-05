"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  defaultWallet?: string | null;
};

const WHATSAPP_NUMBER = "2348146479700";
const FLYER_IMAGE = "/testimonialPromo.png";

const isWallet = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());

export const TestimonialPromoPanel = ({ defaultWallet }: Props) => {
  const [wallet, setWallet] = useState("");
  const [testimonialLink, setTestimonialLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultWallet) {
      setWallet(defaultWallet);
    }
  }, [defaultWallet]);

  const canSubmit = useMemo(
    () => isWallet(wallet) && testimonialLink.trim().length > 0,
    [wallet, testimonialLink],
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!isWallet(wallet)) {
      setError("Enter a valid wallet address.");
      return;
    }
    if (!testimonialLink.trim()) {
      setError("Testimonial link is required.");
      return;
    }

    const message = [
      "🌟 RicoMatrix Testimonial Submission",
      "",
      "✅ Wallet Address",
      `${wallet.trim()}`,
      "",
      "🔗 Testimonial Link",
      `${testimonialLink.trim()}`,
      "",
      "📌 Confirmation",
      "I followed the guidelines on the flyer.",
    ].join("\n");

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      message,
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="rounded-2xl border border-yellow-500/25 bg-gradient-to-br from-slate-950 via-black to-slate-900 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-yellow-300/80 mb-2">
          RicoMatrix Testimonial Reward
        </p>
        <h2 className="text-xl md:text-2xl font-semibold text-slate-50">
          Submit Your Testimonial and Earn 3.5 USDT
        </h2>
        <p className="text-sm text-slate-400 mt-2">
          Follow the flyer guidelines. Qualified submissions receive 3.5 USDT.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="w-full overflow-hidden rounded-lg border border-yellow-500/20 bg-black">
            <img
              src={FLYER_IMAGE}
              alt="RicoMatrix Testimonial Flyer"
              className="h-auto w-full object-contain"
              loading="lazy"
            />
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Review the flyer carefully before submitting.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-2 block">
              Wallet Address
            </label>
            <input
              value={wallet}
              onChange={(event) => setWallet(event.target.value)}
              placeholder="0x..."
              className="w-full rounded-xl border border-yellow-500/20 bg-black/60 px-4 py-3 text-sm text-slate-100 outline-none focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/20"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-2 block">
              Testimonial Link
            </label>
            <input
              value={testimonialLink}
              onChange={(event) => setTestimonialLink(event.target.value)}
              placeholder="https://facebook.com/..."
              className="w-full rounded-xl border border-yellow-500/20 bg-black/60 px-4 py-3 text-sm text-slate-100 outline-none focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/20"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={`mt-1 inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
              canSubmit
                ? "bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-200 text-black shadow-[0_0_24px_rgba(250,204,21,0.35)] hover:brightness-110"
                : "cursor-not-allowed bg-slate-800 text-slate-500"
            }`}
          >
            Send to WhatsApp
          </button>

          <p className="text-xs text-slate-500">
            Submitting opens WhatsApp with your details prefilled.
          </p>
        </form>
      </div>
    </section>
  );
};
