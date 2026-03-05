import { Prisma } from "@prisma/client";
import type { BookProcessStage, BookStatus } from "@/types/library";

const bookModel = Prisma.dmmf.datamodel.models.find((m) => m.name === "Book");
const bookFields = new Set((bookModel?.fields || []).map((f) => f.name));

export const hasBookProcessColumns =
  bookFields.has("processStage") &&
  bookFields.has("processProgress") &&
  bookFields.has("processMessage") &&
  bookFields.has("ipfsRetryCount");

export const bookProcessSelect = hasBookProcessColumns
  ? ({
      processStage: true,
      processProgress: true,
      processMessage: true,
      ipfsRetryCount: true,
    } as const)
  : ({} as const);

type ProcessLike = {
  status: BookStatus;
  ipfsCid?: string | null;
  txHash?: string | null;
  rejectionReason?: string | null;
  processStage?: BookProcessStage | string;
  processProgress?: number;
  processMessage?: string | null;
  ipfsRetryCount?: number;
};

const derivedProcessFromStatus = (book: ProcessLike) => {
  if (book.status === "listed") {
    return {
      processStage: "completed" as BookProcessStage,
      processProgress: 100,
      processMessage: "Book listed on blockchain successfully.",
      ipfsRetryCount: 0,
    };
  }

  if (book.status === "rejected") {
    return {
      processStage: "rejected" as BookProcessStage,
      processProgress: 100,
      processMessage: book.rejectionReason || "Rejected by moderation.",
      ipfsRetryCount: 0,
    };
  }

  if (book.status === "approved") {
    return {
      processStage: "ready_for_listing" as BookProcessStage,
      processProgress: 100,
      processMessage: "Approved and uploaded to IPFS. Ready for listing.",
      ipfsRetryCount: 0,
    };
  }

  if (book.ipfsCid) {
    return {
      processStage: "ready_for_listing" as BookProcessStage,
      processProgress: 100,
      processMessage: "Approved and uploaded to IPFS. Ready for listing.",
      ipfsRetryCount: 0,
    };
  }

  return {
    processStage: "moderating" as BookProcessStage,
    processProgress: 60,
    processMessage: "Book is under moderation.",
    ipfsRetryCount: 0,
  };
};

export const withBookProcess = <T extends ProcessLike>(book: T) => {
  if (hasBookProcessColumns) {
    return {
      ...book,
      processStage:
        (book.processStage as BookProcessStage | undefined) ??
        derivedProcessFromStatus(book).processStage,
      processProgress:
        typeof book.processProgress === "number"
          ? book.processProgress
          : derivedProcessFromStatus(book).processProgress,
      processMessage:
        book.processMessage ?? derivedProcessFromStatus(book).processMessage,
      ipfsRetryCount:
        typeof book.ipfsRetryCount === "number"
          ? book.ipfsRetryCount
          : derivedProcessFromStatus(book).ipfsRetryCount,
    };
  }
  return {
    ...book,
    ...derivedProcessFromStatus(book),
  };
};

export const withBookProcessList = <T extends ProcessLike>(books: T[]) =>
  books.map((book) => withBookProcess(book));

export const buildProcessUpdateData = (data: Record<string, unknown>) =>
  (hasBookProcessColumns ? data : {}) as Record<string, unknown>;
