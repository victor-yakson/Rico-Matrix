// scripts/extractBooksToJson.ts
/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * ✅ FULL WORKING EXTRACTOR (CHAPTER 1–12 + BOOK 1–12)
 *
 * Fixes “not extracted everything” by:
 * 1) Layout-aware extraction:
 *    - sorts text items by (y desc, x asc)
 *    - groups items into lines by y tolerance
 *    - rebuilds each line with spacing based on x gaps
 * 2) Preserves blank lines as separators (important for structure)
 * 3) If a PDF has no EPISODE markers, it still saves ALL text (as one big episode)
 *
 * Output:
 * - public/books/chapter1.json ... chapter12.json
 * - public/books/book1.json ... book12.json
 *
 * Input:
 * - public/pdfs/chapters/chapter1.pdf ... chapter12.pdf
 * - public/pdfs/selfhelp/book1.pdf ... book12.pdf
 */

// ---------------- Types ----------------
type BookBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "pause_reflect"; prompt: string }
  | { type: "terminology"; items: { term: string; meaning: string }[] }
  | { type: "metaphor"; title?: string; text: string };

type BookEpisode = {
  id: string;
  title: string;
  blocks: BookBlock[];
};

type BookChapter = {
  id: string;
  chapterNumber: number;
  track: 1 | 2;
  title: string;
  officialName?: string;
  slogan?: string;
  noteToReader?: string;
  objectives?: string[];
  episodes: BookEpisode[];
  disclaimer?: string;
  extractionStats?: {
    numPages: number;
    totalLines: number;
    totalNonEmptyLines: number;
    lowTextPages: number[];
  };
};

type TrackConfig = {
  track: 1 | 2;
  inDir: string;
  outDir: string;
  filePrefix: "chapter" | "book";
  indexRange: [number, number];
};

// ---------------- Utils ----------------
function cleanLine(s: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function safeMkdir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function fileExists(p: string) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isEpisodeHeader(line: string) {
  return /^EPISODE\s+[A-Z0-9]+/i.test(line) && line.includes("—");
}

function parseEpisodeHeader(line: string) {
  const m = line.match(/^EPISODE\s+(.+?)\s+—\s+(.+)$/i);
  if (!m) return null;
  return { indexRaw: cleanLine(m[1]), title: cleanLine(m[2]) };
}

function splitTermMeaning(line: string) {
  const idx = line.indexOf(":");
  if (idx === -1) return null;
  const term = cleanLine(line.slice(0, idx));
  const meaning = cleanLine(line.slice(idx + 1));
  if (!term || !meaning) return null;
  return { term, meaning };
}

function inferTitleFromLines(lines: string[]) {
  const head = lines.slice(0, 80).map((l) => cleanLine(l)).filter(Boolean);

  for (const l of head) {
    const m = l.match(/^(CHAPTER|Chapter)\s+\d+\s+—\s+(.+)$/);
    if (m?.[2]) return cleanLine(m[2]);
  }

  for (const l of head) {
    const p = parseEpisodeHeader(l);
    if (p?.title) return p.title;
  }

  const candidate = head.find(
    (l) => l.length >= 8 && !/^📖|🎯|⚠️/u.test(l)
  );
  return candidate ? candidate : "Untitled";
}

/**
 * ✅ Layout-aware extractor:
 * - reads PDF into Buffer, uses { data } (works reliably in Node)
 * - rebuilds lines based on transform x,y positions
 */
async function extractTextByPages(pdfAbsPath: string): Promise<{
  pages: string[];
  lowTextPages: number[];
  numPages: number;
}> {
  const data = new Uint8Array(fs.readFileSync(pdfAbsPath));

  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    verbosity: 0,
  });

  const doc = await loadingTask.promise;

  const pages: string[] = [];
  const lowTextPages: number[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);

    const content = await page.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false,
      includeMarkedContent: true,
    } as any);

    const items = (content.items as any[])
      .map((it) => {
        const str = typeof it?.str === "string" ? it.str : "";
        const tr = it?.transform;
        const x = Array.isArray(tr) ? Number(tr[4] ?? 0) : 0;
        const y = Array.isArray(tr) ? Number(tr[5] ?? 0) : 0;
        const w = Number(it?.width ?? 0);
        return { str, x, y, w };
      })
      .filter((it) => it.str && it.str.trim().length);

    // sort top-to-bottom (y desc), left-to-right (x asc)
    items.sort((a, b) => {
      const dy = b.y - a.y;
      if (Math.abs(dy) > 2) return dy;
      return a.x - b.x;
    });

    // group into lines by y
    const Y_TOL = 2.2;
    const lines: { y: number; parts: { str: string; x: number; w: number }[] }[] =
      [];

    for (const it of items) {
      const last = lines[lines.length - 1];
      if (!last || Math.abs(last.y - it.y) > Y_TOL) {
        lines.push({ y: it.y, parts: [{ str: it.str, x: it.x, w: it.w }] });
      } else {
        last.parts.push({ str: it.str, x: it.x, w: it.w });
      }
    }

    // rebuild each line with spacing based on x gaps
    const rebuilt = lines
      .map((ln) => {
        ln.parts.sort((a, b) => a.x - b.x);
        let out = "";
        let prevEnd = -Infinity;

        for (const part of ln.parts) {
          const start = part.x;
          const end = part.x + (part.w || part.str.length * 4);

          // add a space if a visible gap exists
          if (out && start - prevEnd > 6) out += " ";
          out += part.str;

          prevEnd = end;
        }

        return out;
      })
      .join("\n");

    // detect low-text pages (often scanned image pages)
    const score = rebuilt.replace(/\s+/g, "").length;
    if (score < 40) lowTextPages.push(p);

    pages.push(rebuilt);
  }

  await doc.destroy();
  return { pages, lowTextPages, numPages: doc.numPages };
}

