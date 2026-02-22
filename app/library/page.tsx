"use client";

import { Header } from "@/components/Navigation/Header";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { libraryContract } from "@/utils/contracts";

const CONTRACT_ADDRESS = libraryContract.address;
const ADMIN_WALLET = "0x8Becab28d1601AcC853c2C9A67ef4e806e4D9Ae9";

const toBigInt = (value: unknown) => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && value !== "") return BigInt(value);
  return BigInt(0);
};

const toHttp = (value?: string) => {
  if (!value) return "";
  if (value.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${value.replace("ipfs://", "")}`;
  }
  return value;
};

export default function LibraryLandingPage() {
  const { address } = useAccount();
  const isAdmin =
    address?.toLowerCase() === ADMIN_WALLET.toLowerCase();

  const { data: topData, refetch: refetchTop } = useReadContract({
    ...libraryContract,
    functionName: "getTopSellingBooks",
  });

  const { data: nextBookId } = useReadContract({
    ...libraryContract,
    functionName: "nextBookId",
  });

  const totalBooks = nextBookId ? Number(nextBookId) - 1 : 0;
  const pageSize = 6;
  const [pageIndex, setPageIndex] = useState(0);
  const startId = totalBooks > 0 ? pageIndex * pageSize + 1 : 0;
  const endId =
    totalBooks > 0 ? Math.min(totalBooks, startId + pageSize - 1) : 0;
  const pageIds =
    totalBooks > 0
      ? Array.from({ length: endId - startId + 1 }, (_, i) => startId + i)
      : [];

  const { data: pageBooks } = useReadContracts({
    contracts: pageIds.map((id) => ({
      ...libraryContract,
      functionName: "getBook",
      args: [BigInt(id)],
    })),
    query: { enabled: pageIds.length > 0 },
  });

  const { data: pageBalances } = useReadContracts({
    contracts: pageIds.map((id) => ({
      ...libraryContract,
      functionName: "balanceOf",
      args: address ? [address, BigInt(id)] : undefined,
    })),
    query: { enabled: pageIds.length > 0 && Boolean(address) },
  });

  const { data: pageUris } = useReadContracts({
    contracts: pageIds.map((id) => ({
      ...libraryContract,
      functionName: "uri",
      args: [BigInt(id)],
    })),
    query: { enabled: pageIds.length > 0 },
  });

  const topIds = (topData as any)?.[0] as bigint[] | undefined;
  const topSales = (topData as any)?.[1] as bigint[] | undefined;

  const topContracts =
    topIds?.map((id) => ({
      ...libraryContract,
      functionName: "getBook",
      args: [id],
    })) ?? [];

  const topUriContracts =
    topIds?.map((id) => ({
      ...libraryContract,
      functionName: "uri",
      args: [id],
    })) ?? [];

  const { data: topBooks, refetch: refetchBooks } = useReadContracts({
    contracts: topContracts,
    query: { enabled: Boolean(topIds && topIds.length > 0) },
  });

  const { data: topUris } = useReadContracts({
    contracts: topUriContracts,
    query: { enabled: Boolean(topIds && topIds.length > 0) },
  });

  const topBooksList = (topBooks as any[] | undefined) ?? [];
  const topUrisList = (topUris as any[] | undefined) ?? [];
  const topIdKey = (topIds ?? []).map((id) => id.toString()).join("|");

  const pageBooksList = (pageBooks as any[] | undefined) ?? [];
  const pageBalancesList = (pageBalances as any[] | undefined) ?? [];
  const pageUrisList = (pageUris as any[] | undefined) ?? [];

  const pageEntries = pageIds.map((id, index) => {
    const book = pageBooksList[index]?.result;
    const balance = pageBalancesList[index]?.result as bigint | undefined;
    const uri = pageUrisList[index]?.result as string | undefined;
    return {
      id,
      book,
      balance: typeof balance === "bigint" ? balance : BigInt(0),
      uri,
    };
  });

  const availableEntries = pageEntries.filter((entry) => {
    const book = entry.book;
    if (!book) return false;
    const price = toBigInt(book.price);
    return (
      price > BigInt(0) &&
      !book.isFrozen &&
      !book.isSuspended &&
      !book.isBlacklisted
    );
  });

  const [metadataMap, setMetadataMap] = useState<Record<number, any>>({});
  const [metadataLoading, setMetadataLoading] = useState<Record<number, boolean>>(
    {}
  );

  useEffect(() => {
    let active = true;
    const fetchMetadata = async () => {
      const updates: Record<number, any> = {};
      const loadingUpdates: Record<number, boolean> = {};

      await Promise.all(
        availableEntries.map(async (entry) => {
          const id = entry.id;
          if (Object.prototype.hasOwnProperty.call(metadataMap, id)) return;
          if (metadataLoading[id]) return;
          const fallbackCid = entry.book?.cid
            ? `ipfs://${entry.book.cid}`
            : "";
          const metadataUrl = toHttp(entry.uri || fallbackCid);
          if (!metadataUrl) return;

          loadingUpdates[id] = true;
          try {
            const res = await fetch(metadataUrl);
            const json = await res.json();
            updates[id] = json;
          } catch {
            updates[id] = null;
          }
        })
      );

      if (!active) return;
      if (Object.keys(loadingUpdates).length) {
        setMetadataLoading((prev) => ({ ...prev, ...loadingUpdates }));
      }
      if (Object.keys(updates).length) {
        setMetadataMap((prev) => ({ ...prev, ...updates }));
        setMetadataLoading((prev) => {
          const next = { ...prev };
          Object.keys(updates).forEach((key) => {
            delete next[Number(key)];
          });
          return next;
        });
      }
    };

    fetchMetadata();
    return () => {
      active = false;
    };
  }, [availableEntries, metadataMap, metadataLoading]);

  const [topMetadataMap, setTopMetadataMap] = useState<Record<number, any>>({});
  const [topMetadataLoading, setTopMetadataLoading] = useState<Record<number, boolean>>(
    {}
  );

  const topBooksCount = topBooksList.length;
  const topUrisCount = topUrisList.length;
  const topMetaCount = Object.keys(topMetadataMap).length;
  const topMetaLoadingCount = Object.keys(topMetadataLoading).length;

  useEffect(() => {
    let active = true;
    const fetchTopMetadata = async () => {
      const updates: Record<number, any> = {};
      const loadingUpdates: Record<number, boolean> = {};

      if (!topIds || !topIds.length) return;

      await Promise.all(
        topIds.map(async (id, index) => {
          const numericId = Number(id);
          if (Object.prototype.hasOwnProperty.call(topMetadataMap, numericId)) {
            return;
          }
          if (topMetadataLoading[numericId]) return;

          const book = topBooksList[index]?.result;
          const uri = topUrisList[index]?.result as string | undefined;
          const fallbackCid = book?.cid ? `ipfs://${book.cid}` : "";
          const metadataUrl = toHttp(uri || fallbackCid);
          if (!metadataUrl) return;

          loadingUpdates[numericId] = true;
          try {
            const res = await fetch(metadataUrl);
            const json = await res.json();
            updates[numericId] = json;
          } catch {
            updates[numericId] = null;
          }
        })
      );

      if (!active) return;
      if (Object.keys(loadingUpdates).length) {
        setTopMetadataLoading((prev) => ({ ...prev, ...loadingUpdates }));
      }
      if (Object.keys(updates).length) {
        setTopMetadataMap((prev) => ({ ...prev, ...updates }));
        setTopMetadataLoading((prev) => {
          const next = { ...prev };
          Object.keys(updates).forEach((key) => {
            delete next[Number(key)];
          });
          return next;
        });
      }
    };

    fetchTopMetadata();
    return () => {
      active = false;
    };
  }, [topIdKey, topBooksCount, topUrisCount, topMetaCount, topMetaLoadingCount]);

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] px-4 py-10">
        <div className="mx-auto max-w-6xl space-y-10">
          <section className="rounded-3xl border border-yellow-500/20 bg-yellow-500/5 p-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-300/70">
              Coming Soon
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-50">
              The Library is under active development
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Browsing and purchases are temporarily disabled while we finalize
              publishing and review flows.
            </p>
          </section>

          <section className="rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-black via-[#0b0b0b] to-[#070707] p-8 shadow-[0_0_40px_rgba(0,0,0,0.85)]">
            <p className="text-xs uppercase tracking-[0.32em] text-yellow-300/70">
              Rico Matrix Library
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold text-slate-50">
              Decentralized book marketplace with soulbound ownership and mirrored
              royalties.
            </h1>
            <p className="mt-4 text-sm md:text-base text-slate-300/80 max-w-3xl">
              Readers buy or gift books, authors list and update titles, and the
              community earns on-chain rewards. Each purchase distributes USDT
              across author, pool, and platform wallets while burning RICO.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs text-yellow-200">
                Contract: {CONTRACT_ADDRESS}
              </span>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs text-cyan-200">
                USDT + RICO fees enforced
              </span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 px-5 py-3 text-sm font-semibold text-black opacity-60 cursor-not-allowed">
                List & Publish Your Book (coming soon)
              </span>
              <span className="rounded-xl border border-yellow-400/40 bg-black/40 px-5 py-3 text-sm font-semibold text-yellow-200 opacity-60 cursor-not-allowed">
                View Book Page (coming soon)
              </span>
              {isAdmin && (
                <span className="rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-3 text-sm text-slate-200 opacity-60 cursor-not-allowed">
                  Admin Console (coming soon)
                </span>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-50">
                  How to list your book
                </h3>
                <p className="text-sm text-slate-400">
                  Authors publish in three clear steps, tracked on-chain.
                </p>
              </div>
              <span className="rounded-xl border border-yellow-400/40 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-yellow-200 opacity-60 cursor-not-allowed">
                Start listing (coming soon)
              </span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "1. Accept terms + register",
                  body: "Confirm the author terms, register your wallet, and set a payout address.",
                },
                {
                  title: "2. Upload your assets",
                  body: "Upload cover + book files, then pin metadata to IPFS to get the CID.",
                },
                {
                  title: "3. Submit for review",
                  body: "Provide title, price, and CID. Admins call listBook() and publish.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-yellow-500/10 bg-black/60 p-5"
                >
                  <h4 className="text-sm font-semibold text-white">
                    {item.title}
                  </h4>
                  <p className="mt-2 text-sm text-slate-400">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-50">
                  All books
                </h3>
                <p className="text-sm text-slate-400">
                  {totalBooks > 0
                    ? `Showing ${startId}-${endId} of ${totalBooks}`
                    : "No books listed yet."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                  disabled={pageIndex === 0}
                  className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() =>
                    setPageIndex((prev) =>
                      endId < totalBooks ? prev + 1 : prev
                    )
                  }
                  disabled={endId >= totalBooks}
                  className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableEntries.length > 0
                ? availableEntries.map((entry) => {
                    const { id, book, balance } = entry;
                    const metadata = metadataMap[id];
                    const coverUrl = toHttp(metadata?.image);
                    const price = book?.price
                      ? formatUnits(toBigInt(book.price), 18)
                      : "0";
                    const isOwned = balance > BigInt(0);
                    return (
                      <div
                        key={`book-${id}`}
                        className="rounded-2xl border border-slate-800 bg-black/60 p-5 hover:border-yellow-400/30 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="h-20 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-yellow-400/20 bg-black/40">
                            {coverUrl ? (
                              <img
                                src={coverUrl}
                                alt={metadata?.name ?? `Book #${id}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] uppercase text-slate-500">
                                Cover
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs uppercase tracking-[0.24em] text-yellow-300/60">
                              Book #{id}
                            </p>
                            <h4 className="mt-1 text-lg font-semibold text-slate-100">
                              {metadata?.name || (book?.cid ? "CID linked" : "CID pending")}
                            </h4>
                            {metadataLoading[id] && (
                              <p className="mt-1 text-xs text-slate-500">
                                Loading metadata...
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">
                          Price: {price} USDT
                        </p>
                        <p className="text-xs text-slate-500 mt-2 truncate">
                          Author: {book?.author ?? "--"}
                        </p>
                        <div className="mt-4 flex items-center gap-2">
                          <Link
                            href={`/library/book/${id}`}
                            className="rounded-xl border border-yellow-400/40 bg-black/50 px-4 py-2 text-xs font-semibold text-yellow-200 hover:bg-yellow-400/10"
                          >
                            {isOwned ? "View book" : "Buy book"}
                          </Link>
                          {isOwned && (
                            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                              Owned
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                : Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="rounded-2xl border border-slate-800 bg-black/60 p-5 text-sm text-slate-500"
                    >
                      No books yet.
                    </div>
                  ))}
            </div>
          </section>

          <section className="rounded-3xl border border-yellow-500/10 bg-black/70 p-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-50">
                  Top selling books
                </h3>
                <p className="text-sm text-slate-400">
                  Live leaderboard pulled from the contract.
                </p>
              </div>
              <button
                onClick={() => {
                  refetchTop();
                  refetchBooks();
                }}
                className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 hover:border-yellow-400/40"
              >
                Refresh
              </button>
              <Link
                href="/library/book/1"
                className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 hover:border-yellow-400/40"
              >
                View book template
              </Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(topIds && topIds.length > 0
                ? topIds.map((id, index) => {
                    const book = topBooksList[index]?.result;
                    const sales = topSales?.[index];
                    const price = book?.price
                      ? formatUnits(toBigInt(book.price), 18)
                      : "0";
                    const numericId = Number(id);
                    const metadata = topMetadataMap[numericId];
                    const coverUrl = toHttp(metadata?.image);
                    return (
                      <Link
                        key={`top-${id?.toString() ?? "0"}-${index}`}
                        href={`/library/book/${id?.toString() ?? "1"}`}
                        className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 hover:border-yellow-400/30 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="h-20 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-yellow-400/20 bg-black/40">
                            {coverUrl ? (
                              <img
                                src={coverUrl}
                                alt={metadata?.name ?? `Book #${id?.toString() ?? "--"}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] uppercase text-slate-500">
                                Cover
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs uppercase tracking-[0.24em] text-yellow-300/60">
                              Top #{index + 1}
                            </p>
                            <h4 className="mt-1 text-lg font-semibold text-slate-100">
                              {metadata?.name || `Book #${id?.toString() ?? "--"}`}
                            </h4>
                            {topMetadataLoading[numericId] && (
                              <p className="mt-1 text-xs text-slate-500">
                                Loading metadata...
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">
                          Price: {price} USDT
                        </p>
                        <p className="text-sm text-slate-400">
                          Sales: {sales?.toString() ?? "0"}
                        </p>
                        <p className="text-xs text-slate-500 mt-2 truncate">
                          CID: {book?.cid ?? "—"}
                        </p>
                      </Link>
                    );
                  })
                : Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`top-${index}`}
                      className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
                    >
                      <p className="text-xs uppercase tracking-[0.24em] text-yellow-300/60">
                        Placeholder
                      </p>
                      <h4 className="mt-2 text-lg font-semibold text-slate-100">
                        Top Book #{index + 1}
                      </h4>
                      <p className="mt-2 text-sm text-slate-400">
                        Sales, author, and CID details will appear here.
                      </p>
                    </div>
                  )))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
