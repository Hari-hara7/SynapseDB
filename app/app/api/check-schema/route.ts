import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function GET() {
  try {
    const client = await pool.connect()
    
    // Get column information for Document table
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'Document'
      ORDER BY ordinal_position;
    `)
    
    client.release()
    
    return NextResponse.json({
      table: 'Document',
      columns: result.rows
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, details: error },
      { status: 500 }
    )
  }
}
