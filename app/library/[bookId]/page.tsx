"use client";

import { Header } from "@/components/Navigation/Header";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Book } from "@/types/library";
import Link from "next/link";
import { formatUnits, parseUnits } from "viem";
import { useLibraryListing } from "@/hooks/useLibraryListing";
import { libraryContract } from "@/utils/contracts";
import { USDT_ABI } from "@/utils/constants";

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
  wallet?: string
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

export default function BookDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { listBookOnChain } = useLibraryListing();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [payoutWallet, setPayoutWallet] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [listingError, setListingError] = useState<string | null>(null);
  const [approvingUsdt, setApprovingUsdt] = useState(false);
  const [approvingRico, setApprovingRico] = useState(false);

  const bookId = Number(params?.bookId ?? 0);

  const fetchBook = async () => {
    if (!Number.isFinite(bookId)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to load book");
      setBook(payload.book);
      setPrice(
        payload.book?.priceWei
          ? (Number(payload.book.priceWei) / 1e18).toString()
          : ""
      );
      setPayoutWallet(
        payload.book?.payoutWallet || payload.book?.authorWallet || ""
      );
    } catch (err: any) {
      setError(err?.message || "Failed to load book.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBook();
    const interval = setInterval(fetchBook, 10000);
    return () => clearInterval(interval);
  }, [bookId]);

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

  const handleList = async () => {
    if (!book) return;
    const blockReason = getListingBlockReason(book, address);
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
    setListingError(null);
    try {
      const priceWei = parseUnits(price, 18);
      const cid = book.ipfsCid;
      if (!cid) {
        throw new Error("IPFS CID is missing. Restart from /library/upload.");
      }

      const saveRes = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorWallet: address,
          payoutWallet,
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
        payoutWallet: payoutWallet as `0x${string}`,
      });

      const listRes = await fetch(`/api/books/${book.id}/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorWallet: address,
          txHash,
          payoutWallet,
          priceWei: priceWei.toString(),
        }),
      });
      if (!listRes.ok) {
        throw new Error(await getApiError(listRes, "Failed to save tx hash."));
      }

      await fetchBook();
      router.push("/library/my-books");
    } catch (err: any) {
      setListingError(err?.message || "Listing failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadIpfs = async () => {
    setListingError(
      "This flow is single-phase. If IPFS hosting fails, restart from /library/upload."
    );
  };

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-2">
                Book Details
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-50">
                {book?.title || "Loading..."}
              </h1>
            </div>
            {book && <StatusBadge status={book.status} />}
          </div>

          {loading && (
            <div className="rounded-2xl border border-white/10 bg-black/60 p-6 text-slate-200">
              Loading book...
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
              {error}
            </div>
          )}

          {book && !loading && (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-6">
                <p className="text-sm text-slate-400 mb-4">
                  {book.description}
                </p>
                <div className="text-xs text-slate-500">
                  Created: {new Date(book.createdAt).toLocaleString()}
                </div>

                {book.status === "rejected" && (
                  <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                    {book.rejectionReason || "Rejected by AI moderation."}
                  </div>
                )}

                {book.status === "pending" && (
                  <div className="mt-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                    <div className="flex items-center justify-between text-sm text-yellow-200">
                      <span>
                        {book.processMessage ||
                          "Book is still being processed. Keep this flow active."}
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
                  </div>
                )}

                {book.status === "listed" && (
                  <div className="mt-5 rounded-xl border border-sky-400/30 bg-sky-500/10 p-4 text-sm text-sky-200">
                    Listed on-chain. Tx:{" "}
                    {book.txHash ? (
                      <a
                        href={`https://bscscan.com/tx/${book.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {book.txHash}
                      </a>
                    ) : (
                      "Pending"
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/60 p-6">
                <h3 className="text-lg font-semibold text-slate-50 mb-4">
                  Blockchain listing
                </h3>

                {book.status !== "approved" && (
                  <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                    Only approved books can be listed on-chain.
                  </div>
                )}

                {book.status === "pending" && book.processStage === "ipfs_failed" && (
                  <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                    <p className="text-sm text-yellow-200">
                      Upload/moderation/IPFS is a single phase and cannot be resumed.
                    </p>
                    <Link
                      href="/library/upload"
                      className="mt-3 inline-flex items-center text-xs uppercase tracking-[0.2em] text-yellow-200"
                    >
                      Start Upload Again
                    </Link>
                  </div>
                )}

                {book.status === "approved" && (
                  <div className="space-y-4">
                    {(() => {
                      const blockReason = getListingBlockReason(book, address);
                      const effectiveBlockReason =
                        blockReason || tokenRequirementBlockReason;
                      return (
                        <>
                    <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Listing Fee Check
                      </p>
                      <div className="mt-3 grid gap-2 text-sm">
                        <div className="flex items-center justify-between text-slate-300">
                          <span>USDT required</span>
                          <span>
                            {requiredUsdt === null
                              ? "Loading..."
                              : formatUnits(requiredUsdt, 18)}
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
                        <div
                          className={`text-xs ${
                            hasEnoughUsdt === false
                              ? "text-red-300"
                              : "text-emerald-300"
                          }`}
                        >
                          {hasEnoughUsdt === false
                            ? "Not enough USDT"
                            : hasEnoughUsdt === null
                            ? "Checking USDT balance..."
                            : "USDT balance is sufficient"}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-slate-300">
                          <span>USDT allowance</span>
                          <span>
                            {typeof usdtAllowance === "bigint"
                              ? formatUnits(usdtAllowance, 18)
                              : "Loading..."}
                          </span>
                        </div>
                        <div
                          className={`text-xs ${
                            hasEnoughUsdtAllowance === false
                              ? "text-red-300"
                              : "text-emerald-300"
                          }`}
                        >
                          {hasEnoughUsdtAllowance === false
                            ? "USDT approval required"
                            : hasEnoughUsdtAllowance === null
                            ? "Checking USDT allowance..."
                            : "USDT allowance is sufficient"}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-slate-300">
                          <span>RICO required</span>
                          <span>
                            {requiredRico === null
                              ? "Loading..."
                              : formatUnits(requiredRico, 18)}
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
                        <div
                          className={`text-xs ${
                            hasEnoughRico === false
                              ? "text-red-300"
                              : "text-emerald-300"
                          }`}
                        >
                          {hasEnoughRico === false
                            ? "Not enough RICO"
                            : hasEnoughRico === null
                            ? "Checking RICO balance..."
                            : "RICO balance is sufficient"}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-slate-300">
                          <span>RICO allowance</span>
                          <span>
                            {typeof ricoAllowance === "bigint"
                              ? formatUnits(ricoAllowance, 18)
                              : "Loading..."}
                          </span>
                        </div>
                        <div
                          className={`text-xs ${
                            hasEnoughRicoAllowance === false
                              ? "text-red-300"
                              : "text-emerald-300"
                          }`}
                        >
                          {hasEnoughRicoAllowance === false
                            ? "RICO approval required"
                            : hasEnoughRicoAllowance === null
                            ? "Checking RICO allowance..."
                            : "RICO allowance is sufficient"}
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
                              approvingUsdt ||
                              !requiredUsdt ||
                              hasEnoughUsdtAllowance !== false
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
                              approvingRico ||
                              !requiredRico ||
                              hasEnoughRicoAllowance !== false
                            }
                            className="rounded-lg border border-yellow-400/40 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-200 disabled:opacity-50"
                          >
                            {approvingRico ? "Approving RICO..." : "Approve RICO"}
                          </button>
                        </div>
                      </div>
                    </div>
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
                    {!book.ipfsCid && (
                      <div>
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
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Price (USDT)
                      </label>
                      <input
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Payout Wallet
                      </label>
                      <input
                        value={payoutWallet}
                        onChange={(e) => setPayoutWallet(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                      />
                    </div>

                    {listingError && (
                      <div className="text-xs text-red-300">{listingError}</div>
                    )}
                    {effectiveBlockReason && (
                      <div className="text-xs text-yellow-200/90">
                        Reason: {effectiveBlockReason}
                      </div>
                    )}

                    <button
                      onClick={handleList}
                      disabled={
                        submitting ||
                        !!effectiveBlockReason
                      }
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
                    >
                      {submitting
                        ? "Listing..."
                        : effectiveBlockReason
                        ? "Not Ready For Listing"
                        : "List On Blockchain"}
                    </button>
                        </>
                      );
                    })()}
                  </div>
                )}

                <Link
                  href="/library/my-books"
                  className="mt-6 inline-flex items-center text-xs uppercase tracking-[0.2em] text-yellow-200"
                >
                  Back to My Books
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
