import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db-setup';
import { sequelize } from '@/lib/db';
import { Visit } from '@/lib/models/Visit';

export async function POST() {
  try {
    
    // Test connection first
    await sequelize.authenticate();
    
    // Check current table structure
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
      AND TABLE_NAME = 'visits'
    `);
    
    
    // Initialize database
    await initializeDatabase();
    
    // Verify table structure after sync
    const [afterSync] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
      AND TABLE_NAME = 'visits'
    `);
    
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully',
      before: results,
      after: afterSync
    });
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return NextResponse.json(
      { 
        error: 'Database initialization failed', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
