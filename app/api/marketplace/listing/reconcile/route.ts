import { NextResponse } from "next/server";
import { listBooksByStatus } from "@/lib/supabase";
import { syncSubmittedListing } from "@/lib/listingSync";

export const runtime = "nodejs";

const isAuthorized = (req: Request) => {
  const secret = process.env.MARKETPLACE_CRON_SECRET || "";
  if (!secret) return true;

  const bearer = req.headers.get("authorization") || "";
  const headerSecret = req.headers.get("x-cron-secret") || "";
  if (headerSecret && headerSecret === secret) return true;
  if (bearer.startsWith("Bearer ") && bearer.slice(7) === secret) return true;
  return false;
};

const getLimit = (url: URL) => {
  const raw = Number(url.searchParams.get("limit") || "50");
  if (!Number.isFinite(raw)) return 50;
  return Math.min(Math.max(1, Math.trunc(raw)), 200);
};

const reconcile = async (req: Request) => {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = getLimit(url);
  const rows = await listBooksByStatus("listing_submitted", limit, 0);

  const summary = {
    processed: 0,
    listed: 0,
    pending_index: 0,
    failed: 0,
    already_listed: 0,
    errors: 0,
  };

  const details: Array<{
    recordId: number;
    status: string;
    reason?: string;
    error?: string;
  }> = [];

  for (const row of rows) {
    if (typeof row.id !== "number") continue;
    summary.processed += 1;

    try {
      const result = await syncSubmittedListing({
        recordId: row.id,
      });
      summary[result.status] += 1;
      details.push({
        recordId: row.id,
        status: result.status,
        reason: result.reason,
      });
    } catch (error: any) {
      summary.errors += 1;
      details.push({
        recordId: row.id,
        status: "error",
        error: error?.message || "Unknown reconcile error.",
      });
    }
  }

  return NextResponse.json({
    status: "ok",
    limit,
    ...summary,
    details,
  });
};

export async function GET(req: Request) {
  try {
    return await reconcile(req);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Reconcile failed." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    return await reconcile(req);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Reconcile failed." },
      { status: 500 }
    );
  }
}
