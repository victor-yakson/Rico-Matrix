"use client";

import { Header } from "@/components/Navigation/Header";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { useEffect, useMemo, useRef, useState } from "react";
import { libraryContract } from "@/utils/contracts";

const GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";
const PAGE_SIZE = 24;

type MarketBook = {
  id?: number;
  book_id: string | null;
  author_address: string;
  price: string | null;
  title?: string | null;
  description?: string | null;
  status?: "approved" | "listed" | "listing_submitted";
  cid: string;
  created_at?: string;
  updated_at?: string;
};

type SortKey = "newest" | "oldest" | "price_high" | "price_low" | "title";
type PriceFilter = "all" | "under_10" | "10_100" | "over_100";

type DecoratedBook = MarketBook & {
  key: string;
  persistentId: string;
  normalizedTitle: string;
  normalizedDescription: string;
  priceUsdt: number;
  category: string;
  createdAtMs: number;
};

type TopAuthor = {
  author: string;
  booksCount: number;
  avgPriceUsdt: number;
  latestCreatedAt: number;
};

const normalize = (value?: string | null) =>
  (value || "").replace(/\s+/g, " ").trim();

const shortAddress = (value: string) => `${value.slice(0, 6)}...${value.slice(-4)}`;

const getBookKey = (book: MarketBook, index = 0) =>
  String(book.id ?? book.book_id ?? `${book.cid}-${book.created_at || index}`);

const getPersistentBookId = (book: MarketBook) =>
  book.book_id ? `book:${book.book_id}` : `cid:${book.cid}`;

const toPriceWei = (value?: string | null) => {
  if (!value || !/^\d+$/.test(value)) return BigInt(0);
  return BigInt(value);
};

