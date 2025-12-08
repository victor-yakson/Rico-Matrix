"use client";

import React, { useState, useRef } from "react";
import { formatUnits } from "viem";

interface ChapterCardProps {
  track: number;
  chapter: number;
  title: string;
  price: string;
  isUnlocked: boolean;
  onPurchase: (track: number, chapter: number) => Promise<void>;
  onApprove: (amount: string) => Promise<void>;
  disabled: boolean;
  needsApproval: boolean;
  isApproving: boolean;
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
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const getChapterPdfUrl = (chapterNumber: number) => {
    const pdfUrls = [
      "/pdfs/chapter1.pdf",
      "/pdfs/chapter2.pdf",
      "/pdfs/chapter3.pdf",
      "/pdfs/chapter4.pdf",
      "/pdfs/chapter5.pdf",
      "/pdfs/chapter6.pdf",
      "/pdfs/chapter7.pdf",
      "/pdfs/chapter8.pdf",
      "/pdfs/chapter9.pdf",
      "/pdfs/chapter10.pdf",
      "/pdfs/chapter11.pdf",
      "/pdfs/chapter12.pdf",
    ];
    return pdfUrls[chapterNumber - 1] || "/pdfs/default.pdf";
  };

  const getTrackBadgeClass = (track: number) => {
    if (track === 1) {
      return "bg-gradient-to-r from-yellow-400 to-amber-500 text-black";
    }
    return "bg-gradient-to-r from-slate-600 to-slate-400 text-white";
  };

  const getStatusText = () => {
    if (isUnlocked) return "Unlocked";
    if (chapter > 1) return "Locked — Complete previous chapter";
    return "Available to unlock";
  };

  const getStatusColor = () => {
    if (isUnlocked) return "text-emerald-400";
    if (chapter > 1) return "text-amber-300";
    return "text-yellow-400";
  };

  const formattedPrice =
    price && price !== "0" ? formatUnits(BigInt(price), 18) : "0";

  const isButtonDisabled = isUnlocked || disabled || chapter > 1;
  const isApproveButtonDisabled = isUnlocked || isApproving || chapter > 1;

  const handleAction = () => {
    if (needsApproval) {
      onApprove(price);
    } else {
      onPurchase(track, chapter);
    }
  };

  const getButtonText = () => {
    if (isUnlocked) return "Chapter Unlocked";
    if (isApproving) return "Approving...";
    if (disabled) return "Processing...";
    if (needsApproval) return "Approve USDT";
    return "Unlock Chapter";
  };

  const getButtonClass = () => {
    if (isButtonDisabled || isApproveButtonDisabled) {
      return "cursor-not-allowed bg-slate-800 text-slate-500 ring-1 ring-slate-700";
    }

    if (needsApproval) {
      return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-[0_0_24px_rgba(59,130,246,0.5)] hover:shadow-[0_0_32px_rgba(59,130,246,0.8)] hover:brightness-110 active:scale-[0.98]";
    }

    return "bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300 text-black shadow-[0_0_24px_rgba(250,204,21,0.5)] hover:shadow-[0_0_32px_rgba(250,204,21,0.8)] hover:brightness-110 active:scale-[0.98]";
  };

  const handleReadPdf = () => {
    setShowPdfViewer(true);
  };

  const handleClosePdf = () => {
    setShowPdfViewer(false);
  };

  // Just block context menu, don’t swallow all events
  const preventDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleZoomIn = () => {
    if (!iframeRef.current) return;
    iframeRef.current.contentWindow?.postMessage("zoomIn", "*");
  };

  const handleZoomOut = () => {
    if (!iframeRef.current) return;
    iframeRef.current.contentWindow?.postMessage("zoomOut", "*");
  };

  const pdfUrl = `${getChapterPdfUrl(
    chapter
  )}#toolbar=0&navpanes=0&scrollbar=0`;

