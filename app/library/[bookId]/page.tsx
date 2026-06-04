"use client";

import { Header } from "@/components/Navigation/Header";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Book } from "@/types/library";
import Link from "next/link";
import { formatUnits, parseUnits } from "viem";
import { useLibraryListing } from "@/hooks/useLibraryListing";
import { libraryContract } from "@/utils/contracts";
import { USDT_ABI } from "@/utils/constants";
import { useQuantuMatrix } from "@/hooks/useQuantuMatrix";
import {
  canPublishLibraryBook,
  getHighestUnlockedChapter,
  MIN_LIBRARY_PUBLISH_CHAPTER,
} from "@/lib/libraryEligibility";

const GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-200 border-yellow-400/30",
  approved: "bg-amber-500/10 text-amber-100 border-amber-400/30",
  rejected: "bg-red-500/10 text-red-200 border-red-400/30",
  listing_submitted: "bg-indigo-500/10 text-indigo-200 border-indigo-400/30",
  listed: "bg-yellow-500/10 text-yellow-200 border-yellow-400/30",
};

const StatusBadge = ({ status, labels }: { status: Book["status"]; labels: Record<Book["status"], string> }) => (
  <span
    className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] ${
      statusStyles[status] || statusStyles.pending
    }`}
  >
    {labels[status] || status}
  </span>
);

const isListingReadyStage = (stage?: string) =>
  stage === "ready_for_listing" || stage === "listing_submitted";

const getListingBlockReason = (
  book: Book,
  messages: { listingSubmitted: string; onlyApproved: string; cidMissing: string; },
  wallet?: string
): string | null => {
  if (book.status === "listing_submitted") {
    return messages.listingSubmitted;
  }
  if (book.status !== "approved") {
    return messages.onlyApproved;
  }
  if (!book.ipfsCid) {
    return messages.cidMissing;
  }
  if (!isListingReadyStage(book.processStage)) {
    const processMessage = book.processMessage?.trim();
    return processMessage && processMessage.length > 0
      ? processMessage
      : `Book is not ready for listing (current stage: ${book.processStage}).`;
  }
  if (wallet && book.authorWallet.toLowerCase() !== wallet.toLowerCase()) {
    return "Connected wallet does not match the author wallet.";
  }
  return null;
};

const weiToDisplay = (value?: string | null) => {
  if (!value) return "";
  try {
    return formatUnits(BigInt(value), 18);
  } catch {
    return "";
  }
};

const displayUsdt = (value?: string | null) => {
  if (!value) return "--";
  try {
    const normalized = formatUnits(BigInt(value), 18);
    const [intPart, fracPart = ""] = normalized.split(".");
    const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const shortFrac = fracPart.slice(0, 2).padEnd(2, "0");
    return `${groupedInt}.${shortFrac}`;
  } catch {
    return "--";
  }
};

const shortAddress = (value?: string | null, start = 6, end = 4) => {
  if (!value) return "--";
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
};

const checkToneClasses = (ok: boolean | null) => {
  if (ok === true) return "border-yellow-400/35 bg-yellow-500/10 text-yellow-200";
  if (ok === false) return "border-red-400/35 bg-red-500/10 text-red-200";
  return "border-slate-600/70 bg-slate-800/60 text-slate-200";
};

type MarketplaceBookRecord = {
  id?: number;
  book_id: string | null;
  author_address: string;
  price: string | null;
  payout_wallet?: string | null;
  onchain_price?: string | null;
  last_action_type?: string | null;
  last_action_tx_hash?: string | null;
  last_update_ipfs_cid?: string | null;
  title?: string | null;
  description?: string | null;
  status?: "approved" | "listed" | "listing_submitted";
  cid: string;
  tx_hash?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ListingSyncResponse = {
  status?: "listed" | "pending_index" | "failed" | "ok";
  reason?: string;
  error?: string;
  book?: MarketplaceBookRecord;
};

type OnchainBookState = {
  bookId: string;
  priceWei: string;
  payoutWallet: string;
  isFrozen: boolean;
  isSuspended: boolean;
  isBlacklisted: boolean;
  isUnderAppeal: boolean;
  upVotes: number;
  downVotes: number;
  totalSales: string;
  cid: string;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mapMarketplaceBook = (rawBook: MarketplaceBookRecord, locale: string): Book => {
  const nowIso = new Date().toISOString();
  const id = rawBook.id ?? Number(rawBook.book_id);
  const normalizedStatus: Book["status"] =
    rawBook.status === "listed"
      ? "listed"
      : rawBook.status === "listing_submitted"
      ? "listing_submitted"
      : "approved";

  return {
    id: Number.isFinite(id) ? id : 0,
    onChainBookId: rawBook.book_id,
    title:
      rawBook.title?.trim() ||
      (rawBook.book_id ? `Book #${rawBook.book_id}` : "Untitled"),
    description:
      rawBook.description?.trim() || (locale === "fr" ? "Televerse et pret pour le listing on-chain." : "Uploaded and ready for on-chain listing."),
    authorWallet: rawBook.author_address,
    payoutWallet: rawBook.payout_wallet || rawBook.author_address,
    ipfsCid: rawBook.cid,
    priceWei: rawBook.price,
    onchainPriceWei: rawBook.onchain_price || rawBook.price,
    status: normalizedStatus,
    processStage:
      normalizedStatus === "listed"
        ? "completed"
        : normalizedStatus === "listing_submitted"
        ? "listing_submitted"
        : "ready_for_listing",
    processProgress: normalizedStatus === "listed" ? 100 : 95,
    processMessage:
      normalizedStatus === "listed"
        ? (locale === "fr" ? "Liste on-chain et synchronise." : "Listed on-chain and synced.")
        : normalizedStatus === "listing_submitted"
        ? (locale === "fr" ? "Listing soumis. En attente de confirmation de sync." : "Listing submitted. Waiting for sync confirmation.")
        : (locale === "fr" ? "Dossier IPFS televerse. Pret pour le listing on-chain." : "IPFS folder uploaded. Ready for on-chain listing."),
    similarityScore: null,
    rejectionReason: null,
    txHash: rawBook.tx_hash ?? null,
    lastActionType: rawBook.last_action_type ?? null,
    lastActionTxHash: rawBook.last_action_tx_hash ?? null,
    lastUpdateIpfsCid: rawBook.last_update_ipfs_cid ?? null,
    createdAt: rawBook.created_at ?? nowIso,
    updatedAt: rawBook.updated_at ?? rawBook.created_at ?? nowIso,
  };
};

