"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Navigation/Header";

export default function AuthorsPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  if (!isConnected) {
    router.replace("/");
    return null;
  }

  return (
    <div className="page">
      <Header />
      <div className="mx-auto max-w-6xl px-6 py-16 text-slate-50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-yellow-200">
              Coming Soon
            </span>
            <h1 className="mt-4 text-4xl font-semibold text-white">
              Author Studio
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-300">
              A premium workspace for authors to publish chapters, set pricing,
              and sell directly to readers on the RICO Matrix library
              marketplace.
            </p>
          </div>
          <Link
            href="/"
            className="hidden rounded-full border border-yellow-400/30 px-4 py-2 text-xs uppercase tracking-[0.2em] text-yellow-200 hover:border-yellow-300 hover:text-yellow-100 md:inline-flex"
          >
            Back to Home
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-black via-zinc-900 to-black p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
            <h2 className="text-xl font-semibold text-white">
              Publish Your Book
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              This form will let authors upload covers, add chapter metadata,
              price chapters, and go live on the marketplace.
            </p>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-slate-500">
                Book Title (Coming Soon)
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-slate-500">
                Author Name (Coming Soon)
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-slate-500">
                Short Description (Coming Soon)
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-slate-500">
                Chapter Price (USDT) (Coming Soon)
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-slate-500">
                Upload Cover & Chapter Assets (Coming Soon)
              </div>
            </div>

            <button
              disabled
              className="mt-6 w-full rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-200 opacity-60"
            >
              Author Studio Launching Soon
            </button>
          </div>

          <div className="rounded-3xl border border-yellow-500/20 bg-black/70 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
            <h3 className="text-lg font-semibold text-white">
              Marketplace Preview
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              A curated shelf of featured books will appear here once authors
              publish their first chapters.
            </p>

            <div className="mt-6 grid gap-4">
              {["3D Book Cover", "Reader Dashboard", "Mobile Reading Flow"].map(
                (label) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-4"
                  >
                    <div className="h-32 rounded-xl border border-yellow-400/20 bg-[radial-gradient(circle_at_top,_rgba(241,210,133,0.25),_transparent_70%)]" />
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {label} Placeholder
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-3xl border border-white/10 bg-black/60 p-8">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Own Your Chapters",
                body: "Each chapter is a digital asset you own forever, with transparent royalties on-chain.",
              },
              {
                title: "Earn from Readers",
                body: "Set chapter prices and earn directly from readers through the X3 + X6 matrix engine.",
              },
              {
                title: "Global Distribution",
                body: "Reach readers worldwide with wallet-to-wallet payments and automated royalty splits.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-yellow-500/10 bg-black/70 p-5"
              >
                <h4 className="text-base font-semibold text-white">
                  {item.title}
                </h4>
                <p className="mt-2 text-sm text-slate-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 text-center text-xs uppercase tracking-[0.25em] text-slate-500">
          Author Studio · Coming Soon
        </div>
      </div>
    </div>
  );
}
