"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { formatUnits } from "viem";
import { useTranslations } from "next-intl";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

/**
 * ✅ FULL CODE (A4 + MOBILE + ZOOM + READ & LISTEN + VOICE PICKER)
 *
 * What this does:
 * - X3 uses Chapters PDFs:   /public/pdfs/chapters/chapter1.pdf ... chapter12.pdf
 * - X6 uses Self-help PDFs:  /public/pdfs/selfhelp/book1.pdf ... book12.pdf
 * - Modal is A4-friendly, top-aligned, single-page view (no next page bleeding)
 * - Zoom controls: + / - / Fit / Width / Reset
 * - Read & Listen: extracts text per page using pdfjs.getTextContent(), plays TTS, highlights word being read
 * - Voice picker works (includes iOS/Safari “wake” workaround)
 *
 * IMPORTANT:
 * - If your PDFs are scanned/image-only, text extraction will be empty → Read & Listen can't highlight/speak.
 */

// pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ChapterCardProps {
  track: number; // 1 = X3, 2 = X6
  chapter: number; // 1..12
  title: string;
  price: string;
  isUnlocked: boolean;
  onPurchase: (track: number, chapter: number) => Promise<void>;
  onApprove: (amount: string) => Promise<void>;
  disabled: boolean;
  needsApproval: boolean;
  isApproving: boolean;
}

type WordSpan = { text: string; start: number; end: number };

function buildWordSpans(text: string): WordSpan[] {
  const spans: WordSpan[] = [];
  const normalized = text.replace(/\s+/g, " ").trim();
  let i = 0;
  while (i < normalized.length) {
    while (i < normalized.length && normalized[i] === " ") i++;
    if (i >= normalized.length) break;
    const start = i;
    while (i < normalized.length && normalized[i] !== " ") i++;
    const end = i;
    spans.push({ text: normalized.slice(start, end), start, end });
  }
  return spans;
}

function useIsMobile(breakpointPx = 1024) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpointPx);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpointPx]);
  return isMobile;
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(0, rect.width),
        height: Math.max(0, rect.height),
      });
    });

    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setSize({
      width: Math.max(0, rect.width),
      height: Math.max(0, rect.height),
    });

    return () => ro.disconnect();
  }, []);

  return { ref, size };
}

function getSafeSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

