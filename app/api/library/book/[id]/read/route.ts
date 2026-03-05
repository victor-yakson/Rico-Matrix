import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { LIBRARY_CONTRACT_ADDRESS } from "@/utils/constants";

export const runtime = "nodejs";

const READ_ABI = [
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint256", name: "bookId", type: "uint256" },
    ],
    name: "hasAccess",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bookId", type: "uint256" }],
    name: "getBook",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "price", type: "uint256" },
          { internalType: "address", name: "author", type: "address" },
          { internalType: "uint32", name: "upVotes", type: "uint32" },
          { internalType: "uint32", name: "downVotes", type: "uint32" },
          { internalType: "bool", name: "isFrozen", type: "bool" },
          { internalType: "bool", name: "isSuspended", type: "bool" },
          { internalType: "bool", name: "isBlacklisted", type: "bool" },
          { internalType: "string", name: "cid", type: "string" },
          { internalType: "uint256", name: "totalSales", type: "uint256" },
        ],
        internalType: "struct RicoMatrixLibrary.Book",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const isWallet = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());

const normalizeCid = (value: string) =>
  value.replace(/^ipfs:\/\//i, "").replace(/^\/+/, "");

const getCidFromBook = (book: unknown): string => {
  if (!book) return "";
  if (Array.isArray(book) && typeof book[7] === "string") {
    return book[7];
  }
  if (typeof book === "object" && book !== null && "cid" in book) {
    const cid = (book as { cid?: unknown }).cid;
    return typeof cid === "string" ? cid : "";
  }
  return "";
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bookId = Number(id);
  if (!Number.isFinite(bookId) || bookId <= 0) {
    return NextResponse.json({ error: "Invalid book id." }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const user = searchParams.get("user")?.trim() || "";
  if (!isWallet(user)) {
    return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
  }

  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    return NextResponse.json({ error: "RPC_URL is not configured." }, { status: 500 });
  }

  const contractAddress =
    (process.env.CONTRACT_ADDRESS as `0x${string}` | undefined) ||
    LIBRARY_CONTRACT_ADDRESS;
  const gatewayBase = (
    process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs"
  ).replace(/\/+$/, "");

  try {
    const client = createPublicClient({
      transport: http(rpcUrl),
    });

    const hasAccess = await client.readContract({
      address: contractAddress,
      abi: READ_ABI,
      functionName: "hasAccess",
      args: [user as `0x${string}`, BigInt(bookId)],
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const book = await client.readContract({
      address: contractAddress,
      abi: READ_ABI,
      functionName: "getBook",
      args: [BigInt(bookId)],
    });

    const cid = normalizeCid(getCidFromBook(book));
    if (!cid) {
      return NextResponse.json({ error: "Book file not available." }, { status: 404 });
    }

    const upstream = await fetch(`${gatewayBase}/${cid}`);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Unable to fetch book file." }, { status: 502 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/pdf",
        "Content-Disposition": `inline; filename=\"book-${bookId}.pdf\"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to read book." },
      { status: 500 }
    );
  }
}
