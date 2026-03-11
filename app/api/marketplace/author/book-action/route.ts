import { NextResponse } from "next/server";
import {
  getDecodedContractCallFromTx,
  getTransactionStatus,
  readContract,
} from "@/lib/contract";
import { pinJsonToIPFS } from "@/lib/pinata";
import { getBookByRecordId, updateBookByRecordId } from "@/lib/supabase";

export const runtime = "nodejs";

type AuthorBookAction = "update_price" | "update_payout" | "appeal";

const isWallet = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());
const isTxHash = (value: string) => /^0x[a-fA-F0-9]{64}$/.test(value.trim());
const isAction = (value: string): value is AuthorBookAction =>
  value === "update_price" || value === "update_payout" || value === "appeal";

const parseAddress = (value: unknown) =>
  typeof value === "string" && isWallet(value) ? value : null;

const parseUint = (value: unknown) => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return null;
};

const parseOnchainBook = (raw: unknown) => {
  const tuple = raw as any;
  const price = parseUint(tuple?.price ?? tuple?.[0]) ?? BigInt(0);
  const author = parseAddress(tuple?.author ?? tuple?.[1]) || "";
  const isFrozen = Boolean(tuple?.isFrozen ?? tuple?.[2]);
  const isSuspended = Boolean(tuple?.isSuspended ?? tuple?.[3]);
  const isBlacklisted = Boolean(tuple?.isBlacklisted ?? tuple?.[4]);
  const isUnderAppeal = Boolean(tuple?.isUnderAppeal ?? tuple?.[5]);
  const payoutWallet = parseAddress(tuple?.payoutWallet ?? tuple?.[6]) || "";
  const upVotes = Number(parseUint(tuple?.upVotes ?? tuple?.[7]) ?? BigInt(0));
  const downVotes = Number(parseUint(tuple?.downVotes ?? tuple?.[8]) ?? BigInt(0));
  const cid = typeof (tuple?.cid ?? tuple?.[9]) === "string" ? (tuple?.cid ?? tuple?.[9]) : "";
  const totalSales = (parseUint(tuple?.totalSales ?? tuple?.[10]) ?? BigInt(0)).toString();

  return {
    priceWei: price.toString(),
    author,
    isFrozen,
    isSuspended,
    isBlacklisted,
    isUnderAppeal,
    payoutWallet,
    upVotes,
    downVotes,
    cid,
    totalSales,
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      recordId?: number;
      authorWallet?: string;
      txHash?: string;
      action?: string;
      newPriceWei?: string;
      newPayoutWallet?: string;
    };

    const recordId = Number(body.recordId);
    const authorWallet = (body.authorWallet || "").trim();
    const txHash = (body.txHash || "").trim();
    const action = (body.action || "").trim();

    if (!Number.isFinite(recordId) || recordId <= 0) {
      return NextResponse.json({ error: "Invalid recordId." }, { status: 400 });
    }
    if (!isWallet(authorWallet)) {
      return NextResponse.json({ error: "Invalid author wallet." }, { status: 400 });
    }
    if (!isTxHash(txHash)) {
      return NextResponse.json({ error: "Invalid tx hash." }, { status: 400 });
    }
    if (!isAction(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const row = await getBookByRecordId(recordId);
    if (!row) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }
    if (row.author_address.toLowerCase() !== authorWallet.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }
    if (!row.book_id || !/^\d+$/.test(row.book_id)) {
      return NextResponse.json(
        { error: "Book is not yet linked to an on-chain book ID." },
        { status: 409 }
      );
    }

    const decoded = await getDecodedContractCallFromTx(txHash as `0x${string}`);
    if (decoded.sender.toLowerCase() !== authorWallet.toLowerCase()) {
      return NextResponse.json(
        { error: "Transaction sender does not match author wallet." },
        { status: 403 }
      );
    }

    const onchainBookId = BigInt(row.book_id);
    const expectedPrice = body.newPriceWei && /^\d+$/.test(body.newPriceWei) ? BigInt(body.newPriceWei) : null;
    const expectedPayout = body.newPayoutWallet && isWallet(body.newPayoutWallet)
      ? body.newPayoutWallet.toLowerCase()
      : null;

    if (action === "update_price") {
      if (decoded.functionName !== "updateBookPrice") {
        return NextResponse.json({ error: "Transaction is not updateBookPrice." }, { status: 409 });
      }
      const args = decoded.args;
      const txBookId = parseUint(args[0]);
      const txPrice = parseUint(args[1]);
      if (txBookId !== onchainBookId) {
        return NextResponse.json({ error: "Book ID mismatch in transaction." }, { status: 409 });
      }
      if (expectedPrice !== null && txPrice !== expectedPrice) {
        return NextResponse.json({ error: "New price mismatch in transaction." }, { status: 409 });
      }
    }

    if (action === "update_payout") {
      if (decoded.functionName !== "updatePayoutWallet") {
        return NextResponse.json({ error: "Transaction is not updatePayoutWallet." }, { status: 409 });
      }
      const args = decoded.args;
      const txBookId = parseUint(args[0]);
      const txWallet = parseAddress(args[1])?.toLowerCase() || null;
      if (txBookId !== onchainBookId) {
        return NextResponse.json({ error: "Book ID mismatch in transaction." }, { status: 409 });
      }
      if (expectedPayout && txWallet !== expectedPayout) {
        return NextResponse.json({ error: "Payout wallet mismatch in transaction." }, { status: 409 });
      }
    }

    if (action === "appeal") {
      if (decoded.functionName !== "appealStatus") {
        return NextResponse.json({ error: "Transaction is not appealStatus." }, { status: 409 });
      }
      const args = decoded.args;
      const txBookId = parseUint(args[0]);
      if (txBookId !== onchainBookId) {
        return NextResponse.json({ error: "Book ID mismatch in transaction." }, { status: 409 });
      }
    }

    const txStatus = await getTransactionStatus(txHash as `0x${string}`);
    if (txStatus !== "success") {
      return NextResponse.json(
        {
          status: "failed",
          error: "Transaction failed on-chain. You can retry.",
        },
        { status: 409 }
      );
    }

    const onchainRaw = await readContract("getBook", [onchainBookId]);
    const onchain = parseOnchainBook(onchainRaw);

    const ipfsCid = await pinJsonToIPFS(
      {
        type: "author_book_action_sync",
        action,
        recordId,
        bookId: row.book_id,
        txHash,
        authorWallet,
        cid: row.cid,
        onchain,
        createdAt: new Date().toISOString(),
      },
      `book-${recordId}-${action}-${Date.now()}`
    );

    const updated = await updateBookByRecordId(recordId, {
      price: onchain.priceWei,
      onchain_price: onchain.priceWei,
      payout_wallet: onchain.payoutWallet || row.payout_wallet || row.author_address,
      last_action_type: action,
      last_action_tx_hash: txHash,
      last_update_ipfs_cid: ipfsCid,
    });

    return NextResponse.json({
      status: "ok",
      action,
      book: updated,
      onchain,
      ipfsActionCid: ipfsCid,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to sync author action." },
      { status: 500 }
    );
  }
}
