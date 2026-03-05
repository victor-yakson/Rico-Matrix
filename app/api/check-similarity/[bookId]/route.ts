import { prisma, prismaStatus } from "@/lib/prisma";
import { computeSimilarity } from "@/lib/similarity";
import { jsonResponse } from "@/lib/response";
import { ensureLibrarySchema } from "@/lib/ensureLibrarySchema";

export const runtime = "nodejs";

type SimilaritySource = {
  id: number;
  title: string;
  status: string;
  simhash: string;
};

type SimilarityResult = {
  id: number;
  title: string;
  status: string;
  similarity: number;
};

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

  const baseRows = await prisma.$queryRaw<
    Array<{ id: number; title: string; simhash: string }>
  >`SELECT id, title, CAST(simhash AS CHAR) as simhash FROM \`Book\` WHERE id = ${bookId} LIMIT 1`;
  const base = baseRows[0];

  if (!base) {
    return jsonResponse({ error: "Book not found." }, { status: 404 });
  }

  const others = await prisma.$queryRaw<SimilaritySource[]>`
    SELECT id, title, status, CAST(simhash AS CHAR) as simhash
    FROM \`Book\`
    WHERE id <> ${bookId}
  `;

  const similarities: SimilarityResult[] = (others as SimilaritySource[])
    .map((book: SimilaritySource) => ({
      id: book.id,
      title: book.title,
      status: book.status,
      similarity: computeSimilarity(BigInt(base.simhash), BigInt(book.simhash)),
    }))
    .sort((a: SimilarityResult, b: SimilarityResult) => b.similarity - a.similarity)
    .slice(0, 5);

  return jsonResponse({
    bookId: base.id,
    title: base.title,
    topSimilar: similarities,
  });
}
