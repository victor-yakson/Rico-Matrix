"use client";

import { Header } from "@/components/Navigation/Header";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { toast } from "sonner";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { libraryContract } from "@/utils/contracts";

type InspectBookResult = {
  bookId: string;
  priceWei: string;
  author: string;
  payoutWallet: string;
  cid: string;
  totalSales: string;
  upVotes: number;
  downVotes: number;
  isFrozen: boolean;
  isSuspended: boolean;
  isBlacklisted: boolean;
  isUnderAppeal: boolean;
  uri: string;
  hasAccess: boolean | null;
};

const addressRegex = /^0x[a-fA-F0-9]{40}$/;
const wholeNumberRegex = /^\d+$/;

const shortAddress = (value?: string | null) => {
  if (!value) return "--";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const parseBookTuple = (bookId: string, raw: unknown): InspectBookResult => {
  const tuple = raw as any;
  const asBigInt = (value: unknown): bigint => {
    if (typeof value === "bigint") return value;
    if (typeof value === "number" && Number.isFinite(value)) return BigInt(value);
    if (typeof value === "string" && wholeNumberRegex.test(value)) return BigInt(value);
    return BigInt(0);
  };
  const asAddress = (value: unknown): string =>
    typeof value === "string" ? value : "0x0000000000000000000000000000000000000000";
  const asString = (value: unknown): string => (typeof value === "string" ? value : "");

  return {
    bookId,
    priceWei: asBigInt(tuple?.price ?? tuple?.[0]).toString(),
    author: asAddress(tuple?.author ?? tuple?.[1]),
    isFrozen: Boolean(tuple?.isFrozen ?? tuple?.[2]),
    isSuspended: Boolean(tuple?.isSuspended ?? tuple?.[3]),
    isBlacklisted: Boolean(tuple?.isBlacklisted ?? tuple?.[4]),
    isUnderAppeal: Boolean(tuple?.isUnderAppeal ?? tuple?.[5]),
    payoutWallet: asAddress(tuple?.payoutWallet ?? tuple?.[6]),
    upVotes: Number(asBigInt(tuple?.upVotes ?? tuple?.[7])),
    downVotes: Number(asBigInt(tuple?.downVotes ?? tuple?.[8])),
    cid: asString(tuple?.cid ?? tuple?.[9]),
    totalSales: asBigInt(tuple?.totalSales ?? tuple?.[10]).toString(),
    uri: "",
    hasAccess: null,
  };
};

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
}) => (
  <label className="block">
    <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-black/60 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-amber-300/50"
    />
  </label>
);

