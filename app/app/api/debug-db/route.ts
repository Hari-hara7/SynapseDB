import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function GET() {
  try {
    const client = await pool.connect()
    
    try {
      // Get all tables
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `)
      
      // Get count from Document table
      const documentCount = await client.query('SELECT COUNT(*) FROM "Document"')
      
      // Get sample documents
      const sampleDocs = await client.query(`
        SELECT id, filename, LEFT(content, 100) as content_preview, 
               LEFT(embedding, 50) as embedding_preview, "uploadedAt"
        FROM "Document"
        LIMIT 5
      `)
      
      return NextResponse.json({
        tables: tablesResult.rows,
        document_count: documentCount.rows[0].count,
        sample_documents: sampleDocs.rows
      })
    } finally {
      client.release()
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}
