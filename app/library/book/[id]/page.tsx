"use client";

import { Header } from "@/components/Navigation/Header";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useEffect, useState } from "react";
import { libraryContract } from "@/utils/contracts";
import { USDT_ABI } from "@/utils/constants";
import { toast } from "sonner";

const GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";

const toBigInt = (value: unknown) => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && value !== "") return BigInt(value);
  return BigInt(0);
};

const toHttp = (value?: string) => {
  if (!value) return "";
  if (value.startsWith("ipfs://")) {
    return `${GATEWAY}/${value.replace("ipfs://", "").replace(/^\/+/, "")}`;
  }
  return value;
};

const isWalletAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());

const formatTxError = (error: unknown, fallback: string) =>
  (error as { shortMessage?: string; message?: string })?.shortMessage ||
  (error as { message?: string })?.message ||
  fallback;

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

type ReviewSentiment = "like" | "dislike";

type BookReview = {
  id?: number;
  book_id: string;
  reviewer_address: string;
  sentiment: ReviewSentiment;
  review_text?: string | null;
  created_at?: string;
};

type MarketplaceBook = {
  book_id: string | null;
  author_address: string;
  price: string | null;
};

const shortAddress = (value?: string | null) => {
  if (!value) return "—";
  if (value.length < 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const getTupleField = (value: unknown, index: number) => {
  if (Array.isArray(value)) return value[index];
  return undefined;
};

const formatUsdtDisplay = (raw: string) => {
  const value = raw.trim();
  if (!value || value === "--") return "--";
  if (!/^-?\d+(\.\d+)?$/.test(value)) return value;

  const isNegative = value.startsWith("-");
  const unsigned = isNegative ? value.slice(1) : value;
  const [intRaw, fracRaw = ""] = unsigned.split(".");
  const intNormalized = (intRaw || "0").replace(/^0+(?=\d)/, "");
  const groupedInt = (intNormalized || "0").replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ","
  );

  const sixDecimals = `${fracRaw}000000`.slice(0, 6);
  let frac = sixDecimals.replace(/0+$/, "");
  if (frac.length < 2) frac = (frac + "00").slice(0, 2);

  return `${isNegative ? "-" : ""}${groupedInt}.${frac}`;
};

export default function LibraryBookPage() {
  const params = useParams();
  const bookId = Number(params?.id ?? 0);
  const hasValidBookId = Number.isFinite(bookId) && bookId > 0;
  const bookIdBigInt = hasValidBookId ? BigInt(bookId) : BigInt(0);
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [giftTo, setGiftTo] = useState("");
  const [voteAmount, setVoteAmount] = useState("");
  const [voteAuthorAmount, setVoteAuthorAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [metadata, setMetadata] = useState<any | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<BookReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewSentiment, setReviewSentiment] = useState<ReviewSentiment>("like");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [dbBook, setDbBook] = useState<MarketplaceBook | null>(null);
  const [dbBookLoading, setDbBookLoading] = useState(true);
  const [approvingUsdt, setApprovingUsdt] = useState(false);
  const [approvingRico, setApprovingRico] = useState(false);

  const { data: book, refetch: refetchBook, isLoading: bookLoading } = useReadContract({
    ...libraryContract,
    functionName: "getBook",
    args: [bookIdBigInt],
    query: { enabled: hasValidBookId },
  });

  const { data: bookUri, refetch: refetchBookUri, isLoading: bookUriLoading } = useReadContract({
    ...libraryContract,
    functionName: "uri",
    args: [bookIdBigInt],
    query: { enabled: hasValidBookId },
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
    args: address && hasValidBookId ? [address, bookIdBigInt] : undefined,
    query: { enabled: Boolean(address && hasValidBookId) },
  });

  const { data: hasAccess, refetch: refetchHasAccess } = useReadContract({
    ...libraryContract,
    functionName: "hasAccess",
    args: address && hasValidBookId ? [address, bookIdBigInt] : undefined,
    query: { enabled: Boolean(address && hasValidBookId) },
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
      refetchHasAccess(),
    ]);
  };

  const bookPriceWei = toBigInt(
    (book as any)?.price ?? getTupleField(book, 0) ?? BigInt(0)
  );
  const dbPriceWei =
    dbBook?.price && /^\d+$/.test(dbBook.price) ? BigInt(dbBook.price) : BigInt(0);
  const effectivePriceWei = bookPriceWei > BigInt(0) ? bookPriceWei : dbPriceWei;
  const onChainPrice = book ? formatUnits(bookPriceWei, 18) : "--";
  const dbPrice =
    dbBook?.price && /^\d+$/.test(dbBook.price)
      ? formatUnits(BigInt(dbBook.price), 18)
      : null;
  const price =
    book && bookPriceWei > BigInt(0)
      ? onChainPrice
      : dbPrice || onChainPrice;
  const formattedPrice = price === "--" ? "--" : formatUsdtDisplay(price);
  const author =
    ((book as any)?.author as string | undefined) ||
    (getTupleField(book, 1) as string | undefined) ||
    null;
  const resolvedAuthor =
    author && author !== "0x0000000000000000000000000000000000000000"
      ? author
      : dbBook?.author_address || null;
  const onChainUpVotes = String(
    (book as any)?.upVotes ?? getTupleField(book, 2) ?? "--"
  );
  const onChainDownVotes = String(
    (book as any)?.downVotes ?? getTupleField(book, 3) ?? "--"
  );
  const onChainTotalSales = String(
    (book as any)?.totalSales ?? getTupleField(book, 8) ?? "--"
  );
  const isOwnedByBalance =
    typeof userBalance === "bigint" && userBalance > BigInt(0);
  const isOwnedByAccess = hasAccess === true;
  const isOwned = isOwnedByBalance || isOwnedByAccess;
  const hasPriceData = effectivePriceWei > BigInt(0);
  const needsUsdtApproval = Boolean(
    typeof usdtAllowance === "bigint" &&
      usdtAllowance < effectivePriceWei &&
      effectivePriceWei > BigInt(0)
  );
  const needsRicoApproval = Boolean(
    typeof buyFeeRico === "bigint" &&
      typeof ricoAllowance === "bigint" &&
      ricoAllowance < buyFeeRico
  );
  const usdtApprovalStatus: "ready" | "required" | "loading" | "unknown" =
    !hasPriceData
      ? "unknown"
      : typeof usdtAllowance !== "bigint"
      ? "loading"
      : usdtAllowance >= effectivePriceWei
      ? "ready"
      : "required";
  const ricoApprovalStatus: "ready" | "required" | "loading" | "unknown" =
    typeof buyFeeRico !== "bigint" || buyFeeRico <= BigInt(0)
      ? "unknown"
      : typeof ricoAllowance !== "bigint"
      ? "loading"
      : ricoAllowance >= buyFeeRico
      ? "ready"
      : "required";
  const likesCount = reviews.filter((review) => review.sentiment === "like").length;
  const dislikesCount = reviews.filter((review) => review.sentiment === "dislike").length;
  const isInitialLoading = hasValidBookId && (bookLoading || bookUriLoading || dbBookLoading);
  const canBuyNow =
    Boolean(address) &&
    !isSubmitting &&
    !needsUsdtApproval &&
    !needsRicoApproval &&
    !isOwned &&
    hasPriceData;

  useEffect(() => {
    if (!bookId || !Number.isFinite(bookId)) return;
    let isActive = true;
    setDbBookLoading(true);

    fetch(`/api/marketplace/books?bookId=${bookId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload: { books?: MarketplaceBook[] }) => {
        if (!isActive) return;
        setDbBook(payload.books?.[0] || null);
      })
      .catch(() => {
        if (!isActive) return;
        setDbBook(null);
      })
      .finally(() => {
        if (!isActive) return;
        setDbBookLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [bookId]);

  useEffect(() => {
    const uriValue = typeof bookUri === "string" ? bookUri : "";
    const cid = getFolderCid(uriValue);
    if (!cid) return;

    const metadataUri = `${GATEWAY}/${cid}/metadata.json`;

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

  const fetchReviews = async () => {
    if (!bookId) return;
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/marketplace/books/${bookId}/reviews`, {
        cache: "no-store",
      });
      const payload = (await res.json()) as {
        reviews?: BookReview[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload.error || "Failed to load reviews.");
      }
      setReviews(payload.reviews || []);
    } catch (error) {
      toast.error(formatTxError(error, "Failed to load reviews"));
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [bookId]);

  const folderCid = getFolderCid(typeof bookUri === "string" ? bookUri : "");
  const metadataUrl = folderCid ? `${GATEWAY}/${folderCid}/metadata.json` : "";
  const coverUrl = toHttp(metadata?.image) || (folderCid ? `${GATEWAY}/${folderCid}/thumbnail.jpg` : "");

  const approveToken = async (
    token: "usdt" | "rico",
    tokenAddress?: string,
    amount?: bigint
  ) => {
    if (!tokenAddress || !publicClient) {
      toast.error("Token contract is not available right now.");
      return;
    }
    if (!amount || amount <= BigInt(0)) {
      toast.error("Unable to resolve amount for approval.");
      return;
    }
    const toastId = token === "usdt" ? "library-book-approve-usdt" : "library-book-approve-rico";
    token === "usdt" ? setApprovingUsdt(true) : setApprovingRico(true);
    try {
      toast.loading("Approval submitted...", { id: toastId });
      const hash = await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: USDT_ABI,
        functionName: "approve",
        args: [libraryContract.address, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      await Promise.all([refetchUsdtAllowance(), refetchRicoAllowance()]);
      toast.success("Approval confirmed", { id: toastId });
    } catch (error) {
      toast.error(formatTxError(error, "Approval failed"), { id: toastId });
    } finally {
      token === "usdt" ? setApprovingUsdt(false) : setApprovingRico(false);
    }
  };

  const handleBuy = async () => {
    if (!bookId || !publicClient) return;
    setIsSubmitting(true);
    try {
      const hash = await writeContractAsync({
        ...libraryContract,
        functionName: "buyBook",
        args: [bookIdBigInt],
      });
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      toast.success("Book purchased");
    } catch (error) {
      toast.error(formatTxError(error, "Purchase failed"));
    } finally {
      setIsSubmitting(false);
      await refetchAll();
    }
  };

  const handleGift = async () => {
    if (!bookId || !giftTo || !publicClient) return;
    if (!isWalletAddress(giftTo)) {
      toast.error("Enter a valid recipient wallet address.");
      return;
    }
    setIsSubmitting(true);
    try {
      const hash = await writeContractAsync({
        ...libraryContract,
        functionName: "giftBook",
        args: [giftTo as `0x${string}`, bookIdBigInt],
      });
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      toast.success("Book gifted");
      setGiftTo("");
    } catch (error) {
      toast.error(formatTxError(error, "Gift failed"));
    } finally {
      setIsSubmitting(false);
      await refetchAll();
    }
  };

  const handleVoteBook = async (like: boolean) => {
    if (!bookId || !voteAmount) return;
    if (!address || !isOwned) {
      toast.error("Only users who bought this book can vote.");
      return;
    }
    setIsSubmitting(true);
    try {
      const hash = await writeContractAsync({
        ...libraryContract,
        functionName: "voteBook",
        args: [bookIdBigInt, like, parseUnits(voteAmount, 18)],
      });
      await publicClient?.waitForTransactionReceipt({ hash, confirmations: 1 });
      toast.success("Vote submitted");
      setVoteAmount("");
    } catch (error) {
      toast.error(formatTxError(error, "Vote failed"));
    } finally {
      setIsSubmitting(false);
      await refetchAll();
    }
  };

  const handleVoteAuthor = async (like: boolean) => {
    if (!author || !voteAuthorAmount) return;
    if (!address || !isOwned) {
      toast.error("Only users who bought this book can vote.");
      return;
    }
    setIsSubmitting(true);
    try {
      const hash = await writeContractAsync({
        ...libraryContract,
        functionName: "voteAuthor",
        args: [author as `0x${string}`, like, parseUnits(voteAuthorAmount, 18)],
      });
      await publicClient?.waitForTransactionReceipt({ hash, confirmations: 1 });
      toast.success("Author vote submitted");
      setVoteAuthorAmount("");
    } catch (error) {
      toast.error(formatTxError(error, "Vote failed"));
    } finally {
      setIsSubmitting(false);
      await refetchAll();
    }
  };

  const handleSubmitReview = async () => {
    if (!address) {
      toast.error("Connect wallet to submit a review.");
      return;
    }
    if (!isOwned) {
      toast.error("Only users who bought this book can review it.");
      return;
    }
    if (!bookId) return;

    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/marketplace/books/${bookId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          sentiment: reviewSentiment,
          reviewText,
        }),
      });
      const payload = (await res.json()) as {
        status?: string;
        reviews?: BookReview[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload.error || "Failed to submit review.");
      }
      setReviews(payload.reviews || []);
      setReviewText("");
      toast.success("Review submitted.");
    } catch (error) {
      toast.error(formatTxError(error, "Failed to submit review"));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (!hasValidBookId) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.08),transparent_42%),#020617] px-4 py-10">
          <div className="mx-auto max-w-4xl rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
            Invalid book id.
          </div>
        </div>
      </>
    );
  }

  if (isInitialLoading) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.08),transparent_42%),#020617] px-4 py-10">
          <div className="mx-auto max-w-5xl space-y-4">
            <div className="h-6 w-40 animate-pulse rounded bg-slate-800" />
            <div className="rounded-3xl border border-yellow-500/20 bg-slate-950/70 p-8">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="space-y-3">
                  <div className="h-10 w-3/4 animate-pulse rounded bg-slate-800" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-slate-800" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800" />
                </div>
                <div className="aspect-[4/5] animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60" />
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <div className="h-11 animate-pulse rounded-xl bg-slate-800" />
                <div className="h-11 animate-pulse rounded-xl bg-slate-800" />
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
              Loading book data, pricing, and access permissions...
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.08),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.08),transparent_30%),#020617] px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/library"
              className="text-sm text-yellow-300/80 hover:text-yellow-200"
            >
              ← Back to Library
            </Link>
            <button
              type="button"
              onClick={async () => {
                await Promise.all([refetchAll(), fetchReviews()]);
              }}
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:bg-slate-800/70"
            >
              Refresh Data
            </button>
          </div>

          <section className="rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-black via-[#0b0b0b] to-[#070707] p-8 shadow-[0_0_40px_rgba(0,0,0,0.85)]">
            <p className="text-xs uppercase tracking-[0.32em] text-yellow-300/70">
              Book Detail
            </p>
            <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-50">
                  {metadata?.title || metadata?.name || `Book #${bookId || "--"}`}
                </h1>
                <p className="mt-3 text-sm md:text-base text-slate-300/80">
                  {metadata?.description ||
                    "Metadata is pulled from IPFS once the book is published."}
                </p>
                <div className="mt-4 text-xs text-slate-400">
                  <span className="text-yellow-200/80">Author:</span>{" "}
                  {shortAddress(resolvedAuthor)}
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
                          alt={metadata?.title || metadata?.name || "Book cover"}
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
              <button className="rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 px-5 py-3 text-sm font-semibold text-black opacity-90">
                Price: {formattedPrice} USDT
              </button>
              <button className="rounded-xl border border-yellow-400/40 bg-black/40 px-5 py-3 text-sm font-semibold text-yellow-200">
                {isOwned ? "Owned / Access Granted" : "Not owned"}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {isOwned ? (
                <Link
                  href={`/library/read/${bookId}`}
                  className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200"
                >
                  Open Reader
                </Link>
              ) : (
                <button
                  disabled
                  className="cursor-not-allowed rounded-xl border border-slate-700/40 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-500"
                >
                  Purchase to unlock reading
                </button>
              )}
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${
                    usdtApprovalStatus === "ready"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : usdtApprovalStatus === "required"
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                      : "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
                  }`}
                >
                  USDT Approval:{" "}
                  {usdtApprovalStatus === "ready"
                    ? "Ready"
                    : usdtApprovalStatus === "required"
                    ? "Required"
                    : usdtApprovalStatus === "loading"
                    ? "Checking"
                    : "Unavailable"}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${
                    ricoApprovalStatus === "ready"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : ricoApprovalStatus === "required"
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                      : "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
                  }`}
                >
                  RICO Approval:{" "}
                  {ricoApprovalStatus === "ready"
                    ? "Ready"
                    : ricoApprovalStatus === "required"
                    ? "Required"
                    : ricoApprovalStatus === "loading"
                    ? "Checking"
                    : "Unavailable"}
                </span>
              </div>
              <button
                onClick={() => approveToken("usdt", usdtAddress as string, effectivePriceWei)}
                disabled={!needsUsdtApproval || approvingUsdt}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  needsUsdtApproval && !approvingUsdt
                    ? "bg-slate-900/70 border border-yellow-400/40 text-yellow-200"
                    : "bg-slate-900/40 border border-slate-700/40 text-slate-500 cursor-not-allowed"
                }`}
              >
                {approvingUsdt ? "Approving USDT..." : "Approve USDT"}
              </button>
              <button
                onClick={() => approveToken("rico", ricoAddress as string, buyFeeRico as bigint)}
                disabled={!needsRicoApproval || approvingRico}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  needsRicoApproval && !approvingRico
                    ? "bg-slate-900/70 border border-yellow-400/40 text-yellow-200"
                    : "bg-slate-900/40 border border-slate-700/40 text-slate-500 cursor-not-allowed"
                }`}
              >
                {approvingRico ? "Approving RICO..." : "Approve RICO"}
              </button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">USDT Required</p>
                <p className="mt-1 text-sm text-slate-100">
                  {hasPriceData ? formatUsdtDisplay(formatUnits(effectivePriceWei, 18)) : "--"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">USDT Allowance</p>
                <p className="mt-1 text-sm text-slate-100">
                  {typeof usdtAllowance === "bigint" ? formatUsdtDisplay(formatUnits(usdtAllowance, 18)) : "--"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">RICO Fee</p>
                <p className="mt-1 text-sm text-slate-100">
                  {typeof buyFeeRico === "bigint" ? formatUsdtDisplay(formatUnits(buyFeeRico, 18)) : "--"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">RICO Allowance</p>
                <p className="mt-1 text-sm text-slate-100">
                  {typeof ricoAllowance === "bigint" ? formatUsdtDisplay(formatUnits(ricoAllowance, 18)) : "--"}
                </p>
              </div>
            </div>
            {!hasPriceData && (
              <p className="mt-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
                Price data is still syncing. Please refresh in a few seconds.
              </p>
            )}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                onClick={handleBuy}
                disabled={!canBuyNow}
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
                  disabled={
                    !address ||
                    isSubmitting ||
                    needsUsdtApproval ||
                    needsRicoApproval ||
                    !hasPriceData
                  }
                  className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2.5 text-sm font-semibold text-yellow-200 disabled:opacity-50"
                >
                  Gift
                </button>
              </div>
            </div>
            {!address && (
              <p className="mt-3 text-xs text-yellow-200/90">
                Connect your wallet to buy, gift, and read this book.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
            <h3 className="text-lg font-semibold text-slate-50">Book Metadata</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  On-chain Book ID
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  #{bookId}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Author (On-chain)
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {shortAddress(resolvedAuthor)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Author (Metadata)
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {metadata?.author
                    ? shortAddress(String(metadata.author))
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Price (USDT)
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {formattedPrice}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Total Sales
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {onChainTotalSales}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  On-chain Likes
                </p>
                <p className="mt-2 text-sm font-semibold text-emerald-300">
                  {onChainUpVotes}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  On-chain Dislikes
                </p>
                <p className="mt-2 text-sm font-semibold text-rose-300">
                  {onChainDownVotes}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-50">
                Community Reviews & Reactions
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                  {likesCount} Likes
                </span>
                <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-rose-200">
                  {dislikesCount} Dislikes
                </span>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-300">
                  {reviews.length} Reviews
                </span>
              </div>
            </div>

            {!isOwned && (
              <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-200">
                You can view all reviews and reaction totals. Buy this book to submit your own review, like, or dislike.
              </div>
            )}

            {isOwned && (
              <>
                <div className="mt-4 rounded-xl border border-slate-800 bg-black/40 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Submit your review
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewSentiment("like")}
                      disabled={isSubmittingReview}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        reviewSentiment === "like"
                          ? "border border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                          : "border border-slate-700 bg-slate-900/50 text-slate-300"
                      } disabled:opacity-50`}
                    >
                      👍 Like
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewSentiment("dislike")}
                      disabled={isSubmittingReview}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        reviewSentiment === "dislike"
                          ? "border border-rose-400/50 bg-rose-500/15 text-rose-200"
                          : "border border-slate-700 bg-slate-900/50 text-slate-300"
                      } disabled:opacity-50`}
                    >
                      👎 Dislike
                    </button>
                  </div>
                  <textarea
                    className="mt-3 min-h-28 w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-3 text-sm text-slate-200"
                    placeholder="Write a short review (optional)..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    disabled={isSubmittingReview}
                  />
                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview}
                    className="mt-3 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                  >
                    {isSubmittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      On-chain vote on book
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        className="flex-1 rounded-xl border border-slate-700 bg-black/60 px-3 py-2 text-sm text-slate-200"
                        placeholder={`RICO amount (min ${minVoteRico ? formatUnits(minVoteRico as bigint, 18) : "0"})`}
                        value={voteAmount}
                        onChange={(e) => setVoteAmount(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <button
                        onClick={() => handleVoteBook(true)}
                        disabled={isSubmitting}
                        className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 disabled:opacity-50"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleVoteBook(false)}
                        disabled={isSubmitting}
                        className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 disabled:opacity-50"
                      >
                        👎
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      On-chain vote on author
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        className="flex-1 rounded-xl border border-slate-700 bg-black/60 px-3 py-2 text-sm text-slate-200"
                        placeholder="RICO amount"
                        value={voteAuthorAmount}
                        onChange={(e) => setVoteAuthorAmount(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <button
                        onClick={() => handleVoteAuthor(true)}
                        disabled={isSubmitting || !author}
                        className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 disabled:opacity-50"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleVoteAuthor(false)}
                        disabled={isSubmitting || !author}
                        className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 disabled:opacity-50"
                      >
                        👎
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Recent reviews
              </p>
              {reviewsLoading ? (
                <div className="mt-3 rounded-xl border border-slate-800 bg-black/40 p-4 text-sm text-slate-400">
                  Loading reviews...
                </div>
              ) : reviews.length === 0 ? (
                <div className="mt-3 rounded-xl border border-slate-800 bg-black/40 p-4 text-sm text-slate-400">
                  No reviews yet.
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {reviews.map((review) => (
                    <div
                      key={`${review.id || review.reviewer_address}-${review.created_at || ""}`}
                      className="rounded-xl border border-slate-800 bg-black/40 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-400">
                          {shortAddress(review.reviewer_address)}
                        </p>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                            review.sentiment === "like"
                              ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                              : "border border-rose-500/40 bg-rose-500/10 text-rose-200"
                          }`}
                        >
                          {review.sentiment}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-200">
                        {review.review_text || "No written comment."}
                      </p>
                      {review.created_at && (
                        <p className="mt-2 text-xs text-slate-500">
                          {new Date(review.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
