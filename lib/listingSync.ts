import "server-only";
import {
  getBookListedFromReceipt,
  getListBookArgsFromTx,
  getListBookCallFromTx,
} from "@/lib/contract";
import {
  getBookByRecordId,
  SupabaseBookRow,
  updateBookByRecordId,
} from "@/lib/supabase";
import { getReaderLibraryAccess } from "@/lib/matrixAccess";
import { MIN_LIBRARY_PUBLISH_CHAPTER } from "@/lib/libraryEligibility";

export type ListingSyncResultStatus =
  | "listed"
  | "pending_index"
  | "failed"
  | "already_listed";

export type ListingSyncResult = {
  status: ListingSyncResultStatus;
  reason?: string;
  book: SupabaseBookRow;
};

export const syncSubmittedListing = async (params: {
  recordId: number;
  authorWallet?: string;
}): Promise<ListingSyncResult> => {
  const row = await getBookByRecordId(params.recordId);
  if (!row) {
    throw new Error("Book not found.");
  }

  if (params.authorWallet) {
    if (row.author_address.toLowerCase() !== params.authorWallet.toLowerCase()) {
      throw new Error("Unauthorized.");
    }
  }

  if (!row.tx_hash) {
    throw new Error("No submitted transaction hash found.");
  }

  const access = await getReaderLibraryAccess(
    row.author_address as `0x${string}`
  );
  if (!access.canPublish) {
    throw new Error(
      `Author must unlock at least Chapter ${MIN_LIBRARY_PUBLISH_CHAPTER} before publishing a book.`
    );
  }

  if (row.status === "listed" && row.book_id) {
    return { status: "already_listed", book: row };
  }

  const txHash = row.tx_hash as `0x${string}`;
  const txArgs = await getListBookArgsFromTx(txHash);

  if (txArgs.cid !== row.cid) {
    throw new Error("Submitted transaction CID does not match stored CID.");
  }

  const receiptData = await getBookListedFromReceipt(txHash);

  if (receiptData.status !== "success") {
    const reset = await updateBookByRecordId(row.id as number, {
      status: "approved",
    });
    if (!reset) {
      throw new Error("Failed to reset status after failed transaction.");
    }
    return {
      status: "failed",
      reason: "Transaction failed on-chain.",
      book: reset,
    };
  }

  if (!receiptData.bookId) {
    const pending = await updateBookByRecordId(row.id as number, {
      status: "listing_submitted",
      price: txArgs.priceWei,
      onchain_price: txArgs.priceWei,
      payout_wallet: txArgs.payoutWallet,
    });
    if (!pending) {
      throw new Error("Failed to update pending listing state.");
    }
    return {
      status: "pending_index",
      reason: "Transaction confirmed. Waiting for BookListed event indexing.",
      book: pending,
    };
  }

  const listed = await updateBookByRecordId(row.id as number, {
    book_id: receiptData.bookId,
    status: "listed",
    price: receiptData.priceWei || txArgs.priceWei,
    onchain_price: receiptData.priceWei || txArgs.priceWei,
    payout_wallet: txArgs.payoutWallet,
    tx_hash: txHash,
  });
  if (!listed) {
    throw new Error("Failed to update listed state.");
  }

  return {
    status: "listed",
    book: listed,
  };
};

export const recoverListingFromTxHash = async (params: {
  recordId: number;
  authorWallet: string;
  txHash: `0x${string}`;
}): Promise<ListingSyncResult> => {
  const row = await getBookByRecordId(params.recordId);
  if (!row) {
    throw new Error("Book not found.");
  }
  if (row.author_address.toLowerCase() !== params.authorWallet.toLowerCase()) {
    throw new Error("Unauthorized.");
  }
  if (row.status === "listed" && row.book_id) {
    return { status: "already_listed", book: row };
  }

  const access = await getReaderLibraryAccess(
    row.author_address as `0x${string}`
  );
  if (!access.canPublish) {
    throw new Error(
      `Author must unlock at least Chapter ${MIN_LIBRARY_PUBLISH_CHAPTER} before publishing a book.`
    );
  }

  const txCall = await getListBookCallFromTx(params.txHash);
  if (txCall.sender.toLowerCase() !== params.authorWallet.toLowerCase()) {
    throw new Error("Transaction sender does not match author wallet.");
  }
  if (txCall.cid !== row.cid) {
    throw new Error("Submitted transaction CID does not match stored CID.");
  }

  const receiptData = await getBookListedFromReceipt(params.txHash);
  if (receiptData.status !== "success") {
    const reset = await updateBookByRecordId(row.id as number, {
      status: "approved",
      tx_hash: null,
    });
    if (!reset) {
      throw new Error("Failed to reset status after failed transaction.");
    }
    return {
      status: "failed",
      reason: "Transaction failed on-chain. You can retry listing.",
      book: reset,
    };
  }

  if (!receiptData.bookId) {
    const pending = await updateBookByRecordId(row.id as number, {
      status: "listing_submitted",
      tx_hash: params.txHash,
      price: receiptData.priceWei || txCall.priceWei,
      onchain_price: receiptData.priceWei || txCall.priceWei,
      payout_wallet: txCall.payoutWallet,
    });
    if (!pending) {
      throw new Error("Failed to update pending listing state.");
    }
    return {
      status: "pending_index",
      reason: "Transaction confirmed. Waiting for BookListed event indexing.",
      book: pending,
    };
  }

  const listed = await updateBookByRecordId(row.id as number, {
    book_id: receiptData.bookId,
    status: "listed",
    price: receiptData.priceWei || txCall.priceWei,
    onchain_price: receiptData.priceWei || txCall.priceWei,
    payout_wallet: txCall.payoutWallet,
    tx_hash: params.txHash,
  });
  if (!listed) {
    throw new Error("Failed to update listed state.");
  }

  return {
    status: "listed",
    book: listed,
  };
};
