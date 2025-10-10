import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { generateEmbeddings } from '@/lib/embeddings'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function POST(req: NextRequest) {
  const start = Date.now()
  try {
    const { query } = await req.json()
    if (!query) return NextResponse.json({ error: 'No query provided' }, { status: 400 })

    // For now, let's do a simple document search
    // We'll generate an embedding for the query and find similar documents
    
    const client = await pool.connect()
    try {
      // Simple text search for now (since we don't have vector search yet)
      const searchResult = await client.query(`
        SELECT id, filename, content, "uploadedAt"
        FROM "Document"
        WHERE content ILIKE $1
        ORDER BY "uploadedAt" DESC
        LIMIT 10
      `, [`%${query}%`])
      
  const responseTime = ((Date.now() - start) / 1000).toFixed(2)
      
      return NextResponse.json({
        type: 'DOCUMENT_SEARCH',
  response_time: `${responseTime}s`,
        query: query,
        results: searchResult.rows,
        count: searchResult.rows.length
      })
    } finally {
      client.release()
    }
  } catch (err: any) {
    console.error('Query error:', err)
    return NextResponse.json({ 
      error: 'Query failed',
      details: err.message 
    }, { status: 500 })
  }
}
