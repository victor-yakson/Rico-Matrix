"use client";

import { Header } from "@/components/Navigation/Header";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import type { Book } from "@/types/library";

export default function LibraryPage() {
  const { address } = useAccount();
  const [hasReadyBook, setHasReadyBook] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkReadyBooks = async () => {
      if (!address) {
        if (isMounted) setHasReadyBook(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/books?authorWallet=${encodeURIComponent(address)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;

        const payload = (await res.json()) as { books?: Book[] };
        const books = payload.books ?? [];
        const ready = books.some(
          (book) =>
            book.status === "approved" &&
            book.processStage === "ready_for_listing"
        );
        if (isMounted) setHasReadyBook(ready);
      } catch {
        if (isMounted) setHasReadyBook(false);
      }
    };

    checkReadyBooks();
    const timer = setInterval(checkReadyBooks, 10000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [address]);

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-3">
              RICO Library
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-50 mb-4">
              AI‑moderated book marketplace
            </h1>
            <p className="text-sm md:text-base text-slate-400">
              Submit your book for AI verification. Approved titles can be
              listed on-chain for direct sales to readers.
            </p>
          </div>

          {hasReadyBook && (
            <div className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/90">
                Book Ready For Listing
              </p>
              <p className="mt-2 text-sm text-emerald-100/90">
                You have an approved book ready for on-chain listing.
              </p>
              <Link
                href="/library/upload"
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 px-5 py-2.5 text-sm font-semibold text-black"
              >
                Go to Listing Flow
              </Link>
            </div>
          )}

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-6 shadow-[0_0_28px_rgba(0,0,0,0.8)]">
              <h3 className="text-xl font-semibold text-slate-50 mb-2">
                Upload a book
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Run AI checks for piracy and duplicates before going on-chain.
              </p>
              <Link
                href="/library/upload"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_0_24px_rgba(250,204,21,0.35)]"
              >
                Submit for review
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-6 shadow-[0_0_28px_rgba(0,0,0,0.8)]">
              <h3 className="text-xl font-semibold text-slate-50 mb-2">
                Manage your books
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Track approval status and list approved books on-chain.
              </p>
              <Link
                href="/library/my-books"
                className="inline-flex items-center justify-center rounded-xl border border-yellow-400/40 bg-yellow-500/10 px-5 py-2.5 text-sm font-semibold text-yellow-200"
              >
                View my books
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
