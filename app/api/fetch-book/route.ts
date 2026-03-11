import { NextResponse } from "next/server";
import { readContract } from "@/lib/contract";
import { getBookByBookId } from "@/lib/supabase";

export const runtime = "nodejs";

const isWallet = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());

const buildContentPath = (cid: string) => `${cid}/book.pdf`;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get("bookId")?.trim() || "";
    const walletAddress = searchParams.get("walletAddress")?.trim() || "";

    if (!bookId) {
      return NextResponse.json({ error: "bookId is required." }, { status: 400 });
    }
    if (!isWallet(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address." },
        { status: 400 }
      );
    }

    const hasAccess = (await readContract("hasAccess", [
      walletAddress as `0x${string}`,
      BigInt(bookId),
    ])) as boolean;

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const book = await getBookByBookId(bookId);
    if (!book) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }

    const gateway = (
      process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs"
    ).replace(/\/+$/, "");
    const path = buildContentPath(book.cid);

    const upstream = await fetch(`${gateway}/${path}`, {
      headers: process.env.PINATA_JWT
        ? { Authorization: `Bearer ${process.env.PINATA_JWT}` }
        : undefined,
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "Unable to fetch book file." },
        { status: 502 }
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "application/pdf",
        "Content-Disposition": `inline; filename="book-${bookId}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch book." },
      { status: 500 }
    );
  }
}