export default function LibraryAdminPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectResult, setInspectResult] = useState<InspectBookResult | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);

  const [statusBookId, setStatusBookId] = useState("");
  const [statusFrozen, setStatusFrozen] = useState(false);
  const [statusSuspended, setStatusSuspended] = useState(false);
  const [statusBlacklisted, setStatusBlacklisted] = useState(false);

  const [appealBookId, setAppealBookId] = useState("");
  const [appealApproved, setAppealApproved] = useState(true);

  const [feesAppUsdt, setFeesAppUsdt] = useState("");
  const [feesUpdateUsdt, setFeesUpdateUsdt] = useState("");
  const [feesAppealUsdt, setFeesAppealUsdt] = useState("");

  const [feesAppRico, setFeesAppRico] = useState("");
  const [feesBuyRico, setFeesBuyRico] = useState("");
  const [feesVoteRico, setFeesVoteRico] = useState("");

  const [splitAuthor, setSplitAuthor] = useState("5000");
  const [splitPool, setSplitPool] = useState("3000");
  const [splitWalletA, setSplitWalletA] = useState("500");
  const [splitWalletB, setSplitWalletB] = useState("1500");

  const [dustToken, setDustToken] = useState("");
  const [dustAmount, setDustAmount] = useState("");
  const [dustDecimals, setDustDecimals] = useState("18");

  const [newOwner, setNewOwner] = useState("");
  const [syncUserAddress, setSyncUserAddress] = useState("");

  const [inspectBookId, setInspectBookId] = useState("");
  const [inspectWallet, setInspectWallet] = useState("");

  const { data: owner, refetch: refetchOwner } = useReadContract({
    ...libraryContract,
    functionName: "owner",
  });
  const { data: pendingOwner, refetch: refetchPendingOwner } = useReadContract({
    ...libraryContract,
    functionName: "pendingOwner",
  });
  const { data: paused, refetch: refetchPaused } = useReadContract({
    ...libraryContract,
    functionName: "paused",
  });
  const { data: nextBookId, refetch: refetchNextBookId } = useReadContract({
    ...libraryContract,
    functionName: "nextBookId",
  });
  const { data: treasury, refetch: refetchTreasury } = useReadContract({
    ...libraryContract,
    functionName: "treasury",
  });
  const { data: walletA, refetch: refetchWalletA } = useReadContract({
    ...libraryContract,
    functionName: "walletA",
  });
  const { data: walletB, refetch: refetchWalletB } = useReadContract({
    ...libraryContract,
    functionName: "walletB",
  });

  const { data: appFeeUsdt, refetch: refetchAppFeeUsdt } = useReadContract({
    ...libraryContract,
    functionName: "appFeeUsdt",
  });
  const { data: updateFeeUsdt, refetch: refetchUpdateFeeUsdt } = useReadContract({
    ...libraryContract,
    functionName: "updateFeeUsdt",
  });
  const { data: appealFeeUsdt, refetch: refetchAppealFeeUsdt } = useReadContract({
    ...libraryContract,
    functionName: "appealFeeUsdt",
  });
  const { data: appFeeRico, refetch: refetchAppFeeRico } = useReadContract({
    ...libraryContract,
    functionName: "appFeeRico",
  });
  const { data: buyFeeRico, refetch: refetchBuyFeeRico } = useReadContract({
    ...libraryContract,
    functionName: "buyFeeRico",
  });
  const { data: minVoteRico, refetch: refetchMinVoteRico } = useReadContract({
    ...libraryContract,
    functionName: "minVoteRico",
  });

  const { data: currentSplitAuthor, refetch: refetchSplitAuthor } = useReadContract({
    ...libraryContract,
    functionName: "splitAuthor",
  });
  const { data: currentSplitPool, refetch: refetchSplitPool } = useReadContract({
    ...libraryContract,
    functionName: "splitPool",
  });
  const { data: currentSplitWalletA, refetch: refetchSplitWalletA } = useReadContract({
    ...libraryContract,
    functionName: "splitWalletA",
  });
  const { data: currentSplitWalletB, refetch: refetchSplitWalletB } = useReadContract({
    ...libraryContract,
    functionName: "splitWalletB",
  });

  const isOwner = useMemo(() => {
    if (!address || !owner) return false;
    return address.toLowerCase() === String(owner).toLowerCase();
  }, [address, owner]);

  const isPendingOwner = useMemo(() => {
    if (!address || !pendingOwner) return false;
    return address.toLowerCase() === String(pendingOwner).toLowerCase();
  }, [address, pendingOwner]);

  const splitTotal =
    Number(splitAuthor || "0") +
    Number(splitPool || "0") +
    Number(splitWalletA || "0") +
    Number(splitWalletB || "0");

  const formatToken = (value: unknown) => {
    if (typeof value !== "bigint") return "--";
    return formatUnits(value, 18);
  };

  const refetchAdminReads = async () => {
    await Promise.all([
      refetchOwner(),
      refetchPendingOwner(),
      refetchPaused(),
      refetchNextBookId(),
      refetchTreasury(),
      refetchWalletA(),
      refetchWalletB(),
      refetchAppFeeUsdt(),
      refetchUpdateFeeUsdt(),
      refetchAppealFeeUsdt(),
      refetchAppFeeRico(),
      refetchBuyFeeRico(),
      refetchMinVoteRico(),
      refetchSplitAuthor(),
      refetchSplitPool(),
      refetchSplitWalletA(),
      refetchSplitWalletB(),
    ]);
  };

  const runOwnerTx = async (
    actionKey: string,
    actionLabel: string,
    txConfig: Parameters<typeof writeContractAsync>[0]
  ) => {
    if (!isOwner) {
      toast.error("Only the current owner can perform this action.");
      return;
    }
    if (!publicClient) {
      toast.error("Public client is unavailable.");
      return;
    }
    setActiveAction(actionKey);
    try {
      const hash = await writeContractAsync(txConfig);
      toast.success(`${actionLabel} submitted: ${shortAddress(hash)}`);
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      toast.success(`${actionLabel} confirmed on-chain.`);
      await refetchAdminReads();
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || `${actionLabel} failed.`);
    } finally {
      setActiveAction(null);
    }
  };

  const handleSetBookStatus = async () => {
    if (!wholeNumberRegex.test(statusBookId)) {
      toast.error("Enter a valid book ID.");
      return;
    }
    await runOwnerTx("setStatus", "Set book status", {
      ...libraryContract,
      functionName: "setBookStatus",
      args: [BigInt(statusBookId), statusFrozen, statusSuspended, statusBlacklisted],
    });
  };

  const handleResolveAppeal = async () => {
    if (!wholeNumberRegex.test(appealBookId)) {
      toast.error("Enter a valid book ID.");
      return;
    }
    await runOwnerTx("resolveAppeal", "Resolve appeal", {
      ...libraryContract,
      functionName: "resolveAppeal",
      args: [BigInt(appealBookId), appealApproved],
    });
  };

  const handleSetFees = async () => {
    if (!feesAppUsdt || !feesUpdateUsdt || !feesAppealUsdt) {
      toast.error("Set all USDT fee values.");
      return;
    }
    await runOwnerTx("setFees", "Set USDT fees", {
      ...libraryContract,
      functionName: "setFees",
      args: [
        parseUnits(feesAppUsdt, 18),
        parseUnits(feesUpdateUsdt, 18),
        parseUnits(feesAppealUsdt, 18),
      ],
    });
  };

  const handleSetRicoFees = async () => {
    if (!feesAppRico || !feesBuyRico || !feesVoteRico) {
      toast.error("Set all RICO fee values.");
      return;
    }
    await runOwnerTx("setRicoFees", "Set RICO fees", {
      ...libraryContract,
      functionName: "setRicoFees",
      args: [
        parseUnits(feesAppRico, 18),
        parseUnits(feesBuyRico, 18),
        parseUnits(feesVoteRico, 18),
      ],
    });
  };

  const handleSetSplits = async () => {
    if (
      !wholeNumberRegex.test(splitAuthor) ||
      !wholeNumberRegex.test(splitPool) ||
      !wholeNumberRegex.test(splitWalletA) ||
      !wholeNumberRegex.test(splitWalletB)
    ) {
      toast.error("All splits must be whole numbers.");
      return;
    }
    if (splitTotal !== 10000) {
      toast.error("Revenue split total must equal 10000 BPS.");
      return;
    }
    await runOwnerTx("setSplits", "Set revenue splits", {
      ...libraryContract,
      functionName: "setRevenueSplits",
      args: [
        BigInt(splitAuthor),
        BigInt(splitPool),
        BigInt(splitWalletA),
        BigInt(splitWalletB),
      ],
    });
  };

  const handleRecoverDust = async () => {
    if (!addressRegex.test(dustToken)) {
      toast.error("Enter a valid token contract address.");
      return;
    }
    if (!dustAmount || Number(dustAmount) <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    const decimalsNumber = Number(dustDecimals);
    if (!Number.isInteger(decimalsNumber) || decimalsNumber < 0 || decimalsNumber > 36) {
      toast.error("Decimals must be between 0 and 36.");
      return;
    }
    await runOwnerTx("recoverDust", "Recover dust", {
      ...libraryContract,
      functionName: "recoverDust",
      args: [dustToken as `0x${string}`, parseUnits(dustAmount, decimalsNumber)],
    });
  };

  const handleSetPaused = async (nextState: boolean) => {
    await runOwnerTx(nextState ? "pause" : "unpause", nextState ? "Pause contract" : "Unpause contract", {
      ...libraryContract,
      functionName: "setPausable",
      args: [nextState],
    });
  };

  const handleTransferOwnership = async () => {
    if (!addressRegex.test(newOwner)) {
      toast.error("Enter a valid new owner address.");
      return;
    }
    await runOwnerTx("transferOwnership", "Transfer ownership", {
      ...libraryContract,
      functionName: "transferOwnership",
      args: [newOwner as `0x${string}`],
    });
  };

  const handleAcceptOwnership = async () => {
    if (!isPendingOwner) {
      toast.error("Connected wallet is not pending owner.");
      return;
    }
    if (!publicClient) {
      toast.error("Public client is unavailable.");
      return;
    }
    setActiveAction("acceptOwnership");
    try {
      const hash = await writeContractAsync({
        ...libraryContract,
        functionName: "acceptOwnership",
      });
      toast.success(`Accept ownership submitted: ${shortAddress(hash)}`);
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      toast.success("Ownership accepted.");
      await refetchAdminReads();
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Accept ownership failed.");
    } finally {
      setActiveAction(null);
    }
  };

  const handleSyncPointsFor = async () => {
    if (!addressRegex.test(syncUserAddress)) {
      toast.error("Enter a valid user wallet address.");
      return;
    }
    if (!publicClient) {
      toast.error("Public client is unavailable.");
      return;
    }
    setActiveAction("syncPoints");
    try {
      const hash = await writeContractAsync({
        ...libraryContract,
        functionName: "syncRicoPointsFor",
        args: [syncUserAddress as `0x${string}`],
      });
      toast.success(`Sync submitted: ${shortAddress(hash)}`);
      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      toast.success("Royalty points synced for user.");
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Sync failed.");
    } finally {
      setActiveAction(null);
    }
  };

  const handleInspectBook = async () => {
    if (!publicClient) {
      toast.error("Public client is unavailable.");
      return;
    }
    if (!wholeNumberRegex.test(inspectBookId)) {
      toast.error("Enter a valid book ID.");
      return;
    }

    setInspectLoading(true);
    setInspectError(null);
    try {
      const [bookRaw, bookUri] = await Promise.all([
        publicClient.readContract({
          ...libraryContract,
          functionName: "getBook",
          args: [BigInt(inspectBookId)],
        }),
        publicClient.readContract({
          ...libraryContract,
          functionName: "uri",
          args: [BigInt(inspectBookId)],
        }),
      ]);

      const parsed = parseBookTuple(inspectBookId, bookRaw);
      parsed.uri = typeof bookUri === "string" ? bookUri : "";

      if (inspectWallet && addressRegex.test(inspectWallet)) {
        const access = await publicClient.readContract({
          ...libraryContract,
          functionName: "hasAccess",
          args: [inspectWallet as `0x${string}`, BigInt(inspectBookId)],
        });
        parsed.hasAccess = Boolean(access);
      } else {
        parsed.hasAccess = null;
      }

      setInspectResult(parsed);
    } catch (error: any) {
      setInspectResult(null);
      setInspectError(error?.shortMessage || error?.message || "Failed to inspect book.");
    } finally {
      setInspectLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_42%),radial-gradient(circle_at_85%_15%,rgba(56,189,248,0.10),transparent_36%),#020617] px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-3xl border border-yellow-500/25 bg-slate-950/75 p-6 shadow-[0_26px_65px_-45px_rgba(0,0,0,1)] backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80">Library Admin</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-50">RicoMatrix Contract Control Panel</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-300/85">
                  Owner controls for governance, listing operations, fee tuning, emergency actions, and on-chain inspection.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/library"
                  className="rounded-xl border border-slate-600 bg-slate-800/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 transition hover:bg-slate-700/70"
                >
                  Back To Library
                </Link>
                <button
                  type="button"
                  onClick={() => void refetchAdminReads()}
                  className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  Refresh State
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Connected Wallet</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{shortAddress(address)}</p>
            </div>
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Owner</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{shortAddress(String(owner || ""))}</p>
              <p className={`mt-2 text-xs ${isOwner ? "text-emerald-300" : "text-yellow-300"}`}>
                {isOwner ? "Owner privileges enabled" : "Owner-only actions disabled"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Pending Owner</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">
                {pendingOwner && String(pendingOwner) !== "0x0000000000000000000000000000000000000000"
                  ? shortAddress(String(pendingOwner))
                  : "--"}
              </p>
              <p className={`mt-2 text-xs ${isPendingOwner ? "text-emerald-300" : "text-slate-400"}`}>
                {isPendingOwner ? "Connected wallet can accept ownership" : "No pending owner access"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Contract State</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">
                {paused ? "Paused" : "Live"} • Next Book ID {typeof nextBookId === "bigint" ? nextBookId.toString() : "--"}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleSetPaused(true)}
                  disabled={activeAction === "pause" || !isOwner || paused === true}
                  className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200 disabled:opacity-50"
                >
                  {activeAction === "pause" ? "Pausing..." : "Pause"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSetPaused(false)}
                  disabled={activeAction === "unpause" || !isOwner || paused === false}
                  className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 disabled:opacity-50"
                >
                  {activeAction === "unpause" ? "Unpausing..." : "Unpause"}
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-1">
            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-5">
              <h2 className="text-lg font-semibold text-slate-100">Book Governance</h2>
              <p className="mt-1 text-sm text-slate-400">Freeze/suspend/blacklist books and resolve appeal requests.</p>
              <div className="mt-4 space-y-3">
                <Field label="Book ID" value={statusBookId} onChange={setStatusBookId} placeholder="1" />
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
                    <input type="checkbox" checked={statusFrozen} onChange={(e) => setStatusFrozen(e.target.checked)} />
                    Frozen
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={statusSuspended}
                      onChange={(e) => setStatusSuspended(e.target.checked)}
                    />
                    Suspended
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={statusBlacklisted}
                      onChange={(e) => setStatusBlacklisted(e.target.checked)}
                    />
                    Blacklisted
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSetBookStatus()}
                  disabled={activeAction === "setStatus" || !isOwner}
                  className="w-full rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  {activeAction === "setStatus" ? "Submitting..." : "Apply Status"}
                </button>
              </div>

              <div className="mt-6 space-y-3 border-t border-slate-800 pt-5">
                <Field label="Appeal Book ID" value={appealBookId} onChange={setAppealBookId} placeholder="1" />
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={appealApproved}
                    onChange={(e) => setAppealApproved(e.target.checked)}
                  />
                  Approve appeal and lift restrictions
                </label>
                <button
                  type="button"
                  onClick={() => void handleResolveAppeal()}
                  disabled={activeAction === "resolveAppeal" || !isOwner}
                  className="w-full rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  {activeAction === "resolveAppeal" ? "Submitting..." : "Resolve Appeal"}
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-5">
              <h2 className="text-lg font-semibold text-slate-100">Fee Configuration</h2>
              <p className="mt-1 text-sm text-slate-400">Adjust USDT and RICO fee parameters.</p>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Current USDT Fees</p>
                <p className="mt-2 text-sm text-slate-200">
                  App: {formatToken(appFeeUsdt)} • Update: {formatToken(updateFeeUsdt)} • Appeal:{" "}
                  {formatToken(appealFeeUsdt)}
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                <Field label="App Fee (USDT)" value={feesAppUsdt} onChange={setFeesAppUsdt} placeholder="3" />
                <Field
                  label="Update Fee (USDT)"
                  value={feesUpdateUsdt}
                  onChange={setFeesUpdateUsdt}
                  placeholder="2"
                />
                <Field
                  label="Appeal Fee (USDT)"
                  value={feesAppealUsdt}
                  onChange={setFeesAppealUsdt}
                  placeholder="5"
                />
                <button
                  type="button"
                  onClick={() => void handleSetFees()}
                  disabled={activeAction === "setFees" || !isOwner}
                  className="w-full rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {activeAction === "setFees" ? "Submitting..." : "Update USDT Fees"}
                </button>
              </div>

              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Current RICO Fees</p>
                <p className="mt-2 text-sm text-slate-200">
                  App: {formatToken(appFeeRico)} • Buy: {formatToken(buyFeeRico)} • Min Vote:{" "}
                  {formatToken(minVoteRico)}
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                <Field label="App Fee (RICO)" value={feesAppRico} onChange={setFeesAppRico} placeholder="100" />
                <Field label="Buy Fee (RICO)" value={feesBuyRico} onChange={setFeesBuyRico} placeholder="5" />
                <Field label="Min Vote (RICO)" value={feesVoteRico} onChange={setFeesVoteRico} placeholder="5" />
                <button
                  type="button"
                  onClick={() => void handleSetRicoFees()}
                  disabled={activeAction === "setRicoFees" || !isOwner}
                  className="w-full rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {activeAction === "setRicoFees" ? "Submitting..." : "Update RICO Fees"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-5">
              <h2 className="text-lg font-semibold text-slate-100">Revenue, Treasury & Ownership</h2>
              <p className="mt-1 text-sm text-slate-400">
                Manage split configuration, recover non-USDT tokens, and control ownership transfer.
              </p>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Current Revenue Split (BPS)</p>
                <p className="mt-2 text-sm text-slate-200">
                  Author {typeof currentSplitAuthor === "bigint" ? currentSplitAuthor.toString() : "--"} • Pool{" "}
                  {typeof currentSplitPool === "bigint" ? currentSplitPool.toString() : "--"} • WalletA{" "}
                  {typeof currentSplitWalletA === "bigint" ? currentSplitWalletA.toString() : "--"} • WalletB{" "}
                  {typeof currentSplitWalletB === "bigint" ? currentSplitWalletB.toString() : "--"}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Treasury {shortAddress(String(treasury || ""))} • WalletA {shortAddress(String(walletA || ""))} •
                  WalletB {shortAddress(String(walletB || ""))}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Author BPS" value={splitAuthor} onChange={setSplitAuthor} placeholder="5000" />
                <Field label="Pool BPS" value={splitPool} onChange={setSplitPool} placeholder="3000" />
                <Field label="WalletA BPS" value={splitWalletA} onChange={setSplitWalletA} placeholder="500" />
                <Field label="WalletB BPS" value={splitWalletB} onChange={setSplitWalletB} placeholder="1500" />
              </div>
              <p className={`mt-2 text-xs ${splitTotal === 10000 ? "text-emerald-300" : "text-red-300"}`}>
                Split total: {splitTotal} / 10000
              </p>
              <button
                type="button"
                onClick={() => void handleSetSplits()}
                disabled={activeAction === "setSplits" || !isOwner}
                className="mt-3 w-full rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/20 disabled:opacity-50"
              >
                {activeAction === "setSplits" ? "Submitting..." : "Update Revenue Splits"}
              </button>

              <div className="mt-6 space-y-3 border-t border-slate-800 pt-5">
                <Field label="Dust Token Address" value={dustToken} onChange={setDustToken} placeholder="0x..." />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Amount" value={dustAmount} onChange={setDustAmount} placeholder="100" />
                  <Field
                    label="Token Decimals"
                    value={dustDecimals}
                    onChange={setDustDecimals}
                    placeholder="18"
                    type="number"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleRecoverDust()}
                  disabled={activeAction === "recoverDust" || !isOwner}
                  className="w-full rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-2.5 text-sm font-semibold text-yellow-200 transition hover:bg-yellow-500/20 disabled:opacity-50"
                >
                  {activeAction === "recoverDust" ? "Submitting..." : "Recover Dust"}
                </button>
              </div>

              <div className="mt-6 space-y-3 border-t border-slate-800 pt-5">
                <Field label="New Owner Address" value={newOwner} onChange={setNewOwner} placeholder="0x..." />
                <button
                  type="button"
                  onClick={() => void handleTransferOwnership()}
                  disabled={activeAction === "transferOwnership" || !isOwner}
                  className="w-full rounded-xl border border-violet-400/40 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/20 disabled:opacity-50"
                >
                  {activeAction === "transferOwnership" ? "Submitting..." : "Start Ownership Transfer"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleAcceptOwnership()}
                  disabled={activeAction === "acceptOwnership" || !isPendingOwner}
                  className="w-full rounded-xl border border-violet-400/40 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/20 disabled:opacity-50"
                >
                  {activeAction === "acceptOwnership" ? "Submitting..." : "Accept Ownership"}
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-5">
              <h2 className="text-lg font-semibold text-slate-100">Royalty Sync Utility</h2>
              <p className="mt-1 text-sm text-slate-400">Trigger `syncRicoPointsFor` for any user address.</p>
              <div className="mt-4 space-y-3">
                <Field
                  label="User Wallet"
                  value={syncUserAddress}
                  onChange={setSyncUserAddress}
                  placeholder="0x..."
                />
                <button
                  type="button"
                  onClick={() => void handleSyncPointsFor()}
                  disabled={activeAction === "syncPoints"}
                  className="w-full rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {activeAction === "syncPoints" ? "Submitting..." : "Sync User Points"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-5">
              <h2 className="text-lg font-semibold text-slate-100">Book Inspector</h2>
              <p className="mt-1 text-sm text-slate-400">Read on-chain book details and optional access check for a wallet.</p>
              <div className="mt-4 space-y-3">
                <Field label="Book ID" value={inspectBookId} onChange={setInspectBookId} placeholder="1" />
                <Field
                  label="Wallet For Access Check (Optional)"
                  value={inspectWallet}
                  onChange={setInspectWallet}
                  placeholder="0x..."
                />
                <button
                  type="button"
                  onClick={() => void handleInspectBook()}
                  disabled={inspectLoading}
                  className="w-full rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  {inspectLoading ? "Inspecting..." : "Inspect Book"}
                </button>
              </div>

              {inspectError ? (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {inspectError}
                </div>
              ) : null}

              {inspectResult ? (
                <div className="mt-4 grid gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm">
                  <p className="text-slate-200">
                    Book #{inspectResult.bookId} • Price {formatUnits(BigInt(inspectResult.priceWei), 18)} USDT
                  </p>
                  <p className="text-slate-300">Author: {inspectResult.author}</p>
                  <p className="text-slate-300">Payout: {inspectResult.payoutWallet}</p>
                  <p className="text-slate-300">CID: {inspectResult.cid || "--"}</p>
                  <p className="text-slate-300">URI: {inspectResult.uri || "--"}</p>
                  <p className="text-slate-300">
                    Sales: {inspectResult.totalSales} • Votes: 👍 {inspectResult.upVotes} / 👎 {inspectResult.downVotes}
                  </p>
                  <p className="text-slate-300">
                    Flags: {inspectResult.isFrozen ? "Frozen " : ""}
                    {inspectResult.isSuspended ? "Suspended " : ""}
                    {inspectResult.isBlacklisted ? "Blacklisted " : ""}
                    {inspectResult.isUnderAppeal ? "Appeal Pending" : ""}
                    {!inspectResult.isFrozen &&
                    !inspectResult.isSuspended &&
                    !inspectResult.isBlacklisted &&
                    !inspectResult.isUnderAppeal
                      ? "Active"
                      : ""}
                  </p>
                  {inspectResult.hasAccess !== null ? (
                    <p className={inspectResult.hasAccess ? "text-emerald-300" : "text-yellow-300"}>
                      Access Check: {inspectResult.hasAccess ? "Has Access" : "No Access"}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
