"use client";

import { Header } from "@/components/Navigation/Header";
import { useAccount } from "wagmi";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Book } from "@/types/library";

type UploadForm = {
  title: string;
  description: string;
  authorWallet: string;
  payoutWallet: string;
  price: string;
  file: FileList;
  thumbnail: FileList;
};

type UploadStatus =
  | "idle"
  | "processing"
  | "approved"
  | "pending"
  | "rejected";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const statusStyles: Record<UploadStatus, string> = {
  idle: "bg-slate-500/10 text-slate-200 border-slate-400/30",
  processing: "bg-yellow-500/10 text-yellow-200 border-yellow-400/30",
  approved: "bg-emerald-500/10 text-emerald-200 border-emerald-400/30",
  pending: "bg-amber-500/10 text-amber-200 border-amber-400/30",
  rejected: "bg-red-500/10 text-red-200 border-red-400/30",
};

const statusLabels: Record<UploadStatus, string> = {
  idle: "Idle",
  processing: "Processing",
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
};

const stageFromProgress = (progress: number) => {
  if (progress < 22) return "Uploading PDF";
  if (progress < 46) return "Validating PDF";
  if (progress < 74) return "Running AI moderation";
  if (progress < 96) return "Uploading approved file to IPFS";
  return "Finalizing";
};

const parseJsonSafely = async <T,>(res: Response): Promise<T | null> => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="w-full">
    <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
      <span>Progress</span>
      <span>{Math.round(progress)}%</span>
    </div>
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full bg-gradient-to-r from-yellow-300 via-amber-300 to-emerald-300 transition-all duration-300"
        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
      />
    </div>
  </div>
);

