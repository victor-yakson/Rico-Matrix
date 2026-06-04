"use client";

import { Header } from "@/components/Navigation/Header";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Book } from "@/types/library";
import Link from "next/link";
import { formatUnits, parseUnits } from "viem";
import { useLibraryListing } from "@/hooks/useLibraryListing";
import { libraryContract } from "@/utils/contracts";
import { USDT_ABI } from "@/utils/constants";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

type ListingDraft = {
  price: string;
  payoutWallet: string;
  submitting: boolean;
  uploading: boolean;
  recoverTxHash: string;
  recovering: boolean;
  updatePrice: string;
  updatePayoutWallet: string;
  updatingPrice: boolean;
  updatingPayout: boolean;
  appealing: boolean;
  error?: string;
};

const statusStyles: Record<Book["status"], string> = {
  pending: "bg-yellow-500/10 text-yellow-200 border-yellow-400/30",
  approved: "bg-amber-500/10 text-amber-100 border-amber-400/30",
  rejected: "bg-red-500/10 text-red-200 border-red-400/30",
  listing_submitted: "bg-indigo-500/10 text-indigo-200 border-indigo-400/30",
  listed: "bg-yellow-500/10 text-yellow-200 border-yellow-400/30",
};


const PAGE_SIZE = 6;
const READER_PAGE_SIZE = 9;
const GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";

const isBookStatus = (value: string | null): value is Book["status"] =>
  value === "pending" ||
  value === "approved" ||
  value === "rejected" ||
  value === "listing_submitted" ||
  value === "listed";

const isSortOption = (value: string | null): value is "newest" | "oldest" | "status" =>
  value === "newest" || value === "oldest" || value === "status";

const parsePage = (value: string | null) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
};

const isMode = (value: string | null): value is "author" | "reader" =>
  value === "author" || value === "reader";

const StatusBadge = ({ status, labels }: { status: Book["status"]; labels: Record<Book["status"], string> }) => (
  <span
    className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] ${
      statusStyles[status]
    }`}
  >
    {labels[status]}
  </span>
);

const truncateAddress = (value?: string | null, start = 6, end = 4) => {
  if (!value) return "--";
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
};

const AddressWithCopy = ({
  value,
  label = "Address",
}: {
  value?: string | null;
  label?: string;
}) => {
  if (!value) {
    return <span className="font-medium text-slate-300">--</span>;
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Failed to copy address");
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-medium" title={value}>
        {truncateAddress(value)}
      </span>
      <button
        type="button"
        onClick={onCopy}
        className="rounded-md border border-slate-600 bg-slate-900/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:bg-slate-800"
      >
        Copy
      </button>
    </span>
  );
};

const AuthorLoadingSkeleton = () => (
  <div className="mt-6 grid gap-6 animate-pulse">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={`author-skeleton-${index}`}
        className="theme-panel-soft p-6"
      >
        <div className="h-5 w-1/3 rounded bg-slate-700/70" />
        <div className="mt-3 h-4 w-2/3 rounded bg-slate-800/70" />
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="h-11 rounded-xl bg-slate-800/70" />
          <div className="h-11 rounded-xl bg-slate-800/70" />
        </div>
        <div className="mt-5 h-10 w-44 rounded-xl bg-slate-700/70" />
      </div>
    ))}
  </div>
);

const ReaderLoadingSkeleton = () => (
  <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3 animate-pulse">
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={`reader-skeleton-${index}`}
        className="theme-panel-soft p-5 md:p-6"
      >
        <div className="h-5 w-2/3 rounded bg-slate-700/70" />
        <div className="mt-3 h-4 w-full rounded bg-slate-800/70" />
        <div className="mt-2 h-4 w-4/5 rounded bg-slate-800/70" />
        <div className="mt-5 h-24 rounded-xl bg-slate-950/60" />
        <div className="mt-4 h-10 rounded-xl bg-slate-700/70" />
      </div>
    ))}
  </div>
);

const isListingReadyStage = (stage?: string) =>
  stage === "ready_for_listing" || stage === "listing_submitted";

const getListingBlockReason = (
  book: Book,
  wallet?: string,
  tokenReason?: string | null
): string | null => {
  if (book.status === "listing_submitted") {
    return "Listing transaction already submitted. Waiting for sync.";
  }
  if (book.status !== "approved") {
    return "Only approved books can be listed.";
  }
  if (!book.ipfsCid) {
    return "IPFS CID is missing. Restart from /library/upload.";
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
  if (tokenReason) {
    return tokenReason;
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

const getDraftMessageTone = (message?: string) => {
  if (!message) return "error";
  return /success|confirmed|synced|waiting for index/i.test(message)
    ? "info"
    : "error";
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

const mapMarketplaceBook = (row: MarketplaceBookRecord): Book => {
  const id = row.id ?? Number(row.book_id);
  const normalizedStatus: Book["status"] =
    row.status === "listed"
      ? "listed"
      : row.status === "listing_submitted"
      ? "listing_submitted"
      : "approved";
  const nowIso = new Date().toISOString();

  return {
    id: Number.isFinite(id) ? id : 0,
    onChainBookId: row.book_id,
    title: row.title?.trim() || (row.book_id ? `Book #${row.book_id}` : "Untitled"),
    description:
      row.description?.trim() || "Uploaded and ready for on-chain listing.",
    authorWallet: row.author_address,
    payoutWallet: row.payout_wallet || row.author_address,
    ipfsCid: row.cid,
    priceWei: row.price,
    onchainPriceWei: row.onchain_price || row.price,
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
        ? "Listed on-chain and synced."
        : normalizedStatus === "listing_submitted"
        ? "Listing submitted. Waiting for sync confirmation."
        : "IPFS folder uploaded. Ready for on-chain listing.",
    similarityScore: null,
    rejectionReason: null,
    txHash: row.tx_hash ?? null,
    lastActionType: row.last_action_type ?? null,
    lastActionTxHash: row.last_action_tx_hash ?? null,
    lastUpdateIpfsCid: row.last_update_ipfs_cid ?? null,
    createdAt: row.created_at ?? nowIso,
    updatedAt: row.updated_at ?? row.created_at ?? nowIso,
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

