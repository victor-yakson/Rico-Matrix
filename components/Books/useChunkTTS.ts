// components/books/useChunkTTS.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

export function useChunkTTS(params: {
  text: string;
  voiceURI?: string;
  rate: number;
  pitch: number;
  chunkWords?: number; // default 10
}) {
  const { text, voiceURI, rate, pitch, chunkWords = 10 } = params;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // word highlighting (index in words array)
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);

  const queueRef = useRef<string[]>([]);
  const idxRef = useRef<number>(0);
  const wordStartIndexRef = useRef<number>(0);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const [voicesVersion, setVoicesVersion] = useState(0);

  const words = useMemo(() => {
    const normalized = text.replace(/\s+/g, " ").trim();
    return normalized ? normalized.split(" ") : [];
  }, [text]);

  const chunks = useMemo(() => {
    const out: { chunk: string; startWord: number }[] = [];
    if (!words.length) return out;

    for (let i = 0; i < words.length; i += chunkWords) {
      const part = words.slice(i, i + chunkWords).join(" ");
      out.push({ chunk: part, startWord: i });
    }
    return out;
  }, [words, chunkWords]);

  // voice loading
  useEffect(() => {
    const synth = getSynth();
    if (!synth) return;

    const load = () => {
      voicesRef.current = synth.getVoices();
      setVoicesVersion((v) => v + 1);
    };

    load();
    synth.onvoiceschanged = load;
    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  const stop = useCallback(() => {
    const synth = getSynth();
    if (!synth) return;

    try {
      synth.cancel();
    } catch {}

    utterRef.current = null;
    queueRef.current = [];
    idxRef.current = 0;
    wordStartIndexRef.current = 0;

    setIsSpeaking(false);
    setIsPaused(false);
    setActiveWordIndex(-1);
  }, []);

  const speakNext = useCallback(() => {
    const synth = getSynth();
    if (!synth) return;

    const next = queueRef.current[idxRef.current];
    if (!next) {
      setIsSpeaking(false);
      setIsPaused(false);
      setActiveWordIndex(-1);
      return;
    }

    const u = new SpeechSynthesisUtterance(next);
    u.rate = rate;
    u.pitch = pitch;

    const voices = voicesRef.current || [];
    const chosen =
      (voiceURI && voices.find((v) => v.voiceURI === voiceURI)) ||
      voices.find((v) => /en(-|_)?ng/i.test(v.lang)) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ||
      voices[0];

    if (chosen) u.voice = chosen;

    const currentWordStart = wordStartIndexRef.current;
    setActiveWordIndex(currentWordStart); // highlight at least chunk start

    u.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    u.onend = () => {
      idxRef.current += 1;
      // move highlight start by chunkWords
      wordStartIndexRef.current = Math.min(
        wordStartIndexRef.current + chunkWords,
        Math.max(0, words.length - 1)
      );
      speakNext();
    };

    u.onerror = () => {
      // fail safe: stop
      stop();
    };

    utterRef.current = u;
    try {
      synth.speak(u);
    } catch {
      stop();
    }
  }, [chunkWords, pitch, rate, stop, voiceURI, words.length]);

  const start = useCallback(() => {
    const synth = getSynth();
    if (!synth) return;
    if (!chunks.length) return;

    // iOS/Safari "wake"
    try {
      const wake = new SpeechSynthesisUtterance(" ");
      wake.volume = 0;
      synth.speak(wake);
      synth.cancel();
    } catch {}

    try {
      synth.cancel();
    } catch {}

    queueRef.current = chunks.map((c) => c.chunk);
    idxRef.current = 0;
    wordStartIndexRef.current = chunks[0].startWord;

    setActiveWordIndex(chunks[0].startWord);
    speakNext();
  }, [chunks, speakNext]);

  const pause = useCallback(() => {
    const synth = getSynth();
    if (!synth) return;
    try {
      synth.pause();
      setIsPaused(true);
    } catch {}
  }, []);

  const resume = useCallback(() => {
    const synth = getSynth();
    if (!synth) return;
    try {
      synth.resume();
      setIsPaused(false);
    } catch {}
  }, []);

  return {
    isSpeaking,
    isPaused,
    activeWordIndex,
    voices: voicesRef.current,
    voicesVersion,
    start,
    pause,
    resume,
    stop,
  };
}
