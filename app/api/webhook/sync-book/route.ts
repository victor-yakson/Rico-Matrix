import { NextResponse } from "next/server";
import { generateFingerprint } from "@/lib/fingerprint";
import { upsertBook } from "@/lib/supabase";
import { getListBookArgsFromTx } from "@/lib/contract";
import { getReaderLibraryAccess } from "@/lib/matrixAccess";
import { MIN_LIBRARY_PUBLISH_CHAPTER } from "@/lib/libraryEligibility";

export const runtime = "nodejs";

type WebhookPayload = {
  event?: {
    name?: string;
    args?: Record<string, unknown> | unknown[];
  };
  eventName?: string;
  args?: Record<string, unknown> | unknown[];
  transaction?: { hash?: string };
  txHash?: string;
};

const getArg = (
  args: Record<string, unknown> | unknown[] | undefined,
  keys: string[],
  index?: number
) => {
  if (!args) return undefined;
  if (Array.isArray(args) && typeof index === "number") return args[index];
  if (!Array.isArray(args)) {
    for (const key of keys) {
      if (key in args) return args[key];
    }
  }
  return undefined;
};

const toStringSafe = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return "";
};

const fetchMetadata = async (cid: string) => {
  const gateway = (
    process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs"
  ).replace(/\/+$/, "");
  const jwt = process.env.PINATA_JWT;

  const res = await fetch(`${gateway}/${cid}/metadata.json`, {
    headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch metadata.json for CID ${cid}.`);
  }
  return (await res.json()) as Record<string, unknown>;
};

export async function POST(req: Request) {
  try {
    const expected = process.env.INDEXER_WEBHOOK_SECRET;
    const provided = req.headers.get("x-webhook-secret");
    if (expected && provided !== expected) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = (await req.json()) as WebhookPayload;
    const eventName = payload.event?.name || payload.eventName || "";
    if (eventName !== "BookListed") {
      return NextResponse.json({ status: "ignored" });
    }

    const args = payload.event?.args || payload.args;
    const bookId = toStringSafe(getArg(args, ["bookId", "id"], 0));
    const authorAddress = toStringSafe(getArg(args, ["author", "authorAddress"], 1));
    const price = toStringSafe(getArg(args, ["price"], 2));
    let cid = toStringSafe(getArg(args, ["cid", "metadataCid"], 3));
    const txHash = payload.transaction?.hash || payload.txHash || null;

    if (!cid && txHash) {
      try {
        const txData = await getListBookArgsFromTx(txHash as `0x${string}`);
        cid = txData.cid;
      } catch {
        // fall through to validation error
      }
    }

    if (!bookId || !authorAddress || !price || !cid) {
      return NextResponse.json(
        { error: "Invalid BookListed payload." },
        { status: 400 }
      );
    }

    const access = await getReaderLibraryAccess(authorAddress as `0x${string}`);
    if (!access.canPublish) {
      return NextResponse.json(
        {
          error: `Author must unlock at least Chapter ${MIN_LIBRARY_PUBLISH_CHAPTER} before publishing a book.`,
        },
        { status: 403 }
      );
    }

    const metadata = await fetchMetadata(cid);
    const contentFingerprint =
      toStringSafe(metadata.content_fingerprint) ||
      toStringSafe(metadata.contentFingerprint) ||
      generateFingerprint(Buffer.from(JSON.stringify(metadata)));

    const row = await upsertBook({
      book_id: bookId,
      author_address: authorAddress,
      price,
      title:
        toStringSafe(metadata.title) ||
        toStringSafe(metadata.name) ||
        null,
      description:
        toStringSafe(metadata.description) || null,
      status: "listed",
      cid,
      content_fingerprint: contentFingerprint,
      tx_hash: txHash,
    });

    return NextResponse.json({ status: "ok", book: row });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to sync book." },
      { status: 500 }
    );
  }
}
