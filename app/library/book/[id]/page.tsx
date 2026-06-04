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
import { useLocale, useTranslations } from "next-intl";
import { libraryContract } from "@/utils/contracts";
import { USDT_ABI } from "@/utils/constants";
import { toast } from "sonner";
import { useQuantuMatrix } from "@/hooks/useQuantuMatrix";
import {
  canBuyLibraryBook,
  getHighestUnlockedChapter,
  MIN_LIBRARY_BUY_CHAPTER,
} from "@/lib/libraryEligibility";

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
  const locale = useLocale();
  const t = useTranslations("LibraryBookDetailPage");
  const copy = { invalidBookId: t("invalidBookId"), loadingState: t("loadingState"), backToLibrary: t("backToLibrary"), refreshData: t("refreshData"), detail: t("detail"), metadataFallback: t("metadataFallback"), author: t("author"), loadingCover: t("loadingCover"), coverPreview: t("coverPreview"), bookCover: t("bookCover"), priceBadge: t("priceBadge"), owned: t("owned"), notOwned: t("notOwned"), openReader: t("openReader"), purchaseToUnlock: t("purchaseToUnlock"), approvalReady: t("approvalReady"), approvalRequired: t("approvalRequired"), approvalChecking: t("approvalChecking"), approvalUnavailable: t("approvalUnavailable"), approveUsdt: t("approveUsdt"), approvingUsdt: t("approvingUsdt"), approveRico: t("approveRico"), approvingRico: t("approvingRico"), usdtRequired: t("usdtRequired"), usdtAllowance: t("usdtAllowance"), ricoFee: t("ricoFee"), ricoAllowance: t("ricoAllowance"), priceSyncing: t("priceSyncing"), processing: t("processing"), buyBook: t("buyBook"), giftTo: t("giftTo"), gift: t("gift"), connectWallet: t("connectWallet"), bookMetadata: t("bookMetadata"), onChainBookId: t("onChainBookId"), authorOnChain: t("authorOnChain"), authorMetadata: t("authorMetadata"), priceUsdt: t("priceUsdt"), totalSales: t("totalSales"), onChainLikes: t("onChainLikes"), onChainDislikes: t("onChainDislikes"), reviewsTitle: t("reviewsTitle"), likes: t("likes"), dislikes: t("dislikes"), reviews: t("reviews"), reviewGate: t("reviewGate"), submitReview: t("submitReview"), like: t("like"), dislike: t("dislike"), reviewPlaceholder: t("reviewPlaceholder"), submitReviewButton: t("submitReviewButton"), submitting: t("submitting"), voteOnBook: t("voteOnBook"), voteOnAuthor: t("voteOnAuthor"), ricoAmount: t("ricoAmount"), recentReviews: t("recentReviews"), loadingReviews: t("loadingReviews"), noReviews: t("noReviews"), noWrittenComment: t("noWrittenComment"), chapterOneRequired: t.raw("chapterOneRequired") as string, unlockChapterAccess: t("unlockChapterAccess") };
  const params = useParams();
  const bookId = Number(params?.id ?? 0);
  const hasValidBookId = Number.isFinite(bookId) && bookId > 0;
  const bookIdBigInt = hasValidBookId ? BigInt(bookId) : BigInt(0);
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { userData } = useQuantuMatrix();

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
    canBuyLibraryBook(userData?.track1Unlocked, userData?.track2Unlocked) &&
    !needsUsdtApproval &&
    !needsRicoApproval &&
    !isOwned &&
    hasPriceData;
  const highestUnlockedChapter = getHighestUnlockedChapter(
    userData?.track1Unlocked,
    userData?.track2Unlocked
  );
  const canBuyFromLibrary = canBuyLibraryBook(
    userData?.track1Unlocked,
    userData?.track2Unlocked
  );

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
        setMetadataError(locale === "fr" ? "Impossible de charger les metadonnees." : "Unable to load metadata.");
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
        throw new Error(payload.error || (locale === "fr" ? "Impossible de charger les avis." : "Failed to load reviews."));
      }
      setReviews(payload.reviews || []);
    } catch (error) {
      toast.error(formatTxError(error, locale === "fr" ? "Impossible de charger les avis" : "Failed to load reviews"));
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
      toast.error(locale === "fr" ? "Le contrat du token est indisponible pour le moment." : "Token contract is not available right now.");
      return;
    }
    if (!amount || amount <= BigInt(0)) {
      toast.error(locale === "fr" ? "Impossible de determiner le montant pour l'approbation." : "Unable to resolve amount for approval.");
      return;
    }
    const toastId = token === "usdt" ? "library-book-approve-usdt" : "library-book-approve-rico";
    token === "usdt" ? setApprovingUsdt(true) : setApprovingRico(true);
    try {
      toast.loading(locale === "fr" ? "Approbation soumise..." : "Approval submitted...", { id: toastId });
      const hash = await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: USDT_ABI,
        functionName: "approve",
        args: [libraryContract.address, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      await Promise.all([refetchUsdtAllowance(), refetchRicoAllowance()]);
      toast.success(locale === "fr" ? "Approbation confirmee" : "Approval confirmed", { id: toastId });
    } catch (error) {
      toast.error(formatTxError(error, locale === "fr" ? "Echec de l'approbation" : "Approval failed"), { id: toastId });
    } finally {
      token === "usdt" ? setApprovingUsdt(false) : setApprovingRico(false);
    }
  };

  const handleBuy = async () => {
    if (!bookId || !publicClient) return;
    if (!canBuyFromLibrary) {
      toast.error(
        copy.chapterOneRequired.replace(
          "{currentChapter}",
          String(highestUnlockedChapter)
        )
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const hash = await writeContractAsync({
        ...libraryContract,
        functionName: "buyBook",
        args: [bookIdBigInt],
      });
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      toast.success(locale === "fr" ? "Livre achete" : "Book purchased");
    } catch (error) {
      toast.error(formatTxError(error, locale === "fr" ? "Echec de l'achat" : "Purchase failed"));
    } finally {
      setIsSubmitting(false);
      await refetchAll();
    }
  };

  const handleGift = async () => {
    if (!bookId || !giftTo || !publicClient) return;
    if (!canBuyFromLibrary) {
      toast.error(
        copy.chapterOneRequired.replace(
          "{currentChapter}",
          String(highestUnlockedChapter)
        )
      );
      return;
    }
    if (!isWalletAddress(giftTo)) {
      toast.error(locale === "fr" ? "Entrez une adresse wallet destinataire valide." : "Enter a valid recipient wallet address.");
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
      toast.success(locale === "fr" ? "Livre offert" : "Book gifted");
      setGiftTo("");
    } catch (error) {
      toast.error(formatTxError(error, locale === "fr" ? "Echec de l'envoi" : "Gift failed"));
    } finally {
      setIsSubmitting(false);
      await refetchAll();
    }
  };

  const handleVoteBook = async (like: boolean) => {
    if (!bookId || !voteAmount) return;
    if (!address || !isOwned) {
      toast.error(locale === "fr" ? "Seuls les acheteurs de ce livre peuvent voter." : "Only users who bought this book can vote.");
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
      toast.success(locale === "fr" ? "Vote soumis" : "Vote submitted");
      setVoteAmount("");
    } catch (error) {
      toast.error(formatTxError(error, locale === "fr" ? "Echec du vote" : "Vote failed"));
    } finally {
      setIsSubmitting(false);
      await refetchAll();
    }
  };

  const handleVoteAuthor = async (like: boolean) => {
    if (!author || !voteAuthorAmount) return;
    if (!address || !isOwned) {
      toast.error(locale === "fr" ? "Seuls les acheteurs de ce livre peuvent voter." : "Only users who bought this book can vote.");
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
      toast.success(locale === "fr" ? "Vote auteur soumis" : "Author vote submitted");
      setVoteAuthorAmount("");
    } catch (error) {
      toast.error(formatTxError(error, locale === "fr" ? "Echec du vote" : "Vote failed"));
    } finally {
      setIsSubmitting(false);
      await refetchAll();
    }
  };

  const handleSubmitReview = async () => {
    if (!address) {
      toast.error(locale === "fr" ? "Connectez votre wallet pour soumettre un avis." : "Connect wallet to submit a review.");
      return;
    }
    if (!isOwned) {
      toast.error(locale === "fr" ? "Seuls les acheteurs de ce livre peuvent laisser un avis." : "Only users who bought this book can review it.");
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
        throw new Error(payload.error || (locale === "fr" ? "Impossible d'envoyer l'avis." : "Failed to submit review."));
      }
      setReviews(payload.reviews || []);
      setReviewText("");
      toast.success(locale === "fr" ? "Avis soumis." : "Review submitted.");
    } catch (error) {
      toast.error(formatTxError(error, locale === "fr" ? "Impossible d'envoyer l'avis" : "Failed to submit review"));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (!hasValidBookId) {
    return (
      <>
        <Header />
        <div className="theme-shell theme-page-shell min-h-[calc(100vh-4rem)]">
          <div className="theme-container py-10">
            <div className="theme-panel-soft max-w-4xl border-rose-500/30 p-6 text-rose-200">
              {copy.invalidBookId}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (isInitialLoading) {
    return (
      <>
        <Header />
        <div className="theme-shell theme-page-shell min-h-[calc(100vh-4rem)]">
          <div className="theme-container max-w-5xl space-y-4 py-10">
            <div className="h-6 w-40 animate-pulse rounded bg-slate-800" />
            <div className="theme-panel p-8">
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
            <div className="theme-panel-soft p-4 text-sm text-slate-300">
              {copy.loadingState}
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
        <div className="theme-container max-w-5xl space-y-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/library"
              className="theme-button-ghost text-xs uppercase tracking-[0.18em]"
            >
              {copy.backToLibrary}
            </Link>
            <button
              type="button"
              onClick={async () => {
                await Promise.all([refetchAll(), fetchReviews()]);
              }}
              className="theme-button-ghost text-xs uppercase tracking-[0.18em]"
            >
              {copy.refreshData}
            </button>
          </div>

          <section className="theme-panel p-8">
            <p className="theme-kicker">{copy.detail}</p>
            <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div>
                <h1 className="theme-title text-3xl font-semibold md:text-4xl">
                  <span className="theme-title-accent">
                    {metadata?.title || metadata?.name || `Book #${bookId || "--"}`}
                  </span>
                </h1>
                <p className="theme-copy mt-3 text-sm md:text-base">
                  {metadata?.description ||
                    copy.metadataFallback}
                </p>
                <div className="mt-4 text-xs text-slate-400">
                  <span className="text-yellow-200/80">{copy.author}:</span>{" "}
                  {shortAddress(resolvedAuthor)}
                </div>
              </div>
              <div className="rounded-2xl border border-yellow-400/20 bg-black/60 p-4">
                <div className="aspect-[4/5] w-full overflow-hidden rounded-xl border border-yellow-400/20 bg-black/40 flex items-center justify-center text-xs text-slate-500">
                  {metadataLoading
                    ? copy.loadingCover
                    : coverUrl
                      ? (
                        <img
                          src={coverUrl}
                          alt={metadata?.title || metadata?.name || copy.bookCover}
                          className="h-full w-full object-cover"
                        />
                      )
                      : copy.coverPreview}
                </div>
                {metadataError && (
                  <p className="mt-3 text-xs text-rose-300">
                    {metadataError}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="theme-button-primary px-5 py-3 text-sm">
                {copy.priceBadge}: {formattedPrice} USDT
              </div>
              <div className="theme-button-secondary px-5 py-3 text-sm">
                {isOwned ? copy.owned : copy.notOwned}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {isOwned ? (
                <Link
                  href={`/library/read/${bookId}`}
                  className="theme-button-secondary px-4 py-2 text-sm"
                >
                  {copy.openReader}
                </Link>
              ) : (
                <button
                  disabled
                  className="cursor-not-allowed rounded-xl border border-slate-700/40 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-500"
                >
                  {copy.purchaseToUnlock}
                </button>
              )}
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${
                    usdtApprovalStatus === "ready"
                      ? "border-yellow-400/35 bg-yellow-500/10 text-yellow-200"
                      : usdtApprovalStatus === "required"
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                      : "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
                  }`}
                >
                  USDT Approval:{" "}
                  {usdtApprovalStatus === "ready"
                    ? copy.approvalReady
                    : usdtApprovalStatus === "required"
                    ? copy.approvalRequired
                    : usdtApprovalStatus === "loading"
                    ? copy.approvalChecking
                    : copy.approvalUnavailable}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${
                    ricoApprovalStatus === "ready"
                      ? "border-yellow-400/35 bg-yellow-500/10 text-yellow-200"
                      : ricoApprovalStatus === "required"
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                      : "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
                  }`}
                >
                  RICO Approval:{" "}
                  {ricoApprovalStatus === "ready"
                    ? copy.approvalReady
                    : ricoApprovalStatus === "required"
                    ? copy.approvalRequired
                    : ricoApprovalStatus === "loading"
                    ? copy.approvalChecking
                    : copy.approvalUnavailable}
                </span>
              </div>
              <button
                onClick={() => approveToken("usdt", usdtAddress as string, effectivePriceWei)}
                disabled={!canBuyFromLibrary || !needsUsdtApproval || approvingUsdt}
                className={`px-4 py-2 text-sm ${
                  needsUsdtApproval && !approvingUsdt
                    ? "theme-button-secondary"
                    : "theme-button-ghost cursor-not-allowed text-slate-500"
                }`}
              >
                {approvingUsdt ? copy.approvingUsdt : copy.approveUsdt}
              </button>
              <button
                onClick={() => approveToken("rico", ricoAddress as string, buyFeeRico as bigint)}
                disabled={!canBuyFromLibrary || !needsRicoApproval || approvingRico}
                className={`px-4 py-2 text-sm ${
                  needsRicoApproval && !approvingRico
                    ? "theme-button-secondary"
                    : "theme-button-ghost cursor-not-allowed text-slate-500"
                }`}
              >
                {approvingRico ? copy.approvingRico : copy.approveRico}
              </button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{copy.usdtRequired}</p>
                <p className="mt-1 text-sm text-slate-100">
                  {hasPriceData ? formatUsdtDisplay(formatUnits(effectivePriceWei, 18)) : "--"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{copy.usdtAllowance}</p>
                <p className="mt-1 text-sm text-slate-100">
                  {typeof usdtAllowance === "bigint" ? formatUsdtDisplay(formatUnits(usdtAllowance, 18)) : "--"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{copy.ricoFee}</p>
                <p className="mt-1 text-sm text-slate-100">
                  {typeof buyFeeRico === "bigint" ? formatUsdtDisplay(formatUnits(buyFeeRico, 18)) : "--"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{copy.ricoAllowance}</p>
                <p className="mt-1 text-sm text-slate-100">
                  {typeof ricoAllowance === "bigint" ? formatUsdtDisplay(formatUnits(ricoAllowance, 18)) : "--"}
                </p>
              </div>
            </div>
            {!hasPriceData && (
              <p className="mt-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
                {copy.priceSyncing}
              </p>
            )}
            {!canBuyFromLibrary && address && (
              <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-3 text-xs text-red-100">
                <p>
                  {copy.chapterOneRequired.replace(
                    "{chapter}",
                    String(MIN_LIBRARY_BUY_CHAPTER)
                  ).replace("{currentChapter}", String(highestUnlockedChapter))}
                </p>
                <Link
                  href="/chapters"
                  className="mt-3 inline-flex rounded-lg border border-red-300/30 bg-black/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-100"
                >
                  {copy.unlockChapterAccess}
                </Link>
              </div>
            )}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                onClick={handleBuy}
                disabled={!canBuyNow}
                className="theme-button-primary disabled:opacity-50"
              >
                {isSubmitting ? copy.processing : isOwned ? copy.owned : copy.buyBook}
              </button>
              <div className="flex gap-2">
                <input
                  className="theme-input flex-1 text-sm"
                  placeholder={copy.giftTo}
                  value={giftTo}
                  onChange={(e) => setGiftTo(e.target.value)}
                />
                <button
                  onClick={handleGift}
                  disabled={
                    !address ||
                    isSubmitting ||
                    !canBuyFromLibrary ||
                    needsUsdtApproval ||
                    needsRicoApproval ||
                    !hasPriceData
                  }
                  className="theme-button-secondary disabled:opacity-50"
                >
                  {copy.gift}
                </button>
              </div>
            </div>
            {!address && (
              <p className="mt-3 text-xs text-yellow-200/90">
                {copy.connectWallet}
              </p>
            )}
          </section>

          <section className="theme-panel-soft p-6">
            <h3 className="text-lg font-semibold text-slate-50">{copy.bookMetadata}</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  {copy.onChainBookId}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  #{bookId}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  {copy.authorOnChain}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {shortAddress(resolvedAuthor)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  {copy.authorMetadata}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {metadata?.author
                    ? shortAddress(String(metadata.author))
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  {copy.priceUsdt}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {formattedPrice}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  {copy.totalSales}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {onChainTotalSales}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  {copy.onChainLikes}
                </p>
                <p className="mt-2 text-sm font-semibold text-yellow-200">
                  {onChainUpVotes}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  {copy.onChainDislikes}
                </p>
                <p className="mt-2 text-sm font-semibold text-rose-300">
                  {onChainDownVotes}
                </p>
              </div>
            </div>
          </section>

          <section className="theme-panel-soft p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-50">
                {copy.reviewsTitle}
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full border border-yellow-400/35 bg-yellow-500/10 px-3 py-1 text-yellow-200">
                  {likesCount} {copy.likes}
                </span>
                <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-rose-200">
                  {dislikesCount} {copy.dislikes}
                </span>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-300">
                  {reviews.length} {copy.reviews}
                </span>
              </div>
            </div>

            {!isOwned && (
              <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-200">
                {copy.reviewGate}
              </div>
            )}

            {isOwned && (
              <>
                <div className="mt-4 rounded-xl border border-slate-800 bg-black/40 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    {copy.submitReview}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewSentiment("like")}
                      disabled={isSubmittingReview}
                      className={`px-3 py-1.5 text-xs ${
                        reviewSentiment === "like"
                          ? "theme-button-secondary"
                          : "theme-button-ghost text-slate-300"
                      } disabled:opacity-50`}
                    >
                      👍 {copy.like}
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
                      👎 {copy.dislike}
                    </button>
                  </div>
                  <textarea
                    className="mt-3 min-h-28 w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-3 text-sm text-slate-200"
                    placeholder={copy.reviewPlaceholder}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    disabled={isSubmittingReview}
                  />
                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview}
                    className="theme-button-primary mt-3 disabled:opacity-50"
                  >
                    {isSubmittingReview ? copy.submitting : copy.submitReviewButton}
                  </button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {copy.voteOnBook}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        className="theme-input flex-1 min-h-0 px-3 py-2 text-sm"
                        placeholder={`${copy.ricoAmount} (min ${minVoteRico ? formatUnits(minVoteRico as bigint, 18) : "0"})`}
                        value={voteAmount}
                        onChange={(e) => setVoteAmount(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <button
                        onClick={() => handleVoteBook(true)}
                        disabled={isSubmitting}
                        className="theme-button-secondary px-3 py-2 text-sm disabled:opacity-50"
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
                      {copy.voteOnAuthor}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        className="theme-input flex-1 min-h-0 px-3 py-2 text-sm"
                        placeholder={copy.ricoAmount}
                        value={voteAuthorAmount}
                        onChange={(e) => setVoteAuthorAmount(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <button
                        onClick={() => handleVoteAuthor(true)}
                        disabled={isSubmitting || !author}
                        className="theme-button-secondary px-3 py-2 text-sm disabled:opacity-50"
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
                {copy.recentReviews}
              </p>
              {reviewsLoading ? (
                <div className="mt-3 rounded-xl border border-slate-800 bg-black/40 p-4 text-sm text-slate-400">
                  {copy.loadingReviews}
                </div>
              ) : reviews.length === 0 ? (
                <div className="mt-3 rounded-xl border border-slate-800 bg-black/40 p-4 text-sm text-slate-400">
                  {copy.noReviews}
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
                              ? "border border-yellow-400/35 bg-yellow-500/10 text-yellow-200"
                              : "border border-rose-500/40 bg-rose-500/10 text-rose-200"
                          }`}
                        >
                          {review.sentiment === "like" ? copy.like : copy.dislike}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-200">
                        {review.review_text || copy.noWrittenComment}
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