const parseOnchainBookState = (bookId: string, raw: unknown): OnchainBookState => {
  const tuple = raw as any;
  const toBigIntLike = (value: unknown) => {
    if (typeof value === "bigint") return value;
    if (typeof value === "number" && Number.isFinite(value)) return BigInt(value);
    if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
    return BigInt(0);
  };
  const toAddress = (value: unknown) =>
    typeof value === "string" ? value : "0x0000000000000000000000000000000000000000";

  return {
    bookId,
    priceWei: toBigIntLike(tuple?.price ?? tuple?.[0]).toString(),
    payoutWallet: toAddress(tuple?.payoutWallet ?? tuple?.[6]),
    isFrozen: Boolean(tuple?.isFrozen ?? tuple?.[2]),
    isSuspended: Boolean(tuple?.isSuspended ?? tuple?.[3]),
    isBlacklisted: Boolean(tuple?.isBlacklisted ?? tuple?.[4]),
    isUnderAppeal: Boolean(tuple?.isUnderAppeal ?? tuple?.[5]),
    upVotes: Number(toBigIntLike(tuple?.upVotes ?? tuple?.[7])),
    downVotes: Number(toBigIntLike(tuple?.downVotes ?? tuple?.[8])),
    totalSales: toBigIntLike(tuple?.totalSales ?? tuple?.[10]).toString(),
    cid: typeof (tuple?.cid ?? tuple?.[9]) === "string" ? (tuple?.cid ?? tuple?.[9]) : "",
  };
};

