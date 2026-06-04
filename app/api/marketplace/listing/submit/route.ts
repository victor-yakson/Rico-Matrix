import { NextResponse } from "next/server";
import { getBookByRecordId, updateBookByRecordId } from "@/lib/supabase";
import { getReaderLibraryAccess } from "@/lib/matrixAccess";
import { MIN_LIBRARY_PUBLISH_CHAPTER } from "@/lib/libraryEligibility";

export const runtime = "nodejs";

const isWallet = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());
const isTxHash = (value: string) => /^0x[a-fA-F0-9]{64}$/.test(value.trim());

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      recordId?: number;
      authorWallet?: string;
      txHash?: string;
      priceWei?: string;
    };

    const recordId = Number(body.recordId);
    const authorWallet = (body.authorWallet || "").trim();
    const txHash = (body.txHash || "").trim();
    const priceWei = typeof body.priceWei === "string" ? body.priceWei : null;

    if (!Number.isFinite(recordId) || recordId <= 0) {
      return NextResponse.json({ error: "Invalid recordId." }, { status: 400 });
    }
    if (!isWallet(authorWallet)) {
      return NextResponse.json(
        { error: "Invalid author wallet." },
        { status: 400 }
      );
    }
    const access = await getReaderLibraryAccess(authorWallet as `0x${string}`);
    if (!access.canPublish) {
      return NextResponse.json(
        {
          error: `You must unlock at least Chapter ${MIN_LIBRARY_PUBLISH_CHAPTER} before publishing a book.`,
        },
        { status: 403 }
      );
    }
    if (!isTxHash(txHash)) {
      return NextResponse.json({ error: "Invalid tx hash." }, { status: 400 });
    }

    const row = await getBookByRecordId(recordId);
    if (!row) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }
    if (row.author_address.toLowerCase() !== authorWallet.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }
    if (row.status === "listed") {
      return NextResponse.json({ status: "ok", book: row });
    }
    if (!row.cid) {
      return NextResponse.json(
        { error: "Missing CID. Upload folder first." },
        { status: 400 }
      );
    }

    const updated = await updateBookByRecordId(recordId, {
      status: "listing_submitted",
      tx_hash: txHash,
      price: priceWei ?? row.price,
    });

    return NextResponse.json({ status: "ok", book: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to submit listing state." },
      { status: 500 }
    );
  }
}
