import { NextResponse } from "next/server";
import { generateFingerprint } from "@/lib/fingerprint";
import { findBookByFingerprint } from "@/lib/supabase";
import { getReaderLibraryAccess } from "@/lib/matrixAccess";
import { MIN_LIBRARY_PUBLISH_CHAPTER } from "@/lib/libraryEligibility";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const isWallet = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let buffer: Buffer;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      const authorWallet = String(formData.get("authorWallet") || "").trim();
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "File is required." },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "File exceeds 10MB limit." },
          { status: 400 }
        );
      }
      if (authorWallet) {
        if (!isWallet(authorWallet)) {
          return NextResponse.json(
            { error: "Invalid wallet address." },
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
      }
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      const arrayBuffer = await req.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        return NextResponse.json(
          { error: "File buffer is required." },
          { status: 400 }
        );
      }
      if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "File exceeds 10MB limit." },
          { status: 400 }
        );
      }
      buffer = Buffer.from(arrayBuffer);
    }

    const fingerprint = generateFingerprint(buffer);
    const existing = await findBookByFingerprint(fingerprint);

    if (existing) {
      return NextResponse.json(
        {
          error: "Duplicate or pirated content detected.",
          duplicateBookId: existing.book_id,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: "ok",
      fingerprint,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to verify content." },
      { status: 500 }
    );
  }
}
