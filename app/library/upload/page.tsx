"use client";

import { Header } from "@/components/Navigation/Header";
import { useAccount } from "wagmi";
import { useForm } from "react-hook-form";
import { useEffect, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type UploadForm = {
  title: string;
  description: string;
  authorWallet: string;
  file: FileList;
  thumbnail: FileList;
};

type UploadStatus =
  | "idle"
  | "processing"
  | "approved"
  | "rejected";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const statusStyles: Record<UploadStatus, string> = {
  idle: "bg-slate-500/10 text-slate-200 border-slate-400/30",
  processing: "bg-yellow-500/10 text-yellow-200 border-yellow-400/30",
  approved: "bg-emerald-500/10 text-emerald-200 border-emerald-400/30",
  rejected: "bg-red-500/10 text-red-200 border-red-400/30",
};

const statusLabels: Record<UploadStatus, string> = {
  idle: "Idle",
  processing: "Processing",
  approved: "Approved",
  rejected: "Rejected",
};

const workflowSteps = [
  "Upload PDF & thumbnail",
  "Fingerprint moderation",
  "IPFS folder packaging",
  "Ready for listing",
];

const stageFromProgress = (progress: number) => {
  if (progress < 30) return "Uploading PDF";
  if (progress < 72) return "Verifying content fingerprint";
  if (progress < 96) return "Uploading folder to IPFS";
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

const ProgressBar = ({ progress }: { progress: number }) => {
  const width = Math.max(0, Math.min(100, progress));
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
        <span className="uppercase tracking-[0.18em] text-slate-400">Progress</span>
        <span className="font-semibold text-slate-100">{Math.round(progress)}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/80">
        <div
          className="h-full bg-gradient-to-r from-amber-300 via-yellow-300 to-emerald-300 transition-all duration-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

export default function LibraryUploadPage() {
  const router = useRouter();
  const { address } = useAccount();
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState("Waiting to start");
  const [pdfDragActive, setPdfDragActive] = useState(false);
  const [thumbnailDragActive, setThumbnailDragActive] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UploadForm>({
    defaultValues: {
      title: "",
      description: "",
      authorWallet: address ?? "",
    },
  });

  useEffect(() => {
    if (address) {
      setValue("authorWallet", address);
    }
  }, [address, setValue]);

  const selectedPdf = watch("file")?.[0];
  const selectedThumb = watch("thumbnail")?.[0];
  const currentStep =
    progress < 30 ? 0 : progress < 72 ? 1 : progress < 96 ? 2 : 3;

  useEffect(() => {
    if (!selectedThumb) {
      setThumbnailPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(selectedThumb);
    setThumbnailPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedThumb]);

  const toFileList = (file: File): FileList => {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    return transfer.files;
  };

  const handlePdfDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setPdfDragActive(false);

    const dropped = event.dataTransfer.files?.[0];
    if (!dropped) return;
    setValue("file", toFileList(dropped), { shouldValidate: true, shouldDirty: true });
    clearErrors("file");
  };

  const handleThumbnailDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setThumbnailDragActive(false);

    const dropped = event.dataTransfer.files?.[0];
    if (!dropped) return;
    setValue("thumbnail", toFileList(dropped), { shouldValidate: true, shouldDirty: true });
    clearErrors("thumbnail");
  };

  const onSubmit = async (data: UploadForm) => {
    setStatus("processing");
    setMessage("Do not refresh or close this page during processing.");
    setSimilarity(null);
    setProgress(5);
    setStageLabel("Uploading PDF");

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const next =
          prev < 30 ? prev + 2.5 : prev < 85 ? prev + 1.3 : prev < 95 ? prev + 0.8 : prev;
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

      const verifyData = new FormData();
      verifyData.append("file", file);

      const res = await fetch("/api/verify-content", {
        method: "POST",
        body: verifyData,
      });

      const payload = await parseJsonSafely<{
        error?: string;
        duplicateBookId?: string;
        fingerprint?: string;
        status?: string;
      }>(res);
      if (!res.ok) {
        setStatus("rejected");
        setProgress(0);
        setStageLabel("Failed");
        setMessage(payload?.error || "Upload rejected.");
        return;
      }

      if (!payload) {
        setStatus("rejected");
        setProgress(0);
        setStageLabel("Failed");
        setMessage("Server returned an empty response. Please try again.");
        return;
      }

      setProgress(76);
      setStageLabel("Uploading folder to IPFS");
      setMessage("Verification passed. Uploading metadata folder to IPFS...");

      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("thumbnail", thumbnail);
      uploadData.append("title", data.title);
      uploadData.append("description", data.description);
      uploadData.append("authorWallet", data.authorWallet);

      const uploadRes = await fetch("/api/upload-folder", {
        method: "POST",
        body: uploadData,
      });

      const uploadPayload = await parseJsonSafely<{
        error?: string;
        cid?: string;
        book?: { id?: number };
      }>(uploadRes);

      if (!uploadRes.ok) {
        setStatus("rejected");
        setProgress(0);
        setStageLabel("Failed");
        setMessage(uploadPayload?.error || "IPFS upload failed.");
        return;
      }

      setStatus("approved");
      setProgress(100);
      setStageLabel("Folder uploaded");
      setMessage(
        `Book folder uploaded to IPFS successfully (${uploadPayload?.cid || "CID ready"}). Redirecting to listing setup...`
      );

      const nextRecordId =
        uploadPayload?.book?.id && Number.isFinite(uploadPayload.book.id)
          ? uploadPayload.book.id
          : null;

      setTimeout(() => {
        if (nextRecordId) {
          router.push(`/library/${nextRecordId}`);
          return;
        }
        router.push("/library/my-books?mode=author");
      }, 700);
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
      <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_45%),linear-gradient(180deg,#020617_0%,#020617_100%)]">
        <div className="container mx-auto px-4 py-10">
          <section className="rounded-3xl border border-slate-700/60 bg-slate-900/50 p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-amber-300/80">
                  Library Upload
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-50 md:text-4xl">
                  Submit Book For Moderation
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300/80">
                  Upload a PDF and thumbnail for automated moderation, fingerprint verification,
                  and IPFS packaging before listing.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${statusStyles[status]}`}
                >
                  {statusLabels[status]}
                </span>
                <Link
                  href="/library"
                  className="rounded-xl border border-slate-600 bg-slate-800/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 hover:bg-slate-700/60"
                >
                  Marketplace
                </Link>
                <Link
                  href="/library/my-books"
                  className="rounded-xl border border-slate-600 bg-slate-800/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 hover:bg-slate-700/60"
                >
                  My Books
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            Do not refresh or close this page during processing. If this flow is interrupted, you
            may need to restart the upload.
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="rounded-3xl border border-slate-700/60 bg-slate-900/50 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            >
              <fieldset disabled={isSubmitting} className="space-y-5 disabled:opacity-70">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Book Title
                  </label>
                  <input
                    {...register("title", { required: "Title is required." })}
                    className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none focus:border-amber-400/50"
                    placeholder="Enter book title"
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-red-300">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Description
                  </label>
                  <textarea
                    {...register("description", {
                      required: "Description is required.",
                    })}
                    rows={5}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-amber-400/50"
                    placeholder="Describe your book"
                  />
                  {errors.description && (
                    <p className="mt-1 text-xs text-red-300">{errors.description.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Author Wallet
                  </label>
                  <input
                    {...register("authorWallet", {
                      required: "Wallet address is required.",
                    })}
                    className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none focus:border-amber-400/50"
                    placeholder="0x..."
                    onFocus={() => {
                      if (address) setValue("authorWallet", address);
                    }}
                  />
                  {errors.authorWallet && (
                    <p className="mt-1 text-xs text-red-300">{errors.authorWallet.message}</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      PDF File
                    </label>
                    <label
                      htmlFor="book-file-upload"
                      onDragOver={(event) => {
                        event.preventDefault();
                        setPdfDragActive(true);
                      }}
                      onDragLeave={() => setPdfDragActive(false)}
                      onDrop={handlePdfDrop}
                      className={`mt-2 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-slate-950/80 px-4 py-4 text-center transition ${
                        pdfDragActive
                          ? "border-amber-300/70 bg-amber-400/10"
                          : "border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      <input
                        id="book-file-upload"
                        {...register("file", {
                          required: "PDF file is required.",
                        })}
                        type="file"
                        accept="application/pdf"
                        className="sr-only"
                      />
                      <p className="text-sm font-medium text-slate-200">
                        Drag and drop your PDF here
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        or click to browse files
                      </p>
                    </label>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {selectedPdf ? `${selectedPdf.name}` : "Max size 10MB"}
                    </p>
                    {errors.file && (
                      <p className="mt-1 text-xs text-red-300">{errors.file.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Thumbnail
                    </label>
                    <label
                      htmlFor="book-thumbnail-upload"
                      onDragOver={(event) => {
                        event.preventDefault();
                        setThumbnailDragActive(true);
                      }}
                      onDragLeave={() => setThumbnailDragActive(false)}
                      onDrop={handleThumbnailDrop}
                      className={`mt-2 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-slate-950/80 px-4 py-4 text-center transition ${
                        thumbnailDragActive
                          ? "border-amber-300/70 bg-amber-400/10"
                          : "border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      <input
                        id="book-thumbnail-upload"
                        {...register("thumbnail", {
                          required: "Thumbnail image is required.",
                        })}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                      />
                      <p className="text-sm font-medium text-slate-200">
                        Drag and drop your thumbnail
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        jpg, png, webp | click to browse
                      </p>
                    </label>
                    {thumbnailPreview && (
                      <div className="mt-3 overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950">
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="h-28 w-full object-cover"
                        />
                      </div>
                    )}
                    <p className="mt-1 text-[11px] text-slate-500">
                      {selectedThumb ? `${selectedThumb.name}` : "jpg, png, webp | max 10MB"}
                    </p>
                    {errors.thumbnail && (
                      <p className="mt-1 text-xs text-red-300">{errors.thumbnail.message}</p>
                    )}
                  </div>
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-300 via-yellow-300 to-emerald-300 px-5 py-3 text-sm font-semibold text-black shadow-[0_0_28px_rgba(251,191,36,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting || status === "processing"
                  ? "Processing..."
                  : "Start Upload & Moderation"}
              </button>
            </form>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-700/60 bg-slate-900/50 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                <h2 className="text-lg font-semibold text-slate-50">Process Tracker</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Track upload, moderation, and IPFS packaging in real time.
                </p>

                <div className="mt-4">
                  <ProgressBar progress={progress} />
                </div>

                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Current Stage
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{stageLabel}</p>
                  <p className="mt-3 text-sm text-slate-300">
                    {message || "Upload your PDF to begin AI scanning."}
                  </p>
                  {similarity != null && (
                    <p className="mt-2 text-xs text-slate-400">
                      Similarity score: {similarity.toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-700/60 bg-slate-900/50 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-100">
                  Workflow
                </h3>
                <div className="mt-4 space-y-3">
                  {workflowSteps.map((step, index) => {
                    const done = currentStep > index || progress >= 100;
                    const active = currentStep === index && status === "processing";
                    return (
                      <div
                        key={step}
                        className={`rounded-xl border px-3 py-2 text-sm ${
                          done
                            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                            : active
                            ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                            : "border-slate-700 bg-slate-950/70 text-slate-300"
                        }`}
                      >
                        {index + 1}. {step}
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
