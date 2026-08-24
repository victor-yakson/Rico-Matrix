"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatUnits } from "viem";
import { useTranslations } from "next-intl";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const formatUnitsSafe = (value: unknown, decimals = 18): string => {
  try {
    if (value === null || value === undefined || value === "") return "0";
    return formatUnits(BigInt(String(value)), decimals);
  } catch {
    return "0";
  }
};

interface ChapterCardProps {
  track: number; // 1 = X3, 2 = X6
  chapter: number; // 1..12
  title: string;
  price: string;
  isUnlocked: boolean;
  chapterState?: "active" | "blocked";
  onPurchase: (track: number, chapter: number) => Promise<void>;
  onApprove: (amount: string) => Promise<void>;
  disabled: boolean;
  needsApproval: boolean;
  isApproving: boolean;
  actionLabel?: string;
  statusOverride?: string;
}

type WordSpan = { text: string; start: number; end: number };

const AUDIOBOOK_LINKS_CHAPTERS: Record<number, string> = {
  1: "https://drive.google.com/file/d/1ewDAqVpSWlRem9xT97A9HD5EN9zSc5By/preview",
  2: "https://drive.google.com/file/d/1X0vvKni6HGCjgKQcj8nzUokDy-9NYgJo/preview",
  3: "https://drive.google.com/file/d/1DwI4wkJLSRLCKYN_bH_QZplUzqbCktQV/preview",
  4: "https://drive.google.com/file/d/1ioWmZpK1doKJPV91jdjtqwOlxmBlDyMf/preview",
  5: "https://drive.google.com/file/d/1DUK4kbPbJDNH1Q-wYbs81T3DRDNeIE_-/preview",
  6: "https://drive.google.com/file/d/1ewSBJ_Ftc2-bTH9OcuRIHl4I3nrOnwtt/preview",
  7: "https://drive.google.com/file/d/13X_OeLelqZHPuiRZy_eiQtJX9fY-ukDq/preview",
  8: "https://drive.google.com/file/d/16C4RiOc8bMdl0ic3hyYdlyCoMfu0Wkoz/preview",
};

const AUDIOBOOK_LINKS_SELFHELP: Record<number, string> = {
  1: "https://drive.google.com/file/d/1-R2UPttqjtT-Hz5nzyY2IsKbHKBkHrxf/preview",
  2: "https://drive.google.com/file/d/1puZZOqE8V91kMLtAJT39Rza6B_JAh5Oo/preview",
  3: "https://drive.google.com/file/d/1NcLP9opI0JkQAQcXDgrawx4Djke3jTCd/preview",
};

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

function splitIntoChunks(text: string, maxLen = 1200) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + maxLen, clean.length);
    const slice = clean.slice(start, end);

    const lastStop = Math.max(
      slice.lastIndexOf(". "),
      slice.lastIndexOf("! "),
      slice.lastIndexOf("? "),
      slice.lastIndexOf(" ")
    );

    if (lastStop > 200 && end < clean.length) end = start + lastStop + 1;
    chunks.push(clean.slice(start, end).trim());
    start = end;
  }

  return chunks.filter(Boolean);
}

async function waitVoicesReady(synth: SpeechSynthesis, timeoutMs = 1800) {
  const start = Date.now();
  while (synth.getVoices().length === 0 && Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 80));
  }
  return synth.getVoices();
}

