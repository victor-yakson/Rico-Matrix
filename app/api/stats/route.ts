import { NextResponse } from "next/server";
import { Visit } from "@/lib/models/Visit";
import { dbStatus, sequelize } from "@/lib/db";

// app/api/stats/route.ts
export async function GET() {
  try {
    if (!dbStatus.enabled || !sequelize) {
      return NextResponse.json({
        success: true,
        disabled: true,
        data: [],
        totals: { total_visits: 0, unique_visitors: 0, countries: 0 },
      });
    }

    const [results] = await sequelize.query(`
      SELECT 
        country, 
        country_code, 
        COUNT(*) as total,
        COUNT(DISTINCT ip_address) as unique_visitors
      FROM visits
      WHERE country != 'Unknown' 
        AND country_code != 'XX'
      GROUP BY country, country_code
      ORDER BY total DESC
    `);

    const [totals] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_visits,
        COUNT(DISTINCT ip_address) as unique_visitors,
        COUNT(DISTINCT country_code) as countries
      FROM visits
      WHERE country != 'Unknown' 
        AND country_code != 'XX'
    `);

    return NextResponse.json({ 
      success: true, 
      data: results,
      totals: Array.isArray(totals) ? totals[0] : totals
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics', disabled: true },
      { status: 500 }
    );
  }
}