const weiToUsdtNumber = (value?: string | null) => {
  if (!value || !/^\d+$/.test(value)) return 0;
  const raw = formatUnits(BigInt(value), 18);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatUsdt = (value?: string | null) => {
  const amount = weiToUsdtNumber(value);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
};

const formatUsdtNumber = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

const detectCategory = (book: MarketBook) => {
  const hay = `${normalize(book.title)} ${normalize(book.description)}`.toLowerCase();
  if (/(crypto|blockchain|defi|token|web3|nft)/.test(hay)) return "Crypto";
  if (/(wealth|money|finance|trading|economy|investment)/.test(hay)) return "Finance";
  if (/(mindset|self|habit|purpose|growth|motivation)/.test(hay)) return "Self-Help";
  if (/(business|startup|marketing|leadership|sales)/.test(hay)) return "Business";
  if (/(code|programming|software|technology|ai|data)/.test(hay)) return "Technology";
  if (/(school|learn|education|study|guide|course)/.test(hay)) return "Education";
  return "General";
};

const matchesPriceFilter = (priceUsdt: number, filter: PriceFilter) => {
  if (filter === "under_10") return priceUsdt < 10;
  if (filter === "10_100") return priceUsdt >= 10 && priceUsdt <= 100;
  if (filter === "over_100") return priceUsdt > 100;
  return true;
};

const WishlistButton = ({
  saved,
  onClick,
  className,
}: {
  saved: boolean;
  onClick: () => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={
      className ||
      "inline-flex items-center justify-center rounded-lg border border-slate-600 bg-black/50 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-amber-400/40"
    }
  >
    {saved ? "Saved" : "Save"}
  </button>
);

const BookRailCard = ({
  book,
  saved,
  onToggleSave,
}: {
  book: DecoratedBook;
  saved: boolean;
  onToggleSave: () => void;
}) => (
  <article className="min-w-[220px] max-w-[220px] overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60">
    <div className="relative aspect-[3/4] bg-slate-800">
      <img
        src={`${GATEWAY}/${book.cid}/thumbnail.jpg`}
        alt={book.normalizedTitle}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={(event) => {
          (event.target as HTMLImageElement).src =
            "https://placehold.co/400x560/0f172a/e2e8f0?text=Book";
        }}
      />
      <div className="absolute right-2 top-2">
        <WishlistButton saved={saved} onClick={onToggleSave} />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2">
        <p className="line-clamp-2 text-xs font-semibold text-slate-100">
          {book.normalizedTitle}
        </p>
      </div>
    </div>
    <div className="p-3">
      <p className="text-[11px] text-slate-400">{book.category}</p>
      <p className="mt-1 text-sm font-semibold text-amber-200">
        {formatUsdt(book.price)} USDT
      </p>
      {book.book_id ? (
        <Link
          href={`/library/book/${book.book_id}`}
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-amber-400/40 bg-amber-400/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-amber-100 hover:bg-amber-400/25"
        >
          View Book
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
        >
          Sync Pending
        </button>
      )}
    </div>
  </article>
);

export default function LibraryPage() {
  const { address } = useAccount();
  const { data: owner } = useReadContract({
    ...libraryContract,
    functionName: "owner",
  });
  const { data: pendingOwner } = useReadContract({
    ...libraryContract,
    functionName: "pendingOwner",
  });

  const canAccessAdmin = useMemo(() => {
    if (!address) return false;
    const connected = address.toLowerCase();
    const ownerAddress =
      typeof owner === "string" ? owner.toLowerCase() : "";
    const pendingOwnerAddress =
      typeof pendingOwner === "string" ? pendingOwner.toLowerCase() : "";
    return connected === ownerAddress || connected === pendingOwnerAddress;
  }, [address, owner, pendingOwner]);

  const [books, setBooks] = useState<MarketBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedAuthor, setSelectedAuthor] = useState("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [hasReadyBook, setHasReadyBook] = useState(false);
  const [hasListedBook, setHasListedBook] = useState(false);
  const [readyWorkspaceHref, setReadyWorkspaceHref] = useState<string | null>(null);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const wishlistStorageKey = useMemo(
    () => `library:wishlist:${address?.toLowerCase() || "guest"}`,
    [address]
  );

  useEffect(() => {
    document.body.style.overflow = mobileFiltersOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileFiltersOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(wishlistStorageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(parsed)) {
        setWishlistIds(parsed.filter((item) => typeof item === "string"));
      } else {
        setWishlistIds([]);
      }
    } catch {
      setWishlistIds([]);
    }
  }, [wishlistStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(wishlistStorageKey, JSON.stringify(wishlistIds));
  }, [wishlistIds, wishlistStorageKey]);

  const fetchBooks = async (nextOffset: number, append: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (append) setIsLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/marketplace/books?status=listed&limit=${PAGE_SIZE}&offset=${nextOffset}`,
        { cache: "no-store", signal: controller.signal }
      );
      const payload = (await res.json()) as { books?: MarketBook[]; error?: string };
      if (!res.ok) {
        throw new Error(payload.error || "Failed to load marketplace.");
      }

      const incoming = payload.books || [];
      setBooks((prev) => {
        if (!append) return incoming;
        const map = new Map<string, MarketBook>();
        for (const book of prev) map.set(getBookKey(book), book);
        for (const book of incoming) map.set(getBookKey(book), book);
        return Array.from(map.values());
      });
      setHasMore(incoming.length === PAGE_SIZE);
      setOffset(nextOffset);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setError(err?.message || "Failed to load marketplace.");
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchBooks(0, false);
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!address) {
      setHasReadyBook(false);
      setHasListedBook(false);
      setReadyWorkspaceHref(null);
      return;
    }

    let active = true;
    const pollReady = async () => {
      try {
        const [approvedRes, listedRes] = await Promise.all([
          fetch(
            `/api/marketplace/books?authorAddress=${encodeURIComponent(
              address
            )}&status=approved&limit=1`,
            { cache: "no-store" }
          ),
          fetch(
            `/api/marketplace/books?authorAddress=${encodeURIComponent(
              address
            )}&status=listed&limit=1`,
            { cache: "no-store" }
          ),
        ]);
        const approvedPayload = (await approvedRes.json()) as { books?: MarketBook[] };
        const listedPayload = (await listedRes.json()) as { books?: MarketBook[] };
        if (!active) return;
        const approvedBooks = approvedPayload.books || [];
        setHasReadyBook(approvedBooks.length > 0);
        const readyBookRecordId = approvedBooks.find(
          (item) => typeof item.id === "number" && Number.isFinite(item.id)
        )?.id;
        setReadyWorkspaceHref(
          typeof readyBookRecordId === "number" ? `/library/${readyBookRecordId}` : null
        );
        setHasListedBook((listedPayload.books || []).length > 0);
      } catch {
        if (!active) return;
        setHasReadyBook(false);
        setHasListedBook(false);
        setReadyWorkspaceHref(null);
      }
    };

    pollReady();
    const timer = setInterval(pollReady, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [address]);

  const decoratedBooks = useMemo<DecoratedBook[]>(
    () =>
      books.map((book, index) => ({
        ...book,
        key: getBookKey(book, index),
        persistentId: getPersistentBookId(book),
        normalizedTitle: normalize(book.title) || `Book #${book.book_id || index + 1}`,
        normalizedDescription: normalize(book.description) || "No description available.",
        priceUsdt: weiToUsdtNumber(book.price),
        category: detectCategory(book),
        createdAtMs: new Date(book.created_at || 0).getTime() || 0,
      })),
    [books]
  );

  const wishlistSet = useMemo(() => new Set(wishlistIds), [wishlistIds]);

  const toggleWishlist = (persistentId: string) => {
    setWishlistIds((prev) =>
      prev.includes(persistentId)
        ? prev.filter((id) => id !== persistentId)
        : [...prev, persistentId]
    );
  };

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const book of decoratedBooks) {
      counts.set(book.category, (counts.get(book.category) || 0) + 1);
    }
    const ranked = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
    return ["All", ...ranked];
  }, [decoratedBooks]);

  const authorOptions = useMemo(() => {
    const unique = Array.from(new Set(decoratedBooks.map((book) => book.author_address)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [decoratedBooks]);

  const topAuthors = useMemo<TopAuthor[]>(() => {
    const map = new Map<string, { count: number; sumPrice: number; latest: number }>();
    for (const book of decoratedBooks) {
      const current = map.get(book.author_address) || {
        count: 0,
        sumPrice: 0,
        latest: 0,
      };
      current.count += 1;
      current.sumPrice += book.priceUsdt;
      current.latest = Math.max(current.latest, book.createdAtMs);
      map.set(book.author_address, current);
    }
    return Array.from(map.entries())
      .map(([author, data]) => ({
        author,
        booksCount: data.count,
        avgPriceUsdt: data.count > 0 ? data.sumPrice / data.count : 0,
        latestCreatedAt: data.latest,
      }))
      .sort((a, b) => {
        if (a.booksCount !== b.booksCount) return b.booksCount - a.booksCount;
        if (a.avgPriceUsdt !== b.avgPriceUsdt) return b.avgPriceUsdt - a.avgPriceUsdt;
        return b.latestCreatedAt - a.latestCreatedAt;
      })
      .slice(0, 6);
  }, [decoratedBooks]);

  const featuredBooks = useMemo(
    () =>
      [...decoratedBooks]
        .sort((a, b) => {
          if (a.priceUsdt === b.priceUsdt) return b.createdAtMs - a.createdAtMs;
          return b.priceUsdt - a.priceUsdt;
        })
        .slice(0, 8),
    [decoratedBooks]
  );

  const trendingBooks = useMemo(
    () =>
      [...decoratedBooks]
        .sort((a, b) => b.createdAtMs - a.createdAtMs)
        .slice(0, 10),
    [decoratedBooks]
  );

  const wishlistBooks = useMemo(
    () => decoratedBooks.filter((book) => wishlistSet.has(book.persistentId)),
    [decoratedBooks, wishlistSet]
  );

  const filteredBooks = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const base = decoratedBooks.filter((book) => {
      const matchesSearch =
        !needle ||
        book.normalizedTitle.toLowerCase().includes(needle) ||
        book.normalizedDescription.toLowerCase().includes(needle) ||
        book.author_address.toLowerCase().includes(needle) ||
        (book.book_id || "").toLowerCase().includes(needle);
      const matchesCategory =
        selectedCategory === "All" || book.category === selectedCategory;
      const matchesPrice = matchesPriceFilter(book.priceUsdt, priceFilter);
      const matchesAuthor =
        selectedAuthor === "all" || book.author_address.toLowerCase() === selectedAuthor.toLowerCase();
      const matchesWishlist = !showWishlistOnly || wishlistSet.has(book.persistentId);
      return (
        matchesSearch &&
        matchesCategory &&
        matchesPrice &&
        matchesAuthor &&
        matchesWishlist
      );
    });

    return base.sort((a, b) => {
      if (sortBy === "title") return a.normalizedTitle.localeCompare(b.normalizedTitle);
      if (sortBy === "price_high") return b.priceUsdt - a.priceUsdt;
      if (sortBy === "price_low") return a.priceUsdt - b.priceUsdt;
      return sortBy === "oldest" ? a.createdAtMs - b.createdAtMs : b.createdAtMs - a.createdAtMs;
    });
  }, [
    decoratedBooks,
    search,
    selectedCategory,
    priceFilter,
    selectedAuthor,
    showWishlistOnly,
    sortBy,
    wishlistSet,
  ]);

  const stats = useMemo(() => {
    const total = decoratedBooks.length;
    const authors = new Set(
      decoratedBooks.map((book) => book.author_address.toLowerCase())
    ).size;
    const sumWei = decoratedBooks.reduce(
      (acc, book) => acc + toPriceWei(book.price),
      BigInt(0)
    );
    const avgWei = total > 0 ? sumWei / BigInt(total) : BigInt(0);
    return {
      total,
      authors,
      avgPrice: formatUsdt(avgWei.toString()),
      wishlist: wishlistBooks.length,
    };
  }, [decoratedBooks, wishlistBooks.length]);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.14),transparent_45%),linear-gradient(180deg,#020617_0%,#020617_100%)]">
        <div className="container mx-auto px-4 py-10">
          <section className="rounded-3xl border border-slate-700/60 bg-slate-900/50 p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-amber-300/80">
                  RICO Marketplace
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-50 md:text-4xl">
                  Discover, buy, and read verified books
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300/80">
                  Every listed book has passed validation, moderation, and IPFS packaging before
                  on-chain listing.
                </p>
              </div>
              <nav className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-950/60 p-2 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
                <Link
                  href="/library"
                  className="rounded-xl border border-amber-400/40 bg-amber-400/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100"
                >
                  Marketplace
                </Link>
                <Link
                  href="/library/upload"
                  className="rounded-xl border border-slate-600 bg-slate-800/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100 hover:bg-slate-700/80"
                >
                  Launch A Book
                </Link>
                <Link
                  href="/library/my-books?mode=author"
                  className="rounded-xl border border-slate-600 bg-slate-800/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100 hover:bg-slate-700/80"
                >
                  My Library
                </Link>
                {hasListedBook ? (
                  <Link
                    href="/library/my-books?mode=author"
                    className="rounded-xl border border-emerald-400/40 bg-emerald-400/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100 hover:bg-emerald-400/25"
                  >
                    Author Dashboard
                  </Link>
                ) : (
                  <span className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Dashboard unlocks after listing
                  </span>
                )}
                {canAccessAdmin ? (
                  <Link
                    href="/library/admin"
                    className="rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100 hover:bg-sky-500/20"
                  >
                    Admin Console
                  </Link>
                ) : null}
              </nav>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-amber-400/25 bg-[linear-gradient(120deg,rgba(245,158,11,0.08),rgba(14,116,144,0.08))] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-200/90">
                  Author Program
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-100">
                  Become A Verified Author On RicoMatrix
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-300/85">
                  Publish books with anti-piracy checks, decentralized IPFS packaging, and on-chain ownership. Build your reader base and monetize directly.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/library/upload"
                  className="rounded-xl border border-amber-400/40 bg-amber-400/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-amber-100 hover:bg-amber-400/25"
                >
                  Launch A Book
                </Link>
                {hasListedBook ? (
                  <Link
                    href="/library/my-books?mode=author"
                    className="rounded-xl border border-slate-600 bg-slate-800/70 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-100 hover:bg-slate-700/70"
                  >
                    Author Dashboard
                  </Link>
                ) : (
                  <span className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    List your first book to access dashboard
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">1. Upload</p>
                <p className="mt-1 text-sm text-slate-100">
                  Add PDF + thumbnail with your author wallet.
                </p>
              </div>
              <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">2. Verify</p>
                <p className="mt-1 text-sm text-slate-100">
                  AI moderation, duplicate checks, and IPFS packaging happen automatically.
                </p>
              </div>
              <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">3. List</p>
                <p className="mt-1 text-sm text-slate-100">
                  Set price and payout wallet, then publish on-chain.
                </p>
              </div>
            </div>
          </section>

          {hasReadyBook && (
            <section className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 md:flex md:items-center md:justify-between">
              <p className="text-sm text-emerald-100">
                You have approved uploads ready for blockchain listing.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 md:mt-0">
                <Link
                  href={readyWorkspaceHref || "/library/my-books?mode=author"}
                  className="inline-flex rounded-lg border border-emerald-300/40 bg-emerald-400/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-100"
                >
                  Open Book Workspace
                </Link>
              </div>
            </section>
          )}

          <section className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Listed Books</p>
              <p className="mt-2 text-2xl font-semibold text-slate-50">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Active Authors</p>
              <p className="mt-2 text-2xl font-semibold text-slate-50">{stats.authors}</p>
            </div>
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Average Price</p>
              <p className="mt-2 text-2xl font-semibold text-slate-50">{stats.avgPrice} USDT</p>
            </div>
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Wishlist</p>
              <p className="mt-2 text-2xl font-semibold text-slate-50">{stats.wishlist}</p>
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Featured Picks</h2>
              <span className="text-xs uppercase tracking-wider text-slate-400">Top priced books</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {featuredBooks.map((book) => (
                <BookRailCard
                  key={`featured-${book.key}`}
                  book={book}
                  saved={wishlistSet.has(book.persistentId)}
                  onToggleSave={() => toggleWishlist(book.persistentId)}
                />
              ))}
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Trending Now</h2>
              <span className="text-xs uppercase tracking-wider text-slate-400">Newest additions</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {trendingBooks.map((book) => (
                <BookRailCard
                  key={`trending-${book.key}`}
                  book={book}
                  saved={wishlistSet.has(book.persistentId)}
                  onToggleSave={() => toggleWishlist(book.persistentId)}
                />
              ))}
            </div>
          </section>

          {wishlistBooks.length > 0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-100">My Wishlist</h2>
                <button
                  type="button"
                  onClick={() => setShowWishlistOnly((prev) => !prev)}
                  className="rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-100"
                >
                  {showWishlistOnly ? "Show All Books" : "Show Wishlist Only"}
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {wishlistBooks.map((book) => (
                  <BookRailCard
                    key={`wishlist-${book.key}`}
                    book={book}
                    saved={wishlistSet.has(book.persistentId)}
                    onToggleSave={() => toggleWishlist(book.persistentId)}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Top Authors</h2>
              <span className="text-xs uppercase tracking-wider text-slate-400">
                By listed books
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {topAuthors.map((author) => (
                <div
                  key={author.author}
                  className="rounded-xl border border-slate-700 bg-slate-900/70 p-4"
                >
                  <p className="text-sm font-semibold text-slate-100">
                    {shortAddress(author.author)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {author.booksCount} listed books
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Avg: {formatUsdtNumber(author.avgPriceUsdt)} USDT
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedAuthor(author.author)}
                    className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-100"
                  >
                    Browse Author
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="sticky top-16 z-20 mt-8 rounded-2xl border border-slate-700/60 bg-slate-900/80 p-4 backdrop-blur">
            <div className="hidden gap-3 md:grid md:grid-cols-[1fr_170px_190px_170px_170px_170px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, description, author, or book ID..."
                className="h-11 rounded-xl border border-slate-700 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none focus:border-amber-400/50"
              />
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="h-11 rounded-xl border border-slate-700 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none focus:border-amber-400/50"
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select
                value={selectedAuthor}
                onChange={(event) => setSelectedAuthor(event.target.value)}
                className="h-11 rounded-xl border border-slate-700 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none focus:border-amber-400/50"
              >
                <option value="all">All Authors</option>
                {authorOptions.map((author) => (
                  <option key={author} value={author}>
                    {shortAddress(author)}
                  </option>
                ))}
              </select>
              <select
                value={priceFilter}
                onChange={(event) => setPriceFilter(event.target.value as PriceFilter)}
                className="h-11 rounded-xl border border-slate-700 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none focus:border-amber-400/50"
              >
                <option value="all">All Prices</option>
                <option value="under_10">Under 10 USDT</option>
                <option value="10_100">10 - 100 USDT</option>
                <option value="over_100">Above 100 USDT</option>
              </select>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortKey)}
                className="h-11 rounded-xl border border-slate-700 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none focus:border-amber-400/50"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="price_high">Price High → Low</option>
                <option value="price_low">Price Low → High</option>
                <option value="title">Title A → Z</option>
              </select>
              <button
                type="button"
                onClick={() => setShowWishlistOnly((prev) => !prev)}
                className="h-11 rounded-xl border border-slate-600 bg-slate-900/70 px-4 text-xs font-semibold uppercase tracking-wider text-slate-100 hover:bg-slate-800"
              >
                {showWishlistOnly ? "All Books" : "Wishlist Only"}
              </button>
            </div>
            <div className="flex items-center justify-between md:hidden">
              <div className="text-sm text-slate-200">{filteredBooks.length} books</div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="rounded-lg border border-slate-600 bg-slate-800/70 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-100"
              >
                Filters
              </button>
            </div>
          </section>

          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 md:hidden">
              <div className="absolute right-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto border-l border-slate-700 bg-slate-950 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-100">
                    Filter Marketplace
                  </h3>
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(false)}
                    className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search books..."
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100 outline-none focus:border-amber-400/50"
                  />
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100"
                  >
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedAuthor}
                    onChange={(event) => setSelectedAuthor(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100"
                  >
                    <option value="all">All Authors</option>
                    {authorOptions.map((author) => (
                      <option key={author} value={author}>
                        {shortAddress(author)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={priceFilter}
                    onChange={(event) => setPriceFilter(event.target.value as PriceFilter)}
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100"
                  >
                    <option value="all">All Prices</option>
                    <option value="under_10">Under 10 USDT</option>
                    <option value="10_100">10 - 100 USDT</option>
                    <option value="over_100">Above 100 USDT</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortKey)}
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="price_high">Price High → Low</option>
                    <option value="price_low">Price Low → High</option>
                    <option value="title">Title A → Z</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowWishlistOnly((prev) => !prev)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-100"
                  >
                    {showWishlistOnly ? "Show All Books" : "Wishlist Only"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(false)}
                    className="mt-2 w-full rounded-xl border border-amber-400/40 bg-amber-400/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-amber-100"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          )}

          {loading ? (
            <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40 p-3"
                >
                  <div className="aspect-[3/4] rounded-xl bg-slate-800/70" />
                  <div className="mt-3 h-4 w-3/4 rounded bg-slate-800/70" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-slate-800/70" />
                </div>
              ))}
            </section>
          ) : filteredBooks.length === 0 ? (
            <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/30 p-10 text-center">
              <p className="text-sm text-slate-300">No books match your current filters.</p>
            </section>
          ) : (
            <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredBooks.map((book) => (
                <article
                  key={book.key}
                  className="group overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/50 transition hover:-translate-y-1 hover:border-amber-400/40"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-slate-800">
                    <img
                      src={`${GATEWAY}/${book.cid}/thumbnail.jpg`}
                      alt={book.normalizedTitle}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                      onError={(event) => {
                        (event.target as HTMLImageElement).src =
                          "https://placehold.co/500x700/0f172a/e2e8f0?text=Book";
                      }}
                    />
                    <div className="absolute left-3 top-3 rounded-full border border-slate-200/20 bg-black/45 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-100">
                      {book.category}
                    </div>
                    <div className="absolute right-3 top-3">
                      <WishlistButton
                        saved={wishlistSet.has(book.persistentId)}
                        onClick={() => toggleWishlist(book.persistentId)}
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3">
                      <p className="line-clamp-2 text-sm font-semibold text-slate-100">
                        {book.normalizedTitle}
                      </p>
                      <p className="mt-1 text-xs font-medium text-amber-200">
                        {formatUsdt(book.price)} USDT
                      </p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 text-xs text-slate-400">
                      {book.normalizedDescription}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{shortAddress(book.author_address)}</span>
                      <span>
                        {book.created_at
                          ? new Date(book.created_at).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                    {book.book_id ? (
                      <Link
                        href={`/library/book/${book.book_id}`}
                        className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-amber-400/40 bg-amber-400/15 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-amber-100 hover:bg-amber-400/25"
                      >
                        View Book
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        Sync Pending
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}

          {!loading && hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => fetchBooks(offset + PAGE_SIZE, true)}
                disabled={isLoadingMore}
                className="rounded-xl border border-slate-600 bg-slate-900/70 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800 disabled:opacity-50"
              >
                {isLoadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
