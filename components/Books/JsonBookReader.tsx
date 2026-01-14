// components/books/JsonBookReader.tsx
"use client";

import React, { useMemo, useState } from "react";
import type { BookChapter, BookEpisode, BookBlock } from "@/types/books";
import { useChunkTTS } from "@/components/Books/useChunkTTS";

function episodePlainText(ep: BookEpisode) {
  const parts: string[] = [];
  for (const b of ep.blocks) {
    if (b.type === "paragraph") parts.push(b.text);
    if (b.type === "list") parts.push(b.items.join(". "));
    if (b.type === "pause_reflect") parts.push(b.prompt);
    if (b.type === "metaphor") parts.push([b.title, b.text].filter(Boolean).join(": "));
    if (b.type === "terminology") {
      parts.push(b.items.map((x) => `${x.term}: ${x.meaning}`).join(". "));
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function JsonBookReader(props: {
  chapterData: BookChapter;
  selectedVoiceURI: string;
  setSelectedVoiceURI: (v: string) => void;
  speechRate: number;
  setSpeechRate: (n: number) => void;
  speechPitch: number;
  setSpeechPitch: (n: number) => void;
}) {
  const {
    chapterData,
    selectedVoiceURI,
    setSelectedVoiceURI,
    speechRate,
    setSpeechRate,
    speechPitch,
    setSpeechPitch,
  } = props;

  const [activeEpisodeIdx, setActiveEpisodeIdx] = useState(0);

  const episode = chapterData.episodes[activeEpisodeIdx];
  const plain = useMemo(() => (episode ? episodePlainText(episode) : ""), [episode]);

  const {
    isSpeaking,
    isPaused,
    activeWordIndex,
    voices,
    voicesVersion,
    start,
    pause,
    resume,
    stop,
  } = useChunkTTS({
    text: plain,
    voiceURI: selectedVoiceURI,
    rate: speechRate,
    pitch: speechPitch,
    chunkWords: 10,
  });

  const words = useMemo(() => plain.split(/\s+/).filter(Boolean), [plain]);

  return (
    <div className="flex-1 overflow-hidden flex">
      {/* Left: Episode list */}
      <aside className="hidden lg:flex w-[320px] flex-col border-r border-white/[0.06] bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="p-4 border-b border-white/[0.06]">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Episodes</p>
          <h4 className="text-sm font-semibold text-slate-100">{chapterData.title}</h4>
          {chapterData.slogan && (
            <div className="mt-2 text-xs text-slate-400">{chapterData.slogan}</div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-2">
          {chapterData.episodes.map((ep, idx) => {
            const active = idx === activeEpisodeIdx;
            return (
              <button
                key={ep.id}
                onClick={() => {
                  stop();
                  setActiveEpisodeIdx(idx);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl border mb-2 ${
                  active
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-100"
                    : "bg-white/[0.03] border-white/[0.06] text-slate-200 hover:bg-white/[0.05]"
                }`}
              >
                <div className="text-[11px] opacity-70">EPISODE {idx + 1}</div>
                <div className="text-sm font-semibold leading-snug">{ep.title}</div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right: Content + Reader */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile episode picker */}
        <div className="lg:hidden p-3 border-b border-white/[0.06] bg-slate-950/60">
          <select
            value={activeEpisodeIdx}
            onChange={(e) => {
              stop();
              setActiveEpisodeIdx(Number(e.target.value));
            }}
            className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-slate-100 outline-none"
          >
            {chapterData.episodes.map((ep, idx) => (
              <option key={ep.id} value={idx}>
                EPISODE {idx + 1} — {ep.title}
              </option>
            ))}
          </select>
        </div>

        {/* Controls */}
        <div className="p-3 md:p-4 border-b border-white/[0.06] bg-gradient-to-b from-slate-900/50 to-slate-950/40">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                EPISODE {activeEpisodeIdx + 1}
              </div>
              <div className="text-sm font-semibold text-slate-100 truncate">
                {episode?.title}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!plain) return;
                  if (!isSpeaking) start();
                  else if (isPaused) resume();
                  else pause();
                }}
                disabled={!plain}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                  !plain
                    ? "bg-white/[0.03] text-slate-500 border-white/[0.06] cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 hover:from-emerald-500/30 hover:to-cyan-500/30 text-slate-100 border-white/[0.08]"
                }`}
              >
                {!isSpeaking ? "▶ Play" : isPaused ? "⏵ Resume" : "⏸ Pause"}
              </button>

              <button
                onClick={stop}
                disabled={!isSpeaking && !isPaused}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                  !isSpeaking && !isPaused
                    ? "bg-white/[0.03] text-slate-500 border-white/[0.06] cursor-not-allowed"
                    : "bg-red-500/10 hover:bg-red-500/15 text-red-200 border-red-500/20"
                }`}
              >
                ■
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400">Voice</label>
              <select
                value={selectedVoiceURI}
                onChange={(e) => {
                  stop();
                  setSelectedVoiceURI(e.target.value);
                }}
                className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-slate-100 outline-none"
              >
                {(voices || []).map((v) => (
                  <option key={`${v.voiceURI}-${voicesVersion}`} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400">Speed</label>
              <input
                type="range"
                min={0.7}
                max={1.3}
                step={0.05}
                value={speechRate}
                onChange={(e) => {
                  stop();
                  setSpeechRate(Number(e.target.value));
                }}
                className="mt-2 w-full"
              />
              <div className="text-[11px] text-slate-500 mt-1">{speechRate.toFixed(2)}x</div>
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
                  stop();
                  setSpeechPitch(Number(e.target.value));
                }}
                className="mt-2 w-full"
              />
              <div className="text-[11px] text-slate-500 mt-1">{speechPitch.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-3 md:p-4">
          {/* Render blocks nicely */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            {episode?.blocks?.map((b, i) => <Block key={i} block={b} />)}
          </div>

          {/* Transcript highlight (optional panel) */}
          <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="text-xs text-slate-500 mb-2">Transcript (highlight follows TTS chunks)</div>
            <div className="text-sm leading-7 text-slate-200">
              {words.map((w, idx) => {
                const active = idx === activeWordIndex;
                return (
                  <span
                    key={`${idx}-${w}`}
                    className={
                      active
                        ? "px-1.5 py-0.5 rounded-lg bg-emerald-500/25 text-emerald-100 border border-emerald-500/20 shadow-[0_0_18px_rgba(16,185,129,0.18)]"
                        : "text-slate-200/90"
                    }
                  >
                    {w}{" "}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ block }: { block: BookBlock }) {
  if (block.type === "paragraph") {
    return <p className="text-sm leading-7 text-slate-200 mb-3">{block.text}</p>;
  }
  if (block.type === "list") {
    return (
      <ul className="list-disc ml-5 text-sm text-slate-200 mb-3 space-y-1">
        {block.items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "pause_reflect") {
    return (
      <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
        <div className="text-xs uppercase tracking-[0.18em] text-amber-200 mb-1">
          Pause & Reflect
        </div>
        <div className="text-sm text-amber-100">{block.prompt}</div>
      </div>
    );
  }
  if (block.type === "terminology") {
    return (
      <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
        <div className="text-xs uppercase tracking-[0.18em] text-cyan-200 mb-2">
          Terminology
        </div>
        <div className="space-y-2">
          {block.items.map((it, i) => (
            <div key={i} className="text-sm text-slate-100">
              <span className="font-semibold text-cyan-100">{it.term}:</span>{" "}
              <span className="text-slate-200">{it.meaning}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (block.type === "metaphor") {
    return (
      <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
        <div className="text-xs uppercase tracking-[0.18em] text-emerald-200 mb-1">
          Metaphor{block.title ? ` — ${block.title}` : ""}
        </div>
        <div className="text-sm text-emerald-50">{block.text}</div>
      </div>
    );
  }
  return null;
}
