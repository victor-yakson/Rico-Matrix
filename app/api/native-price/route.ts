import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NATIVE_PRICE_IDS: Record<number, string> = {
  1: "ethereum",
  56: "binancecoin",
  137: "polygon-ecosystem-token",
  8453: "ethereum",
};

export async function GET(request: NextRequest) {
  const chainId = Number(request.nextUrl.searchParams.get("chainId") || 56);
  const priceId = NATIVE_PRICE_IDS[chainId];

  if (!priceId) {
    return NextResponse.json(
      { ok: false, error: "Unsupported chain." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${priceId}&vs_currencies=usd`,
      {
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Native price request failed (${response.status}).`,
        },
        { status: response.status },
      );
    }

    const payload = await response.json();
    const priceUsd = Number(payload?.[priceId]?.usd);

    if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
      return NextResponse.json(
        { ok: false, error: "Native price unavailable." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, chainId, priceUsd });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch native token price.";

    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
