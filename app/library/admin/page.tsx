"use client";

import { Header } from "@/components/Navigation/Header";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { parseUnits } from "viem";
import { useState } from "react";
import { libraryContract } from "@/utils/contracts";

const ADMIN_WALLET = "0x8Becab28d1601AcC853c2C9A67ef4e806e4D9Ae9";

export default function LibraryAdminPage() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const isAdmin =
    address?.toLowerCase() === ADMIN_WALLET.toLowerCase();

  const [listAuthor, setListAuthor] = useState("");
  const [listCid, setListCid] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [updateBookId, setUpdateBookId] = useState("");
  const [updatePrice, setUpdatePrice] = useState("");
  const [updateCid, setUpdateCid] = useState("");
  const [updateAuthor, setUpdateAuthor] = useState("");
  const [statusBookId, setStatusBookId] = useState("");
  const [statusFrozen, setStatusFrozen] = useState(false);
  const [statusSuspended, setStatusSuspended] = useState(false);
  const [statusBlacklisted, setStatusBlacklisted] = useState(false);
  const [feesApp, setFeesApp] = useState("");
  const [feesUpdate, setFeesUpdate] = useState("");
  const [feesAppeal, setFeesAppeal] = useState("");
  const [ricoApp, setRicoApp] = useState("");
  const [ricoBuy, setRicoBuy] = useState("");
  const [ricoVote, setRicoVote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: owner, refetch: refetchOwner } = useReadContract({
    ...libraryContract,
    functionName: "owner",
  });

  const refetchAll = async () => {
    await refetchOwner();
  };

  const isOwner =
    address && owner && address.toLowerCase() === String(owner).toLowerCase();

  const guardOwner = () => {
    if (!isOwner) throw new Error("Only owner");
  };

  if (!isAdmin) {
    return (
      <div className="page">
        <Header />
        <div className="mx-auto max-w-3xl px-6 py-20 text-center text-slate-200">
          <div className="rounded-3xl border border-yellow-500/20 bg-black/70 p-10">
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-300/70">
              Admin Access
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-white">
              Admin console is restricted
            </h1>
            <p className="mt-3 text-sm text-slate-400">
              Connect the authorized admin wallet to access these tools.
            </p>
            <Link
              href="/library"
              className="mt-6 inline-flex items-center rounded-xl border border-yellow-400/40 bg-black/50 px-4 py-2 text-sm font-semibold text-yellow-200 hover:bg-yellow-400/10"
            >
              Back to Library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleListBook = async () => {
    guardOwner();
    if (!listAuthor || !listCid || !listPrice) return;
    setIsSubmitting(true);
    try {
      await writeContractAsync({
        ...libraryContract,
        functionName: "listBook",
        args: [listAuthor as `0x${string}`, listCid, parseUnits(listPrice, 18)],
      });
      toast.success("Book listed");
      setListAuthor("");
      setListCid("");
      setListPrice("");
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Listing failed");
    } finally {
      setIsSubmitting(false);
      refetchAll();
    }
  };

  const handleUpdatePrice = async () => {
    guardOwner();
    if (!updateBookId || !updatePrice) return;
    setIsSubmitting(true);
    try {
      await writeContractAsync({
        ...libraryContract,
        functionName: "updateBookPrice",
        args: [BigInt(updateBookId), parseUnits(updatePrice, 18)],
      });
      toast.success("Price updated");
      setUpdatePrice("");
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Update failed");
    } finally {
      setIsSubmitting(false);
      refetchAll();
    }
  };

  const handleUpdateCid = async () => {
    guardOwner();
    if (!updateBookId || !updateCid) return;
    setIsSubmitting(true);
    try {
      await writeContractAsync({
        ...libraryContract,
        functionName: "updateBookCid",
        args: [BigInt(updateBookId), updateCid],
      });
      toast.success("CID updated");
      setUpdateCid("");
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Update failed");
    } finally {
      setIsSubmitting(false);
      refetchAll();
    }
  };

  const handleUpdateAuthor = async () => {
    guardOwner();
    if (!updateBookId || !updateAuthor) return;
    setIsSubmitting(true);
    try {
      await writeContractAsync({
        ...libraryContract,
        functionName: "updateBookAuthor",
        args: [BigInt(updateBookId), updateAuthor as `0x${string}`],
      });
      toast.success("Author updated");
      setUpdateAuthor("");
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Update failed");
    } finally {
      setIsSubmitting(false);
      refetchAll();
    }
  };

  const handleStatus = async () => {
    guardOwner();
    if (!statusBookId) return;
    setIsSubmitting(true);
    try {
      await writeContractAsync({
        ...libraryContract,
        functionName: "setBookStatus",
        args: [
          BigInt(statusBookId),
          statusFrozen,
          statusSuspended,
          statusBlacklisted,
        ],
      });
      toast.success("Status updated");
      setStatusBookId("");
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Update failed");
    } finally {
      setIsSubmitting(false);
      refetchAll();
    }
  };

  const handleFees = async () => {
    guardOwner();
    if (!feesApp || !feesUpdate || !feesAppeal) return;
    setIsSubmitting(true);
    try {
      await writeContractAsync({
        ...libraryContract,
        functionName: "setFees",
        args: [
          parseUnits(feesApp, 18),
          parseUnits(feesUpdate, 18),
          parseUnits(feesAppeal, 18),
        ],
      });
      toast.success("USDT fees updated");
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Update failed");
    } finally {
      setIsSubmitting(false);
      refetchAll();
    }
  };

  const handleRicoFees = async () => {
    guardOwner();
    if (!ricoApp || !ricoBuy || !ricoVote) return;
    setIsSubmitting(true);
    try {
      await writeContractAsync({
        ...libraryContract,
        functionName: "setRicoFees",
        args: [
          parseUnits(ricoApp, 18),
          parseUnits(ricoBuy, 18),
          parseUnits(ricoVote, 18),
        ],
      });
      toast.success("RICO fees updated");
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Update failed");
    } finally {
      setIsSubmitting(false);
      refetchAll();
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-8">
          <section className="rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-black via-[#0b0b0b] to-[#070707] p-8 shadow-[0_0_40px_rgba(0,0,0,0.85)]">
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-300/70">
              Admin Console
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold text-slate-50">
              Governance and book management controls.
            </h1>
            <p className="mt-4 text-sm md:text-base text-slate-300/80 max-w-3xl">
              List books, update metadata, manage statuses, configure fees, and
              protect the marketplace.
            </p>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
              <h3 className="text-lg font-semibold text-slate-50">List Book</h3>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                  placeholder="Author wallet"
                  value={listAuthor}
                  onChange={(e) => setListAuthor(e.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                  placeholder="IPFS CID"
                  value={listCid}
                  onChange={(e) => setListCid(e.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                  placeholder="Price in USDT"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                />
                <button
                  onClick={handleListBook}
                  disabled={isSubmitting || !isOwner}
                  className="w-full rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
                >
                  {isOwner ? "List book" : "Owner only"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
              <h3 className="text-lg font-semibold text-slate-50">
                Update Book Metadata
              </h3>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                  placeholder="Book ID"
                  value={updateBookId}
                  onChange={(e) => setUpdateBookId(e.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                  placeholder="New price"
                  value={updatePrice}
                  onChange={(e) => setUpdatePrice(e.target.value)}
                />
                <button
                  onClick={handleUpdatePrice}
                  disabled={isSubmitting || !isOwner}
                  className="w-full rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2.5 text-sm font-semibold text-yellow-200 disabled:opacity-50"
                >
                  Update price
                </button>
                <input
                  className="w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                  placeholder="New CID"
                  value={updateCid}
                  onChange={(e) => setUpdateCid(e.target.value)}
                />
                <button
                  onClick={handleUpdateCid}
                  disabled={isSubmitting || !isOwner}
                  className="w-full rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2.5 text-sm font-semibold text-yellow-200 disabled:opacity-50"
                >
                  Update CID
                </button>
                <input
                  className="w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                  placeholder="New author address"
                  value={updateAuthor}
                  onChange={(e) => setUpdateAuthor(e.target.value)}
                />
                <button
                  onClick={handleUpdateAuthor}
                  disabled={isSubmitting || !isOwner}
                  className="w-full rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2.5 text-sm font-semibold text-yellow-200 disabled:opacity-50"
                >
                  Update author
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
              <h3 className="text-lg font-semibold text-slate-50">
                Status Controls
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Freeze, suspend, or blacklist a book.
              </p>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                  placeholder="Book ID"
                  value={statusBookId}
                  onChange={(e) => setStatusBookId(e.target.value)}
                />
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={statusFrozen}
                      onChange={(e) => setStatusFrozen(e.target.checked)}
                    />
                    Frozen
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={statusSuspended}
                      onChange={(e) => setStatusSuspended(e.target.checked)}
                    />
                    Suspended
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={statusBlacklisted}
                      onChange={(e) => setStatusBlacklisted(e.target.checked)}
                    />
                    Blacklisted
                  </label>
                </div>
                <button
                  onClick={handleStatus}
                  disabled={isSubmitting || !isOwner}
                  className="w-full rounded-xl border border-slate-600 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold text-slate-200 disabled:opacity-50"
                >
                  Update status
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
              <h3 className="text-lg font-semibold text-slate-50">
                Fee Configuration
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Update USDT and RICO fees (capped).
              </p>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                  placeholder="App fee USDT"
                  value={feesApp}
                  onChange={(e) => setFeesApp(e.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                  placeholder="Update fee USDT"
                  value={feesUpdate}
                  onChange={(e) => setFeesUpdate(e.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                  placeholder="Appeal fee USDT"
                  value={feesAppeal}
                  onChange={(e) => setFeesAppeal(e.target.value)}
                />
                <button
                  onClick={handleFees}
                  disabled={isSubmitting || !isOwner}
                  className="w-full rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 disabled:opacity-50"
                >
                  Update USDT fees
                </button>
                <div className="grid gap-2 md:grid-cols-3">
                  <input
                    className="w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                    placeholder="App RICO"
                    value={ricoApp}
                    onChange={(e) => setRicoApp(e.target.value)}
                  />
                  <input
                    className="w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                    placeholder="Buy RICO"
                    value={ricoBuy}
                    onChange={(e) => setRicoBuy(e.target.value)}
                  />
                  <input
                    className="w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-2 text-sm text-slate-200"
                    placeholder="Vote RICO"
                    value={ricoVote}
                    onChange={(e) => setRicoVote(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleRicoFees}
                  disabled={isSubmitting || !isOwner}
                  className="w-full rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 disabled:opacity-50"
                >
                  Update RICO fees
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
