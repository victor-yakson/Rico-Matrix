import { NextResponse } from "next/server";
import { Visit } from "@/lib/models/Visit";
import { sequelize } from "@/lib/db";

// app/api/stats/route.ts
export async function GET() {
  try {
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
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
