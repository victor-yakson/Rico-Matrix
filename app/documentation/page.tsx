"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Header } from "@/components/Navigation/Header";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Local worker served from /public/pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
const WHITEPAPER_URL = "https://rico-matrix.gitbook.io/whitepaper";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function DocumentationPage() {
  const t = useTranslations("Documentation");
  const locale = useLocale();

  // Dynamic PDF URL based on language
  const PDF_URL = useMemo(() => {
    return `/api/documentation/pdf?lang=${locale === "fr" ? "fr" : "en"}`;
  }, [locale]);

  const tocItems: TocItem[] = useMemo(
    () => [
      { section: "cover", title: "Cover / Title", page: 1 },
      { section: "decentralization", title: "Decentralization & Smart Contract", page: 2 },
      { section: "what-is", title: "What is Rico Matrix (100% Decentralized)", page: 3 },
      { section: "ip", title: "Intellectual Property (IP Utility)", page: 4 },
      { section: "rico-farming", title: "RICO Coin Free Farming", page: 5 },
      { section: "royalty", title: "Royalty Passive Income + Platform Distribution", page: 6 },
      { section: "x3", title: "How X3 Matrix Works", page: 7 },
      { section: "x6", title: "How X6 Matrix Works", page: 8 },
      { section: "chapters", title: "Chapters (12 Chapters + Pricing)", page: 9 },
      { section: "entry", title: "Entry Slots (X3 + X6 Start)", page: 10 },
      { section: "reinvest", title: "Chapter Reinvest (Auto Recycle)", page: 11 },
      { section: "upgrade", title: "Upgrade Rules + Blocked / Lost Profit", page: 12 },
      { section: "overflows", title: "Overflows & Overtaking", page: 13 },
      { section: "profits", title: "Profits (X3 + X6 + Totals)", page: 14 },
      { section: "unilevel", title: "Unilevel Referral Program (12 Levels)", page: 15 },
      { section: "recommended", title: "Recommended Start Option ($75)", page: 16 },
      { section: "roadmap", title: "Roadmap (Phase 1–4)", page: 17 },
      { section: "get-started", title: "Step-by-Step Guide to Get Started", page: 18 },
      { section: "closing", title: "Closing / Slogan", page: 19 },
    ],
    []
  );

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.1);

  const [docLoading, setDocLoading] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const pdfFile = useMemo(() => {
    if (!pdfData) return null;
    return { data: pdfData };
  }, [pdfData]);

  useEffect(() => {
    let active = true;

    const loadPdf = async () => {
      setDocLoading(true);
      setDocError(null);

      try {
        const res = await fetch(PDF_URL, { cache: "no-store" });
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || (t("error.loading") || "Failed to load PDF"));
        }

        const buffer = await res.arrayBuffer();
        if (!active) return;

        setPdfData(new Uint8Array(buffer));
      } catch (error: any) {
        if (!active) return;
        setPdfData(null);
        setDocLoading(false);
        setDocError(error?.message || (t("error.loading") || "Failed to load PDF"));
      }
    };

    loadPdf();

    return () => {
      active = false;
    };
  }, [PDF_URL, reloadKey, t]);

  const onDocumentLoadSuccess = useCallback((info: { numPages: number }) => {
    setNumPages(info.numPages);
    setDocLoading(false);
    setDocError(null);
    setPageNumber((p) => Math.min(Math.max(1, p), info.numPages));
  }, []);

  const onDocumentLoadError = useCallback(
    (err: unknown) => {
      console.error("PDF load error:", err);
      setDocLoading(false);
      setDocError(t("error.loading") || "Failed to load PDF");
    },
    [t]
  );

  const goToPage = useCallback(
    (p: number) => {
      const max = numPages || p;
      const next = Math.min(Math.max(1, p), max);
      setPageNumber(next);
      document.getElementById("pdf-viewer")?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [numPages]
  );

  const prevPage = useCallback(() => goToPage(pageNumber - 1), [goToPage, pageNumber]);
  const nextPage = useCallback(() => goToPage(pageNumber + 1), [goToPage, pageNumber]);

  const zoomOut = useCallback(() => setScale((s) => Math.max(0.75, Number((s - 0.1).toFixed(2)))), []);
  const zoomIn = useCallback(() => setScale((s) => Math.min(2.0, Number((s + 0.1).toFixed(2)))), []);

  const openPdf = useCallback(() => window.open(PDF_URL, "_blank", "noopener,noreferrer"), [PDF_URL]);
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {}
  }, []);

  const retry = useCallback(() => {
    setDocError(null);
    setReloadKey((k) => k + 1);
  }, []);

  const activeIndex = useMemo(() => tocItems.findIndex((x) => x.page === pageNumber), [tocItems, pageNumber]);

  return (
    <div className="min-h-screen bg-[#06070b]">
      {/* subtle background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="absolute top-24 right-[-160px] h-[420px] w-[420px] rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="absolute bottom-[-200px] left-[-160px] h-[520px] w-[520px] rounded-full bg-yellow-500/10 blur-3xl" />
      </div>

      <Header />

      <div className="relative overflow-x-clip px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Top bar */}
          <div className="mb-8 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/60 bg-slate-900/40">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-slate-300">
                      <path
                        d="M15 18l-6-6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {t("backToDashboard") || "Back to Dashboard"}
                </Link>

                <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-50">
                  {t("title") || "Business Documentation"}
                </h1>
                <p className="mt-2 text-slate-400">
                  {t("subtitle") || "Read the official Rico Matrix business documentation (PDF)."}
                </p>
              </div>

              <div className="flex flex-wrap items-stretch gap-2 sm:items-center sm:justify-end">
                <span className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                  {t("version") || "Version 1.0"}
                </span>

                <button
                  onClick={openPdf}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/40 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-900/65 sm:flex-none"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M14 3h7v7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 14L21 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21 14v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t("actions.openNew") || "Open PDF"}
                </button>

                <a
                  href={WHITEPAPER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-100 transition hover:bg-yellow-500/20 sm:flex-none"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M14 3h7v7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 14L21 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21 14v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t("actions.openWhitepaper") || "Open Whitepaper"}
                </a>

                <button
                  onClick={copyLink}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/40 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-900/65 sm:flex-none"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 8h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t("menu.copyLink") || "Copy Link"}
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 backdrop-blur">
                <div className="text-xs text-slate-500">{t("stats.pages") || "Pages"}</div>
                <div className="mt-1 text-2xl font-semibold text-yellow-200">{numPages ? numPages : "—"}</div>
              </div>
              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 backdrop-blur">
                <div className="text-xs text-slate-500">{t("stats.lastUpdated") || "Last Updated"}</div>
                <div className="mt-1 text-2xl font-semibold text-amber-200">Dec 2024</div>
              </div>
              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 backdrop-blur">
                <div className="text-xs text-slate-500">{t("stats.fileType") || "File Type"}</div>
                <div className="mt-1 text-2xl font-semibold text-yellow-200">PDF</div>
              </div>
            </div>
          </div>

          {/* Main layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* TOC */}
            <aside className="lg:col-span-4">
              <div className="sticky top-8 space-y-4">
                <div className="rounded-3xl border border-slate-800/60 bg-slate-950/40 backdrop-blur p-5 shadow-[0_0_30px_rgba(0,0,0,.55)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-slate-100 font-semibold">{t("toc.title") || "Table of Contents"}</div>
                    <div className="text-xs text-slate-500">
                      {activeIndex >= 0 ? `Section ${activeIndex + 1}/${tocItems.length}` : ""}
                    </div>
                  </div>

                  <div className="max-h-[62vh] overflow-auto pr-1">
                    <div className="space-y-2">
                      {tocItems.map((item, i) => {
                        const isActive = pageNumber === item.page;
                        return (
                          <button
                            key={item.section}
                            onClick={() => goToPage(item.page)}
                            className={cn(
                              "w-full text-left rounded-2xl border px-3 py-3 transition",
                              isActive
                                ? "border-yellow-500/35 bg-yellow-500/10"
                                : "border-slate-800/60 bg-slate-900/20 hover:bg-slate-900/40"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                                  isActive
                                    ? "border-yellow-400/50 bg-yellow-500/10 text-yellow-200"
                                    : "border-slate-700/60 bg-slate-900/40 text-slate-300"
                                )}
                              >
                                {i + 1}
                              </div>

                              <div className="flex-1">
                                <div className={cn("text-sm leading-snug", isActive ? "text-slate-50" : "text-slate-200")}>
                                  {item.title}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">Page {item.page}</div>
                              </div>

                              {isActive && (
                                <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-yellow-400/90" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 border-t border-slate-800/60 pt-4">
                    <button
                      onClick={openPdf}
                      className="w-full rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-3 text-sm font-semibold text-white shadow hover:opacity-95 transition"
                    >
                      {t("actions.download") || "Open / Download PDF"}
                    </button>
                    <a
                      href={WHITEPAPER_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center justify-between rounded-2xl border border-yellow-500/25 bg-yellow-500/10 px-4 py-3 text-sm font-medium text-yellow-100 transition hover:bg-yellow-500/15"
                    >
                      <span>{t("actions.openWhitepaper") || "Open Whitepaper"}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M14 3h7v7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M10 14L21 3"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M21 14v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </a>
                  </div>
                </div>

                {/* Help / Info card */}
                <div className="rounded-3xl border border-yellow-400/30 bg-yellow-500/10 p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-500/10">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-amber-200">
                        <path
                          d="M12 16h.01"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 12a2 2 0 1 0-2-2"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    <div>
                      <div className="font-semibold text-amber-100">{t("help.title") || "Need Help?"}</div>
                      <div className="mt-1 text-sm text-amber-100/80">
                        {t("help.description") || "If the PDF doesn't load, download it directly or contact support."}
                      </div>
                      <a
                        href="mailto:support@ricomatrix.com"
                        className="mt-2 inline-block text-sm text-amber-200 underline hover:text-amber-100"
                      >
                        {t("help.contact") || "Contact Support"}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Viewer */}
            <main className="lg:col-span-8">
              <div
                id="pdf-viewer"
                className="rounded-3xl border border-slate-800/60 bg-slate-950/40 backdrop-blur p-5 shadow-[0_0_30px_rgba(0,0,0,.55)]"
              >
                {/* Viewer controls */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-800/60 bg-slate-900/25 px-3 py-2">
                      <span className="text-xs text-slate-500">Page</span>
                      <span className="text-sm font-semibold text-slate-100">{pageNumber}</span>
                      <span className="text-xs text-slate-500">{numPages ? `/ ${numPages}` : ""}</span>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-800/60 bg-slate-900/25 px-3 py-2">
                      <span className="text-xs text-slate-500">Zoom</span>
                      <span className="text-sm font-semibold text-slate-100">{Math.round(scale * 100)}%</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={prevPage}
                      disabled={pageNumber <= 1}
                      className="rounded-2xl border border-slate-800/60 bg-slate-900/25 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900/45 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {t("actions.prev") || "Prev"}
                    </button>

                    <button
                      onClick={nextPage}
                      disabled={numPages ? pageNumber >= numPages : false}
                      className="rounded-2xl border border-slate-800/60 bg-slate-900/25 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900/45 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {t("actions.next") || "Next"}
                    </button>

                    <button
                      onClick={zoomOut}
                      className="rounded-2xl border border-slate-800/60 bg-slate-900/25 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/45 transition"
                      aria-label={t("actions.zoomOut") || "Zoom out"}
                      title={t("actions.zoomOut") || "Zoom out"}
                    >
                      −
                    </button>

                    <button
                      onClick={zoomIn}
                      className="rounded-2xl border border-slate-800/60 bg-slate-900/25 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900/45 transition"
                      aria-label={t("actions.zoomIn") || "Zoom in"}
                      title={t("actions.zoomIn") || "Zoom in"}
                    >
                      +
                    </button>

                    <button
                      onClick={openPdf}
                      className="rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 transition"
                    >
                      {t("actions.openPdf") || "Open PDF"}
                    </button>
                  </div>
                </div>

                {/* Loading */}
                {docLoading && !docError && (
                  <div className="grid place-items-center rounded-2xl border border-slate-800/60 bg-slate-950/60 py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-yellow-400" />
                      <div className="text-sm text-slate-400">{t("loading") || "Loading document..."}</div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {docError && (
                  <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-6">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-red-400/30 bg-red-500/10">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-red-200">
                          <path
                            d="M12 9v4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 17h.01"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      <div className="flex-1">
                        <div className="font-semibold text-red-100">{t("error.title") || "Failed to Load PDF"}</div>
                        <div className="mt-1 text-sm text-red-100/80">{docError}</div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={retry}
                            className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-100 hover:bg-red-500/15 transition"
                          >
                            {t("actions.retry") || "Retry"}
                          </button>
                          <button
                            onClick={openPdf}
                            className="rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 transition"
                          >
                            {t("actions.download") || "Open / Download PDF"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PDF */}
                {!docError && (
                  <div className="rounded-2xl border border-slate-800/60 bg-[#05060a] overflow-auto p-3">
                    {pdfData ? (
                      <Document
                        key={reloadKey}
                        file={pdfFile}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={null}
                        error={null}
                        noData={null}
                      >
                        <Page pageNumber={pageNumber} scale={scale} renderAnnotationLayer renderTextLayer />
                      </Document>
                    ) : null}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <div>{t("viewer.footer") || "Tip: Use TOC to jump sections • Zoom for readability"}</div>
                  <div className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-300/90" />
                    {t("viewer.ready") || "Viewer Ready"}
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

type TocItem = { section: string; title: string; page: number };
