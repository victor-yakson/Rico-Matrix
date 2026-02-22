"use client";

import Link from "next/link";
import { Header } from "@/components/Navigation/Header";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { toast } from "sonner";
import { libraryContract } from "@/utils/contracts";
import { USDT_ABI } from "@/utils/constants";

const ADMIN_WALLET = "0x8Becab28d1601AcC853c2C9A67ef4e806e4D9Ae9";

const toBigInt = (value: unknown) => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && value !== "") return BigInt(value);
  return BigInt(0);
};

export default function LibraryAuthorPage() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const isAdmin =
    address?.toLowerCase() === ADMIN_WALLET.toLowerCase();

  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [cid, setCid] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [payoutWallet, setPayoutWallet] = useState("");
  const [payoutConfirmed, setPayoutConfirmed] = useState(false);

  const [updateBookId, setUpdateBookId] = useState("");
  const [updatePrice, setUpdatePrice] = useState("");
  const [appealBookId, setAppealBookId] = useState("");
  const [newWallet, setNewWallet] = useState("");

  const [pendingAction, setPendingAction] = useState<
    "submit" | "update" | "appeal" | "wallet" | null
  >(null);

  const { data: usdtAddress, refetch: refetchUsdtAddress } = useReadContract({
    ...libraryContract,
    functionName: "usdt",
  });
  const { data: ricoAddress, refetch: refetchRicoAddress } = useReadContract({
    ...libraryContract,
    functionName: "rico",
  });
  const { data: appFeeUsdt, refetch: refetchAppFeeUsdt } = useReadContract({
    ...libraryContract,
    functionName: "appFeeUsdt",
  });
  const { data: updateFeeUsdt, refetch: refetchUpdateFeeUsdt } =
    useReadContract({
      ...libraryContract,
      functionName: "updateFeeUsdt",
    });
  const { data: appealFeeUsdt, refetch: refetchAppealFeeUsdt } =
    useReadContract({
      ...libraryContract,
      functionName: "appealFeeUsdt",
    });
  const { data: appFeeRico, refetch: refetchAppFeeRico } = useReadContract({
    ...libraryContract,
    functionName: "appFeeRico",
  });

  const { data: usdtAllowance, refetch: refetchUsdtAllowance } =
    useReadContract({
      address: usdtAddress as `0x${string}` | undefined,
      abi: USDT_ABI,
      functionName: "allowance",
      args: address && usdtAddress ? [address, libraryContract.address] : undefined,
      query: { enabled: Boolean(address && usdtAddress) },
    });

  const { data: ricoAllowance, refetch: refetchRicoAllowance } =
    useReadContract({
      address: ricoAddress as `0x${string}` | undefined,
      abi: USDT_ABI,
      functionName: "allowance",
      args: address && ricoAddress ? [address, libraryContract.address] : undefined,
      query: { enabled: Boolean(address && ricoAddress) },
    });

  const { data: authorBookIds, refetch: refetchAuthorBookIds } =
    useReadContract({
      ...libraryContract,
      functionName: "getAuthorBooks",
      args: address ? [address] : undefined,
      query: { enabled: Boolean(address) },
    });

  const authorBookContracts = useMemo(() => {
    const ids = (authorBookIds as bigint[] | undefined) ?? [];
    return ids.map((id) => ({
      ...libraryContract,
      functionName: "getBook",
      args: [id],
    }));
  }, [authorBookIds]);

  const { data: authorBooks, refetch: refetchAuthorBooks } = useReadContracts({
    contracts: authorBookContracts,
    query: { enabled: authorBookContracts.length > 0 },
  });

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(coverFile);
    setCoverPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [coverFile]);

  useEffect(() => {
    if (!address) {
      setRegistered(false);
      setPayoutConfirmed(false);
      return;
    }
    if (typeof window === "undefined") return;
    const key = address.toLowerCase();
    const reg = window.localStorage.getItem(`author_registered_${key}`) === "1";
    const payout =
      window.localStorage.getItem(`author_payout_${key}`) === "1";
    setRegistered(reg);
    setPayoutConfirmed(payout);
  }, [address]);

  const requiredUsdt = [
    toBigInt(appFeeUsdt),
    toBigInt(updateFeeUsdt),
    toBigInt(appealFeeUsdt),
  ].reduce((maxValue, current) => (current > maxValue ? current : maxValue), BigInt(0));

  const needsUsdtApproval =
    requiredUsdt > BigInt(0) &&
    typeof usdtAllowance === "bigint" &&
    usdtAllowance < requiredUsdt;
  const needsRicoApproval =
    typeof appFeeRico === "bigint" &&
    typeof ricoAllowance === "bigint" &&
    ricoAllowance < appFeeRico;

  const approveToken = async (
    tokenAddress?: string,
    amount?: bigint,
    label?: string
  ) => {
    if (!tokenAddress || !amount || amount === BigInt(0)) return;
    const toastId = `author-approve-${label ?? "token"}`;
    try {
      toast.loading("Approval submitted...", { id: toastId });
      await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: USDT_ABI,
        functionName: "approve",
        args: [libraryContract.address, amount],
      });
      toast.success("Approval confirmed", { id: toastId });
      refetchUsdtAllowance();
      refetchRicoAllowance();
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Approval failed", {
        id: toastId,
      });
    }
  };

  const refetchFees = () => {
    refetchUsdtAddress();
    refetchRicoAddress();
    refetchAppFeeUsdt();
    refetchUpdateFeeUsdt();
    refetchAppealFeeUsdt();
    refetchAppFeeRico();
  };

  const handleSubmit = async () => {
    if (!price || !cid) {
      toast.error("Add a price and CID before submitting.");
      return;
    }
    if (!acceptedTerms || !registered || !payoutConfirmed) {
      toast.error("Complete the terms, registration, and payout steps first.");
      return;
    }
    setPendingAction("submit");
    try {
      await writeContractAsync({
        ...libraryContract,
        functionName: "applyToListBook",
        args: [parseUnits(price, 18), cid],
      });
      toast.success("Application submitted");
      setTitle("");
      setAuthorName("");
      setDescription("");
      setPrice("");
      setCid("");
      setCoverFile(null);
      setBookFile(null);
      refetchAuthorBookIds();
      refetchAuthorBooks();
      refetchFees();
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Submission failed");
    } finally {
      setPendingAction(null);
    }
  };

  const handlePriceUpdate = async () => {
    if (!updateBookId || !updatePrice) {
      toast.error("Add a book ID and new price.");
      return;
    }
    setPendingAction("update");
    try {
      await writeContractAsync({
        ...libraryContract,
        functionName: "requestPriceUpdate",
        args: [BigInt(updateBookId), parseUnits(updatePrice, 18)],
      });
      toast.success("Price update requested");
      setUpdateBookId("");
      setUpdatePrice("");
    } catch (error: any) {
      toast.error(
        error?.shortMessage || error?.message || "Price update failed"
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleAppeal = async () => {
    if (!appealBookId) {
      toast.error("Add a book ID for appeal.");
      return;
    }
    setPendingAction("appeal");
    try {
      await writeContractAsync({
        ...libraryContract,
        functionName: "appealStatus",
        args: [BigInt(appealBookId)],
      });
      toast.success("Appeal submitted");
      setAppealBookId("");
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Appeal failed");
    } finally {
      setPendingAction(null);
    }
  };

  const handleWalletChange = async () => {
    if (!newWallet) {
      toast.error("Add a wallet address.");
      return;
    }
    setPendingAction("wallet");
    try {
      await writeContractAsync({
        ...libraryContract,
        functionName: "requestWalletChange",
        args: [newWallet as `0x${string}`],
      });
      toast.success("Wallet change requested");
      setNewWallet("");
    } catch (error: any) {
      toast.error(
        error?.shortMessage || error?.message || "Wallet change failed"
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleRegister = () => {
    if (!acceptedTerms) {
      toast.error("Accept the terms before registering.");
      return;
    }
    if (!address) {
      toast.error("Connect a wallet to register.");
      return;
    }
    setRegistered(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        `author_registered_${address.toLowerCase()}`,
        "1"
      );
    }
    toast.success("Author profile registered");
  };

  const handlePayoutSetup = async () => {
    if (!payoutWallet) {
      toast.error("Enter a payout wallet address.");
      return;
    }
    if (!registered) {
      toast.error("Register your author wallet first.");
      return;
    }
    setPendingAction("wallet");
    try {
      await writeContractAsync({
        ...libraryContract,
        functionName: "requestWalletChange",
        args: [payoutWallet as `0x${string}`],
      });
      toast.success("Payout address submitted");
      setPayoutConfirmed(true);
      if (address && typeof window !== "undefined") {
        window.localStorage.setItem(
          `author_payout_${address.toLowerCase()}`,
          "1"
        );
      }
    } catch (error: any) {
      toast.error(
        error?.shortMessage || error?.message || "Payout update failed"
      );
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="page">
      <Header />
      <div className="mx-auto max-w-6xl px-6 py-16 text-slate-50">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-yellow-200">
              Author Studio
            </span>
            <h1 className="mt-4 text-4xl font-semibold text-white">
              Publish, upload, and manage books in the Rico Library
            </h1>
            <p className="mt-3 max-w-3xl text-base text-slate-300">
              List new titles, upload assets, and handle book-level updates from
              one workspace. Readers browse the library, buy on-chain, and your
              catalog stays synchronized with the contract.
            </p>
          </div>
          <Link
            href="/library"
            className="rounded-full border border-yellow-400/30 px-4 py-2 text-xs uppercase tracking-[0.2em] text-yellow-200 hover:border-yellow-300 hover:text-yellow-100"
          >
            Back to Library
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { label: "Library Home", href: "/library" },
            { label: "Author Studio", href: "/library/author" },
            { label: "Book Settings", href: "#book-settings" },
            ...(isAdmin ? [{ label: "Admin Console", href: "/library/admin" }] : []),
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-slate-800 bg-black/60 px-4 py-3 text-sm text-slate-200 hover:border-yellow-400/30"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "1. Register & accept terms",
              body: "Confirm the author terms, then register your connected wallet as a publisher.",
            },
            {
              title: "2. Upload and prepare metadata",
              body: "Upload cover and book file, then create metadata and pin to IPFS to get a CID.",
            },
            {
              title: "3. Submit for listing",
              body: "Provide price, CID, and payout address. Admins review and publish.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-yellow-500/10 bg-black/60 p-5"
            >
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-yellow-500/20 bg-black/70 p-8">
          <h3 className="text-lg font-semibold text-white">
            Terms & author registration
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            To list a book, accept the author terms, register your wallet, then
            set a payout address for sales proceeds.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/60 p-5 text-sm text-slate-300">
            <ul className="space-y-2 text-sm text-slate-400">
              <li>• You own the rights to the content you upload.</li>
              <li>• Book listings are reviewed before being published.</li>
              <li>• Payments are sent to the payout address you provide.</li>
              <li>• Fees apply in USDT and RICO when listing.</li>
            </ul>
            <label className="mt-4 flex items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="h-4 w-4 rounded border border-yellow-400/60 bg-black"
              />
              I accept the author terms and conditions.
            </label>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/60 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300/70">
                Step 1
              </p>
              <h4 className="mt-2 text-sm font-semibold text-white">
                Register your author wallet
              </h4>
              <p className="mt-2 text-xs text-slate-400">
                Connected wallet:{" "}
                <span className="text-slate-200">
                  {address ?? "Not connected"}
                </span>
              </p>
              <button
                onClick={handleRegister}
                disabled={!acceptedTerms || !address || registered}
                className="mt-4 w-full rounded-xl border border-yellow-400/40 bg-black/50 px-3 py-2 text-sm font-semibold text-yellow-200 disabled:opacity-50"
              >
                {registered ? "Registered" : "Register author wallet"}
              </button>
            </div>
            {registered ? (
              <div className="rounded-2xl border border-white/10 bg-black/60 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-yellow-300/70">
                  Step 2
                </p>
                <h4 className="mt-2 text-sm font-semibold text-white">
                  Set payout address
                </h4>
                <p className="mt-2 text-xs text-slate-400">
                  Enter the wallet that receives book sales revenue (used by
                  admins when publishing).
                </p>
                <input
                  className="mt-4 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-slate-200"
                  placeholder="Payout wallet address"
                  value={payoutWallet}
                  onChange={(e) => setPayoutWallet(e.target.value)}
                />
                <button
                  onClick={handlePayoutSetup}
                  disabled={pendingAction === "wallet"}
                  className="mt-4 w-full rounded-xl bg-yellow-300/90 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
                >
                  {payoutConfirmed ? "Payout set" : "Save payout address"}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/60 p-5 text-sm text-slate-400">
                Complete Step 1 to unlock the payout address setup.
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-black via-zinc-900 to-black p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
            <h2 className="text-xl font-semibold text-white">
              Submit a new book
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Upload assets, pin to IPFS, then submit the CID on-chain. Fees
              apply in USDT and RICO.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              After submission, admins call `listBook()` with your CID + price
              to publish the book.
            </p>

            <div className="mt-6 grid gap-4">
              {!payoutConfirmed && (
                <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4 text-xs text-yellow-200">
                  Complete the registration + payout steps above to unlock the
                  book submission form.
                </div>
              )}
              <input
                className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-slate-200"
                placeholder="Book title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!payoutConfirmed}
              />
              <input
                className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-slate-200"
                placeholder="Author name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                disabled={!payoutConfirmed}
              />
              <textarea
                className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-slate-200"
                placeholder="Short description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!payoutConfirmed}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-slate-200"
                  placeholder="Price in USDT"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={!payoutConfirmed}
                />
                <input
                  className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-slate-200"
                  placeholder="IPFS CID"
                  value={cid}
                  onChange={(e) => setCid(e.target.value)}
                  disabled={!payoutConfirmed}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="rounded-2xl border border-dashed border-yellow-400/40 bg-black/50 p-4 text-sm text-slate-300">
                  <span className="block text-xs uppercase tracking-[0.2em] text-yellow-300/70">
                    Upload cover
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-2 w-full text-xs text-slate-400"
                    onChange={(e) =>
                      setCoverFile(e.target.files?.[0] ?? null)
                    }
                    disabled={!payoutConfirmed}
                  />
                </label>
                <label className="rounded-2xl border border-dashed border-yellow-400/40 bg-black/50 p-4 text-sm text-slate-300">
                  <span className="block text-xs uppercase tracking-[0.2em] text-yellow-300/70">
                    Upload book file
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.epub,.zip"
                    className="mt-2 w-full text-xs text-slate-400"
                    onChange={(e) => setBookFile(e.target.files?.[0] ?? null)}
                    disabled={!payoutConfirmed}
                  />
                </label>
              </div>

              <button
                type="button"
                disabled
                className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-400 cursor-not-allowed"
              >
                Upload to IPFS (coming soon)
              </button>

              <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-slate-400">
                Upload the cover + book file to IPFS (Pinata/Cloudflare/etc.) and
                paste the CID above. Your metadata JSON should include title,
                description, image, and file URLs.
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <button
                  onClick={() =>
                    approveToken(usdtAddress as string, requiredUsdt, "usdt")
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
                  onClick={() =>
                    approveToken(ricoAddress as string, appFeeRico as bigint, "rico")
                  }
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

              <button
                onClick={handleSubmit}
                disabled={
                  pendingAction === "submit" ||
                  needsUsdtApproval ||
                  needsRicoApproval ||
                  !acceptedTerms ||
                  !registered ||
                  !payoutConfirmed
                }
                className="rounded-2xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 px-6 py-3 text-sm font-semibold text-black disabled:opacity-50"
              >
                {pendingAction === "submit" ? "Submitting..." : "Submit for review"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-yellow-500/20 bg-black/70 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
            <h3 className="text-lg font-semibold text-white">Cover preview</h3>
            <p className="mt-2 text-sm text-slate-400">
              Preview your cover art before submitting.
            </p>
            <div className="mt-6 h-64 rounded-2xl border border-yellow-400/20 bg-[radial-gradient(circle_at_top,_rgba(241,210,133,0.25),_transparent_70%)] flex items-center justify-center text-sm text-slate-400">
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                "Cover preview"
              )}
            </div>
            <div className="mt-6 text-xs text-slate-500">
              {bookFile ? `Book file: ${bookFile.name}` : "No book file added"}
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/50 p-4 text-xs text-slate-400">
              Fees (live): Application{" "}
              <span className="text-slate-200">
                {formatUnits(toBigInt(appFeeUsdt), 18)} USDT
              </span>{" "}
              +{" "}
              <span className="text-slate-200">
                {formatUnits(toBigInt(appFeeRico), 18)} RICO
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-3xl border border-white/10 bg-black/60 p-8">
          <h3 className="text-lg font-semibold text-white">Your books</h3>
          <p className="mt-2 text-sm text-slate-400">
            On-chain books associated with your wallet. Select a book to open its
            settings and reader view.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(authorBookIds as bigint[] | undefined)?.length
              ? (() => {
                  const authorBooksList = (authorBooks as any[] | undefined) ?? [];
                  return (authorBookIds as bigint[]).map((id, index) => {
                    const book = authorBooksList[index]?.result;
                    const priceValue = book?.price
                      ? formatUnits(book.price, 18)
                      : "0";
                    return (
                      <Link
                        key={`author-book-${id.toString()}`}
                        href={`/library/book/${id.toString()}`}
                        className="rounded-2xl border border-yellow-500/10 bg-black/70 p-5"
                      >
                        <p className="text-xs uppercase tracking-[0.2em] text-yellow-300/60">
                          Book #{id.toString()}
                        </p>
                        <p className="mt-2 text-sm text-slate-300">
                          Price: {priceValue} USDT
                        </p>
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          CID: {book?.cid ?? "—"}
                        </p>
                        <span className="mt-4 inline-flex items-center text-xs text-yellow-200">
                          Open settings →
                        </span>
                      </Link>
                    );
                  });
                })()
              : [0, 1, 2].map((index) => (
                  <div
                    key={`author-empty-${index}`}
                    className="rounded-2xl border border-white/10 bg-black/60 p-5 text-sm text-slate-500"
                  >
                    No books yet.
                  </div>
                ))}
          </div>
        </div>

        <div
          id="book-settings"
          className="mt-12 rounded-3xl border border-yellow-500/20 bg-black/70 p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Book settings</h3>
              <p className="mt-2 text-sm text-slate-400">
                Request updates or appeal status for a specific book. These
                actions are logged on-chain.
              </p>
            </div>
            <button
              onClick={refetchFees}
              className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs text-slate-200 hover:border-yellow-400/40"
            >
              Refresh fees
            </button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/60 p-5">
              <h4 className="text-sm font-semibold text-white">
                Request price update
              </h4>
              <p className="mt-2 text-xs text-slate-500">
                Update fee: {formatUnits(toBigInt(updateFeeUsdt), 18)} USDT
              </p>
              <input
                className="mt-4 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-slate-200"
                placeholder="Book ID"
                value={updateBookId}
                onChange={(e) => setUpdateBookId(e.target.value)}
              />
              <input
                className="mt-3 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-slate-200"
                placeholder="New price (USDT)"
                value={updatePrice}
                onChange={(e) => setUpdatePrice(e.target.value)}
              />
              <button
                onClick={handlePriceUpdate}
                disabled={pendingAction === "update" || needsUsdtApproval}
                className="mt-4 w-full rounded-xl bg-yellow-300/90 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {pendingAction === "update" ? "Submitting..." : "Request update"}
              </button>
              {needsUsdtApproval && (
                <p className="mt-2 text-xs text-yellow-200">
                  Approve USDT to cover fees before submitting.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/60 p-5">
              <h4 className="text-sm font-semibold text-white">Appeal status</h4>
              <p className="mt-2 text-xs text-slate-500">
                Appeal fee: {formatUnits(toBigInt(appealFeeUsdt), 18)} USDT
              </p>
              <input
                className="mt-4 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-slate-200"
                placeholder="Book ID"
                value={appealBookId}
                onChange={(e) => setAppealBookId(e.target.value)}
              />
              <button
                onClick={handleAppeal}
                disabled={pendingAction === "appeal" || needsUsdtApproval}
                className="mt-4 w-full rounded-xl border border-yellow-400/40 bg-black/50 px-3 py-2 text-sm font-semibold text-yellow-200 disabled:opacity-50"
              >
                {pendingAction === "appeal" ? "Submitting..." : "Submit appeal"}
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/60 p-5">
              <h4 className="text-sm font-semibold text-white">
                Request wallet change
              </h4>
              <p className="mt-2 text-xs text-slate-500">
                Submit a new payout wallet for royalties.
              </p>
              <input
                className="mt-4 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-slate-200"
                placeholder="New wallet address"
                value={newWallet}
                onChange={(e) => setNewWallet(e.target.value)}
              />
              <button
                onClick={handleWalletChange}
                disabled={pendingAction === "wallet"}
                className="mt-4 w-full rounded-xl border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 disabled:opacity-50"
              >
                {pendingAction === "wallet"
                  ? "Submitting..."
                  : "Request change"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