/**
 * ✅ Preserve blank lines as separators.
 * (Your old filter(Boolean) removed structure.)
 */
function pagesToLinesKeepBreaks(pages: string[]): string[] {
  const raw = pages.join("\n").replace(/\r/g, "");
  const split = raw.split("\n").map((l) => l.trim());

  // collapse multiple empty lines into single empty line
  const out: string[] = [];
  for (const l of split) {
    if (l === "") {
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }
    out.push(l);
  }
  return out;
}

function buildChapterFromLines(input: { chapterNumber: number; track: 1 | 2; title?: string }, lines: string[], stats: { numPages: number; lowTextPages: number[] }): BookChapter {
  const title = cleanLine(input.title || "") || inferTitleFromLines(lines);

  const chapter: BookChapter = {
    id: `${input.track === 1 ? "chapter" : "book"}-${input.chapterNumber}`,
    chapterNumber: input.chapterNumber,
    track: input.track,
    title,
    episodes: [],
    extractionStats: {
      numPages: stats.numPages,
      totalLines: lines.length,
      totalNonEmptyLines: lines.filter((x) => cleanLine(x)).length,
      lowTextPages: stats.lowTextPages,
    },
  };

  // -------- Metadata capture (first ~160 lines) --------
  for (let i = 0; i < Math.min(lines.length, 160); i++) {
    const l = cleanLine(lines[i]);
    if (!l) continue;

    // Official Name:
    if (/^official/i.test(l)) {
      const idx = l.indexOf(":");
      if (idx !== -1) chapter.officialName = cleanLine(l.slice(idx + 1));
    }

    // Slogan:
    if (/^(chapter|episode)\s+slogan:/i.test(l)) {
      const idx = l.indexOf(":");
      if (idx !== -1) chapter.slogan = cleanLine(l.slice(idx + 1));
    }

    // NOTE TO READER
    if (l === "📖 A NOTE TO THE READER" || /^A NOTE TO THE READER$/i.test(l)) {
      const parts: string[] = [];
      for (let j = i + 1; j < i + 120 && j < lines.length; j++) {
        const lj = lines[j];
        if (lj === "") break;
        const c = cleanLine(lj);
        if (!c) continue;
        if (c.toUpperCase().startsWith("EPISODE ")) break;
        if ((c.includes("🎯") && c.toLowerCase().includes("objectives")) || /^objectives$/i.test(c)) break;
        parts.push(c);
      }
      if (parts.length) chapter.noteToReader = parts.join(" ");
    }

    // OBJECTIVES
    if ((l.includes("🎯") && l.toLowerCase().includes("objectives")) || /^objectives$/i.test(l)) {
      const obj: string[] = [];
      for (let j = i + 1; j < i + 100 && j < lines.length; j++) {
        const lj0 = lines[j];
        if (lj0 === "") break;
        const lj = cleanLine(lj0);
        if (!lj) continue;
        if (lj.toUpperCase().startsWith("EPISODE ")) break;

        if (/^✅\s+/.test(lj) || /^[-•]\s+/.test(lj) || /^\d+\.\s+/.test(lj)) {
          obj.push(lj.replace(/^✅\s+/, "").replace(/^[-•]\s+/, "").replace(/^\d+\.\s+/, ""));
          continue;
        }

        // Stop if a paragraph starts and we already have some objectives
        if (obj.length && lj.length > 30) break;
      }
      if (obj.length) chapter.objectives = obj;
    }

    // DISCLAIMER
    if (l.startsWith("⚠️ DISCLAIMER") || /^DISCLAIMER$/i.test(l)) {
      const d: string[] = [];
      for (let j = i; j < i + 180 && j < lines.length; j++) {
        const lj0 = lines[j];
        if (lj0 === "") break;
        const lj = cleanLine(lj0);
        if (!lj) continue;
        if (j > i && lj.toUpperCase().startsWith("EPISODE ")) break;
        d.push(lj);
      }
      if (d.length) chapter.disclaimer = d.join(" ");
    }
  }

  // -------- Episode parsing --------
  let current: BookEpisode | null = null;
  let mode: "normal" | "terminology" | "metaphor" | "pause" = "normal";

  let termBuffer: { term: string; meaning: string }[] = [];
  let listBuffer: string[] = [];
  let metaphorTitle: string | undefined;

  const flushTerminology = () => {
    if (termBuffer.length && current) {
      current.blocks.push({ type: "terminology", items: termBuffer });
      termBuffer = [];
    }
  };

  const flushList = () => {
    if (listBuffer.length && current) {
      current.blocks.push({ type: "list", items: listBuffer });
      listBuffer = [];
    }
  };

  const flushMetaphor = (text: string) => {
    if (current && text) current.blocks.push({ type: "metaphor", title: metaphorTitle, text });
    metaphorTitle = undefined;
  };

  // paragraph buffer to merge lines into paragraphs
  let paraBuf: string[] = [];
  const flushParagraph = () => {
    if (!current) return;
    const txt = cleanLine(paraBuf.join(" "));
    if (txt) current.blocks.push({ type: "paragraph", text: txt });
    paraBuf = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const l0 = cleanLine(raw);

    // blank line => paragraph boundary
    if (raw === "") {
      flushParagraph();
      flushTerminology();
      flushList();
      continue;
    }

    // EPISODE header
    if (isEpisodeHeader(l0)) {
      flushParagraph();
      flushTerminology();
      flushList();

      current = null;
      mode = "normal";

      const parsed = parseEpisodeHeader(l0);
      if (!parsed) continue;

      const epIndex = chapter.episodes.length + 1;
      current = { id: `episode-${epIndex}`, title: parsed.title, blocks: [] };
      chapter.episodes.push(current);
      continue;
    }

    if (!current) continue;

    // section markers
    if (/^⏸\s*Pause\s*&\s*Reflect/i.test(l0) || /^Pause\s*&\s*Reflect/i.test(l0)) {
      flushParagraph();
      flushTerminology();
      flushList();
      mode = "pause";
      continue;
    }

    if (/Terminology Explained/i.test(l0) || /^Terminology$/i.test(l0)) {
      flushParagraph();
      flushList();
      mode = "terminology";
      continue;
    }

    if (/Metaphor/i.test(l0)) {
      flushParagraph();
      flushTerminology();
      flushList();
      mode = "metaphor";
      metaphorTitle = l0
        .replace(/^🧠\s*/u, "")
        .replace(/^Metaphor\s*—\s*/i, "")
        .trim() || undefined;
      continue;
    }

    // mode handling
    if (mode === "pause") {
      flushParagraph();
      current.blocks.push({ type: "pause_reflect", prompt: l0 });
      mode = "normal";
      continue;
    }

    if (mode === "terminology") {
      const tm = splitTermMeaning(l0);
      if (tm) {
        termBuffer.push(tm);
        continue;
      }
      flushTerminology();
      mode = "normal";
      // continue into normal handling
    }

    if (mode === "metaphor") {
      flushParagraph();
      flushMetaphor(l0);
      mode = "normal";
      continue;
    }

    // lists (bullets / numbering / ✅)
    if (/^\d+\.\s+/.test(l0) || /^[-•]\s+/.test(l0) || /^✅\s+/.test(l0)) {
      flushParagraph();
      listBuffer.push(
        l0.replace(/^✅\s+/, "").replace(/^\d+\.\s+/, "").replace(/^[-•]\s+/, "")
      );
      continue;
    } else {
      flushList();
    }

    // normal text => accumulate into paragraph buffer
    paraBuf.push(l0);
  }

  // final flush
  flushParagraph();
  flushTerminology();
  flushList();

  // ✅ If no episodes found, keep ALL text as one big episode
  if (!chapter.episodes.length) {
    const allText = lines
      .filter((x) => x !== "")
      .map((x) => cleanLine(x))
      .filter(Boolean);

    chapter.episodes.push({
      id: "episode-1",
      title: "Full Text",
      blocks: allText.map((t) => ({ type: "paragraph", text: t })),
    });
  }

  return chapter;
}

