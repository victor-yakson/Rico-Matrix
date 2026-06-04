import { NextResponse } from "next/server";
import { unpinFromIPFS, uploadBookFolder } from "@/lib/pinata";
import { generateFingerprint } from "@/lib/fingerprint";
import { createUploadedBook, findBookByFingerprint } from "@/lib/supabase";
import { getReaderLibraryAccess } from "@/lib/matrixAccess";
import { MIN_LIBRARY_PUBLISH_CHAPTER } from "@/lib/libraryEligibility";

export const runtime = "nodejs";
// This ensures Next.js doesn't try to parse the body automatically if it's too large
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const isWallet = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());

const sanitize = (value: string, maxLength: number) =>
  value.replace(/\s+/g, " ").trim().slice(0, maxLength);

const isPdfFile = (file: File, buffer: Buffer) => {
  const nameOk = file.name.toLowerCase().endsWith(".pdf");
  const typeOk = file.type === "application/pdf";
  const magic = buffer.slice(0, 4).toString("utf8");
  return (nameOk || typeOk) && magic === "%PDF";
};

const isImageFile = (file: File, buffer: Buffer) => {
  if (buffer.length < 12) return false;
  const name = file.name.toLowerCase();
  const sig = buffer.slice(0, 12);
  const isJpg = sig[0] === 0xff && sig[1] === 0xd8;
  const isPng =
    sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47;
  const isWebp =
    sig.slice(0, 4).toString("utf8") === "RIFF" &&
    sig.slice(8, 12).toString("utf8") === "WEBP";
  return isJpg || isPng || isWebp;
};

const rollbackIpfs = async (cid: string) => {
  try {
    await unpinFromIPFS(cid);
  } catch (error) {
    console.error("Rollback critical failure:", error);
    throw error;
  }
};

export async function POST(req: Request) {
  let uploadedCid: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const thumbnail = formData.get("thumbnail") as File;
    const titleRaw = formData.get("title") as string;
    const descriptionRaw = formData.get("description") as string;
    const authorWalletRaw = formData.get("authorWallet") as string;

    // 1. Basic Validation
    if (!file || !thumbnail || !titleRaw || !authorWalletRaw) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    if (!isWallet(authorWalletRaw)) {
      return NextResponse.json(
        { error: "Invalid wallet address." },
        { status: 400 },
      );
    }

    const access = await getReaderLibraryAccess(
      authorWalletRaw.trim() as `0x${string}`
    );
    if (!access.canPublish) {
      return NextResponse.json(
        {
          error: `You must unlock at least Chapter ${MIN_LIBRARY_PUBLISH_CHAPTER} before publishing a book.`,
        },
        { status: 403 }
      );
    }

    if (file.size > MAX_FILE_SIZE || thumbnail.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit." },
        { status: 413 },
      );
    }

    // 2. Buffer Processing
    // We convert to Buffer once and use these buffers for fingerprinting AND uploading
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const thumbBuffer = Buffer.from(await thumbnail.arrayBuffer());

    if (!isPdfFile(file, fileBuffer)) {
      return NextResponse.json(
        { error: "Invalid PDF content." },
        { status: 415 },
      );
    }

    if (!isImageFile(thumbnail, thumbBuffer)) {
      return NextResponse.json(
        { error: "Invalid image format." },
        { status: 415 },
      );
    }

    // 3. Duplication Check
    const fingerprint = generateFingerprint(fileBuffer);
    const duplicate = await findBookByFingerprint(fingerprint);
    if (duplicate) {
      return NextResponse.json(
        {
          error: "Duplicate content detected.",
          duplicateBookId: duplicate.book_id,
        },
        { status: 409 },
      );
    }

    // 4. IPFS Upload
    // Note: Ensure uploadBookFolder can accept Buffers or Re-construct File objects
    const cid = await uploadBookFolder({
      bookFile: new File([fileBuffer], file.name, { type: file.type }),
      thumbnailFile: new File([thumbBuffer], thumbnail.name, {
        type: thumbnail.type,
      }),
      title: sanitize(titleRaw, 255),
      description: sanitize(descriptionRaw, 4000),
      author: authorWalletRaw.trim(),
    });

    uploadedCid = cid;

    // 5. Database Entry
    const row = await createUploadedBook({
      author_address: authorWalletRaw.trim(),
      title: sanitize(titleRaw, 255),
      description: sanitize(descriptionRaw, 4000),
      cid,
      content_fingerprint: fingerprint,
    });

    if (!row) throw new Error("Database insertion failed.");

    return NextResponse.json({ status: "ok", cid, book: row });
  } catch (error: any) {
    // CRITICAL: Log the actual error to your server console/Vercel logs
    console.error("Route Error:", error);

    if (uploadedCid) {
      try {
        await rollbackIpfs(uploadedCid);
      } catch (rollbackErr) {
        return NextResponse.json(
          {
            error: "Upload failed and rollback failed.",
            details: error.message,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