export const ChapterCard: React.FC<ChapterCardProps> = ({
  track,
  chapter,
  title,
  price,
  isUnlocked,
  onPurchase,
  onApprove,
  disabled,
  needsApproval,
  isApproving,
}) => {
  const t = useTranslations("ChaptersPage.ChapterCard");
  const isMobile = useIsMobile(1024);

  // Card / modal
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A4 fit / zoom
  const [userScale, setUserScale] = useState<number | null>(null); // null = fit mode
  const [fitMode, setFitMode] = useState<"fit" | "width">("fit");

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const { ref: pdfViewportRef, size: pdfViewportSize } =
    useElementSize<HTMLDivElement>();

  // Reader (Read & Listen)
  const [readerEnabled, setReaderEnabled] = useState(true);
  const [pageText, setPageText] = useState<string>("");
  const [isTextLoading, setIsTextLoading] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [highlightCharIndex, setHighlightCharIndex] = useState<number>(-1);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const [voicesVersion, setVoicesVersion] = useState(0);

  // pdfjs doc for text extraction
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const pdfDocUrlRef = useRef<string>("");

  // Memoize options (react-pdf warning fix)
  const pdfOptions = useMemo(
    () => ({
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
      cMapPacked: true,
    }),
    []
  );

  useEffect(() => {
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }
  }, []);

  // Track mapping
  const getPdfUrl = (trackNumber: number, index: number) => {
    const safeIndex = Math.max(1, Math.min(index, 12));
    if (trackNumber === 1) return `/pdfs/chapters/chapter${safeIndex}.pdf`;
    return `/pdfs/selfhelp/book${safeIndex}.pdf`;
  };

  const pdfUrl = useMemo(() => getPdfUrl(track, chapter), [track, chapter]);

  const chip = useMemo(() => {
    return track === 1
      ? { label: t("track.x3"), sub: "Chapters", icon: "📚" }
      : { label: t("track.x6"), sub: "Self-Help Books", icon: "🧠" };
  }, [track, t]);

  const getTrackBadgeClass = (trackNumber: number) => {
    if (trackNumber === 1)
      return "bg-gradient-to-r from-yellow-400 to-amber-500 text-black";
    return "bg-gradient-to-r from-emerald-500 to-cyan-500 text-black";
  };

  // ✅ Status helpers (fixes your TS error)
  const getStatusText = () => {
    if (isUnlocked) return t("status.unlocked");
    if (chapter > 1) return t("status.lockedPrevious");
    return t("status.available");
  };

  const getStatusColor = () => {
    if (isUnlocked) return "text-emerald-400";
    if (chapter > 1) return "text-amber-300";
    return "text-yellow-400";
  };

  // Price
  const formattedPrice =
    price && price !== "0" ? formatUnits(BigInt(price), 18) : "0";
  const isButtonDisabled = isUnlocked || disabled;
  const isApproveButtonDisabled = isUnlocked || isApproving;

  const handleAction = () => {
    if (needsApproval) onApprove(price);
    else onPurchase(track, chapter);
  };

  const getButtonText = () => {
    if (isUnlocked) return t("button.unlocked");
    if (isApproving) return t("button.approving");
    if (disabled) return t("button.processing");
    if (needsApproval) return t("button.approve");
    return t("button.unlock");
  };

  const getButtonClass = () => {
    if (isButtonDisabled || isApproveButtonDisabled) {
      return "cursor-not-allowed bg-slate-900/70 text-slate-500 ring-1 ring-slate-700";
    }
    if (needsApproval) {
      return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-[0_0_28px_rgba(59,130,246,0.45)] hover:shadow-[0_0_40px_rgba(59,130,246,0.7)] hover:brightness-110 active:scale-[0.99]";
    }
    return "bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300 text-black shadow-[0_0_28px_rgba(250,204,21,0.35)] hover:shadow-[0_0_40px_rgba(250,204,21,0.6)] hover:brightness-110 active:scale-[0.99]";
  };

  // ---------------- A4 Fit scale computation ----------------
  const fitScale = useMemo(() => {
    const w = pdfViewportSize.width;
    const h = pdfViewportSize.height;
    if (!w || !h) return 1;

    // Keep padding minimal so the page fills modal more
    const usableW = Math.max(0, w - 10);
    const usableH = Math.max(0, h - 10);

    // Empirical base sizes (react-pdf defaults)
    const baseW = 600;
    const baseH = 848; // A4-ish ratio

    const scaleByWidth = usableW / baseW;
    const scaleByHeight = usableH / baseH;

    const s =
      fitMode === "width"
        ? scaleByWidth
        : Math.min(scaleByWidth, scaleByHeight);

    // Bias slightly larger so it doesn't look "zoomed out"
    const boosted = s * 1.08;

    return Math.max(0.85, Math.min(boosted, 2.6));
  }, [pdfViewportSize.width, pdfViewportSize.height, fitMode]);

  const effectiveScale = userScale ?? fitScale;

  // Zoom controls
  const zoomIn = () =>
    setUserScale((s) => Math.min((s ?? effectiveScale) + 0.15, 3));
  const zoomOut = () =>
    setUserScale((s) => Math.max((s ?? effectiveScale) - 0.15, 0.6));
  const zoomReset = () => setUserScale(null); // back to fit mode
  const zoomFit = () => {
    setUserScale(null);
    setFitMode("fit");
  };
  const zoomFitWidth = () => {
    setUserScale(null);
    setFitMode("width");
  };

  // Ensure top of page is visible on page change/zoom
  useEffect(() => {
    if (!showPdfViewer) return;
    const el = scrollAreaRef.current;
    if (el) el.scrollTop = 0;
  }, [pageNumber, showPdfViewer, effectiveScale]);

  // ---------------- Read & Listen (Text extraction + speech) ----------------
  const wakeSpeech = useCallback(() => {
    const synth = getSafeSpeechSynthesis();
    if (!synth) return;
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      u.rate = 1;
      synth.speak(u);
      synth.cancel();
    } catch {}
  }, []);

  const stopSpeech = useCallback(() => {
    const synth = getSafeSpeechSynthesis();
    if (!synth) return;
    try {
      synth.cancel();
    } catch {}
    utteranceRef.current = null;
    setIsSpeaking(false);
    setIsPaused(false);
    setHighlightCharIndex(-1);
  }, []);

  const pauseSpeech = useCallback(() => {
    const synth = getSafeSpeechSynthesis();
    if (!synth) return;
    try {
      synth.pause();
      setIsPaused(true);
    } catch {}
  }, []);

  const resumeSpeech = useCallback(() => {
    const synth = getSafeSpeechSynthesis();
    if (!synth) return;
    try {
      synth.resume();
      setIsPaused(false);
    } catch {}
  }, []);

  const startSpeech = useCallback(() => {
    const synth = getSafeSpeechSynthesis();
    if (!synth) return;
    if (!pageText?.trim()) return;

    wakeSpeech();

    try {
      synth.cancel();
    } catch {}

    const normalized = pageText.replace(/\s+/g, " ").trim();
    const u = new SpeechSynthesisUtterance(normalized);

    u.rate = speechRate;
    u.pitch = speechPitch;

    const voices = voicesRef.current || [];
    const chosen =
      (selectedVoiceURI &&
        voices.find((v) => v.voiceURI === selectedVoiceURI)) ||
      voices.find((v) => /en(-|_)?ng/i.test(v.lang)) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ||
      voices[0];

    if (chosen) u.voice = chosen;

    u.onboundary = (e: any) => {
      if (typeof e?.charIndex === "number") setHighlightCharIndex(e.charIndex);
    };
    u.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    u.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setHighlightCharIndex(-1);
    };
    u.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setHighlightCharIndex(-1);
    };

    utteranceRef.current = u;
    synth.speak(u);
  }, [pageText, selectedVoiceURI, speechRate, speechPitch, wakeSpeech]);

  // Voice loading (robust)
  useEffect(() => {
    const synth = getSafeSpeechSynthesis();
    if (!synth) return;

    const loadVoices = () => {
      const v = synth.getVoices();
      voicesRef.current = v;
      setVoicesVersion((x) => x + 1);

      if (!selectedVoiceURI && v?.length) {
        const preferred =
          v.find((vv) => /en(-|_)?ng/i.test(vv.lang)) ||
          v.find((vv) => vv.lang?.toLowerCase().startsWith("en")) ||
          v[0];
        if (preferred) setSelectedVoiceURI(preferred.voiceURI);
      }
    };

    wakeSpeech();
    loadVoices();
    synth.onvoiceschanged = loadVoices;

    return () => {
      synth.onvoiceschanged = null;
    };
  }, [selectedVoiceURI, wakeSpeech]);

  // Load pdf doc for text extraction
  const loadPdfDoc = useCallback(async () => {
    if (!showPdfViewer) return;

    if (pdfDocRef.current && pdfDocUrlRef.current === pdfUrl) return;

    if (pdfDocRef.current) {
      try {
        await pdfDocRef.current.destroy();
      } catch {}
      pdfDocRef.current = null;
    }

    pdfDocUrlRef.current = pdfUrl;

    const task = pdfjs.getDocument({
      url: pdfUrl,
      cMapUrl: pdfOptions.cMapUrl,
      cMapPacked: pdfOptions.cMapPacked,
    });

    pdfDocRef.current = await task.promise;
  }, [pdfUrl, pdfOptions.cMapPacked, pdfOptions.cMapUrl, showPdfViewer]);

  const extractPageText = useCallback(async () => {
    if (!showPdfViewer || !readerEnabled) return;

    setIsTextLoading(true);
    setPageText("");
    setHighlightCharIndex(-1);

    try {
      await loadPdfDoc();
      const doc = pdfDocRef.current;
      if (!doc) return;

      const p = Math.max(1, Math.min(pageNumber, doc.numPages));
      const page = await doc.getPage(p);
      const content = await page.getTextContent();

      const raw = (content.items as any[])
        .map((it) => (typeof it?.str === "string" ? it.str : ""))
        .filter(Boolean)
        .join(" ");

      const cleaned = raw.replace(/\s+/g, " ").trim();
      setPageText(cleaned);
    } catch {
      setPageText("");
    } finally {
      setIsTextLoading(false);
    }
  }, [showPdfViewer, readerEnabled, pageNumber, loadPdfDoc]);

  // Re-extract on page changes + open
  useEffect(() => {
    if (!showPdfViewer) return;
    extractPageText();
    stopSpeech();
  }, [pageNumber, showPdfViewer, extractPageText, stopSpeech]);

  // Cleanup doc on close
  useEffect(() => {
    if (showPdfViewer) return;

    (async () => {
      if (pdfDocRef.current) {
        try {
          await pdfDocRef.current.destroy();
        } catch {}
        pdfDocRef.current = null;
        pdfDocUrlRef.current = "";
      }
    })();
  }, [showPdfViewer]);

  // Transcript with highlighting
  const transcript = useMemo(() => {
    const normalized = (pageText || "").replace(/\s+/g, " ").trim();
    return {
      normalized,
      words: normalized ? buildWordSpans(normalized) : ([] as WordSpan[]),
    };
  }, [pageText]);

  const activeWordIndex = useMemo(() => {
    if (!transcript.words.length) return -1;
    if (highlightCharIndex < 0) return -1;
    return transcript.words.findIndex(
      (w) => highlightCharIndex >= w.start && highlightCharIndex < w.end
    );
  }, [highlightCharIndex, transcript.words]);

  // Modal open/close
  const handleReadPdf = () => {
    setShowPdfViewer(true);
    setError(null);
    setNumPages(null);
    setPageNumber(1);
    setIsLoading(true);
    setUserScale(null);
    setFitMode("fit");
    wakeSpeech();
  };

  const handleClosePdf = () => {
    setShowPdfViewer(false);
    setIsLoading(false);
    setError(null);
    setNumPages(null);
    setPageNumber(1);
    stopSpeech();
    setPageText("");
    setIsTextLoading(false);
    setHighlightCharIndex(-1);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (err: Error) => {
    console.error("PDF load error:", err);
    setIsLoading(false);
    setError(t("pdfViewer.loadError"));
  };

  const handlePreviousPage = () => setPageNumber((p) => Math.max(p - 1, 1));
  const handleNextPage = () =>
    setPageNumber((p) => Math.min(p + 1, numPages || 1));

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!showPdfViewer) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handlePreviousPage();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNextPage();
          break;
        case "+":
        case "=":
          e.preventDefault();
          zoomIn();
          break;
        case "-":
          e.preventDefault();
          zoomOut();
          break;
        case "0":
          e.preventDefault();
          zoomReset();
          break;
        case " ":
          if (!readerEnabled) return;
          e.preventDefault();
          if (!isSpeaking) startSpeech();
          else if (isPaused) resumeSpeech();
          else pauseSpeech();
          break;
        case "Escape":
          e.preventDefault();
          handleClosePdf();
          break;
      }
    },
    [
      showPdfViewer,
      readerEnabled,
      isSpeaking,
      isPaused,
      startSpeech,
      resumeSpeech,
      pauseSpeech,
      zoomIn,
      zoomOut,
      zoomReset,
    ]
  );

  useEffect(() => {
    if (!showPdfViewer) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPdfViewer, handleKeyDown]);

  // ---------------- UI ----------------
  return (
    <>
      {/* CARD */}
      <div className="group relative overflow-hidden rounded-2xl border border-yellow-500/10 bg-gradient-to-b from-black via-slate-950 to-slate-900 p-5 shadow-[0_0_45px_rgba(0,0,0,0.7)] transition-all duration-300 hover:-translate-y-1 hover:border-yellow-400/40 hover:shadow-[0_0_70px_rgba(250,204,21,0.28)]">
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-32 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.28),_transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative flex items-start justify-between mb-4">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide shadow-sm ${getTrackBadgeClass(
              track
            )}`}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/25">
              <span className="text-[12px]">{chip.icon}</span>
            </span>
            {chip.label} <span className="opacity-80">•</span> {chip.sub}
          </span>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              {track === 1 ? "CHAPTER" : "BOOK"}
            </p>
            <p className="text-2xl font-extrabold text-yellow-200 drop-shadow-[0_0_12px_rgba(250,204,21,0.45)]">
              #{chapter}
            </p>
          </div>
        </div>

        <h3 className="relative mb-1 line-clamp-2 text-base font-semibold text-slate-50">
          {title}
        </h3>

        <div className="relative space-y-3 rounded-xl bg-slate-900/55 p-3 ring-1 ring-slate-700/60 mt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{t("price.label")}</span>
            <span className="font-semibold text-yellow-300">
              {formattedPrice}{" "}
              <span className="text-xs text-slate-400">
                {t("price.currency")}
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{t("status.label")}</span>
            <span className={`font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{t("approval.label")}</span>
            <span
              className={`font-medium ${
                needsApproval ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {needsApproval ? t("approval.required") : t("approval.approved")}
            </span>
          </div>
        </div>

        <button
          onClick={handleAction}
          disabled={needsApproval ? isApproveButtonDisabled : isButtonDisabled}
          className={`relative mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide transition-all duration-200 ${getButtonClass()}`}
        >
          {getButtonText()}
        </button>

        {isUnlocked && (
          <div className="mt-4">
            <button
              onClick={handleReadPdf}
              className="w-full bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 hover:from-emerald-500/30 hover:to-cyan-500/30 text-slate-100 py-2.5 rounded-xl text-sm font-semibold border border-white/[0.08] transition-colors"
            >
              📖 Open Secure Reader
            </button>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showPdfViewer && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md"
          onClick={handleClosePdf}
        >
          <div
            className="absolute inset-0 flex"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-[100dvh] md:h-[92vh] md:max-w-7xl md:m-auto bg-slate-950 md:rounded-2xl border border-white/[0.08] shadow-[0_0_90px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-3 md:p-4 border-b border-white/[0.06] bg-gradient-to-b from-slate-900/70 to-slate-950/40">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-br from-yellow-400/80 to-amber-500/80 flex items-center justify-center shadow-[0_0_28px_rgba(250,204,21,0.18)]">
                    <span className="text-sm font-black text-black">
                      #{chapter}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] md:text-xs font-semibold ${getTrackBadgeClass(
                          track
                        )}`}
                      >
                        {chip.icon} {chip.label}
                      </span>
                      <span className="text-xs text-slate-300/80 truncate">
                        {title}
                      </span>
                    </div>
                    <div className="mt-1 text-[12px] text-slate-400">
                      {track === 1 ? "X3 Chapters" : "X6 Self-Help Books"} • A4
                      Reader
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleClosePdf}
                  className="p-2 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label="Close"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Controls Bar */}
              <div className="px-3 md:px-4 py-2 border-b border-white/[0.06] bg-slate-950/60">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  {/* Page nav */}
                  <div className="flex items-center justify-between md:justify-start gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePreviousPage}
                        disabled={pageNumber <= 1}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                          pageNumber <= 1
                            ? "bg-white/[0.03] text-slate-500 border-white/[0.06] cursor-not-allowed"
                            : "bg-white/[0.05] hover:bg-white/[0.08] text-slate-200 border-white/[0.08]"
                        }`}
                      >
                        ◀
                      </button>

                      <div className="text-xs text-slate-200/80 min-w-[110px] text-center">
                        Page {pageNumber} / {numPages || "?"}
                      </div>

                      <button
                        onClick={handleNextPage}
                        disabled={!numPages || pageNumber >= numPages}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                          !numPages || pageNumber >= numPages
                            ? "bg-white/[0.03] text-slate-500 border-white/[0.06] cursor-not-allowed"
                            : "bg-white/[0.05] hover:bg-white/[0.08] text-slate-200 border-white/[0.08]"
                        }`}
                      >
                        ▶
                      </button>
                    </div>

                    <div className="text-xs text-slate-500 hidden md:block ml-3">
                      ←/→ page • +/- zoom • Space play/pause
                    </div>
                  </div>

                  {/* Zoom */}
                  <div className="flex items-center justify-between md:justify-end gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={zoomOut}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.08] text-slate-200"
                      >
                        −
                      </button>
                      <div className="text-xs text-slate-200/80 min-w-[64px] text-center">
                        {Math.round(effectiveScale * 100)}%
                      </div>
                      <button
                        onClick={zoomIn}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.08] text-slate-200"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={zoomFit}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.08] text-slate-200"
                      >
                        Fit
                      </button>
                      <button
                        onClick={zoomFitWidth}
                        className="hidden sm:inline px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.08] text-slate-200"
                      >
                        Width
                      </button>
                      <button
                        onClick={zoomReset}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.08] text-slate-200"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden flex">
                {/* PDF */}
                <div className="flex-1 min-w-0 flex flex-col">
                  {error ? (
                    <div className="flex-1 flex items-center justify-center px-4">
                      <div className="w-full max-w-md text-center p-6 bg-red-500/10 rounded-2xl border border-red-500/20">
                        <p className="text-red-200">{error}</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={pdfViewportRef}
                      className="flex-1 overflow-hidden relative"
                    >
                      <div
                        ref={scrollAreaRef}
                        className="absolute inset-0 overflow-auto p-2 md:p-3"
                      >
                        {/* ✅ top-aligned */}
                        <div className="w-full flex justify-center items-start">
                          <div className="relative bg-black rounded-2xl overflow-hidden border border-white/[0.10] shadow-2xl">
                            <Document
                              key={pdfUrl}
                              file={pdfUrl}
                              onLoadSuccess={onDocumentLoadSuccess}
                              onLoadError={onDocumentLoadError}
                              loading={null}
                              error={null}
                              options={pdfOptions}
                              className="pdf-document"
                            >
                              <Page
                                pageNumber={pageNumber}
                                scale={effectiveScale}
                                renderAnnotationLayer
                                renderTextLayer
                              />
                            </Document>

                            {/* watermark */}
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/55 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/55 to-transparent" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-6xl md:text-7xl font-black text-white/5 select-none">
                                  RICO MATRIX
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                          <div className="text-center">
                            <div className="w-16 h-16 border-4 border-yellow-500/25 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-200">
                              {t("pdfViewer.loading")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reader panel (desktop) */}
                <aside className="w-[380px] hidden lg:flex flex-col border-l border-white/[0.06] bg-gradient-to-b from-slate-950 to-slate-900">
                  <div className="p-4 border-b border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          Read & Listen
                        </p>
                        <h4 className="text-sm font-semibold text-slate-100">
                          Voice Reader
                        </h4>
                      </div>

                      <button
                        onClick={() => {
                          setReaderEnabled((v) => !v);
                          stopSpeech();
                        }}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border ${
                          readerEnabled
                            ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20"
                            : "bg-white/[0.04] text-slate-300 border-white/[0.08]"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            readerEnabled ? "bg-emerald-400" : "bg-slate-500"
                          }`}
                        />
                        {readerEnabled ? "Enabled" : "Off"}
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          if (!readerEnabled) return;
                          if (!isSpeaking) startSpeech();
                          else if (isPaused) resumeSpeech();
                          else pauseSpeech();
                        }}
                        disabled={
                          !readerEnabled ||
                          isTextLoading ||
                          !transcript.normalized
                        }
                        className={`col-span-2 flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold border ${
                          !readerEnabled ||
                          isTextLoading ||
                          !transcript.normalized
                            ? "bg-white/[0.03] text-slate-500 border-white/[0.06] cursor-not-allowed"
                            : "bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 hover:from-emerald-500/30 hover:to-cyan-500/30 text-slate-100 border-white/[0.08]"
                        }`}
                      >
                        {!isSpeaking
                          ? "▶ Play"
                          : isPaused
                          ? "⏵ Resume"
                          : "⏸ Pause"}
                      </button>

                      <button
                        onClick={stopSpeech}
                        disabled={!readerEnabled || (!isSpeaking && !isPaused)}
                        className={`flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold border ${
                          !readerEnabled || (!isSpeaking && !isPaused)
                            ? "bg-white/[0.03] text-slate-500 border-white/[0.06] cursor-not-allowed"
                            : "bg-red-500/10 hover:bg-red-500/15 text-red-200 border-red-500/20"
                        }`}
                      >
                        ■
                      </button>
                    </div>

                    <div className="mt-3">
                      <label className="text-xs text-slate-400">Voice</label>
                      <select
                        value={selectedVoiceURI}
                        onChange={(e) => {
                          setSelectedVoiceURI(e.target.value);
                          stopSpeech();
                        }}
                        className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                      >
                        {(voicesRef.current || []).map((v) => (
                          <option
                            key={`${v.voiceURI}-${voicesVersion}`}
                            value={v.voiceURI}
                          >
                            {v.name} ({v.lang})
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-[11px] text-slate-500">
                        If empty on iPhone, tap Play once to “wake” voices.
                      </p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400">Speed</label>
                        <input
                          type="range"
                          min={0.7}
                          max={1.3}
                          step={0.05}
                          value={speechRate}
                          onChange={(e) => {
                            setSpeechRate(Number(e.target.value));
                            stopSpeech();
                          }}
                          className="mt-2 w-full"
                        />
                        <div className="text-[11px] text-slate-500 mt-1">
                          {speechRate.toFixed(2)}x
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-slate-400">Pitch</label>
                        <input
                          type="range"
                          min={0.8}
                          max={1.2}
                          step={0.05}
                          value={speechPitch}
                          onChange={(e) => {
                            setSpeechPitch(Number(e.target.value));
                            stopSpeech();
                          }}
                          className="mt-2 w-full"
                        />
                        <div className="text-[11px] text-slate-500 mt-1">
                          {speechPitch.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto p-4">
                    {!readerEnabled ? (
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-slate-300">
                        Turn on Reader to see transcript + highlighting.
                      </div>
                    ) : isTextLoading ? (
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-slate-300">
                        Preparing text…
                      </div>
                    ) : !transcript.normalized ? (
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-slate-300">
                        No readable text detected on this page. If this PDF is
                        image-only, TTS highlighting won’t work.
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                        <div className="text-xs text-slate-500 mb-2">
                          Transcript
                        </div>
                        <div className="text-sm leading-7 text-slate-200">
                          {transcript.words.map((w, idx) => {
                            const isActive = idx === activeWordIndex;
                            return (
                              <span
                                key={`${w.start}-${w.end}-${idx}`}
                                className={
                                  isActive
                                    ? "px-1.5 py-0.5 rounded-lg bg-emerald-500/25 text-emerald-100 border border-emerald-500/20 shadow-[0_0_18px_rgba(16,185,129,0.18)]"
                                    : "text-slate-200/90"
                                }
                              >
                                {w.text}
                                <span className="select-none"> </span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </aside>
              </div>

              {/* Mobile compact Reader (very lightweight) */}
              {isMobile && (
                <div className="border-t border-white/[0.06] bg-slate-950/70 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setReaderEnabled((v) => !v);
                        stopSpeech();
                      }}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border ${
                        readerEnabled
                          ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20"
                          : "bg-white/[0.04] text-slate-300 border-white/[0.08]"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          readerEnabled ? "bg-emerald-400" : "bg-slate-500"
                        }`}
                      />
                      {readerEnabled ? "Reader ON" : "Reader OFF"}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (!readerEnabled) return;
                          if (!isSpeaking) startSpeech();
                          else if (isPaused) resumeSpeech();
                          else pauseSpeech();
                        }}
                        disabled={
                          !readerEnabled ||
                          isTextLoading ||
                          !transcript.normalized
                        }
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                          !readerEnabled ||
                          isTextLoading ||
                          !transcript.normalized
                            ? "bg-white/[0.03] text-slate-500 border-white/[0.06] cursor-not-allowed"
                            : "bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 hover:from-emerald-500/30 hover:to-cyan-500/30 text-slate-100 border-white/[0.08]"
                        }`}
                      >
                        {!isSpeaking
                          ? "▶ Play"
                          : isPaused
                          ? "⏵ Resume"
                          : "⏸ Pause"}
                      </button>

                      <button
                        onClick={stopSpeech}
                        disabled={!readerEnabled || (!isSpeaking && !isPaused)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                          !readerEnabled || (!isSpeaking && !isPaused)
                            ? "bg-white/[0.03] text-slate-500 border-white/[0.06] cursor-not-allowed"
                            : "bg-red-500/10 hover:bg-red-500/15 text-red-200 border-red-500/20"
                        }`}
                      >
                        ■
                      </button>
                    </div>
                  </div>

                  <div className="mt-2">
                    <select
                      value={selectedVoiceURI}
                      onChange={(e) => {
                        setSelectedVoiceURI(e.target.value);
                        stopSpeech();
                      }}
                      className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-xs text-slate-100 outline-none"
                    >
                      {(voicesRef.current || []).map((v) => (
                        <option
                          key={`${v.voiceURI}-${voicesVersion}`}
                          value={v.voiceURI}
                        >
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 text-[11px] text-slate-500">
                      If voice list is empty, tap Play once.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
