import { NextResponse } from "next/server";
import { prisma, prismaStatus } from "@/lib/prisma";
import { extractPdfText } from "@/lib/pdfParser";
import { normalizeText, sha256 } from "@/lib/hash";
import { computeSimhash } from "@/lib/simhash";
import { computeSimilarity } from "@/lib/similarity";
import { uploadBookFolderToIpfsWithRetry } from "@/lib/ipfs";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import {
  bookProcessSelect,
  buildProcessUpdateData,
  hasBookProcessColumns,
  withBookProcess,
} from "@/lib/bookProcess";
import { ensureLibrarySchema } from "@/lib/ensureLibrarySchema";
import { parseUnits } from "viem";
import { waitForTransactionReceipt, writeContract } from "@/lib/contract";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SIMILARITY_THRESHOLD = 85;
const U64_MOD = BigInt(1) << BigInt(64);
const I64_MAX = (BigInt(1) << BigInt(63)) - BigInt(1);

const isPdfFile = (file: File, buffer: Buffer) => {
  const nameOk = file.name.toLowerCase().endsWith(".pdf");
  const typeOk = file.type === "application/pdf";
  const magic = buffer.slice(0, 4).toString("utf8");
  return (nameOk || typeOk) && magic === "%PDF";
};

const isImageFile = (file: File, buffer: Buffer) => {
  const name = file.name.toLowerCase();
  const nameOk =
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp");
  const typeOk = file.type.startsWith("image/");
  const sig = buffer.slice(0, 12);
  const isJpg = sig[0] === 0xff && sig[1] === 0xd8;
  const isPng =
    sig[0] === 0x89 &&
    sig[1] === 0x50 &&
    sig[2] === 0x4e &&
    sig[3] === 0x47;
  const isWebp =
    sig.slice(0, 4).toString("utf8") === "RIFF" &&
    sig.slice(8, 12).toString("utf8") === "WEBP";

  return (nameOk || typeOk) && (isJpg || isPng || isWebp);
};

const sanitize = (value: string, maxLength: number) =>
  value.replace(/\s+/g, " ").trim().slice(0, maxLength);

const isWallet = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());

const parsePriceToWei = (value: string) => {
  const sanitized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(sanitized)) {
    throw new Error("Invalid price format.");
  }
  const wei = parseUnits(sanitized, 18);
  if (wei <= BigInt(0)) {
    throw new Error("Price must be greater than zero.");
  }
  return wei;
};

const toBigIntValue = (value: unknown): bigint => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  if (value && typeof value === "object") {
    const inner = (value as { value?: unknown }).value;
    if (typeof inner === "bigint") return inner;
    if (typeof inner === "string" || typeof inner === "number") {
      return BigInt(inner);
    }
  }
  throw new Error("Invalid bigint value");
};

const toSignedI64ForLegacyBigInt = (value: bigint) =>
  value > I64_MAX ? value - U64_MOD : value;

const isOutOfRangeBigIntError = (error: unknown) =>
  error instanceof PrismaClientKnownRequestError && error.code === "P2020";

type InsertBookRawInput = {
  authorWallet: string;
  payoutWallet: string;
  title: string;
  description: string;
  ipfsCid: string | null;
  priceWei: string | null;
  sha256Hash: string;
  similarityScore: number;
  status: "pending" | "approved" | "rejected" | "listed";
  processStage?:
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
  processProgress?: number;
  processMessage?: string | null;
  rejectionReason: string | null;
  simhashDb: string;
  ipfsRetryCount?: number;
};

const insertBookRaw = async (input: InsertBookRawInput) => {
  if (hasBookProcessColumns) {
    await prisma!.$executeRaw`
      INSERT INTO \`Book\`
        (
          \`authorWallet\`,
          \`payoutWallet\`,
          \`title\`,
          \`description\`,
          \`ipfsCid\`,
          \`priceWei\`,
          \`sha256Hash\`,
          \`simhash\`,
          \`similarityScore\`,
          \`status\`,
          \`processStage\`,
          \`processProgress\`,
          \`processMessage\`,
          \`ipfsRetryCount\`,
          \`rejectionReason\`,
          \`txHash\`,
          \`createdAt\`,
          \`updatedAt\`
        )
      VALUES
        (
          ${input.authorWallet},
          ${input.payoutWallet},
          ${input.title},
          ${input.description},
          ${input.ipfsCid},
          ${input.priceWei},
          ${input.sha256Hash},
          ${input.simhashDb},
          ${input.similarityScore},
          ${input.status},
          ${input.processStage ?? "initiated"},
          ${input.processProgress ?? 0},
          ${input.processMessage ?? null},
          ${input.ipfsRetryCount ?? 0},
          ${input.rejectionReason},
          NULL,
          NOW(),
          NOW()
        )
    `;
  } else {
    await prisma!.$executeRaw`
      INSERT INTO \`Book\`
        (
          \`authorWallet\`,
          \`payoutWallet\`,
          \`title\`,
          \`description\`,
          \`ipfsCid\`,
          \`priceWei\`,
          \`sha256Hash\`,
          \`simhash\`,
          \`similarityScore\`,
          \`status\`,
          \`rejectionReason\`,
          \`txHash\`,
          \`createdAt\`,
          \`updatedAt\`
        )
      VALUES
        (
          ${input.authorWallet},
          ${input.payoutWallet},
          ${input.title},
          ${input.description},
          ${input.ipfsCid},
          ${input.priceWei},
          ${input.sha256Hash},
          ${input.simhashDb},
          ${input.similarityScore},
          ${input.status},
          ${input.rejectionReason},
          NULL,
          NOW(),
          NOW()
        )
    `;
  }

  const created = await prisma!.book.findUnique({
    where: { sha256Hash: input.sha256Hash },
    select: {
      id: true,
      status: true,
      ...bookProcessSelect,
      ipfsCid: true,
    },
  });

  if (!created) {
    throw new Error("Book insert succeeded but record lookup failed.");
  }

  return withBookProcess(created as any);
};

