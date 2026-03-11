import { NextResponse } from "next/server";
import { recoverListingFromTxHash } from "@/lib/listingSync";

export const runtime = "nodejs";

const isWallet = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());
const isTxHash = (value: string) => /^0x[a-fA-F0-9]{64}$/.test(value.trim());

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      recordId?: number;
      authorWallet?: string;
      txHash?: string;
    };

    const recordId = Number(body.recordId);
    const authorWallet = (body.authorWallet || "").trim();
    const txHash = (body.txHash || "").trim();

    if (!Number.isFinite(recordId) || recordId <= 0) {
      return NextResponse.json({ error: "Invalid recordId." }, { status: 400 });
    }
    if (!isWallet(authorWallet)) {
      return NextResponse.json({ error: "Invalid author wallet." }, { status: 400 });
    }
    if (!isTxHash(txHash)) {
      return NextResponse.json({ error: "Invalid transaction hash." }, { status: 400 });
    }

    const result = await recoverListingFromTxHash({
      recordId,
      authorWallet,
      txHash: txHash as `0x${string}`,
    });

    return NextResponse.json({
      status: result.status === "already_listed" ? "listed" : result.status,
      reason: result.reason,
      book: result.book,
    });
  } catch (error: any) {
    const message = error?.message || "Failed to recover listing.";
    const lowered = message.toLowerCase();
    let status = 500;
    if (lowered.includes("invalid")) status = 400;
    else if (lowered.includes("unauthorized")) status = 403;
    else if (lowered.includes("not found")) status = 404;
    else if (lowered.includes("does not match")) status = 409;

    return NextResponse.json({ error: message }, { status });
  }
}

