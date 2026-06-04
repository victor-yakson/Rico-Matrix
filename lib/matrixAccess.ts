import "server-only";

import { createPublicClient, http } from "viem";
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
} from "@/utils/constants";
import {
  canBuyLibraryBook,
  canPublishLibraryBook,
  getHighestUnlockedChapter,
} from "@/lib/libraryEligibility";

const rpcUrl = process.env.NEXT_PUBLIC_BSC_RPC_URL || "";

if (!rpcUrl || rpcUrl === "YOUR_RPC_URL") {
  throw new Error("CRITICAL: NEXT_PUBLIC_BSC_RPC_URL is not configured.");
}

const publicClient = createPublicClient({
  transport: http(rpcUrl),
});

type ReaderSummaryLike = {
  track1Unlocked?: bigint | number | string;
  track2Unlocked?: bigint | number | string;
};

const toNumberSafe = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return 0;
};

export const getReaderLibraryAccess = async (wallet: `0x${string}`) => {
  const summary = (await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getReaderSummary",
    args: [wallet],
  })) as ReaderSummaryLike | readonly unknown[];

  let track1Unlocked = 0;
  let track2Unlocked = 0;

  if (Array.isArray(summary)) {
    track1Unlocked = toNumberSafe(summary[7]);
    track2Unlocked = toNumberSafe(summary[8]);
  } else {
    const summaryRecord = summary as ReaderSummaryLike;
    track1Unlocked = toNumberSafe(summaryRecord.track1Unlocked);
    track2Unlocked = toNumberSafe(summaryRecord.track2Unlocked);
  }

  return {
    track1Unlocked,
    track2Unlocked,
    highestUnlocked: getHighestUnlockedChapter(track1Unlocked, track2Unlocked),
    canBuy: canBuyLibraryBook(track1Unlocked, track2Unlocked),
    canPublish: canPublishLibraryBook(track1Unlocked, track2Unlocked),
  };
};