export const ChapterCard: React.FC<ChapterCardProps> = ({
  track,
  chapter,
  title,
  price,
  isUnlocked,
  chapterState = "active",
  onPurchase,
  onApprove,
  disabled,
  needsApproval,
  isApproving,
  actionLabel,
  statusOverride,
}) => {
  const t = useTranslations("ChaptersPage.ChapterCard");
  const isMobile = useIsMobile(1024);

  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Zoom
  const [userScale, setUserScale] = useState<number | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const { ref: pdfViewportRef, size: pdfViewportSize } =
    useElementSize<HTMLDivElement>();

  // Reader
  const [readerEnabled, setReaderEnabled] = useState(true);
  const [pageText, setPageText] = useState<string>("");
  const [isTextLoading, setIsTextLoading] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [highlightCharIndex, setHighlightCharIndex] = useState<number>(-1);

  const [activePage, setActivePage] = useState(1);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const [voicesVersion, setVoicesVersion] = useState(0);

  const speechQueueRef = useRef<string[]>([]);
  const speechChunkIndexRef = useRef(0);

  // pdfjs doc + base page size
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const pdfDocUrlRef = useRef<string>("");
  const pdfBasePageSizeRef = useRef<{ w: number; h: number } | null>(null);

  const pdfOptions = useMemo(
    () => ({
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
      cMapPacked: true,
    }),
    []
  );

  const getPdfUrl = (trackNumber: number, index: number) => {
    const maxIndex = 12;
    const safeIndex = Math.max(1, Math.min(index, maxIndex));
    if (trackNumber === 1) return `/pdfs/chapters/chapter${safeIndex}.pdf`;
    return `/pdfs/selfhelp/book${safeIndex}.pdf`;
  };

  const pdfUrl = useMemo(() => getPdfUrl(track, chapter), [track, chapter]);
  const audioUrl = useMemo(() => {
    const audioMap =
      track === 2 ? AUDIOBOOK_LINKS_SELFHELP : AUDIOBOOK_LINKS_CHAPTERS;
    return audioMap[chapter] ?? null;
  }, [track, chapter]);

  const chip = useMemo(() => {
    return track === 1
      ? { label: t("track.x3"), sub: "Chapters", icon: "📚" }
      : { label: t("track.x6"), sub: "Self-Help Books", icon: "🧠" };
  }, [track, t]);

  const getTrackBadgeClass = (trackNumber: number) => {
    if (trackNumber === 1)
      return "bg-gradient-to-r from-yellow-400 to-amber-500 text-black";
    return "bg-gradient-to-r from-yellow-400 to-amber-500 text-black";
  };

  const getStatusText = () => {
    if (statusOverride) return statusOverride;
    if (isUnlocked) {
      return chapterState === "blocked"
        ? t("status.blocked")
        : t("status.active");
    }
    if (chapter > 1) return t("status.lockedPrevious");
    return t("status.available");
  };

  const getStatusColor = () => {
    if (isUnlocked) {
      return chapterState === "blocked" ? "text-red-300" : "text-yellow-300";
    }
    if (chapter > 1) return "text-amber-300";
    return "text-yellow-400";
  };

  const formattedPrice =
    price && price !== "0" ? formatUnitsSafe(price) : "0";
  const isButtonDisabled = isUnlocked || disabled;
  const isApproveButtonDisabled = isUnlocked || isApproving;

  const handleAction = () => {
    if (needsApproval) onApprove(price);
    else onPurchase(track, chapter);
  };

  const getButtonText = () => {
    if (actionLabel) return actionLabel;
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
      return "bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-[0_0_28px_rgba(184,128,54,0.4)] hover:shadow-[0_0_40px_rgba(184,128,54,0.62)] hover:brightness-110 active:scale-[0.99]";
    }
    return "bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300 text-black shadow-[0_0_28px_rgba(250,204,21,0.35)] hover:shadow-[0_0_40px_rgba(250,204,21,0.6)] hover:brightness-110 active:scale-[0.99]";
  };

  // ✅ Responsive "Fit":
  // - Always based on the viewport size
  // - On mobile: ensure it fits into BOTH width & height of the screen (no overflow)
  // - On desktop: fit both too (looks clean)
  const fitScale = useMemo(() => {
    const w = pdfViewportSize.width;
    const h = pdfViewportSize.height;
    const base = pdfBasePageSizeRef.current;
    if (!w || !h || !base?.w || !base?.h) return 1;

    const byW = w / base.w;
    const byH = h / base.h;

    // ✅ Mobile uses min(width,height) so it fully fits the phone screen
    // ✅ Desktop also uses min(...) so it always fits the space exactly
    const s = Math.min(byW, byH);

    return Math.max(0.25, Math.min(s, 3));
  }, [pdfViewportSize.width, pdfViewportSize.height]);

  const effectiveScale = userScale ?? fitScale;

  // ✅ Zoom by 5%
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 3;
  const ZOOM_STEP = 1.05;

  const zoomIn = () =>
    setUserScale((s) => Math.min((s ?? effectiveScale) * ZOOM_STEP, ZOOM_MAX));
  const zoomOut = () =>
    setUserScale((s) =>
      Math.max((s ?? effectiveScale) / ZOOM_STEP, ZOOM_MIN)
    );
  const zoomReset = () => setUserScale(null);

  // ✅ KEEP CENTER LOCKED WHILE ZOOMING (perfect centering at all times)
  const lastSizeRef = useRef<{ w: number; h: number; scale: number } | null>(
    null
  );

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const prev = lastSizeRef.current;
    const cur = { w: el.scrollWidth, h: el.scrollHeight, scale: effectiveScale };

    // First time
    if (!prev) {
      lastSizeRef.current = cur;
      return;
    }

    // Maintain center position relative to scroll content
    const centerXRatio =
      (el.scrollLeft + el.clientWidth / 2) / Math.max(1, prev.w);
    const centerYRatio =
      (el.scrollTop + el.clientHeight / 2) / Math.max(1, prev.h);

    requestAnimationFrame(() => {
      const newW = el.scrollWidth;
      const newH = el.scrollHeight;

      const targetCenterX = centerXRatio * newW;
      const targetCenterY = centerYRatio * newH;

      el.scrollLeft = Math.max(0, targetCenterX - el.clientWidth / 2);
      el.scrollTop = Math.max(0, targetCenterY - el.clientHeight / 2);

      lastSizeRef.current = { w: newW, h: newH, scale: effectiveScale };
    });
  }, [effectiveScale]);

  // Speech
  const wakeSpeech = useCallback(() => {
    const synth = getSafeSpeechSynthesis();
    if (!synth) return;
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
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

  const startSpeech = useCallback(async () => {
    const synth = getSafeSpeechSynthesis();
    if (!synth) return;

    const text = (pageText || "").trim();
    if (!text) return;

    try {
      synth.cancel();
      synth.resume();
    } catch {}

    const voices = await waitVoicesReady(synth);
    voicesRef.current = voices;
    setVoicesVersion((x) => x + 1);

    const chosen =
      (selectedVoiceURI &&
        voices.find((v) => v.voiceURI === selectedVoiceURI)) ||
      voices.find((v) => /en(-|_)?ng/i.test(v.lang)) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ||
      voices[0];

    speechQueueRef.current = splitIntoChunks(text, 1200);
    speechChunkIndexRef.current = 0;
    if (!speechQueueRef.current.length) return;

    const speakNext = () => {
      const chunk = speechQueueRef.current[speechChunkIndexRef.current];
      if (!chunk) {
        setIsSpeaking(false);
        setIsPaused(false);
        setHighlightCharIndex(-1);
        return;
      }

      const u = new SpeechSynthesisUtterance(chunk);
      u.rate = speechRate;
      u.pitch = speechPitch;
      if (chosen) u.voice = chosen;

      u.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
      };
      u.onend = () => {
        speechChunkIndexRef.current += 1;
        speakNext();
      };
      u.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setHighlightCharIndex(-1);
      };
      u.onboundary = (e: any) => {
        if (typeof e?.charIndex === "number") setHighlightCharIndex(e.charIndex);
      };

      utteranceRef.current = u;
      try {
        synth.speak(u);
      } catch {
        setIsSpeaking(false);
        setIsPaused(false);
      }
    };

    speakNext();
  }, [pageText, selectedVoiceURI, speechRate, speechPitch]);

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

  // Load PDF doc
  const loadPdfDoc = useCallback(async () => {
    if (!showPdfViewer) return;

    if (pdfDocRef.current && pdfDocUrlRef.current === pdfUrl) return;

    if (pdfDocRef.current) {
      try {
        await pdfDocRef.current.destroy();
      } catch {}
      pdfDocRef.current = null;
      pdfBasePageSizeRef.current = null;
    }

    pdfDocUrlRef.current = pdfUrl;

    const task = pdfjs.getDocument({
      url: pdfUrl,
      cMapUrl: pdfOptions.cMapUrl,
      cMapPacked: pdfOptions.cMapPacked,
    });

    const doc = await task.promise;
    pdfDocRef.current = doc;

    try {
      const p1 = await doc.getPage(1);
      const vp = p1.getViewport({ scale: 1 });
      pdfBasePageSizeRef.current = { w: vp.width, h: vp.height };
    } catch {
      pdfBasePageSizeRef.current = { w: 600, h: 848 };
    }
  }, [pdfUrl, pdfOptions.cMapPacked, pdfOptions.cMapUrl, showPdfViewer]);

  const extractActivePageText = useCallback(async () => {
    if (!showPdfViewer || !readerEnabled) return;

    setIsTextLoading(true);
    setPageText("");
    setHighlightCharIndex(-1);

    try {
      await loadPdfDoc();
      const doc = pdfDocRef.current;
      if (!doc) return;

      const p = Math.max(1, Math.min(activePage, doc.numPages));
      const page = await doc.getPage(p);
      const content = await page.getTextContent();

      const raw = (content.items as any[])
        .map((it) => (typeof it?.str === "string" ? it.str : ""))
        .filter(Boolean)
        .join(" ");

      setPageText(raw.replace(/\s+/g, " ").trim());
    } catch {
      setPageText("");
    } finally {
      setIsTextLoading(false);
    }
  }, [showPdfViewer, readerEnabled, activePage, loadPdfDoc]);

  useEffect(() => {
    if (!showPdfViewer) return;
    extractActivePageText();
    stopSpeech();
  }, [activePage, showPdfViewer, extractActivePageText, stopSpeech]);

  // Modal open/close
  const handleReadPdf = () => {
    setShowPdfViewer(true);
    setError(null);
    setNumPages(null);
    setIsLoading(true);
    setUserScale(null);
    setActivePage(1);
    wakeSpeech();
  };

  const handleClosePdf = () => {
    setShowPdfViewer(false);
    setIsLoading(false);
    setError(null);
    setNumPages(null);
    setActivePage(1);
    stopSpeech();
    setPageText("");
    setIsTextLoading(false);
    setHighlightCharIndex(-1);
  };

  // Track active page by scroll
  const pageTopsRef = useRef<number[]>([]);
  const computePageTops = useCallback(() => {
    const root = scrollAreaRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll("[data-pg]")) as HTMLElement[];
    pageTopsRef.current = nodes.map((el) => el.offsetTop);
  }, []);

  const onScrollTrackActivePage = useCallback(() => {
    const root = scrollAreaRef.current;
    if (!root) return;
    const tops = pageTopsRef.current;
    if (!tops.length) return;

    const y = root.scrollTop + 32;
    let best = 1;
    for (let i = 0; i < tops.length; i++) {
      if (y >= tops[i]) best = i + 1;
      else break;
    }
    if (best !== activePage) setActivePage(best);
  }, [activePage]);

  const onDocumentLoadSuccess = async ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);

    if (!pdfBasePageSizeRef.current) {
      try {
        await loadPdfDoc();
      } catch {}
    }

    window.setTimeout(() => {
      computePageTops();
      const el = scrollAreaRef.current;
      if (el) {
        // ✅ center content on first load
        el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
        el.scrollTop = 0;
      }
    }, 250);
  };

  const onDocumentLoadError = (err: Error) => {
    console.error("PDF load error:", err);
    setIsLoading(false);
    setError(t("pdfViewer.loadError"));
  };

  useEffect(() => {
    if (!showPdfViewer) return;
    const root = scrollAreaRef.current;
    if (!root) return;

    const t1 = window.setTimeout(() => {
      computePageTops();
      onScrollTrackActivePage();
    }, 250);

    root.addEventListener("scroll", onScrollTrackActivePage, { passive: true });
    window.addEventListener("resize", computePageTops);

    return () => {
      window.clearTimeout(t1);
      root.removeEventListener("scroll", onScrollTrackActivePage);
      window.removeEventListener("resize", computePageTops);
    };
  }, [showPdfViewer, numPages, effectiveScale, computePageTops, onScrollTrackActivePage]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!showPdfViewer) return;
      switch (e.key) {
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
    [showPdfViewer, readerEnabled, isSpeaking, isPaused, startSpeech, resumeSpeech, pauseSpeech]
  );

  useEffect(() => {
    if (!showPdfViewer) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPdfViewer, handleKeyDown]);

  return (
    <>
      {/* CARD */}
      <div className="group relative overflow-hidden rounded-2xl border border-yellow-500/10 bg-gradient-to-b from-black via-slate-950 to-slate-900 p-5 shadow-[0_0_45px_rgba(0,0,0,0.7)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-yellow-400/40 hover:shadow-[0_0_70px_rgba(250,204,21,0.28)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-300 opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-32 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.28),_transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {isUnlocked && (
          <div className="pointer-events-none absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

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

        <div className="relative mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-900/55 p-3 ring-1 ring-slate-700/60">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">
              {t("price.label")}
            </p>
            <p className="mt-1 text-lg font-bold text-amber-200 tabular-nums">
              {formattedPrice}
              <span className="ml-1 text-xs font-medium text-slate-400">
                {t("price.currency")}
              </span>
            </p>
          </div>
          <div className="rounded-xl bg-slate-900/55 p-3 ring-1 ring-slate-700/60">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">
              {t("status.label")}
            </p>
            <p className={`mt-1 text-sm font-semibold ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>
        </div>

        {isUnlocked ? (
          <Link
            href={`/matrix?track=${track}&chapter=${chapter}`}
            className="relative mt-4 inline-flex w-full items-center justify-center rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-sm font-semibold tracking-wide text-yellow-100 transition-all duration-200 hover:bg-yellow-500/20"
          >
            {t("button.viewChapterData")}
          </Link>
        ) : (
          <button
            onClick={handleAction}
            disabled={needsApproval ? isApproveButtonDisabled : isButtonDisabled}
            className={`relative mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide transition-all duration-200 ${getButtonClass()}`}
          >
            {getButtonText()}
          </button>
        )}

        {isUnlocked && (
          <div className="mt-4">
            <button
              onClick={handleReadPdf}
              className="w-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 hover:from-yellow-500/25 hover:to-amber-500/25 text-slate-100 py-2.5 rounded-xl text-sm font-semibold border border-white/[0.08] transition-colors"
            >
              📖 Open Secure Reader
            </button>
          </div>
        )}

      </div>

      {/* FULLSCREEN MODAL */}
      {showPdfViewer && (
        <div className="fixed inset-0 z-50 bg-black/95" onClick={handleClosePdf}>
          <div className="absolute inset-0" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full h-[100dvh] bg-slate-950 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-[rgba(4,6,10,0.92)] px-3 py-3 backdrop-blur-xl">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <button
                    onClick={handleClosePdf}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/12 px-3 py-2.5 text-sm font-semibold text-yellow-100 shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition-colors hover:bg-yellow-500/20"
                  >
                    <span aria-hidden="true">←</span>
                    <span>{t("pdfViewer.backToChapters")}</span>
                  </button>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-50">
                      {title}
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      {chip.icon} {chip.label} • Page {activePage}/{numPages ?? "?"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleClosePdf}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/[0.08]"
                  aria-label={t("pdfViewer.closeButton")}
                >
                  <span>{t("pdfViewer.closeButton")}</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Controls */}
              <div className="px-3 py-2 border-b border-white/[0.06] bg-slate-950/60">
                <div className="flex items-center justify-end gap-2">
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
                  <button
                    onClick={zoomReset}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.08] text-slate-200"
                    title="Fit"
                  >
                    Fit
                  </button>
                </div>
              </div>

              {audioUrl && (
                <div className="px-3 py-3 border-b border-white/[0.06] bg-slate-950/70">
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                    <span>🎧 {t("audio.label")}</span>
                    <span className="text-slate-500">
                      {t("chapter.label")} {chapter}
                    </span>
                  </div>
                  <div className="relative w-full overflow-hidden rounded-xl border border-white/[0.08] bg-black">
                    <div className="w-full" style={{ height: 140 }}>
                      <iframe
                        src={audioUrl}
                        className="w-full h-full"
                        allow="autoplay"
                        allowFullScreen
                        title={`Chapter ${chapter} Audiobook`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PDF Space */}
              <div className="flex-1 overflow-hidden">
                <div ref={pdfViewportRef} className="w-full h-full relative overflow-hidden">
                  <div
                    ref={scrollAreaRef}
                    className="absolute inset-0 overflow-auto overscroll-contain"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    {/* ✅ ALWAYS CENTERED */}
                    <div className="min-w-max min-h-full flex items-center justify-center">
                      <div className="relative inline-block">
                        <Document
                          key={pdfUrl}
                          file={pdfUrl}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={onDocumentLoadError}
                          loading={null}
                          error={null}
                          options={pdfOptions}
                        >
                          {Array.from(new Array(numPages ?? 0), (_, index) => {
                            const pageNo = index + 1;
                            return (
                              <div key={`pgwrap-${pageNo}`} data-pg={pageNo} className="w-fit">
                                <Page
                                  pageNumber={pageNo}
                                  scale={effectiveScale}
                                  renderAnnotationLayer
                                  renderTextLayer
                                />
                              </div>
                            );
                          })}
                        </Document>
                      </div>
                    </div>
                  </div>

                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                      <div className="text-center">
                        <div className="w-16 h-16 border-4 border-yellow-500/25 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-slate-200">{t("pdfViewer.loading")}</p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="absolute inset-0 flex items-center justify-center px-4">
                      <div className="w-full max-w-md text-center p-6 bg-red-500/10 rounded-2xl border border-red-500/20">
                        <p className="text-red-200">{error}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* (Reader UI remains unchanged in your previous build; you can plug it back if you want) */}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
