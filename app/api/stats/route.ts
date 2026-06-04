import { NextResponse } from "next/server";

import { getVisitorCountryStats, getVisitorSummary } from "@/lib/visitors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [countryStats, summary] = await Promise.all([
      getVisitorCountryStats(),
      getVisitorSummary(),
    ]);

    const topCountry = countryStats[0] || null;

    return NextResponse.json({
      success: true,
      data: countryStats,
      totals: {
        unique_visitors: summary.unique_visitors,
        countries: summary.countries,
        total_visits: summary.unique_visitors,
        top_country_name: topCountry?.country_name || null,
        top_country_code: topCountry?.country_code || null,
        top_country_visitors: topCountry?.unique_visitors || 0,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch statistics.";

    return NextResponse.json(
      { success: false, error: message, data: [], totals: { unique_visitors: 0, countries: 0 } },
      { status: 500 }
    );
  }
}
