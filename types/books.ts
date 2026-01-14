// types/books.ts
export type BookBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "pause_reflect"; prompt: string }
  | { type: "terminology"; items: { term: string; meaning: string }[] }
  | { type: "metaphor"; title?: string; text: string };

export type BookEpisode = {
  id: string;          // "episode-1"
  title: string;       // "THE QUESTION THAT NEVER LEFT HUMANITY"
  blocks: BookBlock[]; // paragraphs, lists, metaphors, etc.
};

export type BookChapter = {
  id: string;                  // "chapter-1"
  chapterNumber: number;       // 1..12
  track: 1 | 2;                // 1=X3, 2=X6
  title: string;               // "CRYPTO FROM ZERO"
  officialName?: string;
  slogan?: string;
  noteToReader?: string;
  objectives?: string[];
  episodes: BookEpisode[];
  disclaimer?: string;
};