function buildJobs(cfg: TrackConfig) {
  const jobs: { idx: number; pdfAbs: string; outAbs: string }[] = [];
  const [start, end] = cfg.indexRange;

  for (let i = start; i <= end; i++) {
    const pdfAbs = path.join(process.cwd(), cfg.inDir, `${cfg.filePrefix}${i}.pdf`);
    const outAbs = path.join(process.cwd(), cfg.outDir, `${cfg.filePrefix}${i}.json`);
    jobs.push({ idx: i, pdfAbs, outAbs });
  }

  return jobs;
}

async function processOne(cfg: TrackConfig, idx: number, pdfAbs: string, outAbs: string) {
  if (!fileExists(pdfAbs)) {
    console.warn(`⚠️ Missing PDF: ${pdfAbs}`);
    return;
  }

  const { pages, lowTextPages, numPages } = await extractTextByPages(pdfAbs);
  const lines = pagesToLinesKeepBreaks(pages);

  const chapter = buildChapterFromLines(
    { chapterNumber: idx, track: cfg.track },
    lines,
    { numPages, lowTextPages }
  );

  safeMkdir(path.dirname(outAbs));
  fs.writeFileSync(outAbs, JSON.stringify(chapter, null, 2), "utf8");

  const relOut = path.relative(process.cwd(), outAbs);
  const warn =
    chapter.extractionStats?.lowTextPages?.length
      ? ` (⚠️ low-text pages: ${chapter.extractionStats.lowTextPages.join(", ")})`
      : "";

  console.log(`✅ wrote ${relOut}${warn}`);
}

async function runAll() {
  const configs: TrackConfig[] = [
    {
      track: 1,
      inDir: "public/pdfs/chapters",
      outDir: "public/books",
      filePrefix: "chapter",
      indexRange: [1, 12],
    },
    {
      track: 2,
      inDir: "public/pdfs/selfhelp",
      outDir: "public/books",
      filePrefix: "book",
      indexRange: [1, 12],
    },
  ];

  for (const cfg of configs) {
    const jobs = buildJobs(cfg);
    for (const j of jobs) {
      await processOne(cfg, j.idx, j.pdfAbs, j.outAbs);
    }
  }

  console.log("🎉 Done: extracted all chapters + all selfhelp books.");
}

runAll().catch((e) => {
  console.error(e);
  process.exit(1);
});
