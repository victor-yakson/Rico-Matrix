import "server-only";
import { uploadBookFolder, uploadToIPFS } from "@/lib/pinata";

type UploadInput = {
  buffer: Buffer;
  fileName?: string;
  title: string;
  description: string;
  authorWallet: string;
  contentHash: string;
};

export const uploadPdfToIpfs = async ({
  buffer,
}: UploadInput): Promise<{ cid: string }> => {
  const cid = await uploadToIPFS(buffer);
  return { cid };
};

type UploadFolderInput = {
  bookBuffer: Buffer;
  thumbnailBuffer: Buffer;
  title: string;
  description: string;
  authorWallet: string;
};

export const uploadBookFolderToIpfs = async (
  input: UploadFolderInput
): Promise<{ cid: string }> => {
  const cid = await uploadBookFolder({
    bookFile: input.bookBuffer,
    thumbnailFile: input.thumbnailBuffer,
    title: input.title,
    description: input.description,
    author: input.authorWallet,
  });
  return { cid };
};

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableIpfsError = (error: unknown) => {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("network") ||
    message.includes("429") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("failed to fetch") ||
    message.includes("ecconnreset")
  );
};

export const uploadPdfToIpfsWithRetry = async (
  input: UploadInput,
  options?: { maxRetries?: number; initialDelayMs?: number }
) => {
  const maxRetries = Math.max(0, options?.maxRetries ?? 2);
  const initialDelayMs = Math.max(200, options?.initialDelayMs ?? 900);

  let attempt = 0;
  let delayMs = initialDelayMs;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      const result = await uploadPdfToIpfs(input);
      return { ...result, attempts: attempt + 1 };
    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries || !isRetryableIpfsError(error)) {
        throw error;
      }
      await sleep(delayMs);
      delayMs = Math.min(delayMs * 2, 8000);
      attempt += 1;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("IPFS upload failed.");
};

export const uploadBookFolderToIpfsWithRetry = async (
  input: UploadFolderInput,
  options?: { maxRetries?: number; initialDelayMs?: number }
) => {
  const maxRetries = Math.max(0, options?.maxRetries ?? 2);
  const initialDelayMs = Math.max(200, options?.initialDelayMs ?? 900);

  let attempt = 0;
  let delayMs = initialDelayMs;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      const result = await uploadBookFolderToIpfs(input);
      return { ...result, attempts: attempt + 1 };
    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries || !isRetryableIpfsError(error)) {
        throw error;
      }
      await sleep(delayMs);
      delayMs = Math.min(delayMs * 2, 8000);
      attempt += 1;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("IPFS folder upload failed.");
};
