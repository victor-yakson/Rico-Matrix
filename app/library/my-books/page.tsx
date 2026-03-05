"use client";

import { Header } from "@/components/Navigation/Header";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { useEffect, useState } from "react";
import { Book } from "@/types/library";
import Link from "next/link";
import { formatUnits, parseUnits } from "viem";
import { useLibraryListing } from "@/hooks/useLibraryListing";
import { libraryContract } from "@/utils/contracts";
import { USDT_ABI } from "@/utils/constants";

type ListingDraft = {
  price: string;
  payoutWallet: string;
  submitting: boolean;
  uploading: boolean;
  error?: string;
};

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-200 border-yellow-400/30",
  approved: "bg-emerald-500/10 text-emerald-200 border-emerald-400/30",
  rejected: "bg-red-500/10 text-red-200 border-red-400/30",
  listed: "bg-sky-500/10 text-sky-200 border-sky-400/30",
};

const StatusBadge = ({ status }: { status: Book["status"] }) => (
  <span
    className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] ${
      statusStyles[status] || statusStyles.pending
    }`}
  >
    {status}
  </span>
);

const isListingReadyStage = (stage?: string) =>
  stage === "ready_for_listing" || stage === "listing_submitted";

const getListingBlockReason = (
  book: Book,
  wallet?: string,
  tokenReason?: string | null
): string | null => {
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

const getApiError = async (res: Response, fallback: string) => {
  const payload = (await res.json().catch(() => null)) as
    | { error?: unknown; reason?: unknown }
    | null;
  if (payload && typeof payload.error === "string") return payload.error;
  if (payload && typeof payload.reason === "string") return payload.reason;
  return fallback;
};

export default function MyBooksPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { listBookOnChain } = useLibraryListing();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, ListingDraft>>({});
  const [uploadFiles, setUploadFiles] = useState<Record<number, File | null>>({});
  const [approvingUsdt, setApprovingUsdt] = useState(false);
  const [approvingRico, setApprovingRico] = useState(false);

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

  const fetchBooks = async () => {
    if (!address) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/books?authorWallet=${address}`);
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load books");
      }
      setBooks(payload.books || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load books.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
    if (!address) return;
    const interval = setInterval(fetchBooks, 10000);
    return () => clearInterval(interval);
  }, [address]);

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
            price: "",
            payoutWallet: book.payoutWallet || book.authorWallet,
            submitting: false,
            uploading: false,
          };
        }
      }
      return next;
    });
  }, [books]);

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
    const blockReason = getListingBlockReason(
      book,
      address,
      tokenRequirementBlockReason
    );
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

    try {
      const priceWei = parseUnits(draft.price, 18);
      const cid = book.ipfsCid;
      if (!cid) {
        throw new Error("IPFS CID is missing. Restart from /library/upload.");
      }

      const saveRes = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorWallet: address,
          payoutWallet: draft.payoutWallet,
          priceWei: priceWei.toString(),
        }),
      });
      if (!saveRes.ok) {
        throw new Error(
          await getApiError(saveRes, "Failed to save listing details.")
        );
      }

      const txHash = await listBookOnChain({
        cid,
        priceWei,
        payoutWallet: draft.payoutWallet as `0x${string}`,
      });

      const listRes = await fetch(`/api/books/${book.id}/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorWallet: address,
          txHash,
          payoutWallet: draft.payoutWallet,
          priceWei: priceWei.toString(),
        }),
      });
      if (!listRes.ok) {
        throw new Error(await getApiError(listRes, "Failed to save tx hash."));
      }

      await fetchBooks();
    } catch (err: any) {
      setDrafts((prev) => ({
        ...prev,
        [book.id]: {
          ...prev[book.id],
          error: err?.message || "Listing failed.",
        },
      }));
    } finally {
      setDrafts((prev) => ({
        ...prev,
        [book.id]: { ...prev[book.id], submitting: false },
      }));
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

  const handleUploadIpfs = async (book: Book) => {
    setDrafts((prev) => ({
      ...prev,
      [book.id]: {
        ...prev[book.id],
        error:
          "This flow is single-phase. If it fails before IPFS completion, restart from /library/upload.",
      },
    }));
  };

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-2">
                Author Library
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-50">
                My books
              </h1>
              <p className="text-sm text-slate-400 mt-2">
                Track moderation results and list approved books on-chain.
              </p>
            </div>
            <Link
              href="/library/upload"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_0_24px_rgba(250,204,21,0.35)]"
            >
              Upload new book
            </Link>
          </div>

          {!address && (
            <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-6 text-yellow-200">
              Connect your wallet to view your books.
            </div>
          )}

          {address && loading && (
            <div className="rounded-2xl border border-white/10 bg-black/60 p-6 text-slate-200">
              Loading books...
            </div>
          )}
          {address && error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
              {error}
            </div>
          )}

          {address && !loading && !error && books.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/60 p-6 text-slate-300">
              You have not uploaded any books yet.
            </div>
          )}

          {address && (
            <div className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Listing Fee Check
              </p>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between text-slate-300">
                  <span>USDT required</span>
                  <span>
                    {requiredUsdt === null ? "Loading..." : formatUnits(requiredUsdt, 18)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Your USDT</span>
                  <span>
                    {typeof usdtBalance === "bigint"
                      ? formatUnits(usdtBalance, 18)
                      : "Loading..."}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>USDT allowance</span>
                  <span>
                    {typeof usdtAllowance === "bigint"
                      ? formatUnits(usdtAllowance, 18)
                      : "Loading..."}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>RICO required</span>
                  <span>
                    {requiredRico === null ? "Loading..." : formatUnits(requiredRico, 18)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Your RICO</span>
                  <span>
                    {typeof ricoBalance === "bigint"
                      ? formatUnits(ricoBalance, 18)
                      : "Loading..."}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>RICO allowance</span>
                  <span>
                    {typeof ricoAllowance === "bigint"
                      ? formatUnits(ricoAllowance, 18)
                      : "Loading..."}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
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
                    approvingUsdt || !requiredUsdt || hasEnoughUsdtAllowance !== false
                  }
                  className="rounded-lg border border-yellow-400/40 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-200 disabled:opacity-50"
                >
                  {approvingUsdt ? "Approving USDT..." : "Approve USDT"}
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
                    approvingRico || !requiredRico || hasEnoughRicoAllowance !== false
                  }
                  className="rounded-lg border border-yellow-400/40 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-200 disabled:opacity-50"
                >
                  {approvingRico ? "Approving RICO..." : "Approve RICO"}
                </button>
              </div>
              {tokenRequirementBlockReason ? (
                <p className="mt-3 text-xs text-yellow-200/90">
                  Reason: {tokenRequirementBlockReason}
                </p>
              ) : (
                <p className="mt-3 text-xs text-emerald-300">
                  Wallet is ready for listing fees.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-6">
            {books.map((book) => {
              const draft = drafts[book.id];
              const blockReason = getListingBlockReason(
                book,
                address,
                tokenRequirementBlockReason
              );
              return (
                <div
                  key={book.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/80 p-6 shadow-[0_0_28px_rgba(0,0,0,0.8)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-50">
                        {book.title}
                      </h3>
                      <p className="text-sm text-slate-400">
                        Uploaded on{" "}
                        {new Date(book.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge status={book.status} />
                  </div>

                  <p className="text-sm text-slate-400 mb-4">
                    {book.description}
                  </p>

                  {book.status === "rejected" && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                      {book.rejectionReason || "Rejected by AI moderation."}
                      {book.similarityScore != null && (
                        <div className="mt-2 text-xs text-red-200/80">
                          Similarity: {book.similarityScore.toFixed(2)}%
                        </div>
                      )}
                      <div className="mt-3">
                        <Link
                          href="/library/upload"
                          className="inline-flex items-center text-xs uppercase tracking-[0.2em] text-yellow-200 hover:text-yellow-100"
                        >
                          Upload New Version
                        </Link>
                      </div>
                    </div>
                  )}

                  {book.status === "pending" && (
                    <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 p-4">
                      <div className="flex items-center justify-between text-sm text-yellow-200">
                        <span>
                          {book.processMessage || "Under AI review and processing."}
                        </span>
                        <span>{book.processProgress ?? 0}%</span>
                      </div>
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-yellow-900/40">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-300 to-amber-300"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, book.processProgress ?? 0)
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-yellow-100/80">
                        Stage: {book.processStage}
                      </p>

                      {book.processStage === "ipfs_failed" && (
                        <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                          <p className="text-sm text-yellow-200">
                            Upload/moderation/IPFS is a single phase. This failed flow cannot be resumed.
                          </p>
                          <Link
                            href="/library/upload"
                            className="mt-3 inline-flex items-center text-xs uppercase tracking-[0.2em] text-yellow-200"
                          >
                            Start Upload Again
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {book.status === "listed" && (
                    <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-4 text-sm text-sky-200">
                      Listed on-chain. Tx:{" "}
                      {book.txHash ? (
                        <a
                          href={`https://bscscan.com/tx/${book.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          {book.txHash.slice(0, 10)}...
                        </a>
                      ) : (
                        "Pending"
                      )}
                    </div>
                  )}

                  {book.status === "approved" && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          IPFS CID
                        </label>
                        <input
                          value={book.ipfsCid || "Not uploaded yet"}
                          readOnly
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          Price (USDT)
                        </label>
                        <input
                          value={draft?.price || ""}
                          onChange={(e) =>
                            handleDraftChange(
                              book.id,
                              "price",
                              e.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                          placeholder="0.00"
                        />
                      </div>
                      {!book.ipfsCid && (
                        <div className="md:col-span-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                          <p className="text-sm text-yellow-200">
                            CID missing for this record. Restart from upload to run the full pipeline again.
                          </p>
                          <Link
                            href="/library/upload"
                            className="mt-3 inline-flex items-center text-xs uppercase tracking-[0.2em] text-yellow-200"
                          >
                            Start Upload Again
                          </Link>
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          Payout Wallet
                        </label>
                        <input
                          value={draft?.payoutWallet || ""}
                          onChange={(e) =>
                            handleDraftChange(
                              book.id,
                              "payoutWallet",
                              e.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                          placeholder="0x..."
                        />
                      </div>

                      {draft?.error && (
                        <div className="md:col-span-2 text-xs text-red-300">
                          {draft.error}
                        </div>
                      )}

                      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => handleList(book)}
                          disabled={
                            draft?.submitting ||
                            !!blockReason
                          }
                          className="rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
                        >
                          {draft?.submitting
                            ? "Listing..."
                            : blockReason
                            ? "Not Ready For Listing"
                            : "List On Blockchain"}
                        </button>
                        <Link
                          href={`/library/${book.id}`}
                          className="text-xs uppercase tracking-[0.2em] text-yellow-200"
                        >
                          View details
                        </Link>
                      </div>
                      {blockReason && (
                        <div className="md:col-span-2 text-xs text-yellow-200/90">
                          Reason: {blockReason}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
