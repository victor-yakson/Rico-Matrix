"use client";

import { Header } from "@/components/Navigation/Header";
import { useAccount } from "wagmi";
import { useForm } from "react-hook-form";
import { useEffect, useState, type DragEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuantuMatrix } from "@/hooks/useQuantuMatrix";
import {
  canPublishLibraryBook,
  getHighestUnlockedChapter,
  MIN_LIBRARY_PUBLISH_CHAPTER,
} from "@/lib/libraryEligibility";

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
const PUBLISH_WALKTHROUGH_URL = "https://youtu.be/NM3VC81b-k8?si=syGh0nJ0PQXr5CMB";

const statusStyles: Record<UploadStatus, string> = {
  idle: "bg-slate-500/10 text-slate-200 border-slate-400/30",
  processing: "bg-yellow-500/10 text-yellow-200 border-yellow-400/30",
  approved: "bg-amber-500/10 text-amber-100 border-amber-400/30",
  rejected: "bg-red-500/10 text-red-200 border-red-400/30",
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

const ProgressBar = ({ progress, label }: { progress: number; label: string }) => {
  const width = Math.max(0, Math.min(100, progress));
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
        <span className="uppercase tracking-[0.18em] text-slate-400">{label}</span>
        <span className="font-semibold text-slate-100">{Math.round(progress)}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/80">
        <div
          className="h-full bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 transition-all duration-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

export default function LibraryUploadPage() {
  const locale = useLocale();
  const tCommon = useTranslations("LibraryCommon");
  const tPage = useTranslations("LibraryUploadPage");
  const commonCopy = {
    buttons: tCommon.raw("buttons") as Record<string, string>,
    labels: tCommon.raw("labels") as Record<string, string>,
  };
  const copy = {
    status: tPage.raw("status") as Record<string, string>,
    steps: tPage.raw("steps") as string[],
    stage: tPage.raw("stage") as Record<string, string>,
    messages: tPage.raw("messages") as Record<string, string>,
    hero: tPage.raw("hero") as Record<string, string>,
    labels: tPage.raw("labels") as Record<string, string>,
    walkthrough: tPage.raw("walkthrough") as Record<string, string>,
    access: tPage.raw("access") as Record<string, string>,
  };
  const statusLabels: Record<UploadStatus, string> = copy.status;
  const workflowSteps = copy.steps;
  const stageFromProgress = (progress: number) => {
    if (progress < 30) return copy.stage.uploading;
    if (progress < 72) return copy.stage.verifying;
    if (progress < 96) return copy.stage.ipfs;
    return copy.stage.finalizing;
  };
  const router = useRouter();
  const { address } = useAccount();
  const { userData } = useQuantuMatrix();
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState(copy.stage.waiting);
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
  const highestUnlockedChapter = getHighestUnlockedChapter(
    userData?.track1Unlocked,
    userData?.track2Unlocked
  );
  const canPublishBooks = canPublishLibraryBook(
    userData?.track1Unlocked,
    userData?.track2Unlocked
  );
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
    if (!canPublishBooks) {
      setStatus("rejected");
      setMessage(
        copy.access.description
          .replace("{chapter}", String(MIN_LIBRARY_PUBLISH_CHAPTER))
          .replace("{currentChapter}", String(highestUnlockedChapter))
      );
      return;
    }

    setStatus("processing");
    setMessage(copy.messages.doNotRefresh);
    setSimilarity(null);
    setProgress(5);
    setStageLabel(copy.stage.uploading);

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
        setMessage(copy.messages.attachPdf);
        return;
      }
      if (!thumbnail) {
        setStatus("rejected");
        setMessage(copy.messages.attachThumb);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setStatus("rejected");
        setMessage(copy.messages.pdfTooLarge);
        return;
      }
      if (thumbnail.size > MAX_FILE_SIZE) {
        setStatus("rejected");
        setMessage(copy.messages.thumbTooLarge);
        return;
      }
      if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        setStatus("rejected");
        setMessage(copy.messages.pdfOnly);
        return;
      }
      if (
        !thumbnail.type.startsWith("image/") &&
        !/\.(jpg|jpeg|png|webp)$/i.test(thumbnail.name)
      ) {
        setStatus("rejected");
        setMessage(copy.messages.thumbOnly);
        return;
      }

      const verifyData = new FormData();
      verifyData.append("file", file);
      verifyData.append("authorWallet", data.authorWallet);

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
        setStageLabel(copy.stage.failed);
        setMessage(payload?.error || "Upload rejected.");
        return;
      }

      if (!payload) {
        setStatus("rejected");
        setProgress(0);
        setStageLabel(copy.stage.failed);
        setMessage(copy.messages.emptyResponse);
        return;
      }

      setProgress(76);
      setStageLabel(copy.stage.ipfs);
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
        setStageLabel(copy.stage.failed);
        setMessage(uploadPayload?.error || "IPFS upload failed.");
        return;
      }

      setStatus("approved");
      setProgress(100);
      setStageLabel(copy.stage.finalizing);
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
      <div className="theme-shell theme-page-shell min-h-[calc(100vh-4rem)]">
        <div className="theme-container py-10">
          <section className="theme-panel p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="theme-kicker">{copy.hero.kicker}</p>
                <h1 className="theme-title mt-2 max-w-3xl font-semibold">
                  <span className="theme-title-accent">{copy.hero.title}</span>
                </h1>
                <p className="theme-copy mt-3 max-w-2xl text-sm">
                  {copy.hero.description}
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
                  className="theme-button-ghost text-xs uppercase tracking-[0.18em]"
                >
                  {commonCopy.labels.marketplace}
                </Link>
                <Link
                  href="/library/my-books"
                  className="theme-button-ghost text-xs uppercase tracking-[0.18em]"
                >
                  {commonCopy.buttons.myLibrary}
                </Link>
              </div>
            </div>
          </section>

          <section className="theme-panel-soft mt-6 border-yellow-400/30 p-4 text-sm text-yellow-100">
            {copy.messages.doNotRefresh} If this flow is interrupted, you may need to restart the upload.
          </section>

          {!canPublishBooks && (
            <section className="theme-panel-soft mt-6 border-red-400/35 bg-red-500/10 p-5 text-sm text-red-100">
              <p className="theme-kicker text-red-200">{copy.access.kicker}</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-50">
                {copy.access.title.replace(
                  "{chapter}",
                  String(MIN_LIBRARY_PUBLISH_CHAPTER)
                )}
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-200/90">
                {copy.access.description
                  .replace("{chapter}", String(MIN_LIBRARY_PUBLISH_CHAPTER))
                  .replace("{currentChapter}", String(highestUnlockedChapter))}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/chapters"
                  className="theme-button-primary px-4 py-2 text-xs uppercase tracking-[0.18em]"
                >
                  {copy.access.button}
                </Link>
              </div>
            </section>
          )}

          <section className="theme-panel-soft mt-6 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="theme-kicker">{copy.walkthrough.kicker}</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-50">
                  {copy.walkthrough.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-300/85">
                  {copy.walkthrough.description}
                </p>
              </div>
              <a
                href={PUBLISH_WALKTHROUGH_URL}
                target="_blank"
                rel="noreferrer"
                className="theme-button-secondary px-4 py-2 text-xs uppercase tracking-[0.18em]"
              >
                {copy.walkthrough.button}
              </a>
            </div>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="theme-panel p-6"
            >
              <fieldset
                disabled={isSubmitting || !canPublishBooks}
                className="space-y-5 disabled:opacity-70"
              >
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {copy.labels.title}
                  </label>
                  <input
                    {...register("title", { required: "Title is required." })}
                    className="theme-input mt-2 text-sm"
                    placeholder={copy.labels.title}
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-red-300">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {copy.labels.description}
                  </label>
                  <textarea
                    {...register("description", {
                      required: "Description is required.",
                    })}
                    rows={5}
                    className="theme-input mt-2 min-h-[9rem] resize-y py-3 text-sm"
                    placeholder={copy.labels.description}
                  />
                  {errors.description && (
                    <p className="mt-1 text-xs text-red-300">{errors.description.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {copy.labels.authorWallet}
                  </label>
                  <input
                    {...register("authorWallet", {
                      required: "Wallet address is required.",
                    })}
                    className="theme-input mt-2 text-sm"
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
                      {copy.labels.pdf}
                    </label>
                    <label
                      htmlFor="book-file-upload"
                      onDragOver={(event) => {
                        event.preventDefault();
                        setPdfDragActive(true);
                      }}
                      onDragLeave={() => setPdfDragActive(false)}
                      onDrop={handlePdfDrop}
                      className={`theme-card-compact mt-2 flex min-h-[120px] cursor-pointer flex-col items-center justify-center border border-dashed px-4 py-4 text-center transition ${
                        pdfDragActive
                          ? "border-amber-300/70 bg-amber-400/10"
                          : "border-slate-700 hover:border-yellow-300/35"
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
                      {copy.labels.thumbnail}
                    </label>
                    <label
                      htmlFor="book-thumbnail-upload"
                      onDragOver={(event) => {
                        event.preventDefault();
                        setThumbnailDragActive(true);
                      }}
                      onDragLeave={() => setThumbnailDragActive(false)}
                      onDrop={handleThumbnailDrop}
                      className={`theme-card-compact mt-2 flex min-h-[120px] cursor-pointer flex-col items-center justify-center border border-dashed px-4 py-4 text-center transition ${
                        thumbnailDragActive
                          ? "border-amber-300/70 bg-amber-400/10"
                          : "border-slate-700 hover:border-yellow-300/35"
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
                className="theme-button-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting || status === "processing"
                  ? copy.labels.submitting
                  : copy.labels.submit}
              </button>
            </form>

            <aside className="space-y-6">
              <div className="theme-panel p-6">
                <div className="theme-section-header mb-4">
                  <div>
                    <p className="theme-kicker">Workflow</p>
                    <h2 className="theme-section-title text-lg font-semibold">Process Tracker</h2>
                  </div>
                </div>
                <p className="theme-section-copy mt-1 text-sm">
                  Track upload, moderation, and IPFS packaging in real time.
                </p>

                <div className="mt-4">
                  <ProgressBar progress={progress} label={copy.labels.progress} />
                </div>

                <div className="theme-card-compact mt-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Current Stage
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{stageLabel}</p>
                  <p className="mt-3 text-sm text-slate-300">
                    {message || copy.hero.description}
                  </p>
                  {similarity != null && (
                    <p className="mt-2 text-xs text-slate-400">
                      Similarity score: {similarity.toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>

              <div className="theme-panel-soft p-6">
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
                            ? "border-yellow-400/35 bg-yellow-500/10 text-yellow-100"
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
