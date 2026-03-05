import { createHash } from "crypto";

export const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const sha256 = (text: string) =>
  createHash("sha256").update(text).digest("hex");