export default function BookDetailPage() {
  const locale = useLocale();
  const tCommon = useTranslations("LibraryCommon");
  const tPage = useTranslations("LibraryWorkspacePage");
  const commonCopy = {
    status: tCommon.raw("status") as Record<Book["status"], string>,
    buttons: tCommon.raw("buttons") as Record<string, string>,
    labels: tCommon.raw("labels") as Record<string, string>,
  };
  const copy = {
    backToAuthorBooks: tPage("backToAuthorBooks"), onChainBookId: tPage("onChainBookId"), onChainShort: tPage("onChainShort"), bookOverview: tPage("bookOverview"), author: tPage("author"), price: tPage("price"), stage: tPage("stage"), updated: tPage("updated"), progress: tPage("progress"), created: tPage("created"), flowStatus: tPage("flowStatus"), flowStatusDesc: tPage("flowStatusDesc"), refresh: tPage("refresh"), failed: tPage("failed"), done: tPage("done"), pending: tPage("pending"), noActiveStatus: tPage("noActiveStatus"), rejectedByAi: tPage("rejectedByAi"), blockchainListing: tPage("blockchainListing"), blockchainListingDesc: tPage("blockchainListingDesc"), onlyApproved: tPage("onlyApproved"), listingSubmitted: tPage("listingSubmitted"), viewTx: tPage("viewTx"), copy: tPage("copy"), copyTx: tPage("copyTx"), copied: tPage("copied"), syncing: tPage("syncing"), retrySync: tPage("retrySync"), lastSyncAttempt: tPage("lastSyncAttempt"), notAttemptedYet: tPage("notAttemptedYet"), backgroundSyncNote: tPage("backgroundSyncNote"), restartPipeline: tPage("restartPipeline"), startUploadAgain: tPage("startUploadAgain"), listingReadiness: tPage("listingReadiness"), readyPercent: tPage("readyPercent"), refreshChecks: tPage("refreshChecks"), approveUsdt: tPage("approveUsdt"), approvingUsdt: tPage("approvingUsdt"), approveRico: tPage("approveRico"), approvingRico: tPage("approvingRico"), ok: tPage("ok"), fix: tPage("fix"), contentPackage: tPage("contentPackage"), ipfsReady: tPage("ipfsReady"), ipfsMissing: tPage("ipfsMissing"), cidMissing: tPage("cidMissing"), priceInput: tPage("priceInput"), payoutWallet: tPage("payoutWallet"), listing: tPage("listing"), notReadyForListing: tPage("notReadyForListing"), listOnBlockchain: tPage("listOnBlockchain"), performActions: tPage("performActions"), refreshOnChain: tPage("refreshOnChain"), refreshingOnChain: tPage("refreshingOnChain"), sales: tPage("sales"), votes: tPage("votes"), status: tPage("status"), active: tPage("active"), frozen: tPage("frozen"), suspended: tPage("suspended"), blacklisted: tPage("blacklisted"), updatePrice: tPage("updatePrice"), updatePriceDesc: tPage("updatePriceDesc"), updatePayout: tPage("updatePayout"), updatePayoutDesc: tPage("updatePayoutDesc"), update: tPage("update"), updating: tPage("updating"), submitAppeal: tPage("submitAppeal"), submitting: tPage("submitting"), appealNote: tPage("appealNote"), openPublicBookPage: tPage("openPublicBookPage"), chapterFiveRequired: tPage.raw("chapterFiveRequired") as string
  };
  const router = useRouter();
  const params = useParams();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { listBookOnChain } = useLibraryListing();
  const { userData } = useQuantuMatrix();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [payoutWallet, setPayoutWallet] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [listingError, setListingError] = useState<string | null>(null);
  const [approvingUsdt, setApprovingUsdt] = useState(false);
  const [approvingRico, setApprovingRico] = useState(false);
  const listingInProgressRef = useRef(false);
  const syncInFlightRef = useRef(false);
  const [isSyncingListing, setIsSyncingListing] = useState(false);
  const [lastSyncAttemptAt, setLastSyncAttemptAt] = useState<number | null>(
    null
  );
  const [onchain, setOnchain] = useState<OnchainBookState | null>(null);
  const [onchainLoading, setOnchainLoading] = useState(false);
  const [onchainError, setOnchainError] = useState<string | null>(null);
  const [updatePrice, setUpdatePrice] = useState("");
  const [updatePayoutWallet, setUpdatePayoutWallet] = useState("");
  const [updatingPrice, setUpdatingPrice] = useState(false);
  const [updatingPayout, setUpdatingPayout] = useState(false);
  const [appealing, setAppealing] = useState(false);
  const [copiedField, setCopiedField] = useState<
    "author" | "payout" | "tx" | null
  >(null);
  const priceTouchedRef = useRef(false);
  const payoutTouchedRef = useRef(false);
  const updatePriceTouchedRef = useRef(false);
  const updatePayoutTouchedRef = useRef(false);

  const bookId = Number(params?.bookId ?? 0);

  const copyValue = async (
    value: string | undefined | null,
    field: "author" | "payout" | "tx"
  ) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 1500);
    } catch {
      // ignore clipboard failures silently
    }
  };

  const fetchBook = async (options?: { silent?: boolean }): Promise<Book | null> => {
    if (!Number.isFinite(bookId)) return null;
    if (!options?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch(`/api/marketplace/books?recordId=${bookId}`, {
        cache: "no-store",
      });
      const payload = (await res.json()) as {
        books?: MarketplaceBookRecord[];
        error?: string;
      };
      if (!res.ok) throw new Error(payload?.error || "Failed to load book");

      const rawBook = payload.books?.[0];
      if (!rawBook) {
        throw new Error("Book not found.");
      }

      const mapped = mapMarketplaceBook(rawBook, locale);

      setBook(mapped);
      if (!priceTouchedRef.current && !submitting) {
        setPrice(weiToDisplay(mapped.priceWei));
      }
      if (!payoutTouchedRef.current && !submitting) {
        setPayoutWallet(mapped.payoutWallet || mapped.authorWallet || "");
      }
      if (!updatePriceTouchedRef.current && !updatingPrice) {
        setUpdatePrice(weiToDisplay(mapped.onchainPriceWei || mapped.priceWei));
      }
      if (!updatePayoutTouchedRef.current && !updatingPayout) {
        setUpdatePayoutWallet(mapped.payoutWallet || mapped.authorWallet || "");
      }
      return mapped;
    } catch (err: any) {
      if (!options?.silent) {
        setError(err?.message || "Failed to load book.");
      }
      return null;
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let active = true;

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      interval = setInterval(async () => {
        if (!active) return;
        if (document.visibilityState !== "visible") return;
        if (listingInProgressRef.current) return;

        const latest = await fetchBook({ silent: true });
        if (!latest) return;

        if (latest.status === "listing_submitted") {
          await syncListingState(latest.id, latest.authorWallet, { silent: true });
          return;
        }

        stopPolling();
      }, 30000);
    };

    const loadAndSync = async () => {
      const loaded = await fetchBook();
      if (!active) return;
      if (loaded?.status === "listing_submitted") {
        await syncListingState(loaded.id, loaded.authorWallet, { silent: true });
        startPolling();
      }
    };

    loadAndSync();
    return () => {
      active = false;
      stopPolling();
    };
  }, [bookId]);

  useEffect(() => {
    if (!book?.onChainBookId) return;
    if (book.status !== "listed" && book.status !== "listing_submitted") return;
    void fetchOnchainBook(book);
  }, [book?.id, book?.onChainBookId, book?.status, publicClient]);

  const { data: usdtTokenAddress } = useReadContract({
    ...libraryContract,
    functionName: "usdt",
  });

  const { data: ricoTokenAddress } = useReadContract({
    ...libraryContract,
    functionName: "rico",
  });

  const { data: appFeeUsdt } = useReadContract({
    ...libraryContract,
    functionName: "appFeeUsdt",
  });

  const { data: appFeeRico } = useReadContract({
    ...libraryContract,
    functionName: "appFeeRico",
  });

  const { data: usdtBalance, refetch: refetchUsdtBalance } = useReadContract({
    address: usdtTokenAddress as `0x${string}` | undefined,
    abi: USDT_ABI,
    functionName: "balanceOf",
    args: address && usdtTokenAddress ? [address] : undefined,
    query: { enabled: Boolean(address && usdtTokenAddress) },
  });

  const { data: ricoBalance, refetch: refetchRicoBalance } = useReadContract({
    address: ricoTokenAddress as `0x${string}` | undefined,
    abi: USDT_ABI,
    functionName: "balanceOf",
    args: address && ricoTokenAddress ? [address] : undefined,
    query: { enabled: Boolean(address && ricoTokenAddress) },
  });

  const requiredUsdt = typeof appFeeUsdt === "bigint" ? appFeeUsdt : null;
  const requiredRico = typeof appFeeRico === "bigint" ? appFeeRico : null;

  const { data: usdtAllowance, refetch: refetchUsdtAllowance } = useReadContract(
    {
      address: usdtTokenAddress as `0x${string}` | undefined,
      abi: USDT_ABI,
      functionName: "allowance",
      args:
        address && usdtTokenAddress
          ? [address, libraryContract.address]
          : undefined,
      query: { enabled: Boolean(address && usdtTokenAddress) },
    }
  );

  const { data: ricoAllowance, refetch: refetchRicoAllowance } = useReadContract(
    {
      address: ricoTokenAddress as `0x${string}` | undefined,
      abi: USDT_ABI,
      functionName: "allowance",
      args:
        address && ricoTokenAddress
          ? [address, libraryContract.address]
          : undefined,
      query: { enabled: Boolean(address && ricoTokenAddress) },
    }
  );

  const hasEnoughUsdt =
    requiredUsdt === null || typeof usdtBalance !== "bigint"
      ? null
      : usdtBalance >= requiredUsdt;
  const hasEnoughRico =
    requiredRico === null || typeof ricoBalance !== "bigint"
      ? null
      : ricoBalance >= requiredRico;

  const hasEnoughUsdtAllowance =
    requiredUsdt === null || typeof usdtAllowance !== "bigint"
      ? null
      : usdtAllowance >= requiredUsdt;
  const hasEnoughRicoAllowance =
    requiredRico === null || typeof ricoAllowance !== "bigint"
      ? null
      : ricoAllowance >= requiredRico;
  const highestUnlockedChapter = getHighestUnlockedChapter(
    userData?.track1Unlocked,
    userData?.track2Unlocked
  );
  const canPublishBooks = canPublishLibraryBook(
    userData?.track1Unlocked,
    userData?.track2Unlocked
  );

  const tokenRequirementBlockReason =
    !canPublishBooks
      ? copy.chapterFiveRequired
          .replace("{chapter}", String(MIN_LIBRARY_PUBLISH_CHAPTER))
          .replace("{currentChapter}", String(highestUnlockedChapter))
      : hasEnoughUsdt === false
      ? "Insufficient USDT for listing fee."
      : hasEnoughRico === false
      ? "Insufficient RICO for listing fee."
      : hasEnoughUsdtAllowance === false
      ? "USDT approval required for listing fee."
      : hasEnoughRicoAllowance === false
      ? "RICO approval required for listing fee."
      : null;

  const listingBlockReason = book ? getListingBlockReason(book, copy, address) : null;
  const effectiveBlockReason = listingBlockReason || tokenRequirementBlockReason;

  const listingChecks = [
    {
      key: "chapter_access",
      label: `Chapter ${MIN_LIBRARY_PUBLISH_CHAPTER} Access`,
      ok: canPublishBooks,
      detail: canPublishBooks
        ? `Eligible to publish (current chapter ${highestUnlockedChapter}).`
        : `Unlock Chapter ${MIN_LIBRARY_PUBLISH_CHAPTER} to publish. Current chapter: ${highestUnlockedChapter}.`,
    },
    {
      key: "status",
      label: "Book Approved",
      ok:
        book?.status === "approved" ||
        book?.status === "listing_submitted" ||
        book?.status === "listed",
      detail:
        book?.status === "approved"
          ? "Approved and ready."
          : book?.status === "listing_submitted"
          ? "Already submitted."
          : book?.status === "listed"
          ? "Already listed."
          : "Awaiting approval.",
    },
    {
      key: "package",
      label: "IPFS Package",
      ok: Boolean(book?.ipfsCid),
      detail: book?.ipfsCid ? "Package available." : "CID missing.",
    },
    {
      key: "wallet",
      label: "Author Wallet Match",
      ok: Boolean(address && book && address.toLowerCase() === book.authorWallet.toLowerCase()),
      detail: address
        ? address && book && address.toLowerCase() === book.authorWallet.toLowerCase()
          ? "Connected wallet verified."
          : "Switch to author wallet."
        : "Connect wallet.",
    },
    {
      key: "usdt_balance",
      label: "USDT Balance",
      ok: hasEnoughUsdt,
      detail:
        requiredUsdt === null
          ? "Loading..."
          : `Need ${formatUnits(requiredUsdt, 18)} | Have ${
              typeof usdtBalance === "bigint" ? formatUnits(usdtBalance, 18) : "..."
            }`,
    },
    {
      key: "rico_balance",
      label: "RICO Balance",
      ok: hasEnoughRico,
      detail:
        requiredRico === null
          ? "Loading..."
          : `Need ${formatUnits(requiredRico, 18)} | Have ${
              typeof ricoBalance === "bigint" ? formatUnits(ricoBalance, 18) : "..."
            }`,
    },
    {
      key: "usdt_allowance",
      label: "USDT Allowance",
      ok: hasEnoughUsdtAllowance,
      detail:
        requiredUsdt === null
          ? "Loading..."
          : `Approved ${
              typeof usdtAllowance === "bigint" ? formatUnits(usdtAllowance, 18) : "..."
            }`,
    },
    {
      key: "rico_allowance",
      label: "RICO Allowance",
      ok: hasEnoughRicoAllowance,
      detail:
        requiredRico === null
          ? "Loading..."
          : `Approved ${
              typeof ricoAllowance === "bigint" ? formatUnits(ricoAllowance, 18) : "..."
            }`,
    },
  ] as const;

  const completedChecks = listingChecks.filter((item) => item.ok === true).length;
  const listingReadiness = Math.round((completedChecks / listingChecks.length) * 100);

  const lifecycleSteps = [
    {
      label: "Moderation",
      done:
        book?.status === "approved" ||
        book?.status === "listing_submitted" ||
        book?.status === "listed",
      failed: book?.status === "rejected",
    },
    {
      label: "IPFS Package",
      done: Boolean(book?.ipfsCid),
      failed: book?.status === "pending" && book?.processStage === "ipfs_failed",
    },
    {
      label: "Listing Tx",
      done: book?.status === "listing_submitted" || book?.status === "listed",
      failed: false,
    },
    {
      label: "Marketplace Live",
      done: book?.status === "listed",
      failed: false,
    },
  ] as const;

  const applyBookFromApi = (row: MarketplaceBookRecord) => {
    const mapped = mapMarketplaceBook(row, locale);
    setBook(mapped);
    if (!priceTouchedRef.current && !submitting) {
      setPrice(weiToDisplay(mapped.priceWei));
    }
    if (!payoutTouchedRef.current && !submitting) {
      setPayoutWallet(mapped.payoutWallet || mapped.authorWallet || "");
    }
    if (!updatePriceTouchedRef.current && !updatingPrice) {
      setUpdatePrice(weiToDisplay(mapped.onchainPriceWei || mapped.priceWei));
    }
    if (!updatePayoutTouchedRef.current && !updatingPayout) {
      setUpdatePayoutWallet(mapped.payoutWallet || mapped.authorWallet || "");
    }
  };

  const syncListingState = async (
    recordId: number,
    authorWallet: string,
    options?: { silent?: boolean; force?: boolean }
  ): Promise<ListingSyncResponse | null> => {
    if (!Number.isFinite(recordId) || recordId <= 0) return null;
    if (!authorWallet) return null;
    if (!options?.force && syncInFlightRef.current) return null;

    syncInFlightRef.current = true;
    setIsSyncingListing(true);
    setLastSyncAttemptAt(Date.now());
    try {
      const res = await fetch("/api/marketplace/listing/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          authorWallet,
        }),
      });
      const payload = (await res.json()) as ListingSyncResponse;

      if (!res.ok) {
        if (!options?.silent) {
          setListingError(payload.error || "Failed to sync listing status.");
        }
        return payload;
      }

      if (payload.book) {
        applyBookFromApi(payload.book);
      }

      if (!options?.silent && payload.reason) {
        setListingError(payload.reason);
      }

      if (payload.status === "listed") {
        setListingError(null);
      }

      return payload;
    } catch (err: any) {
      if (!options?.silent) {
        setListingError(err?.message || "Failed to sync listing status.");
      }
      return null;
    } finally {
      syncInFlightRef.current = false;
      setIsSyncingListing(false);
    }
  };

  const approveToken = async (
    tokenAddress: `0x${string}` | undefined,
    amount: bigint | null,
    token: "USDT" | "RICO"
  ) => {
    if (!tokenAddress || !amount || !address || !publicClient) {
      setListingError("Wallet or token config unavailable.");
      return;
    }

    const setLoading = token === "USDT" ? setApprovingUsdt : setApprovingRico;
    setLoading(true);
    setListingError(null);
    try {
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: USDT_ABI,
        functionName: "approve",
        args: [libraryContract.address, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      await Promise.all([refetchUsdtAllowance(), refetchRicoAllowance()]);
    } catch (err: any) {
      setListingError(err?.shortMessage || err?.message || `${token} approval failed.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!listingError) return;
    if (!tokenRequirementBlockReason) {
      if (/insufficient|approval required/i.test(listingError)) {
        setListingError(null);
      }
    }
  }, [tokenRequirementBlockReason, listingError]);

  const fetchOnchainBook = async (targetBook?: Book | null) => {
    const activeBook = targetBook || book;
    if (!publicClient || !activeBook?.onChainBookId || !/^\d+$/.test(activeBook.onChainBookId)) {
      return;
    }

    setOnchainLoading(true);
    setOnchainError(null);
    try {
      const raw = await publicClient.readContract({
        ...libraryContract,
        functionName: "getBook",
        args: [BigInt(activeBook.onChainBookId)],
      });
      const parsed = parseOnchainBookState(activeBook.onChainBookId, raw);
      setOnchain(parsed);
      if (!updatePriceTouchedRef.current && !updatingPrice) {
        setUpdatePrice(weiToDisplay(parsed.priceWei));
      }
      if (!updatePayoutTouchedRef.current && !updatingPayout) {
        setUpdatePayoutWallet(parsed.payoutWallet);
      }
    } catch (err: any) {
      setOnchainError(err?.shortMessage || err?.message || "Failed to fetch on-chain state.");
    } finally {
      setOnchainLoading(false);
    }
  };

  const syncAuthorAction = async (params: {
    txHash: string;
    action: "update_price" | "update_payout" | "appeal";
    newPriceWei?: string;
    newPayoutWallet?: string;
  }) => {
    if (!book || !address) {
      throw new Error("Wallet or book context unavailable.");
    }

    const res = await fetch("/api/marketplace/author/book-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordId: book.id,
        authorWallet: address,
        txHash: params.txHash,
        action: params.action,
        newPriceWei: params.newPriceWei,
        newPayoutWallet: params.newPayoutWallet,
      }),
    });

    const payload = (await res.json()) as {
      error?: string;
      book?: MarketplaceBookRecord;
      ipfsActionCid?: string;
    };
    if (!res.ok) {
      throw new Error(payload.error || "Failed to sync author action.");
    }
    if (payload.book) {
      applyBookFromApi(payload.book);
    }
    return payload;
  };

  const handleAuthorPriceUpdate = async () => {
    if (!book?.onChainBookId || !address || !publicClient) return;
    if (!/^\d+(\.\d+)?$/.test(updatePrice)) {
      setListingError("Enter a valid new price.");
      return;
    }

    setUpdatingPrice(true);
    setListingError(null);
    try {
      const newPriceWei = parseUnits(updatePrice, 18);
      const hash = await writeContractAsync({
        ...libraryContract,
        functionName: "updateBookPrice",
        args: [BigInt(book.onChainBookId), newPriceWei],
      });
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

      const syncPayload = await syncAuthorAction({
        txHash: hash,
        action: "update_price",
        newPriceWei: newPriceWei.toString(),
      });

      await fetchBook({ silent: true });
      await fetchOnchainBook();
      setListingError(
        syncPayload.ipfsActionCid
          ? `Price updated and synced. Action log: ${syncPayload.ipfsActionCid}`
          : "Price updated and synced."
      );
      updatePriceTouchedRef.current = false;
    } catch (err: any) {
      setListingError(err?.shortMessage || err?.message || "Failed to update price.");
    } finally {
      setUpdatingPrice(false);
    }
  };

  const handleAuthorPayoutUpdate = async () => {
    if (!book?.onChainBookId || !address || !publicClient) return;
    const payout = updatePayoutWallet.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(payout)) {
      setListingError("Enter a valid payout wallet address.");
      return;
    }

    setUpdatingPayout(true);
    setListingError(null);
    try {
      const hash = await writeContractAsync({
        ...libraryContract,
        functionName: "updatePayoutWallet",
        args: [BigInt(book.onChainBookId), payout as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

      const syncPayload = await syncAuthorAction({
        txHash: hash,
        action: "update_payout",
        newPayoutWallet: payout,
      });

      await fetchBook({ silent: true });
      await fetchOnchainBook();
      setListingError(
        syncPayload.ipfsActionCid
          ? `Payout wallet updated and synced. Action log: ${syncPayload.ipfsActionCid}`
          : "Payout wallet updated and synced."
      );
      updatePayoutTouchedRef.current = false;
    } catch (err: any) {
      setListingError(
        err?.shortMessage || err?.message || "Failed to update payout wallet."
      );
    } finally {
      setUpdatingPayout(false);
    }
  };

  const handleAuthorAppeal = async () => {
    if (!book?.onChainBookId || !address || !publicClient) return;

    setAppealing(true);
    setListingError(null);
    try {
      const hash = await writeContractAsync({
        ...libraryContract,
        functionName: "appealStatus",
        args: [BigInt(book.onChainBookId)],
      });
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

      const syncPayload = await syncAuthorAction({
        txHash: hash,
        action: "appeal",
      });

      await fetchOnchainBook();
      setListingError(
        syncPayload.ipfsActionCid
          ? `Appeal submitted and synced. Action log: ${syncPayload.ipfsActionCid}`
          : "Appeal submitted and synced."
      );
    } catch (err: any) {
      setListingError(err?.shortMessage || err?.message || "Failed to submit appeal.");
    } finally {
      setAppealing(false);
    }
  };

  const handleList = async () => {
    if (!book) return;
    const blockReason = getListingBlockReason(book, copy, address);
    if (blockReason) {
      setListingError(blockReason);
      return;
    }
    if (!price || !payoutWallet) {
      setListingError("Price and payout wallet are required.");
      return;
    }
    if (tokenRequirementBlockReason) {
      setListingError(tokenRequirementBlockReason);
      return;
    }
    if (!/^\d+(\.\d+)?$/.test(price)) {
      setListingError("Enter a valid price.");
      return;
    }

    setSubmitting(true);
    listingInProgressRef.current = true;
    setListingError(null);
    try {
      const priceWei = parseUnits(price, 18);
      const cid = book.ipfsCid;
      if (!cid) {
        throw new Error("IPFS CID is missing. Restart from /library/upload.");
      }

      const txHash = await listBookOnChain({
        cid,
        priceWei,
        payoutWallet: payoutWallet as `0x${string}`,
      });

      const submitRes = await fetch("/api/marketplace/listing/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: book.id,
          authorWallet: address,
          txHash,
          priceWei: priceWei.toString(),
        }),
      });
      const submitPayload = (await submitRes.json()) as ListingSyncResponse;
      if (!submitRes.ok) {
        throw new Error(submitPayload.error || "Failed to save listing submission.");
      }

      if (submitPayload.book) {
        applyBookFromApi(submitPayload.book);
      } else {
        setBook((prev) =>
          prev
            ? {
                ...prev,
                status: "listing_submitted",
                txHash,
                processStage: "listing_submitted",
                processProgress: 95,
                processMessage: "Listing submitted. Waiting for sync confirmation.",
              }
            : prev
        );
      }

      setListingError(
        `Transaction submitted (${txHash.slice(
          0,
          10
        )}...). Syncing listing status...`
      );

      for (let attempt = 0; attempt < 8; attempt++) {
        const syncPayload = await syncListingState(
          book.id,
          address || book.authorWallet
        );
        if (syncPayload?.status === "listed" || syncPayload?.book?.status === "listed") {
          await fetchBook();
          router.push("/library/my-books");
          return;
        }
        if (syncPayload?.status === "failed") {
          await fetchBook();
          throw new Error(syncPayload.reason || "Listing transaction failed.");
        }
        await wait(3000);
      }

      await fetchBook();
      setListingError(
        "Listing submitted. Still waiting for sync. This page keeps checking automatically."
      );
    } catch (err: any) {
      setListingError(err?.message || "Listing failed.");
    } finally {
      listingInProgressRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div className="theme-shell theme-page-shell">
        <div className="theme-container px-4 sm:px-6 lg:px-8">
          <section className="theme-panel mb-6 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  <Link href="/library" className="transition hover:text-slate-200">
                    Marketplace
                  </Link>
                  <span>/</span>
                  <Link href="/library/my-books?mode=author" className="transition hover:text-slate-200">
                    My Books
                  </Link>
                  <span>/</span>
                  <span className="text-slate-200">Workspace</span>
                </div>
                <p className="theme-kicker mb-2">
                  Book Workspace
                </p>
                <h1 className="theme-title theme-title-accent text-2xl sm:text-3xl md:text-4xl">
                  {book?.title || "Loading..."}
                </h1>
                {book?.onChainBookId ? (
                  <p className="mt-2 text-sm text-slate-300/85">
                    {copy.onChainBookId}: <span className="font-semibold text-slate-100">#{book.onChainBookId}</span>
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {book && <StatusBadge status={book.status} labels={commonCopy.status} />}
                <Link
                  href="/library/my-books?mode=author"
                  className="theme-button-ghost px-3 py-1.5 text-[11px] uppercase tracking-[0.16em]"
                >
                  {copy.backToAuthorBooks}
                </Link>
              </div>
            </div>
          </section>

          {loading && (
            <div className="grid animate-pulse gap-6 lg:grid-cols-[320px_1fr]">
              <div className="theme-panel-soft aspect-[3/4]" />
              <div className="theme-panel-soft p-6">
                <div className="h-6 w-1/3 rounded bg-slate-700/70" />
                <div className="mt-3 h-4 w-full rounded bg-slate-800/70" />
                <div className="mt-2 h-4 w-5/6 rounded bg-slate-800/70" />
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="h-20 rounded-xl bg-slate-800/70" />
                  <div className="h-20 rounded-xl bg-slate-800/70" />
                  <div className="h-20 rounded-xl bg-slate-800/70" />
                  <div className="h-20 rounded-xl bg-slate-800/70" />
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
              {error}
            </div>
          )}

          {book && !loading && (
            <>
              <section className="mb-6 grid gap-6 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
                <div className="theme-panel overflow-hidden">
                  <div className="relative aspect-[3/4] bg-slate-900">
                    <img
                      src={
                        book.ipfsCid
                          ? `${GATEWAY}/${book.ipfsCid}/thumbnail.jpg`
                          : "https://placehold.co/500x700/020617/e2e8f0?text=No+Thumbnail"
                      }
                      alt={book.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(event) => {
                        (event.target as HTMLImageElement).src =
                          "https://placehold.co/500x700/020617/e2e8f0?text=Thumbnail";
                      }}
                    />
                    <div className="absolute left-3 top-3">
                      <StatusBadge status={book.status} labels={commonCopy.status} />
                    </div>
                    {book.onChainBookId ? (
                      <div className="absolute bottom-3 left-3 rounded-full border border-slate-200/30 bg-black/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-100">
                        {copy.onChainShort} #{book.onChainBookId}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="theme-panel p-5 sm:p-6 lg:p-7">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {copy.bookOverview}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-50">{book.title}</h2>
                  <p className="mt-3 text-sm text-slate-300/90">{book.description}</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="theme-card-compact transition hover:border-slate-500">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{copy.author}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-100">
                          {shortAddress(book.authorWallet)}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyValue(book.authorWallet, "author")}
                          className="rounded-md border border-slate-600 bg-slate-900/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-300 transition hover:border-slate-400 hover:text-slate-100"
                        >
                          {copiedField === "author" ? copy.copied : copy.copy}
                        </button>
                      </div>
                    </div>
                    <div className="theme-card-compact transition hover:border-slate-500">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{copy.price}</p>
                      <p className="mt-1 text-sm font-semibold text-amber-200">
                        {displayUsdt(book.priceWei)} USDT
                      </p>
                    </div>
                    <div className="theme-card-compact transition hover:border-slate-500">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{copy.stage}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">
                        {book.processStage.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="theme-card-compact transition hover:border-slate-500">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{copy.updated}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">
                        {new Date(book.updatedAt || book.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
                    <div
                      className="h-full bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400"
                      style={{
                        width: `${Math.max(0, Math.min(100, book.processProgress ?? 0))}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                    <span>{copy.progress}: {Math.max(0, Math.min(100, book.processProgress ?? 0))}%</span>
                    <span>{copy.created}: {new Date(book.createdAt).toLocaleString()}</span>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    <Link
                      href="/library"
                      className="theme-button-ghost px-3 py-2 text-center text-xs uppercase tracking-[0.16em]"
                    >
                      {commonCopy.labels.marketplace}
                    </Link>
                    <Link
                      href="/library/my-books?mode=author"
                      className="theme-button-ghost px-3 py-2 text-center text-xs uppercase tracking-[0.16em]"
                    >
                      {commonCopy.buttons.myLibrary}
                    </Link>
                    {book.status === "listed" && book.onChainBookId ? (
                      <Link
                        href={`/library/book/${book.onChainBookId}`}
                        className="rounded-lg border border-yellow-400/40 bg-yellow-500/10 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-yellow-200 transition hover:-translate-y-0.5 hover:bg-yellow-500/20"
                      >
                        {copy.openPublicBookPage}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </section>

              <div className="grid gap-6 xl:grid-cols-12">
              <div className="theme-panel p-5 md:p-6 xl:col-span-7">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {copy.flowStatus}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {copy.flowStatusDesc}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={book.status} labels={commonCopy.status} />
                    <button
                      type="button"
                      onClick={() => fetchBook({ silent: true })}
                      className="theme-button-ghost px-3 py-1.5 text-[10px] uppercase tracking-[0.16em]"
                    >
                      {copy.refresh}
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {lifecycleSteps.map((step) => (
                    <div
                      key={step.label}
                      className={`rounded-xl border px-3 py-2 text-xs ${
                        step.failed
                          ? "border-red-400/35 bg-red-500/10 text-red-200"
                          : step.done
                          ? "border-yellow-400/35 bg-yellow-500/10 text-yellow-200"
                          : "border-slate-700/70 bg-slate-900/60 text-slate-300"
                      }`}
                    >
                      <p className="font-semibold uppercase tracking-[0.16em]">{step.label}</p>
                      <p className="mt-1 text-[11px]">
                        {step.failed ? copy.failed : step.done ? copy.done : copy.pending}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 shadow-inner shadow-black/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">
                      {book.processMessage || copy.noActiveStatus}
                    </p>
                    <span className="text-xs text-slate-400">
                      {Math.max(0, Math.min(100, book.processProgress ?? 0))}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
                    <div
                      className="h-full bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400"
                      style={{
                        width: `${Math.max(0, Math.min(100, book.processProgress ?? 0))}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                    <span>{copy.stage}: {book.processStage.replace(/_/g, " ")}</span>
                    <span>
                      Updated: {new Date(book.updatedAt || book.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {book.status === "rejected" ? (
                    <p className="mt-3 text-sm text-red-200">
                      {book.rejectionReason || copy.rejectedByAi}
                    </p>
                  ) : null}

                  {book.txHash ? (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-200">
                      <a
                        href={`https://bscscan.com/tx/${book.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        Tx {shortAddress(book.txHash, 10, 8)}
                      </a>
                      <button
                        type="button"
                        onClick={() => copyValue(book.txHash || "", "tx")}
                        className="rounded-md border border-slate-600 bg-slate-900/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]"
                      >
                        {copiedField === "tx" ? copy.copied : copy.copy}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/65 p-5 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.95)] backdrop-blur-sm sm:p-6 xl:col-span-5 xl:sticky xl:top-24 xl:h-fit">
                <h3 className="mb-1 text-lg font-semibold text-slate-50">
                  {copy.blockchainListing}
                </h3>
                <p className="mb-4 text-xs text-slate-400">
                  {copy.blockchainListingDesc}
                </p>

                {book.status !== "approved" &&
                  book.status !== "listing_submitted" && (
                  <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                    {copy.onlyApproved}
                  </div>
                )}

                {book.status === "listing_submitted" && (
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-sm text-indigo-100">
                    <p>
                      {copy.listingSubmitted}
                    </p>
                    {book.txHash && (
                      <a
                        href={`https://bscscan.com/tx/${book.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-xs underline"
                      >
                        {copy.viewTx} ({shortAddress(book.txHash, 10, 8)})
                      </a>
                    )}
                    {book.txHash ? (
                      <button
                        type="button"
                        onClick={() => copyValue(book.txHash || "", "tx")}
                        className="ml-2 mt-3 inline-flex rounded-md border border-indigo-300/40 bg-indigo-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em]"
                      >
                        {copiedField === "tx" ? copy.copied : copy.copyTx}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        syncListingState(book.id, address || book.authorWallet, {
                          force: true,
                        })
                      }
                      disabled={isSyncingListing}
                      className="mt-3 inline-flex w-full justify-center rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-100 disabled:opacity-50 sm:w-auto"
                    >
                      {isSyncingListing ? copy.syncing : copy.retrySync}
                    </button>
                    <p className="mt-3 text-xs text-indigo-100/80">
                      {copy.lastSyncAttempt}:{" "}
                      {lastSyncAttemptAt
                        ? new Date(lastSyncAttemptAt).toLocaleString()
                        : copy.notAttemptedYet}
                    </p>
                    <p className="mt-1 text-xs text-indigo-100/70">
                      {copy.backgroundSyncNote} {copy.retrySync} anytime.
                    </p>
                  </div>
                )}

                {book.status === "pending" && book.processStage === "ipfs_failed" && (
                  <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                    <p className="text-sm text-yellow-200">
                      {copy.restartPipeline}
                    </p>
                    <Link
                      href="/library/upload"
                      className="mt-3 inline-flex items-center text-xs uppercase tracking-[0.2em] text-yellow-200"
                    >
                      {copy.startUploadAgain}
                    </Link>
                  </div>
                )}

                {book.status === "approved" && (
                  <div className="space-y-4">
                    <div className="theme-card p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          {copy.listingReadiness}
                        </p>
                        <span className="theme-chip px-2.5 py-1 text-[10px] tracking-[0.14em]">
                          {listingReadiness}% {copy.readyPercent}
                        </span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
                        <div
                          className="h-full bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 transition-all"
                          style={{ width: `${listingReadiness}%` }}
                        />
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {listingChecks.map((item) => (
                          <div
                            key={item.key}
                            className={`rounded-lg border px-3 py-2 ${checkToneClasses(item.ok)}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                                {item.label}
                              </p>
                              <span className="text-[10px]">
                                {item.ok === true ? copy.ok : item.ok === false ? copy.fix : "..."}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px]">{item.detail}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
                        <button
                          type="button"
                          onClick={() => void Promise.all([
                            refetchUsdtBalance(),
                            refetchRicoBalance(),
                            refetchUsdtAllowance(),
                            refetchRicoAllowance(),
                          ])}
                          className="theme-button-ghost px-3 py-1.5 text-xs uppercase tracking-[0.14em] sm:w-auto"
                        >
                          {copy.refreshChecks}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            approveToken(
                              usdtTokenAddress as `0x${string}` | undefined,
                              requiredUsdt,
                              "USDT"
                            )
                          }
                          disabled={
                            approvingUsdt ||
                            !requiredUsdt ||
                            hasEnoughUsdtAllowance !== false
                          }
                          className="theme-button-secondary px-3 py-1.5 text-xs sm:w-auto disabled:opacity-50"
                        >
                          {approvingUsdt ? copy.approvingUsdt : copy.approveUsdt}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            approveToken(
                              ricoTokenAddress as `0x${string}` | undefined,
                              requiredRico,
                              "RICO"
                            )
                          }
                          disabled={
                            approvingRico ||
                            !requiredRico ||
                            hasEnoughRicoAllowance !== false
                          }
                          className="theme-button-secondary px-3 py-1.5 text-xs sm:w-auto disabled:opacity-50"
                        >
                          {approvingRico ? copy.approvingRico : copy.approveRico}
                        </button>
                      </div>
                    </div>

                    <div className="theme-card p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {copy.contentPackage}
                      </p>
                      <p className="mt-1 text-sm text-slate-200">
                        {book.ipfsCid
                          ? copy.ipfsReady
                          : copy.ipfsMissing}
                      </p>
                    </div>
                    {!book.ipfsCid && (
                      <div>
                        <p className="text-sm text-yellow-200">
                          {copy.cidMissing}
                        </p>
                        <Link
                          href="/library/upload"
                          className="mt-3 inline-flex items-center text-xs uppercase tracking-[0.2em] text-yellow-200"
                        >
                          {copy.startUploadAgain}
                        </Link>
                      </div>
                    )}
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {copy.priceInput}
                      </label>
                      <input
                        value={price}
                        onChange={(e) => {
                          priceTouchedRef.current = true;
                          setPrice(e.target.value);
                        }}
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2.5 text-sm text-slate-200 outline-none ring-0 transition focus:border-yellow-300/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {copy.payoutWallet}
                      </label>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          value={payoutWallet}
                          onChange={(e) => {
                            payoutTouchedRef.current = true;
                            setPayoutWallet(e.target.value);
                          }}
                          className="w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2.5 text-sm text-slate-200 outline-none ring-0 transition focus:border-yellow-300/50"
                        />
                        <button
                          type="button"
                          onClick={() => copyValue(payoutWallet, "payout")}
                          className="rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-slate-300 transition hover:border-slate-400 hover:text-slate-100"
                        >
                          {copiedField === "payout" ? copy.copied : copy.copy}
                        </button>
                      </div>
                    </div>

                    {listingError && (
                      <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                        {listingError}
                      </div>
                    )}
                    {effectiveBlockReason && (
                      <div className="rounded-lg border border-yellow-400/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200/90">
                        Reason: {effectiveBlockReason}
                      </div>
                    )}

                    <button
                      onClick={handleList}
                      disabled={
                        submitting ||
                        !!effectiveBlockReason
                      }
                      className="theme-button-primary w-full px-4 py-2.5 text-sm disabled:opacity-50"
                    >
                      {submitting
                        ? "Listing..."
                        : effectiveBlockReason
                        ? "Not Ready For Listing"
                        : "List On Blockchain"}
                    </button>
                  </div>
                )}

                {(book.status === "listed" || book.status === "listing_submitted") &&
                  book.onChainBookId && (
                    <div className="mt-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/90">
                          {copy.performActions}
                        </p>
                        <button
                          type="button"
                          onClick={() => void fetchOnchainBook()}
                          disabled={onchainLoading}
                          className="theme-button-secondary px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          {onchainLoading ? copy.refreshingOnChain : copy.refreshOnChain}
                        </button>
                      </div>

                      {onchainError ? (
                        <p className="text-xs text-red-300">{onchainError}</p>
                      ) : null}

                      {onchain ? (
                        <div className="mb-3 grid gap-2 text-xs md:grid-cols-3">
                          <div className="theme-card-compact p-2 text-slate-200">
                            {copy.price}: <span className="font-semibold">{displayUsdt(onchain.priceWei)} USDT</span>
                          </div>
                          <div className="theme-card-compact p-2 text-slate-200">
                            {copy.sales}: <span className="font-semibold">{onchain.totalSales}</span>
                          </div>
                          <div className="theme-card-compact p-2 text-slate-200">
                            {copy.votes}: <span className="font-semibold">👍 {onchain.upVotes} / 👎 {onchain.downVotes}</span>
                          </div>
                          <div className="theme-card-compact p-2 text-slate-200 md:col-span-2">
                            Payout Wallet:{" "}
                            <span className="inline-flex items-center gap-2">
                              <span className="font-semibold" title={onchain.payoutWallet}>
                                {shortAddress(onchain.payoutWallet)}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyValue(onchain.payoutWallet, "payout")}
                                className="rounded-md border border-slate-600 bg-slate-900/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-300 transition hover:border-slate-400 hover:text-slate-100"
                              >
                                {copiedField === "payout" ? copy.copied : copy.copy}
                              </button>
                            </span>
                          </div>
                          <div className="theme-card-compact p-2 text-slate-200">
                            {copy.status}:{" "}
                            <span className="font-semibold">
                              {onchain.isFrozen ? "Frozen " : ""}
                              {onchain.isSuspended ? "Suspended " : ""}
                              {onchain.isBlacklisted ? "Blacklisted " : ""}
                              {!onchain.isFrozen &&
                                !onchain.isSuspended &&
                                !onchain.isBlacklisted &&
                                "Active"}
                              {onchain.isUnderAppeal ? " | Appeal Pending" : ""}
                            </span>
                          </div>
                        </div>
                      ) : null}

                      <div className="grid gap-3 xl:grid-cols-2">
                        <div className="theme-card-compact p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-yellow-200/80">
                            {copy.updatePrice}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Set a new public sale price in USDT.
                          </p>
                          <div className="mt-2 space-y-2">
                            <input
                              value={updatePrice}
                              onChange={(e) => {
                                updatePriceTouchedRef.current = true;
                                setUpdatePrice(e.target.value);
                              }}
                              placeholder="0.00"
                              className="flex-1 theme-input px-3 py-2 text-sm"
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => void handleAuthorPriceUpdate()}
                                disabled={
                                  updatingPrice ||
                                  !address ||
                                  address.toLowerCase() !== book.authorWallet.toLowerCase()
                                }
                                className="w-full rounded-lg border border-yellow-400/40 bg-yellow-400/15 px-3 py-2 text-xs font-semibold text-yellow-100 transition hover:-translate-y-0.5 hover:bg-yellow-400/25 disabled:opacity-50 sm:w-auto"
                              >
                                {updatingPrice ? copy.updating : copy.update}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="theme-card-compact p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-yellow-200/80">
                            {copy.updatePayout}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Change the wallet that receives author proceeds.
                          </p>
                          <div className="mt-2 space-y-2">
                            <input
                              value={updatePayoutWallet}
                              onChange={(e) => {
                                updatePayoutTouchedRef.current = true;
                                setUpdatePayoutWallet(e.target.value);
                              }}
                              placeholder="0x..."
                              className="flex-1 theme-input px-3 py-2 text-sm"
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => void handleAuthorPayoutUpdate()}
                                disabled={
                                  updatingPayout ||
                                  !address ||
                                  address.toLowerCase() !== book.authorWallet.toLowerCase()
                                }
                                className="w-full rounded-lg border border-yellow-400/40 bg-yellow-400/15 px-3 py-2 text-xs font-semibold text-yellow-100 transition hover:-translate-y-0.5 hover:bg-yellow-400/25 disabled:opacity-50 sm:w-auto"
                              >
                                {updatingPayout ? copy.updating : copy.update}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleAuthorAppeal()}
                          disabled={
                            appealing ||
                            !onchain ||
                            onchain.isUnderAppeal ||
                            (!onchain.isFrozen && !onchain.isSuspended && !onchain.isBlacklisted) ||
                            !address ||
                            address.toLowerCase() !== book.authorWallet.toLowerCase()
                          }
                          className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs font-semibold text-yellow-200 transition hover:-translate-y-0.5 hover:bg-yellow-500/20 disabled:opacity-50"
                        >
                          {appealing ? copy.submitting : copy.submitAppeal}
                        </button>
                        <span className="text-xs text-yellow-100/80">
                          Appeal is available only when the book is frozen, suspended, or blacklisted.
                        </span>
                      </div>
                    </div>
                  )}

                <Link
                  href="/library/my-books?mode=author"
                  className="mt-6 inline-flex items-center text-xs uppercase tracking-[0.2em] text-yellow-200 transition hover:text-yellow-100"
                >
                  Back to My Books
                </Link>
              </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
