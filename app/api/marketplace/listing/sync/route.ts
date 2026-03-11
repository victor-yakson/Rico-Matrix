import { NextResponse } from "next/server";
import { syncSubmittedListing } from "@/lib/listingSync";

export const runtime = "nodejs";

const isWallet = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());

export async function POST(req: Request) {
  try {
    // 1. Safety check for JSON parsing
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const recordId = Number(body.recordId);
    const authorWallet = (body.authorWallet || "").trim();

    // 2. Validation
    if (!Number.isFinite(recordId) || recordId <= 0) {
      return NextResponse.json({ error: "Invalid recordId." }, { status: 400 });
    }
    if (!isWallet(authorWallet)) {
      return NextResponse.json(
        { error: "Invalid author wallet." },
        { status: 400 },
      );
    }

    // 3. The Core Logic
    // If lib/contract.ts fails internally, it will throw here
    const result = await syncSubmittedListing({
      recordId,
      authorWallet,
    });

    return NextResponse.json({
      status: result.status === "already_listed" ? "listed" : result.status,
      reason: result.reason,
      book: result.book,
    });
  } catch (error: any) {
    // CRITICAL: Log the full error to your server console so you can see the stack trace
    console.error("❌ SYNC_ROUTE_ERROR:", error);

    const message = error?.message || "Internal Server Error";
    const lowered = message.toLowerCase();

    // 4. Dynamic Status Mapping
    let status = 500;
    if (lowered.includes("not found")) status = 404;
    else if (lowered.includes("unauthorized") || lowered.includes("configured"))
      status = 403;
    else if (lowered.includes("no submitted transaction")) status = 400;
    else if (lowered.includes("cid does not match")) status = 409;
    else if (lowered.includes("private key") || lowered.includes("hex"))
      status = 500;

    return NextResponse.json(
      {
        error: message,
        // Adding the stack in development helps trace the exact file/line
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status },
    );
  }
}
