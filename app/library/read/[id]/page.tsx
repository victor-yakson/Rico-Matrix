"use client";

import { Header } from "@/components/Navigation/Header";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("LibraryReadPage");
  const copy = {
    invalidBookId: t("invalidBookId"),
    backToBook: t("backToBook"),
    readerMode: t("readerMode"),
    loadingMetadata: t("loadingMetadata"),
    secureSession: t("secureSession"),
    connectWallet: t("connectWallet"),
    checkingAccess: t("checkingAccess"),
    accessDenied: t("accessDenied"),
    goToPurchase: t("goToPurchase"),
  };

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
        <div className="theme-shell theme-page-shell min-h-[calc(100vh-4rem)]">
          <div className="theme-container py-10">
            <div className="theme-panel-soft max-w-4xl border-red-500/30 p-6 text-red-200">
            {copy.invalidBookId}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="theme-shell theme-page-shell min-h-[calc(100vh-4rem)]">
        <div className="theme-container max-w-6xl space-y-5 py-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/library/book/${bookId}`}
              className="theme-button-ghost px-4 py-2 text-xs uppercase tracking-[0.18em]"
            >
              {copy.backToBook}
            </Link>
          </div>

          <section className="theme-panel p-6 md:p-8">
            <div className="mb-4">
              <p className="theme-kicker">
                {copy.readerMode}
              </p>
              <h1 className="theme-title mt-2 text-3xl font-semibold md:text-4xl">
                {title}
              </h1>
              <p className="theme-copy mt-2 text-sm">
                {metadataLoading
                  ? copy.loadingMetadata
                  : metadata?.description || copy.secureSession}
              </p>
            </div>

            {!address && (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                {copy.connectWallet}
              </div>
            )}

            {address && accessLoading && (
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-200">
                {copy.checkingAccess}
              </div>
            )}

            {address && !accessLoading && hasAccess !== true && (
              <div className="theme-panel-soft border-red-500/30 p-4 text-sm text-red-200">
                {copy.accessDenied}
                <div className="mt-3">
                  <Link
                    href={`/library/book/${bookId}`}
                    className="theme-button-secondary text-xs uppercase tracking-[0.18em]"
                  >
                    {copy.goToPurchase}
                  </Link>
                </div>
              </div>
            )}

            {address && hasAccess === true && readerUrl && (
              <div className="overflow-hidden rounded-2xl border border-yellow-500/20 bg-black/60 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
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
