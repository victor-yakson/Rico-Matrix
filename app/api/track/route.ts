import { NextRequest, NextResponse } from "next/server";

import { getCountryFromRequest, registerVisitor } from "@/lib/visitors";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const visitorId = typeof body?.visitorId === "string" ? body.visitorId : null;

    if (!visitorId) {
      return NextResponse.json(
        { ok: false, error: "visitorId is required." },
        { status: 400 }
      );
    }

    const { countryCode, countryName } = getCountryFromRequest(request.headers);
    const result = await registerVisitor({
      visitorId,
      countryCode,
      countryName,
    });

    return NextResponse.json({
      ok: true,
      created: result.created,
      visitor: {
        id: result.visitor.id,
        visitorId: result.visitor.visitor_id,
        countryCode: result.visitor.country_code,
        countryName: result.visitor.country_name,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to register visitor.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