export default function MyBooksPage() {
  const locale = useLocale();
  const tCommon = useTranslations("LibraryCommon");
  const commonCopy = {
    status: tCommon.raw("status") as Record<Book["status"], string>,
    buttons: tCommon.raw("buttons") as Record<string, string>,
    labels: tCommon.raw("labels") as Record<string, string>,
  };
  const statusDisplay: Record<Book["status"], string> = commonCopy.status;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { listBookOnChain } = useLibraryListing();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, ListingDraft>>({});
  const [approvingUsdt, setApprovingUsdt] = useState(false);
  const [approvingRico, setApprovingRico] = useState(false);
  const [claimingReaderRoyalty, setClaimingReaderRoyalty] = useState(false);
  const listingInProgressRef = useRef(false);
  const syncInFlightRef = useRef(new Set<number>());
  const [syncMeta, setSyncMeta] = useState<
    Record<number, { syncing: boolean; lastAttemptAt?: number }>
  >({});
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [filterStatus, setFilterStatus] = useState<"all" | Book["status"]>(() => {
    const statusParam = searchParams.get("status");
    return isBookStatus(statusParam) ? statusParam : "all";
  });
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "status">(() => {
    const sortParam = searchParams.get("sort");
    return isSortOption(sortParam) ? sortParam : "newest";
  });
  const [currentPage, setCurrentPage] = useState(() =>
    parsePage(searchParams.get("page"))
  );
  const [mode, setMode] = useState<"author" | "reader">(() => {
    const modeParam = searchParams.get("mode");
    return isMode(modeParam) ? modeParam : "reader";
  });
  const [readerBooks, setReaderBooks] = useState<MarketplaceBookRecord[]>([]);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState<string | null>(null);
  const [readerQuery, setReaderQuery] = useState(() => searchParams.get("rq") ?? "");
  const [readerPage, setReaderPage] = useState(() =>
    parsePage(searchParams.get("rpage"))
  );
  const [onchainByRecord, setOnchainByRecord] = useState<Record<number, OnchainBookState>>({});
  const [onchainLoadingByRecord, setOnchainLoadingByRecord] = useState<Record<number, boolean>>({});
  const [onchainErrorByRecord, setOnchainErrorByRecord] = useState<Record<number, string>>({});

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

  const { data: usdtBalance } = useReadContract({
    address: usdtTokenAddress as `0x${string}` | undefined,
    abi: USDT_ABI,
    functionName: "balanceOf",
    args: address && usdtTokenAddress ? [address] : undefined,
    query: { enabled: Boolean(address && usdtTokenAddress) },
  });

  const { data: ricoBalance } = useReadContract({
    address: ricoTokenAddress as `0x${string}` | undefined,
    abi: USDT_ABI,
    functionName: "balanceOf",
    args: address && ricoTokenAddress ? [address] : undefined,
    query: { enabled: Boolean(address && ricoTokenAddress) },
  });

  const requiredUsdt = typeof appFeeUsdt === "bigint" ? appFeeUsdt : null;
  const requiredRico = typeof appFeeRico === "bigint" ? appFeeRico : null;

  const { data: usdtAllowance, refetch: refetchUsdtAllowance } = useReadContract({
    address: usdtTokenAddress as `0x${string}` | undefined,
    abi: USDT_ABI,
    functionName: "allowance",
    args:
      address && usdtTokenAddress
        ? [address, libraryContract.address]
        : undefined,
    query: { enabled: Boolean(address && usdtTokenAddress) },
  });

  const { data: ricoAllowance, refetch: refetchRicoAllowance } = useReadContract({
    address: ricoTokenAddress as `0x${string}` | undefined,
    abi: USDT_ABI,
    functionName: "allowance",
    args:
      address && ricoTokenAddress
        ? [address, libraryContract.address]
        : undefined,
    query: { enabled: Boolean(address && ricoTokenAddress) },
  });

  const { data: pendingReaderShare, refetch: refetchPendingReaderShare } = useReadContract({
    ...libraryContract,
    functionName: "viewPendingShare",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

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
  const pendingReaderShareDisplay =
    typeof pendingReaderShare === "bigint"
      ? displayUsdt(formatUnits(pendingReaderShare, 18))
      : "--";
  const canClaimReaderRoyalty =
    typeof pendingReaderShare === "bigint" && pendingReaderShare > BigInt(0);

  const tokenRequirementBlockReason =
    hasEnoughUsdt === false
      ? "Insufficient USDT for listing fee."
      : hasEnoughRico === false
      ? "Insufficient RICO for listing fee."
      : hasEnoughUsdtAllowance === false
      ? "USDT approval required for listing fee."
      : hasEnoughRicoAllowance === false
      ? "RICO approval required for listing fee."
      : null;

  const fetchBooks = async (): Promise<Book[]> => {
    if (!address) {
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/marketplace/books?authorAddress=${encodeURIComponent(address)}`,
        { cache: "no-store" }
      );
      const payload = (await res.json()) as {
        books?: MarketplaceBookRecord[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load books");
      }
      const mapped = (payload.books || []).map(mapMarketplaceBook);
      setBooks(mapped);
      return mapped;
    } catch (err: any) {
      setError(err?.message || "Failed to load books.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchReaderBooks = async (): Promise<MarketplaceBookRecord[]> => {
    if (!address) {
      setReaderBooks([]);
      setReaderLoading(false);
      return [];
    }

    setReaderLoading(true);
    setReaderError(null);
    try {
      const res = await fetch(
        `/api/marketplace/books?purchasedBy=${encodeURIComponent(address)}&limit=120`,
        { cache: "no-store" }
      );
      const payload = (await res.json()) as {
        books?: MarketplaceBookRecord[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load marketplace books.");
      }
      const rows = (payload.books || []).filter((row) => Boolean(row.book_id));
      setReaderBooks(rows);
      return rows;
    } catch (err: any) {
      const message = err?.message || "Failed to load marketplace books.";
      setReaderError(message);
      return [];
    } finally {
      setReaderLoading(false);
    }
  };

  const setBookFromApiRow = (row: MarketplaceBookRecord) => {
    const mapped = mapMarketplaceBook(row);
    setBooks((prev) => {
      const idx = prev.findIndex((item) => item.id === mapped.id);
      if (idx === -1) {
        return [mapped, ...prev];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...mapped };
      return next;
    });
  };

  const syncListingState = async (
    recordId: number,
    options?: { silent?: boolean; force?: boolean }
  ): Promise<ListingSyncResponse | null> => {
    if (!address) return null;
    if (!options?.force && syncInFlightRef.current.has(recordId)) {
      return null;
    }

    syncInFlightRef.current.add(recordId);
    setSyncMeta((prev) => ({
      ...prev,
      [recordId]: {
        syncing: true,
        lastAttemptAt: Date.now(),
      },
    }));

    try {
      const res = await fetch("/api/marketplace/listing/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          authorWallet: address,
        }),
      });

      const payload = (await res.json()) as ListingSyncResponse;
      if (!res.ok) {
        if (!options?.silent) {
          setDrafts((prev) => ({
            ...prev,
            [recordId]: {
              ...prev[recordId],
              error: payload.error || "Failed to sync listing status.",
            },
          }));
        }
        return payload;
      }

      if (payload.book) {
        setBookFromApiRow(payload.book);
      }

      if (!options?.silent && payload.reason) {
        setDrafts((prev) => ({
          ...prev,
          [recordId]: {
            ...prev[recordId],
            error: payload.reason,
          },
        }));
      }

      if (payload.status === "listed") {
        setDrafts((prev) => ({
          ...prev,
          [recordId]: {
            ...prev[recordId],
            error: undefined,
          },
        }));
      }

      return payload;
    } catch (err: any) {
      if (!options?.silent) {
        setDrafts((prev) => ({
          ...prev,
          [recordId]: {
            ...prev[recordId],
            error: err?.message || "Failed to sync listing status.",
          },
        }));
      }
      return null;
    } finally {
      syncInFlightRef.current.delete(recordId);
      setSyncMeta((prev) => ({
        ...prev,
        [recordId]: {
          ...(prev[recordId] || {}),
          syncing: false,
        },
      }));
    }
  };

  useEffect(() => {
    if (mode !== "author") return;

    const loadAndSync = async () => {
      const loaded = await fetchBooks();
      const pendingSync = loaded.filter((book) => book.status === "listing_submitted");
      for (const item of pendingSync) {
        await syncListingState(item.id, { silent: true });
      }
    };

    loadAndSync();
    if (!address) return;
    const interval = setInterval(async () => {
      if (!listingInProgressRef.current) {
        const loaded = await fetchBooks();
        const pendingSync = loaded.filter((book) => book.status === "listing_submitted");
        for (const item of pendingSync) {
          await syncListingState(item.id, { silent: true });
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [address, mode]);

  useEffect(() => {
    if (tokenRequirementBlockReason) return;
    setDrafts((prev) => {
      const next: Record<number, ListingDraft> = {};
      for (const [id, draft] of Object.entries(prev)) {
        next[Number(id)] =
          draft?.error && /insufficient|approval required/i.test(draft.error)
            ? { ...draft, error: undefined }
            : draft;
      }
      return next;
    });
  }, [tokenRequirementBlockReason]);

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const book of books) {
        if (!next[book.id]) {
          next[book.id] = {
            price: weiToDisplay(book.priceWei),
            payoutWallet: book.payoutWallet || book.authorWallet,
            submitting: false,
            uploading: false,
            recoverTxHash: "",
            recovering: false,
            updatePrice: weiToDisplay(book.onchainPriceWei || book.priceWei),
            updatePayoutWallet: book.payoutWallet || book.authorWallet,
            updatingPrice: false,
            updatingPayout: false,
            appealing: false,
          };
        } else {
          const existing = next[book.id];
          next[book.id] = {
            ...existing,
            recoverTxHash: existing.recoverTxHash ?? "",
            recovering: existing.recovering ?? false,
            updatePrice:
              existing.updatePrice ??
              weiToDisplay(book.onchainPriceWei || book.priceWei),
            updatePayoutWallet:
              existing.updatePayoutWallet ?? book.payoutWallet ?? book.authorWallet,
            updatingPrice: existing.updatingPrice ?? false,
            updatingPayout: existing.updatingPayout ?? false,
            appealing: existing.appealing ?? false,
          };
        }
      }
      return next;
    });
  }, [books]);

  useEffect(() => {
    const statusParam = searchParams.get("status");
    const sortParam = searchParams.get("sort");
    const qParam = searchParams.get("q") ?? "";
    const pageParam = parsePage(searchParams.get("page"));
    const modeParam = searchParams.get("mode");
    const readerQueryParam = searchParams.get("rq") ?? "";
    const readerPageParam = parsePage(searchParams.get("rpage"));

    const nextStatus: "all" | Book["status"] = isBookStatus(statusParam)
      ? statusParam
      : "all";
    const nextSort: "newest" | "oldest" | "status" = isSortOption(sortParam)
      ? sortParam
      : "newest";
    const nextMode: "author" | "reader" = isMode(modeParam) ? modeParam : "reader";

    if (qParam !== query) setQuery(qParam);
    if (nextStatus !== filterStatus) setFilterStatus(nextStatus);
    if (nextSort !== sortBy) setSortBy(nextSort);
    if (pageParam !== currentPage) setCurrentPage(pageParam);
    if (nextMode !== mode) setMode(nextMode);
    if (readerQueryParam !== readerQuery) setReaderQuery(readerQueryParam);
    if (readerPageParam !== readerPage) setReaderPage(readerPageParam);
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (mode !== "reader") params.set("mode", mode);
    if (query.trim()) params.set("q", query.trim());
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (sortBy !== "newest") params.set("sort", sortBy);
    if (currentPage > 1) params.set("page", String(currentPage));
    if (readerQuery.trim()) params.set("rq", readerQuery.trim());
    if (readerPage > 1) params.set("rpage", String(readerPage));

    const next = params.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [mode, query, filterStatus, sortBy, currentPage, readerQuery, readerPage, pathname, router, searchParams]);

  useEffect(() => {
    if (mode !== "reader") return;
    void fetchReaderBooks();
    const interval = setInterval(() => {
      void fetchReaderBooks();
    }, 15000);
    return () => clearInterval(interval);
  }, [mode]);

  const summary = useMemo(() => {
    return books.reduce(
      (acc, book) => {
        acc.total += 1;
        acc[book.status] += 1;
        if (book.status === "approved" && !getListingBlockReason(book, address, tokenRequirementBlockReason)) {
          acc.readyToList += 1;
        }
        return acc;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        listed: 0,
        listing_submitted: 0,
        readyToList: 0,
      }
    );
  }, [books, address, tokenRequirementBlockReason]);

  const recentAuthorActions = useMemo(() => {
    return [...books]
      .filter((book) => Boolean(book.lastActionType && book.lastActionTxHash))
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt).getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [books]);

  const filteredBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const byStatus =
      filterStatus === "all"
        ? books
        : books.filter((book) => book.status === filterStatus);
    const byQuery = normalizedQuery
      ? byStatus.filter((book) => {
          const haystack = [
            book.title,
            book.description,
            book.processStage,
            book.processMessage || "",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : byStatus;

    const sorted = [...byQuery];
    if (sortBy === "oldest") {
      sorted.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else if (sortBy === "status") {
      sorted.sort((a, b) => statusDisplay[a.status].localeCompare(statusDisplay[b.status]));
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return sorted;
  }, [books, filterStatus, query, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBooks.slice(start, start + PAGE_SIZE);
  }, [filteredBooks, currentPage]);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }, [currentPage, totalPages]);

  const fetchOnchainBook = async (book: Book, force = false) => {
    if (!publicClient) return;
    if (!book.onChainBookId || !/^\d+$/.test(book.onChainBookId)) return;
    if (!force && (onchainByRecord[book.id] || onchainLoadingByRecord[book.id])) return;

    setOnchainLoadingByRecord((prev) => ({ ...prev, [book.id]: true }));
    setOnchainErrorByRecord((prev) => {
      const next = { ...prev };
      delete next[book.id];
      return next;
    });

    try {
      const raw = await publicClient.readContract({
        ...libraryContract,
        functionName: "getBook",
        args: [BigInt(book.onChainBookId)],
      });
      const parsed = parseOnchainBookState(book.onChainBookId, raw);
      setOnchainByRecord((prev) => ({ ...prev, [book.id]: parsed }));
      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          updatePrice: weiToDisplay(parsed.priceWei),
          updatePayoutWallet: parsed.payoutWallet,
        },
      }));
    } catch (err: any) {
      setOnchainErrorByRecord((prev) => ({
        ...prev,
        [book.id]: err?.shortMessage || err?.message || "Failed to fetch on-chain state.",
      }));
    } finally {
      setOnchainLoadingByRecord((prev) => ({ ...prev, [book.id]: false }));
    }
  };

  useEffect(() => {
    if (mode !== "author") return;
    for (const book of paginatedBooks) {
      if (book.status === "listed" || book.status === "listing_submitted") {
        void fetchOnchainBook(book);
      }
    }
  }, [mode, paginatedBooks, publicClient]);

  const filteredReaderBooks = useMemo(() => {
    const normalized = readerQuery.trim().toLowerCase();
    const rows = normalized
      ? readerBooks.filter((row) => {
          const title = row.title?.toLowerCase() || "";
          const description = row.description?.toLowerCase() || "";
          const author = row.author_address.toLowerCase();
          return (
            title.includes(normalized) ||
            description.includes(normalized) ||
            author.includes(normalized)
          );
        })
      : readerBooks;

    return [...rows].sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at || "").getTime();
      const bTime = new Date(b.updated_at || b.created_at || "").getTime();
      return bTime - aTime;
    });
  }, [readerBooks, readerQuery]);

  const readerTotalPages = Math.max(
    1,
    Math.ceil(filteredReaderBooks.length / READER_PAGE_SIZE)
  );

  useEffect(() => {
    if (readerPage > readerTotalPages) {
      setReaderPage(readerTotalPages);
    }
  }, [readerPage, readerTotalPages]);

  const paginatedReaderBooks = useMemo(() => {
    const start = (readerPage - 1) * READER_PAGE_SIZE;
    return filteredReaderBooks.slice(start, start + READER_PAGE_SIZE);
  }, [filteredReaderBooks, readerPage]);

  const readerPageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, readerPage - 2);
    const end = Math.min(readerTotalPages, readerPage + 2);
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }, [readerPage, readerTotalPages]);

  const readerSummary = useMemo(() => {
    const normalizedAddress = address?.toLowerCase() || "";
    const fromMe = readerBooks.filter(
      (row) => row.author_address.toLowerCase() === normalizedAddress
    ).length;
    const fromOthers = readerBooks.length - fromMe;
    const withPrice = readerBooks.filter((row) => {
      try {
        return BigInt(row.price || "0") > BigInt(0);
      } catch {
        return false;
      }
    }).length;
    return {
      totalPurchased: readerBooks.length,
      fromMe,
      fromOthers: Math.max(0, fromOthers),
      withPrice,
    };
  }, [readerBooks, address]);

  const handleDraftChange = (
    bookId: number,
    field: keyof ListingDraft,
    value: string
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [bookId]: { ...prev[bookId], [field]: value, error: undefined },
    }));
  };

  const handleList = async (book: Book) => {
    if (!address) return;
    const blockReason = getListingBlockReason(book, address, tokenRequirementBlockReason);
    if (blockReason) {
      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          error: blockReason,
        },
      }));
      return;
    }

    const draft = drafts[book.id];
    if (!draft) return;
    if (!draft.price || !draft.payoutWallet) {
      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          error: "Price and payout wallet are required.",
        },
      }));
      return;
    }
    if (!/^\d+(\.\d+)?$/.test(draft.price)) {
      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          error: "Enter a valid price.",
        },
      }));
      return;
    }

    setDrafts((prev) => ({
      ...prev,
      [book.id]: { ...prev[book.id], submitting: true, error: undefined },
    }));
    listingInProgressRef.current = true;

    try {
      const priceWei = parseUnits(draft.price, 18);
      const cid = book.ipfsCid;
      if (!cid) {
        throw new Error("IPFS CID is missing. Restart from /library/upload.");
      }

      const txHash = await listBookOnChain({
        cid,
        priceWei,
        payoutWallet: draft.payoutWallet as `0x${string}`,
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
        setBookFromApiRow(submitPayload.book);
      }

      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          error: `Transaction submitted (${txHash.slice(0, 10)}...). Syncing listing status...`,
        },
      }));

      for (let attempt = 0; attempt < 8; attempt++) {
        const syncPayload = await syncListingState(book.id);
        if (syncPayload?.status === "listed" || syncPayload?.book?.status === "listed") {
          await fetchBooks();
          return;
        }
        if (syncPayload?.status === "failed") {
          await fetchBooks();
          throw new Error(syncPayload.reason || "Listing transaction failed.");
        }
        await wait(3000);
      }

      await fetchBooks();
      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          error:
            "Listing submitted. Still waiting for sync. This page will keep checking automatically.",
        },
      }));
    } catch (err: any) {
      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          error: err?.message || "Listing failed.",
        },
      }));
    } finally {
      listingInProgressRef.current = false;
      setDrafts((prev) => ({
        ...prev,
        [book.id]: { ...prev[book.id], submitting: false },
      }));
    }
  };

  const handleRecoverFromTx = async (book: Book) => {
    if (!address) return;
    const draft = drafts[book.id];
    if (!draft) return;
    const txHash = (draft.recoverTxHash || "").trim();

    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          error: "Enter a valid transaction hash.",
        },
      }));
      return;
    }

    setDrafts((prev) => ({
      ...prev,
      [book.id]: {
        ...prev[book.id],
        recovering: true,
        error: undefined,
      },
    }));

    const toastId = `listing-recover-${book.id}`;
    try {
      toast.loading("Verifying transaction and syncing listing state...", {
        id: toastId,
      });
      const res = await fetch("/api/marketplace/listing/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: book.id,
          authorWallet: address,
          txHash,
        }),
      });
      const payload = (await res.json()) as ListingSyncResponse;
      if (!res.ok) {
        throw new Error(payload.error || "Failed to recover listing.");
      }

      if (payload.book) {
        setBookFromApiRow(payload.book);
      }

      const successMsg =
        payload.status === "listed"
          ? "Listing synced from blockchain successfully."
          : payload.status === "pending_index"
          ? "Transaction confirmed. Waiting for index sync."
          : payload.reason || "Recovery completed.";

      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          recoverTxHash: "",
          error: successMsg,
          recovering: false,
        },
      }));
      toast.success(successMsg, { id: toastId });

      await fetchBooks();
    } catch (err: any) {
      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          error: err?.message || "Failed to recover listing.",
          recovering: false,
        },
      }));
      toast.error(err?.message || "Failed to recover listing.", {
        id: toastId,
      });
    }
  };

  const syncAuthorAction = async (params: {
    book: Book;
    txHash: string;
    action: "update_price" | "update_payout" | "appeal";
    newPriceWei?: string;
    newPayoutWallet?: string;
  }) => {
    if (!address) throw new Error("Wallet not connected.");
    const res = await fetch("/api/marketplace/author/book-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordId: params.book.id,
        authorWallet: address,
        txHash: params.txHash,
        action: params.action,
        newPriceWei: params.newPriceWei,
        newPayoutWallet: params.newPayoutWallet,
      }),
    });
    const payload = (await res.json()) as {
      status?: string;
      error?: string;
      book?: MarketplaceBookRecord;
      ipfsActionCid?: string;
    };
    if (!res.ok) {
      throw new Error(payload.error || "Failed to sync author action.");
    }
    if (payload.book) {
      setBookFromApiRow(payload.book);
    }
    return payload;
  };

  const handleAuthorPriceUpdate = async (book: Book) => {
    if (!address || !publicClient || !book.onChainBookId) return;
    const draft = drafts[book.id];
    if (!draft) return;
    if (!draft.updatePrice || !/^\d+(\.\d+)?$/.test(draft.updatePrice)) {
      setDrafts((prev) => ({
        ...prev,
        [book.id]: { ...prev[book.id], error: "Enter a valid new price." },
      }));
      return;
    }

    setDrafts((prev) => ({
      ...prev,
      [book.id]: {
        ...prev[book.id],
        updatingPrice: true,
        error: undefined,
      },
    }));

    const toastId = `author-price-${book.id}`;
    try {
      const newPriceWei = parseUnits(draft.updatePrice, 18);
      toast.loading("Submitting price update transaction...", { id: toastId });
      const hash = await writeContractAsync({
        ...libraryContract,
        functionName: "updateBookPrice",
        args: [BigInt(book.onChainBookId), newPriceWei],
      });
      toast.loading("Waiting for transaction confirmation...", { id: toastId });
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

      toast.loading("Syncing database and IPFS action log...", { id: toastId });
      const syncResult = await syncAuthorAction({
        book,
        txHash: hash,
        action: "update_price",
        newPriceWei: newPriceWei.toString(),
      });

      await fetchBooks();
      await fetchOnchainBook(book, true);
      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          updatingPrice: false,
          error: syncResult.ipfsActionCid
            ? `Price updated and synced. IPFS log: ${syncResult.ipfsActionCid}`
            : "Price updated and synced.",
        },
      }));
      toast.success("Price updated and synced successfully.", { id: toastId });
    } catch (err: any) {
      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          updatingPrice: false,
          error: err?.shortMessage || err?.message || "Failed to update price.",
        },
      }));
      toast.error(
        err?.shortMessage || err?.message || "Failed to update price.",
        { id: toastId }
      );
    }
  };

  const handleAuthorPayoutUpdate = async (book: Book) => {
    if (!address || !publicClient || !book.onChainBookId) return;
    const draft = drafts[book.id];
    if (!draft) return;
    if (!/^0x[a-fA-F0-9]{40}$/.test((draft.updatePayoutWallet || "").trim())) {
      setDrafts((prev) => ({
        ...prev,
        [book.id]: { ...prev[book.id], error: "Enter a valid payout wallet address." },
      }));
      return;
    }

    const payout = draft.updatePayoutWallet.trim() as `0x${string}`;

    setDrafts((prev) => ({
      ...prev,
      [book.id]: {
        ...prev[book.id],
        updatingPayout: true,
        error: undefined,
      },
    }));

    const toastId = `author-payout-${book.id}`;
    try {
      toast.loading("Submitting payout wallet update transaction...", { id: toastId });
      const hash = await writeContractAsync({
        ...libraryContract,
        functionName: "updatePayoutWallet",
        args: [BigInt(book.onChainBookId), payout],
      });
      toast.loading("Waiting for transaction confirmation...", { id: toastId });
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

      toast.loading("Syncing database and IPFS action log...", { id: toastId });
      const syncResult = await syncAuthorAction({
        book,
        txHash: hash,
        action: "update_payout",
        newPayoutWallet: payout,
      });

      await fetchBooks();
      await fetchOnchainBook(book, true);
      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          updatingPayout: false,
          error: syncResult.ipfsActionCid
            ? `Payout wallet updated and synced. IPFS log: ${syncResult.ipfsActionCid}`
            : "Payout wallet updated and synced.",
        },
      }));
      toast.success("Payout wallet updated and synced successfully.", {
        id: toastId,
      });
    } catch (err: any) {
      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          updatingPayout: false,
          error:
            err?.shortMessage || err?.message || "Failed to update payout wallet.",
        },
      }));
      toast.error(
        err?.shortMessage || err?.message || "Failed to update payout wallet.",
        { id: toastId }
      );
    }
  };

  const handleAuthorAppeal = async (book: Book) => {
    if (!address || !publicClient || !book.onChainBookId) return;
    const draft = drafts[book.id];
    if (!draft) return;

    setDrafts((prev) => ({
      ...prev,
      [book.id]: {
        ...prev[book.id],
        appealing: true,
        error: undefined,
      },
    }));

    const toastId = `author-appeal-${book.id}`;
    try {
      toast.loading("Submitting appeal transaction...", { id: toastId });
      const hash = await writeContractAsync({
        ...libraryContract,
        functionName: "appealStatus",
        args: [BigInt(book.onChainBookId)],
      });
      toast.loading("Waiting for transaction confirmation...", { id: toastId });
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

      toast.loading("Syncing database and IPFS action log...", { id: toastId });
      const syncResult = await syncAuthorAction({
        book,
        txHash: hash,
        action: "appeal",
      });

      await fetchOnchainBook(book, true);
      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          appealing: false,
          error: syncResult.ipfsActionCid
            ? `Appeal submitted and synced. IPFS log: ${syncResult.ipfsActionCid}`
            : "Appeal submitted and synced.",
        },
      }));
      toast.success("Appeal submitted and synced successfully.", { id: toastId });
    } catch (err: any) {
      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          appealing: false,
          error: err?.shortMessage || err?.message || "Failed to submit appeal.",
        },
      }));
      toast.error(
        err?.shortMessage || err?.message || "Failed to submit appeal.",
        { id: toastId }
      );
    }
  };

  const approveToken = async (
    tokenAddress: `0x${string}` | undefined,
    amount: bigint | null,
    token: "USDT" | "RICO"
  ) => {
    if (!tokenAddress || !amount || !address || !publicClient) {
      setError("Wallet or token config unavailable.");
      return;
    }

    const setLoading = token === "USDT" ? setApprovingUsdt : setApprovingRico;
    setLoading(true);
    setError(null);
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
      setError(err?.shortMessage || err?.message || `${token} approval failed.`);
    } finally {
      setLoading(false);
    }
  };

  const claimReaderRoyalty = async () => {
    if (!address || !publicClient) {
      toast.error(
        locale === "fr"
          ? "Connectez votre wallet pour reclamer votre part."
          : "Connect your wallet to claim your share."
      );
      return;
    }

    if (!canClaimReaderRoyalty) {
      toast.error(
        locale === "fr"
          ? "Aucune part de royaute a reclamer pour le moment."
          : "No royalty share is available to claim right now."
      );
      return;
    }

    setClaimingReaderRoyalty(true);
    const toastId = "library-reader-royalty";

    try {
      toast.loading(
        locale === "fr"
          ? "Reclamation de la part communautaire..."
          : "Claiming community share...",
        { id: toastId }
      );

      const hash = await writeContractAsync({
        ...libraryContract,
        functionName: "claimCommunityShare",
      });

      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      await refetchPendingReaderShare();

      toast.success(
        locale === "fr"
          ? "Part communautaire reclamee."
          : "Community share claimed.",
        { id: toastId }
      );
    } catch (error: any) {
      toast.error(
        error?.shortMessage ||
          error?.message ||
          (locale === "fr"
            ? "Echec de la reclamation."
            : "Claim failed."),
        { id: toastId }
      );
    } finally {
      setClaimingReaderRoyalty(false);
    }
  };

  return (
    <>
      <Header />
      <div className="theme-shell theme-page-shell">
        <div className="theme-container px-4">
          <section className="theme-panel p-6 md:p-8 lg:p-10">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="theme-kicker">
                  {mode === "author" ? (locale === "fr" ? "Espace auteur" : "Author Workspace") : (locale === "fr" ? "Espace lecteur" : "Reader Workspace")}
                </p>
                <h1 className="theme-title mt-2 text-3xl md:text-4xl">
                  {mode === "author" ? (locale === "fr" ? "Mes livres" : "My Books") : (locale === "fr" ? "Decouvrir et lire" : "Discover & Read")}
                </h1>
                <p className="theme-copy mt-3 max-w-3xl text-sm md:text-base">
                  {mode === "author"
                    ? (locale === "fr" ? "Gerez la moderation, le listing, les approbations et la publication on-chain." : "Manage moderation, listing readiness, approvals, and on-chain publishing.")
                    : (locale === "fr" ? "Consultez uniquement les livres que vous avez achetes et ouvrez-les dans le lecteur." : "View only books you have purchased and open them in the reader.")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (mode === "author") {
                      void fetchBooks();
                    } else {
                      void fetchReaderBooks();
                    }
                  }}
                  className="theme-button-ghost px-4 py-2 text-xs uppercase tracking-wider"
                >
                  {locale === "fr" ? "Actualiser" : "Refresh"}
                </button>
                <Link
                  href="/library"
                  className="theme-button-ghost px-4 py-2 text-xs uppercase tracking-wider"
                >
                  {commonCopy.labels.marketplace}
                </Link>
                {mode === "author" ? (
                  <Link
                    href="/library/upload"
                    className="theme-button-primary px-5 py-2.5 text-xs uppercase tracking-wider"
                  >
                    {locale === "fr" ? "Televerser un livre" : "Upload New Book"}
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="mb-6 inline-flex rounded-2xl border border-white/8 bg-[rgba(7,10,17,0.7)] p-1">
              <button
                type="button"
                onClick={() => setMode("author")}
                className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  mode === "author"
                    ? "bg-gradient-to-r from-yellow-300 to-amber-300 text-black"
                    : "text-slate-300 hover:bg-slate-800/80"
                }`}
              >
                {locale === "fr" ? "Auteur" : "Author"}
              </button>
              <button
                type="button"
                onClick={() => setMode("reader")}
                className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  mode === "reader"
                    ? "bg-gradient-to-r from-yellow-300 to-amber-300 text-slate-950"
                    : "text-slate-300 hover:bg-slate-800/80"
                }`}
              >
                {locale === "fr" ? "Lecteur" : "Reader"}
              </button>
            </div>

            {address && (
              mode === "author" ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <div className="theme-stat-panel p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Total</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-100">{summary.total}</p>
                  </div>
                  <div className="theme-stat-panel p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300/90">Approved</p>
                    <p className="mt-2 text-2xl font-semibold text-amber-100">{summary.approved}</p>
                  </div>
                  <div className="theme-stat-panel p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300/90">Listed</p>
                    <p className="mt-2 text-2xl font-semibold text-amber-100">{summary.listed}</p>
                  </div>
                  <div className="theme-stat-panel p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-yellow-300/90">Syncing</p>
                    <p className="mt-2 text-2xl font-semibold text-yellow-100">{summary.listing_submitted}</p>
                  </div>
                  <div className="theme-stat-panel p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-yellow-300/90">Pending</p>
                    <p className="mt-2 text-2xl font-semibold text-yellow-100">{summary.pending}</p>
                  </div>
                  <div className="theme-stat-panel p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-yellow-300/90">Ready To List</p>
                    <p className="mt-2 text-2xl font-semibold text-yellow-100">{summary.readyToList}</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="theme-stat-panel p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Purchased Books</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-100">{readerSummary.totalPurchased}</p>
                  </div>
                  <div className="theme-stat-panel p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-yellow-300/90">From Other Authors</p>
                    <p className="mt-2 text-2xl font-semibold text-yellow-100">{readerSummary.fromOthers}</p>
                  </div>
                  <div className="theme-stat-panel p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-yellow-300/90">Your Listed Titles</p>
                    <p className="mt-2 text-2xl font-semibold text-yellow-100">{readerSummary.fromMe}</p>
                  </div>
                  <div className="theme-stat-panel p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300/90">Priced Books</p>
                    <p className="mt-2 text-2xl font-semibold text-amber-100">{readerSummary.withPrice}</p>
                  </div>
                </div>
              )
            )}
          </section>

          {!address && (
            <div className="mt-6 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-6 text-yellow-200">
              {locale === "fr" ? "Connectez votre wallet pour voir et gerer vos livres." : "Connect your wallet to view and manage your books."}
            </div>
          )}

          {address && mode === "author" && (
            <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <div className="theme-panel-soft p-5 md:p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {locale === "fr" ? "Parcourir les livres" : "Browse Books"}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <input
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder={locale === "fr" ? "Rechercher par titre, description, etape..." : "Search title, description, stage..."}
                      className="theme-input h-11 px-3 text-sm md:col-span-2"
                    />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={filterStatus}
                      onChange={(e) => {
                        setFilterStatus(e.target.value as "all" | Book["status"]);
                        setCurrentPage(1);
                      }}
                      className="h-11 theme-card-compact px-3 text-sm text-slate-100 outline-none focus:border-yellow-300/50"
                    >
                      <option value="all">{locale === "fr" ? "Tous" : "All"}</option>
                      <option value="pending">{statusDisplay.pending}</option>
                      <option value="approved">{statusDisplay.approved}</option>
                      <option value="listing_submitted">{locale === "fr" ? "Synchronisation" : "Syncing"}</option>
                      <option value="listed">{statusDisplay.listed}</option>
                      <option value="rejected">{statusDisplay.rejected}</option>
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value as "newest" | "oldest" | "status");
                        setCurrentPage(1);
                      }}
                      className="h-11 theme-card-compact px-3 text-sm text-slate-100 outline-none focus:border-yellow-300/50"
                    >
                      <option value="newest">{locale === "fr" ? "Plus recents" : "Newest"}</option>
                      <option value="oldest">{locale === "fr" ? "Plus anciens" : "Oldest"}</option>
                      <option value="status">{locale === "fr" ? "Statut" : "Status"}</option>
                    </select>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Showing{" "}
                  {filteredBooks.length === 0
                    ? "0"
                    : `${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(
                        currentPage * PAGE_SIZE,
                        filteredBooks.length
                      )}`}{" "}
                  of {filteredBooks.length} filtered book
                  {filteredBooks.length === 1 ? "" : "s"} ({books.length} total).
                </p>
              </div>

              <div className="theme-panel-soft p-5 md:p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {locale === "fr" ? "Preparation des frais de listing" : "Listing Fee Readiness"}
                </p>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>USDT required</span>
                    <span>{requiredUsdt === null ? "Loading..." : formatUnits(requiredUsdt, 18)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Your USDT</span>
                    <span>{typeof usdtBalance === "bigint" ? formatUnits(usdtBalance, 18) : "Loading..."}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>USDT allowance</span>
                    <span>{typeof usdtAllowance === "bigint" ? formatUnits(usdtAllowance, 18) : "Loading..."}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-slate-300">
                    <span>RICO required</span>
                    <span>{requiredRico === null ? "Loading..." : formatUnits(requiredRico, 18)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Your RICO</span>
                    <span>{typeof ricoBalance === "bigint" ? formatUnits(ricoBalance, 18) : "Loading..."}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>RICO allowance</span>
                    <span>{typeof ricoAllowance === "bigint" ? formatUnits(ricoAllowance, 18) : "Loading..."}</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      approveToken(
                        usdtTokenAddress as `0x${string}` | undefined,
                        requiredUsdt,
                        "USDT"
                      )
                    }
                    disabled={approvingUsdt || !requiredUsdt || hasEnoughUsdtAllowance !== false}
                    className="theme-button-secondary px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    {approvingUsdt ? (locale === "fr" ? "Approbation USDT..." : "Approving USDT...") : (locale === "fr" ? "Approuver USDT" : "Approve USDT")}
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
                    disabled={approvingRico || !requiredRico || hasEnoughRicoAllowance !== false}
                    className="theme-button-secondary px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    {approvingRico ? (locale === "fr" ? "Approbation RICO..." : "Approving RICO...") : (locale === "fr" ? "Approuver RICO" : "Approve RICO")}
                  </button>
                </div>
                {tokenRequirementBlockReason ? (
                  <p className="mt-3 text-xs text-yellow-200/90">{locale === "fr" ? "Raison" : "Reason"}: {tokenRequirementBlockReason}</p>
                ) : (
                  <p className="mt-3 text-xs text-yellow-200">{locale === "fr" ? "Le wallet est pret pour les frais de listing." : "Wallet is ready for listing fees."}</p>
                )}
              </div>
            </section>
          )}

          {address && mode === "author" && (
            <section className="mt-6 theme-panel-soft p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {locale === "fr" ? "Chronologie des actions auteur" : "Author Actions Timeline"}
                </p>
                <span className="text-xs text-slate-500">{locale === "fr" ? "5 dernieres actions" : "Latest 5 actions"}</span>
              </div>
              {recentAuthorActions.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">
                  {locale === "fr" ? "Aucune action auteur synchronisee pour le moment." : "No synced author actions yet."}
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {recentAuthorActions.map((entry) => (
                    <div
                      key={`${entry.id}-${entry.lastActionTxHash}`}
                      className="theme-card-compact px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-100">
                          #{entry.onChainBookId || entry.id} • {entry.title}
                        </p>
                        <span className="text-xs text-slate-400">
                          {new Date(entry.updatedAt || entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-yellow-200/90">
                        Action: {entry.lastActionType}
                      </p>
                      {entry.lastActionTxHash ? (
                        <a
                          href={`https://bscscan.com/tx/${entry.lastActionTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs text-yellow-200 underline"
                        >
                          View Tx {entry.lastActionTxHash.slice(0, 10)}...
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {address && mode === "reader" && (
            <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
              <div className="theme-panel p-5 md:p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {locale === "fr" ? "Part communautaire" : "Community Share"}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-100">
                  {locale === "fr"
                    ? "Reclamez vos royalties lecteur"
                    : "Claim your reader royalty"}
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  {locale === "fr"
                    ? "Les distributions des achats de livres sont miroirrees ici selon vos points RicoMatrix."
                    : "Book purchase distributions are mirrored here based on your RicoMatrix points."}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="theme-stat-panel p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      {locale === "fr" ? "Disponible" : "Available"}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-amber-100">
                      {pendingReaderShareDisplay} USDT
                    </p>
                  </div>
                  <div className="theme-stat-panel p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      {locale === "fr" ? "Statut" : "Status"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-yellow-100">
                      {canClaimReaderRoyalty
                        ? locale === "fr"
                          ? "Pret a reclamer"
                          : "Ready to claim"
                        : locale === "fr"
                        ? "Aucune distribution en attente"
                        : "No pending distribution"}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={claimReaderRoyalty}
                    disabled={!canClaimReaderRoyalty || claimingReaderRoyalty}
                    className="theme-button-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {claimingReaderRoyalty
                      ? locale === "fr"
                        ? "Reclamation..."
                        : "Claiming..."
                      : locale === "fr"
                      ? "Reclamer la part"
                      : "Claim Share"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void refetchPendingReaderShare()}
                    className="theme-button-ghost px-4 py-2 text-xs uppercase tracking-[0.18em]"
                  >
                    {locale === "fr" ? "Actualiser" : "Refresh"}
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  {locale === "fr"
                    ? "Le contrat execute `claimCommunityShare()` et synchronise automatiquement vos points avant paiement."
                    : "The contract runs `claimCommunityShare()` and syncs your points before paying out."}
                </p>
              </div>

              <div className="theme-panel-soft p-5 md:p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {locale === "fr" ? "Catalogue lecteur" : "Reader Catalog"}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                  <input
                    value={readerQuery}
                    onChange={(e) => {
                      setReaderQuery(e.target.value);
                      setReaderPage(1);
                    }}
                    placeholder={locale === "fr" ? "Rechercher par titre, description, adresse auteur..." : "Search by title, description, author address..."}
                    className="theme-input h-11 px-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setReaderQuery("");
                      setReaderPage(1);
                    }}
                    className="theme-button-ghost px-4 py-2 text-xs uppercase tracking-wider"
                  >
                    {locale === "fr" ? "Effacer" : "Clear"}
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Showing{" "}
                  {filteredReaderBooks.length === 0
                    ? "0"
                    : `${(readerPage - 1) * READER_PAGE_SIZE + 1}-${Math.min(
                        readerPage * READER_PAGE_SIZE,
                        filteredReaderBooks.length
                      )}`}{" "}
                  of {filteredReaderBooks.length} purchased book
                  {filteredReaderBooks.length === 1 ? "" : "s"}.
                </p>
              </div>
            </section>
          )}

          {address && mode === "author" && loading && (
            <AuthorLoadingSkeleton />
          )}

          {address && mode === "author" && error && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
              {error}
            </div>
          )}

          {address && mode === "author" && !loading && !error && books.length === 0 && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/60 p-6 text-slate-300">
              You have not uploaded any books yet.
            </div>
          )}

          {address &&
            mode === "author" &&
            !loading &&
            !error &&
            books.length > 0 &&
            filteredBooks.length === 0 && (
            <div className="mt-6 theme-stat-panel p-6 text-slate-300">
              {locale === "fr"
                ? "Aucun livre ne correspond aux filtres actuels."
                : "No books match the current filters."}
            </div>
          )}

          {address && mode === "reader" && readerLoading && (
            <ReaderLoadingSkeleton />
          )}

          {address && mode === "reader" && readerError && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
              {readerError}
            </div>
          )}

          {address &&
            mode === "reader" &&
            !readerLoading &&
            !readerError &&
            readerBooks.length === 0 && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/60 p-6 text-slate-300">
                You have not purchased any books yet.
              </div>
            )}

          {address &&
            mode === "reader" &&
            !readerLoading &&
            !readerError &&
            readerBooks.length > 0 &&
            filteredReaderBooks.length === 0 && (
              <div className="mt-6 theme-stat-panel p-6 text-slate-300">
                {locale === "fr"
                  ? "Aucun livre achete ne correspond a votre recherche."
                  : "No purchased books match the current search."}
              </div>
            )}

          {address && mode === "author" && !loading && !error && filteredBooks.length > 0 && (
            <div className="theme-panel-soft mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-xs text-slate-300">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="theme-button-ghost px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-xs ${
                      page === currentPage
                        ? "theme-button-secondary text-yellow-100"
                        : "theme-button-ghost text-slate-200"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="theme-button-ghost px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {address &&
            mode === "reader" &&
            !readerLoading &&
            !readerError &&
            filteredReaderBooks.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 px-4 py-3">
                <p className="text-xs text-slate-300">
                  Page {readerPage} of {readerTotalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReaderPage((prev) => Math.max(1, prev - 1))}
                    disabled={readerPage === 1}
                    className="rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  {readerPageNumbers.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setReaderPage(page)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        page === readerPage
                          ? "border-yellow-400/50 bg-yellow-500/20 text-yellow-100"
                          : "border-slate-600 bg-slate-800/70 text-slate-200"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setReaderPage((prev) => Math.min(readerTotalPages, prev + 1))}
                    disabled={readerPage === readerTotalPages}
                    className="rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

          {mode === "author" && (
            <div className="mt-6 grid gap-6">
              {paginatedBooks.map((book) => {
                const syncState = syncMeta[book.id];
                const thumbnailUrl = book.ipfsCid
                  ? `${GATEWAY}/${book.ipfsCid}/thumbnail.jpg`
                  : "https://placehold.co/500x700/0f172a/e2e8f0?text=Book";
                const progress = Math.max(0, Math.min(100, book.processProgress ?? 0));

                return (
                  <article
                    key={book.id}
                    className="theme-panel-soft p-5 md:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
                  >
                    <div className="grid gap-5 md:grid-cols-[140px_1fr]">
                      <div className="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/70">
                        <img
                          src={thumbnailUrl}
                          alt={book.title}
                          className="aspect-[3/4] w-full object-cover"
                          loading="lazy"
                          onError={(event) => {
                            (event.target as HTMLImageElement).src =
                              "https://placehold.co/500x700/0f172a/e2e8f0?text=Book";
                          }}
                        />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-semibold text-slate-50">{book.title}</h3>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-300/80">
                              {book.description}
                            </p>
                          </div>
                          <StatusBadge status={book.status} labels={statusDisplay} />
                        </div>

                        <div className="mt-3 grid gap-2 text-xs md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-slate-300">
                            {locale === "fr" ? "ID interne" : "Record ID"}: <span className="font-semibold text-slate-100">#{book.id}</span>
                          </div>
                          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-slate-300">
                            {locale === "fr" ? "ID on-chain" : "On-chain ID"}:{" "}
                            <span className="font-semibold text-slate-100">{book.onChainBookId || "--"}</span>
                          </div>
                          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-slate-300">
                            {locale === "fr" ? "Prix" : "Price"}:{" "}
                            <span className="font-semibold text-yellow-200">
                              {displayUsdt(book.onchainPriceWei || book.priceWei)} USDT
                            </span>
                          </div>
                          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-slate-300">
                            {locale === "fr" ? "Etape" : "Stage"}:{" "}
                            <span className="font-semibold text-slate-100">
                              {book.processStage.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-950/55 p-3">
                          <div className="flex items-center justify-between text-xs text-slate-300">
                            <span>{book.processMessage || (locale === "fr" ? "Aucun message de statut disponible." : "No status message available.")}</span>
                            <span className="font-semibold text-slate-100">{progress}%</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800/80">
                            <div
                              className="h-full bg-gradient-to-r from-yellow-200 to-amber-400"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span>{commonCopy.labels.uploaded}: {new Date(book.createdAt).toLocaleString()}</span>
                          {book.updatedAt ? <span>{commonCopy.labels.updated}: {new Date(book.updatedAt).toLocaleString()}</span> : null}
                          {book.txHash ? (
                            <a
                              href={`https://bscscan.com/tx/${book.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-200 underline"
                            >
                              Tx: {truncateAddress(book.txHash, 10, 8)}
                            </a>
                          ) : null}
                          {syncState?.lastAttemptAt ? (
                            <span>
                              Last sync: {new Date(syncState.lastAttemptAt).toLocaleString()}
                            </span>
                          ) : null}
                        </div>

                        {book.status === "rejected" && (
                          <p className="mt-3 text-sm text-red-200">
                            {book.rejectionReason || (locale === "fr" ? "Rejete par la moderation IA." : "Rejected by AI moderation.")}
                            {book.similarityScore != null
                              ? ` Similarity: ${book.similarityScore.toFixed(2)}%.`
                              : ""}
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Link
                            href={`/library/${book.id}`}
                            className="rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 px-4 py-2.5 text-sm font-semibold text-black"
                          >
                            {commonCopy.buttons.openBookWorkspace}
                          </Link>
                          <p className="text-xs text-slate-400">
                            {locale === "fr" ? "Pour effectuer des actions (listing, sync, mise a jour, appel), ouvrez l'espace du livre." : "To perform actions (list, sync, update, appeal), open the book workspace."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {mode === "reader" && (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {paginatedReaderBooks.map((row) => {
                const onchainBookId = row.book_id || "";
                const isOwnBook =
                  !!address &&
                  row.author_address.toLowerCase() === address.toLowerCase();
                return (
                  <article
                    key={`${row.id || row.book_id}-${row.cid}`}
                    className="theme-panel-soft p-5 md:p-6 shadow-[0_18px_56px_rgba(0,0,0,0.3)]"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 text-lg font-semibold text-slate-100">
                        {row.title?.trim() || `Book #${onchainBookId}`}
                      </h3>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                          isOwnBook
                            ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
                            : "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
                        }`}
                      >
                        {isOwnBook ? (locale === "fr" ? "Votre livre" : "Your Book") : (locale === "fr" ? "Lecteur" : "Reader")}
                      </span>
                    </div>

                    <p className="line-clamp-3 text-sm text-slate-300/80">
                      {row.description?.trim() || (locale === "fr" ? "Aucune description fournie." : "No description provided.")}
                    </p>

                    <div className="mt-4 space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400">{commonCopy.labels.author}</span>
                        <AddressWithCopy value={row.author_address} label={locale === "fr" ? "Adresse auteur" : "Author address"} />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400">{commonCopy.labels.price}</span>
                        <span className="font-semibold text-yellow-200">{displayUsdt(row.price)} USDT</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400">{commonCopy.labels.bookId}</span>
                        <span className="font-medium">#{onchainBookId || "--"}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {onchainBookId ? (
                        <Link
                          href={`/library/read/${onchainBookId}`}
                          className="flex-1 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 px-4 py-2.5 text-center text-sm font-semibold text-black"
                        >
                          {locale === "fr" ? "Lire le livre" : "Read Book"}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="flex-1 cursor-not-allowed rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-slate-500"
                        >
                          {locale === "fr" ? "Synchronisation..." : "Syncing..."}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
