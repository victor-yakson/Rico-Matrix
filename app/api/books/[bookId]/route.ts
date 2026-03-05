import { prisma, prismaStatus } from "@/lib/prisma";
import { jsonResponse } from "@/lib/response";
import {
  bookProcessSelect,
  buildProcessUpdateData,
  withBookProcess,
} from "@/lib/bookProcess";
import { ensureLibrarySchema } from "@/lib/ensureLibrarySchema";

export const runtime = "nodejs";

const isWallet = (value: string) =>
  /^0x[a-fA-F0-9]{40}$/.test(value.trim());
const isListingReadyStage = (stage?: string) =>
  stage === "ready_for_listing" || stage === "listing_submitted";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  if (!prismaStatus.enabled || !prisma) {
    return jsonResponse(
      { error: "Database is not configured." },
      { status: 503 }
    );
  }

  const { bookId: bookIdParam } = await params;
  const bookId = Number(bookIdParam);
  if (!Number.isFinite(bookId)) {
    return jsonResponse({ error: "Invalid book id." }, { status: 400 });
  }

  try {
    await ensureLibrarySchema(prisma);
  } catch (error: any) {
    return jsonResponse(
      {
        error: "Library database schema is not ready.",
        details: error?.message || "Initialization failed.",
      },
      { status: 500 }
    );
  }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      authorWallet: true,
      payoutWallet: true,
      title: true,
      description: true,
      ipfsCid: true,
      priceWei: true,
      similarityScore: true,
      status: true,
      ...bookProcessSelect,
      rejectionReason: true,
      txHash: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!book) {
    return jsonResponse({ error: "Book not found." }, { status: 404 });
  }

  return jsonResponse({ book: withBookProcess(book as any) });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  if (!prismaStatus.enabled || !prisma) {
    return jsonResponse(
      { error: "Database is not configured." },
      { status: 503 }
    );
  }

  const { bookId: bookIdParam } = await params;
  const bookId = Number(bookIdParam);
  if (!Number.isFinite(bookId)) {
    return jsonResponse({ error: "Invalid book id." }, { status: 400 });
  }

  try {
    await ensureLibrarySchema(prisma);
  } catch (error: any) {
    return jsonResponse(
      {
        error: "Library database schema is not ready.",
        details: error?.message || "Initialization failed.",
      },
      { status: 500 }
    );
  }

  const body = await req.json();
  const authorWallet = body?.authorWallet as string | undefined;
  const payoutWallet = body?.payoutWallet as string | undefined;
  const priceWei = body?.priceWei as string | undefined;

  if (!authorWallet || !isWallet(authorWallet)) {
    return jsonResponse(
      { error: "Invalid author wallet." },
      { status: 400 }
    );
  }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      authorWallet: true,
      payoutWallet: true,
      ipfsCid: true,
      priceWei: true,
      status: true,
      ...bookProcessSelect,
    },
  });
  if (!book) {
    return jsonResponse({ error: "Book not found." }, { status: 404 });
  }

  if (book.authorWallet.toLowerCase() !== authorWallet.toLowerCase()) {
    return jsonResponse(
      { error: "Unauthorized." },
      { status: 403 }
    );
  }

  if (book.status !== "approved") {
    return jsonResponse(
      { error: "Only approved books can be updated for listing." },
      { status: 400 }
    );
  }
  if (!book.ipfsCid) {
    return jsonResponse(
      { error: "Book must be uploaded to IPFS before listing setup." },
      { status: 400 }
    );
  }
  const normalizedBook = withBookProcess(book as any);

  if (!isListingReadyStage(normalizedBook.processStage)) {
    return jsonResponse(
      {
        error: `Book is not ready for listing details yet (current stage: ${normalizedBook.processStage}).`,
      },
      { status: 400 }
    );
  }

  const updated = await prisma.book.update({
    where: { id: bookId },
    data: {
      payoutWallet: payoutWallet ?? book.payoutWallet,
      priceWei: priceWei ?? book.priceWei,
      ...buildProcessUpdateData({
        processStage: "listing_submitted",
        processProgress: 100,
        processMessage: "Listing details saved. Submit blockchain listing.",
      }),
    },
    select: {
      id: true,
      authorWallet: true,
      payoutWallet: true,
      title: true,
      description: true,
      ipfsCid: true,
      priceWei: true,
      similarityScore: true,
      status: true,
      ...bookProcessSelect,
      rejectionReason: true,
      txHash: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return jsonResponse({ book: withBookProcess(updated as any) });
}
