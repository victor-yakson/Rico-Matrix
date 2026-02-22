"use client";

import { Header } from "@/components/Navigation/Header";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useAccount,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useEffect, useState } from "react";
import { libraryContract } from "@/utils/contracts";
import { USDT_ABI } from "@/utils/constants";
import { toast } from "sonner";

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

export default function LibraryBookPage() {
  const params = useParams();
  const bookId = Number(params?.id ?? 0);
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [giftTo, setGiftTo] = useState("");
  const [voteAmount, setVoteAmount] = useState("");
  const [voteAuthorAmount, setVoteAuthorAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [metadata, setMetadata] = useState<any | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const { data: book, refetch: refetchBook } = useReadContract({
    ...libraryContract,
    functionName: "getBook",
    args: [BigInt(bookId)],
    query: { enabled: bookId > 0 },
  });

  const { data: bookUri, refetch: refetchBookUri } = useReadContract({
    ...libraryContract,
    functionName: "uri",
    args: [BigInt(bookId)],
    query: { enabled: bookId > 0 },
  });

  const { data: usdtAddress, refetch: refetchUsdtAddress } = useReadContract({
    ...libraryContract,
    functionName: "usdt",
  });
  const { data: ricoAddress, refetch: refetchRicoAddress } = useReadContract({
    ...libraryContract,
    functionName: "rico",
  });
  const { data: buyFeeRico, refetch: refetchBuyFeeRico } = useReadContract({
    ...libraryContract,
    functionName: "buyFeeRico",
  });
  const { data: minVoteRico, refetch: refetchMinVoteRico } = useReadContract({
    ...libraryContract,
    functionName: "minVoteRico",
  });

  const { data: usdtAllowance, refetch: refetchUsdtAllowance } = useReadContract({
    address: usdtAddress as `0x${string}` | undefined,
    abi: USDT_ABI,
    functionName: "allowance",
    args: address && usdtAddress ? [address, libraryContract.address] : undefined,
    query: { enabled: Boolean(address && usdtAddress) },
  });

  const { data: ricoAllowance, refetch: refetchRicoAllowance } = useReadContract({
    address: ricoAddress as `0x${string}` | undefined,
    abi: USDT_ABI,
    functionName: "allowance",
    args: address && ricoAddress ? [address, libraryContract.address] : undefined,
    query: { enabled: Boolean(address && ricoAddress) },
  });

  const { data: userBalance, refetch: refetchUserBalance } = useReadContract({
    ...libraryContract,
    functionName: "balanceOf",
    args: address && bookId ? [address, BigInt(bookId)] : undefined,
    query: { enabled: Boolean(address && bookId) },
  });

  const refetchAll = async () => {
    await Promise.all([
      refetchBook(),
      refetchBookUri(),
      refetchUsdtAddress(),
      refetchRicoAddress(),
      refetchBuyFeeRico(),
      refetchMinVoteRico(),
      refetchUsdtAllowance(),
      refetchRicoAllowance(),
      refetchUserBalance(),
    ]);
  };

  const price = book ? formatUnits(toBigInt((book as any).price), 18) : "0";
  const author = book ? (book as any).author : null;
  const isOwned =
    typeof userBalance === "bigint" && userBalance > BigInt(0);
  const needsUsdtApproval =
    typeof usdtAllowance === "bigint" &&
    book &&
    usdtAllowance < toBigInt((book as any).price);
  const needsRicoApproval =
    typeof buyFeeRico === "bigint" &&
    typeof ricoAllowance === "bigint" &&
    ricoAllowance < buyFeeRico;

  useEffect(() => {
    const uriValue = typeof bookUri === "string" ? bookUri : "";
    const fallbackCid = (book as any)?.cid
      ? `ipfs://${(book as any).cid}`
      : "";
    const metadataUri = toHttp(uriValue || fallbackCid);
    if (!metadataUri) return;

    let isActive = true;
    setMetadataLoading(true);
    setMetadataError(null);
    fetch(metadataUri)
      .then((res) => res.json())
      .then((data) => {
        if (!isActive) return;
        setMetadata(data);
      })
      .catch(() => {
        if (!isActive) return;
        setMetadataError("Unable to load metadata.");
      })
      .finally(() => {
        if (!isActive) return;
        setMetadataLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [bookUri, book]);

  const metadataUrl = toHttp(
    (typeof bookUri === "string" ? bookUri : "") ||
      ((book as any)?.cid ? `ipfs://${(book as any).cid}` : "")
  );
  const coverUrl = toHttp(metadata?.image);
  const downloadUrl = toHttp(
    metadata?.file ||
      metadata?.book ||
      metadata?.animation_url ||
      metadata?.external_url
  );

  const approveToken = async (tokenAddress?: string, amount?: bigint) => {
    if (!tokenAddress || !amount) return;
    const toastId = "library-book-approve";
    try {
      toast.loading("Approval submitted...", { id: toastId });
      await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: USDT_ABI,
        functionName: "approve",
        args: [libraryContract.address, amount],
      });
      toast.success("Approval confirmed", { id: toastId });
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Approval failed", {
        id: toastId,
      });
    }
  };

  const handleBuy = async () => {
    if (!bookId) return;
    setIsSubmitting(true);
    try {
      await writeContractAsync({
        ...libraryContract,
        functionName: "buyBook",
        args: [BigInt(bookId)],
      });
      toast.success("Book purchased");
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Purchase failed");
    } finally {
      setIsSubmitting(false);
      refetchAll();
    }
  };

  const handleGift = async () => {
    if (!bookId || !giftTo) return;
    setIsSubmitting(true);
    try {
      await writeContractAsync({
        ...libraryContract,
        functionName: "giftBook",
        args: [giftTo as `0x${string}`, BigInt(bookId)],
      });
      toast.success("Book gifted");
      setGiftTo("");
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Gift failed");
    } finally {
      setIsSubmitting(false);
      refetchAll();
    }
  };

  const handleVoteBook = async (like: boolean) => {
    if (!bookId || !voteAmount) return;
    setIsSubmitting(true);
    try {
      await writeContractAsync({
        ...libraryContract,
        functionName: "voteBook",
        args: [BigInt(bookId), like, parseUnits(voteAmount, 18)],
      });
      toast.success("Vote submitted");
      setVoteAmount("");
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Vote failed");
    } finally {
      setIsSubmitting(false);
      refetchAll();
    }
  };

  const handleVoteAuthor = async (like: boolean) => {
    if (!author || !voteAuthorAmount) return;
    setIsSubmitting(true);
    try {
      await writeContractAsync({
        ...libraryContract,
        functionName: "voteAuthor",
        args: [author as `0x${string}`, like, parseUnits(voteAuthorAmount, 18)],
      });
      toast.success("Author vote submitted");
      setVoteAuthorAmount("");
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Vote failed");
    } finally {
      setIsSubmitting(false);
      refetchAll();
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <Link
            href="/library"
            className="text-sm text-yellow-300/80 hover:text-yellow-200"
          >
            ← Back to Library
          </Link>

          <section className="rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-black via-[#0b0b0b] to-[#070707] p-8 shadow-[0_0_40px_rgba(0,0,0,0.85)]">
            <p className="text-xs uppercase tracking-[0.32em] text-yellow-300/70">
              Book Detail
            </p>
            <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-50">
                  {metadata?.name || `Book #${bookId || "--"}`}
                </h1>
                <p className="mt-3 text-sm md:text-base text-slate-300/80">
                  {metadata?.description ||
                    "Metadata is pulled from IPFS once the book is published."}
                </p>
                <div className="mt-4 text-xs text-slate-400">
                  <span className="text-yellow-200/80">Author:</span>{" "}
                  {author ?? "—"}
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  <span className="text-yellow-200/80">Metadata URI:</span>{" "}
                  {metadataUrl ? (
                    <a
                      href={metadataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-yellow-200 hover:text-yellow-100 underline"
                    >
                      View metadata
                    </a>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-yellow-400/20 bg-black/60 p-4">
                <div className="aspect-[4/5] w-full overflow-hidden rounded-xl border border-yellow-400/20 bg-black/40 flex items-center justify-center text-xs text-slate-500">
                  {metadataLoading
                    ? "Loading cover..."
                    : coverUrl
                      ? (
                        <img
                          src={coverUrl}
                          alt={metadata?.name ?? "Book cover"}
                          className="h-full w-full object-cover"
                        />
                      )
                      : "Cover preview"}
                </div>
                {metadataError && (
                  <p className="mt-3 text-xs text-rose-300">
                    {metadataError}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 px-5 py-3 text-sm font-semibold text-black opacity-60 cursor-not-allowed">
                Price: {price} USDT
              </button>
              <button className="rounded-xl border border-yellow-400/40 bg-black/40 px-5 py-3 text-sm font-semibold text-yellow-200 opacity-60 cursor-not-allowed">
                {isOwned ? "Owned" : "Not owned"}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                disabled={!isOwned || !downloadUrl}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  isOwned && downloadUrl
                    ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-200"
                    : "bg-slate-900/40 border border-slate-700/40 text-slate-500 cursor-not-allowed"
                }`}
              >
                {isOwned ? "Download unlocked" : "Purchase to unlock download"}
              </button>
              {isOwned && downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200"
                >
                  Download book
                </a>
              )}
              <span className="text-xs text-slate-500">
                Downloads are gated by on-chain ownership.
              </span>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <button
                onClick={() =>
                  approveToken(usdtAddress as string, toBigInt((book as any)?.price))
                }
                disabled={!needsUsdtApproval}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  needsUsdtApproval
                    ? "bg-slate-900/70 border border-yellow-400/40 text-yellow-200"
                    : "bg-slate-900/40 border border-slate-700/40 text-slate-500 cursor-not-allowed"
                }`}
              >
                Approve USDT
              </button>
              <button
                onClick={() => approveToken(ricoAddress as string, buyFeeRico as bigint)}
                disabled={!needsRicoApproval}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  needsRicoApproval
                    ? "bg-slate-900/70 border border-yellow-400/40 text-yellow-200"
                    : "bg-slate-900/40 border border-slate-700/40 text-slate-500 cursor-not-allowed"
                }`}
              >
                Approve RICO
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                onClick={handleBuy}
                disabled={
                  isSubmitting ||
                  needsUsdtApproval ||
                  needsRicoApproval ||
                  isOwned
                }
                className="rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : isOwned ? "Owned" : "Buy book"}
              </button>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                  placeholder="Gift to address"
                  value={giftTo}
                  onChange={(e) => setGiftTo(e.target.value)}
                />
                <button
                  onClick={handleGift}
                  disabled={isSubmitting || needsUsdtApproval || needsRicoApproval}
                  className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2.5 text-sm font-semibold text-yellow-200 disabled:opacity-50"
                >
                  Gift
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
            <h3 className="text-lg font-semibold text-slate-50">Book stats</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Total sales
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-100">
                  {book ? String((book as any).totalSales) : "--"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Upvotes
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-100">
                  {book ? String((book as any).upVotes) : "--"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Downvotes
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-100">
                  {book ? String((book as any).downVotes) : "--"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Vote on book
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-slate-700 bg-black/60 px-3 py-2 text-sm text-slate-200"
                    placeholder={`RICO amount (min ${minVoteRico ? formatUnits(minVoteRico as bigint, 18) : "0"})`}
                    value={voteAmount}
                    onChange={(e) => setVoteAmount(e.target.value)}
                  />
                  <button
                    onClick={() => handleVoteBook(true)}
                    disabled={isSubmitting}
                    className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
                  >
                    👍
                  </button>
                  <button
                    onClick={() => handleVoteBook(false)}
                    disabled={isSubmitting}
                    className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
                  >
                    👎
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Vote on author
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-slate-700 bg-black/60 px-3 py-2 text-sm text-slate-200"
                    placeholder="RICO amount"
                    value={voteAuthorAmount}
                    onChange={(e) => setVoteAuthorAmount(e.target.value)}
                  />
                  <button
                    onClick={() => handleVoteAuthor(true)}
                    disabled={isSubmitting || !author}
                    className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
                  >
                    👍
                  </button>
                  <button
                    onClick={() => handleVoteAuthor(false)}
                    disabled={isSubmitting || !author}
                    className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
                  >
                    👎
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