export async function POST(req: Request) {
  if (!prismaStatus.enabled || !prisma) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 }
    );
  }

  try {
    await ensureLibrarySchema(prisma);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Library database schema is not ready.",
        details: error?.message || "Initialization failed.",
      },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const thumbnail = formData.get("thumbnail");
    const titleRaw = formData.get("title");
    const descriptionRaw = formData.get("description");
    const authorWalletRaw = formData.get("authorWallet");
    const payoutWalletRaw = formData.get("payoutWallet");
    const priceRaw = formData.get("price");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "PDF file is required." },
        { status: 400 }
      );
    }
    if (!(thumbnail instanceof File)) {
      return NextResponse.json(
        { error: "Thumbnail image is required." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "PDF exceeds 10MB limit." },
        { status: 413 }
      );
    }
    if (thumbnail.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Thumbnail exceeds 10MB limit." },
        { status: 413 }
      );
    }

    if (typeof titleRaw !== "string" || typeof descriptionRaw !== "string") {
      return NextResponse.json(
        { error: "Title and description are required." },
        { status: 400 }
      );
    }
    if (typeof priceRaw !== "string") {
      return NextResponse.json(
        { error: "Price is required." },
        { status: 400 }
      );
    }

    if (typeof authorWalletRaw !== "string" || !isWallet(authorWalletRaw)) {
      return NextResponse.json(
        { error: "Invalid author wallet address." },
        { status: 400 }
      );
    }
    if (typeof payoutWalletRaw !== "string" || !isWallet(payoutWalletRaw)) {
      return NextResponse.json(
        { error: "Invalid payout wallet address." },
        { status: 400 }
      );
    }

    const title = sanitize(titleRaw, 255);
    const description = sanitize(descriptionRaw, 4000);
    const authorWallet = authorWalletRaw.trim();
    const payoutWallet = payoutWalletRaw.trim();
    let priceWei: string;
    try {
      priceWei = parsePriceToWei(priceRaw).toString();
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || "Invalid price." },
        { status: 400 }
      );
    }

    const activeSubmission = await prisma.book.findFirst({
      where: {
        authorWallet,
        status: { in: ["pending", "approved", "listed"] },
      },
      select: {
        id: true,
        status: true,
        ...bookProcessSelect,
        ipfsCid: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (activeSubmission) {
      const active = withBookProcess(activeSubmission as any);
      return NextResponse.json(
        {
          status: "rejected",
          reason:
            "You already have an active or approved book flow. Complete it before uploading another.",
          activeBookId: active.id,
          activeStatus: active.status,
          activeStage: active.processStage,
          activeProgress: active.processProgress,
          activeMessage: active.processMessage,
          ipfsCid: active.ipfsCid,
        },
        { status: 409 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isPdfFile(file, buffer)) {
      return NextResponse.json(
        { error: "Only valid PDF files are allowed." },
        { status: 415 }
      );
    }
    const thumbnailBuffer = Buffer.from(await thumbnail.arrayBuffer());
    if (!isImageFile(thumbnail, thumbnailBuffer)) {
      return NextResponse.json(
        { error: "Thumbnail must be image/jpg, image/png, or image/webp." },
        { status: 415 }
      );
    }

    let rawText = "";
    try {
      rawText = await extractPdfText(buffer);
    } catch (err) {
      console.error("PDF extraction failed:", err);
      return NextResponse.json(
        { error: "Failed to extract text from PDF." },
        { status: 422 }
      );
    }

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: "PDF contains no readable text." },
        { status: 422 }
      );
    }

    const normalizedText = normalizeText(rawText);
    const contentHash = sha256(normalizedText);
    const simhash = toBigIntValue(computeSimhash(normalizedText));

    const existing = await prisma.book.findUnique({
      where: { sha256Hash: contentHash },
      select: { id: true, status: true },
    });

    if (existing) {
      return NextResponse.json(
        {
          status: "rejected",
          reason: "Exact duplicate detected.",
          existingBookId: existing.id,
        },
        { status: 409 }
      );
    }

    const existingSimhashes = await prisma.$queryRaw<
      Array<{ id: number; simhash: string }>
    >`SELECT id, CAST(simhash AS CHAR) as simhash FROM \`Book\``;

    let bestSimilarity = 0;
    let closestBookId: number | null = null;

    for (const book of existingSimhashes) {
      const similarity = computeSimilarity(simhash, BigInt(book.simhash));
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        closestBookId = book.id;
      }
    }

    const isRejected = bestSimilarity > SIMILARITY_THRESHOLD;
    const rejectionReason = isRejected
      ? "Book is too similar to an existing title."
      : null;

    let created:
      | {
          id: number;
          status: "pending" | "approved" | "rejected" | "listed";
          processStage: string;
          processProgress: number;
          processMessage: string | null;
          ipfsCid: string | null;
          ipfsRetryCount: number;
        }
      | undefined;

    const createInputBase = {
      authorWallet,
      payoutWallet,
      title,
      description,
      ipfsCid: null,
      priceWei,
      sha256Hash: contentHash,
      similarityScore: bestSimilarity,
      rejectionReason,
      simhashDb: simhash.toString(),
      ipfsRetryCount: 0,
    } as const;

    const insertWithLegacyFallback = async (input: Omit<InsertBookRawInput, "simhashDb">) => {
      try {
        return await insertBookRaw({ ...input, simhashDb: simhash.toString() });
      } catch (error) {
        if (!isOutOfRangeBigIntError(error)) throw error;
        return insertBookRaw({
          ...input,
          simhashDb: toSignedI64ForLegacyBigInt(simhash).toString(),
        });
      }
    };

    if (isRejected) {
      created = await insertWithLegacyFallback({
        ...createInputBase,
        status: "rejected",
        processStage: "rejected",
        processProgress: 100,
        processMessage: rejectionReason,
      });
      const rejectedRecord = created;

      return NextResponse.json(
        {
          status: "rejected",
          reason: rejectionReason,
          similarity: bestSimilarity,
          closestBookId,
          recordId: rejectedRecord!.id,
          stage: rejectedRecord!.processStage,
          progress: rejectedRecord!.processProgress,
        },
        { status: 409 }
      );
    }

    created = await insertWithLegacyFallback({
      ...createInputBase,
      status: "pending",
      processStage: "uploading_ipfs",
      processProgress: 82,
      processMessage: "Moderation passed. Uploading to IPFS.",
      rejectionReason: null,
    });
    const createdRecord = created!;

    try {
      const uploaded = await uploadBookFolderToIpfsWithRetry(
        {
          bookBuffer: buffer,
          thumbnailBuffer,
          title,
          description,
          authorWallet,
        },
        { maxRetries: 3, initialDelayMs: 1000 }
      );

      const txHash = (await writeContract("listBook", [
        uploaded.cid,
        BigInt(priceWei),
        payoutWallet as `0x${string}`,
      ])) as `0x${string}`;
      const receipt = await waitForTransactionReceipt(txHash);
      if (receipt.status !== "success") {
        throw new Error("On-chain listing failed.");
      }

      const updated = await prisma.book.update({
        where: { id: createdRecord.id },
        data: {
          ipfsCid: uploaded.cid,
          status: "listed",
          txHash,
          payoutWallet,
          priceWei,
          ...buildProcessUpdateData({
            processStage: "completed",
            processProgress: 100,
            processMessage:
              "Approved, uploaded to IPFS, and listed on blockchain.",
            ipfsRetryCount: uploaded.attempts - 1,
          }),
        },
        select: {
          id: true,
          status: true,
          ...bookProcessSelect,
          ipfsCid: true,
        },
      });
      const normalizedUpdated = withBookProcess(updated as any);

      return NextResponse.json({
        status: "approved",
        recordId: normalizedUpdated.id,
        similarity: bestSimilarity,
        ipfsCid: normalizedUpdated.ipfsCid,
        stage: normalizedUpdated.processStage,
        progress: normalizedUpdated.processProgress,
        ipfsRetries: normalizedUpdated.ipfsRetryCount,
        nextPath: `/library/my-books`,
      });
    } catch (error: any) {
      // Single-phase pipeline guarantee:
      // if moderation->IPFS fails, user must restart from the beginning.
      await prisma.book.deleteMany({
        where: { id: createdRecord.id },
      });

      return NextResponse.json(
        {
          status: "rejected",
          reason:
            error?.message ||
            "Upload pipeline failed during IPFS hosting. Please start over from upload.",
          restartRequired: true,
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error("Upload failed:", error);
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { status: "rejected", reason: "Exact duplicate detected." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process upload." },
      { status: 500 }
    );
  }
}
