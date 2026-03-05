import { prisma, prismaStatus } from "@/lib/prisma";
import { jsonResponse } from "@/lib/response";
import { bookProcessSelect, withBookProcessList } from "@/lib/bookProcess";
import { ensureLibrarySchema } from "@/lib/ensureLibrarySchema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!prismaStatus.enabled || !prisma) {
    return jsonResponse(
      { error: "Database is not configured." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const authorWallet = searchParams.get("authorWallet");

  if (!authorWallet) {
    return jsonResponse(
      { error: "authorWallet is required." },
      { status: 400 }
    );
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

  const books = await prisma.book.findMany({
    where: { authorWallet },
    orderBy: { createdAt: "desc" },
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

  return jsonResponse({ books: withBookProcessList(books as any[]) });
}
