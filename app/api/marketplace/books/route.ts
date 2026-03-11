import { NextResponse } from "next/server";
import {
  getBookByBookId,
  getBookByRecordId,
  listBooksByAuthor,
  listBooksByAuthorAndStatus,
  listBooksByStatus,
} from "@/lib/supabase";
import { readContract } from "@/lib/contract";

export const runtime = "nodejs";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || "24");
    const offset = Number(searchParams.get("offset") || "0");
    const authorAddress = searchParams.get("authorAddress")?.trim() || "";
    const bookId = searchParams.get("bookId")?.trim() || "";
    const recordId = Number(searchParams.get("recordId") || "0");
    const status = searchParams.get("status")?.trim().toLowerCase() || "";
    const purchasedBy = searchParams.get("purchasedBy")?.trim() || "";

    if (Number.isFinite(recordId) && recordId > 0) {
      const book = await getBookByRecordId(recordId);
      return NextResponse.json({ books: book ? [book] : [] });
    }

    if (bookId) {
      const book = await getBookByBookId(bookId);
      return NextResponse.json({ books: book ? [book] : [] });
    }

    const safeLimit = Number.isFinite(limit) ? limit : 24;
    const safeOffset = Number.isFinite(offset) ? offset : 0;

    if (purchasedBy) {
      if (!ADDRESS_REGEX.test(purchasedBy)) {
        return NextResponse.json(
          { error: "Invalid purchasedBy wallet address." },
          { status: 400 }
        );
      }

      const listedBooks = await listBooksByStatus("listed", 1000, 0);
      const withBookId = listedBooks.filter((row) => /^\d+$/.test(row.book_id || ""));

      const accessibleFlags: boolean[] = [];
      const batchSize = 20;
      for (let i = 0; i < withBookId.length; i += batchSize) {
        const batch = withBookId.slice(i, i + batchSize);
        const batchFlags = await Promise.all(
          batch.map(async (row) => {
            try {
              const hasAccess = (await readContract("hasAccess", [
                purchasedBy as `0x${string}`,
                BigInt(row.book_id as string),
              ])) as boolean;
              return hasAccess;
            } catch {
              return false;
            }
          })
        );
        accessibleFlags.push(...batchFlags);
      }

      const purchased = withBookId.filter((_, index) => accessibleFlags[index]);
      const paged = purchased.slice(safeOffset, safeOffset + safeLimit);
      return NextResponse.json({ books: paged });
    }

    const books = authorAddress
      ? status === "approved" || status === "listed" || status === "listing_submitted"
        ? await listBooksByAuthorAndStatus(
            authorAddress,
            status as "approved" | "listed" | "listing_submitted",
            safeLimit,
            safeOffset
          )
        : await listBooksByAuthor(authorAddress, safeLimit, safeOffset)
      : status === "approved" || status === "listed" || status === "listing_submitted"
      ? await listBooksByStatus(status as "approved" | "listed" | "listing_submitted", safeLimit, safeOffset)
      : await listBooksByStatus("listed", safeLimit, safeOffset);

    return NextResponse.json({ books });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load marketplace books." },
      { status: 500 }
    );
  }
}
