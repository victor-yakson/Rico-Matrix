import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db-setup';
import { dbStatus, sequelize } from '@/lib/db';
import { Visit } from '@/lib/models/Visit';

export async function POST() {
  try {
    if (!dbStatus.enabled || !sequelize) {
      return NextResponse.json({
        success: false,
        disabled: true,
        message: 'Database not configured',
        missing: dbStatus.missing,
      });
    }
    
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
    const initResult = await initializeDatabase();
    if (!initResult?.ok) {
      return NextResponse.json(
        {
          error: 'Database initialization failed',
          disabled: true,
          details: initResult?.error
            ? initResult.error instanceof Error
              ? initResult.error.message
              : String(initResult.error)
            : 'Unknown error',
        },
        { status: 500 }
      );
    }
    
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