export default function LibraryUploadPage() {
  const router = useRouter();
  const { address } = useAccount();
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState("Waiting to start");
  const [activeBookId, setActiveBookId] = useState<number | null>(null);
  const [activeBookStatus, setActiveBookStatus] = useState<Book["status"] | null>(null);
  const [activeBookStage, setActiveBookStage] = useState<string | null>(null);
  const [isUploadLocked, setIsUploadLocked] = useState(false);
  const [lockReason, setLockReason] = useState("");
  const [isCheckingLock, setIsCheckingLock] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UploadForm>({
    defaultValues: {
      title: "",
      description: "",
      authorWallet: address ?? "",
      payoutWallet: address ?? "",
      price: "",
    },
  });

  const resetUiState = () => {
    setStatus("idle");
    setMessage("");
    setSimilarity(null);
    setProgress(0);
    setStageLabel("Waiting to start");
    setActiveBookId(null);
    setActiveBookStatus(null);
    setActiveBookStage(null);
  };

  useEffect(() => {
    if (address) {
      setValue("authorWallet", address);
      setValue("payoutWallet", address);
    }
  }, [address, setValue]);

  const fetchActiveFlow = async () => {
    if (!address) {
      setIsUploadLocked(false);
      setLockReason("");
      resetUiState();
      return;
    }

    setIsCheckingLock(true);
    try {
      const res = await fetch(`/api/books?authorWallet=${encodeURIComponent(address)}`, {
        cache: "no-store",
      });
      const payload = await parseJsonSafely<{ books?: Book[] }>(res);
      if (!res.ok || !payload) {
        setIsUploadLocked(false);
        return;
      }

      const books = payload.books || [];
      const active = books.find((book) =>
        ["pending", "approved", "listed"].includes(book.status)
      );

      if (!active) {
        setIsUploadLocked(false);
        setLockReason("");
        resetUiState();
        return;
      }

      setActiveBookId(active.id);
      setActiveBookStatus(active.status);
      setActiveBookStage(active.processStage || null);
      setIsUploadLocked(true);

      if (active.status === "pending") {
        setStatus("pending");
        setProgress(active.processProgress ?? 60);
        setStageLabel(active.processStage || "Processing");
        setMessage(
          active.processMessage ||
            "You have a pending upload flow. Complete it before uploading a new book."
        );
        setLockReason(
          active.processMessage ||
            "You have a pending upload flow. Complete it before uploading a new book."
        );
      } else {
        resetUiState();
        setLockReason(
          "You already have an approved/listed book. New uploads are disabled for this wallet."
        );
      }
    } finally {
      setIsCheckingLock(false);
    }
  };

  useEffect(() => {
    fetchActiveFlow();
    if (!address) return;
    const interval = setInterval(fetchActiveFlow, 10000);
    return () => clearInterval(interval);
  }, [address]);

  const onSubmit = async (data: UploadForm) => {
    if (isUploadLocked) {
      setStatus("rejected");
      setMessage(lockReason || "Upload is locked for this wallet.");
      return;
    }

    setStatus("processing");
    setMessage("Do not refresh or close this page during processing.");
    setSimilarity(null);
    setProgress(5);
    setStageLabel("Uploading PDF");

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const next = prev < 22 ? prev + 3 : prev < 46 ? prev + 1.8 : prev < 74 ? prev + 1.2 : prev < 95 ? prev + 0.8 : prev;
        setStageLabel(stageFromProgress(next));
        return next;
      });
    }, 650);

    try {
      const file = data.file?.[0];
      const thumbnail = data.thumbnail?.[0];
      if (!file) {
        setStatus("rejected");
        setMessage("Please attach a PDF file.");
        return;
      }
      if (!thumbnail) {
        setStatus("rejected");
        setMessage("Please attach a thumbnail image.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setStatus("rejected");
        setMessage("PDF exceeds 10MB limit.");
        return;
      }
      if (thumbnail.size > MAX_FILE_SIZE) {
        setStatus("rejected");
        setMessage("Thumbnail exceeds 10MB limit.");
        return;
      }
      if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        setStatus("rejected");
        setMessage("Only PDF files are allowed.");
        return;
      }
      if (
        !thumbnail.type.startsWith("image/") &&
        !/\.(jpg|jpeg|png|webp)$/i.test(thumbnail.name)
      ) {
        setStatus("rejected");
        setMessage("Thumbnail must be jpg, png, or webp.");
        return;
      }
      if (!/^\d+(\.\d+)?$/.test(data.price)) {
        setStatus("rejected");
        setMessage("Enter a valid price.");
        return;
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(data.payoutWallet)) {
        setStatus("rejected");
        setMessage("Enter a valid payout wallet address.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("thumbnail", thumbnail);
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("authorWallet", data.authorWallet);
      formData.append("payoutWallet", data.payoutWallet);
      formData.append("price", data.price);

      const res = await fetch("/api/upload-book", {
        method: "POST",
        body: formData,
      });

      const payload = await parseJsonSafely<{
        status?: string;
        reason?: string;
        error?: string;
        similarity?: number;
        activeBookId?: number;
        restartRequired?: boolean;
        progress?: number;
        recordId?: number;
        nextPath?: string;
      }>(res);
      if (!res.ok) {
        setStatus("rejected");
        setProgress(0);
        setStageLabel("Failed");
        setMessage(payload?.reason || payload?.error || "Upload rejected.");
        if (payload?.similarity != null) setSimilarity(payload.similarity);
        if (payload?.activeBookId) setActiveBookId(payload.activeBookId);
        await fetchActiveFlow();
        return;
      }

      if (!payload) {
        setStatus("rejected");
        setProgress(0);
        setStageLabel("Failed");
        setMessage("Server returned an empty response. Please try again.");
        return;
      }

      setStatus("approved");
      setProgress(100);
      setStageLabel("Ready for listing");
      setMessage("Moderation passed and IPFS upload completed.");
      setActiveBookId(payload?.recordId || null);

      if (payload.recordId) {
        const nextPath = payload.nextPath || `/library/${payload.recordId}`;
        setTimeout(() => router.push(nextPath), 600);
      } else {
        resetUiState();
      }
    } catch (error: any) {
      setStatus("rejected");
      setProgress(0);
      setStageLabel("Failed");
      setMessage(error?.message || "Upload failed.");
    } finally {
      clearInterval(progressTimer);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-2">
                Library Upload
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-50">
                Submit your book for AI moderation
              </h1>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${statusStyles[status]}`}
            >
              {statusLabels[status]}
            </span>
          </div>

          <div className="mb-6 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            Do not refresh or close this page during upload/moderation. If interrupted before completion, you may need to restart the process.
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="rounded-2xl border border-white/10 bg-slate-950/80 p-6 shadow-[0_0_32px_rgba(0,0,0,0.8)]"
            >
              {isUploadLocked && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {lockReason}
                  {activeBookId && activeBookStatus === "approved" && (
                    <div className="mt-2">
                      <Link
                        href={`/library/${activeBookId}`}
                        className="text-xs uppercase tracking-[0.2em] text-yellow-200"
                      >
                        Go To Listing Page
                      </Link>
                    </div>
                  )}
                  {activeBookId && activeBookStatus === "pending" && (
                    <div className="mt-2">
                      <Link
                        href={`/library/${activeBookId}`}
                        className="text-xs uppercase tracking-[0.2em] text-yellow-200"
                      >
                        Continue Existing Flow
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <fieldset
                disabled={isSubmitting || isUploadLocked || isCheckingLock}
                className="space-y-5 disabled:opacity-70"
              >
                <div>
                  <label className="text-sm text-slate-300">Book Title</label>
                  <input
                    {...register("title", { required: "Title is required." })}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-3 text-sm text-slate-200"
                    placeholder="Enter book title"
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-red-300">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-slate-300">Description</label>
                  <textarea
                    {...register("description", {
                      required: "Description is required.",
                    })}
                    rows={5}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-3 text-sm text-slate-200"
                    placeholder="Describe your book"
                  />
                  {errors.description && (
                    <p className="mt-1 text-xs text-red-300">{errors.description.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-slate-300">Author Wallet</label>
                  <input
                    {...register("authorWallet", {
                      required: "Wallet address is required.",
                    })}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-3 text-sm text-slate-200"
                    placeholder="0x..."
                    onFocus={() => {
                      if (address) setValue("authorWallet", address);
                    }}
                  />
                  {errors.authorWallet && (
                    <p className="mt-1 text-xs text-red-300">
                      {errors.authorWallet.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-slate-300">Payout Wallet</label>
                  <input
                    {...register("payoutWallet", {
                      required: "Payout wallet is required.",
                      pattern: {
                        value: /^0x[a-fA-F0-9]{40}$/,
                        message: "Enter a valid wallet address.",
                      },
                    })}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-3 text-sm text-slate-200"
                    placeholder="0x..."
                  />
                  {errors.payoutWallet && (
                    <p className="mt-1 text-xs text-red-300">
                      {errors.payoutWallet.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-slate-300">Price (USDT)</label>
                  <input
                    {...register("price", {
                      required: "Price is required.",
                      pattern: {
                        value: /^\d+(\.\d+)?$/,
                        message: "Enter a valid price.",
                      },
                    })}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-black/60 px-4 py-3 text-sm text-slate-200"
                    placeholder="e.g. 10"
                  />
                  {errors.price && (
                    <p className="mt-1 text-xs text-red-300">{errors.price.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-slate-300">PDF File</label>
                  <input
                    {...register("file", {
                      required: "PDF file is required.",
                    })}
                    type="file"
                    accept="application/pdf"
                    className="mt-2 w-full rounded-xl border border-dashed border-slate-700 bg-black/60 px-4 py-3 text-sm text-slate-200"
                  />
                  {errors.file && (
                    <p className="mt-1 text-xs text-red-300">{errors.file.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-slate-300">Thumbnail Image</label>
                  <input
                    {...register("thumbnail", {
                      required: "Thumbnail image is required.",
                    })}
                    type="file"
                    accept="image/*"
                    className="mt-2 w-full rounded-xl border border-dashed border-slate-700 bg-black/60 px-4 py-3 text-sm text-slate-200"
                  />
                  {errors.thumbnail && (
                    <p className="mt-1 text-xs text-red-300">
                      {errors.thumbnail.message}
                    </p>
                  )}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={isSubmitting || isUploadLocked || isCheckingLock}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 px-5 py-3 text-sm font-semibold text-black shadow-[0_0_24px_rgba(250,204,21,0.35)] disabled:opacity-50"
              >
                {isCheckingLock
                  ? "Checking account..."
                  : isSubmitting || status === "processing"
                  ? "Processing..."
                  : "Submit for review"}
              </button>
            </form>

            <div className="rounded-2xl border border-white/10 bg-black/60 p-6 shadow-[0_0_32px_rgba(0,0,0,0.8)]">
              <h2 className="text-lg font-semibold text-slate-50 mb-3">
                Upload workflow
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Validation, moderation, and IPFS upload happen in one secured flow.
              </p>

              <ProgressBar progress={progress} />

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Current Stage
                </p>
                <p className="mt-1 text-sm text-slate-100">{stageLabel}</p>
                <p className="mt-3 text-sm text-slate-300">
                  {message || "Upload your PDF to begin AI scanning."}
                </p>
                {similarity != null && (
                  <p className="mt-2 text-xs text-slate-400">
                    Similarity score: {similarity.toFixed(2)}%
                  </p>
                )}

                {activeBookId &&
                  activeBookStatus === "approved" &&
                  activeBookStage === "ready_for_listing" && (
                    <Link
                      href={`/library/${activeBookId}`}
                      className="mt-3 inline-flex text-xs uppercase tracking-[0.2em] text-yellow-200"
                    >
                      Open Listing Page
                    </Link>
                  )}

                {activeBookId && activeBookStatus === "pending" && (
                  <Link
                    href={`/library/${activeBookId}`}
                    className="mt-3 inline-flex text-xs uppercase tracking-[0.2em] text-yellow-200"
                  >
                    Continue Existing Book Flow
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
