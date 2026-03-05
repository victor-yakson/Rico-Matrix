export type BookStatus = "pending" | "approved" | "rejected" | "listed";
export type BookProcessStage =
  | "initiated"
  | "validating_pdf"
  | "extracting_text"
  | "moderating"
  | "uploading_ipfs"
  | "ipfs_failed"
  | "ready_for_listing"
  | "listing_submitted"
  | "completed"
  | "rejected";

export type Book = {
  id: number;
  title: string;
  description: string;
  authorWallet: string;
  payoutWallet?: string | null;
  ipfsCid?: string | null;
  priceWei?: string | null;
  status: BookStatus;
  processStage: BookProcessStage;
  processProgress: number;
  processMessage?: string | null;
  ipfsRetryCount?: number;
  similarityScore?: number | null;
  rejectionReason?: string | null;
  txHash?: string | null;
  createdAt: string;
  updatedAt?: string;
};
