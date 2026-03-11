"use client";

import { Header } from "@/components/Navigation/Header";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { libraryContract } from "@/utils/contracts";

const GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";

const getFolderCid = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return "";
  if (normalized.startsWith("ipfs://")) {
    return normalized.replace("ipfs://", "").replace(/^\/+/, "").split("/")[0];
  }
  const match = normalized.match(/\/ipfs\/([^/?#]+)/i);
  if (match?.[1]) return match[1];
  return normalized.split("/")[0];
};

type Metadata = {
  title?: string;
  name?: string;
  description?: string;
  image?: string;
};

export default function LibraryReaderPage() {
  const params = useParams();
  const { address } = useAccount();

  const rawId = Number(params?.id ?? 0);
  const hasValidBookId = Number.isFinite(rawId) && rawId > 0;
  const bookId = hasValidBookId ? rawId : 0;
  const bookIdBigInt = hasValidBookId ? BigInt(bookId) : BigInt(0);

  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);

  const { data: hasAccess, isLoading: accessLoading } = useReadContract({
    ...libraryContract,
    functionName: "hasAccess",
    args: address && hasValidBookId ? [address, bookIdBigInt] : undefined,
    query: { enabled: Boolean(address && hasValidBookId) },
  });

  const { data: bookUri } = useReadContract({
    ...libraryContract,
    functionName: "uri",
    args: [bookIdBigInt],
    query: { enabled: hasValidBookId },
  });

  const folderCid = getFolderCid(typeof bookUri === "string" ? bookUri : "");
  const readerUrl =
    address && hasValidBookId
      ? `/api/fetch-book?bookId=${bookId}&walletAddress=${encodeURIComponent(address)}`
      : "";
  const metadataUrl = folderCid ? `${GATEWAY}/${folderCid}/metadata.json` : "";

  useEffect(() => {
    if (!metadataUrl) {
      setMetadata(null);
      return;
    }

    let active = true;
    setMetadataLoading(true);
    fetch(metadataUrl, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload: Metadata) => {
        if (!active) return;
        setMetadata(payload);
      })
      .catch(() => {
        if (!active) return;
        setMetadata(null);
      })
      .finally(() => {
        if (!active) return;
        setMetadataLoading(false);
      });

    return () => {
      active = false;
    };
  }, [metadataUrl]);

  const title = useMemo(
    () => metadata?.title || metadata?.name || `Book #${bookId || "--"}`,
    [metadata, bookId]
  );

  if (!hasValidBookId) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.08),transparent_42%),#020617] px-4 py-10">
          <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            Invalid book id.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.08),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.1),transparent_30%),#020617] px-4 py-10">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/library/book/${bookId}`}
              className="text-sm text-yellow-300/80 hover:text-yellow-200"
            >
              ← Back to Book Details
            </Link>
          </div>

          <section className="rounded-3xl border border-yellow-500/20 bg-slate-950/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.28em] text-yellow-300/70">
                Reader Mode
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-50 md:text-4xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-slate-300/80">
                {metadataLoading
                  ? "Loading metadata..."
                  : metadata?.description || "Secure reading session for this purchased title."}
              </p>
            </div>

            {!address && (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                Connect your wallet to validate access and read this book.
              </div>
            )}

            {address && accessLoading && (
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-200">
                Checking on-chain access...
              </div>
            )}

            {address && !accessLoading && hasAccess !== true && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                Access denied. Buy this book first to unlock the reader.
                <div className="mt-3">
                  <Link
                    href={`/library/book/${bookId}`}
                    className="inline-flex rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-200"
                  >
                    Go To Purchase
                  </Link>
                </div>
              </div>
            )}

            {address && hasAccess === true && readerUrl && (
              <div className="overflow-hidden rounded-2xl border border-sky-500/30 bg-black/60">
                <iframe
                  src={readerUrl}
                  className="h-[78vh] w-full"
                  title={`Reader for Book ${bookId}`}
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