  return (
    <>
      <div className="group relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-b from-black via-slate-950 to-slate-900 p-5 shadow-[0_0_40px_rgba(0,0,0,0.7)] transition-all duration-300 hover:-translate-y-1 hover:border-yellow-400 hover:shadow-[0_0_60px_rgba(250,204,21,0.4)]">
        {/* Glow accent */}
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-32 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.35),_transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative flex items-start justify-between mb-4">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide shadow-sm ${getTrackBadgeClass(
              track
            )}`}
          >
            <span className="inline-block h-2 w-2 rounded-full bg-black/60" />
            Track {track}
          </span>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Chapter
            </p>
            <p className="text-2xl font-extrabold text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]">
              #{chapter}
            </p>
          </div>
        </div>

        <h3 className="relative mb-3 line-clamp-2 text-base font-semibold text-slate-50">
          {title}
        </h3>

        <div className="relative space-y-3 rounded-xl bg-slate-900/60 p-3 ring-1 ring-slate-700/70">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Price</span>
            <span className="font-semibold text-yellow-300">
              {formattedPrice}{" "}
              <span className="text-xs text-slate-400">USDT</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Status</span>
            <span className={`font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>

          {!isUnlocked && chapter === 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Approval</span>
              <span
                className={`font-medium ${
                  needsApproval ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {needsApproval ? "Required" : "Approved"}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handleAction}
          disabled={isButtonDisabled || isApproveButtonDisabled}
          className={`relative mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide transition-all duration-200 ${getButtonClass()}`}
        >
          {getButtonText()}
        </button>

        {isUnlocked && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-emerald-300">
                  📖 Chapter Content
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                  Available
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-3">
                Read the PDF content for this chapter in our secure viewer.
              </p>
              <button
                onClick={handleReadPdf}
                className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 py-2 rounded-lg text-sm font-medium border border-emerald-500/40 transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Read Chapter PDF
              </button>
            </div>
          </div>
        )}

        {needsApproval && !isUnlocked && chapter === 1 && (
          <div className="mt-2 text-xs text-blue-400 text-center">
            Approve USDT first to unlock this chapter
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent opacity-60" />
      </div>

      {showPdfViewer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          onClick={handleClosePdf}
          onContextMenu={preventDownload}
        >
          <div
            className="relative w-full max-w-6xl h-[90vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={preventDownload}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    #{chapter}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">
                    {title}
                  </h3>
                  <p className="text-sm text-slate-400">
                    Track {track} • Secure PDF Viewer • Reading only
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                  No Download
                </div>
                <button
                  onClick={handleClosePdf}
                  className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
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
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-slate-950">
              <div className="p-3 bg-yellow-500/10 border-b border-yellow-500/20">
                <div className="flex items-center justify-center gap-2 text-sm text-yellow-300">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span>
                    Secure PDF Viewer • Downloading is discouraged • Right-click
                    disabled
                  </span>
                </div>
              </div>

              {/* PDF viewer */}
              <div className="h-full p-4">
                <div className="relative w-full h-full rounded-xl overflow-hidden border-2 border-slate-700 bg-black">
                  <iframe
                    ref={iframeRef}
                    src={pdfUrl}
                    className="w-full h-full"
                    title={`Chapter ${chapter} - ${title}`}
                    onContextMenu={preventDownload}
                    onLoad={() => {
                      console.log("PDF loaded:", pdfUrl);
                    }}
                  />

                  {/* Watermark overlay (no pointer blocking) */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-6xl font-bold text-white/5 select-none">
                        RICO MATRIX
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="p-4 border-t border-slate-700 bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <span>Protected content - Reading only</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleZoomIn}
                      className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300"
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
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={handleZoomOut}
                      className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300"
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
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                        />
                      </svg>
                    </button>
                    <div className="h-6 w-px bg-slate-600" />
                    <button
                      onClick={handleClosePdf}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors"
                    >
                      Close Viewer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
