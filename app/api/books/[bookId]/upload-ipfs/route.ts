import { prisma, prismaStatus } from "@/lib/prisma";
import { jsonResponse } from "@/lib/response";
import { ensureLibrarySchema } from "@/lib/ensureLibrarySchema";
import { buildProcessUpdateData } from "@/lib/bookProcess";

export const runtime = "nodejs";

const isWallet = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  if (!prismaStatus.enabled || !prisma) {
    return jsonResponse(
      { error: "Database is not configured." },
      { status: 503 }
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

  const { bookId: bookIdParam } = await params;
  const bookId = Number(bookIdParam);
  if (!Number.isFinite(bookId)) {
    return jsonResponse({ error: "Invalid book id." }, { status: 400 });
  }

  const formData = await req.formData();
  const authorWallet = (formData.get("authorWallet") as string | null)?.trim();

  if (!authorWallet || !isWallet(authorWallet)) {
    return jsonResponse({ error: "Invalid author wallet." }, { status: 400 });
  }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      authorWallet: true,
      status: true,
      ipfsCid: true,
    },
  });

  if (!book) {
    return jsonResponse({ error: "Book not found." }, { status: 404 });
  }
  if (book.authorWallet.toLowerCase() !== authorWallet.toLowerCase()) {
    return jsonResponse({ error: "Unauthorized." }, { status: 403 });
  }

  if (!book.ipfsCid && (book.status === "pending" || book.status === "approved")) {
    await prisma.book.updateMany({
      where: { id: book.id },
      data: {
        status: "rejected",
        rejectionReason:
          "Single-phase pipeline failed before IPFS completion. Restart from upload.",
        ...buildProcessUpdateData({
          processStage: "rejected",
          processProgress: 100,
          processMessage:
            "Single-phase pipeline failed before IPFS completion. Restart from upload.",
        }),
      },
    });
  }

  return jsonResponse(
    {
      error:
        "Manual IPFS retry is disabled. Upload, moderation, and IPFS hosting are a single phase. Please start over from upload.",
      restartRequired: true,
    },
    { status: 409 }
  );
}
