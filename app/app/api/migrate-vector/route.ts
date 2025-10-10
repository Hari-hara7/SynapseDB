import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function POST() {
  try {
    const client = await pool.connect()
    
    try {
      // Enable pgvector extension
      await client.query('CREATE EXTENSION IF NOT EXISTS vector')
      
      // Check current column type
      const checkResult = await client.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'Document' AND column_name = 'embedding'
      `)
      
      const currentType = checkResult.rows[0]?.data_type
      
      if (currentType === 'text') {
        // Drop and recreate as vector type
        await client.query('ALTER TABLE "Document" DROP COLUMN embedding')
        await client.query('ALTER TABLE "Document" ADD COLUMN embedding vector(768)')
        
        // Create index for faster searches
        await client.query(`
          CREATE INDEX IF NOT EXISTS document_embedding_idx 
          ON "Document" USING ivfflat (embedding vector_cosine_ops) 
          WITH (lists = 100)
        `)
        
        return NextResponse.json({
          success: true,
          message: 'Successfully migrated embedding column from text to vector(768)',
          previousType: currentType,
          newType: 'vector'
        })
      } else {
        return NextResponse.json({
          success: true,
          message: 'Embedding column is already correct type',
          currentType: currentType
        })
      }
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        details: error.stack
      },
      { status: 500 }
    )
  }
}
