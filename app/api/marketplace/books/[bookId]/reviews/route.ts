import { NextResponse } from "next/server";
import { readContract } from "@/lib/contract";
import {
  getBookByBookId,
  listBookReviews,
  upsertBookReview,
} from "@/lib/supabase";

export const runtime = "nodejs";

const isWallet = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());
const isSentiment = (value: string): value is "like" | "dislike" =>
  value === "like" || value === "dislike";
const sanitizeReviewText = (value: string) =>
  value.replace(/\s+/g, " ").trim().slice(0, 1000);

const parseBookId = async (context: { params: Promise<{ bookId: string }> }) => {
  const { bookId } = await context.params;
  const normalized = (bookId || "").trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error("Invalid bookId.");
  }
  return normalized;
};

const buildStats = (
  rows: Array<{ sentiment: "like" | "dislike" }>
) => {
  const likes = rows.filter((row) => row.sentiment === "like").length;
  const dislikes = rows.filter((row) => row.sentiment === "dislike").length;
  return {
    total: rows.length,
    likes,
    dislikes,
  };
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ bookId: string }> }
) {
  try {
    const bookId = await parseBookId(context);
    const reviews = await listBookReviews(bookId, 100, 0);
    return NextResponse.json({
      reviews,
      stats: buildStats(reviews),
    });
  } catch (error: any) {
    const message = error?.message || "Failed to load reviews.";
    const status = message.includes("Invalid bookId") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ bookId: string }> }
) {
  try {
    const bookId = await parseBookId(context);

    const body = (await req.json()) as {
      walletAddress?: string;
      sentiment?: string;
      reviewText?: string;
    };

    const walletAddress = (body.walletAddress || "").trim();
    const sentiment = (body.sentiment || "").trim().toLowerCase();
    const reviewText = sanitizeReviewText(body.reviewText || "");

    if (!isWallet(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address." },
        { status: 400 }
      );
    }
    if (!isSentiment(sentiment)) {
      return NextResponse.json(
        { error: "Sentiment must be 'like' or 'dislike'." },
        { status: 400 }
      );
    }
    if (body.reviewText && reviewText.length < 3) {
      return NextResponse.json(
        { error: "Review must be at least 3 characters." },
        { status: 400 }
      );
    }

    const hasAccess = (await readContract("hasAccess", [
      walletAddress as `0x${string}`,
      BigInt(bookId),
    ])) as boolean;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You must buy this book before reviewing." },
        { status: 403 }
      );
    }

    const listedBook = await getBookByBookId(bookId);
    if (!listedBook) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }

    await upsertBookReview({
      book_id: bookId,
      reviewer_address: walletAddress,
      sentiment,
      review_text: reviewText || null,
    });

    const reviews = await listBookReviews(bookId, 100, 0);
    return NextResponse.json({
      status: "ok",
      reviews,
      stats: buildStats(reviews),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to save review." },
      { status: 500 }
    );
  }
}
